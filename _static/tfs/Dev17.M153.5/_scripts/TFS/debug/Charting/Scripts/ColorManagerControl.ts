
import * as Charting_Charts from "Charting/Scripts/TFS.Charting.Charts";
import * as Charting_Color from "Charting/Scripts/TFS.Charting.Color";
import * as Charting_DataServices from "Charting/Scripts/TFS.Charting.DataServices";

import * as BladeConfiguration from "Dashboards/Scripts/BladeConfiguration";
import { SettingsField, SettingsFieldOptionsForJQueryElement } from "Dashboards/Scripts/SettingsField";

import * as Controls from "VSS/Controls";
import * as Chart_Contracts from "Charts/Contracts";
import { ColorUtilities } from "Charts/ColorUtilities";
import * as Utils_String from "VSS/Utils/String";
import * as Utils_UI from "VSS/Utils/UI";

import * as ColorPicker from "Presentation/Scripts/TFS/TFS.UI.Controls.ColorPicker";
import * as Charting_Resources from "Charting/Scripts/Resources/TFS.Resources.Charting";
import { RichContentTooltip } from "VSS/Controls/PopupContent";

import "VSS/LoaderPlugins/Css!Charting/Styles/ColorManagerControl";

/** This encapsulates the problem of state management tracking of coloring for Chart Configuration UI.
In particular, two problems:
    1- When a user re-configures a chart, are the user's customizations still relevant?
    2- When the user brings in a legacy chart, legacy colors should initially be treated as customizations which can be grandfathered,
       rather than having modern default palette override those.
       However, once those colors are painted, all subsequent changes should operate via modern mechanics.
 */
export class ColorConfigurationTracker {
    private filter: string;
    private chartType: string;
    private groupBy: string;

    //This opt-in property Determines if we will initialize color against the legacy palette.
    private startWithLegacyPalette: boolean;

    /** Initializes the tracker with Starting Configuration
    and opt-in flag to indicate if we should initialize with a legacy back-compat palette */
    public constructor(configuration: Charting_DataServices.IChartConfiguration, startWithLegacyPalette?: boolean) {
        this.copyState(configuration);
        this.startWithLegacyPalette = startWithLegacyPalette;
    }

    private copyState(configuration: Charting_DataServices.IChartConfiguration): void {
        this.filter = configuration.transformOptions.filter;
        this.chartType = configuration.chartType;
        this.groupBy = configuration.transformOptions.groupBy;
    }

    /*Indicates if the new configuration state is consistent for purposes of re-using color info */
    public canShareColoring(configuration: Charting_DataServices.IChartConfiguration): boolean {
        var canShare = (this.filter == configuration.transformOptions.filter &&
            this.getChartTypeColoringCategory(this.chartType) == this.getChartTypeColoringCategory(configuration.chartType) &&
            this.groupBy == configuration.transformOptions.groupBy);
        this.copyState(configuration);
        return canShare;
    }
    /** Indicates if the chart coloring system should run an initial bootstrap cycle with legacy coloring */
    public isLegacyPaletteExpected(): boolean {
        return this.startWithLegacyPalette;
    }

    /** Provides a categorical identifier describing if the same model is used for chart types. */

    public getChartTypeColoringCategory(chartType: string): number {
        var chartTypeCategory = 0;
        if (Charting_Charts.ChartTypes.areaChart == chartType) {
            chartTypeCategory = 1;
        }
        return chartTypeCategory;
    }

    /** We only want the legacy palette applied with initial state on newly-upgraded charts.
     * As such, this method needs to be called any time the user re-configures the chart,
     * as well as after the first render has gone through. */
    public disallowLegacyPalette(): void {
        this.startWithLegacyPalette = false;
    }
}

export interface ColorManagerControlOptions {
    /* Notification for change events*/
    onChange?: () => void;
}

export interface ColorManagerRenderOptions {
    /* Initial color state for the control to render */
    colorDictionary: Chart_Contracts.ColorDictionary;

    /* active elements to display in the list*/
    activeElements: string[];

    isSubduedPalette?: boolean;

    suppressFieldNames?: boolean;
}

/** Color Manager Control
 *
 *  Provides a UI for managing colors associated to name-color mappings.
 */
export class ColorManagerControl extends Controls.Control<ColorManagerControlOptions>{
    /**Not for external consumption, just for test use. */
    public colorDictionary: Chart_Contracts.ColorDictionary;

    //tracks previously rendered elements, to allow consumers to discern if re-rendering is needed. Note: Palette mode also needs to be considered.
    private lastActiveElements: string[] = [];
    //tracks previously rendered palette state
    private wasSubduedPalette: boolean = false;
    //tracks if clearButton was selected
    private wasColorReset: boolean = false;
    private _seriesContainer: JQuery;

    public static readonly ClearCustomColorsCssClass: string = "color-manager-reset";
    public static readonly ColorRowCssClass: string = "color-row";
    public static readonly ColorManagerCssClass: string = "color-manager-value-label";
    public static readonly HeaderLabelCssClass: string = "color-manager-header-label";
    public static readonly CoreCssClass: string = "color-manager-control";

    public initializeOptions(options?: ColorManagerControlOptions): void {
        super.initializeOptions($.extend({
            coreCssClass: ColorManagerControl.CoreCssClass
        }, options));
    }

    public initialize(): void {
        super.initialize();
    }

    /**
     * Returns list of active elements that was stored during render
     * returns {string[]} - Returns list of active elements
     */
    public getActiveElements(): string[] {
        return this.lastActiveElements;
    }

    /**
     * Returns indication of if the previous palette was subdued.
     * If no previous rendering has occurred, this returns false.
     */
    public isPaletteSubdued(): boolean{
        return this.wasSubduedPalette;
    }

    /** Pack the current color settings from the dictionary for serialization.
    Returns empty array if there is no dictionary on hand. */
    public toColorEntries(): Charting_DataServices.IColorEntry[] {
        if (this.colorDictionary) {
            return this.colorDictionary.toColorEntries();
        } else {
            return [];
        }
    }

    public notifyChangeListener(): void {
        if (this._options.onChange && $.isFunction(this._options.onChange)) {
            this._options.onChange();
        }
    }

    /*(re)Render a list of color - name mappings */
    public render(renderOptions: ColorManagerRenderOptions): void {
        this.preRender(renderOptions);

        //Only Render when we have at least a single element to color.
        if (renderOptions.activeElements.length > 0) {
            this.renderHeader();

            this.renderBody(renderOptions);

            //If the user has custom colors on hand, provide a reset action
            this.renderClearButton();
        }
    }

    public preRender(renderOptions: ColorManagerRenderOptions): void {
        if (!renderOptions.colorDictionary) {
            throw "renderOptions.ColorDictionary must be provided.";
        }
        if (!renderOptions.activeElements) {
            throw "renderOptions.activeElements must be provided.";
        }

        this.colorDictionary = renderOptions.colorDictionary;

        this._element.empty();

        this._seriesContainer = $("<div/>").addClass(ColorManagerControl.HeaderLabelCssClass);

        this.lastActiveElements = renderOptions.activeElements;
        this.wasSubduedPalette = renderOptions.isSubduedPalette;
    }

    /**Map a custom coloring for the given name, given a selected background Color */
    public updateColorPair(name: string, backgroundPick: ColorPicker.Color) {
        var contrastingForegroundColor = ColorUtilities.selectForegroundColor(backgroundPick.asHex());

        var pair = <Chart_Contracts.ColorPair>{
            background: backgroundPick.asHex(),
            foreground: contrastingForegroundColor
        };
        this.colorDictionary.setColorPair(name, pair);
    }

    /*Pack options neccessary for the color picker to initialize */
    public prepareColorPickerOptions(): ColorPicker.DefinedPaletteColorPickerControlOptions {
        return <ColorPicker.DefinedPaletteColorPickerControlOptions>{
            tagName: "div",
            template: ColorPicker.PaletteTemplate.Full,
            onColorSelected: (source: ColorPicker.IColorPickerControl, color: ColorPicker.Color) => {
                var name = source.id;
                this.updateColorPair(name, color);
                this.notifyChangeListener();
                //chart already has custom color
                if (this._seriesContainer.children("." + ColorManagerControl.ClearCustomColorsCssClass).length === 0) {
                    this.renderClearButton();
                }
            }
        };
    }

    /* Render the main body of the control. A series of color pickers and labels*/
    public renderBody(renderOptions: ColorManagerRenderOptions) {
        var commonColorPickerOptions = this.prepareColorPickerOptions();

        $.each(renderOptions.activeElements, (index: number, name: string) => {

            var colorPickerLabel;
            if (!renderOptions.suppressFieldNames) {
                var decodedName = Utils_String.decodeHtmlSpecialChars(name);
                var attributeEncodedName = Utils_String.htmlEncodeJavascriptAttribute(decodedName);
                colorPickerLabel = Utils_String.format(Charting_Resources.ChartConfiguration_ColorForSeries, attributeEncodedName);
            } else {
                colorPickerLabel = Charting_Resources.ChartConfiguration_ColorForSingleSeries;
            }

            var $row = $("<div/>").addClass("color-row");
            let pickerOptions = <ColorPicker.DefinedPaletteColorPickerControlOptions>$.extend({}, commonColorPickerOptions); //copy common options and cast as strong typed before adding local property.
            pickerOptions.ariaLabelPrefix = colorPickerLabel;
            var colorPicker = <ColorPicker.DefinedPaletteColorPickerControl>
                Controls.Control.createIn<ColorPicker.DefinedPaletteColorPickerControlOptions>
                (ColorPicker.DefinedPaletteColorPickerControl, $row, pickerOptions);

            colorPicker.setColor(new ColorPicker.AccessibilityColor(this.colorDictionary.getColorPair(name, index, renderOptions.isSubduedPalette).background));
            colorPicker.id = name;

            if (!renderOptions.suppressFieldNames) {
                $("<span>")
                    .addClass(ColorManagerControl.ColorManagerCssClass)
                    .text(decodedName)
                    .appendTo($row);
            }

            RichContentTooltip.add(colorPickerLabel, colorPicker.getElement());
            this._seriesContainer.append($row);

        });
    }

    /*Render the header block of the control */
    public renderHeader(): void {
        var header = SettingsField.createSettingsFieldForJQueryElement({
            labelText: Charting_Resources.ColorManager_Label,
            toolTipText: Charting_Resources.ColorManager_LabelTooltip,
        }, this._seriesContainer);

        this._element.append(header.getElement());
    }

    public renderClearButton(): void {
        var clear = $("<a>")
            .addClass(ColorManagerControl.ClearCustomColorsCssClass)
            .text(Charting_Resources.ColorManager_Control_ClearCustomColorsLabel)
            .click((eventObject: JQueryEventObject) => {
                this.clearColoring();
            })
            .attr("tabindex", "0")
            .attr("role","button")
            .keydown((eventObject: JQueryEventObject) => {
                if (eventObject.which == Utils_UI.KeyCode.SPACE || eventObject.which == Utils_UI.KeyCode.ENTER) {
                    this.clearColoring();
                    eventObject.preventDefault();
                    eventObject.stopPropagation();
                }
            })
            .appendTo(this._seriesContainer);

        //after clicking clearButton, re-set its focus after rerender
        if (this.wasColorReset) {
            clear.focus();
            this.wasColorReset = false;
        }
    }

    private clearColoring(): void {
        this.colorDictionary.clearCustomColors();
        //empty the lastActiveElements list to force invalidation & Re - rendering of the current control,
        //after the notification induces a reload of the widget
        this.lastActiveElements = [];
        this.wasColorReset = true;
        this.notifyChangeListener();
    }

    /**
     * Checks whether given list of arrays are same
     * @param {string} elements1 - List of string
     * @param {string} elements2 - List of string
     * returns {boolean} - TRUE if both list have some elements and they are all same else FALSE
     */
    public static areActiveElementsSame(elements1: string[], elements2: string[]): boolean {
        if (elements1 == null || elements2 == null || elements1.length <= 0 || elements2.length <= 0) {
            return false;
        }

        if (elements1.length !== elements2.length) {
            return false;
        }

        //If order of items change, needs to be rendered
        for (var i = 0; i < elements1.length; i++) {
            if (elements1[i] !== elements2[i]) {
                return false;
            }
        }
        return true;
    }
}
