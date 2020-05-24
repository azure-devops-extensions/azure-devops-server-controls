/// <amd-dependency path='VSS/LoaderPlugins/Css!TestManagement' />

import { ChartTemplateItem } from "Charting/Scripts/TFS.Charting.Editors";
import { ChartTypePicker } from "Widgets/Scripts/Shared/ChartTypePicker";
import Dashboard_Contracts = require("Dashboards/Scripts/Contracts");
import Controls = require("VSS/Controls");
import SDK = require("VSS/SDK/Shim");
import Utils_String = require("VSS/Utils/String");
import Utils_Array = require("VSS/Utils/Array");
import Utils_Core = require("VSS/Utils/Core");
import TFS_Dashboard_WidgetContracts = require("TFS/Dashboards/WidgetContracts");
import TFS_Control_BaseWidgetConfiguration = require("Widgets/Scripts/VSS.Control.BaseWidgetConfiguration");
import TFS_Dashboard_WidgetHelpers = require("TFS/Dashboards/WidgetHelpers");
import Diag = require("VSS/Diag");
import Resources = require("TestManagement/Scripts/Resources/TFS.Resources.TestManagement");
import { BuildDefinitionPickerOptions, BuildDefinitionPicker, create as BuildDefinitionPickerCreator } from "Dashboards/Controls/Pickers/BuildDefinitionPicker";
import ReleaseDataHelper = require("TestManagement/Scripts/Utils/TFS.TestManagement.ReleaseDataHelper");

import RDPicker = require("TestManagement/Scripts/TestReporting/Widgets/ReleaseDefinitionPicker");
import Q = require("q");

import Contracts = require("TFS/TestManagement/Contracts");
import RMContracts = require("ReleaseManagement/Core/Contracts");

import { ChartTypes as ChartBaseChartTypes, AxisOptions, SeriesTypes } from "TestManagement/Scripts/TestReporting/Charts/ChartBase";
import * as AnalyticsTypes from "TestManagement/Scripts/TestReporting/Analytics/Types";
import { AnalyticsChartingClient } from "TestManagement/Scripts/TestReporting/Analytics/AnalyticsChartingClient";
import {DefinitionReference as BuildDefinitionReference} from "TFS/Build/Contracts";
import {SettingsField, SettingsFieldOptions} from "Dashboards/Scripts/SettingsField";
import { Combo, IComboOptions } from "VSS/Controls/Combos";
import Utils_Html = require("VSS/Utils/Html");
import Utils_Number = require("VSS/Utils/Number");

import VCLegacyContracts = require("VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts");
import VCPathSelectorControl = require("Widgets/Scripts/Shared/VCPathSelectorControl");

class Constants {
    public static BUILD_SELECTOR_CONTAINER: string = "tr-trend-build-selector-container";
    public static RELEASE_SELECTOR_CONTAINER: string = "tr-trend-release-selector-container";
    public static RELEASE_ENVIRONMENT_CONTAINER: string = "tr-trend-release-environment-container";
    public static BRANCH_SELECTOR_CONTAINER = "tr-trend-branch-selector-container";
}

class ReleaseEnvironment {
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

        this._analyticsClient = new AnalyticsChartingClient("AnalyticsTestTrendWidget.Configuration");
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
    public load(widgetSettings: TFS_Dashboard_WidgetContracts.WidgetSettings, widgetConfigurationContext: TFS_Dashboard_WidgetContracts.IWidgetConfigurationContext)
        : IPromise<TFS_Dashboard_WidgetContracts.WidgetStatus> {

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

        if (!this._chartConfigurationOptions.branch) {
            Diag.logInfo("Branch not selected, skipping notify");
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
        this._selectDefaultRadio();
        this._drawRepoAndBranchSelector();
        this._drawChartPicker(AnalyticsTypes.Chart_Category.PRIMARY);  // Primary chart picker
        this._chartConfigurator[AnalyticsTypes.Chart_Category.PRIMARY] = this._drawChartConfigurationControls(AnalyticsTypes.Chart_Category.PRIMARY);   // configuration for Primary charts
        this._drawChartPicker(AnalyticsTypes.Chart_Category.SECONDARY);    // Secondary chart picker
        this._chartConfigurator[AnalyticsTypes.Chart_Category.SECONDARY] = this._drawChartConfigurationControls(AnalyticsTypes.Chart_Category.SECONDARY);   // configuration for Secondary charts
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

        let buildDefinitionPickerControl = <BuildDefinitionPicker>BuildDefinitionPickerCreator($container, <BuildDefinitionPickerOptions>{
            onIndexChanged: Utils_Core.delegate(this, this._onBuildDefinitionChanged),
            initialValue: this._chartConfigurationOptions.buildDefinition
        });

        this._buildSettingsField = SettingsField.createSettingsField(<SettingsFieldOptions<BuildDefinitionPicker>>{
            labelText: Resources.BuildDefinitionText,
            control: buildDefinitionPickerControl,
            controlElement: $container,
            hasErrorField: true,
            useBowtie: true
        }, this.getElement());
    }

    /********* Release Definition Picker *****/
    private _drawReleaseDefinitionDropdown(): void {
        let $container = $("<div>").addClass(Constants.RELEASE_SELECTOR_CONTAINER).addClass("settings-field");
        let releaseDefinitionPickerControl = <RDPicker.ReleaseDefinitionPicker>Controls.BaseControl.createIn(RDPicker.ReleaseDefinitionPicker, $container, {
            onIndexChanged: Utils_Core.delegate(this, this._onReleaseDefinitionChanged),
            initialValue: this._chartConfigurationOptions.releaseDefinition
        });

        this._releaseSettingsField = SettingsField.createSettingsField(<SettingsFieldOptions<RDPicker.ReleaseDefinitionPicker>>{
            labelText: Resources.ReleaseDefinitionText,
            control: releaseDefinitionPickerControl,
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
                    indexChanged: Utils_Core.delegate(this, this._onEnvironmentChange),
                    source: environmentNames,
                    value: this._getReleaseEnvironmentName(this._chartConfigurationOptions.releaseEnvironment.definitionEnvironmentId, environments)
                });
            });
        }
        else {
            this._environmentComboControl = Controls.create<Combo, IComboOptions>(Combo, $environmentContainer, <IComboOptions>{
                allowEdit: false,
                change: Utils_Core.delegate(this, this._onEnvironmentChange),
                indexChanged: Utils_Core.delegate(this, this._onEnvironmentChange)
            });
        }

        this._releaseEnvironmentSelector = SettingsField.createSettingsField(<SettingsFieldOptions<Combo>>{
            labelText: Resources.ReleaseStageText,
            control: this._environmentComboControl,
            controlElement: $environmentContainer,
            useBowtie: true
        }, this.getElement());
    }

    private _drawRepoAndBranchSelector(): void {
        this._vcSelectorContainer = $("<div>").addClass(Constants.BRANCH_SELECTOR_CONTAINER);

        this._vcSelector = this._createRepoAndBranchSelector(this._vcSelectorContainer);

        this._vcSelectorContainer.appendTo(this.getElement());
    }

    private _createRepoAndBranchSelector($repoAndBranchSelectorContainer: JQuery): VCPathSelectorControl.PathSelectorControl {
        let originalValue: VCPathSelectorControl.VCPathInformation = {
            repositoryId: this._chartConfigurationOptions.branch.repositoryId,
            version: this._chartConfigurationOptions.branch.branchName,
            path: "/"
        };

        return <VCPathSelectorControl.PathSelectorControl>Controls.BaseControl.createIn(
            VCPathSelectorControl.PathSelectorControl,
            $repoAndBranchSelectorContainer,
            <VCPathSelectorControl.VCPathSelectorOptions>{
                onChange: Utils_Core.delegate(this, this._onRepoAndBranchChange),
                initialValue: originalValue,
                filter: this._filterVCItems,
                hideGitPathSelector: true
            }
        );
    }

    private _filterVCItems(item: VCLegacyContracts.ItemModel): boolean {
        let node = <VCLegacyContracts.TfsItem>item;
        return node && (node.isBranch || node.isFolder);
    }

    private _onRepoAndBranchChange(): void {
        let newValue: VCPathSelectorControl.VCPathInformation = this._vcSelector._VCsettings;
        this._chartConfigurationOptions.branch.repositoryId = newValue.repositoryId;
        this._chartConfigurationOptions.branch.branchName = newValue.version;
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
    private _drawChartPicker(chartCategory: AnalyticsTypes.Chart_Category): void {
        Controls.create<ChartPicker, IChartPickerOptions>(ChartPicker, this.getElement(), <IChartPickerOptions>{
            chartCategory: chartCategory,
            getChartConfigurationOptions: () => {
                return this._chartConfigurationOptions;
            },
            getChartConfigurator: (chartCategory: AnalyticsTypes.Chart_Category) => {
                return this._chartConfigurator[chartCategory];
            },
            notifyChange: (chartConfigurationOptions: AnalyticsTypes.IAnalyticsChartConfigurationOptions) => {
                this._chartConfigurationOptions = chartConfigurationOptions;
                this._notify();
            }
        });
    }


    /********* Chart Picker *****/


    /********* Chart configuration *****/

    private _drawChartConfigurationControls(chartCategory: AnalyticsTypes.Chart_Category): ChartConfigurator {
        return Controls.create<ChartConfigurator, IChartConfigurationControlOptions>(ChartConfigurator, this.getElement(), <IChartConfigurationControlOptions>{
            chartCategory: chartCategory,
            getChartConfigurationOptions: () => {
                return this._chartConfigurationOptions;
            },
            notifyChange: (chartConfigurationOptions: AnalyticsTypes.IAnalyticsChartConfigurationOptions) => {
                this._chartConfigurationOptions = chartConfigurationOptions;
                this._notify();
            }
        });
    }

    /********* Chart configuration *****/

    /* Private variables section */

    private _defaultChartConfigurationOptions: AnalyticsTypes.IAnalyticsChartConfigurationOptions = {
        width: 500,
        height: 500,
        title: Resources.TestResultsTrendText,
        buildDefinition: null,
        releaseDefinition: null,
        releaseEnvironment: null,
        branch: { branchName: AnalyticsTypes.ChartConstants.BranchAll } as AnalyticsTypes.IAnalyticsBranchReference,
        chartType: ChartBaseChartTypes.Column,
        secondaryChartType: ChartBaseChartTypes.Line,
        yAxisOptions: {
            seriesType: SeriesTypes.Duration,
            allowDecimals: false
        },
        secondaryYAxisOptions: {
            seriesType: SeriesTypes.PassPercentage,
            allowDecimals: true
        },
        primaryChartOptions: {
            metric: AnalyticsTypes.Chart_Metric.Duration,
            stackBy: AnalyticsTypes.Chart_StackBy.Container,
            outcome: AnalyticsTypes.Chart_Outcome.All,
            aggregation: AnalyticsTypes.Chart_Aggregation.Average
        } as AnalyticsTypes.ISingleChartOptions,
        secondaryChartOptions: {
            metric: AnalyticsTypes.Chart_Metric.Rate,
            stackBy: AnalyticsTypes.Chart_StackBy.Container,
            outcome: AnalyticsTypes.Chart_Outcome.Pass,
            aggregation: AnalyticsTypes.Chart_Aggregation.Average
        } as AnalyticsTypes.ISingleChartOptions,
        periodGroup: AnalyticsTypes.Chart_PeriodGroup.Days,
        periodGroupValue: AnalyticsTypes.ChartConstants.MaxDaysToLookback
    } as AnalyticsTypes.IAnalyticsChartConfigurationOptions;

    private _$buildWorkflowSelector: JQuery;
    private _$releaseWorkflowSelector: JQuery;
    private _$workflowContainer: JQuery = $("<div />");
    private _buildSettingsField: SettingsField<BuildDefinitionPicker>;
    private _releaseSettingsField: SettingsField<RDPicker.ReleaseDefinitionPicker>;
    private _releaseEnvironmentSelector: SettingsField<Combo>;
    private _environmentComboControl: Combo;
    private _relDefAndEnvironmentCache: { [id: number]: ReleaseEnvironment[]; } = {};

    private _chartConfigurationOptions: AnalyticsTypes.IAnalyticsChartConfigurationOptions;
    private _chartConfigurator: ChartConfigurator[] = [];
    private _widgetConfigurationContext: TFS_Dashboard_WidgetContracts.IWidgetConfigurationContext;
    private _releaseDataHelper: ReleaseDataHelper.ReleaseDataHelper;
    private _branchCombo: Combo;

    private _analyticsClient: AnalyticsChartingClient;
    private _branches: AnalyticsTypes.IAnalyticsBranchReference[];

    private _vcSelectorContainer: JQuery;
    private _vcSelector: VCPathSelectorControl.PathSelectorControl;
}

interface IConfigurationControlOptions {
    chartCategory: AnalyticsTypes.Chart_Category;
    getChartConfigurationOptions: () => AnalyticsTypes.IAnalyticsChartConfigurationOptions;
    notifyChange: (chartConfigurationOptions: AnalyticsTypes.IAnalyticsChartConfigurationOptions) => void;
}

interface IChartPickerOptions extends IConfigurationControlOptions {
    getChartConfigurator: (category: AnalyticsTypes.Chart_Category) => ChartConfigurator;
}

class ChartPicker extends Controls.Control<IChartPickerOptions> {
    public initialize(): void {
        super.initialize();
        this.getElement().addClass("chart-picker").addClass(AnalyticsTypes.Chart_Category[this._options.chartCategory]);

        this._draw();
    }

    private _draw(): void {
        let pickerHeading: string[];
        let $container: JQuery;
        let chartConfigurationOptions: AnalyticsTypes.IAnalyticsChartConfigurationOptions;
        let defaultChartType: string;

        pickerHeading = [Resources.PrimaryChartText, Resources.SecondaryChartText];
        $container = $("<div>").addClass("chart-picker-container").addClass("settings-field");
        chartConfigurationOptions = this._options.getChartConfigurationOptions();

        switch (this._options.chartCategory) {
            case AnalyticsTypes.Chart_Category.PRIMARY:
                defaultChartType = (chartConfigurationOptions.chartType === ChartBaseChartTypes.ColumnLineCombo) ? ChartBaseChartTypes.Column : chartConfigurationOptions.chartType;
                break;
            case AnalyticsTypes.Chart_Category.SECONDARY:
                defaultChartType = (chartConfigurationOptions.secondaryChartType) ? chartConfigurationOptions.secondaryChartType : ChartBaseChartTypes.Line;
                break;
            default:
                Diag.logError(Utils_String.format("Invalid chart category: {0}", this._options.chartCategory));
                break;
        }

        let chartPickerControl = ChartTypePicker.create(ChartTypePicker, $container, {
            source: this._getChartTemplateList(this._options.chartCategory),
            defaultChartType: defaultChartType,
            change: Utils_Core.delegate(this, this._onSelectedChartChanged, this._options.chartCategory)
        });

        SettingsField.createSettingsField(<SettingsFieldOptions<ChartTypePicker>>{
            labelText: pickerHeading[this._options.chartCategory],
            control: chartPickerControl,
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
        let chartCategory: AnalyticsTypes.Chart_Category;
        let chartConfigurationOptions: AnalyticsTypes.IAnalyticsChartConfigurationOptions;

        selectedChart = (<ChartTypePicker>sender).getValue();
        Diag.logInfo(Utils_String.format("New chart type selected: {0}", selectedChart.chartType));
        chartCategory = args;
        chartConfigurationOptions = this._options.getChartConfigurationOptions();

        switch (chartCategory) {
            case AnalyticsTypes.Chart_Category.PRIMARY:
                chartConfigurationOptions.chartType = selectedChart.chartType;
                break;
            case AnalyticsTypes.Chart_Category.SECONDARY:
                chartConfigurationOptions.secondaryChartType = selectedChart.chartType;
                break;
            default:
                Diag.logError(Utils_String.format("Invalid value of chart category: {0}", chartCategory));
                return;
        }

        this._options.getChartConfigurator(chartCategory).setEnabled(selectedChart.chartType);

        this._options.notifyChange(chartConfigurationOptions);
    }

    /**
     * @brief returns the supported list of chart templates
     * @param chartTypes
     */
    private _getChartTemplateList(category: AnalyticsTypes.Chart_Category): ChartTemplateItem[] {
        let list: ChartTemplateItem[] = [];

        list.push({
            chartType: ChartBaseChartTypes.Line,
            labelText: Resources.LineChartName,
            widgetConfigIconFileName: "icon-config-chart-line.png",
            advancedToolTip: Resources.LineChartAdvancedTooltip
        });

        if (category === AnalyticsTypes.Chart_Category.PRIMARY) {
            list.push({
                chartType: ChartBaseChartTypes.Column,
                labelText: Resources.ColumnChartName,
                widgetConfigIconFileName: "icon-config-chart-column.png",
                advancedToolTip: Resources.ColumnChartAdvancedTooltip
            });
            list.push({
                chartType: ChartBaseChartTypes.Area,
                labelText: "Area",
                widgetConfigIconFileName: "icon-config-chart-area.png",
                advancedToolTip: "Area chart"
            });
            list.push({
                chartType: ChartBaseChartTypes.StackedColumn,
                labelText: Resources.StackedColumnChartName,
                widgetConfigIconFileName: "icon-config-chart-stacked-column.png",
                advancedToolTip: Resources.StackedColumnChartAdvancedTooltip
            });
            list.push({
                chartType: ChartBaseChartTypes.StackedArea,
                labelText: "Stacked area",
                widgetConfigIconFileName: "icon-config-chart-stacked-area.png",
                advancedToolTip: "Stacked area chart"
            });
            list.push({
                chartType: ChartBaseChartTypes.MultiLine,
                labelText: "Multi line",
                widgetConfigIconFileName: "icon-config-chart-line.png",
                advancedToolTip: "Multi line chart"
            });
        }

        return list;
    }
}

class ChartConfiguratorDisplayValue {

    public getMetricKeys(): AnalyticsTypes.Chart_Metric[] {
        return Object.keys(this._metricValues).map(k => parseInt(k));
    }

    public getMetricDisplayValue(metric: AnalyticsTypes.Chart_Metric): string {
        return this._metricValues[metric];
    }

    public getStackByKeys(): AnalyticsTypes.Chart_StackBy[] {
        return Object.keys(this._stackByValues).map(k => parseInt(k));
    }

    public getStackByDisplayValue(stackBy: AnalyticsTypes.Chart_StackBy): string {
        return this._stackByValues[stackBy];
    }

    public getOutcomeKeys(): AnalyticsTypes.Chart_Outcome[] {
        return Object.keys(this._outcomeValues).map(k => parseInt(k));
    }

    public getOutcomeDisplayValue(outcome: AnalyticsTypes.Chart_Outcome): string {
        return this._outcomeValues[outcome];
    }

    public getPeriodGroupKeys(): AnalyticsTypes.Chart_PeriodGroup[] {
        return Object.keys(this._periodGroupValues).map(k => parseInt(k));
    }

    public getPeriodGroupDisplayValue(periodGroup: AnalyticsTypes.Chart_PeriodGroup): string {
        return this._periodGroupValues[periodGroup];
    }

    public getAggregationKeys(): AnalyticsTypes.Chart_Aggregation[] {
        return Object.keys(this._aggregationValues).map(k => parseInt(k));
    }

    public getAggregationDisplayValue(aggr: AnalyticsTypes.Chart_Aggregation): string {
        return this._aggregationValues[aggr];
    }

    private readonly _metricValues: IDictionaryNumberTo<string> = {
        [AnalyticsTypes.Chart_Metric.Duration]: "Duration",
        [AnalyticsTypes.Chart_Metric.Rate]: "Pass/Fail rate",
        [AnalyticsTypes.Chart_Metric.Count]: "Count",
    };

    private readonly _stackByValues: IDictionaryNumberTo<string> = {
        [AnalyticsTypes.Chart_StackBy.Container]: "Container",
        [AnalyticsTypes.Chart_StackBy.Outcome]: "Outcome",
        [AnalyticsTypes.Chart_StackBy.Priority]: "Priority",
        [AnalyticsTypes.Chart_StackBy.TestRun]: "TestRun"
    };

    private readonly _outcomeValues: IDictionaryNumberTo<string> = {
        [AnalyticsTypes.Chart_Outcome.All]: "All",
        [AnalyticsTypes.Chart_Outcome.Pass]: "Pass",
        [AnalyticsTypes.Chart_Outcome.Fail]: "Fail",
    };

    private readonly _periodGroupValues: IDictionaryNumberTo<string> = {
        [AnalyticsTypes.Chart_PeriodGroup.Days]: "Days",
        [AnalyticsTypes.Chart_PeriodGroup.Weeks]: "Weeks",
    };

    private readonly _aggregationValues: IDictionaryNumberTo<string> = {
        [AnalyticsTypes.Chart_Aggregation.Average]: "Average",
        [AnalyticsTypes.Chart_Aggregation.Sum]: "Sum"
    };
}

interface IChartConfigurationControlOptions extends IConfigurationControlOptions {
}

class ChartConfigurator extends Controls.Control<IChartConfigurationControlOptions> {

    public initialize(): void {
        super.initialize();
        this.getElement().addClass("chart-configurator");

        this._chartCategory = this._options.chartCategory;
        this._configuratorDisplayValue = new ChartConfiguratorDisplayValue();
        this._draw();
    }

    public setEnabled(chartType: string): void {
        let allMetricKeys = this._getMetricSourceKeys();
        switch (chartType) {
            case ChartBaseChartTypes.MultiLine:
            case ChartBaseChartTypes.StackedArea:
            case ChartBaseChartTypes.StackedColumn:
                //Remove rate metric when stack charts are selected.
                this._metricCombo.setSelectedIndex(allMetricKeys.indexOf(AnalyticsTypes.Chart_Metric.Duration));
                this._onMetricChanged(allMetricKeys.indexOf(AnalyticsTypes.Chart_Metric.Duration));
                Utils_Array.remove(allMetricKeys, AnalyticsTypes.Chart_Metric.Rate);

                //Show stackby column.
                this._stackBySettingField.showElement();
                break;
            default:
                this._stackBySettingField.hideElement();
                break;
        }
        this._metricCombo.setSource(allMetricKeys.map(m => this._configuratorDisplayValue.getMetricDisplayValue(m)));
    }

    private _draw(): void {
        let metricDefaultValue: string;
        let stackByDefaultValue: string;
        let outcomeDefaultValue: string;
        let aggrDefaultValue: string;

        switch (this._chartCategory) {
            case AnalyticsTypes.Chart_Category.PRIMARY:
                metricDefaultValue = this._configuratorDisplayValue.getMetricDisplayValue(this._options.getChartConfigurationOptions().primaryChartOptions.metric);
                stackByDefaultValue = this._configuratorDisplayValue.getStackByDisplayValue(this._options.getChartConfigurationOptions().primaryChartOptions.stackBy);
                outcomeDefaultValue = this._configuratorDisplayValue.getOutcomeDisplayValue(this._options.getChartConfigurationOptions().primaryChartOptions.outcome);
                aggrDefaultValue = this._configuratorDisplayValue.getAggregationDisplayValue(this._options.getChartConfigurationOptions().primaryChartOptions.aggregation);
                break;
            case AnalyticsTypes.Chart_Category.SECONDARY:
                metricDefaultValue = this._configuratorDisplayValue.getMetricDisplayValue(this._options.getChartConfigurationOptions().secondaryChartOptions.metric);
                stackByDefaultValue = this._configuratorDisplayValue.getStackByDisplayValue(this._options.getChartConfigurationOptions().secondaryChartOptions.stackBy);
                outcomeDefaultValue = this._configuratorDisplayValue.getOutcomeDisplayValue(this._options.getChartConfigurationOptions().secondaryChartOptions.outcome);
                aggrDefaultValue = this._configuratorDisplayValue.getAggregationDisplayValue(this._options.getChartConfigurationOptions().secondaryChartOptions.aggregation);
                break;
        }

        //Metric control
        let metricContainer = $("<div class='settings-field' />");
        this._metricCombo = Controls.create<Combo, IComboOptions>(Combo, metricContainer, <IComboOptions>{
            allowEdit: false,
            indexChanged: Utils_Core.delegate(this, this._onMetricChanged),
            source: this._getMetricSourceKeys().map(m => this._configuratorDisplayValue.getMetricDisplayValue(m)),
            value: metricDefaultValue
        });
        SettingsField.createSettingsField(<SettingsFieldOptions<Combo>>{
            labelText: "Metric",
            control: this._metricCombo,
            controlElement: metricContainer
        }, this.getElement());

        //StackBy control
        let stackByContainer = $("<div class='settings-field' />");
        let stackByCombo = Controls.create<Combo, IComboOptions>(Combo, stackByContainer, <IComboOptions>{
            allowEdit: false,
            indexChanged: Utils_Core.delegate(this, this._onStackByChanged),
            source: this._configuratorDisplayValue.getStackByKeys().map(m => this._configuratorDisplayValue.getStackByDisplayValue(m)),
            value: stackByDefaultValue
        });
        this._stackBySettingField = SettingsField.createSettingsField(<SettingsFieldOptions<Combo>>{
            labelText: "Stack by",
            control: stackByCombo,
            controlElement: stackByContainer
        }, this.getElement());

        switch (this._options.getChartConfigurationOptions().chartType) {
            case ChartBaseChartTypes.StackedColumn:
            case ChartBaseChartTypes.StackedArea:
            case ChartBaseChartTypes.MultiLine:
                this._stackBySettingField.showElement();
                break;
            default:
                this._stackBySettingField.hideElement();
        }

        //Outcome control
        let outcomeContainer = $("<div class='settings-field' />");
        let outcomeControl = Controls.create<Combo, IComboOptions>(Combo, outcomeContainer, <IComboOptions>{
            allowEdit: false,
            indexChanged: Utils_Core.delegate(this, this._onOutcomeChanged),
            source: this._configuratorDisplayValue.getOutcomeKeys().map(o => this._configuratorDisplayValue.getOutcomeDisplayValue(o)),
            value: outcomeDefaultValue
        });
        this._outcomeSettingField = SettingsField.createSettingsField(<SettingsFieldOptions<Combo>>{
            labelText: "Outcome",
            control: outcomeControl,
            controlElement: outcomeContainer
        }, this.getElement());

        if (Utils_String.equals(this._metricCombo.getValue() as string, this._configuratorDisplayValue.getMetricDisplayValue(AnalyticsTypes.Chart_Metric.Duration))) {
            this._outcomeSettingField.hideElement();            //Disable if metric is duration
        }

        if (this._chartCategory === AnalyticsTypes.Chart_Category.PRIMARY) {
            let periodContainer = $("<div class='settings-field' />");
            let periodControl = Controls.create<PeriodControl, IPeriodControlOptions>(PeriodControl, periodContainer, <IPeriodControlOptions>this._options);

            SettingsField.createSettingsField(<SettingsFieldOptions<PeriodControl>>{
                labelText: "Period",
                control: periodControl,
                controlElement: periodContainer
            }, this.getElement());
        }

        //Aggregation control
        let aggregationContainer = $("<div class='settings-field' />");
        let aggrCombo = Controls.create<Combo, IComboOptions>(Combo, aggregationContainer, <IComboOptions>{
            allowEdit: false,
            indexChanged: Utils_Core.delegate(this, this._onAggregationChanged),
            source: this._configuratorDisplayValue.getAggregationKeys().map(a => this._configuratorDisplayValue.getAggregationDisplayValue(a)),
            value: aggrDefaultValue
        });
        SettingsField.createSettingsField(<SettingsFieldOptions<Combo>>{
            labelText: "Aggregation across multiple builds/releases",
            control: aggrCombo,
            controlElement: aggregationContainer
        }, this.getElement());
    }

    private _getMetricSourceKeys(): AnalyticsTypes.Chart_Metric[] {
        let chartConfigurationOptions: AnalyticsTypes.IAnalyticsChartConfigurationOptions = this._options.getChartConfigurationOptions();
        switch (this._chartCategory) {
            case AnalyticsTypes.Chart_Category.PRIMARY:
                switch (chartConfigurationOptions.chartType) {
                    case ChartBaseChartTypes.StackedColumn:
                    case ChartBaseChartTypes.StackedArea:
                    case ChartBaseChartTypes.MultiLine:
                        return [AnalyticsTypes.Chart_Metric.Duration, AnalyticsTypes.Chart_Metric.Count];
                    default:
                        return this._configuratorDisplayValue.getMetricKeys();
                }
            case AnalyticsTypes.Chart_Category.SECONDARY:
                switch (chartConfigurationOptions.secondaryChartType) {
                    case ChartBaseChartTypes.StackedColumn:
                    case ChartBaseChartTypes.StackedArea:
                    case ChartBaseChartTypes.MultiLine:
                        return [AnalyticsTypes.Chart_Metric.Duration, AnalyticsTypes.Chart_Metric.Count];
                    default:
                        return this._configuratorDisplayValue.getMetricKeys();
                }
        }
    }

    private _onMetricChanged(index: number): void {
        let chartConfigurationOptions: AnalyticsTypes.IAnalyticsChartConfigurationOptions = this._options.getChartConfigurationOptions();

        let metricKeys = this._getMetricSourceKeys();
        if (metricKeys[index] === AnalyticsTypes.Chart_Metric.Duration) {           //When metric duraion then dont show outcome control.
            this._outcomeSettingField.hideElement();
        }
        else {
            this._outcomeSettingField.showElement();
        }

        switch (this._chartCategory) {
            case AnalyticsTypes.Chart_Category.PRIMARY:
                chartConfigurationOptions.primaryChartOptions.metric = metricKeys[index];

                switch (chartConfigurationOptions.primaryChartOptions.metric) {
                    case AnalyticsTypes.Chart_Metric.Duration:
                        chartConfigurationOptions.yAxisOptions.seriesType = SeriesTypes.Duration;
                        chartConfigurationOptions.yAxisOptions.allowDecimals = false;
                        break;
                    case AnalyticsTypes.Chart_Metric.Rate:
                        this._onOutcomeChanged(this._configuratorDisplayValue.getOutcomeKeys().indexOf(chartConfigurationOptions.primaryChartOptions.outcome));
                        chartConfigurationOptions.yAxisOptions.allowDecimals = true;
                        break;
                    case AnalyticsTypes.Chart_Metric.Count:
                        this._onOutcomeChanged(this._configuratorDisplayValue.getOutcomeKeys().indexOf(chartConfigurationOptions.primaryChartOptions.outcome));
                        chartConfigurationOptions.yAxisOptions.allowDecimals = false;
                        break;
                }
                break;
            case AnalyticsTypes.Chart_Category.SECONDARY:
                chartConfigurationOptions.secondaryChartOptions.metric = metricKeys[index];

                switch (chartConfigurationOptions.secondaryChartOptions.metric) {
                    case AnalyticsTypes.Chart_Metric.Duration:
                        chartConfigurationOptions.secondaryYAxisOptions.seriesType = SeriesTypes.Duration;
                        chartConfigurationOptions.secondaryYAxisOptions.allowDecimals = false;
                        break;
                    case AnalyticsTypes.Chart_Metric.Rate:
                        this._onOutcomeChanged(this._configuratorDisplayValue.getOutcomeKeys().indexOf(chartConfigurationOptions.secondaryChartOptions.outcome));
                        chartConfigurationOptions.secondaryYAxisOptions.allowDecimals = true;
                        break;
                    case AnalyticsTypes.Chart_Metric.Count:
                        this._onOutcomeChanged(this._configuratorDisplayValue.getOutcomeKeys().indexOf(chartConfigurationOptions.secondaryChartOptions.outcome));
                        chartConfigurationOptions.secondaryYAxisOptions.allowDecimals = false;
                        break;
                }
                break;
        }
        this._options.notifyChange(chartConfigurationOptions);
    }

    private _onStackByChanged(index: number): void {
        let chartConfigurationOptions: AnalyticsTypes.IAnalyticsChartConfigurationOptions = this._options.getChartConfigurationOptions();
        let stackByKeys = this._configuratorDisplayValue.getStackByKeys();

        switch (this._chartCategory) {
            case AnalyticsTypes.Chart_Category.PRIMARY:
                chartConfigurationOptions.primaryChartOptions.stackBy = stackByKeys[index];
                break;
            case AnalyticsTypes.Chart_Category.SECONDARY:
                chartConfigurationOptions.secondaryChartOptions.stackBy = stackByKeys[index];
                break;
        }
        this._options.notifyChange(chartConfigurationOptions);
    }

    private _onOutcomeChanged(index: number): void {
        let chartConfigurationOptions: AnalyticsTypes.IAnalyticsChartConfigurationOptions = this._options.getChartConfigurationOptions();

        let outcomeKeys = this._configuratorDisplayValue.getOutcomeKeys();
        switch (this._chartCategory) {
            case AnalyticsTypes.Chart_Category.PRIMARY:
                chartConfigurationOptions.primaryChartOptions.outcome = outcomeKeys[index];

                switch (chartConfigurationOptions.primaryChartOptions.outcome) {
                    case AnalyticsTypes.Chart_Outcome.All:
                        chartConfigurationOptions.yAxisOptions.seriesType = chartConfigurationOptions.primaryChartOptions.metric === AnalyticsTypes.Chart_Metric.Rate ?
                            SeriesTypes.PassPercentage : SeriesTypes.TotalTests;
                        break;
                    case AnalyticsTypes.Chart_Outcome.Pass:
                        chartConfigurationOptions.yAxisOptions.seriesType = chartConfigurationOptions.primaryChartOptions.metric === AnalyticsTypes.Chart_Metric.Rate ?
                            SeriesTypes.PassPercentage : SeriesTypes.PassedTests;
                        break;
                    case AnalyticsTypes.Chart_Outcome.Fail:
                        chartConfigurationOptions.yAxisOptions.seriesType = chartConfigurationOptions.primaryChartOptions.metric === AnalyticsTypes.Chart_Metric.Rate ?
                            SeriesTypes.FailPercentage : SeriesTypes.FailedTests;
                        break;
                }
                break;
            case AnalyticsTypes.Chart_Category.SECONDARY:
                chartConfigurationOptions.secondaryChartOptions.outcome = outcomeKeys[index];

                switch (chartConfigurationOptions.secondaryChartOptions.outcome) {
                    case AnalyticsTypes.Chart_Outcome.All:
                        chartConfigurationOptions.secondaryYAxisOptions.seriesType = chartConfigurationOptions.secondaryChartOptions.metric === AnalyticsTypes.Chart_Metric.Rate ?
                            SeriesTypes.PassPercentage : SeriesTypes.TotalTests;
                        break;
                    case AnalyticsTypes.Chart_Outcome.Pass:
                        chartConfigurationOptions.secondaryYAxisOptions.seriesType = chartConfigurationOptions.secondaryChartOptions.metric === AnalyticsTypes.Chart_Metric.Rate ?
                            SeriesTypes.PassPercentage : SeriesTypes.PassedTests;
                        break;
                    case AnalyticsTypes.Chart_Outcome.Fail:
                        chartConfigurationOptions.secondaryYAxisOptions.seriesType = chartConfigurationOptions.secondaryChartOptions.metric === AnalyticsTypes.Chart_Metric.Rate ?
                            SeriesTypes.FailPercentage : SeriesTypes.FailedTests;
                        break;
                }
                break;
        }

        this._options.notifyChange(chartConfigurationOptions);
    }

    private _onAggregationChanged(index: number): void {
        let chartConfigurationOptions: AnalyticsTypes.IAnalyticsChartConfigurationOptions = this._options.getChartConfigurationOptions();
        let aggrKeys = this._configuratorDisplayValue.getAggregationKeys();

        switch (this._chartCategory) {
            case AnalyticsTypes.Chart_Category.PRIMARY:
                chartConfigurationOptions.primaryChartOptions.aggregation = aggrKeys[index];
                break;
            case AnalyticsTypes.Chart_Category.SECONDARY:
                chartConfigurationOptions.secondaryChartOptions.aggregation = aggrKeys[index];
                break;
        }
        this._options.notifyChange(chartConfigurationOptions);
    }

    private _configuratorDisplayValue: ChartConfiguratorDisplayValue;
    private _chartCategory: AnalyticsTypes.Chart_Category;
    private _metricCombo: Combo;
    private _stackBySettingField: SettingsField<Combo>;
    private _outcomeSettingField: SettingsField<Combo>;
}

interface IPeriodControlOptions extends IConfigurationControlOptions {
}

class PeriodControl extends Controls.Control<IPeriodControlOptions> {

    public initialize(): void {
        super.initialize();
        this.getElement().addClass("chart-measure-control");

        this._chartCategory = this._options.chartCategory;
        this._configuratorDisplayValue = new ChartConfiguratorDisplayValue();

        let periodGroupDefaultValue: string;
        let periodGroupValueDefaultValue: number;

        switch (this._chartCategory) {
            case AnalyticsTypes.Chart_Category.PRIMARY:
                periodGroupDefaultValue = this._configuratorDisplayValue.getPeriodGroupDisplayValue(this._options.getChartConfigurationOptions().periodGroup);
                periodGroupValueDefaultValue = this._options.getChartConfigurationOptions().periodGroupValue;
                break;
        }

        this._periodGroupCombo = Controls.create<Combo, IComboOptions>(Combo, this.getElement(), <IComboOptions>{
            cssClass: "aggregator-drop-down",
            allowEdit: false,
            indexChanged: Utils_Core.delegate(this, this._onPeriodGroupChange),
            source: this._configuratorDisplayValue.getPeriodGroupKeys().map(pg => this._configuratorDisplayValue.getPeriodGroupDisplayValue(pg)),
            value: periodGroupDefaultValue
        });

        //this._periodGroupValueCombo = Controls.create<Combo, IComboOptions>(Combo, this.getElement(), <IComboOptions>{
        //    cssClass: "filter-drop-down",
        //    allowEdit: false,
        //    indexChanged: Utils_Core.delegate(this, this._onPeriodGroupValueChange),
        //    //source: this._getPeriodGroupValueSource(this._chartCategory === AnalyticsTypes.Chart_Category.PRIMARY ? this._options.getChartConfigurationOptions().primaryChartOptions.periodGroup :
        //    //    this._options.getChartConfigurationOptions().secondaryChartOptions.periodGroup).map(pgv => this._configuratorDisplayValue.getPeriodGroupValuesDisplayValue(pgv)),
        //    source: this._getPeriodGroupValueSource(this._options.getChartConfigurationOptions().periodGroup).map(pgv => this._configuratorDisplayValue.getPeriodGroupValuesDisplayValue(pgv)),
        //    value: periodGroupValueDefaultValue
        //});

        this._periodGroupValueInputBox = $("<input>")
            .attr("type", "text")
            .attr("id", "testRunTitleId")
            .attr("maxlength", 256)
            .attr("class", "filter-drop-down")
            .val(this._options.getChartConfigurationOptions().periodGroupValue);

        //TODO:Move this to CSS file.
        this._periodGroupValueInputBox.width(184);
        this._periodGroupValueInputBox.css("margin-left", 30);

        this._periodGroupValueInputBox.focusout(Utils_Core.delegate(this, this._onPeriodGroupValueChange));

        this.getElement().append(this._periodGroupValueInputBox);
    }

    public setEnabled(enable: boolean): void {
        this._periodGroupCombo.setEnabled(enable);
        //this._periodGroupValueCombo.setEnabled(enable);
    }

    private _onPeriodGroupChange(index: number): void {
        let periodGroupKeys = this._configuratorDisplayValue.getPeriodGroupKeys();
        let defaultPeriodGroupByValue: number;
        let chartConfigurationOptions: AnalyticsTypes.IAnalyticsChartConfigurationOptions = this._options.getChartConfigurationOptions();

        switch (periodGroupKeys[index]) {
            case AnalyticsTypes.Chart_PeriodGroup.Days:
                defaultPeriodGroupByValue = AnalyticsTypes.ChartConstants.MaxDaysToLookback;
                break;
            case AnalyticsTypes.Chart_PeriodGroup.Weeks:
                defaultPeriodGroupByValue = AnalyticsTypes.ChartConstants.MaxWeeksToLookback;
                break;
        }
        //this._periodGroupValueCombo.setSource(this._getPeriodGroupValueSource(periodGroupKeys[index]).map(pgv => this._configuratorDisplayValue.getPeriodGroupValuesDisplayValue(pgv)));
        //this._periodGroupValueCombo.setSelectedIndex(0);
        this._periodGroupValueInputBox.val(defaultPeriodGroupByValue);

        switch (this._chartCategory) {
            case AnalyticsTypes.Chart_Category.PRIMARY:
                chartConfigurationOptions.periodGroup = periodGroupKeys[index];
                //chartConfigurationOptions.periodGroupValue = Utils_Array.first(this._getPeriodGroupValueSource(periodGroupKeys[index]));
                chartConfigurationOptions.periodGroupValue = defaultPeriodGroupByValue;
                break;
            //case AnalyticsTypes.Chart_Category.SECONDARY:
            //    chartConfigurationOptions.secondaryChartOptions.periodGroup = periodGroupKeys[index];
            //    chartConfigurationOptions.secondaryChartOptions.periodGroupValue = Utils_Array.first(this._getPeriodGroupValueSource(periodGroupKeys[index]));
            //    break;
        }

        this._options.notifyChange(chartConfigurationOptions);
    }

    //private _onPeriodGroupValueChange(index: number): void {
    //    let chartConfigurationOptions: AnalyticsTypes.IAnalyticsChartConfigurationOptions = this._options.getChartConfigurationOptions();

    //    //switch (this._options.chartCategory) {
    //    //    case AnalyticsTypes.Chart_Category.PRIMARY:
    //    //        chartConfigurationOptions.yAxisOptions.seriesType = this.getSeriesFromMeasureControl();
    //    //        break;
    //    //    //case AnalyticsTypes.Chart_Category.SECONDARY:
    //    //    //    chartConfigurationOptions.secondaryYAxisOptions.seriesType = this.getSeriesFromMeasureControl();
    //    //    //    break;
    //    //    default:
    //    //        Diag.logError(Utils_String.format("Invalid chart category: {0}", this._options.chartCategory));
    //    //        break;
    //    //}

    //    switch (this._chartCategory) {
    //        case AnalyticsTypes.Chart_Category.PRIMARY:
    //            chartConfigurationOptions.periodGroupValue = this._getPeriodGroupValueSource(this._options.getChartConfigurationOptions().periodGroup)[index];
    //            break;
    //        //case AnalyticsTypes.Chart_Category.SECONDARY:
    //        //    chartConfigurationOptions.secondaryChartOptions.periodGroupValue = this._getPeriodGroupValueSource(this._options.getChartConfigurationOptions().secondaryChartOptions.periodGroup)[index];
    //        //    break;
    //    }

    //    this._options.notifyChange(chartConfigurationOptions);
    //}

    private _onPeriodGroupValueChange(eventObject: JQueryEventObject): void {
        let chartConfigurationOptions: AnalyticsTypes.IAnalyticsChartConfigurationOptions = this._options.getChartConfigurationOptions();
        let value: string = Utils_Html.HtmlNormalizer.normalize((eventObject.target as HTMLInputElement).value);
        if (!Utils_Number.isPositiveNumber(value)) {
            return;
        }

        let periodGroupValue: number = Utils_Number.parseInvariant(value);

        switch (chartConfigurationOptions.periodGroup) {
            case AnalyticsTypes.Chart_PeriodGroup.Days:
                if (periodGroupValue > AnalyticsTypes.ChartConstants.MaxDaysToLookback) {
                    periodGroupValue = AnalyticsTypes.ChartConstants.MaxDaysToLookback;
                }
                break;
            case AnalyticsTypes.Chart_PeriodGroup.Weeks:
                if (periodGroupValue > AnalyticsTypes.ChartConstants.MaxWeeksToLookback) {
                    periodGroupValue = AnalyticsTypes.ChartConstants.MaxWeeksToLookback;
                }
                break;
        }

        switch (this._chartCategory) {
            case AnalyticsTypes.Chart_Category.PRIMARY:
                chartConfigurationOptions.periodGroupValue = periodGroupValue;
                break;
            //case AnalyticsTypes.Chart_Category.SECONDARY:
            //    chartConfigurationOptions.secondaryChartOptions.periodGroupValue = this._getPeriodGroupValueSource(this._options.getChartConfigurationOptions().secondaryChartOptions.periodGroup)[index];
            //    break;
        }

        this._periodGroupValueInputBox.val(periodGroupValue);

        this._options.notifyChange(chartConfigurationOptions);
    }

    //private _getPeriodGroupValueSource(periodGroup: AnalyticsTypes.Chart_PeriodGroup): AnalyticsTypes.Chart_PeriodGroupValue[] {
    //    switch (periodGroup) {
    //        case AnalyticsTypes.Chart_PeriodGroup.Days:
    //            return [AnalyticsTypes.Chart_PeriodGroupValue.Fifteen, AnalyticsTypes.Chart_PeriodGroupValue.Thirty];
    //        case AnalyticsTypes.Chart_PeriodGroup.Weeks:
    //            return [AnalyticsTypes.Chart_PeriodGroupValue.One, AnalyticsTypes.Chart_PeriodGroupValue.Two];
    //    }
    //}

    //private _getAggregatorComboValue(chartConfigurationOptions: AnalyticsTypes.IAnalyticsChartConfigurationOptions): string {
    //    let series: string;

    //    series = this._getSeriesFromConfiguration(chartConfigurationOptions);

    //    return this._getAggregatorFromSeries(series);
    //}

    //private _getFilterComboValue(chartConfigurationOptions: AnalyticsTypes.IAnalyticsChartConfigurationOptions): string {
    //    let series: string;

    //    series = this._getSeriesFromConfiguration(chartConfigurationOptions);

    //    return this._getFilterFromSeries(series);
    //}

    //private _getAggregatorFromSeries(series: string): string {
    //    let returnValue: string;

    //    switch (series) {
    //        case SeriesTypes.PassedTests:
    //        case SeriesTypes.FailedTests:
    //        case SeriesTypes.OtherTests:
    //        case SeriesTypes.TotalTests:
    //            returnValue = Resources.CountText;
    //            break;
    //        case SeriesTypes.PassPercentage:
    //        case SeriesTypes.FailPercentage:
    //        case SeriesTypes.OthersPercentage:
    //            returnValue = Resources.PercentageText;
    //            break;
    //        default:
    //            Diag.logInfo(Utils_String.format("Unsupported series: {0}", series));
    //            returnValue = Resources.CountText;
    //            break;
    //    }

    //    return returnValue;
    //}

    //private _getFilterFromSeries(series: string): string {
    //    let retValue: string;

    //    switch (series) {
    //        case SeriesTypes.PassedTests:
    //        case SeriesTypes.PassPercentage:
    //            retValue = Resources.PassedTestsText;
    //            break;
    //        case SeriesTypes.FailedTests:
    //        case SeriesTypes.FailPercentage:
    //        case SeriesTypes.OthersPercentage:
    //            retValue = Resources.FailedTestsText;
    //            break;
    //        case SeriesTypes.OtherTests:
    //            retValue = Resources.OtherTestsText;
    //            break;
    //        case SeriesTypes.TotalTests:
    //            retValue = Resources.TotalTestsText;
    //            break;
    //        default:
    //            Diag.logInfo(Utils_String.format("Invalid value for filter: {0}", series));
    //            retValue = Resources.PassedTestsText;
    //            break;
    //    }

    //    return retValue;
    //}

    //private _getSeriesFromConfiguration(chartConfigurationOptions: AnalyticsTypes.IAnalyticsChartConfigurationOptions): string {
    //    let seriesType: string;

    //    switch (this._options.chartCategory) {
    //        case AnalyticsTypes.Chart_Category.PRIMARY:
    //            seriesType = chartConfigurationOptions.yAxisOptions.seriesType;
    //            break;
    //        case AnalyticsTypes.Chart_Category.SECONDARY:
    //            seriesType = chartConfigurationOptions.secondaryYAxisOptions.seriesType;
    //            break;
    //        default:
    //            Diag.logError(Utils_String.format("Unsupported chart category: {0}", this._options.chartCategory));
    //            seriesType = chartConfigurationOptions.yAxisOptions.seriesType;
    //            break;
    //    }

    //    return seriesType;
    //}

    //private _seriesMeasureMap: IDictionaryStringTo<IDictionaryStringTo<string>> = {
    //    [Resources.CountText]: {
    //        [Resources.PassedTestsText]: SeriesTypes.PassedTests,
    //        [Resources.FailedTestsText]: SeriesTypes.FailedTests,
    //        [Resources.OtherTestsText]: SeriesTypes.OtherTests,
    //        [Resources.TotalTestsText]: SeriesTypes.TotalTests
    //    },
    //    [Resources.PercentageText]: {
    //        [Resources.PassedTestsText]: SeriesTypes.PassPercentage,
    //        [Resources.FailedTestsText]: SeriesTypes.FailPercentage,
    //        [Resources.OtherTestsText]: SeriesTypes.OthersPercentage,
    //    }
    //};

    private _periodGroupCombo: Combo;
    private _periodGroupValueInputBox: JQuery;
    private _configuratorDisplayValue: ChartConfiguratorDisplayValue;
    private _chartCategory: AnalyticsTypes.Chart_Category;
}


/**
 * register control as an enhancement to allow the contribution model to associate it with the widget host.
 */
SDK.registerContent("testresults.analytics.trend.configure", (context) => {
    return Controls.create(TestResultsTrendConfiguration, context.$container, context.options);
});