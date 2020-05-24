///<summary>Charting.Editors provide controls and templating facilities to support chart editing experiences.
/// Surface area of contracts here should be focused on concerns of Editor Customization/metadata from consumers.
///</summary >

/// <reference types="jquery" />

import * as VSS from "VSS/VSS";
import * as Utils_UI from "VSS/Utils/UI";
import * as TFS_Host_TfsContext from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import * as Utils_Core from "VSS/Utils/Core";
import * as Utils_String from "VSS/Utils/String";
import * as Diag from "VSS/Diag";
import * as Navigation_Services from "VSS/Navigation/Services";
import * as DataServices from "Charting/Scripts/TFS.Charting.DataServices";
import * as Controls from "VSS/Controls";
import * as Resources from "Presentation/Scripts/TFS/Resources/TFS.Resources.Presentation";
import * as VSS_Resources_Platform from "VSS/Resources/VSS.Resources.Platform";
import * as Combos from "VSS/Controls/Combos";
import * as Notifications from "VSS/Controls/Notifications";
import * as Dialogs from "VSS/Controls/Dialogs";
import * as StatusIndicator from "VSS/Controls/StatusIndicator";
import * as ServerConstants from "Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants";
import * as Locations from "VSS/Locations";
import { SettingsField } from "Dashboards/Scripts/SettingsField";

import * as Charting_Color from "Charting/Scripts/TFS.Charting.Color";
import * as Charting_Charts from "Charting/Scripts/TFS.Charting.Charts";
import * as ChartingResources from "Charting/Scripts/Resources/TFS.Resources.Charting";
import * as Chart_Contracts from "Charts/Contracts";
import * as Accessibility from "Presentation/Scripts/TFS/TFS.UI.Controls.Accessibility.Utils";

import * as ModernColorPicker from "Presentation/Scripts/TFS/TFS.UI.Controls.ColorPicker";
import * as GridUtils from "Presentation/Scripts/TFS/TFS.UI.Controls.Grid.Utils";

import { MoreInfoControl, MoreInfoOptions } from "Presentation/Scripts/TFS/TFS.UI.Controls.MoreInfoControl";
import * as PopupContent from "VSS/Controls/PopupContent";
import * as Utils_Accessibility from "VSS/Utils/Accessibility";
import * as ColorManager from "Charting/Scripts/ColorManagerControl";

var delegate = Utils_Core.delegate;
var TfsContext = TFS_Host_TfsContext.TfsContext.getDefault();

export class ConfigurationConstraintNames {
    ///<summary> Configuration Constraint names used for describing metadata configuration options</summary>
    public static groupBy: string = "groupBy";
    public static series: string = "series";
    public static columns: string = "columns";
    public static measure: string = "measure";
    public static historyRange: string = "historyRange";
    public static orderBy: string = "orderBy";
}
/** Describes the constraints used for the chart. The Chart Editor uses this information to prepare suitable UI controls for the user.*/
export interface ChartConfigurationConstraint {

    /** A localized user-facing label for the UI of this configuration element*/
    labelText: string;

    /** A non-localized reference name of the chart configuration constraint.*/
    name: string;

    /** A localized explanatory message to be provided on the "tooltip badge" to supplement the limited context of the label text.*/
    tooltipText?: string;

    /** A watermark message to be presented to the user while control is empty. */
    watermarkMessage?: string;

    /** A hidden constraint is still part of a chart configuration payload, but not user configurable.*/
    hidden?: boolean;
}

export interface ChartTemplateItem {
    labelText: string;
    chartType?: string;
    cssIconClass?: string;
    chartGroup?: string;
    configurationConstraints?: ChartConfigurationConstraint[];

    /* The tooltip text and the icon to use when contruct chartype in the widget config blade */
    advancedToolTip?: string;
    widgetConfigIconFileName?: string;
}

export interface IChartEditCallback {
    (chartState: Charting_Charts.IChartState): void;
}

// Inventory of options used with ChartItemEditorBase.
// To limit disruptive churn, pre-existing untyped classes were not updated to consume this.
export interface ChartItemEditorBaseOptions {
    activeConfiguration: DataServices.IChartConfiguration;
    targetConstraint: ChartConfigurationConstraint;
    chartMetadataProvider: DataServices.IChartMetadataProvider;
    useBowtie: boolean;
    change: () => void;
}

export class ChartItemEditorBase extends Controls.BaseControl {
    ///<summary>Provides common editor labelling and data contract, allowing for tailoring of set of chart editing options, including through use of multiple child controls.</summary>
    private _activeConfiguration: DataServices.IChartConfiguration;
    private _targetConstraint: ChartConfigurationConstraint;
    private $errorBadge: JQuery;
    public _chartMetadataProvider: DataServices.IChartMetadataProvider; //Protected field appropriate for use by derived types
    public _useBowtie: boolean;


    public initialize() {
        super.initialize();

        this._activeConfiguration = this._options.activeConfiguration;
        this._targetConstraint = this._options.targetConstraint;
        this._chartMetadataProvider = this._options.chartMetadataProvider;
        this._useBowtie = this._options.useBowtie;

        //Render the containing block+label, and have the derived editor render it's particular edit controls
        var $block = $("<div />")
            .addClass("chart-configuration-block")
            .appendTo(this._element);

        if (this._targetConstraint.hidden) {
            $block.hide();
        }
        var $labelContainer = $("<div />")
            .addClass("chart-configuration-label-row")
            .appendTo($block);

        let $label = $("<label />")
            .addClass("chart-configuration-label-cell")
            .text(this._targetConstraint.labelText)
            .appendTo($labelContainer);

        //Error badge is collapsed by default- toggling to show it is explicitly opt-in driven by legacy codepath.
        this.$errorBadge = $("<span/>")
            .addClass("chart-configuration-label-row-error collapse")
            .text(ChartingResources.Config_ErrorAsterix)
            .appendTo($labelContainer);

        if (this._targetConstraint.tooltipText) {
            const tooltipAriaLabelText = Utils_String.format(ChartingResources.ChartConfiguration_MoreInfoLabelFormat, this._targetConstraint.labelText);

            let moreInfoControl = MoreInfoControl.create<MoreInfoControl<MoreInfoOptions>, MoreInfoOptions>(MoreInfoControl, $labelContainer, {
                cssClass: "chart-configuration-tip",
                tooltipText: this._targetConstraint.tooltipText,
                ariaLabelText: tooltipAriaLabelText
            });
        }

        this.render($block);
    }

    public checkCorrectness(): Boolean {
        ///<summary>Indicates if the item editor is in a valid state. </summary>
        return true;
    }

    public getItemTransformConfiguration(): any {
        return this._activeConfiguration.transformOptions[this._targetConstraint.name];
    }

    public updateItemTransformConfiguration(newItemState) {
        this._activeConfiguration.transformOptions[this._targetConstraint.name] = newItemState;
    }

    public getConstraint(): ChartConfigurationConstraint {
        return this._targetConstraint;
    }

    public render($container: JQuery) {
        ///<summary>Render details of the particular item editor</summary>
    }

    /**
     * Toggle visibility of error state badge, based on if the control is correct or invalid.
     */
    public updateErrorVisibility(): void {
        let isValid: boolean = this.checkCorrectness() ? true : false;
        this.$errorBadge.toggleClass("collapse", isValid);
    }
}

export class LocalizedCombo extends Combos.Combo {
    ///<summary>Encapsulates Chart Editor usage of localized value management on combo box, for which existing flat implementations only support literal strings.</summarn>

    private _items: DataServices.INameLabelPair[];

    public initializeOptions(options?: any) {
        /// <param name="options" type="any" />

        var consumerHandler = options.change;
        options.change = () => {
            //ensure invalid state is cleared on a user selection
            this.setInvalid(false);
            if ($.isFunction(consumerHandler)) {
                consumerHandler();
            }
        };

        super.initializeOptions($.extend({
            allowEdit: false,
            comparer: Utils_String.defaultComparer,
        }, options));
    }

    public initialize() {
        super.initialize();
        this._bindOnBlur();
    }

    public _onInputKeyDown(e?: JQueryEventObject): any {
        /// <param name="e" type="JQueryEvent" optional="true"/>
        /// <returns type="any" />

        // Suppress navigating away while in the dialog.
        if (e.keyCode === Utils_UI.KeyCode.BACKSPACE) {
            e.preventDefault(); //Prevents tab from going to the next tile
        }
        return super._onInputKeyDown(e);
    }

    public setItems(items: DataServices.INameLabelPair[]) {
        ///<summary>The sort editor is always configured to be in a valid state</summary>
        this._items = items;
        this.setSource($.map(this._items, function (item) { return item.labelText; }));
    }

    public selectItemByName(name: string) {
        Diag.Debug.assertIsObject(this._items, "Items must be populated");

        var targetIndex = (this._items && this._items.length < 0) ? -1 : $.inArray(name, $.map(this._items, (item) => {
            return item.name;
        }));

        if (targetIndex != -1 && targetIndex !== undefined) {
            this.setSelectedIndex(targetIndex, false);
        } else {
            //Workaround: Combo box is not tab-able when there is no input text present.
            this.setText(" ", false);
            this.setInvalid(true);

            //Empty text should not be observable as a tooltip.
            this._input.attr("title", null);
        }
    }

    public getItemName(): string {
        Diag.Debug.assertIsObject(this._items, "Items must be populated");

        return (this.getSelectedIndex() >= 0) ? this._items[this.getSelectedIndex()].name : "";
    }

    public isValid(): Boolean {
        return (this.getSelectedIndex() >= 0);
    }

    public setVisibility(isVisible: Boolean) {
        /// <summary> Manage the visibility of the control.
        /// Hidden controls do not participate in tab order.
        /// </ summary >

        this._element.toggleClass("collapse", !isVisible);
    }

    /**
     * Handles when the dropdown menu loses focus
     */
    private _bindOnBlur() {
        // Call onChange if we're invalid to notify config that error presentation should be updated.
        // This is for the case where you tab through the dropdown menu when no query is selected.
        // Since wrapping charting editor controls only fire "change" to parents, we can't pass "blur" up,
        // and have to use change too - query selector is implemented same way
        this._input.on("blur", () => {
            if (!this.isValid()) {
                this._options.change();
            }
        });
    }
}

export class ChartGroupEditor extends ChartItemEditorBase {
    public static WaterMarkClass: string = "chart-configuration-combo-watermark";
    private _comboControl: LocalizedCombo;

    public initializeOptions(options?: any) {
        /// <param name="options" type="any" />

        super.initializeOptions($.extend({
        }, options));
    }

    public checkCorrectness(): Boolean {
        ///<summary>Indicates if the item editor is in a valid state. </summary>
        return this._comboControl.isValid();
    }

    public render($container: JQuery) {

        var comboControl: LocalizedCombo = null,
            $pair: JQuery = null,
            presetIndex: number = -1,
            optionValues = this._chartMetadataProvider.getGroupableFields();

        this._comboControl = <LocalizedCombo>Controls.BaseControl.createIn(LocalizedCombo, $container, {
            change: () => {
                if (this._useBowtie && this._comboControl.isValid()) {
                    //After a selection is made, clear out the watermark
                    this._comboControl.getElement().removeClass(ChartGroupEditor.WaterMarkClass);
                } else {
                    //aria-invalid is set to false on losing focus. if the option is unchanged, set it back to true.
                    this._comboControl.setInvalid(true);
                }

                this.updateItemTransformConfiguration(this._comboControl.getItemName());
                this._fireChange();
            }
        });

        this._comboControl.getElement().addClass("chart-configuration-combo");
        this._comboControl.setItems(optionValues);
        this._comboControl.selectItemByName(this.getItemTransformConfiguration());
        this._comboControl.getInput().attr('aria-label', this.getConstraint().labelText);

        //If the initial state is empty, paint in a watermark.
        var watermarkMessage = this.getConstraint().watermarkMessage;
        if (this._useBowtie && watermarkMessage && !this._comboControl.isValid()) {
            this._comboControl.getElement().addClass(ChartGroupEditor.WaterMarkClass);
            this._comboControl.setText(watermarkMessage, false /*Don't Notify listeners for change*/);
        }
    }

    /**
     * Allows for this control to be reset to unselected state.
     */
    public clearSelection(): void {
        var watermarkMessage = this.getConstraint().watermarkMessage;
        if (this._useBowtie && watermarkMessage) {
            this._comboControl.getElement().addClass(ChartGroupEditor.WaterMarkClass);
            this._comboControl.setText(watermarkMessage, false /*Don't Notify listeners for change*/);
        }
        else {
            this._comboControl.setText("", false);
        }
    }
}

export class ChartOrderingEditor extends ChartItemEditorBase {
    ///<summary>Handles edit of Sort Configuration object using known metadata options</summary>

    private _propertyComboControl: LocalizedCombo;
    private _directionComboControl: LocalizedCombo;

    private static _propertyValues: DataServices.INameLabelPair[] = [
        {
            name: DataServices.OrderProperty.useLabel,
            labelText: Resources.ChartOrderResults_ByLabel
        },
        {
            name: DataServices.OrderProperty.useValue,
            labelText: Resources.ChartOrderResults_ByValue
        }
    ];

    private static _directionValues: DataServices.INameLabelPair[] = [
        {
            name: DataServices.OrderDirection.ascending,
            labelText: Resources.ChartOrderResults_Ascending
        },
        {
            name: DataServices.OrderDirection.descending,
            labelText: Resources.ChartOrderResults_Descending
        }
    ];

    public checkCorrectness(): Boolean {
        ///<summary>The sort editor is always configured to be in a valid state</summary>
        return this._propertyComboControl.isValid() && this._directionComboControl.isValid();
    }

    public render($container: JQuery) {
        this._propertyComboControl = <LocalizedCombo>Controls.BaseControl.createIn(LocalizedCombo, $container, {
            change: () => { this._onChange(); },
        });
        this._propertyComboControl.getElement().addClass("chart-configuration-order-property").addClass("compact");
        this._propertyComboControl.setItems(ChartOrderingEditor._propertyValues);
        this._propertyComboControl.selectItemByName(this.getItemTransformConfiguration().propertyName);
        this._propertyComboControl.getInput().attr('aria-label', this.getConstraint().labelText);

        this._directionComboControl = <LocalizedCombo>Controls.BaseControl.createIn(LocalizedCombo, $container, {
            change: () => { this._onChange(); },
        });
        this._directionComboControl.getElement().addClass("chart-configuration-order-direction");
        this._directionComboControl.setItems(ChartOrderingEditor._directionValues);
        this._directionComboControl.selectItemByName(this.getItemTransformConfiguration().direction);
        this._directionComboControl.getInput().attr('aria-label', Resources.ChartConfigurationLabel_SortOrder);
    }

    private _getCurrentConfiguration(): DataServices.IOrderBy {
        return {
            propertyName: this._propertyComboControl.getItemName(),
            direction: this._directionComboControl.getItemName()
        };
    }

    private _updateDirectionState() {
        var orderBy: DataServices.IOrderBy = this._getCurrentConfiguration();
        this.updateItemTransformConfiguration(orderBy);
    }

    private _onChange() {
        this._updateDirectionState();
        this._fireChange();
    }
}

export class ChartMeasureEditor extends ChartItemEditorBase {
    ///<summary>Handles edit of Sort Configuration object using known metadata options</summary>
    private _propertyComboControl: LocalizedCombo;
    private _measureOfLabel: JQuery;
    private _aggregationFunctionComboControl: LocalizedCombo;


    private _aggregationFields: DataServices.INameLabelPair[];
    private _countAggregationPropertyData: DataServices.INameLabelPair[];

    private _aggregationFunctions: DataServices.INameLabelPair[];

    //While count is active, the property dropdown state is ignored.
    //On switching to a non-count aggregation, we need to reset the field, as the existing state.
    private _propertyIsIgnored: boolean = false;

    public checkCorrectness(): Boolean {
        ///<summary>Indicates if the item editor is in a valid state. </summary>
        //Note: The property combo is forced into a valid state when paired with Count.
        return this._aggregationFunctionComboControl.isValid() && this._propertyComboControl.isValid();
    }

    public render($container: JQuery) {
        this._prepareData();

        // Note: Aggregation function is hard coded to only allow Count right now.
        this._aggregationFunctionComboControl = <LocalizedCombo>Controls.BaseControl.createIn(LocalizedCombo, $container, { change: () => { this._onMeasureFunctionChange(); } });
        this._aggregationFunctionComboControl.getElement().addClass("chart-configuration-measure-aggregation");
        this._aggregationFunctionComboControl.getInput().attr('aria-label', this.getConstraint().labelText);

        this._measureOfLabel = $("<div>").
            addClass("chart-configuration-measure-of").
            text(Resources.ChartConfigurationLabel_Of);
        $container.append(this._measureOfLabel);

        this._propertyComboControl = <LocalizedCombo>Controls.BaseControl.createIn(LocalizedCombo, $container, {
            change: () => { this._onMeasurePropertyChange(); }
        });
        this._propertyComboControl.getElement().addClass("chart-configuration-measure-property");
        this._propertyComboControl.getInput().attr('aria-label', Resources.ChartConfigurationLabel_AggregationOf);

        this._updateFunctionControl();
        this._updatePropertyControl();
    }

    private _prepareData() {
        var defaultAggregationFunctions: DataServices.INameLabelPair[] = [{
            name: DataServices.AggregationFunction.count,
            labelText: Resources.ChartMeasure_Count
        }
        ];

        this._countAggregationPropertyData = [{
            name: "", //Artifact scope aggregation doesn't make use of infoChartAggregationFieldsTiprmation from any property
            labelText: this._chartMetadataProvider.getPluralArtifactName()
        }
        ];

        //Feature flag aware providers expose the fields and set of numerical aggregation functions they support.
        this._aggregationFields = this._chartMetadataProvider.getAggregatableFields();
        this._aggregationFunctions = defaultAggregationFunctions;

        //Don't expose aggregation functions if we don't have any aggregatable columns
        if (this._aggregationFields.length > 0) {
            this._aggregationFunctions = this._aggregationFunctions.concat(this._chartMetadataProvider.getNumericalAggregationFunctions());
        }
    }

    private _updateFunctionControl() {
        var aggregation = this.getItemTransformConfiguration().aggregation;
        this._aggregationFunctionComboControl.setItems(this._aggregationFunctions);
        this._aggregationFunctionComboControl.selectItemByName(aggregation);

        this._aggregationFunctionComboControl.setEnabled(true);
        this._aggregationFunctionComboControl.getElement().toggleClass("compact", true);
    }

    private _updatePropertyControl() {
        var aggregationWasIgnored = this._propertyIsIgnored,
            aggregationIsIgnored = DataServices.AggregationFunction.isCount(this.getItemTransformConfiguration().aggregation),
            propertyName = this.getItemTransformConfiguration().propertyName;

        this._propertyIsIgnored = aggregationIsIgnored;


        //Property Dropdown is now visible, but only enabled for numerical aggregations (We force the state and ignore otherwise)

        if (aggregationIsIgnored) {
            this._propertyComboControl.setEnabled(false);
            this._propertyComboControl.setItems(this._countAggregationPropertyData);
            this._propertyComboControl.setSelectedIndex(0, null);
        } else {
            this._propertyComboControl.setEnabled(true);
            this._propertyComboControl.setItems(this._aggregationFields);
            if (aggregationWasIgnored) {
                this._propertyComboControl.setSelectedIndex(0, null);
            } else {
                this._propertyComboControl.selectItemByName(propertyName);
            }
        }
    }

    private _getCurrentConfiguration(): DataServices.IMeasure {
        return {
            aggregation: this._aggregationFunctionComboControl.getItemName(),
            propertyName: this._propertyComboControl.getItemName()
        };
    }

    private _onMeasureFunctionChange(): void {
        this.updateItemTransformConfiguration(this._getCurrentConfiguration()); //Propagate UI to Model
        this._updatePropertyControl(); //Update properties when switching Function

        this.updateItemTransformConfiguration(this._getCurrentConfiguration()); //Propagate revised dependent UI to Model
        this._fireChange();
    }

    private _onMeasurePropertyChange(): void {
        this.updateItemTransformConfiguration(this._getCurrentConfiguration());
        this._fireChange();
    }
}

export class ChartHistoryRangeEditor extends ChartItemEditorBase {

    private _historyRangeComboControl: LocalizedCombo;

    public checkCorrectness(): Boolean {
        ///<summary>The range editor is always configured to be in a valid state</summary>
        return this._historyRangeComboControl.isValid();
    }

    public render($container: JQuery) {
        this._historyRangeComboControl = <LocalizedCombo>Controls.BaseControl.createIn(LocalizedCombo, $container, {
            change: () => { this._onChange(); }
        });
        this._historyRangeComboControl.getElement().addClass("chart-configuration-range-property");
        this._historyRangeComboControl.setItems(this._chartMetadataProvider.getRangeOptions());
        this._historyRangeComboControl.getInput().attr('aria-label', this.getConstraint().labelText);

        //Pre-select an option if not a prior config.
        var initialItem = this.getItemTransformConfiguration();
        if (initialItem) {
            this._historyRangeComboControl.selectItemByName(initialItem);
        } else {
            this._historyRangeComboControl.setSelectedIndex(0, false);
            this._updateHistoryRangeState();
        }
    }

    private _updateHistoryRangeState() {
        var historyRange: string = this._historyRangeComboControl.getItemName();
        this.updateItemTransformConfiguration(historyRange);
    }

    private _onChange() {
        this._updateHistoryRangeState();
        this._fireChange();
    }
}

export interface ChartTextEditorOptions extends ChartItemEditorBaseOptions {
    initialValue: string;
    maxLength: number;
}

/* Encapsulates Text editing support, without strong coupling to underlying chart config.
 * This is neccessary to share config styles with Title, which is not part of common configuration model(Only present on Dialog).
 * This implementation does not interact with ChartConfiguration model. The dialog directly manages inclusion of text from this field into the config state.
 */
export class ChartTextEditor extends ChartItemEditorBase {
    public static WaterMarkClass: string = "chart-configuration-combo-watermark";
    private _comboControl: Combos.Combo;

    public initializeOptions(options?: ChartItemEditorBaseOptions) {
        /// <param name="options" type="any" />
        super.initializeOptions($.extend({
        }, options));
    }

    public static isStringValid(text: string, maxLength: number): boolean {
        return ($.trim(text).length > 0 && text.length <= maxLength);
    }

    public checkCorrectness(): Boolean {
        ///<summary>Indicates if the item editor is in a valid state. </summary>
        return ChartTextEditor.isStringValid(this._comboControl.getText(), this._options.maxLength);
    }

    /**
     * Toggle watermark depending on if control is valid.
     */
    public repaintValidity(): void {
        let isInvalid = this._useBowtie && !this.checkCorrectness();
        this._comboControl.getElement().toggleClass(ChartGroupEditor.WaterMarkClass, isInvalid);
        this._comboControl.setInvalid(isInvalid);

        //If a watermark message is available for invalid state, paint it in.
        let watermarkMessage = this.getConstraint().watermarkMessage;
        if (isInvalid && watermarkMessage) {
            Utils_UI.Watermark(this._comboControl.getInput(), { watermarkText: watermarkMessage });
        }
        this.updateErrorVisibility();
    }

    public render($container: JQuery) {

        let comboControl: Combos.Combo = null;

        this._comboControl = <Combos.Combo>Controls.BaseControl.createIn(Combos.Combo, $container, {
            mode: "text",
            change: () => {
                this._fireChange();
            }
        });

        this._comboControl.getElement().addClass("chart-configuration-combo");
        this._comboControl.setText(this._options.initialValue);
        let $comboControlInput = this._comboControl.getInput();
        $comboControlInput.attr("maxlength", this._options.maxLength);
        this._comboControl.getInput().attr("aria-label", this.getConstraint().labelText);

        this.repaintValidity();
    }

    public getText(): string {
        return this._comboControl.getText();
    }
}

export class ChartConfigurationEditor extends Controls.BaseControl {
    public static enhancementTypeName: string = "tfs.chartconfigurationEditor";
    public _configurationOptions: ChartConfigurationConstraint[];
    protected _activeConfiguration: DataServices.IChartConfiguration;
    protected _itemEditors: ChartItemEditorBase[];

    public initializeOptions(options?: any) {
        /// <param name="options" type="any" />

        super.initializeOptions($.extend({
            coreCssClass: "chart-configuration-editor"
        }, options));
    }

    public initialize() {
        super.initialize();
        this._configurationOptions = this._options.configurationOptions;
        this.render();
    }

    public setOptions(configurationOptions: ChartConfigurationConstraint[], activeConfiguration: DataServices.IChartConfiguration) {
        ///<summary>Flush in the available set of options available as choices in the dropdowns</summary>

        this._activeConfiguration = activeConfiguration;
        this._configurationOptions = configurationOptions;

        this.render();
    }

    public checkCorrectness(onError): boolean {
        ///<summary>Indicates if the Editor configuration is in a ready state.</summary>

        // Fix for Bug# 397957 which creates a race condition and this method is called when there are no editors
        // The Combo box is set with whitespace as a workaround to be able to tab to it.
        // This setText(" ") fires a blur event that fires a change event that calls _updateChartConfiguration() which calls _checkConfigurationCompleteness which calls this method
        // to decide if the chart should be formed or not
        // The right fix: Do not settext(" ") on the combo box
        if (this._itemEditors.length == 0) {
            return false;
        }

        let isCorrect = true;

        $.each(this._itemEditors, (i, editor: ChartGroupEditor) => {
            if (!editor.checkCorrectness() && isCorrect === true) {
                isCorrect = false;
                onError(Utils_String.format(Resources.ChartMessage_MissingChartSelection, editor.getConstraint().labelText));
            }
            this._updateEditorErrorVisibility(editor);
        });
        return isCorrect;
    }

    public render() {
        ///<summary>Render the Configuration Editor UI</summary>

        var that = this;
        this._itemEditors = [];
        this._element.empty();
        if (this._configurationOptions) {
            $.each(this._configurationOptions, function (i, item: ChartConfigurationConstraint) {
                var editorType = that._makeEditorTypeMap()[item.name];
                that._itemEditors[i] = <ChartItemEditorBase>Controls.BaseControl.createIn(editorType, that._element,
                    <ChartItemEditorBaseOptions>{
                        activeConfiguration: that._activeConfiguration,
                        chartMetadataProvider: that._options.chartMetadataProvider,
                        targetConstraint: item,
                        change: () => {
                            that._fireChange();
                        },
                        useBowtie: true
                    });
            });
        }
    }

    public getCurrentState() {
        return this._activeConfiguration;
    }

    protected _updateEditorErrorVisibility(editor: ChartGroupEditor) {
        //No-op by default.
    }

    protected _makeEditorTypeMap() {
        ///<summary>Generates a relation between Editor Constraint Names to Editor types</summary>

        var editorMap = {};
        editorMap[ConfigurationConstraintNames.groupBy] = ChartGroupEditor;
        editorMap[ConfigurationConstraintNames.columns] = ChartGroupEditor;
        editorMap[ConfigurationConstraintNames.series] = ChartGroupEditor;

        editorMap[ConfigurationConstraintNames.measure] = ChartMeasureEditor;
        editorMap[ConfigurationConstraintNames.historyRange] = ChartHistoryRangeEditor;

        editorMap[ConfigurationConstraintNames.orderBy] = ChartOrderingEditor;
        return editorMap;
    }
}

VSS.initClassPrototype(ChartConfigurationEditor, {
    _configurationOptions: [],
    _activeConfiguration: [],
    _itemEditors: []
});

/**
 * Legacy only Chart Configuration Editor. Provides minimal error location affordance for color-blind users.
 */
export class LegacyChartConfigurationEditor extends ChartConfigurationEditor {
    public initializeOptions(options?: any) {
        /// <param name="options" type="any" />

        super.initializeOptions($.extend({
            cssClass: "legacy-chart-configuration-editor"
        }, options));
    }

    protected _updateEditorErrorVisibility(editor: ChartGroupEditor) {
        editor.updateErrorVisibility();
    }

}

/**
 * Re-styled Chart Configuration editor for use in Chart Widget Editor
 *  This version includes default use of bowtie visual styling and "inline errors".
 */
export class ChartWidgetConfigurationEditor extends ChartConfigurationEditor {

    /** Array of SettingsField's to enable drawing error message under editor items */
    public _settingsFields: SettingsField<ChartItemEditorBase>[];
    /**
     * Render the Configuration Editor UI, overriding default chart configuration editor behavior with bowtie-style validation
     */
    public render() {
        this._itemEditors = [];
        this._settingsFields = [];
        this._element.empty();
        if (this._configurationOptions) {
            $.each(this._configurationOptions, (i, constraint: ChartConfigurationConstraint) => {
                let useBowtie = this._options.isLegacyConfiguration !== true;
                let editorType = this._makeEditorTypeMap()[constraint.name];

                // Create editor item without attaching it to DOM
                let editorItem = <ChartItemEditorBase>Controls.BaseControl.createIn(editorType, null, {
                    activeConfiguration: this._activeConfiguration,
                    chartMetadataProvider: this._options.chartMetadataProvider,
                    targetConstraint: constraint,
                    // Show/hide errors under specific editor
                    change: (item: ChartItemEditorBase) => {

                        //Suppress attempted selections of placeholder message occupying the group name list, while the the chart Config doesn't have an artifact..
                        if (this._options.ignoreGroupSelection && editorType == ChartGroupEditor) {
                            (item as ChartGroupEditor).clearSelection();
                            return;
                        }

                        let hasError = !editorItem.checkCorrectness();
                        this._settingsFields[i].toggleError(hasError);
                        this._fireChange();
                    },
                    useBowtie: useBowtie,
                });

                let settingsField = SettingsField.createSettingsField({
                    control: editorItem,
                    initialErrorMessage: this.getErrorMessage(), //Note: Unlike the Chart Dialog, chart config error messages do not vary by sub-control
                });

                /* Ensure hidden fields stay out of view.
                   Single element Area Chart is a critical example of this, as it has a required field which is not user-configurable.*/
                if (constraint.hidden) {
                    settingsField.hideElement();
                }

                //Suppress attempted selections of placeholder message occupying the group name list, while the the chart Config doesn't have an artifact..
                if (this._options.ignoreGroupSelection && editorType == ChartGroupEditor) {
                    (editorItem as ChartGroupEditor).clearSelection();
                }

                this._element.append(settingsField.getElement());

                this._itemEditors[i] = editorItem;
                this._settingsFields[i] = settingsField;

            });
        }
    }

    /**
     * Iterate over all fields and toggle visibility of error control
     */
    public validate() {
        this._settingsFields.forEach((field, index) => {
            let control = <ChartItemEditorBase>field.getControl();
            if (control.checkCorrectness()) {
                this._settingsFields[index].hideError();
            } else {
                this._settingsFields[index].showError();
            }
        });
    }

    // Note: This kind of method does not belong in the chart editor code.
    // This codepath warrants refactoring + extraction in master.
    public getFirstGroupingDimension(): string {
        let state = this.getCurrentState();
        let provider = <DataServices.IChartMetadataProvider>this._options.chartMetadataProvider;

        let field: string = null;

        switch (state.chartType) {
            // Area Chart does not use any grouping, keep field null.
            case Charting_Charts.ChartTypes.areaChart:
                break;

            // These charts use two grouping dimensions.
            case Charting_Charts.ChartTypes.stackBarChart:
            case Charting_Charts.ChartTypes.pivotTable:
                field = state.transformOptions.series;
                break;

            // Default behavior is used for all other (single-dimensional) types:
            default:
                field = state.transformOptions.groupBy;
                break;
        }

        let dimensionName = !!field ? this._searchLabelByName(provider.getGroupableFields(), field) : null;
        return dimensionName;
    }

    public _searchLabelByName(items: DataServices.INameLabelPair[], name: string): string {
        let result: string = null;
        items.some((item) => {
            if (item.name === name) {
                result = item.labelText;
                return true;
            }
            return false;
        });
        return result;
    }

    /** Exposes a standard error message to provide for inline errors in any elements of the UI. */
    public getErrorMessage() {
        return (this._options.selectionCustomError != null) ?
            this._options.selectionCustomError :
            ChartingResources.ChartConfiguration_GenericDropdownError;
    }
}

export interface ChartTemplateListOptions {
    defaultChartType: string;
    source: ChartTemplateItem[];
    change: Function;

    /**
     * For Accessibility: Describes DOM ID of  element responsble for labelling the Template list control.
     */
    labelledById?: string;

    /**
     * The ID of the element being used as the tab panel of the control.
     */
    dependentControlId: string;
}

export class ChartTemplateList extends Controls.Control<ChartTemplateListOptions> {
    private _selectedId: number;
    private _elementList: HTMLElement[];
    private _itemList: ChartTemplateItem[];

    constructor(options?: ChartTemplateListOptions) {
        super(options);
    }

    public initializeOptions(options?: ChartTemplateListOptions) {
        if (!options.dependentControlId) {
            throw Error("dependentControlId must be defined");
        }

        super.initializeOptions($.extend({
            coreCssClass: "chart-template-list",
        }, options));
    }

    public initialize() {
        super.initialize();

        let $itemContainer: JQuery;
        this._elementList = [];
        this._selectedId = -1;
        this._itemList = this._options.source;

        $itemContainer = this.getElement()
            .attr("role", "tablist")
            .attr("aria-orientation", "vertical");

        if (this._options.labelledById) {
            $itemContainer.attr("aria-labelledby", this._options.labelledById);
        }

        const $rowElement = $("<span>")
            .appendTo($itemContainer);
        $.each(this._options.source, (i, item) => {
            const $innerElement = this._makeElement(item);
            $innerElement.appendTo($rowElement);

            this._elementList[i] = $innerElement[0];
        });


        if (this._options.defaultChartType) {
            let selectedItems = $.map(this._options.source, (item, i) => {
                return (item.chartType === this._options.defaultChartType) ? i : null;
            });
            if (selectedItems.length > 0) {
                this.selectId(selectedItems[0], true /* suppress notification */);
            }
        }
    }

    public getTooltipText(item: ChartTemplateItem): string {
        return Utils_String.format(ChartingResources.ChartConfiguration_ChartTypeTooltipFormat, item.labelText, item.advancedToolTip);
    }

    public selectId(id: number, suppressNotify?: boolean): void {
        if (id === this._selectedId) {
            return;
        }

        const ariaSelectionAttribute = "aria-selected";

        if (this._selectedId >= 0) {
            const $oldElement = $(this._elementList[this._selectedId]);
            $oldElement.removeClass("selected")
                .removeAttr("tabindex");

            $oldElement.attr(ariaSelectionAttribute, "false");
        }

        if (id >= 0 && id < this._elementList.length) {
            this._selectedId = id;
            let $newElement = $(this._elementList[id]);

            $newElement.attr(ariaSelectionAttribute, "true");

            $newElement.addClass("selected")
                .attr("tabindex", 0);

            if (!suppressNotify) {
                $newElement.focus();
                this._fireChange();
            }
        }
    }

    protected getSelectedId(): number {
        return this._selectedId;
    }

    protected getListLength(): number {
        return this._itemList.length;
    }

    /**
     * Selects the element assocatiated with the list item
     */
    public selectItem(item: HTMLElement) {
        const index = this._elementList.indexOf($(item)[0]);

        if (index >= 0) {
            this.selectId(index);
        }
    }

    public getSelectedItem(): ChartTemplateItem {
        return this._itemList[this._selectedId];
    }

    protected _makeElement(item: ChartTemplateItem): JQuery {
        let that: ChartTemplateList = this;
        let $a = $("<a />")
            .append($("<span />")
                .addClass("icon")
                .addClass(this.getCssIconClass(item)))
            .append($("<span />")
                .addClass("title")
                .text(item.labelText))
            .keydown((e?: JQueryEventObject) => {
                this.handleKeyNavigation(e);
            })
            .click(function (e?: JQueryEventObject) {
                that.selectItem(this);
                //Suppress default navigation on hyperlink.
                e.preventDefault();
            });

        $a.attr("aria-controls", this._options.dependentControlId);
        $a.attr("aria-selected", "false");
        $a.attr("role", "tab");

        PopupContent.RichContentTooltip.add(this.getTooltipText(item), $a, { setAriaDescribedBy: true });

        return $a;
    }

    // Get the icon for creating the chart type
    protected getCssIconClass(item: ChartTemplateItem): string {
        return item.cssIconClass;
    }

    /**
     * Handle keyboard navigation for grid/list navigation.
     * @param e
     */
    protected handleKeyNavigation(e: JQueryEventObject) {
        const lastIndex = this.getListLength() - 1;

        const targetIndex = GridUtils.interpretGridKeyPress(e, this._selectedId, 1 /* column count*/, this.getListLength());

        if (targetIndex !== null) {
            this.selectId(targetIndex);
            e.preventDefault();
            e.stopPropagation();
        } else {
            switch (e.keyCode) {
                case Utils_UI.KeyCode.ENTER:
                case Utils_UI.KeyCode.SPACE:
                    this.selectId(this._selectedId);
                    e.preventDefault();
                    e.stopPropagation();
                    break;
            }
        }
    }
}

VSS.initClassPrototype(ChartTemplateList, {
    _selectedId: -1,
    _elementList: null
});

export interface ChartConfigurationDialogOptions extends Dialogs.IModalDialogOptions {
    chartDataProvider?: DataServices.IQueryExecutionEngine;
    chartMetadataProvider?: DataServices.IChartMetadataProvider;
    chartConfiguration?: DataServices.IChartConfiguration;
    chartTemplates?: any;
    canSaveEmptyChart?: boolean;
    getFilterContext?: Function;
    tfsContext?: TFS_Host_TfsContext.TfsContext;
}

export class ChartConfigurationDialog extends Dialogs.ModalDialogO<ChartConfigurationDialogOptions> {
    /// <summary>Dialog for Configuring Charts.</summary>

    public static readonly DEFAULT_DIALOG_WIDTH: number = 838;
    public static readonly DEFAULT_DIALOG_HEIGHT: number = 476; // Dialog size for containing all supported chart types.
    public static readonly MIN_DIALOG_HEIGHT: number = 454; //Minimum size for dialog to properly contain preview and title, for charts which do not expose all chart types.

    public static readonly COLOR_RESET_LINK_CLASSNAME = "color-picker-reset-link";

    public static readonly enhancementTypeName: string = "tfs.chartconfigurationdialog";

    private static readonly _maxTitleLength: number = 255;

    private _chartTemplateList: ChartTemplateList;
    private _chartConfigurationEditor: ChartConfigurationEditor;
    private _chartConfiguration: DataServices.IChartConfiguration;
    private _chartData: DataServices.IDataTable;
    private _chartPreview: Charting_Charts.LightweightChartBase;
    private _$chartContainer: JQuery;
    private _titleControl: ChartTextEditor;
    private _messageArea: Notifications.MessageAreaControl;
    private _statusControl: StatusIndicator.StatusIndicator;

    private _colorEditingModel: Charting_Color.ColorEditingModel;
    private _colorManagerControl: ColorManager.ColorManagerControl;

    private _chartDataProvider: DataServices.IQueryExecutionEngine;
    private _chartMetadataProvider: DataServices.IChartMetadataProvider;
    private _closeOnHistoryChangedDelegate: any;
    private _pendingTransformRequestsCounter: number;
    private _chartTitleWasValid: boolean;
    private _latestConfigurationIsValid: boolean; // Describes if the active configuration state

    constructor(options?: any) {
        Diag.logTracePoint("ChartConfigurationDialog.constructor");
        super(options);
    }

    public initializeOptions(options?: any) {
        /// <param name="options" type="any" />

        super.initializeOptions($.extend({
            title: Resources.ConfigureChartDialogTitle,
            width: ChartConfigurationDialog.DEFAULT_DIALOG_WIDTH,
            height: ChartConfigurationDialog.DEFAULT_DIALOG_HEIGHT,
            cssClass: "chart-configuration-dialog chartpin",
            resizable: false,
            dialogClass: "chart-configuration-dialog-container",
            canSaveEmptyChart: false
        }, options));
    }

    public initialize() {
        super.initialize();
        Diag.logTracePoint("ChartConfigurationDialog.initialize.begin");

        this._pendingTransformRequestsCounter = 0;
        this._latestConfigurationIsValid = false;
        this._chartTitleWasValid = false;
        this._closeOnHistoryChangedDelegate = delegate(this, this._onHistoryChangedHandler);
        //Monitor global history change events, to allow for closing the dialog. The dialog can stay up because charts and queries are on the same underlying page.
        Navigation_Services.getHistoryService().attachNavigate(this._closeOnHistoryChangedDelegate);

        this._element.parent().keydown(delegate(this, this._onKeyDownHandler));

        this._statusControl = <StatusIndicator.StatusIndicator>Controls.BaseControl.createIn(StatusIndicator.StatusIndicator, this._element, { center: true, imageClass: "big-status-progress", message: VSS_Resources_Platform.Loading });
        this._statusControl.start();
        this._statusControl._element.attr("style", "position: absolute; background: white; top: 0px; ");
        this._element.parent().append(this._statusControl._element);

        this._updateButtonState();

        this._chartDataProvider = this._options.chartDataProvider;
        this._chartMetadataProvider = this._options.chartMetadataProvider;

        //Get the current version of the Saved chart from server
        var renderPage = (chartConfiguration: DataServices.IChartConfiguration) => {
            this._chartConfiguration = $.extend(true, {}, chartConfiguration);

            var featureColorProvider = Charting_Color.getFeatureColorProvider(this._chartConfiguration.scope);
            var colorDictionary = Charting_Color.ColorDictionary.fromColorEntries(featureColorProvider, this._chartConfiguration.userColors);
            this._colorEditingModel = new Charting_Color.ColorEditingModel(this._chartConfiguration.transformOptions.groupBy, colorDictionary, featureColorProvider);

            this._loadMetaData();
        };

        if (this._options.chartConfiguration.chartId) {
            DataServices.ChartConfigStore.beginGetChartConfiguration(
                this._options.tfsContext.navigation.projectId, this._options.chartConfiguration.chartId, renderPage, (error) => {
                    this._statusControl.complete();
                    this.showError(error);
                });
        } else {
            renderPage(this._options.chartConfiguration);
        }

        //Note: Rendering of Chart editor dropdowns are gated on readiness of metadata.
        Diag.logTracePoint("ChartConfigurationDialog.initialize.end");
    }

    public onClose(e?) {
        /// <summary>OVERRIDE: Cleanup on the dialog - unregister the history change listener.</summary>
        Navigation_Services.getHistoryService().detachNavigate(this._closeOnHistoryChangedDelegate);

        super.onClose(e);
    }

    private _onHistoryChangedHandler(sender, args) {
        this.close();
    }

    private _loadMetaData() {
        var constraints: ChartConfigurationConstraint[];
        Diag.Debug.assertIsObject(this._chartMetadataProvider, "chartColumnProvider is neccessary to supply chart metadata");
        Diag.logTracePoint("ChartConfigurationDialog._loadMetaData.begin");
        if (this._chartMetadataProvider) {
            this._chartMetadataProvider.beginGetMetadata(() => {
                this._deferredRender();
                constraints = this._chartTemplateList.getSelectedItem().configurationConstraints;
                this._chartConfigurationEditor.setOptions(constraints, this._chartConfiguration);
                this._updateChartConfiguration();

                Diag.logTracePoint("ChartConfigurationDialog._loadMetaData.end");
            }, (error) => {
                this._statusControl.complete();
                this.showError(DataServices.DataServicesHelpers.InterpretServerError(error));
            });
        }
    }

    private _deferredRender() {
        ///<summary>Defer on render until the page is ready.</summary>
        var i,
            $dialogBody,
            $editBody;
        this._statusControl.complete();

        var $typeSelectorBlock = $("<div />")
            .addClass("chart-template-list-container")
            .appendTo(this._element);
        let chartTemplateListLabelId = "ChartTemplateList_of_" + this.getId();
        $("<div />").addClass("chart-template-list-label")
            .appendTo($typeSelectorBlock)
            .text(ChartingResources.ChartEditor_ChartTypeLabel)
            .attr("id", chartTemplateListLabelId);

        $dialogBody = $("<div />").addClass("chart-dialog-body").appendTo(this._element);

        const chartEditBodyId = "ChartEditBody_of_" + this.getId();
        $editBody = $("<div />")
            .attr("id", chartEditBodyId)
            .addClass("chart-edit-body")
            .attr("role", "tabpanel")
            .appendTo($dialogBody);

        this._chartTemplateList = ChartTemplateList.create(ChartTemplateList, $typeSelectorBlock,
            <ChartTemplateListOptions>{
                tfsContext: this._options.tfsContext,
                source: this._options.chartTemplates,
                defaultChartType: this._chartConfiguration.chartType,
                change: () => {
                    this._chartConfiguration.chartType = this._chartTemplateList.getSelectedItem().chartType;
                    this._updateChartTemplate();
                },
                labelledById: chartTemplateListLabelId,
                useTabs: true,
                dependentControlId: chartEditBodyId
            });

        this._titleControl = <ChartTextEditor>Controls.BaseControl.createIn(ChartTextEditor, $editBody,
            <ChartTextEditorOptions>{
                change: () => {
                    this._checkTitle();
                    return false;
                },
                initialValue: Utils_String.decodeHtmlSpecialChars(this._chartConfiguration.title),
                maxLength: ChartConfigurationDialog._maxTitleLength,
                //We're re-using the ChartItemEditorBase for presentational not integrated into the standard config model.
                activeConfiguration: <any>{},
                chartMetadataProvider: <any>{},
                targetConstraint: {
                    labelText: ChartingResources.ChartEditor_NameLabel,
                    watermarkMessage: ChartingResources.EnterChartTitle,
                    name: "title"
                },
                useBowtie: true
            });

        this._checkTitle(true);

        this._chartConfigurationEditor = LegacyChartConfigurationEditor.create(LegacyChartConfigurationEditor, $editBody,
            {
                tfsContext: this._options.tfsContext,
                chartMetadataProvider: this._chartMetadataProvider,
                activeConfiguration: this._chartConfiguration,
                change: () => {
                    this._updateChartConfiguration();
                }
            });

        this._$chartContainer = $("<div/>")
            .addClass("chart-container chartpin")
            .appendTo($dialogBody);

        this._makeChart(this._chartTemplateList.getSelectedItem().chartType);

        this._chartTemplateList.getElement().focus();
    }

    private _isTitleValid(title: string): boolean {
        return ChartTextEditor.isStringValid(title, ChartConfigurationDialog._maxTitleLength)
    }

    private _checkTitle(isInitial?: Boolean) {
        this._chartConfiguration.title = Utils_String.htmlEncode(this._titleControl.getText());

        // Show a warning message in the Status Indicator if chart title is invalid.
        if (!this._isTitleValid(this._chartConfiguration.title)) {
            this._chartTitleWasValid = false;
            this._chartPreview.displayMessage(ChartingResources.EnterChartTitle, Charting_Charts.LightweightChartBase._warningIconClass);
        } else if (!this._chartTitleWasValid) {
            this._chartTitleWasValid = true;
            this._chartConfigurationEditor &&
                this._updateChartConfiguration();
        }

        this._titleControl.repaintValidity();
        this._updateButtonState();
    }

    private _onKeyDownHandler(event) {
        ///<summary>For any inputs other than text input, filter out backspace to prevent. </summary>

        //Get HTML element originating the event.
        var eventOrigin = event.srcElement || event.target;
        if (eventOrigin && eventOrigin.tagName !== "INPUT" && eventOrigin.type !== "text" && event.keyCode === Utils_UI.KeyCode.BACKSPACE) {
            return false;
        }
    }

    private _refreshData(transformOptions: DataServices.ITransformOptions) {
        Diag.logTracePoint("ChartConfigurationDialog._refreshData.start");
        this._chartPreview.displayMessage(Resources.ChartMessage_Loading, Charting_Charts.LightweightChartBase._statusIconClass);
        this._updateButtonState();

        if (this._chartDataProvider) {
            transformOptions = DataServices.DataServicesHelpers.applyFilterContext(transformOptions, this._options.getFilterContext());
            this._pendingTransformRequestsCounter++;
            this._latestConfigurationIsValid = true;
            var requestCounter = this._pendingTransformRequestsCounter;

            this._chartDataProvider.beginPostDataQuery(
                this._options.tfsContext.navigation.projectId,
                this._chartConfiguration.scope,
                [transformOptions],
                (results: DataServices.IDataTable[]) => {
                    // refresh chart for the last made request only
                    if (this._isLastRequest(requestCounter) && this._latestConfigurationIsValid) {
                        //Apply the first data set we get from the provider. While editing, we shouldn't be requesting more than one.
                        this._chartData = results[0];
                        this._chartPreview.setDataset(this._chartData.data);
                        this._chartPreview.setTransformOptions(this._getActiveTransformOptions());
                        this._renderColorManager();
                        this._updateButtonState();

                        Diag.logTracePoint("ChartConfigurationDialog._refreshData.end");
                    }
                }, (error) => {
                    if (this._isLastRequest(requestCounter) && this._latestConfigurationIsValid) {
                        let errorMessage = DataServices.DataServicesHelpers.InterpretServerError(error);
                        Utils_Accessibility.announce(errorMessage, true /*assertive*/);
                        this._chartPreview.displayMessage(errorMessage, Charting_Charts.LightweightChartBase._errorIconClass);
                        this._chartData = null;
                        this._updateButtonState();
                    }
                });
        }
    }

    private _isLastRequest(requestCounter: number): boolean {
        return requestCounter === this._pendingTransformRequestsCounter
            && this._latestConfigurationIsValid;
    }

    private _makeChart(chartTypeName) {
        // A small factory method for Chart instantiation.
        const chartType = Charting_Charts.ChartTypes.makeChartTypeMap()[chartTypeName];

        this._$chartContainer.empty(); //Clear any prior charts out

        const chartOptions: Charting_Charts.LightweightChartOptions = {
            width: Charting_Charts.LightweightChartBase.defaultWidth,
            height: Charting_Charts.LightweightChartBase.defaultHeight,
            colorDictionary: this._colorEditingModel.getCurrentColorDictionary(),
            editModeActive: true
        };

        if (chartType) {
            this._chartPreview = Charting_Charts.LightweightChartBase.create(chartType, this._$chartContainer, chartOptions);
        }
    }

    private _updateChartTemplate() {
        /// <summary> This method re-renders the chart while taking into consideration the previous values of each drop down box that the user has selected

        var constraints: ChartConfigurationConstraint[] = this._chartTemplateList.getSelectedItem().configurationConstraints;
        this._makeChart(this._chartConfiguration.chartType);

        this._chartConfigurationEditor.setOptions(constraints, this._chartConfiguration);

        this._updateChartConfiguration();
    }

    private _checkConfigurationCompleteness(configuredTransform): Boolean {
        ///<summary>Reviews for required configuration settings. returns false while any settings are absent.</summary>

        var constraints: ChartConfigurationConstraint[] = this._chartTemplateList.getSelectedItem().configurationConstraints,
            constraint: ChartConfigurationConstraint,
            i: number,
            l: number,
            complete: Boolean = true;

        if (!this._chartTitleWasValid) {
            this._chartPreview.displayMessage(ChartingResources.EnterChartTitle, Charting_Charts.LightweightChartBase._warningIconClass);
            return false;
        }

        if (!this._chartConfigurationEditor.checkCorrectness((constraintMessage) => {
            this._chartPreview.displayMessage(constraintMessage, Charting_Charts.LightweightChartBase._warningIconClass);
        })) { return false; }

        return complete;
    }

    /**
     * Render a Color selection control under the other config editor controls.
     */
    private _renderColorManager() {
        const editorBody = $('.chart-dialog-body .chart-edit-body');

        if (this._colorManagerControl == null) {
            this._colorManagerControl = ColorManager.ColorManagerControl.create(ColorManager.ColorManagerControl,
                editorBody, {
                    onChange: () => {
                        this._chartConfiguration.userColors = this._colorManagerControl.toColorEntries();
                        this._chartPreview.repaintOnColorChange();

                        // Copied from ChartConfigurationBase._updateColorManager
                        // The color manager does not re-render if the state of the chart is consistent with the prior state.
                        // Note: When dealing with switch between subdued and normal palette, the items are the same, but the default colors are different.
                        const renderOptions = this.getColorManagerRenderOptions();
                        if (!ColorManager.ColorManagerControl.areActiveElementsSame(renderOptions.activeElements, this._colorManagerControl.getActiveElements())
                            || renderOptions.isSubduedPalette !== this._colorManagerControl.isPaletteSubdued()) {

                            this._colorManagerControl.render(renderOptions);
                        }
                    }
                });
        }

        this._colorManagerControl.render(this.getColorManagerRenderOptions());
    }

    private getColorManagerRenderOptions(): ColorManager.ColorManagerRenderOptions {
        //Area Chart only uses a single color area. As such, name is not relevant in this case.
        const suppressFieldNames = this._chartConfiguration.chartType == Charting_Charts.ChartTypes.areaChart;

        return {
            isSubduedPalette: this._chartPreview.usesSubduedPalette(),
            colorDictionary: this._colorEditingModel.getCurrentColorDictionary(),
            activeElements: this._chartPreview.getColoringItems(),
            suppressFieldNames: suppressFieldNames
        };
    }

    public onOkClick(e?: JQueryEventObject): any {
        /// <summary> Perform an async save on OK. Don't close the dialog until committed.</summary>
        /// <param name="e" type="JQueryEvent" optional="true"/>
        /// <returns type="any" />

        Diag.logTracePoint(this.getTypeName() + ".OkClicked");
        var configurationToSave: DataServices.IChartConfiguration,
            isExistingChart: boolean = (this._chartConfiguration.chartId !== null && typeof this._chartConfiguration.chartId !== "undefined"),
            resultCallback = (resultConfiguration: DataServices.IChartConfiguration) => {
                this._chartConfiguration = resultConfiguration;

                this._statusControl.complete();
                this.processResult(this.getDialogResult());
            },
            errorCallback = (error) => {
                this._statusControl.complete()
                alert(DataServices.DataServicesHelpers.InterpretServerError(error));
            };

        // push the latest local colors into configuration to be saved.
        this._chartConfiguration.userColors = this._colorManagerControl.toColorEntries();

        //Put the current active configuration into a temporary configuration for saving. If save result is successful, it will be committed in this form.
        //Do not apply changes directly to the configuration while the editor is active(and might be edited further if save fails), as this step destroys any unused configuration options.
        configurationToSave = <DataServices.IChartConfiguration>$.extend(true, {}, this._chartConfiguration);
        configurationToSave.transformOptions = this._getActiveTransformOptions();

        this._statusControl.setMessage(Resources.SavingChartChanges);
        this._statusControl.start();

        var eventName;
        if (isExistingChart) {
            eventName = "UpdateChart";
            DataServices.ChartConfigStore.beginUpdateChartConfiguration(this._options.tfsContext.navigation.projectId, configurationToSave, resultCallback, errorCallback);
        } else {
            eventName = "AddChart";
            DataServices.ChartConfigStore.beginSaveNewChartConfiguration(this._options.tfsContext.navigation.projectId, configurationToSave, resultCallback, errorCallback);
        }

        DataServices.ChartTelemetry.OnSavingChart(eventName, configurationToSave);
    }

    public getDialogResult(): Charting_Charts.IChartState {
        /// <summary>Returns the chart configuration to listeners of the dialog Ok Callback</summary>

        var state: Charting_Charts.IChartState = {
            configuration: this._chartConfiguration,
            results: this._chartData
        };

        return state;
    }

    private _updateChartConfiguration() {
        ///</summary>Repopulate Chart using current state from Config Editor </summary>

        this.handleColorDimensionChange();

        var isComplete = this._checkConfigurationCompleteness(this._chartConfiguration);
        if (isComplete) {
            this._refreshData(this._getActiveTransformOptions())
        } else {
            this._latestConfigurationIsValid = false;
            this._updateButtonState();
        }
    }

    private handleColorDimensionChange() {
        var newGroupBy = this._getActiveTransformOptions().groupBy;
        // If the user has changed the group by option, remove the color picker and load new preferences
        if (this._colorEditingModel.getCurrentDimension() !== newGroupBy) {

            this._colorEditingModel.changeColoringDimension(this._getActiveTransformOptions().groupBy);

            // Update the preview chart to use local colors for live color editing across multiple groups
            this._chartPreview.setColorDictionary(this._colorEditingModel.getCurrentColorDictionary());
        }
    }


    private _updateButtonState() {
        ///<summary>If we have a title and a chart which are both valid, permit the allow for the dialog to save.
        /// We should update on any change of the state to either item.</summary >

        this.updateOkButton(this._chartPreview && (this._chartPreview.hasValidChart() || (this._options.canSaveEmptyChart && this._chartPreview.isResultEmpty())) &&
            this._chartConfiguration && this._isTitleValid(this._chartConfiguration.title));
    }

    public static packTransformOptions(chartConfiguration: DataServices.IChartConfiguration, configurationConstraints?: ChartConfigurationConstraint[]): DataServices.ITransformOptions {
        ///<summary>Produces Transform Options involving only inputs active for the current chart. Any omitted options are pruned out.
        /// This filtering convention allows us to retain options state in the editor UI, which are not active on a given chart,
        /// This allows us to properly render and save chart settings while options irrelevant to the active chart are on hand in the editor.
        ///< / summary >
        var transformOptions: DataServices.ITransformOptions = {
            //propagate non-edited properties by default.
            transformId: chartConfiguration.transformOptions.transformId,
            filter: chartConfiguration.transformOptions.filter,

            //We flush these through based on the active chart constraints
            groupBy: "",
            orderBy: null,
            measure: null,
            historyRange: null
        };

        var constraints: ChartConfigurationConstraint[] = configurationConstraints,
            i: number,
            l: number;

        for (i = 0, l = constraints.length; i < l; i++) {
            transformOptions[constraints[i].name] = chartConfiguration.transformOptions[constraints[i].name];
        }

        return transformOptions;
    }

    private _getActiveTransformOptions(): DataServices.ITransformOptions {
        ///<summary>Produces Transform Options involving only inputs active for the current chart. Any omitted options are pruned out.
        /// This filtering convention allows us to retain options state in the editor UI, which are not active on a given chart,
        /// This allows us to properly render and save chart settings while options irrelevant to the active chart are on hand in the editor.
        ///< / summary >

        return ChartConfigurationDialog.packTransformOptions(this._chartConfiguration, this._chartTemplateList.getSelectedItem().configurationConstraints);
    }


}

export class ChartTemplateGenerator {
    //Note: Chart selection policy should move to server with the features, if any team needs to use non-default options.

    ///<Summary>Create templates for use in Chart Type Selector. This includes requirements for use by the Chart Editor.</Summary>
    public getPieTemplate(): ChartTemplateItem {
        return {
            cssIconClass: "icon-charts-pie",
            widgetConfigIconFileName: "icon-config-chart-pie.png",
            labelText: Resources.PieChartName,
            chartType: Charting_Charts.ChartTypes.pieChart,
            chartGroup: Charting_Charts.ChartGroup.current,
            configurationConstraints: this._getSimpleConstraints(),
            advancedToolTip: Resources.PieChartAdvancedTooltip
        };
    }

    public getBarTemplate(): ChartTemplateItem {
        return {
            cssIconClass: "icon-charts-bar",
            widgetConfigIconFileName: "icon-config-chart-bar.png",
            labelText: Resources.BarChartName,
            chartType: Charting_Charts.ChartTypes.barChart,
            chartGroup: Charting_Charts.ChartGroup.current,
            configurationConstraints: this._getSimpleConstraints(),
            advancedToolTip: Resources.BarChartAdvancedTooltop
        };
    }

    public getColumnTemplate(): ChartTemplateItem {
        return {
            cssIconClass: "icon-charts-column",
            widgetConfigIconFileName: "icon-config-chart-column.png",
            labelText: Resources.ColumnChartName,
            chartType: Charting_Charts.ChartTypes.columnChart,
            chartGroup: Charting_Charts.ChartGroup.current,
            configurationConstraints: this._getSimpleConstraints(),
            advancedToolTip: Resources.ColumnChartAdvancedTooltip
        };
    }

    public getStackedBarTemplate(): ChartTemplateItem {
        return {
            cssIconClass: "icon-charts-pivotchart",
            widgetConfigIconFileName: "icon-config-chart-stacked-bar.png",
            labelText: Resources.StackedBarChartName,
            chartType: Charting_Charts.ChartTypes.stackBarChart,
            chartGroup: Charting_Charts.ChartGroup.current,
            configurationConstraints: this._getStackedBarConstraints(),
            advancedToolTip: Resources.StackedBarChartAdvancedTooltip
        };
    }
    public getPivotTableTemplate(): ChartTemplateItem {
        return {
            cssIconClass: "icon-charts-pivottable",
            widgetConfigIconFileName: "icon-config-chart-pivot.png",
            labelText: Resources.PivotTableName,
            chartType: Charting_Charts.ChartTypes.pivotTable,
            chartGroup: Charting_Charts.ChartGroup.current,
            configurationConstraints: this._getPivotConstraints(),
            advancedToolTip: Resources.PivotChartAdvancedTooltip
        };

    }

    public getStackedAreaTemplate(): ChartTemplateItem {
        return {
            cssIconClass: "icon-charts-area",
            widgetConfigIconFileName: "icon-config-chart-stacked-area.png",
            labelText: Resources.StackedAreaChartName,
            chartType: Charting_Charts.ChartTypes.stackAreaChart,
            chartGroup: Charting_Charts.ChartGroup.historical,
            configurationConstraints: this._getStackedHistoricalConstraints(),
            advancedToolTip: Resources.StackedAreaChartAdvancedTooltip
        };
    }

    public getAreaTemplate(): ChartTemplateItem {
        return {
            cssIconClass: "icon-charts-area",
            widgetConfigIconFileName: "icon-config-chart-area.png",
            labelText: Resources.AreaChartName,
            chartType: Charting_Charts.ChartTypes.areaChart,
            chartGroup: Charting_Charts.ChartGroup.historical,
            configurationConstraints: this._getSimpleHistoricalConstraints(),
            advancedToolTip: Resources.AreaChartAdvancedTooltip
        };

    }

    public getLineTemplate(): ChartTemplateItem {
        return {
            cssIconClass: "icon-charts-line",
            widgetConfigIconFileName: "icon-config-chart-line.png",
            labelText: Resources.LineChartName,
            chartType: Charting_Charts.ChartTypes.lineChart,
            chartGroup: Charting_Charts.ChartGroup.historical,
            configurationConstraints: this._getLineConstraints(),
            advancedToolTip: Resources.LineChartAdvancedTooltip
        };

    }

    public getAllTemplates(templateDecorator: IDecorateTemplateTooltips): ChartTemplateItem[] {
        ///<Summary>Requires a "template decorator" provided by feature to fill out suitable tooltips.</Summary>
        var templates = [
            this.getPieTemplate(),
            this.getBarTemplate(),
            this.getColumnTemplate(),
            this.getStackedBarTemplate(),
            this.getPivotTableTemplate(),
            this.getStackedAreaTemplate(),
            this.getAreaTemplate(),
            this.getLineTemplate()
        ];
        return templateDecorator.decorateTemplates(templates);
    }

    // Snapshot Templates
    public getSnapshotTemplates(templateDecorator: IDecorateTemplateTooltips): ChartTemplateItem[] {
        ///<Summary>Requires a "template decorator" provided by feature to fill out suitable tooltips.</Summary>
        var templates = [
            this.getPieTemplate(),
            this.getBarTemplate(),
            this.getColumnTemplate(),
            this.getStackedBarTemplate(),
            this.getPivotTableTemplate(),
        ];
        return templateDecorator.decorateTemplates(templates);
    }

    private _getSimpleConstraints(): ChartConfigurationConstraint[] {
        return [
            {
                labelText: Resources.ChartConfigurationLabel_GroupBy,
                name: ConfigurationConstraintNames.groupBy,
                watermarkMessage: ChartingResources.ChartConfigurationWatermark_GroupBy
            },
            {
                labelText: Resources.ChartConfigurationLabel_Values,
                name: ConfigurationConstraintNames.measure
            },
            {
                labelText: Resources.ChartConfigurationLabel_Sort,
                name: ConfigurationConstraintNames.orderBy
            }
        ];
    }

    private _getPivotConstraints(): ChartConfigurationConstraint[] {
        return [
            {
                labelText: Resources.ChartConfigurationLabel_Rows,
                name: ConfigurationConstraintNames.series,
                watermarkMessage: ChartingResources.ChartConfigurationWatermark_Rows
            },
            {
                labelText: Resources.ChartConfigurationLabel_Columns,
                name: ConfigurationConstraintNames.groupBy,
                watermarkMessage: ChartingResources.ChartConfigurationWatermark_Columns
            },
            {
                labelText: Resources.ChartConfigurationLabel_Values,
                name: ConfigurationConstraintNames.measure
            },
            {
                labelText: Resources.ChartConfigurationLabel_Sort,
                name: ConfigurationConstraintNames.orderBy
            }
        ];
    }

    private _getStackedBarConstraints(): ChartConfigurationConstraint[] {
        return [
            {
                labelText: Resources.ChartConfigurationLabel_YAxis,
                name: ConfigurationConstraintNames.series,
                watermarkMessage: ChartingResources.ChartConfigurationWatermark_YAxis
            },
            {
                labelText: Resources.ChartConfigurationLabel_GroupBy,
                name: ConfigurationConstraintNames.groupBy,
                watermarkMessage: ChartingResources.ChartConfigurationWatermark_GroupBy
            },
            {
                labelText: Resources.ChartConfigurationLabel_Values,
                name: ConfigurationConstraintNames.measure
            },
            {
                labelText: Resources.ChartConfigurationLabel_Sort,
                name: ConfigurationConstraintNames.orderBy
            }
        ];
    }

    private _getSimpleHistoricalConstraints(): ChartConfigurationConstraint[] {
        return [
            {
                labelText: Resources.ChartConfigurationLabel_Values,
                name: ConfigurationConstraintNames.measure
            },
            {
                labelText: Resources.ChartConfigurationLabel_RollingPeriod,
                name: ConfigurationConstraintNames.historyRange
            },
            {
                labelText: Resources.ChartConfigurationLabel_Sort,
                name: ConfigurationConstraintNames.orderBy,
                hidden: true
            }
        ];
    }

    private _getStackedHistoricalConstraints(): ChartConfigurationConstraint[] {
        var historicalConstraints = this._getHistoricalConstraints();

        historicalConstraints.unshift({
            labelText: Resources.ChartConfigurationLabel_StackBy,
            name: ConfigurationConstraintNames.groupBy,
            watermarkMessage: ChartingResources.ChartConfigurationWatermark_StackBy
        });

        return historicalConstraints;
    }

    private _getLineConstraints(): ChartConfigurationConstraint[] {
        var historicalConstraints = this._getHistoricalConstraints();

        historicalConstraints.unshift({
            labelText: Resources.ChartConfigurationLabel_GroupBy,
            name: ConfigurationConstraintNames.groupBy,
            watermarkMessage: ChartingResources.ChartConfigurationWatermark_GroupBy
        });

        return historicalConstraints;
    }

    private _getHistoricalConstraints(): ChartConfigurationConstraint[] {
        return [
            {
                labelText: Resources.ChartConfigurationLabel_Values,
                name: ConfigurationConstraintNames.measure
            },
            {
                labelText: Resources.ChartConfigurationLabel_RollingPeriod,
                name: ConfigurationConstraintNames.historyRange
            },
            {
                labelText: Resources.ChartConfigurationLabel_Sort,
                name: ConfigurationConstraintNames.orderBy
            }
        ];
    }
}

export interface ITooltipMap {
    getConstraintTooltipText(constraintFieldName: string): string;
}

export interface IDecorateTemplateTooltips {
    decorateTemplates(items: ChartTemplateItem[]): ChartTemplateItem[];
}

export class DefaultTooltipDecorator implements ITooltipMap, IDecorateTemplateTooltips {
    ///<Summary>Adds Tooltip content to existing Chart Template data.
    /// For QU4, this implementation duplicates legacy (WIT) behavior.
    ///< / Summary >
    public getConstraintTooltipText(constraintFieldName: string): string {
        var val = [];

        val[ConfigurationConstraintNames.groupBy] = Resources.ChartEditorGroupingTooltip;
        val[ConfigurationConstraintNames.measure] = Resources.ChartEditorAggregationTooltip;
        val[ConfigurationConstraintNames.historyRange] = Resources.ChartEditorHistoryRangeTooltip;
        val[ConfigurationConstraintNames.orderBy] = Resources.ChartEditorOrderTooltip;

        if (val[constraintFieldName]) {
            return val[constraintFieldName];
        } else {
            return null;
        }
    }

    public decorateTemplates(items: ChartTemplateItem[]): ChartTemplateItem[] {
        /// <Summary>A fluent API to decorate in tooltips onto an existing set of chart templates.
        /// The heavy lifting is done by the per config helper.</Summary>
        var i = 0;
        var l = items.length;
        for (i = 0; i < l; i++) {
            this.decorateConstraints(items[i].configurationConstraints);
        }
        return items;
    }

    private decorateConstraints(constraints: ChartConfigurationConstraint[]) {
        var i = 0;
        var l = constraints.length;
        for (i = 0; i < l; i++) {
            constraints[i].tooltipText = this.getConstraintTooltipText(constraints[i].name);
        }
    }
}




// TFS plugin model requires this call for each tfs module.
VSS.tfsModuleLoaded("TFS.Charting.Editors", exports);
