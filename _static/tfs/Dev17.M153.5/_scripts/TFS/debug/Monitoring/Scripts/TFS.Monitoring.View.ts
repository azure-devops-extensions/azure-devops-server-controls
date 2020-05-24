//Auto converted from Monitoring/Scripts/TFS.Monitoring.View.debug.js

/// <reference types="jquery" />




import VSS = require("VSS/VSS");
import Navigation = require("VSS/Controls/Navigation");
import Navigation_Services = require("VSS/Navigation/Services");
import Service = require("VSS/Service");
import TFS_OM_Common = require("Presentation/Scripts/TFS/TFS.OM.Common");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import MonitorControls = require("Monitoring/Scripts/TFS.Monitoring.Controls");
import MonitorOM = require("Monitoring/Scripts/TFS.Monitoring");
import monitoringResources = require("Monitoring/Scripts/Resources/TFS.Resources.Monitoring");
import Controls = require("VSS/Controls");
import Grids = require("VSS/Controls/Grids");
import Menus = require("VSS/Controls/Menus");
import Validation = require("VSS/Controls/Validation");
import Utils_UI = require("VSS/Utils/UI");
import Utils_Core = require("VSS/Utils/Core");

var domElem = Utils_UI.domElem;
var delegate = Utils_Core.delegate;
var TfsContext = TFS_Host_TfsContext.TfsContext;


export class MonitoringViewSummary extends Navigation.NavigationView {

    private _tfsContext: TFS_Host_TfsContext.TfsContext;
    private _monitorManager: any;
    private _jobsGrid: any;
    private _jobHistoryGrid: any;
    private _views: any;

    public $chartContainer: any;
    public $chartTotalRunTimeContainer: any;
    public $chartResultTypesContainer: any;
    public $chartNumberOfResultsContainer: any;

    constructor (options? ) {

        super(options);
    }

    public initializeOptions(options?: any) {
        /// <param name="options" type="any" />

        super.initializeOptions($.extend({
            hubContentCss: ".hub-content",
            pivotTabsCss: ".hub-view-tabs"
        }, options));
    }

    public initialize() {
        this._tfsContext = this._options.tfsContext || TfsContext.getDefault();
        this.$chartContainer = $(domElem('div')).appendTo(this._element);

        // create an area for each chart; this will force the charts to be drawn and placed in the same
        // order each time on the page
        this.$chartTotalRunTimeContainer = $(domElem('div')).appendTo(this.$chartContainer);
        this.$chartResultTypesContainer = $(domElem('div')).appendTo(this.$chartContainer);
        this.$chartNumberOfResultsContainer = $(domElem('div')).appendTo(this.$chartContainer);

        // create additional information for the first chart (bar chart with total run time)
        $(domElem('h2')).appendTo(this.$chartTotalRunTimeContainer).text(monitoringResources.ClientSideRunTimeHeader);
        $(domElem('p')).appendTo(this.$chartTotalRunTimeContainer).text(monitoringResources.ClientSideRunTimeDescription);

        // create additional information for the second chart (pie chart with results)
        $(domElem('h2')).appendTo(this.$chartResultTypesContainer).text(monitoringResources.ClientSideResultTypesHeader);
        $(domElem('p')).appendTo(this.$chartResultTypesContainer).text(monitoringResources.ClientSideResultTypesDescription);

        // create additional information for the third chart (bar chart with number of job run)
        $(domElem('h2')).appendTo(this.$chartNumberOfResultsContainer).text(monitoringResources.ClientSideNumberOfResultsHeader);
        $(domElem('p')).appendTo(this.$chartNumberOfResultsContainer).text(monitoringResources.ClientSideNumberOfResultsDescription);

        this._monitorManager = TFS_OM_Common.Deployment.getConnection(this._tfsContext).getService<MonitorOM.MonitorManager>(MonitorOM.MonitorManager);
    }

    private _fillData() {
        this._fillChartData();
    }

    private _fillChartData() {
        var that = this,
            container = this.$chartContainer,
            img;

        this._monitorManager.getTotalRunTimeChart(function (chart) {
            container.append(chart.imageMap);
            img = $("<img />").attr("src", chart.imageData).attr("usemap", "#" + chart.imageMapName).appendTo(that.$chartTotalRunTimeContainer);
        });

        this._monitorManager.getTotalRunTimePieChart(function (chart) {
            container.append(chart.imageMap);
            img = $("<img />").attr("src", chart.imageData).attr("usemap", "#" + chart.imageMapName).appendTo(that.$chartResultTypesContainer);
        });

        this._monitorManager.getJobResultsOverTimeChart(function (chart) {
            container.append(chart.imageMap);
            img = $("<img />").attr("src", chart.imageData).attr("usemap", "#" + chart.imageMapName).appendTo(that.$chartNumberOfResultsContainer);
        });
    }
}

VSS.initClassPrototype(MonitoringViewSummary, {
    _tfsContext: null,
    _monitorManager: null,
    _jobsGrid: null,
    _jobHistoryGrid: null,
    _views: null,
    $chartContainer: null,
    $chartTotalRunTimeContainer: null,
    $chartResultTypesContainer: null,
    $chartNumberOfResultsContainer: null
});

VSS.classExtend(MonitoringViewSummary, TfsContext.ControlExtensions);



class MonitoringViewQueue extends Navigation.NavigationView {

    private _tfsContext: TFS_Host_TfsContext.TfsContext;
    private _monitorManager: any;
    private _jobsGrid: any;
    private _jobQueueGrid: any;
    private _views: any;

    public $chartContainer: any;
    public $chartJobQueuePositionContainer: any;
    public $gridDetailsContainer: any;

    constructor (options? ) {

        super(options);
    }

    public initializeOptions(options?: any) {
        /// <param name="options" type="any" />

        super.initializeOptions($.extend({
            hubContentCss: ".hub-content",
            pivotTabsCss: ".hub-view-tabs"
        }, options));
    }

    public initialize() {
        this._tfsContext = this._options.tfsContext || TfsContext.getDefault();
        this.$chartContainer = $(domElem('div')).appendTo(this._element);

        // create an area for each chart; this will force the charts to be drawn and placed in the same
        // order each time on the page
        this.$chartJobQueuePositionContainer = $(domElem('div')).appendTo(this.$chartContainer);
        this.$gridDetailsContainer = $(domElem('div')).appendTo(this.$chartContainer);

        // create additional information for the first chart (bar chart with total run time)
        $(domElem('h2')).appendTo(this.$chartJobQueuePositionContainer).text(monitoringResources.ClientSideJobQueuePositionHeader);
        $(domElem('p')).appendTo(this.$chartJobQueuePositionContainer).text(monitoringResources.ClientSideJobQueuePositionDescription);

        // create additional information for the second chart (pie chart with results)
        $(domElem('h2')).appendTo(this.$gridDetailsContainer).text(monitoringResources.ClientSideDetailsHeader);
        $(domElem('p')).appendTo(this.$gridDetailsContainer).text(monitoringResources.ClientSideDetailsDescription);

        this._jobQueueGrid = <MonitorControls.JobQueueGrid>Controls.BaseControl.createIn(MonitorControls.JobQueueGrid, this.$gridDetailsContainer, { tfsContext: this._tfsContext });

        this._monitorManager = TFS_OM_Common.Deployment.getConnection(this._tfsContext).getService<MonitorOM.MonitorManager>(MonitorOM.MonitorManager);
    }

    private _fillData(position) {
        this._fillChartData();
        this._fillGridData(position);
    }

    private _fillChartData() {
        var monitorView = this,
            container = this.$chartContainer;

        this._monitorManager.getJobQueuePositionCountChart(function (chart) {
            container.append(chart.imageMap);
            $("<img />").attr("src", chart.imageData).attr("usemap", "#" + chart.imageMapName).appendTo(monitorView.$chartJobQueuePositionContainer);
        });
    }

    private _showError(error) {
        $("<div class='build inline-error' />").text(VSS.getErrorMessage(error)).insertBefore(this._element.find(".hub-title"));
        this._element.find(".hub-title, .right-hub-content").hide();
    }

    private _fillGridData(positionName) {
        var that = this;

        if (positionName === undefined) {
            positionName = 1;
        }

        // job history
        this._monitorManager.getJobQueue(positionName, function (jobQueueEntries) {
            that._jobQueueGrid.setJobQueue(jobQueueEntries);
        }, delegate(this, this._showError));
    }
}

VSS.initClassPrototype(MonitoringViewQueue, {
    _tfsContext: null,
    _monitorManager: null,
    _jobsGrid: null,
    _jobQueueGrid: null,
    _views: null,
    $chartContainer: null,
    $chartJobQueuePositionContainer: null,
    $gridDetailsContainer: null
});

VSS.classExtend(MonitoringViewQueue, TfsContext.ControlExtensions);



export class MonitoringViewHistory extends Navigation.NavigationView {

    private _tfsContext: TFS_Host_TfsContext.TfsContext;
    private _monitorManager: any;
    private _jobsGrid: any;
    private _jobHistoryGrid: any;
    private _views: any;
    private _historyGridHeader: any;
    private _noDataInfo: any;

    public $gridContainer: any;
    public $noGridContainer: any;
    public $chartContainer: any;
    public $historyFilters: any;
    public $gridDataContainer: any;
    public $noGridDataContainer: any;

    constructor (options? ) {
        super(options);
    }

    public initialize() {
        this.$chartContainer = $(domElem('div')).appendTo(this._element);
        this.$gridContainer = $(domElem('div')).appendTo(this._element);

        this._tfsContext = this._options.tfsContext || TfsContext.getDefault();
        this._monitorManager = TFS_OM_Common.Deployment.getConnection(this._tfsContext).getService<MonitorOM.MonitorManager>(MonitorOM.MonitorManager);

        // create additional information for the first chart (bar chart with total run time)
        $(domElem('h2')).appendTo(this.$chartContainer).text(monitoringResources.ClientSideAvgRunQueueTimeHeader);
        $(domElem('p')).appendTo(this.$chartContainer).text(monitoringResources.ClientSideAvgRunQueueTimeDescription);

        // create additional information for the first chart (bar chart with total run time)
        this._historyGridHeader = $(domElem('h2')).appendTo(this.$gridContainer).text(monitoringResources.ClientSideHistoryResultsHeader);
        $(domElem('p')).appendTo(this.$gridContainer).text(monitoringResources.JobGridDescription);
        this.$historyFilters = $(domElem('div')).appendTo(this.$gridContainer);
        $(domElem('br')).appendTo(this.$gridContainer);
        this.$gridDataContainer = $(domElem('div')).appendTo(this.$gridContainer);
        this.$noGridDataContainer = $(domElem('div')).appendTo(this.$gridContainer);

        $(domElem('p')).appendTo(this.$noGridDataContainer).text(monitoringResources.NoJobResultsToDisplay);

        this._jobHistoryGrid = <MonitorControls.JobHistoryGrid>Controls.BaseControl.createIn(MonitorControls.JobHistoryGrid, this.$gridDataContainer, { tfsContext: this._tfsContext });
    }

    private _fillDataForJob(jobId) {
        var that = this;

        // job history
        this._monitorManager.getJobHistoryByJobId(null, null, jobId, function (jobHistory) {
            that._jobHistoryGrid.setJobHistory(jobHistory);
            that._historyGridHeader.text(monitoringResources.JobHistoryForJob + jobId);
        });

        this._getAvgSummaryViewForJob(jobId);
    }

    private _showError(error) {
        $("<div class='build inline-error' />").text(VSS.getErrorMessage(error)).insertBefore(this._element.find(".hub-title"));
        this._element.find(".hub-title, .right-hub-content").hide();
    }

    private _fillData(jobId, resultType) {
        var that = this,
            historyGridHeaderCaption = monitoringResources.TabTitleJobHistory;

        // job history data
        this._monitorManager.getJobHistory(jobId, resultType, function (jobHistory) {

            that._jobHistoryGrid.setJobHistory(jobHistory);
            $(domElem('p')).appendTo(that.$historyFilters).text(monitoringResources.Filters);

            if (jobId) {
                that._monitorManager.getJobName(jobId, function (jobName) {
                    $(domElem('li')).appendTo(that.$historyFilters).text(monitoringResources.JobName + '  ' + jobName.value);
                });
            }
            else {
                $(domElem('li')).appendTo(that.$historyFilters).text(monitoringResources.JobName + '  ' + monitoringResources.All);
            }

            if (resultType) {
                that._monitorManager.getJobResultName(resultType, function (resultName) {
                    $(domElem('li')).appendTo(that.$historyFilters).text(monitoringResources.ResultType + '  ' + resultName.value);
                });
            }
            else {
                $(domElem('li')).appendTo(that.$historyFilters).text(monitoringResources.ResultType + '  ' + monitoringResources.All);
            }

            that._historyGridHeader.text(historyGridHeaderCaption);

            if (that._jobHistoryGrid._count === 0) {
                that.$gridDataContainer.hide();
                that.$noGridDataContainer.show();
            }
            else {
                that.$gridDataContainer.show();
                that.$noGridDataContainer.hide();
            }

        });

        this._getAvgSummaryView();

        // only display this view if we have a job id
        if (jobId) {
            this._getAvgSummaryViewForJob(jobId);
        }
    }

    private _getAvgSummaryView() {
        var container = this.$chartContainer;

        this._monitorManager.getAverageChartForJobNoJob(function (chart) {
            container.append(chart.imageMap);
            $("<img />").attr("src", chart.imageData).attr("usemap", "#" + chart.imageMapName).appendTo(container);
        });
    }

    private _getAvgSummaryViewForJob(jobId) {
        var container = this.$chartContainer;

        this._monitorManager.getAverageChartForJob(jobId, function (chart) {
            container.append(chart.imageMap);
            $("<img />").attr("src", chart.imageData).attr("usemap", "#" + chart.imageMapName).appendTo(container);
        });
    }
}

VSS.initClassPrototype(MonitoringViewHistory, {
    _tfsContext: null,
    _monitorManager: null,
    _jobsGrid: null,
    _jobHistoryGrid: null,
    _views: null,
    $gridContainer: null,
    $noGridContainer: null,
    $chartContainer: null,
    _historyGridHeader: null,
    _noDataInfo: null,
    $historyFilters: null,
    $gridDataContainer: null,
    $noGridDataContainer: null
});

VSS.classExtend(MonitoringViewHistory, TfsContext.ControlExtensions);



export class MonitoringView extends Navigation.NavigationView {

    private _tfsContext: TFS_Host_TfsContext.TfsContext;
    private _monitorManager: any;
    private _tabsControl: any;
    private _defaultView: any;
    private _pivotViews: any;
    private _views: any;
    private _hubContent: any;
    private _historyView: any;
    private _summaryView: any;
    private _queueView: any;
    private _defView: any;

    constructor (options? ) {
        super();
    }

    public initialize() {
        var defaultNavigation = true,
            that = this;

        this._hubContent = this._element.find('.monitoring-content');

        this._tabsControl = <Navigation.PivotView>Controls.Enhancement.ensureEnhancement(Navigation.PivotView, this._element.find(this._options.pivotTabsCss));

        this._tfsContext = this._options.tfsContext || TfsContext.getDefault();
        this._monitorManager = TFS_OM_Common.Deployment.getConnection(this._tfsContext).getService<MonitorOM.MonitorManager>(MonitorOM.MonitorManager);

        this._pivotViews = <Navigation.PivotView>Controls.Enhancement.ensureEnhancement(Navigation.PivotView, this._element.find(".job-tabs"));
        var historySvc = Navigation_Services.getHistoryService();
        historySvc.attachNavigate("summary", function (sender, state) {
            that.navigate("summary", state);
            defaultNavigation = false;
        }, true);

        historySvc.attachNavigate("queue", function (sender, state) {
            that.navigate("queue", state);
            defaultNavigation = false;
        }, true);

        historySvc.attachNavigate("history", function (sender, state) {
            that.navigate("history", state);
            defaultNavigation = false;
        }, true);

        if (defaultNavigation) {
            that.navigate("summary", null);
        }
    }

    public navigate(action, state) {
        var view,
            actionParams;

        state = state || {};

        if (this._pivotViews) {

            actionParams = {};

            view = this._pivotViews.getView("summary");
            view.selected = action === "summary";

            view = this._pivotViews.getView("queue");
            view.selected = action === "queue";

            view = this._pivotViews.getView("history");
            view.selected = action === "history";

            this._pivotViews.setSelectedView(state.action);
            this._pivotViews.updateItems();
        }

        try {
            this._hubContent.empty();

            // update view
            if (action === "history") {
                this._historyView = <MonitoringViewHistory>Controls.BaseControl.createIn(MonitoringViewHistory, this._hubContent);
                this._historyView._fillData(state.id, state.result);
            }

            if (action === "summary") {
                this._summaryView = <MonitoringViewSummary>Controls.BaseControl.createIn(MonitoringViewSummary, this._hubContent);
                this._summaryView._fillData();
            }

            if (action === "queue") {
                this._queueView = <MonitoringViewQueue>Controls.BaseControl.createIn(MonitoringViewQueue, this._hubContent);
                if (state) {
                    this._queueView._fillData(state.position);
                }
                else {
                    this._queueView._fillData(1);
                }
            }
        }
        catch (error) {
            this._showError(error);
        }
    }

    private _showError(error) {
        $("<div class='build inline-error' />").text(VSS.getErrorMessage(error)).insertBefore(this._element.find(".hub-title"));
        this._element.find(".hub-title, .right-hub-content").hide();
    }
}

VSS.initClassPrototype(MonitoringView, {
    _tfsContext: null,
    _monitorManager: null,
    _tabsControl: null,
    _defaultView: null,
    _pivotViews: null,
    _views: null,
    _hubContent: null,
    _historyView: null,
    _summaryView: null,
    _queueView: null,
    _defView: null
});

VSS.classExtend(MonitoringView, TfsContext.ControlExtensions);


Controls.Enhancement.registerEnhancement(MonitoringView, ".monitoring-view")


// TFS plugin model requires this call for each tfs module.
VSS.tfsModuleLoaded("TFS.Monitoring.View", exports);
