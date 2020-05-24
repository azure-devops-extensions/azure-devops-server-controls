import * as Q from "q";

import * as Charting from "Charting/Scripts/TFS.Charting";
import * as Charting_Charts from "Charting/Scripts/TFS.Charting.Charts";
import * as Charting_Color from "Charting/Scripts/TFS.Charting.Color";
import * as Charting_Data_Contracts from "Charting/Scripts/DataService/Contracts";
import * as Charting_DataServices from "Charting/Scripts/TFS.Charting.DataServices";
import * as Charting_Editors from "Charting/Scripts/TFS.Charting.Editors";
import { ChartTypePicker } from "Widgets/Scripts/Shared/ChartTypePicker";
import * as Chart_Contracts from "Charts/Contracts";

import * as BladeConfiguration from "Dashboards/Scripts/BladeConfiguration";
import * as Dashboard_Shared_Contracts from "Dashboards/Scripts/Contracts";
import { SettingsField, SettingsFieldOptionsForJQueryElement } from "Dashboards/Scripts/SettingsField";

import * as PresentationResources from "Presentation/Scripts/TFS/Resources/TFS.Resources.Presentation";
import * as TFS_Host_TfsContext from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import * as TFS_OM_Common from "Presentation/Scripts/TFS/TFS.OM.Common";

import * as TFS_Dashboards_Contracts from "TFS/Dashboards/Contracts";
import * as WidgetContracts from "TFS/Dashboards/WidgetContracts";
import * as WidgetHelpers from "TFS/Dashboards/WidgetHelpers";

import * as Controls from "VSS/Controls";

import * as Base from "Widgets/Scripts/VSS.Control.BaseWidgetConfiguration";
import * as BaseChart from "Widgets/Scripts/BaseChart";
import * as ColorManagerControl from "Charting/Scripts/ColorManagerControl";
import * as Widgets_Resources from "Widgets/Scripts/Resources/TFS.Resources.Widgets";
import * as WidgetLiveTitle from "Widgets/Scripts/Shared/WidgetLiveTitle";

/** Interface extending IChartConfiguration contract to include Widget live title support.
  * Modern Chart Widget & Chart Configuration Blade use this model instead of IChartConfiguration. */
export interface IChartConfigurationLiveTile extends Charting_DataServices.IChartConfiguration, WidgetLiveTitle.ITrackName {
}

/** Data Selector features to provide Selector UI for integration with Chart Configuration Blade.
    This allows Feature teams to get standard Chart Config UI, which depends on predictable interactions from a feature selector. */
export interface IDataSelector {
    /** Renders a control for selecting this feature's data */
    renderSelector(): JQuery;

    /**Exposes the name of the currently selected item */
    getSelectionName(): string;

    /**Exposes identifier data about the currently selected item */
    getSelectionIdentifier(): string;

    /**Indicates if the selector is in a valid state */
    isValid(): boolean;

    /** Bowtie compatability: Force non-interacted selector to display error on save */
    showErrorOnSave(): void;
}

export interface IDataSelectorOptions {
    initialValue: string;
    onChange(metadataProvider: Charting_DataServices.IChartMetadataProvider): void;
}

export class ChartConfigurationBase
    extends Base.BaseWidgetConfiguration<Dashboard_Shared_Contracts.WidgetConfigurationOptions>
    implements WidgetContracts.IWidgetConfiguration {

    /* The version level we use when saving Chart Settings to Widget Configuration. */
    private static currentVersion: TFS_Dashboards_Contracts.SemanticVersion = <TFS_Dashboards_Contracts.SemanticVersion>{
        major: 3,
        minor: 0,
        patch: 0
    };

    public _widgetConfigurationContext: WidgetContracts.IWidgetConfigurationContext;
    public _featureDataSelector: IDataSelector;

    public _chartTemplateList: ChartTypePicker;
    public _chartConfiguration: IChartConfigurationLiveTile;
    public _chartConfigurationEditor: Charting_Editors.ChartWidgetConfigurationEditor;

    public _$chartConfigurationEditorContainer: JQuery;
    public _colorManagerControl: ColorManagerControl.ColorManagerControl;

    public _initialWidgetName: string;  // keep track the initial name of the widget
    //We use this to determine if a config change warrants a discard of color management state.
    public _colorConfigurationTracker: ColorManagerControl.ColorConfigurationTracker;
    public _liveTitleState: WidgetLiveTitle.WidgetLiveTitleEditor;

    private _controlsAreInitialized: boolean;

    /** Used to track size change for color picker update from widget */
    private previousSize: TFS_Dashboards_Contracts.WidgetSize;


    /**Start of Feature-specific extension points - these are required and MUST be overriden. */

    /** Instantiates the data selector for this feature. */
    public createFeatureSelector(options: IDataSelectorOptions): IDataSelector {
        //Base implementation- Derived Features must implement this.
        throw new Error("Not Implemented");
    }

    /** Takes query data and packs up the minimum configuration state needed so new chart dialog can customize settings for persistence */
    public createDefaultChartConfiguration(): Charting_Data_Contracts.ChartConfiguration {
        //Base implementation- Derived Features must implement this.
        throw new Error("Not Implemented");
    }

    /** Provides an initial title for newly created Widgets.*/
    public getInitialTitle(): string {
        //Base implementation- Derived Features must implement this.
        throw new Error("Not Implemented");
    }

    /** Provides feature specific name for artifacts.
    This is normally provided by feature metadata after a data source is selected, but the editor needs it before the user has selected an item. */
    public getArtifactPluralName(): string {
        throw new Error("Not Implemented");
    }

    /**
     * Get a feature centric message for reminding users they need to select a data source.
     */
    public getSelectArtifactReminderMessage(): string {
        throw new Error("Not Implemented");
    }

    /** Provides feature specific warning message for widgets which are being upgraded. */
    public getUpgradeWarning(): string {
        throw new Error("Not Implemented");
    }

    /** Provides feature specific warning message for warning a user that they need to select a data source. */
    public getDataSourceNeededMessage(): string {
        throw new Error("Not Implemented");
    }

    /** Generates a default title for configured widget.*/
    public generateDefaultTitle(): string {
        //Base implementation- Derived Features must implement this.
        throw new Error("Not Implemented");
    }

    /** End of Feature-Specific Extension points */


    constructor(options?: Dashboard_Shared_Contracts.WidgetConfigurationOptions) {
        super(options);
    }

    public initializeOptions(options: Dashboard_Shared_Contracts.WidgetConfigurationOptions) {
        super.initializeOptions($.extend({
            coreCssClass: "chartconfiguration-container"
        }, options));
    }

    public initialize() {
        super.initialize();
    }

    /** Indicates the Persistence version for the Widget. */
    public getCurrentVersion(): TFS_Dashboards_Contracts.SemanticVersion {
        // Return a copy to prevent accidental changes to this private static field
        return $.extend({}, ChartConfigurationBase.currentVersion);
    }

    /*Load the Configuration UI, given the supplied settings and context. */
    public load(widgetSettings: WidgetContracts.WidgetSettings,
        widgetConfigurationContext: WidgetContracts.IWidgetConfigurationContext): IPromise<WidgetContracts.WidgetStatus> {


        this._widgetConfigurationContext = widgetConfigurationContext;

        this._initialWidgetName = widgetSettings.name;
        //Ensure we have the chart configuration populated (Legacy charts only have an ID, which needs to be read from server)
        return this.populateChartConfiguration(widgetSettings).then((configuration: Charting_Data_Contracts.ChartConfiguration) => {
            return this.onConfigurationLoaded(widgetSettings, configuration);
        });
    }

    /** Render the body of the config, once the complete Chart configuration is on hand. */
    public onConfigurationLoaded(widgetSettings: WidgetContracts.WidgetSettings,
        configuration: Charting_Data_Contracts.ChartConfiguration): IPromise<WidgetContracts.WidgetStatus> {

        // This is using typescript type compatibility since contracts currently match 1:1
        // http://www.typescriptlang.org/Handbook#type-compatibility
        // Effectively, old Data Contracts ChartConfiguration is only used for parsing and basechart - probably needs to be migrated
        this._chartConfiguration = configuration;

        // Re-parse widget settings since ChartConfiguration contract doesn't contain lastArtifactName field,
        // but it may exist in actual customSettings
        var widgetCustomSettings = JSON.parse(widgetSettings.customSettings.data);
        if (widgetCustomSettings) {

            this._chartConfiguration.lastArtifactName = widgetCustomSettings.lastArtifactName;

            //If this chart was upgraded from a saved V1 chart:
            //The initial title needs to refer to the last known name in the chart configuration, not the name at the time the chart was pinned.
            if (widgetSettings.customSettings.version != null && widgetSettings.customSettings.version.major == 1
                && configuration != null && configuration.title != null) {
                this.configureName.setCurrentWidgetName(configuration.title);
                this._initialWidgetName = configuration.title;
            }
        }

        //Live title updates setup
        this._liveTitleState = WidgetLiveTitle.WidgetLiveTitleEditor.fromSettings(
            this._chartConfiguration,
            this.getInitialTitle()
        );


        //useLegacyPalette param is used to signify that the color manager should ensure all known elements are explicitly given colors from legacy palette
        // We should do this with previously saved charts which are not modern.
        var useLegacyPalette = widgetSettings.customSettings.data != null && BaseChart.BaseChartWidget.getSettingsVersion(widgetSettings.customSettings).major <= 2;
        this._colorConfigurationTracker = new ColorManagerControl.ColorConfigurationTracker(this._chartConfiguration, useLegacyPalette);


        //If the user has a pre-configured V1 widget, we are cutting the link to the underlying chart. This step provides a warning message just below the Name field.
        // Note: a newly created widget from catalog also starts life in the V1 state, but has no initial configuration.
        // Because unconfigured widgets have no relationship to anything, we do not show this message in the *unconfigured* V1 case.
        if (widgetCustomSettings != null && BaseChart.BaseChartWidget.getSettingsVersion(widgetSettings.customSettings).major == 1) {
            this.getElement().append(this.renderUpgradeMessage());
        }

        this._populateControls();
        return WidgetHelpers.WidgetStatusHelper.Success();
    }

    // Add the controls to the config panel
    public _populateControls() {
        this.addQuerySelector(this.getElement(), this._chartConfiguration);
        this.addChartTemplateList(this.getElement());
        this.addInitialChartConfigurationEditorBlock(this.getElement());
        this._chartConfigurationEditor = this.createInitialConfigurationEditor();
        this._controlsAreInitialized = true;
    }

    public addQuerySelector($container: JQuery, chartConfiguration: IChartConfigurationLiveTile): void {
        //Instantiate a feature-specific data selector using common contract-driven options
        var dataSelectorOptions = <IDataSelectorOptions>{
            initialValue: chartConfiguration && chartConfiguration.transformOptions && chartConfiguration.transformOptions.filter,
            onChange: (metadataProvider: Charting_DataServices.IChartMetadataProvider) => {
                this.onDataSelectionChange(metadataProvider);
            }
        }
        this._featureDataSelector = this.createFeatureSelector(dataSelectorOptions);
        var $querySelectorElement = this._featureDataSelector.renderSelector();

        $container.append($querySelectorElement);
    }

    public addInitialChartConfigurationEditorBlock($container: JQuery): void {
        this._$chartConfigurationEditorContainer = $('<div>').addClass("chart-configuration-editor-container");
        $container.append(this._$chartConfigurationEditorContainer);
        //Note: Initially, a chart Configuration editor is not created. This happens after a data source is selected.
    }

    /** Handles reaction to data selection changes coming from Feature */
    public onDataSelectionChange(metadataProvider: Charting_DataServices.IChartMetadataProvider): void {
        if (this._chartConfigurationEditor) {
            this._chartConfigurationEditor.dispose();
        }

        this._chartConfigurationEditor = this.createChartConfigurationEditor(metadataProvider);

        this._chartConfiguration.groupKey = this._featureDataSelector.getSelectionIdentifier();

        //transformOptions.filter refers to The QueryId of a WIT Chart
        this._chartConfiguration.transformOptions.filter = this._featureDataSelector.getSelectionIdentifier();

        this.onChartTemplateChange();
    }

    /** Provide a properly formed chart configuration is available. */
    public populateChartConfiguration(widgetSettings: WidgetContracts.WidgetSettings): IPromise<Charting_Data_Contracts.ChartConfiguration> {
        var legacyFormChartConfiguration: Charting_Data_Contracts.ChartConfiguration = <Charting_Data_Contracts.ChartConfiguration>{};
        var deferred: Q.Deferred<Charting_Data_Contracts.ChartConfiguration> = Q.defer<Charting_Data_Contracts.ChartConfiguration>();

        // if unconfigured state populate with default configuration.
        if (widgetSettings.customSettings.data == null) {
            legacyFormChartConfiguration = this.createDefaultChartConfiguration();
            deferred.resolve(legacyFormChartConfiguration);
        }

        else {
            BaseChart.BaseChartWidget.getChartConfiguration(widgetSettings, this.tfsContext).then(
                (newFormChartConfiguration: Charting_Data_Contracts.ChartConfiguration) => {

                    // the old and new chart config interfaces have parity however, due to its prevalent use in the existing Editor stack within the blade experience
                    // at this time the old contract is not being retired. Instead we provide a simple 1:1 field assignment from the new to the old form
                    // (assignment is done to primarily to clarify properties and provide property level build validation)
                    legacyFormChartConfiguration.chartId = newFormChartConfiguration.chartId;
                    legacyFormChartConfiguration.chartType = newFormChartConfiguration.chartType;
                    legacyFormChartConfiguration.groupKey = newFormChartConfiguration.groupKey;
                    legacyFormChartConfiguration.scope = newFormChartConfiguration.scope;
                    legacyFormChartConfiguration.title = newFormChartConfiguration.title;
                    legacyFormChartConfiguration.transformOptions = newFormChartConfiguration.transformOptions;
                    legacyFormChartConfiguration.userColors = newFormChartConfiguration.userColors;

                    deferred.resolve(legacyFormChartConfiguration);

                }, (error: any) => {
                    var nonExistentChartError = "TF401204";
                    if (error && error.message && typeof error.message == "string" && error.message.indexOf(nonExistentChartError) >= 0) {
                        //If we had a reference to a now non-existent pinned chart, reset the chart configuration.
                        widgetSettings.customSettings.version = ChartConfigurationBase.currentVersion;
                        legacyFormChartConfiguration = this.createDefaultChartConfiguration();
                        deferred.resolve(legacyFormChartConfiguration);
                    } else {
                        deferred.reject(error);
                    }
                });
        }
        return deferred.promise;
    }

    /** Renders an widget upgrade warning message.
     *  This message should only be presented to a user when upgrading a configured V1 widget (pinned chart from feature)
     */
    public renderUpgradeMessage(): JQuery {
        var $upgradeMessageContainer = $("<div>")
            .addClass("chart-widget-upgrade-message-container");

        var $icon = $("<div/>")
            .addClass("chart-widget-upgrade-message-icon")
            .addClass("bowtie-icon")
            .addClass("bowtie-status-info-outline");

        var $upgradeMessage = $("<div/>")
            .addClass("chart-widget-upgrade-message-body")
            .text(this.getUpgradeWarning());

        //upgrade message doesn't have any errors, .inline-error-text style is applied to provide common under-row footer styling.
        var $rowFooter = $("<span/>")
            .addClass("chart-widget-upgrade-message-footer")
            .addClass("inline-error-text");

        $upgradeMessageContainer.append($icon)
            .append($upgradeMessage)
            .append($rowFooter);

        return $upgradeMessageContainer;
    }

    /** Render in chart template selector list (The grid of types). */
    public addChartTemplateList($container: JQuery): void {
        // Create a container with custom class so we can override the default css style
        this._chartTemplateList = this.createChartTemplateList();

        var field = SettingsField.createSettingsField({
            labelText: Widgets_Resources.ChartWidget_ChartType,
            control: this._chartTemplateList,
            hasErrorField: true // Not used for errors. Reserves space underneath control for presentation.
        }, $container);
    }

    /** Creates the chart template list control which allows the user to select a chart type */
    public createChartTemplateList(): ChartTypePicker {
        const chartTemplates = this.getChartTemplates();

        return ChartTypePicker.create(
            ChartTypePicker,
            null,
            {
                source: chartTemplates,
                // Auto-select pie chart if existing configuration not present
                defaultChartType: this._chartConfiguration && this._chartConfiguration.chartType || Charting_Charts.ChartTypes.pieChart,
                change: () => this.onChartTemplateChange()
            });
    }

    /** Creates an artificial Configuration Editor to soothe users who expect a complete UI,
        before the data neccessary to provide a complete config UI is available. */
    public createInitialConfigurationEditor(): Charting_Editors.ChartWidgetConfigurationEditor {
        var editor = <Charting_Editors.ChartWidgetConfigurationEditor>Controls.BaseControl.createIn(
            Charting_Editors.ChartWidgetConfigurationEditor,
            this._$chartConfigurationEditorContainer,
            {
                chartMetadataProvider: new InitialChartMetadata(this.getArtifactPluralName(), this.getSelectArtifactReminderMessage()),
                activeConfiguration: this._chartConfiguration,
                selectionCustomError: this.getDataSourceNeededMessage(),
                ignoreGroupSelection: true
            });
        var constraints = this._chartTemplateList.getValue().configurationConstraints;
        editor.setOptions(constraints, this._chartConfiguration);
        return editor;
    }


    /** Creates the chart configuration editor which allows the user to configure the chart type's settings */
    public createChartConfigurationEditor(metadataProvider: Charting_DataServices.IChartMetadataProvider): Charting_Editors.ChartWidgetConfigurationEditor {
        return <Charting_Editors.ChartWidgetConfigurationEditor>Controls.BaseControl.createIn(
            Charting_Editors.ChartWidgetConfigurationEditor,
            this._$chartConfigurationEditorContainer,
            {
                chartMetadataProvider: metadataProvider,
                activeConfiguration: this._chartConfiguration,
                change: () => this.onChange()
            });
    }

    /** Called when the user selects a chart type */
    public onChartTemplateChange(): void {
        if (this._chartConfiguration && this._chartConfigurationEditor) {
            this._chartConfiguration.chartType = this._chartTemplateList.getValue().chartType;
            var constraints = this._chartTemplateList.getValue().configurationConstraints;
            this._chartConfigurationEditor.setOptions(constraints, this._chartConfiguration);
            this.onChange();
        }
    }

    /** Returns an array of chart templates (types) */
    public getChartTemplates(): Charting_Editors.ChartTemplateItem[] {
        var tooltipGenerator = new Charting_Editors.DefaultTooltipDecorator();
        var chartTemplates = new Charting_Editors.ChartTemplateGenerator().getAllTemplates(tooltipGenerator);
        return chartTemplates;
    }


    /** Event handler for derived implementations to react to successful save operation.*/
    public onSaveComplete(): void {
        Charting_DataServices.ChartTelemetry.OnSavingChart("UpdateChart", this._chartConfiguration, /*inWidgetConfiguration*/ true);
    }

    /** If anything changed, notify the host of latest state.*/
    public onChange(): void {
        this.previousSize = this.getCurrentWidgetSize();

        if (!this._colorConfigurationTracker.canShareColoring(this._getSettings())) {
            this._resetColorManager();
            this._colorConfigurationTracker.disallowLegacyPalette();
        }

        //Now, prepare the chart Title
        this._updateLiveTitle();

        if (this._chartConfigurationEditor.checkCorrectness(() => { })
                && this._featureDataSelector.isValid()) {
            this._widgetConfigurationContext.notify(WidgetHelpers.WidgetEvent.ConfigurationChange, WidgetHelpers.WidgetEvent.Args(this._getCustomSettings())).then((widgetStateRequest: WidgetContracts.NotifyResult) => {
                widgetStateRequest.getResponse().then((widgetResult: string) => {
                    // the setup for the color palette is done based on the data.
                    var chartLegendItems = <string[]>JSON.parse(widgetResult);
                    this._updateColorManager(chartLegendItems);
                });
            });
        }
    }

    /**
     * Listening to events coming from widget configuration host
     * @param event
     * @param args
     */
    public listen(event: string, args: WidgetContracts.EventArgs<any>): void {
        if (event === WidgetHelpers.WidgetEvent.GeneralSettingsChanged && this._controlsAreInitialized) {
            // If size changed after we are initialized, fire onchange event. This requests an update of the
            // widget and brings back data to the configuration for color picker (since different sizes require
            // a different number of colors).
            if (this.sizeChanged()) {
                this.onChange();
            }
        }
    }

    /** Returns true if size has changed since onChange() fired last */
    private sizeChanged() {
        if (!this.previousSize) {
            return true;
        }

        var currentSize = this.getCurrentWidgetSize();

        return this.previousSize.columnSpan != currentSize.columnSpan || this.previousSize.rowSpan != currentSize.rowSpan;
    }

    /** As the chart state has changed, we should check if the current state warrants an update to the title.*/
    public _updateLiveTitle(): void {
        var currentDefaultTitle = this.generateDefaultTitle();

        // send new name to live tile editor to make updates on Name section, where applicable.
        this._liveTitleState.updateTitleOnLatestArtifact(
            this.configureName,
            currentDefaultTitle);
    }

    private _getCustomSettings(): WidgetContracts.CustomSettings {
        return {
            data: JSON.stringify(this._getSettings()),
            version: this.getCurrentVersion()
        };
    }

    /** SDK Contractual onSave handler. Responsabilities:
     * 1-Reports Validity of Config State
     * 2-Explicitly "awakens" any errors which may have been dormant.
     * @returns {IPromise<WidgetContracts.SaveStatus>}
     */
    public onSave(): IPromise<WidgetContracts.SaveStatus> {
        var isValid = false;
        if (this._featureDataSelector.isValid()) {
            this._chartConfigurationEditor.validate(); //Make sure errors are visible at this stage
            isValid = this._chartConfigurationEditor.checkCorrectness(() => { });
        }
        else {
            // it is possible that no interactions was made with the query selector, at the time save was clicked.
            // In this case, make sure any error states are visible now.
            this._featureDataSelector.showErrorOnSave();
        }

        if (isValid) {
            return WidgetHelpers.WidgetConfigurationSave.Valid(this._getCustomSettings());
        } else {
            return WidgetHelpers.WidgetConfigurationSave.Invalid();
        }
    }

    public _getSettings(): IChartConfigurationLiveTile {
        var settings: IChartConfigurationLiveTile = null;
        if (this._chartConfiguration && this._chartTemplateList) {
            //NOTE: ChartConfiguration data structure is feature agnostic.

            settings = $.extend({}, this._chartConfiguration);

            //Pass the widget title down to the Settings. Note that the title isn't updated during edits, as that is handled by Widget common config UI.
            settings.title = this.configureName.getCurrentWidgetName();

            // Transform options need to be pruned before they are saved, but we don't prune this.chartConfiguration so that we can
            // maintain state when switching between chart types
            settings.transformOptions = Charting_Editors.ChartConfigurationDialog.packTransformOptions(
                this._chartConfiguration,
                this._chartTemplateList.getValue().configurationConstraints);

            this._liveTitleState.appendToSettings(settings);
        }
        return settings;
    }

    /** Force the color manager to discard prior state.
     *  Use this mechanism when switching between query, chart type or grouping dimension
     *  Note: Chart type switches between related classes is fine,
     *  but conditionally supporting those requires modelling of the different types.
     */
    public _resetColorManager(): void {
        this._chartConfiguration.userColors = [];
        this._updateColorManager([]);
    }

    /*Placeholder Logic for spike of palette management & Color Manager rendering. */
    public _updateColorManager(chartLegendItems: string[]): void {

        var colorDictionary = ChartConfigurationBase.prepareDictionary(this._chartConfiguration, this._chartConfiguration.userColors, this.getCurrentVersion().major);

        //Pivot Table uses a light colored palette, because text is the focal point, for which bold colors distract.
        var isSubduedPalette = this._chartConfiguration.chartType == Charting_Charts.ChartTypes.pivotTable;

        if (this._colorConfigurationTracker.isLegacyPaletteExpected()) {
            //if legacy palette is expected, we need to override the modern default palette with legacy coloring.
            //We do this only on our first render cycle, to preserve existing chart appearance, before the user customizes.
            ChartConfigurationBase.appendLegacyColors(this._chartConfiguration, chartLegendItems, colorDictionary, isSubduedPalette);
        }

        //Area Chart only uses a single color area. As such, name is not relevant in this case.
        var suppressFieldNames = this._chartConfiguration.chartType == Charting_Charts.ChartTypes.areaChart;

        //If the dimension does match, we must remove missing elements, and heuristically populate new values with default colors.

        //Construct the control if this is our first time through.
        if (!this._colorManagerControl) {
            this._colorManagerControl = <ColorManagerControl.ColorManagerControl>Controls.BaseControl.createIn(ColorManagerControl.ColorManagerControl,
                this._element, <ColorManagerControl.ColorManagerControlOptions>{
                    onChange: () => {
                        this._chartConfiguration.userColors = this._colorManagerControl.toColorEntries();
                        this.onChange();
                    }
                });
        }

        //Render the control given the current settings.
        var colorManagerRenderOptions = <ColorManagerControl.ColorManagerRenderOptions>{
            isSubduedPalette: isSubduedPalette,
            colorDictionary: colorDictionary,
            activeElements: chartLegendItems,
            suppressFieldNames: suppressFieldNames
        };

        //The color manager does not re-render if the state of the chart is consistent with the prior state.
        //Note: When dealing with switch between subdued and normal palette, the items are the same, but the default colors are different.
        if (!ColorManagerControl.ColorManagerControl.areActiveElementsSame(chartLegendItems, this._colorManagerControl.getActiveElements())
            || isSubduedPalette != this._colorManagerControl.isPaletteSubdued()) {
            this._colorManagerControl.render(colorManagerRenderOptions);
        }

        if (this._colorConfigurationTracker.isLegacyPaletteExpected()) {
            //After our first legacy render cycle, never again make use of the legacy palette
            this._colorConfigurationTracker.disallowLegacyPalette();
            //And notify listeners to ensure the legacy palette is passed down to the Chart.
            this._colorManagerControl.notifyChangeListener();
        }
    }

    public static prepareDictionary(configuration: IChartConfigurationLiveTile, userColors: Charting_DataServices.IColorEntry[], targetVersion: number):
        Chart_Contracts.ColorDictionary {

        var featureColorProvider = Charting_Color.getFeatureColorProvider(configuration.scope);

        //Construct a color dictionary using the color provider.
        var colorDictionary = Charting_Color.ColorDictionary.fromColorEntries(
            featureColorProvider,
            userColors,
            targetVersion
        );

        return colorDictionary;
    }

    /*Ensure that all active fields are explicitly mapped in the color dictionary, as user selected.
       This preserves a legacy palette, until the user chooses to override or clear the existing chart. */
    public static appendLegacyColors(configuration: IChartConfigurationLiveTile,
        chartLegendItems: string[],
        mainColorDictionary: Chart_Contracts.ColorDictionary,
        isSubduedPalette: boolean): void {
        //Get WIT color provider

        var legacyPaletteVersion = 2;
        var legacyDictionary = ChartConfigurationBase.prepareDictionary(configuration, [], legacyPaletteVersion);

        //For every named item which doesn't already have a custom color, set the legacy color as user-customized.
        $.each(chartLegendItems, (index: number, name: string) => {
            if (!mainColorDictionary.hasCustomColorPair(name)) {
                var colorPair = legacyDictionary.getColorPair(name, index, isSubduedPalette);
                mainColorDictionary.setColorPair(name, colorPair);
            }
        });
    }
}

/** Defines an "empty" Metadata payload.
    This allows the Chart Config UI to be renderable, before the user has selected a data-source.*/
export class InitialChartMetadata implements Charting_DataServices.IChartMetadataProvider {
    public artifactName;
    public reminderToSelectMessage;

    constructor(artifactName: string, reminderToSelectMessage:string) {
        this.artifactName = artifactName;
        this.reminderToSelectMessage = reminderToSelectMessage;
    }

    beginGetMetadata(callback, errorCallback?) {
    }

    getPluralArtifactName(): string {
        return this.artifactName;
    }
    getNumericalAggregationFunctions(): Charting_DataServices.INameLabelPair[] {
        return [];
    }
    getAggregatableFields(): Charting_DataServices.INameLabelPair[] {
        return [];
    }
    getGroupableFields(): Charting_DataServices.INameLabelPair[] {
        return [{ name: "", labelText: this.reminderToSelectMessage }];
    }
    public getRangeOptions(): Charting_DataServices.INameLabelPair[] {
        return [{ name: "", labelText: "" }];
    }
}