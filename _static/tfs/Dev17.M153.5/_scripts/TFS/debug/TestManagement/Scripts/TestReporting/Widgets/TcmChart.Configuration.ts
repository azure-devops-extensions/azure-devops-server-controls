/// <amd-dependency path='VSS/LoaderPlugins/Css!TestManagement' />

import Q = require("q");

import Charting = require("Charting/Scripts/TFS.Charting");
import Charting_Charts = require("Charting/Scripts/TFS.Charting.Charts");
import Charting_Data_Contracts = require("Charting/Scripts/DataService/Contracts");
import Charting_DataServices = require("Charting/Scripts/TFS.Charting.DataServices");
import Charting_Editors = require("Charting/Scripts/TFS.Charting.Editors");

import Dashboard_Contracts = require("Dashboards/Scripts/Contracts");
import { SettingsField, SettingsFieldOptions, SettingsFieldOptionsForJQueryElement } from "Dashboards/Scripts/SettingsField";

import WidgetContracts = require("TFS/Dashboards/WidgetContracts");
import WidgetHelpers = require("TFS/Dashboards/WidgetHelpers");

import { TestPlanSelector } from "TestManagement/Scripts/TestReporting/Widgets/TestPlanSelector";
import { TestSuitePicker } from "TestManagement/Scripts/TestReporting/Widgets/TestSuitePicker";
import * as TCMChartsControl from "TestManagement/Scripts/TFS.TestManagement.Controls.Charts";
import Resources = require("TestManagement/Scripts/Resources/TFS.Resources.TestManagement");

import Diag = require("VSS/Diag");
import Controls = require("VSS/Controls");
import SDK = require("VSS/SDK/Shim");
import Utils_String = require("VSS/Utils/String");

import ChartConfigurationBase = require("Widgets/Scripts/Shared/ChartConfigurationBase");

/**
 * Implementation of Test charts widget Configuration Blade.
 */
export class TcmChartConfiguration extends ChartConfigurationBase.ChartConfigurationBase {

    // Charts in this view rendered from two sources, Test Results for Execution and Test Case (WIT) for Authoring
    private static _chartDataSourceExecution: string = "execution";
    private static _chartDataSourceAuthoring: string = "authoring";
    private static _testChartFilterQueryFormat: string = "planId={0}&suiteId={1}&chartDataSource={2}";

    constructor(options?: Dashboard_Contracts.WidgetConfigurationOptions) {
        super(options);
    }

    /**
     * @brief Initializes control options
     * @param options: widget configuration options
     */
    public initializeOptions(options: Dashboard_Contracts.WidgetConfigurationOptions) {
        super.initializeOptions($.extend({
            coreCssClass: "chart-configuration-container tcm-chart-configuration"
        }, options));
    }

    /**
     * Provides an initial title for newly created Widgets.
     */
    public getInitialTitle(): string {
        return Resources.TestPlanChartDefaultTitle;
    }

    /**
     * Generates a default title for configured widget.
     */
    public generateDefaultTitle(): string {
        if (this._currentTestSuiteName) {
            return Utils_String.format(Resources.TestChartsTitleFormat, this._currentTestSuiteName);
        } else {
            return this.getInitialTitle();
        }
    }

    /**
     * Provides feature specific name for artifacts.
     * This is normally provided by feature metadata after a data source is selected, but the editor needs it before the user has selected an item.
     */
    public getArtifactPluralName(): string {
        return Resources.TestCasesText;
    }

    /**
     * Get a feature centric message for reminding users they need to select a data source.
     */
    public getSelectArtifactReminderMessage(): string {
        return Resources.TestChartsSelectSuiteReminderMessage;
    }

    /** Provides feature specific warning message for widgets which are being upgraded. */
    public getUpgradeWarning(): string {
        return Resources.TestChartsUpgradeWarning;
    }

    /** Provides feature specific warning message for warning a user that they need to select a data source. */
    public getDataSourceNeededMessage(): string {
        return Resources.TestChartsDataSourceNeededMessage;
    }

    /**
     * Adds query selector which is used to populate the chart configuration editor
     * @param $container
     * @param chartConfiguration
     */
    public addQuerySelector($container: JQuery, chartConfiguration: ChartConfigurationBase.IChartConfigurationLiveTile): void {
        this._parseConfiguration(chartConfiguration);
        this._addTestPlanSelector(this.getElement());
        this._addTestSuiteSelector(this.getElement());
        this._addChartDataSourceSelector(this.getElement());
    }

    /**
     * If the chart is already configured, it parses the configuration and populates the default filters
     * @param chartConfiguration
     */
    private _parseConfiguration(chartConfiguration: ChartConfigurationBase.IChartConfigurationLiveTile): void {
        if (chartConfiguration && chartConfiguration.groupKey && chartConfiguration.transformOptions && chartConfiguration.transformOptions.filter) {
            try {
                this._currentTestSuiteId = parseInt(chartConfiguration.groupKey);

                const filter: string = chartConfiguration.transformOptions.filter; // For example : filter="planId=1\u0026suiteId=2\u0026chartDataSource=execution"
                const filterClauses: string[] = filter.split("\u0026");

                const testPlanClause: string = filterClauses[0];
                // Get the TestPlanId. This is not a best practice but this is how TCM does on server side TestReportsHelper.cs
                this._currentTestPlanId = parseInt(testPlanClause.split("=")[1]);

                const dataSourceClause: string = filterClauses[2];

                // Get the chartDataSource. This is not a best practice but this is how TCM does on server side TestReportsHelper.cs
                this._currentChartDataSource = dataSourceClause.split("=")[1];
            } catch (e) {
                // Raise error if can't be parsed'
                Diag.logError("Unable to parse configuration");
            }
        }
    }

    /**
     * Adds Test plan selector dropdown settings field to the configuration block
     * @param $container
     */
    private _addTestPlanSelector($container: JQuery): void {
        const $testPlanSelectorContainer = $("<div>").addClass("test-plan-selector-container settings-field");
        const testPlanSelectorControl = <TestPlanSelector>Controls.BaseControl.createIn(TestPlanSelector, $testPlanSelectorContainer, {
            onSelectionChanged: this._onTestPlanSelectionChanged,
            initialTestPlanId: this._currentTestPlanId
        });

        SettingsField.createSettingsField(<SettingsFieldOptions<TestPlanSelector>>{
            labelText: Resources.TCMChartsTestPlanLabelText,
            control: testPlanSelectorControl,
            controlElement: $testPlanSelectorContainer,
            hasErrorField: true,
            useBowtie: true
        }, $container);
    }

    /**
     * Adds Test suite selector dropdown settings field to the configuration block
     * @param $container
     */
    private _addTestSuiteSelector($container: JQuery): void {
        const $testSuiteSelectorContainer = $("<div>").addClass("test-suite-selector-container settings-field");
        this._testSuiteSelector = <TestSuitePicker>Controls.BaseControl.createIn(TestSuitePicker, $testSuiteSelectorContainer, {
            initialTestPlanId: this._currentTestPlanId,
            initialTestSuiteId: this._currentTestSuiteId,
            onSelectionChanged: this._onTestSuiteSelectionChanged
        });

        SettingsField.createSettingsField(<SettingsFieldOptions<TestSuitePicker>>{
            labelText: Resources.TCMChartsTestSuiteLabelText,
            control: this._testSuiteSelector,
            controlElement: $testSuiteSelectorContainer,
            hasErrorField: true,
            useBowtie: true
        }, $container);
    }

    /**
     * Adds data source selector(Test charts or test result charts) settings field to the configuration block
     * @param $container
     */
    private _addChartDataSourceSelector($container: JQuery): void {

        const chartDataSourceRadioGroup = this._createChartDataSourceRadioGroup();
        const chartDataSourceSettingsField = SettingsField.createSettingsFieldForJQueryElement({
            labelText: Resources.ChartDataSourceLabelText,
            hasErrorField: true
        }, chartDataSourceRadioGroup);

        $container.append(chartDataSourceSettingsField.getElement());
    }

    /**
     * creates and returns a radio group for data source selector (Test case charts or test result charts)
     */
    private _createChartDataSourceRadioGroup(): JQuery {
        const $chartDataSourceSelectorContainer: JQuery = $("<div>").addClass("charts-data-source-selector-container settings-field");

        if (!this._currentChartDataSource) {
            this._currentChartDataSource = TcmChartConfiguration._chartDataSourceAuthoring;
        }
        const testAuthoringRadioOption = {
            id: "testAuthoringRadio",
            value: TcmChartConfiguration._chartDataSourceAuthoring,
            label: Resources.TestCasesText,
            checked: Utils_String.equals(this._currentChartDataSource, TcmChartConfiguration._chartDataSourceAuthoring, false)
        };
        const testExecutionRadioOption = {
            id: "testExecutionRadio",
            value: TcmChartConfiguration._chartDataSourceExecution,
            label: Resources.TestResults,
            checked: Utils_String.equals(this._currentChartDataSource, TcmChartConfiguration._chartDataSourceExecution, false)
        };

        for (let radioOption of [testAuthoringRadioOption, testExecutionRadioOption]) {
            const $radioContainer = $("<span/>").addClass("tcm-chart-source-radio").appendTo($chartDataSourceSelectorContainer);
            const $radio = $("<input/>").attr("type", "radio").attr({ name: "chart-data-source", id: radioOption.id, checked: radioOption.checked, value: radioOption.value });

            $radioContainer.append($radio);
            $radioContainer.append($("<label/>").attr("for", radioOption.id).text(radioOption.label));

            $radio.change(() => {
                const selectedDataSource = $("input[name='chart-data-source']:checked").attr("value");
                this._currentChartDataSource = selectedDataSource;
                this._onChartDataSourceChanged();
            });
        }
        return $chartDataSourceSelectorContainer;
    }

    /**
     * Handles reaction to data selection changes coming from the option selectors
     * Updates the Test Chart Templates and Template Editor as per the selected options
     * @param metadataProvider
     */
    public updateChartEditor(metadataProvider: Charting_DataServices.IChartMetadataProvider): void {

        if (this._areFiltersValid()) {
            this._chartConfiguration.groupKey = this._currentTestSuiteId.toString();

            // transformOptions.filter refers to The WIT query required to populate the data
            this._chartConfiguration.transformOptions.filter =
                Utils_String.format(TcmChartConfiguration._testChartFilterQueryFormat, this._currentTestPlanId, this._currentTestSuiteId, this._currentChartDataSource);
        }

        const updatedChartTemplatesList = this.getChartTemplates();

        // We need to update the template list when chart data source is changed
        if (this._chartTemplateList) {
            this._chartTemplateList.setSource(updatedChartTemplatesList);
        }

        // If the selected chart template is not there in the displayed template list, then clear the settings
        if (this._chartConfiguration && this._chartConfiguration.chartType) {
            const selectedTemplates: Charting_Editors.ChartTemplateItem[] = updatedChartTemplatesList.filter((template: Charting_Editors.ChartTemplateItem) => {
                return (template.chartType === this._chartConfiguration.chartType);
            });
            if (!selectedTemplates || !selectedTemplates.length) {
                this._chartConfiguration.chartType = Charting_Charts.ChartTypes.pieChart;
                if (this._chartTemplateList) {
                    this._chartTemplateList.setSelectedByPredicate(template => template.chartType === Charting_Charts.ChartTypes.pieChart);
                }
            }
        }

        // We need to create the chartConfigurationEditor when chart data source is changed
        if (this._chartConfigurationEditor) {
            this._chartConfigurationEditor.dispose();
        }
        this._chartConfigurationEditor = this.createChartConfigurationEditor(metadataProvider);

        this.onChartTemplateChange();
    }

    /**
     * If anything changed, notify the host of latest state.
     */
    public onChange(): void {
        if (!this._colorConfigurationTracker.canShareColoring(this._getSettings())) {
            this._resetColorManager();
            this._colorConfigurationTracker.disallowLegacyPalette();
        }

        // Now, prepare the chart Title
        this._updateLiveTitle();

        // Checking if the selector options are valid
        if (this._areFiltersValid()) {
            this._chartConfiguration.groupKey = this._currentTestSuiteId.toString();

            // transformOptions.filter refers to The QueryId of a WIT Chart
            this._chartConfiguration.transformOptions.filter =
                Utils_String.format(TcmChartConfiguration._testChartFilterQueryFormat, this._currentTestPlanId, this._currentTestSuiteId, this._currentChartDataSource);

            if (this._chartConfigurationEditor.checkCorrectness(() => { })) {
                this._widgetConfigurationContext.notify(WidgetHelpers.WidgetEvent.ConfigurationChange, WidgetHelpers.WidgetEvent.Args(this.getCustomSettings()))
                    .then((widgetStateRequest: WidgetContracts.NotifyResult) => {
                        widgetStateRequest.getResponse().then((widgetResult: string) => {
                            // the setup for the color palette is done based on the data.
                            const chartLegendItems = <string[]>JSON.parse(widgetResult);
                            this._updateColorManager(chartLegendItems);
                        });
                    });
            }
        }
    }

    /** SDK Contractual onSave handler. Responsabilities:
     * 1-Reports Validity of Config State
     * 2-Explicitly "awakens" any errors which may have been dormant.
     * @returns {IPromise<WidgetContracts.SaveStatus>}
     */
    public onSave(): IPromise<WidgetContracts.SaveStatus> {
        let isValid = false;
        if (this._areFiltersValid()) {
            this._chartConfigurationEditor.validate(); // Make sure errors are visible at this stage
            isValid = this._chartConfigurationEditor.checkCorrectness(() => { });
        }

        if (isValid) {
            return WidgetHelpers.WidgetConfigurationSave.Valid(this.getCustomSettings());
        } else {
            return WidgetHelpers.WidgetConfigurationSave.Invalid();
        }
    }

    /** Returns an array of chart templates (types) based on the current data source */
    public getChartTemplates(): Charting_Editors.ChartTemplateItem[] {
        const templateGenerator = new Charting_Editors.ChartTemplateGenerator();
        let chartTemplates: Charting_Editors.ChartTemplateItem[] = null;
        if (this._currentChartDataSource === TcmChartConfiguration._chartDataSourceAuthoring) {
            chartTemplates = templateGenerator.getAllTemplates(new TCMChartsControl.TestAuthoringChartEditorTooltipMap());
        } else if (this._currentChartDataSource === TcmChartConfiguration._chartDataSourceExecution) {
            chartTemplates = templateGenerator.getSnapshotTemplates(new TCMChartsControl.TestExecutionChartEditorTooltipMap());
        }
        return chartTemplates;
    }

    /** Takes query data and packs up the minimum configuration state needed so new chart dialog can customize settings for persistence */
    public createDefaultChartConfiguration(): Charting_Data_Contracts.ChartConfiguration {
        const transformOptions = <Charting_DataServices.ITransformOptions>{
            filter: null,
            groupBy: Utils_String.empty,
            orderBy: {
                direction: Charting_DataServices.OrderDirection.descending,
                propertyName: Charting_DataServices.OrderProperty.useValue
            },
            measure: {
                aggregation: Charting_DataServices.AggregationFunction.count,
                propertyName: Utils_String.empty // Count Aggregation does not use any property data
            }
        };
        // Configure a new Configuration using a snap of current settings.
        const configuration = <Charting_Data_Contracts.ChartConfiguration>{
            scope: Charting.ChartProviders.testReports,
            groupKey: null,
            title: this.getInitialTitle(),
            chartType: Charting_Charts.ChartTypes.pieChart,
            transformOptions: transformOptions
        };

        return configuration;
    }

    public getCustomSettings(): WidgetContracts.CustomSettings {
        return {
            data: JSON.stringify(this._getSettings()),
            version: this.getCurrentVersion()
        };
    }

    private _onTestPlanSelectionChanged = (selectedTestPlanId: number): void => {
        this._currentTestPlanId = selectedTestPlanId;
        this._currentTestSuiteId = null;
        this._testSuiteSelector.fetchAndShowTestSuites(selectedTestPlanId);

        // notify the displayed chart of the change
        this._onSourceArtifactChanged();
    }

    private _onTestSuiteSelectionChanged = (selectedTestSuiteId: number, selectedTestSuiteName: string, selectedSuitePath: string): void => {
        this._currentTestSuiteId = selectedTestSuiteId;
        this._currentTestSuiteName = selectedTestSuiteName;
        // notify the displayed chart of the change
        this._onSourceArtifactChanged();
    }

    private _onSourceArtifactChanged() {
        // populate ChartEditor if not populated yet
        if (!this._isChartEditorInitialized) {
            this._onChartDataSourceChanged();
        } else {
            this.onChange();
        }
    }

    private _onChartDataSourceChanged() {
        let currentMetadataProvider: Charting_DataServices.IChartMetadataProvider = null;
        const selectedDataSource = this._currentChartDataSource;
        if (Utils_String.equals(selectedDataSource, TcmChartConfiguration._chartDataSourceAuthoring, false)) {
            currentMetadataProvider = new TCMChartsControl.AuthoringChartMetadataProvider(Charting.ChartProviders.testAuthoringMetadata);
        } else if (Utils_String.equals(selectedDataSource, TcmChartConfiguration._chartDataSourceExecution, false)) {
            currentMetadataProvider = new Charting_DataServices.ChartMetadataProvider(Charting.ChartProviders.testReports);
        }

        currentMetadataProvider.beginGetMetadata(() => {
            this.updateChartEditor(currentMetadataProvider);
            this._isChartEditorInitialized = true;
        });
    }

    private _areFiltersValid() {
        return this._currentTestPlanId && this._currentTestSuiteId && this._currentChartDataSource;
    }

    private _currentTestPlanId: number;
    private _currentTestSuiteId: number;
    private _currentTestSuiteName: string;
    private _currentChartDataSource: string;

    private _isChartEditorInitialized: boolean = false;

    private _testSuiteSelector: TestSuitePicker;
}

/**
 * register control as an enhancement to allow the contribution model to associate it with the widget host.
 */
SDK.registerContent("dashboards.tcmChartConfiguration-init", (context) => {
    return Controls.create(TcmChartConfiguration, context.$container, context.options);
});
