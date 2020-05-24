/// <amd-dependency path='VSS/LoaderPlugins/Css!TestManagement' />

import { ChartTemplateItem } from "Charting/Scripts/TFS.Charting.Editors";
import { ChartTypePicker } from "Widgets/Scripts/Shared/ChartTypePicker";
import Dashboard_Contracts = require("Dashboards/Scripts/Contracts");
import Controls = require("VSS/Controls");
import SDK = require("VSS/SDK/Shim");
import Utils_String = require("VSS/Utils/String");
import TFS_Dashboard_WidgetContracts = require("TFS/Dashboards/WidgetContracts");
import TFS_Control_BaseWidgetConfiguration = require("Widgets/Scripts/VSS.Control.BaseWidgetConfiguration");
import TFS_Dashboard_WidgetHelpers = require("TFS/Dashboards/WidgetHelpers");
import Diag = require("VSS/Diag");
import Resources = require("TestManagement/Scripts/Resources/TFS.Resources.TestManagement");
import { BuildDefinitionPickerOptions, BuildDefinitionPicker, create as BuildDefinitionPickerCreator } from "Dashboards/Controls/Pickers/BuildDefinitionPicker";
import ReleaseDataHelper = require("TestManagement/Scripts/Utils/TFS.TestManagement.ReleaseDataHelper");
import Utils_Html = require("VSS/Utils/Html");

import RDPicker = require("TestManagement/Scripts/TestReporting/Widgets/ReleaseDefinitionPicker");
import Q = require("q");
import VSS = require("VSS/VSS");

import * as EnvironmentSelectorControl from "TestManagement/Scripts/TestReporting/TestTabExtension/EnvironmentSelectorControl";
import Contracts = require("TFS/TestManagement/Contracts");
import RMContracts = require("ReleaseManagement/Core/Contracts");

import {ChartConfigurationOptions, ChartTypes as ChartBaseChartTypes, AxisOptions, SeriesTypes} from "TestManagement/Scripts/TestReporting/Charts/ChartBase";
import {delegate} from "VSS/Utils/Core";
import {DefinitionReference as BuildDefinitionReference} from "TFS/Build/Contracts";
import {SettingsField, SettingsFieldOptions} from "Dashboards/Scripts/SettingsField";
import { Combo, IComboOptions } from "VSS/Controls/Combos";
import * as Locations from "VSS/Locations";

enum Chart_Category {
    PRIMARY = 0,
    SECONDARY,
    MAX
}

export class Constants {
    public static BUILD_SELECTOR_CONTAINER: string = "tr-trend-build-selector-container";
    public static RELEASE_SELECTOR_CONTAINER: string = "tr-trend-release-selector-container";
    public static RELEASE_ENVIRONMENT_CONTAINER: string = "tr-trend-release-environment-container";
    public static BRANCH_SELECTOR_CONTAINER = "tr-trend-branch-selector-container";
}

export class ReleaseEnvironment {
    private environmentId: number;
    private environmentName: string;

    constructor(environmentId: number, environmentName: string) {
        this.environmentId = environmentId;
        this.environmentName = environmentName;
    }

    public getEnvironmentId(): number {
        return this.environmentId;
    }

    public getEnvironmentName(): string {
        return this.environmentName;
    }
}

/**
 * Implementation of Test results trend widget Configuration Blade.
 */
export class TestResultsTrendConfiguration extends TFS_Control_BaseWidgetConfiguration.BaseWidgetConfiguration<Dashboard_Contracts.WidgetConfigurationOptions>
    implements TFS_Dashboard_WidgetContracts.IWidgetConfiguration {

    constructor(options?: Dashboard_Contracts.WidgetConfigurationOptions) {
        super(options);
    }

    /**
     * @brief Initializes control options
     * @param options: widget configuration options
     */
    public initializeOptions(options: Dashboard_Contracts.WidgetConfigurationOptions) {
        super.initializeOptions($.extend({
            coreCssClass: "chart-configuration-container test-results-chart-configuration"
        }, options));
    }

    /**
    *  Called by the host to setup the widget configuration, which uses the settings shared with the widget to complete its rendering experience.
    *  @param {WidgetSettings} settings of the widget as shared with the configuration.
    *  @param {IWidgetConfigurationContext} widgetConfigurationContext provided by the host of the widget configuration to allow for communication.
    *  @returns object wrapped in a promise that encapsulates the success of this operation.
    *           If load fails, returns error message via WidgetStatusHelper.Failure(errorMessage).
    */
    public load(widgetSettings: TFS_Dashboard_WidgetContracts.WidgetSettings, widgetConfigurationContext: TFS_Dashboard_WidgetContracts.IWidgetConfigurationContext): IPromise<TFS_Dashboard_WidgetContracts.WidgetStatus> {

        this._widgetConfigurationContext = widgetConfigurationContext;

        if (!this._releaseDataHelper) {
            this._releaseDataHelper = new ReleaseDataHelper.ReleaseDataHelper();
        }

        try {
            this._chartConfigurationOptions = JSON.parse(widgetSettings.customSettings.data) || this._defaultChartConfigurationOptions;
        } catch (e) {
            Diag.logWarning("[TestResultsTrendConfiguration.load]: Unable to parse chart configuration option.");
            return TFS_Dashboard_WidgetHelpers.WidgetStatusHelper.Failure(e);
        }

        this._renderConfigurationBlade();

        return TFS_Dashboard_WidgetHelpers.WidgetStatusHelper.Success();
    }

    /**
     * Called by the host when the user clicks on the Save button.
     * Widget author is expected to run validations if needed.
     * If ready to save, then use WidgetHelpers.WidgetConfigurationSave.Valid() to return the serialized custom settings of the widget from the configuration.
     * If custom settings are not valid and so not ready to save, then  use WidgetHelpers.WidgetConfigurationSave.Invalid() to notify the host to stop save.
     * @returns object of type SaveStatus wrapped in a promise.
     */
    public onSave(): IPromise<TFS_Dashboard_WidgetContracts.SaveStatus> {
        return TFS_Dashboard_WidgetHelpers.WidgetConfigurationSave.Valid(this._getCustomSettings());
    }

    /**
     * (Optional)  Called  by the host when the configuration is ready to be saved (when the user clicks the save button on the configuration panel)
     */
    public onSaveComplete(): void {
        Diag.logVerbose("Save complete");
    }

    /**
     * @brief Sends notification to configuration blade on change in configuration
     */
    private _notify(): void {

        if (!this._chartConfigurationOptions.context) {
            Diag.logInfo("Either build definition or release definition should be seleceted, skipping notify");
            return;
        }

        if (!this._chartConfigurationOptions.buildDefinition && !this._chartConfigurationOptions.releaseDefinition) {
            Diag.logInfo("Build/Release Management definition not selected, skipping notify");
            return;
        }

        try {
            this._widgetConfigurationContext.notify(TFS_Dashboard_WidgetHelpers.WidgetEvent.ConfigurationChange, TFS_Dashboard_WidgetHelpers.WidgetEvent.Args(this._getCustomSettings()));
        } catch (e) {
            Diag.logWarning("Unable to stringify chart configuration option");
        }
    }

    private _getCustomSettings(): TFS_Dashboard_WidgetContracts.CustomSettings {
        return { data: JSON.stringify(this._chartConfigurationOptions) };
    }

    /**
     * @brief renders controls in the configuration blade
     */
    private _renderConfigurationBlade(): void {
        this._$workflowContainer.appendTo(this.getElement());
        this._addWorkflowLabel();
        this._buildDefinitionRadioButton(this._$workflowContainer, true);
        this._releaseDefinitionRadioButton(this._$workflowContainer, false);
        this._drawBuildDefinitionDropdown();    // Build definition drop-down
        this._drawReleaseDefinitionDropdown();
        this._drawReleaseEnvironmentDropdown();
        this._drawTestRunTitleInputContainer();
        this._drawChartPicker(Chart_Category.PRIMARY);  // Primary chart picker
        this._chartConfigurator[Chart_Category.PRIMARY] = this._drawChartConfigurationControls(Chart_Category.PRIMARY);   // configuration for Primary charts
        this._drawChartPicker(Chart_Category.SECONDARY);    // Secondary chart picker
        this._chartConfigurator[Chart_Category.SECONDARY] = this._drawChartConfigurationControls(Chart_Category.SECONDARY);   // configuration for Secondary charts
        this._selectDefaultRadio();
    }

    private _addWorkflowLabel(): void {
        this._$workflowContainer.addClass("tr-trend-workflow-container");
        $("<label>")
            .addClass("tr-trend-workflow-label")
            .text(Resources.Workflow)
            .appendTo(this._$workflowContainer);
    }

    private _buildDefinitionRadioButton($container: JQuery, enabled: boolean = false): void {
        let buildDefinitionRadioContainer: JQuery = $("<div />").addClass("tr-trend-build-radio-container");
        // Add the radio button
        this._$buildWorkflowSelector = $("<input>")
            .addClass("tr-trend-build-radio")
            .attr("type", "radio")
            .attr("id", Resources.BuildLabel)
            .prop("checked", enabled)
            .click(() => {
                this._$releaseWorkflowSelector.prop("checked", false);
                this._chartConfigurationOptions.context = Contracts.TestResultsContextType.Build;
                this._buildSettingsField.showElement();
                this._releaseSettingsField.hideElement();
                this._resetTestRunTitle();
                if (this._releaseEnvironmentSelector) {
                    this._releaseEnvironmentSelector.hideElement();
                }
                this._notify();
            })
            .appendTo(buildDefinitionRadioContainer);

        // Add the label for the radio button
        $("<label>")
            .text(Resources.BuildLabel)
            .appendTo(buildDefinitionRadioContainer);

        buildDefinitionRadioContainer.appendTo($container);
    }

    private _releaseDefinitionRadioButton($container: JQuery, enabled: boolean = false): void {
        let releaseDefinitionRadioContainer: JQuery = $("<div />").addClass("tr-trend-release-radio-container");
        // Add the radio button
        this._$releaseWorkflowSelector = $("<input>")
            .addClass("tr-trend-release-radio")
            .attr("type", "radio")
            .attr("id", Resources.ReleaseText)
            .prop("checked", enabled)
            .click(() => {
                this._$buildWorkflowSelector.prop("checked", false);
                this._chartConfigurationOptions.context = Contracts.TestResultsContextType.Release;
                this._buildSettingsField.hideElement();
                this._releaseSettingsField.showElement();
                this._resetTestRunTitle();
                if (this._releaseEnvironmentSelector) {
                    this._releaseEnvironmentSelector.showElement();
                }
                this._notify();
            })
            .appendTo(releaseDefinitionRadioContainer);

        // Add the label for the radio button
        $("<label>")
            .text(Resources.ReleaseText)
            .appendTo(releaseDefinitionRadioContainer);

        releaseDefinitionRadioContainer.appendTo($container);
    }

    /********* Build Definition Picker *****/
    private _drawBuildDefinitionDropdown(): void {
        let $container = $("<div>").addClass(Constants.BUILD_SELECTOR_CONTAINER).addClass("settings-field");

        this._buildDefinitionPickerControl = <BuildDefinitionPicker>BuildDefinitionPickerCreator($container, <BuildDefinitionPickerOptions>{
            onIndexChanged: delegate(this, this._onBuildDefinitionChanged),
            initialValue: this._chartConfigurationOptions.buildDefinition
        });

        this._buildSettingsField = SettingsField.createSettingsField(<SettingsFieldOptions<BuildDefinitionPicker>>{
            labelText: Resources.BuildDefinitionText,
            control: this._buildDefinitionPickerControl,
            controlElement: $container,
            hasErrorField: true,
            useBowtie: true
        }, this.getElement());
    }

    /********* Release Definition Picker *****/
    private _drawReleaseDefinitionDropdown(): void {
        let $container = $("<div>").addClass(Constants.RELEASE_SELECTOR_CONTAINER).addClass("settings-field");
        this._releaseDefinitionPickerControl = <RDPicker.ReleaseDefinitionPicker>Controls.BaseControl.createIn(RDPicker.ReleaseDefinitionPicker, $container, {
            onIndexChanged: delegate(this, this._onReleaseDefinitionChanged),
            initialValue: this._chartConfigurationOptions.releaseDefinition
        });

        this._releaseSettingsField = SettingsField.createSettingsField(<SettingsFieldOptions<RDPicker.ReleaseDefinitionPicker>>{
            labelText: Resources.ReleaseDefinitionText,
            control: this._releaseDefinitionPickerControl,
            controlElement: $container,
            hasErrorField: true,
            useBowtie: true
        }, this.getElement());
    }

    private _getReleaseEnvironmentName(releaseEnvironmentId: number, environments: ReleaseEnvironment[]): string {
        for (let i = 0; i < environments.length; ++i) {
            if (environments[i].getEnvironmentId() === releaseEnvironmentId) {
                return environments[i].getEnvironmentName();
            }
        }

        return Utils_String.empty;
    }

    private _getReleaseEnvironmentNames(environments: ReleaseEnvironment[]): string[] {
        let environmentNames: string[] = new Array();
        for (let i = 0; i < environments.length; ++i) {
            environmentNames.push(environments[i].getEnvironmentName());
        }

        return environmentNames;
    }

    /********* Release Environment Picker *****/
    private _drawReleaseEnvironmentDropdown(): void {

        let $environmentContainer = $("<div>").addClass(Constants.RELEASE_ENVIRONMENT_CONTAINER).addClass("settings-field");
        if (this._chartConfigurationOptions.releaseDefinition) {
            this._getEnvironmentValues(this._chartConfigurationOptions.releaseDefinition).then((environments: ReleaseEnvironment[]) => {
                let environmentNames = this._getReleaseEnvironmentNames(environments);
                this._environmentComboControl = Controls.create<Combo, IComboOptions>(Combo, $environmentContainer, <IComboOptions>{
                    allowEdit: false,
                    indexChanged: delegate(this, this._onEnvironmentChange),
                    source: environmentNames,
                    value: this._getReleaseEnvironmentName(this._chartConfigurationOptions.releaseEnvironment.definitionEnvironmentId, environments)
                });
            });
        }
        else {
            this._environmentComboControl = Controls.create<Combo, IComboOptions>(Combo, $environmentContainer, <IComboOptions>{
                allowEdit: false,
                change: delegate(this, this._onEnvironmentChange),
                indexChanged: delegate(this, this._onEnvironmentChange)
            });
        }

        this._releaseEnvironmentSelector = SettingsField.createSettingsField(<SettingsFieldOptions<Combo>>{
            labelText: Resources.ReleaseStageText,
            control: this._environmentComboControl,
            controlElement: $environmentContainer,
            useBowtie: true
        }, this.getElement());
    }

    private _resetTestRunTitle(): void {
        this._testRunTitleInputBox.val(Utils_String.empty);
        this._chartConfigurationOptions.testRunTitle = Utils_String.empty;
    }

    private _drawTestRunTitleInputContainer(): void {
        this._testRunTitleInputBox = $("<input>")
            .attr("type", "text")
            .attr("id", "testRunTitleId")
            .attr("maxlength", 256)
            .val(this._chartConfigurationOptions ? this._chartConfigurationOptions.testRunTitle : Utils_String.empty);

        this._testRunTitleInputBox.focusout(delegate(this, this._onTestRunTitleChange));

        let testRunTitleSetting = SettingsField.createSettingsFieldForJQueryElement({
            labelText: Resources.TestRunTitle,
        }, this._testRunTitleInputBox);

        this.getElement().append(testRunTitleSetting.getElement());

    }

    private _onTestRunTitleChange(eventObject: JQueryEventObject) {
        this._chartConfigurationOptions.testRunTitle = Utils_Html.HtmlNormalizer.normalize((eventObject.target as HTMLInputElement).value);
        this._notify();
    }

    private _getSelectedReleaseEnvironment(releaseEnvironmentId: number, releaseEnvironmentName: string): RMContracts.ReleaseEnvironment {
        let releaseEnvironment;

        releaseEnvironment = {
            definitionEnvironmentId: releaseEnvironmentId, name: releaseEnvironmentName
        };

        return releaseEnvironment;
    }

    private _onEnvironmentChange(sender?: any, args?: any): void {
        if (this._chartConfigurationOptions.releaseDefinition) {
            this._getEnvironmentValues(this._chartConfigurationOptions.releaseDefinition).then((environments: ReleaseEnvironment[]) => {
                this._chartConfigurationOptions.releaseEnvironment = this._getSelectedReleaseEnvironment(environments[sender].getEnvironmentId(), environments[sender].getEnvironmentName());
                this._chartConfigurationOptions.context = Contracts.TestResultsContextType.Release;
                this._notify();
            }).then(undefined, error => {
                Diag.logError(Utils_String.format("Failed to notify environment change. Error: {0}", (error.message || error)));
            });
        }
    }

    private _getEnvironmentValues(releaseDefinition: RMContracts.ReleaseDefinition): IPromise<ReleaseEnvironment[]> {
        let environmentNames: ReleaseEnvironment[] = new Array();
        let defer: Q.Deferred<ReleaseEnvironment[]> = Q.defer<ReleaseEnvironment[]>();

        if (releaseDefinition && releaseDefinition.id) {
            if (this._relDefAndEnvironmentCache[releaseDefinition.id]) {
                return Q.resolve(this._relDefAndEnvironmentCache[releaseDefinition.id]);
            }

            this._releaseDataHelper.fetchAssociatedReleaseEnvDefinitions(releaseDefinition.id).then((releaseEnvDefs: IKeyValuePair<number, string>[]) => {
                if (releaseEnvDefs) {
                    for (let key in releaseEnvDefs) {
                        environmentNames.push(new ReleaseEnvironment(releaseEnvDefs[key].key, releaseEnvDefs[key].value));
                    }
                }

                this._relDefAndEnvironmentCache[releaseDefinition.id] = environmentNames;
                defer.resolve(environmentNames);
            }).then(undefined, error => {
                defer.reject(error);
            });
        }

        return defer.promise;
    }

    private _getDefaultEnvironmentValue(releaseDefinition: RMContracts.ReleaseDefinition): string {
        if (releaseDefinition && this._relDefAndEnvironmentCache[releaseDefinition.id]) {
            let envs = this._relDefAndEnvironmentCache[releaseDefinition.id];
            if (envs && envs.length > 0) {
                return envs[0].getEnvironmentName();
            }
        }

        return Utils_String.empty;
    }

    private _selectDefaultRadio(): void {
        if (this._chartConfigurationOptions.context === Contracts.TestResultsContextType.Release) {
            this._$buildWorkflowSelector.prop("checked", false);
            this._buildSettingsField.hideElement();
            this._$releaseWorkflowSelector.prop("checked", true);
        }
        else {
            this._releaseSettingsField.hideElement();
            if (this._releaseEnvironmentSelector) {
                this._releaseEnvironmentSelector.hideElement();
            }
        }
    }

    /**
     * @brief call-back method to be called on change in build definition selection
     * @param newValue: newly selected build definition
     */
    private _onBuildDefinitionChanged(newValue: BuildDefinitionReference): void {
        this._chartConfigurationOptions.buildDefinition = newValue;
        this._chartConfigurationOptions.context = Contracts.TestResultsContextType.Build;
        this._notify();
    }

    private _onReleaseDefinitionChanged(newValue: RMContracts.ReleaseDefinition): void {
        this._chartConfigurationOptions.releaseDefinition = newValue;
        this._chartConfigurationOptions.context = Contracts.TestResultsContextType.Release;

        if (this._releaseEnvironmentSelector) {
            this._environmentComboControl.setEnabled(true);
            this._releaseEnvironmentSelector.showElement();
            this._notify();
            this._getEnvironmentValues(newValue).then((environments: ReleaseEnvironment[]) => {
                if (environments && environments.length > 0) {
                    let environmentNames = this._getReleaseEnvironmentNames(environments);
                    this._environmentComboControl.setSource(environmentNames);
                    this._environmentComboControl.setSelectedIndex(0);
                    this._chartConfigurationOptions.releaseEnvironment = this._getSelectedReleaseEnvironment(environments[0].getEnvironmentId(), environments[0].getEnvironmentName());
                    this._notify();
                }
            });
        }
    }

    /******** Build Definition Picker *******/


    /********* Chart Picker *****/

    /**
     * @brief Draws the chart picker control
     * @param chartCategory - Primary or Secondary chart
     */
    private _drawChartPicker(chartCategory: Chart_Category): void {
        Controls.create<ChartPicker, IChartPickerOptions>(ChartPicker, this.getElement(), <IChartPickerOptions>{
            chartCategory: chartCategory,
            getChartConfigurationOptions: () => {
                return this._chartConfigurationOptions;
            },
            getChartConfigurator: (chartCategory: Chart_Category) => {
                return this._chartConfigurator[chartCategory];
            },
            notifyChange: (chartConfigurationOptions: ChartConfigurationOptions) => {
                this._chartConfigurationOptions = chartConfigurationOptions;
                this._notify();
            }
        });
    }


    /********* Chart Picker *****/


    /********* Chart configuration *****/

    private _drawChartConfigurationControls(chartCategory: Chart_Category): ChartConfigurator {
        return Controls.create<ChartConfigurator, IChartConfigurationControlOptions>(ChartConfigurator, this.getElement(), <IChartConfigurationControlOptions>{
            chartCategory: chartCategory,
            getChartConfigurationOptions: () => {
                return this._chartConfigurationOptions;
            },
            notifyChange: (chartConfigurationOptions: ChartConfigurationOptions) => {
                this._chartConfigurationOptions = chartConfigurationOptions;
                this._notify();
            }
        });
    }

    /********* Chart configuration *****/

    /* Private variables section */

    private _defaultChartConfigurationOptions: ChartConfigurationOptions = {
        width: 500,
        height: 500,
        title: Resources.TestResultsTrendText,
        buildDefinition: null,
        releaseDefinition: null,
        releaseEnvironment: null,
        chartType: ChartBaseChartTypes.ColumnLineCombo,
        secondaryChartType: ChartBaseChartTypes.Line,
        yAxisOptions: {
            seriesType: SeriesTypes.FailedTests,
            allowDecimals: false
        },
        secondaryYAxisOptions: {
            seriesType: SeriesTypes.PassPercentage,
            allowDecimals: true
        }
    };

    private _$buildWorkflowSelector: JQuery;
    private _$releaseWorkflowSelector: JQuery;
    private _$workflowContainer: JQuery = $("<div />");
    private _buildSettingsField: SettingsField<BuildDefinitionPicker>;
    private _buildDefinitionPickerControl: BuildDefinitionPicker;
    private _releaseSettingsField: SettingsField<RDPicker.ReleaseDefinitionPicker>;
    private _releaseDefinitionPickerControl: RDPicker.ReleaseDefinitionPicker;
    private _releaseEnvironmentSelector: SettingsField<Combo>;
    private _environmentComboControl: Combo;
    private _relDefAndEnvironmentCache: { [id: number]: ReleaseEnvironment[]; } = {};

    private _chartConfigurationOptions: ChartConfigurationOptions;
    private _chartConfigurator: ChartConfigurator[] = [];
    private _widgetConfigurationContext: TFS_Dashboard_WidgetContracts.IWidgetConfigurationContext;
    private _releaseDataHelper: ReleaseDataHelper.ReleaseDataHelper;
    private _testRunTitleInputBox: JQuery;
}

interface IConfigurationControlOptions {
    chartCategory: Chart_Category;
    getChartConfigurationOptions: () => ChartConfigurationOptions;
    notifyChange: (chartConfigurationOptions: ChartConfigurationOptions) => void;
}

interface IChartPickerOptions extends IConfigurationControlOptions {
    getChartConfigurator: (category: Chart_Category) => ChartConfigurator;
}

class ChartPicker extends Controls.Control<IChartPickerOptions> {
    public initialize(): void {
        super.initialize();
        this.getElement().addClass("chart-picker").addClass(Chart_Category[this._options.chartCategory]);

        this._draw();
    }

    private _draw(): void {
        let pickerHeading: string[];
        let $container: JQuery;
        let chartConfigurationOptions: ChartConfigurationOptions;
        let defaultChartType: string;

        pickerHeading = [Resources.PrimaryChartText, Resources.SecondaryChartText];
        $container = $("<div>").addClass("chart-picker-container").addClass("settings-field");
        chartConfigurationOptions = this._options.getChartConfigurationOptions();

        switch (this._options.chartCategory) {
            case Chart_Category.PRIMARY:
                defaultChartType = (chartConfigurationOptions.chartType === ChartBaseChartTypes.ColumnLineCombo) ? ChartBaseChartTypes.Column : chartConfigurationOptions.chartType;
                break;
            case Chart_Category.SECONDARY:
                defaultChartType = (chartConfigurationOptions.secondaryChartType) ? chartConfigurationOptions.secondaryChartType : ChartBaseChartTypes.Line;
                break;
            default:
                Diag.logError(Utils_String.format("Invalid chart category: {0}", this._options.chartCategory));
                break;
        }

        this._chartPicker[this._options.chartCategory] = ChartTypePicker.create(ChartTypePicker, $container, {
            source: this._getChartTemplateList(this._options.chartCategory),
            defaultChartType: defaultChartType,
            change: delegate(this, this._onSelectedChartChanged, this._options.chartCategory)
        });

        SettingsField.createSettingsField(<SettingsFieldOptions<ChartTypePicker>>{
            labelText: pickerHeading[this._options.chartCategory],
            control: this._chartPicker[this._options.chartCategory],
            controlElement: $container
        }, this.getElement());
    }

    /**
 * @brief call-back method to be called on change in selected chart type
 * @param sender
 * @param args: chart category (primary or secondary)
 */
    private _onSelectedChartChanged(sender?: any, args?: any): void {
        let selectedChart: ChartTemplateItem;
        let chartCategory: Chart_Category;
        let chartConfigurationOptions: ChartConfigurationOptions;

        selectedChart = (<ChartTypePicker>sender).getValue();
        Diag.logInfo(Utils_String.format("New chart type selected: {0}", selectedChart.chartType));
        chartCategory = args;
        chartConfigurationOptions = this._options.getChartConfigurationOptions();

        switch (chartCategory) {
            case Chart_Category.PRIMARY:
                chartConfigurationOptions.chartType = selectedChart.chartType;
                chartConfigurationOptions.yAxisOptions.seriesType = (selectedChart.chartType === ChartBaseChartTypes.StackedColumn) ? SeriesTypes.StackedColumn : this._options.getChartConfigurator(chartCategory).getSeriesFromMeasureControl();
                break;
            case Chart_Category.SECONDARY:
                chartConfigurationOptions.secondaryChartType = selectedChart.chartType;
                chartConfigurationOptions.secondaryYAxisOptions.seriesType = (selectedChart.chartType === ChartBaseChartTypes.StackedColumn) ? SeriesTypes.StackedColumn : this._options.getChartConfigurator(chartCategory).getSeriesFromMeasureControl();
                break;
            default:
                Diag.logError(Utils_String.format("Invalid value of chart category: {0}", chartCategory));
                return;
        }

        this._options.getChartConfigurator(chartCategory).setEnabled(selectedChart.chartType !== ChartBaseChartTypes.StackedColumn);

        this._options.notifyChange(chartConfigurationOptions);
    }

    /**
     * @brief returns the supported list of chart templates
     * @param chartTypes
     */
    private _getChartTemplateList(category: Chart_Category): ChartTemplateItem[] {
        let list: ChartTemplateItem[] = [];

        list.push({
            chartType: ChartBaseChartTypes.Line,
            labelText: Resources.LineChartName,
            widgetConfigIconFileName: "icon-config-chart-line.png",
            advancedToolTip: Resources.LineChartAdvancedTooltip
        });

        if (category === Chart_Category.PRIMARY) {
            list.push({
                chartType: ChartBaseChartTypes.Column,
                labelText: Resources.ColumnChartName,
                widgetConfigIconFileName: "icon-config-chart-column.png",
                advancedToolTip: Resources.ColumnChartAdvancedTooltip
            });
            list.push({
                chartType: ChartBaseChartTypes.StackedColumn,
                labelText: Resources.StackedColumnChartName,
                widgetConfigIconFileName: "icon-config-chart-stacked-column.png",
                advancedToolTip: Resources.StackedColumnChartAdvancedTooltip
            });
        }

        return list;
    }

    private _chartPicker: ChartTypePicker[] = [];
}

interface IChartConfigurationControlOptions extends IConfigurationControlOptions {
}

class ChartConfigurator extends Controls.Control<IChartConfigurationControlOptions> {

    public initialize(): void {
        super.initialize();
        this.getElement().addClass("chart-configurator");

        let chartConfigurationOptions: ChartConfigurationOptions = this._options.getChartConfigurationOptions();

        this._pivotContainer = $("<div class='pivot-container' />");
        this._pivotCombo = Controls.create<Combo, IComboOptions>(Combo, this._pivotContainer, <IComboOptions>{
            allowEdit: false,
            indexChanged: delegate(this, this._onPivotChanged),
            source: [Resources.OutcomeText, Resources.DurationText],
            value: this._getPivotComboValue(chartConfigurationOptions)
        });

        this._measureControlContainer = $("<div class='measure-control-container' />");
        this._measureControl = Controls.create<MeasureControl, IMeasureControlOptions>(MeasureControl, this._measureControlContainer, <IMeasureControlOptions>this._options);

        this._draw();

        if (this._pivotCombo.getText() === Resources.DurationText) {
            this._measureControl.setEnabled(false);
        }

        if (Chart_Category.PRIMARY === this._options.chartCategory && ChartBaseChartTypes.StackedColumn === chartConfigurationOptions.chartType) {
            this.setEnabled(false);
        }
    }

    public getSeriesFromMeasureControl(): string {
        let returnValue: string;

        if (this._pivotCombo.getText() === Resources.DurationText) {
            returnValue = SeriesTypes.Duration;
        } else {
            returnValue = this._measureControl.getSeriesFromMeasureControl();
        }

        return returnValue;
    }

    public setEnabled(enable: boolean): void {
        let measureControlState: boolean;

        measureControlState = (this._pivotCombo.getText() === Resources.DurationText) ? false : enable;

        this._pivotCombo.setEnabled(enable);
        this._measureControl.setEnabled(measureControlState);
    }

    private _draw(): void {
        this._pivotContainer.addClass("settings-field");
        SettingsField.createSettingsField(<SettingsFieldOptions<Combo>>{
            labelText: Resources.PivotText,
            control: this._pivotCombo,
            controlElement: this._pivotContainer
        }, this.getElement());

        this._measureControlContainer.addClass("settings-field");
        this._measureSettings = SettingsField.createSettingsField(<SettingsFieldOptions<MeasureControl>>{
            labelText: Resources.ValuesText,
            control: this._measureControl,
            controlElement: this._measureControlContainer
        }, this.getElement());
    }

    private _onPivotChanged(sender?: any, args?: any): void {
        let axisOptions: AxisOptions = {
            seriesType: SeriesTypes.Duration
        };

        if (this._pivotCombo.getText() === Resources.DurationText) {
            this._measureControl.setEnabled(false);
            axisOptions.seriesType = SeriesTypes.Duration;
        } else {
            this._measureControl.setEnabled(true);
            axisOptions.seriesType = this._measureControl.getSeriesFromMeasureControl();
        }

        let chartConfigurationOptions: ChartConfigurationOptions = this._options.getChartConfigurationOptions();

        switch (this._options.chartCategory) {
            case Chart_Category.PRIMARY:
                chartConfigurationOptions.yAxisOptions.seriesType = axisOptions.seriesType;
                break;
            case Chart_Category.SECONDARY:
                chartConfigurationOptions.secondaryYAxisOptions.seriesType = axisOptions.seriesType;
                break;
            default:
                Diag.logError(Utils_String.format("Invalid chart category: {0}", this._options.chartCategory));
                break;
        }

        this._options.notifyChange(chartConfigurationOptions);
    }

    private _getPivotComboValue(chartConfigurationOptions: ChartConfigurationOptions): string {
        let returnValue: string;
        let axisOptions: AxisOptions;

        switch (this._options.chartCategory) {
            case Chart_Category.PRIMARY:
                axisOptions = chartConfigurationOptions.yAxisOptions;
                break;
            case Chart_Category.SECONDARY:
                axisOptions = chartConfigurationOptions.secondaryYAxisOptions;
                break;
            default:
                return Resources.OutcomeText;
        }

        if (axisOptions.seriesType === SeriesTypes.Duration) {
            returnValue = Resources.DurationText;
        } else {
            returnValue = Resources.OutcomeText;
        }

        return returnValue;
    }

    private _pivotCombo: Combo;
    private _pivotContainer: JQuery;
    private _measureSettings: SettingsField<MeasureControl>;
    private _measureControl: MeasureControl;
    private _measureControlContainer: JQuery;
}

interface IMeasureControlOptions extends IConfigurationControlOptions {
}

class MeasureControl extends Controls.Control<IMeasureControlOptions> {

    public initialize(): void {
        super.initialize();
        this.getElement().addClass("chart-measure-control");

        let chartConfigurationOptions: ChartConfigurationOptions = this._options.getChartConfigurationOptions();

        let aggregatorComboValue: string = this._getAggregatorComboValue(chartConfigurationOptions);
        let filterComboValue: string = this._getFilterComboValue(chartConfigurationOptions);

        this._aggregatorCombo = Controls.create<Combo, IComboOptions>(Combo, this.getElement(), <IComboOptions>{
            cssClass: "aggregator-drop-down",
            allowEdit: false,
            indexChanged: delegate(this, this._onAggregatorChange),
            source: [Resources.CountText, Resources.PercentageText],
            value: aggregatorComboValue
        });

        this.getElement().append($("<div class='text-of' />").text(Resources.OfText));

        this._filterCombo = Controls.create<Combo, IComboOptions>(Combo, this.getElement(), <IComboOptions>{
            cssClass: "filter-drop-down",
            allowEdit: false,
            indexChanged: delegate(this, this._onMeasureChange),
            source: this._getFilterSource(),
            value: filterComboValue
        });
    }

    public getSeriesFromMeasureControl(): string {
        let filter: string = this._filterCombo.getText();
        let aggregator: string = this._aggregatorCombo.getText();

        return this._seriesMeasureMap[aggregator][filter];
    }

    public setEnabled(enable: boolean): void {
        this._aggregatorCombo.setEnabled(enable);
        this._filterCombo.setEnabled(enable);
    }

    private _onMeasureChange(sender?: any, args?: any): void {
        let chartConfigurationOptions: ChartConfigurationOptions = this._options.getChartConfigurationOptions();

        switch (this._options.chartCategory) {
            case Chart_Category.PRIMARY:
                chartConfigurationOptions.yAxisOptions.seriesType = this.getSeriesFromMeasureControl();
                break;
            case Chart_Category.SECONDARY:
                chartConfigurationOptions.secondaryYAxisOptions.seriesType = this.getSeriesFromMeasureControl();
                break;
            default:
                Diag.logError(Utils_String.format("Invalid chart category: {0}", this._options.chartCategory));
                break;
        }

        this._options.notifyChange(chartConfigurationOptions);
    }

    private _onAggregatorChange(sender?: any, args?: any): void {
        this._filterCombo.setSource(this._getFilterSource());

        if (this._filterCombo.getText() === Resources.TotalTestsText) {
            this._filterCombo.setText(Resources.PassedTestsText);
        }

        this._onMeasureChange(sender, args);
    }

    private _getFilterSource(): string[] {
        if (this._aggregatorCombo.getText() === Resources.PercentageText) {
            return [Resources.PassedTestsText, Resources.FailedTestsText];
        }
        else {
            return [Resources.PassedTestsText, Resources.FailedTestsText, Resources.OtherTestsText, Resources.TotalTestsText];
        }
    }

    private _getAggregatorComboValue(chartConfigurationOptions: ChartConfigurationOptions): string {
        let series: string;

        series = this._getSeriesFromConfiguration(chartConfigurationOptions);

        return this._getAggregatorFromSeries(series);
    }

    private _getFilterComboValue(chartConfigurationOptions: ChartConfigurationOptions): string {
        let series: string;

        series = this._getSeriesFromConfiguration(chartConfigurationOptions);

        return this._getFilterFromSeries(series);
    }

    private _getAggregatorFromSeries(series: string): string {
        let returnValue: string;

        switch (series) {
            case SeriesTypes.PassedTests:
            case SeriesTypes.FailedTests:
            case SeriesTypes.OtherTests:
            case SeriesTypes.TotalTests:
                returnValue = Resources.CountText;
                break;
            case SeriesTypes.PassPercentage:
            case SeriesTypes.FailPercentage:
            case SeriesTypes.OthersPercentage:
                returnValue = Resources.PercentageText;
                break;
            default:
                Diag.logInfo(Utils_String.format("Unsupported series: {0}", series));
                returnValue = Resources.CountText;
                break;
        }

        return returnValue;
    }

    private _getFilterFromSeries(series: string): string {
        let retValue: string;

        switch (series) {
            case SeriesTypes.PassedTests:
            case SeriesTypes.PassPercentage:
                retValue = Resources.PassedTestsText;
                break;
            case SeriesTypes.FailedTests:
            case SeriesTypes.FailPercentage:
            case SeriesTypes.OthersPercentage:
                retValue = Resources.FailedTestsText;
                break;
            case SeriesTypes.OtherTests:
                retValue = Resources.OtherTestsText;
                break;
            case SeriesTypes.TotalTests:
                retValue = Resources.TotalTestsText;
                break;
            default:
                Diag.logInfo(Utils_String.format("Invalid value for filter: {0}", series));
                retValue = Resources.PassedTestsText;
                break;
        }

        return retValue;
    }

    private _getSeriesFromConfiguration(chartConfigurationOptions: ChartConfigurationOptions): string {
        let seriesType: string;

        switch (this._options.chartCategory) {
            case Chart_Category.PRIMARY:
                seriesType = chartConfigurationOptions.yAxisOptions.seriesType;
                break;
            case Chart_Category.SECONDARY:
                seriesType = chartConfigurationOptions.secondaryYAxisOptions.seriesType;
                break;
            default:
                Diag.logError(Utils_String.format("Unsupported chart category: {0}", this._options.chartCategory));
                seriesType = chartConfigurationOptions.yAxisOptions.seriesType;
                break;
        }

        return seriesType;
    }

    private _seriesMeasureMap: IDictionaryStringTo<IDictionaryStringTo<string>> = {
        [Resources.CountText]: {
            [Resources.PassedTestsText]: SeriesTypes.PassedTests,
            [Resources.FailedTestsText]: SeriesTypes.FailedTests,
            [Resources.OtherTestsText]: SeriesTypes.OtherTests,
            [Resources.TotalTestsText]: SeriesTypes.TotalTests
        },
        [Resources.PercentageText]: {
            [Resources.PassedTestsText]: SeriesTypes.PassPercentage,
            [Resources.FailedTestsText]: SeriesTypes.FailPercentage,
            [Resources.OtherTestsText]: SeriesTypes.OthersPercentage,
        }
    };

    private _skeleton: JQuery;
    private _filterCombo: Combo;
    private _aggregatorCombo: Combo;
}


/**
 * register control as an enhancement to allow the contribution model to associate it with the widget host.
 */
SDK.registerContent("testresults.trend.configure", (context) => {
    return Controls.create(TestResultsTrendConfiguration, context.$container, context.options);
});
