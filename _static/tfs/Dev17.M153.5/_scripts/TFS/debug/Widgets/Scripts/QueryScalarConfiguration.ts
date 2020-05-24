import Dashboard_Shared_Contracts = require("Dashboards/Scripts/Contracts");
import { ErrorMessageControl } from "Dashboards/Scripts/ErrorMessageControl";
import { SettingsField, SettingsFieldOptionsForJQueryElement } from "Dashboards/Scripts/SettingsField";

import WidgetContracts = require("TFS/Dashboards/WidgetContracts");
import WidgetHelpers = require("TFS/Dashboards/WidgetHelpers");

import Combos = require("VSS/Controls/Combos");
import Context = require("VSS/Context");
import Controls = require("VSS/Controls");
import SDK = require("VSS/SDK/Shim");

import Base = require("Widgets/Scripts/VSS.Control.BaseWidgetConfiguration");
import QueryScalar = require("Widgets/Scripts/QueryScalar");
import QuerySelector = require("Widgets/Scripts/Shared/BladeConfigurationQueryControl");
import Widget_Telemetry = require("Widgets/Scripts/VSS.Widget.Telemetry");
import WidgetLiveTitle = require("Widgets/Scripts/Shared/WidgetLiveTitle");
import Widgets_Resources = require("Widgets/Scripts/Resources/TFS.Resources.Widgets");
import ColorPicker = require("Presentation/Scripts/TFS/TFS.UI.Controls.ColorPicker");
import Utils_String = require("VSS/Utils/String");
import Utils_UI = require("VSS/Utils/UI");

import QueryScalarView = require("Widgets/Scripts/QueryScalar");
import { RichContentTooltip } from  "VSS/Controls/PopupContent";

/**
* The view classes that encompasses the query widget custom configuration experience. 
*/
export class QueryScalarConfigurationView
    extends Base.BaseWidgetConfiguration<Dashboard_Shared_Contracts.WidgetConfigurationOptions>
    implements WidgetContracts.IWidgetConfiguration {
    // a selector drop down control to select a query. 
    private _querySelector: Dashboard_Shared_Contracts.IConfigurationControl<QueryScalar.IQueryInformation>;

    // Color Rule Controls to manage presentation of the query
    // NOTE: Public for Unit Tests
    public _defaultOptionColorPicker: ColorPicker.DefinedPaletteColorPickerControl;
    public _colorRuleControls: ColorRuleControl[];
    public _addNewColorRuleButton: JQuery;
    public _maxRuleMessage: JQuery;
    public _conditionRuleContainer: JQuery;

    private $querySelectorContainer: JQuery;

    // display section for error messages. 
    private _queryViewFields: SettingsField<Controls.Control<any>>;
    private _colorList: string[];

    private _liveTitleState: WidgetLiveTitle.WidgetLiveTitleEditor;
    private static DefaultWidgetName = Widgets_Resources.QueryScalar_DefaultWidgetName; //TODO: Extract from WidgetMetadata

    public widgetConfigurationContext: WidgetContracts.IWidgetConfigurationContext;

    public static DomCoreCssClass: string = "queryscalarconfiguration-container";
    public static QueryScalarConfigEnhancementName: string = "dashboards.queryScalarConfiguration";
    public static DomClass_QuerySelectorContainer = "query-selector-container";
    public static DomClass_ConditionalFormattingSetting: string = "conditional-formatting-setting";
    public static DomClass_BackgroundColorLabel: string = "background-color-label";
    public static DomClass_AddRule: string = "conditional-add-rule";
    public static MaxBackgroundColorRule: number = 10;

    constructor(options: Dashboard_Shared_Contracts.WidgetConfigurationOptions) {
        if (options == null) {
            throw new Error("Options must be defined");
        }

        super(options);
        this._colorList = QueryScalarConfigurationView._prepareColorList();
    }

    /**
     * Extends options for control with style enhancements, called by base control during initialization
     * @param {any} options for the control.
     */
    public initializeOptions(options: Dashboard_Shared_Contracts.WidgetConfigurationOptions) {
        super.initializeOptions($.extend({
            coreCssClass: QueryScalarConfigurationView.DomCoreCssClass
        }, options));
    }

    /**
    * The Widget Configuration view being initialized.
    */
    public initialize() {
        super.initialize();
    }

    /**
     * @implements {WidgetContracts.IWidgetConfiguration}
     */
    public load(widgetSettings: WidgetContracts.WidgetSettings,
        widgetConfigurationContext: WidgetContracts.IWidgetConfigurationContext): IPromise<WidgetContracts.WidgetStatus> {

        this.widgetConfigurationContext = widgetConfigurationContext;

        this.$querySelectorContainer = $('<div>').addClass(QueryScalarConfigurationView.DomClass_QuerySelectorContainer);

        // parse the current settings of the widget from configuration context. 
        let initialValue: QueryScalar.IQueryConfiguration = <QueryScalar.IQueryConfiguration>JSON.parse(widgetSettings.customSettings.data);

        //Construct the Query Selector in the selector Container
        this._querySelector = <QuerySelector.QuerySelectorControl>Controls.BaseControl.createIn(QuerySelector.QuerySelectorControl,
            this.$querySelectorContainer,
            this._createQuerySelectorOptions(initialValue));

        this._queryViewFields = SettingsField.createSettingsFieldForJQueryElement({
            labelText: Widgets_Resources.QueryScalar_QueryCaption,
            initialErrorMessage: Widgets_Resources.QueryScalar_ConfigNoQuerySelected,
        }, this.$querySelectorContainer);

        this._liveTitleState = WidgetLiveTitle.WidgetLiveTitleEditor.fromSettings(initialValue, QueryScalarConfigurationView.DefaultWidgetName);

        // Initializing the live title
        //Live title updates will be driven from query selector notifications
        if (initialValue && initialValue.queryName) {
            this._liveTitleState.updateTitleOnLatestArtifact(this.configureName, initialValue.queryName);
        }

        this.getElement().append(this._queryViewFields.getElement());

        // Add default background color label
        $("<label>")
            .text(Widgets_Resources.QueryScalar_BackgroundColorLabel)
            .addClass(QueryScalarConfigurationView.DomClass_BackgroundColorLabel)
            .addClass("bowtie")
            .appendTo(this.getElement());
        

        // Render default background color selection
        var defaultBackgroundColor = (initialValue && initialValue.defaultBackgroundColor) || QueryScalarView.QueryScalar.defaultBackgroundColor;
        defaultBackgroundColor = QueryScalarView.ColorRuleInterpreter.convertOldColor(defaultBackgroundColor);
        this.renderdefaultOptionColorPicker(defaultBackgroundColor);


        // Add Conditional formatting control
        this._conditionRuleContainer = $("<div>");

        let conditionalFormattingControl = SettingsField.createSettingsFieldForJQueryElement({
                labelText: Widgets_Resources.QueryScalar_ConditionalColorLabel,
                toolTipText: Widgets_Resources.QueryScalar_ConditionalColorLabelTooltip,
            },
            this._conditionRuleContainer);

        conditionalFormattingControl.getElement().addClass(QueryScalarConfigurationView.DomClass_ConditionalFormattingSetting);
        this.getElement().append(conditionalFormattingControl.getElement());


        //Get ready to create color rule controls
        this._colorRuleControls = [];
        if (initialValue && initialValue.colorRules) {
            initialValue.colorRules.forEach((colorRule) => {
                if (colorRule.isEnabled) {
                    this.createColorRuleControl(colorRule);
                }
            });
        }
        this.renderAddRuleControl();
        return WidgetHelpers.WidgetStatusHelper.Success();
    }


    public renderdefaultOptionColorPicker(colorString: string): void {
        // Add default background color control
        var colorPickerOptions = <ColorPicker.DefinedPaletteColorPickerControlOptions>{
            template: ColorPicker.PaletteTemplate.Vibrant,
            onColorSelected: () => {
                this.notifyConfigurationChange();
            },
            defaultColor: new ColorPicker.AccessibilityColor(colorString),
            ariaLabelPrefix: Widgets_Resources.QueryScalar_BackgroundColorLabel
        };

        this._defaultOptionColorPicker = <ColorPicker.DefinedPaletteColorPickerControl>
            Controls.Control.createIn<ColorPicker.DefinedPaletteColorPickerControlOptions>
                (ColorPicker.DefinedPaletteColorPickerControl, this.getElement(), colorPickerOptions);
    }

    /**
     * Create the color rule control with remove icon and message container
     * @param rule - The rule to set the control with
     */
    public createColorRuleControl(rule: QueryScalar.IQueryColorRule): void {
        var colorRuleControlOptions = <IColorRuleControlOption>{
            initialValue: rule,
            onChange: () => {
                this.notifyConfigurationChange();
            },
            onDelete: (obj: ColorRuleControl) => {
                this._onRuleControlDelete(obj);
            }
        };

        // Color rule control
        this._colorRuleControls.push(<ColorRuleControl>Controls.BaseControl.createIn<Dashboard_Shared_Contracts.ConfigurationControlOptions<QueryScalar.IQueryColorRule>>
            (ColorRuleControl,
            this._conditionRuleContainer,
            colorRuleControlOptions));
    }

    public renderAddRuleControl(): void {
        this._maxRuleMessage = $("<div>")
            .attr("role", "status")
            .addClass("rule-limit-message")
            .text(Widgets_Resources.QueryScalar_RuleLimitReached);

        this._addNewColorRuleButton = $("<div>")
            .attr("role", "button")
            .attr("aria-label", Widgets_Resources.QueryScalar_AddRule)
            .attr("id", "add-color-rule")
            .append($("<span>").addClass("bowtie-icon bowtie-math-plus"))
            .append(Widgets_Resources.QueryScalar_AddRule)
            .addClass(QueryScalarConfigurationView.DomClass_AddRule)
            .on("click", () => {
                this.addColorRuleControl();
            });

        Utils_UI.accessible(this._addNewColorRuleButton);

        this.getElement().append(this._addNewColorRuleButton)
            .append(this._maxRuleMessage);

        this._toggleAddConditionRuleLink(this._colorRuleControls.length);
    }

    /**
     * add another Color Rule Control when clicking on the 'Add Rule'
     */
    public addColorRuleControl(): void {
        var rule = this.getColorRule(this._colorRuleControls.length);
        this.createColorRuleControl(rule);
        this._toggleAddConditionRuleLink(this._colorRuleControls.length);
        this.setFocusOnRuleChanges();
        this.notifyConfigurationChange();
    }

    /**
     * Toggle the Add or Max rule limit reach link
     * @param ruleCount - The existing number of link
     */
    public _toggleAddConditionRuleLink(ruleCount: number): void {
        var canAddMoreRule = (ruleCount < QueryScalarConfigurationView.MaxBackgroundColorRule && ruleCount >= 0);
        this._maxRuleMessage.toggle(!canAddMoreRule);
        this._addNewColorRuleButton.toggle(canAddMoreRule);
    }

    /**
     * Go through the color control list and dipose the list and update the UI
     * @param obj - the color control
     */
    public _onRuleControlDelete(obj: ColorRuleControl): void {
        var controlIndex = this._colorRuleControls.indexOf(obj);
        if (controlIndex >= 0) {
            this._colorRuleControls[controlIndex].dispose();
            this._colorRuleControls.splice(controlIndex, 1);
            this._toggleAddConditionRuleLink(this._colorRuleControls.length);
            this.setFocusOnRuleChanges();
            this.notifyConfigurationChange();
        }
    }

    /**
     * Set the focus on the control when user are using the keyboard for navigation
     */
    public setFocusOnRuleChanges() {
        if (this._colorRuleControls.length > 0) {
            this._colorRuleControls[this._colorRuleControls.length - 1]._colorPicker.setFocus();
        } else {
            this._addNewColorRuleButton.focus();
        }
    }

    public _getCustomSettings(): WidgetContracts.CustomSettings {
        return { data: JSON.stringify(this.getCurrentConfiguration()) };
    }

    /**
     * @implements {WidgetContracts.IWidgetConfiguration}
     */
    public onSave(): IPromise<WidgetContracts.SaveStatus> {
        this.repaintErrors();

        if (!this.hasErrors()) {
            return WidgetHelpers.WidgetConfigurationSave.Valid(this._getCustomSettings());
        } else {
            return WidgetHelpers.WidgetConfigurationSave.Invalid();
        }
    }

    /**
     * Gather widget telemetry data upon saving configuration
     */
    public onSaveComplete(): void {
        // Count the number of enabled rules
        var ruleColors = this._colorRuleControls.map(control => control.getCurrentValue().backgroundColor);
        var enabledRulesCount = ruleColors.length || 0;

        // Create the property payload
        var properties: IDictionaryStringTo<any> = {
            "EnabledRulesCount": enabledRulesCount,
            "DefaultColor": this._defaultOptionColorPicker.getColor().asHex(),
            "RuleColors": ruleColors
        }

        // Publish
        Widget_Telemetry.WidgetTelemetry.onConfigurationSave(this.getWidgetTypeId(), properties);
    }

    public getCurrentConfiguration(): QueryScalar.IQueryConfiguration {
        var colorRules = [];
        for (var i = 0, l = this._colorRuleControls.length; i < l; i++) {
            colorRules[i] = this._colorRuleControls[i].getCurrentValue();
        }

        var queryInfo = this._querySelector.getCurrentValue();

        var updatedConfiguration: QueryScalar.IQueryConfiguration = {
            defaultBackgroundColor: this._defaultOptionColorPicker.getColor().asHex(),
            queryId: queryInfo.queryId,
            queryName: queryInfo.queryName,
            colorRules: colorRules
        };

        this._liveTitleState.appendToSettings(updatedConfiguration);

        return updatedConfiguration;
    }

    private static _prepareColorList(): string[] {
        var colorList: string[] = [];
        colorList[0] = '#339933';
        colorList[1] = '#E60017';
        colorList[2] = '#007ACC';
        colorList[3] = '#F7A24B';
        colorList[4] = '#CCCCCC';
        colorList[5] = '#FBFD52';
        colorList[6] = '#292E6B';
        colorList[7] = '#5C197B';
        colorList[8] = '#A8CE4B';
        colorList[9] = '#666666';
        return colorList;
    }

    /**
     * Get the default suggested rule based on already existing rule
     * @param index - The number of rules the user already has
     */
    public getColorRule(index: number): QueryScalar.IQueryColorRule {
        var operator = index == 0 ? '<=' : '>';
        var rule = <QueryScalar.IQueryColorRule>{
            isEnabled: true,
            operator: operator,
            thresholdCount: (index + 1) * 10,
            backgroundColor: this._colorList[index]
        };
        return rule;
    }

    /**
    * Prepare options for QuerySelector Control.
    * InitialQuerySelectorItem is permitted to be null.
    */
    private _createQuerySelectorOptions(initialQueryConfiguration?: QueryScalar.IQueryConfiguration): QuerySelector.QuerySelectorOptions {
        return <QuerySelector.QuerySelectorOptions>{
            // when query is selected, ask preview to re-render.
            onChange: () => {
                var error = this._querySelector.getErrorMessage();

                this._queryViewFields.toggleError(error ? true : false);
                (<QuerySelector.QuerySelectorControl>this._querySelector).focus();

                this._liveTitleState.updateTitleOnLatestArtifact(this.configureName, this._querySelector.getCurrentValue().queryName);
                this.notifyConfigurationChange();
            },

            initialValue: initialQueryConfiguration,

            webContext: Context.getDefaultWebContext()
        };
    }

    /**
     * Repaint the UI for known errors
     */
    public repaintErrors(): void {
        // Validate query selector
        var errorMessage = this._querySelector.getErrorMessage();
        this._queryViewFields.toggleError(errorMessage ? true : false);

        // Validate color rule controls
        for (var i = 0, l = this._colorRuleControls.length; i < l; i++) {
            this._colorRuleControls[i].setErrorMessage(this._colorRuleControls[i].getErrorMessage());
        }
    }

    public hasErrors(): boolean {
        var errorMessage = this._querySelector.getErrorMessage();

        // Validate color rule controls
        for (var i = 0, l = this._colorRuleControls.length; i < l; i++) {
            errorMessage = errorMessage || this._colorRuleControls[i].getErrorMessage();
        }
        return errorMessage ? true : false;
    }

    /** Reports to host on current state of widget */
    public notifyConfigurationChange() {
        this.repaintErrors();
        if (!this.hasErrors()) {
            this.widgetConfigurationContext.notify(WidgetHelpers.WidgetEvent.ConfigurationChange, WidgetHelpers.WidgetEvent.Args(this._getCustomSettings()));
        }
    }
}


export interface IColorRuleControlOption extends Dashboard_Shared_Contracts.ConfigurationControlOptions<QueryScalar.IQueryColorRule> {
    /** callback to handle the case when the control is removed */
    onDelete: (control: ColorRuleControl) => void;
}

/**
 * Visual Control for coloring a single rule
 */
export class ColorRuleControl extends Controls.Control<IColorRuleControlOption> {

    public static Maximum_Threshold_Characters: number = 5;

    public static Color_Css: string = "color-rule-control-color-picker";
    public static Core_css: string = "color-rule-control";
    public static StateToggle_Css: string = "color-rule-control-state";
    public static Operator_Css: string = "color-rule-control-operator";
    public static Threshold_Css: string = "color-rule-control-threshold";
    public static Label_Css: string = "color-rule-control-label";
    public static Remove_Css: string = "color-rule-remove-button";
    public static ErrorMessage_Css: string = "color-rule-error-message";

    private $row: JQuery;
    private $descriptionLabel: JQuery;
    private $errorMessage: ErrorMessageControl;

    //Child controls are public for testability only. There's no sane reason for outside components to touch these.
    public _operatorSelector: Combos.Combo;
    public _thresholdValueInput: Combos.Combo;
    public _colorPicker: ColorPicker.DefinedPaletteColorPickerControl;

    /**
     * Build one row of the rule
     * @param {IQueryColorRule} options - Default option. Used to pass already saved configuration
     */
    public constructor(options: IColorRuleControlOption) {
        super(options);
        if (options == null) {
            throw new Error("Options must be defined");
        }
    }

    /**
     * Create the UI for with the properties passed by the constructor
     */
    public initialize(): void {
        this.$row = $("<div>")
            .attr("aria-label", Widgets_Resources.QueryScalar_RuleLabel)
            .addClass(ColorRuleControl.Core_css);
        this.initializeColorPicker();
        this.initializeLabel();
        this.initializeOperator();
        this.initializeThreshold();
        this.initializeRemoveButton();
        this.initializeErrorMessageControl();
        this.getElement().append(this.$row);
    }

    /** 
     * Describes if the control is in a valid state
     * @returns Null if no errors, otherwise the first encountered error is returned
     */
    public getErrorMessage(): string {
        var errorMessage: string = null;
        errorMessage = this.validateOperator() || this.validateThresholdValue();
        return errorMessage;
    }

    public getCurrentValue(): QueryScalar.IQueryColorRule {
        var currentValue = <QueryScalar.IQueryColorRule>{
            isEnabled: true,
            backgroundColor: this.getColor(), // Not overridable right now.
            thresholdCount: this.getThresholdValue(),
            operator: this._operatorSelector.getValue<string>()
        };
        return currentValue;
    }

    /**
     * Checks if the selected operator is in the list of valid operators
     * @returns Null if valid, error message if invalid
     */
    public validateOperator(): string {
        var selectedOperator = this.getSelectedOperator();

        var errorMessage = null;
        if (QueryScalar.validQueryColorOperators.indexOf(selectedOperator) < 0) {
            errorMessage = Widgets_Resources.QueryScalar_OperatorError;
        }

        return errorMessage;
    }

    /**
     * Checks if the threshold value is a non-null positive number of 5 digits or less
     * @returns Null if valid, error message if invalid
     */
    public validateThresholdValue(): string {
        var errorMessage = null;

        var thresholdValue = this.getThresholdValue();
        var isValid = $.isNumeric(thresholdValue) // Is a number
            && Math.floor(thresholdValue) == thresholdValue // Is an integer
            && thresholdValue.toString().length <= ColorRuleControl.Maximum_Threshold_Characters // Is within our max allowed characters
            && thresholdValue >= 0; // Is positive

        if (!isValid) {
            errorMessage = Widgets_Resources.QueryScalar_ThresholdError;
        }

        return errorMessage;
    }

    /**
     * Initialize the color picker control
     */
    private initializeColorPicker(): void {
        var controlContainer = $("<div/>").addClass(ColorRuleControl.Color_Css);
        var that = this;
        var colorPickerOptions = <ColorPicker.DefinedPaletteColorPickerControlOptions>{
            template: ColorPicker.PaletteTemplate.Vibrant,
            onColorSelected: () => { this._options.onChange(); },
            defaultColor: new ColorPicker.AccessibilityColor(QueryScalar.ColorRuleInterpreter.convertOldColor(this._options.initialValue.backgroundColor)),
            ariaLabelPrefix: Widgets_Resources.QueryScalar_RuleColorLabel
        };

        this._colorPicker = <ColorPicker.DefinedPaletteColorPickerControl>
            Controls.Control.createIn<ColorPicker.DefinedPaletteColorPickerControlOptions>
                (ColorPicker.DefinedPaletteColorPickerControl, controlContainer, colorPickerOptions);
        this.$row.append(controlContainer);
    }

    /**
     * Text between the color and the operator
     */
    private initializeLabel(): void {
        this.$descriptionLabel = $("<label>")
            .text(Widgets_Resources.QueryScalar_ConditionalFormattingBackgroundColorText)
            .addClass(ColorRuleControl.Label_Css);
        this.$row.append(this.$descriptionLabel);
    }

    /**
     * Only a single logical operation per rule is permitted
     */
    private initializeOperator(): void {
        var comboOptions = this.getDefaultComboOptions();
        comboOptions.label = Widgets_Resources.QueryScalar_OperatorComboLabel;

        this._operatorSelector = <Combos.ComboO<Combos.IComboOptions>>Controls.Control.createIn<Combos.IComboOptions>
            (Combos.Combo, this.$row, $.extend(comboOptions, { allowEdit: false }));
        let selector = this._operatorSelector;
        selector.getElement()
            .addClass(ColorRuleControl.Operator_Css)
            .attr("aria-label", Widgets_Resources.QueryScalar_OperatorLabel);

        selector.setSource(QueryScalar.validQueryColorOperators); // Cannot specify the text and value???
        var targetIndex = $.inArray(this._options.initialValue.operator, $.map(QueryScalar.validQueryColorOperators, (item) => {
            return item;
        }));
        selector.setSelectedIndex(targetIndex);
    }

    /**
     * Textbox to let the user specify the threshold for the rule
     */
    private initializeThreshold(): void {
        var comboOptions = this.getDefaultComboOptions();
        this._thresholdValueInput = <Combos.ComboO<Combos.IComboOptions>>Controls.Control.createIn<Combos.IComboOptions>
            (Combos.Combo, this.$row, comboOptions);
        let thresholdValue = this._thresholdValueInput;
        thresholdValue.setMode("text");
        thresholdValue.setText(<any>this._options.initialValue.thresholdCount);
        thresholdValue.getElement()
            .addClass(ColorRuleControl.Threshold_Css)
            .attr("aria-label", Widgets_Resources.QueryScalar_RuleThresholdLabel);

        thresholdValue.getInput()
            .attr("size", ColorRuleControl.Maximum_Threshold_Characters)
            .attr("maxlength", ColorRuleControl.Maximum_Threshold_Characters);

    }

    private initializeRemoveButton(): void {
        var deleteButton = $("<div>")
            .attr("role", "button")
            .attr("aria-label", Widgets_Resources.QueryScalar_ConditionalDeleteColorRuleAriaLabel)
            .addClass(ColorRuleControl.Remove_Css)
            .append($("<div>").addClass("bowtie-icon bowtie-edit-delete"))
            .on("click", () => {
                this._options.onDelete(this);
            });
        Utils_UI.accessible(deleteButton);
        this.$row.append(deleteButton);
    }

    private initializeErrorMessageControl(): void {
        var errorDiv = $("<div>").addClass(ColorRuleControl.ErrorMessage_Css);
        this.$errorMessage = <ErrorMessageControl>Controls.BaseControl.createIn(ErrorMessageControl, errorDiv, {});
        this.$row.append(errorDiv);
    }

    /** sets up common combo box  config details, such as routing event handler to parent */
    private getDefaultComboOptions(): Combos.IComboOptions {
        return {
            change: () => {
                this._options.onChange();
            }
        };
    }

    /**
     * Returns the selected operator
     */
    private getSelectedOperator(): string {
        return this._operatorSelector.getValue<string>();
    }

    /**
     * Returns the value we use to compare the rule with or null if the value of the input is not a number or is empty
     */
    private getThresholdValue(): number {
        var parsedThreshold: number;

        try {
            var thresholdString = this._thresholdValueInput.getValue<string>();
            parsedThreshold = $.isNumeric(thresholdString) ? parseFloat(thresholdString) /* Parsing float instead of int b/c validation will check that the number is an int */ : null;
        }
        catch (e) {
            parsedThreshold = null;
        }

        return parsedThreshold;
    }

    /**
     * Returns the selected color
     */
    private getColor(): string {
        return this._colorPicker.getColor().asHex();
    }

    public setErrorMessage(errorMessage: string): void {
        this.$errorMessage.setErrorMessage(errorMessage);
    }
}

SDK.VSS.register(QueryScalarConfigurationView.QueryScalarConfigEnhancementName, () => QueryScalarConfigurationView);
SDK.registerContent("dashboards.queryScalarConfiguration-init", (context) => {
    return Controls.create(QueryScalarConfigurationView, context.$container, context.options);
});
