/// <reference types="jquery" />





import Charting = require("Charting/Scripts/TFS.Charting");
import Charting_Charts = require("Charting/Scripts/TFS.Charting.Charts");
import Charting_Hosts = require("Charting/Scripts/TFS.Charting.Hosts");
import DataServices = require("Charting/Scripts/TFS.Charting.DataServices");

import PresentationResources = require("Presentation/Scripts/TFS/Resources/TFS.Resources.Presentation");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import TFS_FeatureLicenseService = require("Presentation/Scripts/TFS/TFS.FeatureLicenseService");
import TFS_Server_WebAccess_Constants = require("Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants");

import TCMCharts = require("TestManagement/Scripts/TFS.TestManagement.Controls.Charts");
import TestManagementResources = require("TestManagement/Scripts/Resources/TFS.Resources.TestManagement");

import Controls = require("VSS/Controls");
import Diag = require("VSS/Diag");
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import VSS = require("VSS/VSS");

let delegate = Utils_Core.delegate;
let TfsContext = TFS_Host_TfsContext.TfsContext;
let tfsContext = TfsContext.getDefault();
let getErrorMessage = VSS.getErrorMessage;

export class TestRunSummaryChartsView extends Controls.BaseControl implements TCMCharts.ITestManagementChartsView {

    public static statusUpdate: string = "statusUpdate";
    public static commandStatusChanged: string = "commandStatusChanged";
    private static _typeName: string = "tfs.tcm.TestManagementChartsView";

    // Within the store, the group key uniquely describes a group of charts within a given scope
    private static _TestRunSummaryConfigurationScope: string = Charting.ChartProviders.testRunSummary;

    public static _refreshCommand: string = "refresh-charts";
    public static _newChartCommand: string = "new-chart";

    // Charts in this view rendered from two sources, Test Results for Execution and Test Case (WIT) for Authoring
    public static _chartDataSourceRunSummary: string = "runsummary";

    private _commandName: string;
    private _chartsList: Charting_Hosts.ChartHostsList;
    private _chartsListClassName = "chart-hosts-list";
    
    public runId2;
    private _query;

    private _defaultChartDataSource = TestRunSummaryChartsView._chartDataSourceRunSummary;
    private _defaultSeriesOutcome = "Outcome";
    private _defaultSeriesFailureType = "FailureType";
    private _defaultSeriesConfiguration = "Configuration";
    private _defaultSeriesPriority = "Priority";
    private _defaultSeriesResolution = "Resolution";
    private NumDefaultCharts: number = 5;
    private _parentToolbar: any;

    constructor(options?) {
        super(options);
        this.runId2 = options.runId;
        this._parentToolbar = options.toolBar;
    }

    public setRun(runId) {
        this.runId2 = runId;
    }

    public initializeOptions(options?: any) {
        /// <param name="options" type="any" />

        super.initializeOptions($.extend({
            coreCssClass: "test-run-summary-charts-view",
        }, options));
    }

    public initialize() {
        Diag.logTracePoint("TestRunSummaryChartsView.initialize.start");

        let $button: JQuery,
            $list: JQuery,
            that: TestRunSummaryChartsView = this,
            chartsListSettings;

        let chartHostListSettings: Charting_Hosts.IChartHostListSettings = {
            viewIsReady: () => {
                return true;
            },
            canAddToDashboard: () => {
                return false;
            },
            canEditCharts: () => {
                return false;
            },
            canDeleteCharts: () => {
                return false;
            },
            canShowCharts: () => {
                return true;
            },
            canCreateNewChart: () => {
                return false;
            },
            getConfigurationGroupKey: () => {
                return this.getGroupKey();
            },
            getConfigurationScope: () => {
                return Charting.ChartProviders.testRunSummary;
            },
            getFilterContext: () => {
                return { runId: this.runId2 };
            },
            getEmptyChartMessage: () => {
                switch (TFS_FeatureLicenseService.FeatureLicenseService.getDefaultService(tfsContext).getFeatureState(TFS_Server_WebAccess_Constants.LicenseFeatureIds.ChartAuthoring)) {
                    case TFS_Server_WebAccess_Constants.FeatureMode.Advertising:
                        return TestManagementResources.NoLicenseHostedEmptyQueryChartList;

                    case TFS_Server_WebAccess_Constants.FeatureMode.Licensed:
                    case TFS_Server_WebAccess_Constants.FeatureMode.Trial:
                        return Utils_String.format(TestManagementResources.EmptyQueryChartList, Utils_String.htmlEncode("Run Summary Chart")); //this._options.suite.title));

                    case TFS_Server_WebAccess_Constants.FeatureMode.Off:
                        return TestManagementResources.NoLicenseEmptyQueryChartList;
                }
            },
            getChartsSuppressedMessage: () => {
                return "";
            },
            editChart: () => {
            }
        };
        let createChartList = () => {
            this._chartsList = <Charting_Hosts.ChartHostsList>Controls.BaseControl.createIn(Charting_Hosts.ChartHostsList, this._element, {
                cssClass: this._chartsListClassName,
                tfsContext: this._options.tfsContext,
                chartHostListSettings: chartHostListSettings
            });

            this.setFilterContext();
            this.setAccessibilityProperties();

            
        };

        createChartList();
        Diag.logTracePoint("TestRunSummaryChartsView.initialize.exit");
    }

    private _statusUpdate(error?: any) {
        this._fire("statusUpdate", [error || this.getStatusText(), error ? true : false]);
    }

    private getGroupKey() {
        return TestManagementResources.DefaultGroupKeyRecentRun;
    }

    private setAccessibilityProperties(){
         let chartElement = $("." + this._chartsListClassName);

         chartElement.attr("tabindex", "0");
         chartElement.attr("aria-label", TestManagementResources.RunsChartLabel);
    }

    public setFilterContext() {
        Diag.logVerbose("[setFilterContext] setFilterContext method called");
        if (this._options) {
            this._options.project = this._options.tfsContext.contextData.project;

            let defaultPivots: string[] = [this._defaultSeriesOutcome, this._defaultSeriesPriority, this._defaultSeriesConfiguration, this._defaultSeriesFailureType, this._defaultSeriesResolution];
            let i = 0;
            this._beginAddDefaultCharts(defaultPivots, i);
        }
        Diag.logVerbose("[setFilterContext] setFilterContext method exit");
    }

    public getStatusText(): string {
        return "";
    }

    public executeCommand(command: any) {
        Diag.logTracePoint("TestRunSummaryChartsView.executeCommand.start");
        this._commandName = command.get_commandName();

        // Checking to see if the command we can handle is executed
        switch (this._commandName) {
            case TestRunSummaryChartsView._refreshCommand:
                this._chartsList.beginRefresh();
                Diag.logTracePoint("TestRunSummaryChartsView.executeCommand._refreshCommand");
                return false;
        }
        Diag.logTracePoint("TestRunSummaryChartsView.executeCommand.exit");
    }

    public refresh() {
        this._chartsList.beginRefresh();
        Diag.logTracePoint("TestRunSummaryChartsView.refresh");
    }

    private _getTestChartsTransformOptions(chartDataSource: string, groupByString?: string): DataServices.ITransformOptions {
        if (!groupByString) {
            groupByString = "";
        }

        return {
            filter: Utils_String.format("projectId={0}&chartDataSource={1}", this._options.project.id, chartDataSource),
            groupBy: groupByString,
            orderBy: {
                direction: DataServices.OrderDirection.descending,
                propertyName: DataServices.OrderProperty.useValue,
            },
            measure: {
                aggregation: DataServices.AggregationFunction.count,
                propertyName: "Tests", //Count Aggregation does not use any property data
            },
            filterContext: { runId: this.runId2 }
        };
    }

    private createChartConfiguration(chartDataSource: string, groupByString?: string): DataServices.IChartConfiguration {
        ///<summary>packs up the minimum configuration state needed so new chart dialog can customize settings for persistence.</summary>
        let transformOptions = this._getTestChartsTransformOptions(chartDataSource, groupByString);

        //Configure a new Configuration using a snap of current settings.
        return {
            scope: TestRunSummaryChartsView._TestRunSummaryConfigurationScope,
            groupKey: this.getGroupKey(),
            title: Utils_String.format(PresentationResources.DefaultChartName, TestManagementResources.DefaultChartName),
            chartType: Charting_Charts.ChartTypes.stackBarChart,
            transformOptions: transformOptions
        };
    }

    private _beginAddDefaultCharts(_defaultChartPivots: string[], index: any) {
        Diag.logTracePoint("TestRunSummaryChartsView._beginAddDefaultCharts.started");

        this._beginCheckAvailableConfigurations(
            () => {
                let _that = this;
              
                _that._beginGetDefaultSnapshotChartState(_defaultChartPivots[index],
                  
                        function lambda(chartState: Charting_Charts.IChartState) {
                            index++;
                            if (index < _that.NumDefaultCharts) {
                                _that._beginGetDefaultSnapshotChartState(_defaultChartPivots[index],
                                    lambda);
                            }
                            if (chartState && _that._chartsList) {
                                _that._chartsList.addChart(chartState);
                                _that._chartsList.beginRefresh();
                            }
                });
            }
            );
        Diag.logTracePoint("TestRunSummaryChartsView._beginAddDefaultCharts.exit");
    }

    private _beginGetDefaultSnapshotChartState(_defaultChartPivot: any, resultCallback?: (chartState: Charting_Charts.IChartState) => void, errorCallBack?: IErrorCallback): void {
        this._beginGetDefaultConfiguration(_defaultChartPivot,
            (resultConfiguration) => {
                this._beginGetDefaultChartData(_defaultChartPivot,  //for each resultConfiguratin, we call this.
                    (result) => {
                        resultCallback(
                            {
                                configuration: resultConfiguration,
                                results: result
                            });
                    }, errorCallBack
                    );
            }, errorCallBack
            );
    }

    private _beginGetDefaultChartData(_defaultChartPivot: any, resultCallback?: (chartData: DataServices.IDataTable) => void, errorCallBack?: IErrorCallback): void {
        let chartDataProvider = DataServices.ChartQueryEngine;
        let transformOptions = this._getTestChartsTransformOptions(this._defaultChartDataSource, _defaultChartPivot);

        if (chartDataProvider) {
            chartDataProvider.beginPostDataQuery(
                this._options.tfsContext.contextData.project.id,
                TestRunSummaryChartsView._TestRunSummaryConfigurationScope,
                [transformOptions],
                (results: DataServices.IDataTable[]) => {
                    resultCallback(results[0]);
                }, (error) => {
                    errorCallBack(error);
                });
        }
    }

    private _beginGetDefaultConfiguration(_defaultChartPivot: any, resultCallback?: (resultConfiguration: DataServices.IChartConfiguration) => void, errorCallback?: IErrorCallback): void {
        let defaultConfiguration: DataServices.IChartConfiguration;
        defaultConfiguration = this.createChartConfiguration(this._defaultChartDataSource, _defaultChartPivot);
        defaultConfiguration.transformOptions.groupBy = this._defaultSeriesOutcome;

        if (_defaultChartPivot == this._defaultSeriesOutcome) {
            defaultConfiguration.chartType = Charting_Charts.ChartTypes.pieChart;
        }
        else {
            defaultConfiguration.transformOptions.series = _defaultChartPivot;
        }

        switch (_defaultChartPivot) {
            case this._defaultSeriesOutcome:
                defaultConfiguration.title = TestManagementResources.DefaultPivotOutcome;
                break;

            case this._defaultSeriesConfiguration:
                defaultConfiguration.title = Utils_String.format(TestManagementResources.DefaultChartTitleByOutcome, TestManagementResources.DefaultPivotConfiguration);
                break;

            case this._defaultSeriesFailureType:
                defaultConfiguration.title = Utils_String.format(TestManagementResources.DefaultChartTitleByOutcome, TestManagementResources.DefaultPivotFailureType);
                break;

            case this._defaultSeriesPriority:
                defaultConfiguration.title = Utils_String.format(TestManagementResources.DefaultChartTitleByOutcome, TestManagementResources.DefaultPivotPriority);
                break;

            case this._defaultSeriesResolution:
                defaultConfiguration.title = Utils_String.format(TestManagementResources.DefaultChartTitleByOutcome, TestManagementResources.DefaultPivotResolution);
                break;
        }

        DataServices.ChartConfigStore.beginSaveNewChartConfiguration(this._options.tfsContext.contextData.project.id, defaultConfiguration, resultCallback, errorCallback);
    }

    private _beginCheckAvailableConfigurations(resultCallback?: IResultCallback, errorCallback?: IErrorCallback): void {
        DataServices.ChartConfigStore.beginGetChartConfigurationsInGroup(
            this._options.tfsContext.contextData.project.id, 
            TestRunSummaryChartsView._TestRunSummaryConfigurationScope,
            this.getGroupKey(),
            (chartConfigurations) => {
                if (chartConfigurations.length === 0) {
                    // Since no chart configuration exists for this scope, we will add new configuration for default chart
                    resultCallback();
                }
                else {
                    // get charts view to a consistent state
                    // todo: refactor to call the callback always 
                    this._chartsList.beginRefresh();
                }
            }, errorCallback);
    }
}

VSS.initClassPrototype(TestRunSummaryChartsView, {
    _chartListToolbar: null,
    _splitter: null,
    _chartsList: null
});

Controls.Enhancement.registerEnhancement(TestRunSummaryChartsView, ".test-run-summary-charts-view");

// TFS plugin model requires this call for each tfs module. 
VSS.tfsModuleLoaded("TFS.TestManagement.RunsView.Controls.Charts", exports);
