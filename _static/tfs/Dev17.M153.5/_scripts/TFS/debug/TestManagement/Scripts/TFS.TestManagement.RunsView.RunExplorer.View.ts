//Auto converted from TestManagement/Scripts/TFS.TestManagement.RunsView.RunExplorer.View.debug.js

/// <reference types="jquery" />
/// <reference types="knockout" />

import Q = require("q");

import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import {ShortcutGroupDefinition} from "TfsCommon/Scripts/KeyboardShortcuts";

import QueryControls = require("TestManagement/Scripts/TFS.TestManagement.RunsView.Controls.Queries");
import Resources = require("TestManagement/Scripts/Resources/TFS.Resources.TestManagement");
import TcmResultSummary = require("TestManagement/Scripts/TFS.TestManagement.ResultsView.Summary");
import ResultHistoryViewWrapper = require("TestManagement/Scripts/TestReporting/TestResultHistory/ViewWrapper");
import TestRunSummaryControl = require("TestManagement/Scripts/TFS.TestManagement.RunsView.Summary");
import TFSOMQueries = require("TestManagement/Scripts/TFS.TestManagement.RunsView.OM.Queries");
import TMControls = require("TestManagement/Scripts/TFS.TestManagement.Controls");
import TMUtils = require("TestManagement/Scripts/TFS.TestManagement.Utils");
import TestReportingCommon = require("TestManagement/Scripts/TestReporting/Common/Common");
import TCMTelemetry = require("TestManagement/Scripts/TFS.TestManagement.Telemetry");
import TRACommonControls = require("TestManagement/Scripts/TFS.TestManagement.RunsView.Common.Controls");
import ValueMap = require("TestManagement/Scripts/TFS.TestManagement.RunsView.ValueMap");
import ExploratorySessionView = require("TestManagement/Scripts/TestReporting/ExploratorySession/ViewWrapper");
import TCMLicenseAndFeatureFlagUtils = require("TestManagement/Scripts/Utils/TFS.TestManagement.LicenseAndFeatureFlagUtils");
import TcmService = require("TestManagement/Scripts/TFS.TestManagement.Service");

import TCMContracts = require("TFS/TestManagement/Contracts");
import { PivotTabsContributionProvider } from "TestManagement/Scripts/TestReporting/ContributionProviders/PivotTabsContributionProvider";

import Controls = require("VSS/Controls");
import Diag = require("VSS/Diag");
import Menus = require("VSS/Controls/Menus");
import Navigation = require("VSS/Controls/Navigation");
import { RichContentTooltip } from "VSS/Controls/PopupContent";
import Navigation_Services = require("VSS/Navigation/Services");
import Performance = require("VSS/Performance");
import Service = require("VSS/Service");
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import VSS = require("VSS/VSS");
let delegate = Utils_Core.delegate;
let TfsContext = TFS_Host_TfsContext.TfsContext;
let TelemetryService = TCMTelemetry.TelemetryService;
let LicenseAndFeatureFlagUtils = TCMLicenseAndFeatureFlagUtils.LicenseAndFeatureFlagUtils;

export class RunExplorerView extends Navigation.NavigationView {

    private _hubTitle: any;
    private static _contributedViews = "contributedViews";
    private static _TestResultHistoryId = "ms.vss-test-web.test-result-history";
    private static _ReleaseServiceDataProviderExternalId = "ms.vss-releaseManagement-web.release-service-data-external";

    //query tree
    public _queryTree: QueryControls.QueryExplorerTree;
    private _treeToolbar: any;
    public _queryHierarchy: TFSOMQueries.QueryHierarchy;

    //info bar
    private _gridInfoBar: any;
    private _resultSummaryInfoBar: any;

    //current state
    private _currentRun: any;
    private _currentRunId: number;
    private _currentRunTitle: string;
    private _currentRunQuery: any;
    private _currentResultId: any;
    private _currentResult: any;
    private _currentResultQuery: any;
    private _currentResultIdentifierOrder: string;
    private _recentRuns: any[];
    private _buildUrl: any;

    //query manager
    public _queryManager: any;

    //tabs
    private _hubContent: any;
    private _tabsControl: Navigation.PivotView;

    //views
    private _views: IViews;
    private _defaultView: any;
    private _currentView: any;
    private _previousView: IViewWrapper;
    private _lastViewBeforeResultSummary: any;
    private _errorView: ErrorViewWrapper;

    //state
    private _currentState: any;
    private _currentNavigationContextId: number;
    private _tfsContext: TFS_Host_TfsContext.TfsContext;

    //Navigation booleans
    private _navigated: boolean = false;
    private _contributionTabNavigated: boolean = false;

    private _testRunShortcutGroup: TestRunShortcutGroup;
    constructor(options?) {
        super($.extend({
            hubContentCss: ".explorer-right-hub-content",
            pivotTabsCss: ".explorer-right-hub-view-tabs"
        }, options));
        this._recentRuns = [];
    }

    public initialize() {
        let that = this;
        let tpc: Service.VssConnection;

        super.initialize();
        this._tfsContext = this._options.tfsContext || TfsContext.getDefault();

        Controls.BaseControl.createIn(TRACommonControls.GotoRunControl, $(".goto-run-action"), {});

        this._hubContent = this._element.find(this._options.hubContentCss);
        Diag.Debug.assert(this._hubContent.length > 0, "Unable to find right hub content element");

        this._tabsControl = <Navigation.PivotView>Controls.Enhancement.enhance(Navigation.PivotView, this._element.find(this._options.pivotTabsCss),
            {
                getEnabledState: (contributionId: string) => {
                     return false;
                }
            });

        Diag.Debug.assert(this._tabsControl ? true : false, "Unable to find pivotview tabs control.");

        this._queryManager = Service.getCollectionService(TFSOMQueries.QueryManager, this._tfsContext.contextData);

        this._hubTitle = this._element.find(".hub-title").eq(0);
        this._hubTitle.addClass("explorer-hub-title"); //Ineffective. ToDo.

        this._treeToolbar = this._createTreeToolbar(this._element.find(".testmanagement-runexplorer-treetoolbar"));
        this._queryTree = <QueryControls.QueryExplorerTree>Controls.BaseControl.createIn(QueryControls.QueryExplorerTree, this._element.find(".testmanagement-runexplorer-treesplitter"), { tfsContext: this._tfsContext });

        this._bind("selectedQueryExplorerNodeChanged", delegate(this, this._onSelectedRunsTreeItemChanged));
        this._bind("ResultsOrderChanged", delegate(this, this._updateCurrentResultOrder));
        this._bind("navigationRequested", delegate(this, this._onNavigationRequested));
        this._bind("RecentRunsUpdated", delegate(this, this._updateRecentRunsTree));

        this._initializeViews();

        //Start to get the hierarchy so that the run tree can be populated

        //Regitster hub navigation shortcuts
        new TMControls.TestHubCommonShortcutGroup(this._tfsContext);
        this._testRunShortcutGroup = new TestRunShortcutGroup(this);
        this._ensureQueryHierarchy(null, null);
    }

    private _setDefaultView() {
        Diag.logTracePoint("[RunExplorerView._setDefaultView]: method called");
        $.each(this._views, (i, view) => {
            if (view.name === ValueMap.RunExplorerViewTabs.RunQuery) {
                this._defaultView = view;
                return false;
            }
        });
    }

    private _attachNavigation(): boolean {
        Diag.logTracePoint("[RunExplorerView._attachNavigation]: method called");
        let retValue: boolean = false;
        let historySvc = Navigation_Services.getHistoryService();
        let isInitialNavigation: boolean = true;
        //Attach to navigate for default/empty action
        historySvc.attachNavigate((sender, state) => {
            if (!historySvc.getCurrentFragment()) {
                if (isInitialNavigation) {
                    Performance.getScenarioManager().startScenarioFromNavigation(TMUtils.TRAPerfScenarios.Area,
                        TMUtils.TRAPerfScenarios.LoadRunsHub, true);
                }

                this.navigate(this._defaultView, state);
                retValue = true;
            }
        });

        //Attach to navigate for each view action
        $.each(this._views, (i, view) => {
            if (i !== RunExplorerView._contributedViews) {
                if (view.name === ValueMap.RunExplorerViewTabs.ResultHistory) {
                    return;
                }

                historySvc.attachNavigate(view.name, (sender, state) => {
                    //This is done to flush both the static members/dictionaries as initialize function is not called when you navigate to recent runs from result summary page
                    //TODO: Make an array of non-contributable tabs under Result Summmary view and check in the array for the view name below
                    if (view.name !== ValueMap.RunExplorerViewTabs.ResultSummary){
                            ContributedTabsWrapper.clearContributedTabDictionary();
                            DataStore.clearResultData();
                    }

                    let scenarioName: string = this._getPerfScenarioName(view.name);

                    if (isInitialNavigation && Utils_String.equals(TMUtils.TRAPerfScenarios.LoadRunsHub, scenarioName)) {
                        Performance.getScenarioManager().startScenarioFromNavigation(TMUtils.TRAPerfScenarios.Area, scenarioName, true);
                    }
                    else if (!Utils_String.equals("", scenarioName) && !Utils_String.equals(TMUtils.TRAPerfScenarios.LoadRunsHub, scenarioName)) {
                        Performance.getScenarioManager().startScenario(TMUtils.TRAPerfScenarios.Area, scenarioName);
                    }

                    this.navigate(view, state);
                    retValue = true;
                }, true);
            }
        });

        isInitialNavigation = false;
        return retValue;
    }

    // Attach to navigate for each contributed view action
    private _attachContributedViewsNavigation(contributedView: ContributedTabsWrapper, tabId: string): void {
        let historySvc = Navigation_Services.getHistoryService();
        historySvc.attachNavigate("contribution", (sender, state) => {
            if (tabId === state["contributionId"] && state["runId"] && state["resultId"]) {
                this.navigate(contributedView, state);
                this._contributionTabNavigated = true;
            }
        }, true);
    }

    private _getPerfScenarioName(viewName: string): string {
        switch (viewName) {
            case ValueMap.RunExplorerViewTabs.RunCharts:
                return TMUtils.TRAPerfScenarios.OpenTestRunSummary;

            case ValueMap.RunExplorerViewTabs.ResultQuery:
                return TMUtils.TRAPerfScenarios.LoadTestResultsForARun;

            case ValueMap.RunExplorerViewTabs.ResultSummary:
                return TMUtils.TRAPerfScenarios.OpenTestResultDetails;

            case ValueMap.RunExplorerViewTabs.RunQuery:
                return TMUtils.TRAPerfScenarios.LoadRunsHub;

            default:
                return "";
        }
    }

    //Set up our views for navigation
    public _initializeViews() {
        Diag.logVerbose("[RunExplorerView._initializeViews] - Entry");
        let navigated = false;

        this._views = {
            resultQueryViewWrapper: new ResultQueryViewWrapper(),
            resultQueryViewEditorWrapper: new ResultQueryViewEditorWrapper(),
            runQueryViewWrapper: new RunQueryViewWrapper(),
            runQueryViewEditorWrapper: new RunQueryViewEditorWrapper(),
            runSummaryViewWrapper: new RunSummaryViewWrapper(),
            resultSummaryViewWrapper: new ResultSummaryViewWrapper(),
            resultHistoryViewWrapper: new ResultHistoryViewWrapper.ResultHistoryViewWrapper(),
            exploratorySessionViewWrapper: new ExploratorySessionView.ExploratorySessionViewWrapper()
        };

        //initialize for contributed tabs
        this._initializeContributedViews();
        
        //Set the default view
        this._setDefaultView();

        Diag.logVerbose("[RunExplorerView._initializeViews] - Exit");
    }

    //Set up our contributed views for navigation
    private _initializeContributedViews() {
        this._getContributedTabs().then((contributedTab: Navigation.IPivotViewItem[]) => {
            this._views.contributedViews = {};
            contributedTab.forEach((tab: Navigation.IPivotViewItem) => {
                this._views.contributedViews[tab.id] = new ContributedTabsWrapper(tab);
                this._attachContributedViewsNavigation(this._views.contributedViews[tab.id], tab.id);

            });

            //Attaching navigation for All tabs
            this._navigated = this._attachNavigation();

            if (!this._navigated && !this._contributionTabNavigated) {
                if (!Performance.getScenarioManager().getScenarios(TMUtils.TRAPerfScenarios.Area, TMUtils.TRAPerfScenarios.LoadRunsHub)) {
                    Performance.getScenarioManager().startScenario(TMUtils.TRAPerfScenarios.Area, TMUtils.TRAPerfScenarios.LoadRunsHub);
                }

                Diag.logVerbose("[RunExplorerView._initializeViews]: Navigating to default view.");

                this.navigate(this._defaultView, Navigation_Services.getHistoryService().getCurrentState());
            }
        }
        );
    }

    //returns tabs that are contributed
    private _getContributedTabs(): IPromise<Navigation.IPivotViewItem[]> {
        return this._tabsControl.refreshContributedItems().then(() => {
            return Q.resolve(this._tabsControl.getItems().filter((tab) => {
                return (tab.contributed && tab.contributed === true);
            }));
        }, (error) => {
            Diag.logError("Error in refreshing contributed items");
        });
    }

    public showError(errorText) {
        Diag.logVerbose("[RunExplorerView.showError] - Entry");
        let view = this._getErrorView();
        //clear hub title.
        this._hubTitle.empty();

        //set hub title as default title of hub
        let $title = $("<div />").text(Resources.TestRunExplorerPageTitle);
        $title.appendTo(this._hubTitle);

        //disable other views
        this._enableViews(view);
        this._setSelectedTab(view, null);

        this._showCurrentView(view);
        view.setErrorText(errorText);
        this._hubContent.show();
        Diag.logVerbose("[RunExplorerView.showError] - Exit");
    }

    public setHubTitle($title: JQuery) {
        this._hubTitle.empty();
        this._hubTitle.append($title);
    }

    private refreshView() {
        this.navigate(this._currentView, this._currentState);
    }

    //Navigate to 'newView' with parameters set in 'state'.
    private navigate(newView, state) {
        Diag.logVerbose("[RunExplorerView.Navigate] - Called");
        this._currentState = state;
        this._currentNavigationContextId++;
        if (!newView || !this._parseStateInfo(newView, state, delegate(this, this._onParseStateInfoSuccess))) {
            this._hubContent.hide();
        }
    }

    //Enable the tab for this view.
    private _setSelectedTab(newView, state) {
        Diag.logVerbose("[RunExplorerView._setSelectedTab] - Called");
        let that = this;

        if (this._tabsControl) {
            $.each(this._views, (i, view) => {
                
                if (i === RunExplorerView._contributedViews) {
                    $.each(view, (name, contributedView) => {
                        let uiView = contributedView._tabItem;
                        if (state) {
                            state.contributionId = uiView.id;
                        }
                        if (uiView) {
                            uiView.link = Navigation_Services.getHistoryService().getFragmentActionLink("contribution", state);
                            uiView.selected = (contributedView === newView);
                        }
                    });
                } else {
                    let uiView = that._tabsControl.getView(view.name);
                    if (uiView) {
                        if (state && state.contributionId) {
                            delete state.contributionId;
                        }
                        uiView.link = Navigation_Services.getHistoryService().getFragmentActionLink(view.name, state);
                        uiView.selected = (view === newView);
                        uiView.disabled = !view.getEnabledState();
                    }
                }
            });

            this._tabsControl.updateItems(true);

            // tab focus to selected element in pivot section
            this._tabsControl._element.find("li.selected a").focus();
        }
        this._showCurrentView(newView);
    }

    private _setCurrentViewState(view) {
        if (view) {
            view.setState(this);
        }
    }

    private _getErrorView() {
        if (!this._errorView) {
            this._errorView = new ErrorViewWrapper();
        }
        return this._errorView;
    }

    private _onParseStateInfoSuccess(newView, state) {
        this._hubContent.show();
        this._setSelectedTab(newView, state);
        this._setCurrentViewState(newView);
    }

    private _showCurrentView(view) {
        Diag.logVerbose("[RunExplorerView._showCurrentView] - Called");

        if (this._currentView) {
            // The currentView variable has not been updated yet so essentially contains the old value.
            // Since we don't want to navigate back-n-forth in the same view, the previousView is changed only when 
            // view is changed to a different one.
            if (this._currentView.name != view.name) {
                this._previousView = this._currentView;
            }
            this._currentView.hide();
        }

        if (view) {
            this._currentView = view;

            //If the view is already instantiated, don't instantiate it again.
            //Doing it only for the new Result History tab. Other tabs will continue having existing behavior.
            if (view.name === ValueMap.RunExplorerViewTabs.ResultHistory && !view.triageView) {
                this._currentView.initializeView(this, this._hubContent, this._previousView);
            } else if (view.name !== ValueMap.RunExplorerViewTabs.ResultHistory) {
                this._currentView.initializeView(this, this._hubContent, this._previousView);
            }

            this._currentView.show();
        }
    }

    private _parseStateInfo(newView, state, callBack) {
        Diag.logTracePoint("[RunExplorerView._parseStateInfo]: method called");

        let retVal = true;
        this._currentRunQuery = null;
        this._currentResultQuery = null;
        this._currentResult = null;

        if (state) {
            this._currentRunId = state.runId;
            this._currentResultId = state.resultId;
        }

        Diag.logVerbose("[RunExplorerView._parseStateInfo]: newView.name = " + newView.name);

        // Make sure Queries hierarchy is created before proceeding further
        this._ensureQueryHierarchy(this._recentRuns, () => {
            Diag.logInfo("[RunExplorerView._parseStateInfo]: Query hierarchy successfully created");
            // Enable views
            this._enableViews(newView);
            // callback
            if ($.isFunction(callBack)) {
                callBack.call(this, newView, state);
            }
        }, (error) => {
            Diag.logError("[RunExplorerView._parseStateInfo]: Error in creating query hierarchy");
            this.showError(Utils_String.format(Resources.ErrorFailedToLoadQueryHierarchyFormat, error.message));
            retVal = false;
        });
        return retVal;
    }

    private _enableViews(view: IViewWrapper) {
        let visibility: boolean[] = [false, false, false, false];
        if (view.isContributedView) {
            visibility[2] = true;
        }
        else {
            switch (view.name) {
                // Run summary, Test Results and Test Result Filters are on same page
                case ValueMap.RunExplorerViewTabs.RunCharts:
                case ValueMap.RunExplorerViewTabs.ResultQuery:
                case ValueMap.RunExplorerViewTabs.ResultQueryEditor:
                    visibility[0] = true;
                    break;
                // Test Runs and Test Run filter are on same page
                case ValueMap.RunExplorerViewTabs.RunQuery:
                case ValueMap.RunExplorerViewTabs.RunQueryEditor:
                    visibility[1] = true;
                    break;
                // Test Result summary is on a separate page
                case ValueMap.RunExplorerViewTabs.ResultSummary:
                case ValueMap.RunExplorerViewTabs.ResultHistory:
                    visibility[2] = true;
                    break;
                // Exploratory Session view on separate page
                case ValueMap.RunExplorerViewTabs.ExploratorySession:
                    visibility[3] = true;
                    break;
                case ValueMap.RunExplorerViewTabs.Error:
                    //we dont want to show any view when error view is enabled.
                    break;
                default:
                    Diag.logError("[RunExplorerView._enableViews]: Invalid view: " + view.name);
                    break;
            }
        }

        // Show views from one group and hide others
        // Group 0
        this._views.resultQueryViewWrapper.setStateEnabled(visibility[0]);
        this._views.resultQueryViewEditorWrapper.setStateEnabled(visibility[0]);
        this._views.runSummaryViewWrapper.setStateEnabled(visibility[0]);

        // Group 1
        this._views.runQueryViewWrapper.setStateEnabled(visibility[1]);
        this._views.runQueryViewEditorWrapper.setStateEnabled(visibility[1]);

        // Group 2
        //contributed tabs should not appear in other pages so set tab-disabled accordingly
        let contributedTab = this._tabsControl.getItems().filter((tab) => {
            return (tab.contributed && tab.contributed === true);
        });

        contributedTab.forEach((tab: Navigation.IPivotViewItem) => {
            if (tab.id === RunExplorerView._TestResultHistoryId) {
                this._views.resultHistoryViewWrapper.setStateEnabled(false);
                tab.disabled = !visibility[2];
            }
            else if (tab.id === RunExplorerView._ReleaseServiceDataProviderExternalId) {
                tab.disabled = true;
            }
            else {
                tab.disabled = !visibility[2];
            }
        });

        this._views.resultSummaryViewWrapper.setStateEnabled(visibility[2]);

        // Group 3
        this._views.exploratorySessionViewWrapper.setStateEnabled(visibility[3]);
    }

    private _getResultOrderFromIdentiferOrder(resultIdentifierOrder) {
        if (!resultIdentifierOrder) {
            return "";
        }
        let sb = new Utils_String.StringBuilder();
        for (let i = 0; i < resultIdentifierOrder.length; i++) {
            sb.append(resultIdentifierOrder[i].split(";")[1]);
            sb.append(";");
        }
        return sb.toString();
    }

    //Bind the info bar to the specified grid
    public bindGridInfoBar(grid) {
        let format;
        this._hubTitle.empty();

        this._gridInfoBar = <QueryControls.QueryResultInfoBar>Controls.BaseControl.createIn(QueryControls.QueryResultInfoBar, this._hubTitle, { showQueryTitle: true, tfsContext: this._tfsContext });

        // Set Title
        this.setCurrentRunTitle(() => {
            this._gridInfoBar.setQueryTitle(Utils_String.format(Resources.RunScopedQueryTitleFormat, this._currentRunId, this._currentRunTitle));
        }, (error) => {
            this.showError(error.message);
        });

        if (this._currentRunTitle) {
            format = Utils_String.format(Resources.RunScopedQueryTitleFormat, this._currentRunId, this._currentRunTitle);
        }
        else if (this._currentRunQuery) {
            format = Resources.RecentRuns;
        }

        this._gridInfoBar.bind(grid, format);
    }

    //Bind the info bar to the result summary
    public bindResultSummaryInfoBar(resultSummaryView, testCaseTitle) {
        this._hubTitle.empty();

        if (this._currentRunTitle) {
            //preparing title for result summary.
            let $titleelement = this._createResultSummaryTitle(testCaseTitle);
            this._createResultSummaryInfoBar(resultSummaryView, $titleelement);
        } else {
            this.setCurrentRunTitle(() => {
                //preparing title for result summary.
                let $titleelement = this._createResultSummaryTitle(testCaseTitle);
                this._createResultSummaryInfoBar(resultSummaryView, $titleelement);
            }, (error) => {
                this.showError(error.message);
            });
        }
    }

    private _createResultSummaryInfoBar(resultSummaryView: TcmResultSummary.TestResultSummaryView, title: JQuery) {
        this._resultSummaryInfoBar = <TcmResultSummary.ResultSummaryInfoBar>Controls.BaseControl.createIn(TcmResultSummary.ResultSummaryInfoBar, this._hubTitle, { tfsContext: this._tfsContext });
        this._resultSummaryInfoBar.bind(resultSummaryView, title);
    }

    public setContributionLevelTitle(testCaseTitle: string) {
        let $titleElement: JQuery;
        let $title: JQuery;
        if (this._currentRunTitle) {
            $titleElement = this._createResultSummaryTitle(testCaseTitle);
            $title = this._createTableElement($titleElement);
            this.setHubTitle($title);
        }
        else {
            this.setCurrentRunTitle(() => {
                $titleElement = this._createResultSummaryTitle(testCaseTitle);
                $title = this._createTableElement($titleElement);
                this.setHubTitle($title);
            });
        }
    }

    private _createTableElement(title: JQuery): JQuery {
        let $container = $(`<div class='query-result-grid-info' >`);
        let $titleTable = TestReportingCommon.TestResultSummaryTitleView;

        let $queryTitle: JQuery = $titleTable.find(".query-title");
        let $queryStatus: JQuery = $titleTable.find(".query-status");
        $queryTitle.empty();
        $queryStatus.empty();

        $titleTable.appendTo($container);
        $queryTitle.append(title);
        return $container;
        
    }

    private _createResultSummaryTitle(testCaseTitle: string): JQuery {
        Diag.logVerbose("[RunExplorerView.createResultSummaryTitle]: method called.");

        let params: TMUtils.IParam[] = [{
            parameter: ValueMap.RunExplorerParams.Param_runId,
            value: this._currentRunId.toString()
        }];

        let $runLink = $("<a />").text(Utils_String.format(Resources.RunScopedQueryTitleFormat, this._currentRunId, this._currentRunTitle))
            .attr("href", TMUtils.UrlHelper.getRunsUrl(ValueMap.RunExplorerViewTabs.ResultQuery, params));

        let $titleelement = $("<span />");
        $titleelement.append($runLink);

        let $resultElement = $("<span />").text(testCaseTitle);
        RichContentTooltip.add(Utils_String.format(Resources.ResultSummaryResultToolTip, testCaseTitle), $resultElement);

        $titleelement.append($runLink).append(Resources.ResultSummaryTitleSeparator).append($resultElement);

        return $titleelement;
    }

    //Create the tree toolbar
    private _createTreeToolbar($container) {
        Diag.logVerbose("[RunExplorerView._createTreeToolbar] - Called");
        let menuItems = [];

        menuItems.push({
            id: "refresh-query-explorer",
            text: Resources.RefreshTitle,
            showText: false,
            icon: "bowtie-icon bowtie-navigate-refresh"
        });

        // Creating the menu bar
        return <Menus.MenuBar>Controls.BaseControl.createIn(Menus.MenuBar, $container,
            {
                items: menuItems,
                executeAction: Utils_Core.delegate(this, this._onToolbarItemClick)
            });
    }

    private _parseRunIdFromResultId(resultId) {
        let parts: any = ("" + resultId).split(";");
        if (parts.length === 2) {
            if (parts[0] > 0) {
                return parseInt(parts[0]);
            }
        }
        return 0;
    }

    //Sets the query hierarchy in the tree
    private _ensureQueryHierarchy(context, callback, errorCallback?) {
        let that = this;
        VSS.queueRequest(this, this, "_queryHierarchiesLoaded", callback, errorCallback,
            function (succeeded, failed) {
                let queryModelsToAdd = new Array();
                queryModelsToAdd.push(ValueMap.TestQueryableItemTypes.TestResult, ValueMap.TestQueryableItemTypes.TestRun);
                queryModelsToAdd.push(ValueMap.TestQueryableItemTypes.ExploratorySession);
                
                this._queryManager.getQueryHierarchy(queryModelsToAdd, context, hierarchy => {
                    that._queryHierarchy = hierarchy;
                    that._queryTree.setHierarchy(hierarchy);
                    succeeded(true);
                }, failed);
            });
    }

    //Creates an empty state
    public _createEmptyState() {
        return {
            runId: null,
            resultId: null,
            queryPath: null,
            query: null,
            title: null
        };
    }

    private _updateCurrentResultOrder(e, resultIdentifierOrderInfo) {
        this._currentResultIdentifierOrder = resultIdentifierOrderInfo;
    }

    private _onNavigationRequested(e, navigationContext) {
        Diag.logVerbose("[RunExplorerView._onNavigationRequested] - Called");
        let state = this._createEmptyState();
        if (navigationContext) {
            let viewName = navigationContext.viewName;
            if (viewName) {
                $.extend(state, navigationContext.state);
                Diag.logVerbose(Utils_String.format("Navigating to view: {0}", navigationContext.viewName));
                Navigation_Services.getHistoryService().addHistoryPoint(viewName, state);
            }
        }
    }

    //Creates a dynamic tree node of type 'TestResult'.
    private _createDynamicTestResultTypeNode(runId, runTitle) {
        let query = this._queryHierarchy.createDefaultTestResultTypeQuery(runId, runTitle);
        query.parentId = ValueMap.TestQueryConstants.RECENT_RESULT_ROOT_QUERY_ID;
        return query;
    }

    //Updates the 'Recent test runs' tree view.
    private _updateRecentRunsTree(e, context) {
        Diag.logVerbose("[RunExplorerView._updateRecentRunsTree] - Called");
        let query = context.query;
        if (!query) {
            query = this._createDynamicTestResultTypeNode(context.runId, context.runTitle);
        }
        let index = this._listContainsId(this._recentRuns, query.id);

        if (index > 0) {
            let selectedQuery = this._recentRuns[index];
            for (let i = index; i > 0; i--) {
                this._recentRuns[i] = this._recentRuns[i - 1];
            }
            this._recentRuns[0] = selectedQuery;
        }
        else if (index < 0) {
            if (this._recentRuns.length < ValueMap.TestQueryConstants.NUMBER_OF_RECENT_RUNS) {
                this._recentRuns.unshift(query);
            }
            else {
                this._recentRuns.pop();
                this._recentRuns.unshift(query);
            }
        }
        this._refreshQueries(false);
    }

    private _listContainsId(list, id): any {
        for (let i = 0; i < list.length; i++) {
            if (list[i].id == id) {
                return i;
            }
        }
        return -1;
    }

    private _onSelectedRunsTreeItemChanged(e?, selectedItemInfo?) {
        Diag.logVerbose("[RunExplorerView._onSelectedRunsTreeItemChanged] - Called");
        let query,
            viewName = this._currentView && this._currentView.name,
            //state = this._createEmptyState();
            state = {};

        if (selectedItemInfo.isQuery) {
            if (selectedItemInfo.itemType === ValueMap.TestQueryableItemTypes.TestRun) {
                // Following scenarios are covered in this block
                // 1. Clicking Recent Run link
                // 2. Refresh of page
                if (this._currentView &&
                    (Utils_String.equals(this._currentView.name, ValueMap.RunExplorerViewTabs.RunQuery, true) ||
                        Utils_String.equals(this._currentView.name, ValueMap.RunExplorerViewTabs.RunQueryEditor, true))) {
                    // It's a refresh scenario
                    viewName = this._currentView.name;
                } else {
                    // It's clicking on Recent runs scenario
                    viewName = ValueMap.RunExplorerViewTabs.RunQuery;
                }
            }
            // View Exploratory Session 
            else if (selectedItemInfo.itemType === ValueMap.TestQueryableItemTypes.ExploratorySession) {
                viewName = ValueMap.RunExplorerViewTabs.ExploratorySession;
                // TODO will add addition information reagarding default filters and setting once registry work is done
                TelemetryService.publishEvent(TelemetryService.featureRecentExploratorySessionsClicked, TelemetryService.eventClicked, viewName);
            }
            //'Recent test runs' tree node
            else {
                //'Recent runs' child nodes
                //Default view
                viewName = ValueMap.RunExplorerViewTabs.RunCharts;

                //If current view is either run charts view or results query view or result query editor, then retain the view.
                if (this._currentView) {
                    if (this._currentView.name == ValueMap.RunExplorerViewTabs.RunCharts || this._currentView.name == ValueMap.RunExplorerViewTabs.ResultQuery ||
                        this._currentView.name == ValueMap.RunExplorerViewTabs.ResultQueryEditor) {
                        viewName = this._currentView.name;
                    }
                }
                if (selectedItemInfo.data) {
                    state["runId"] = parseInt(selectedItemInfo.data.id);
                }
            }
            Diag.logVerbose(Utils_String.format("Current View = {0}, State = {1}", viewName, state));
            Navigation_Services.getHistoryService().addHistoryPoint(viewName, state);
        }
    }

    private _onToolbarItemClick(e?) {
        let command = e.get_commandName(), args = e.get_commandArgument(), that = this;

        switch (command) {
            case "refresh-query-explorer":
                this._refreshQueries(true);
                return false;
        }
    }

    private _refreshQueries(refreshViewNeeded: boolean) {
        Diag.logVerbose("[RunExplorerView._refreshQueries] - Called");
        let that = this, hierarchy = this._queryHierarchy;

        function refresh(refreshViewNeeded: boolean) {
            hierarchy.beginRefresh(that._recentRuns, function () {
                that._queryTree.setHierarchy(hierarchy);
                if (refreshViewNeeded) {
                    that.refreshView();
                }
                if (that._recentRuns && that._recentRuns.length > 0) {
                    that._queryTree.setSelectedNodeById(that._recentRuns[0].id);
                }
            });
        }
        refresh(refreshViewNeeded);
    }

    public getCurrentRunQuery() {
        Diag.logTracePoint("[RunExplorerView.getCurrentRunQuery]: method called");
        // If CurrentRunQuery is null, then set it to RecentRunsQuery
        if (this._currentRunQuery == null) {
            this._currentRunQuery = this._queryHierarchy.findQueryById(ValueMap.TestQueryConstants.RECENT_RUNS_QUERY_ID);
            if (this._currentRunQuery == null) {
                this.showError(Resources.ErrorNotFound);
            }
        }
        return this._currentRunQuery;
    }

    public getCurrentResultQuery() {
        if (null == this._currentRunQuery) {
            this._currentResultQuery = this._createDynamicTestResultTypeNode(this._currentRunId, this._currentRunTitle);
            if (this._currentResultQuery == null) {
                this.showError(Resources.ErrorNotFound);
            }
        }
        return this._currentResultQuery;
    }

    public getCurrentResultId() {
        return this._currentResultId;
    }

    public getCurrentRunId() {
        return this._currentRunId;
    }

    public getLeftPaneOM(): ILeftPaneOM {
        return {
            queryTree: this._queryTree,
            queryHierarchy: this._queryHierarchy
        };
    }

    public updateLeftPaneAndTitle(runTitle?: string) {
        Diag.logVerbose("[RunExplorerView.updateLeftPane]: method called");
        if (this._currentRunId) {
            let id = this._currentRunId;
            this._currentRunTitle = runTitle;
            // Find resultQuery based on id
            this._currentResultQuery = this._queryHierarchy.findQueryById(id);
            if (this._currentResultQuery) {
                this._queryTree.setSelectedNodeById(this._currentResultQuery.id);
            } else {
                // If result query is not found then create new node
                this._currentResultQuery = this._createDynamicTestResultTypeNode(this._currentRunId, this._currentRunTitle);
                this._fire("RecentRunsUpdated", { query: this._currentResultQuery });
            }
        }

        if (this._currentResultQuery == null) {
            // No result query associate with this runId
            this.showError(Resources.ErrorNotFound);
        }
    }

    private setCurrentRunTitle(successCallBack?: IResultCallback, errorCallback?: IErrorCallback) {
        Diag.logVerbose("[RunExplorerView.setCurrentRunTitle]: method called");
        // Run Title can be set if RunId is present
        if (this._currentRunId) {
            Diag.logInfo("[RunExplorerView.setCurrentRunTitle]: setting title for runId:" + this._currentRunId);

            TcmService.ServiceManager.instance().testResultsService().getTestRunById(this._currentRunId).then((testRun: TCMContracts.TestRun) => {
                this._currentRunTitle = testRun.name;
                Diag.logInfo(Utils_String.format("[RunExplorerView.setCurrentRunTitle]: title set to: {0}", this._currentRunTitle));
                if (successCallBack) {
                    successCallBack();
                }
            }, (error) => {
                Diag.logError("[RunExplorerView.setCurrentRunTitle]:No datarows while fetching Title for RunId: " + this._currentRunId);
                this.showError(Resources.TestRunNotFoundError);
                if (errorCallback) {
                    errorCallback(error);
                }
            });
        } else {
            this._currentRunTitle = Utils_String.empty;
            Diag.logInfo("[RunExplorerView.setCurrentRunTitle]: current runId not set.");
        }
    }

    public getCurrentResultOrder(): any {
        return this._getResultOrderFromIdentiferOrder(this._currentResultIdentifierOrder);
    }

    private getQueryForTestRunTitle(runId: number): any {
        let query: any = null;
        if (this._currentRunId) {
            query = this._queryHierarchy.findQueryById(ValueMap.TestQueryConstants.RUNS_TITLE_QUERY_ID);
            if (query) {
                query.filter.clauses[0].value = runId; // Assigning runId in the query to fetch related data
            }
        }
        return query;
    }
}

VSS.initClassPrototype(RunExplorerView, {
    _hubTitle: null,
    _queryTree: null,
    _treeToolbar: null,
    _queryHierarchy: null,
    _gridInfoBar: null,
    _currentRun: null,
    _currentRunId: 0,
    _currentRunQuery: null,
    _currentResultId: null,
    _currentResult: null,
    _currentResultQuery: null,
    _queryManager: null,
    _tfsContext: null,
    _hubContent: null,
    _tabsControl: null,
    _views: null,
    _defaultView: null,
    _currentView: null,
    _previousView: null,
    _lastViewBeforeResultSummary: null,
    _errorView: null,
    _currentState: null,
    _currentNavigationContextId: 0
});

export interface IViewWrapper {
    name: string;
    initializeView(explorerView: RunExplorerView, $container: JQuery, previousView?: IViewWrapper): void;
    setState(explorerView: RunExplorerView): void;
    getEnabledState(): boolean;
    setStateEnabled(isEnabled: boolean): void;
    show(): void;
    hide(): void;
    isContributedView?: () => boolean;
}

export interface IViews {
    resultQueryViewWrapper: ResultQueryViewWrapper;
    resultQueryViewEditorWrapper: ResultQueryViewEditorWrapper;
    runQueryViewWrapper: RunQueryViewWrapper;
    runQueryViewEditorWrapper: RunQueryViewEditorWrapper;
    runSummaryViewWrapper: RunSummaryViewWrapper;
    resultSummaryViewWrapper: ResultSummaryViewWrapper;
    resultHistoryViewWrapper: ResultHistoryViewWrapper.ResultHistoryViewWrapper;
    exploratorySessionViewWrapper: ExploratorySessionView.ExploratorySessionViewWrapper;
    contributedViews?: IDictionaryStringTo<ContributedTabsWrapper>;
}

export interface ILeftPaneOM {
    queryTree: QueryControls.QueryExplorerTree;
    queryHierarchy: TFSOMQueries.QueryHierarchy;
}

export class TestRunShortcutGroup extends ShortcutGroupDefinition {

    constructor(private view: any) {
        super(Resources.TestRunsShortcutGroupName);
        this.shortcutManager.removeShortcutGroup(Resources.RunSummaryShortcutGroupName);
        this.registerPageNavigationShortcut(
            "1",
            {
                description: Resources.TestRunsShortcutText,
                action: () => this.navigateToUrl(TMUtils.UrlHelper.getRunsUrl("runQuery", [])),
                allowPropagation: true
            });
        this.registerPageNavigationShortcut(
            "2",
            {
                description: Resources.FilterShortcutText,
                action: () => this.navigateToUrl(TMUtils.UrlHelper.getRunsUrl("runQueryEditor", [])),
                allowPropagation: true
            });
    }
}
export class ResultQueryViewWrapper implements IViewWrapper {
    private isEnabled: boolean;
    private $container: JQuery;
    private currentResultQuery: any;
    private triageView: QueryControls.QueryResultsView;
    public name: string;

	public constructor() {
        this.name = ValueMap.RunExplorerViewTabs.ResultQuery;
    }

    public initializeView(explorerView: RunExplorerView, $parentContainer: JQuery): void {
        Diag.logTracePoint("[ResultQueryViewWrapper.initializeView]: method called");
        // Set/Create div container
        this.setContainer($parentContainer);
        // Instantiate view object
        this.triageView = <QueryControls.QueryResultsView>Controls.BaseControl.createIn(QueryControls.QueryResultsView, this.$container, {
            resultsGridType: QueryControls.QueryResultsGrid,
            resultId: explorerView.getCurrentResultId(),
            runId: explorerView.getCurrentRunId(),
        });

        try {
            TelemetryService.publishEvent(TelemetryService.featureTestResultsQueryList, TelemetryService.eventPageLoad, 1);
        }
        catch (e) {
            Diag.logError(Utils_String.format("[ResultQueryViewWrapper.initializeView]: Error in logging Customer Intelligence data. Error: {0}", e.message));
        }
    }

    public setState(explorerView: RunExplorerView): void {
        Diag.logTracePoint("[ResultQueryViewWrapper.setState]: method called");
        this.currentResultQuery = explorerView.getCurrentResultQuery();
        this.triageView.setQuery(this.currentResultQuery);
        explorerView.bindGridInfoBar(this.triageView.getGrid());
    }

    public getEnabledState(): boolean {
        Diag.logTracePoint("[ResultQueryViewWrapper.getEnabledState]: method called");
        return this.isEnabled;
    }

    public setStateEnabled(isEnabled: boolean): void {
        this.isEnabled = isEnabled;
    }

    public show() {
        if (this.$container) {
            this.$container.show();
        }
    }

    public hide() {
        if (this.$container) {
            this.$container.hide();
        }
    }

    private setContainer($parentContainer: JQuery): JQuery {
        Diag.logTracePoint("[ResultQueryViewWrapper.setContainer]: method called");

        if (this.$container == null) {
            this.$container = $("<div />").addClass("viewContainer").appendTo($parentContainer);
        }
        this.$container.empty();
        return this.$container;
    }
}

VSS.initClassPrototype(ResultQueryViewWrapper, {
    isEnabled: false,
    name: ValueMap.RunExplorerViewTabs.ResultQuery,
    triageView: null,
    currentResultQuery: null
});

export class ResultQueryViewEditorWrapper implements IViewWrapper {
    private isEnabled: boolean;
    private $container: JQuery;
    private currentResultQuery: any;
    private triageView: QueryControls.QueryEditor;
    public name: string;

    public constructor() {
        this.name = ValueMap.RunExplorerViewTabs.ResultQueryEditor;
    }

    public initializeView(explorerView: RunExplorerView, $parentContainer: JQuery): void {
        Diag.logTracePoint("[ResultQueryViewWrapper.initializeView]: method called");
        // Set/Create div container
        this.setContainer($parentContainer);
        // Instantiate view object
        this.triageView = <QueryControls.QueryEditor>Controls.BaseControl.createIn(QueryControls.QueryEditor, this.$container, {
            resultsGridType: QueryControls.QueryResultsGrid,
            resultId: explorerView.getCurrentResultId(),
            runId: explorerView.getCurrentRunId(),
            name: this.name
        });

        try {
            TelemetryService.publishEvent(TelemetryService.featureTestResultsQueryEditor, TelemetryService.eventPageLoad, 1);
        }
        catch (e) {
            Diag.logError(Utils_String.format("[ResultQueryViewEditorWrapper.initializeView]: Error in logging Customer Intelligence data. Error: {0}", e.message));
        }
    }

    public setState(explorerView: RunExplorerView): void {
        Diag.logTracePoint("[ResultQueryViewWrapper.setState]: method called");
        this.currentResultQuery = explorerView.getCurrentResultQuery();
        this.triageView.setQuery(this.currentResultQuery);
        explorerView.bindGridInfoBar(this.triageView.getGrid());
    }

    public getEnabledState(): boolean {
        Diag.logTracePoint("[ResultQueryViewWrapper.getEnabledState]: method called");
        return this.isEnabled;
    }

    public setStateEnabled(isEnabled: boolean): void {
        this.isEnabled = isEnabled;
    }

    public show() {
        if (this.$container) {
            this.$container.show();
        }
    }

    public hide() {
        if (this.$container) {
            this.$container.hide();
        }
    }

    private setContainer($parentContainer: JQuery): JQuery {
        Diag.logTracePoint("[ResultQueryViewWrapper.setContainer]: method called");

        if (this.$container == null) {
            this.$container = $("<div />").addClass("viewContainer").appendTo($parentContainer);
        }
        this.$container.empty();
        return this.$container;
    }
}

VSS.initClassPrototype(ResultQueryViewEditorWrapper, {
    isEnabled: false,
    name: ValueMap.RunExplorerViewTabs.ResultQueryEditor,
    triageView: null,
    currentResultQuery: null
});

export class RunQueryViewWrapper implements IViewWrapper {
    private isEnabled: boolean;
    private $container: JQuery;
    private triageView: QueryControls.QueryRunView;
    private currentQuery: any;

    public name: string;

    public constructor() {
        this.name = ValueMap.RunExplorerViewTabs.RunQuery;
    }

    public initializeView(explorerView: RunExplorerView, $parentContainer: JQuery): void {
        Diag.logTracePoint("[RunQueryViewWrapper.initializeView]: method called");
        // Set/Create div container
        this.setContainer($parentContainer);
        // Instantiate view object
        this.triageView = <QueryControls.QueryRunView>Controls.BaseControl.createIn(QueryControls.QueryRunView, this.$container, {
            resultsGridType: QueryControls.QueryRunsGrid,
            resultId: explorerView.getCurrentResultId()
        });

        try {
            TelemetryService.publishEvent(TelemetryService.featureTestRunsQueryList, TelemetryService.eventPageLoad, 1);
        }
        catch (e) {
            Diag.logError(Utils_String.format("[RunQueryViewWrapper.initializeView]: Error in logging Customer Intelligence data. Error: {0}", e.message));
        }
    }

    public setState(explorerView: RunExplorerView): void {
        Diag.logTracePoint("[RunQueryViewWrapper.setState]: method called");
        let leftPaneOm = explorerView.getLeftPaneOM();
        this.currentQuery = explorerView.getCurrentRunQuery();
        this.triageView.setQuery(this.currentQuery);
        leftPaneOm.queryTree.setSelectedNodeByType(ValueMap.TestQueryableItemTypes.TestRun, this.currentQuery, true);
        explorerView.bindGridInfoBar(this.triageView.getGrid());
    }

    public getEnabledState(): boolean {
        Diag.logTracePoint("[RunQueryViewWrapper.getEnabledState]: method called");
        return this.isEnabled;
    }

    public setStateEnabled(isEnabled: boolean): void {
        this.isEnabled = isEnabled;
    }

    public show() {
        if (this.$container) {
            this.$container.show();
        }
    }

    public hide() {
        if (this.$container) {
            this.$container.hide();
        }
    }

    private setContainer($parentContainer: JQuery): JQuery {
        Diag.logTracePoint("[ResultQueryViewWrapper.setContainer]: method called");

        if (this.$container == null) {
            this.$container = $("<div />").addClass("viewContainer").appendTo($parentContainer);
        }
        this.$container.empty();
        return this.$container;
    }
}

VSS.initClassPrototype(RunQueryViewWrapper, {
    isEnabled: false,
    name: ValueMap.RunExplorerViewTabs.RunQuery,
    triageView: null,
    currentResultQuery: null
});

export class RunQueryViewEditorWrapper implements IViewWrapper {
    private isEnabled: boolean;
    private $container: JQuery;
    private triageView: QueryControls.QueryEditor;
    private currentQuery: any;

    public name: string;

    public constructor() {
        this.name = ValueMap.RunExplorerViewTabs.RunQueryEditor;
    }

    public initializeView(explorerView: RunExplorerView, $parentContainer: JQuery): void {
        Diag.logTracePoint("[RunQueryViewEditorWrapper.initializeView]: method called");
        // Set/Create div container
        this.setContainer($parentContainer);
        // Instantiate view object
        this.triageView = <QueryControls.QueryEditor>Controls.BaseControl.createIn(QueryControls.QueryEditor, this.$container, {
            resultsGridType: QueryControls.QueryRunsGrid,
            name: this.name
        });

        try {
            TelemetryService.publishEvent(TelemetryService.featureTestRunsQueryEditor, TelemetryService.eventPageLoad, 1);
        }
        catch (e) {
            Diag.logError(Utils_String.format("[RunQueryViewEditorWrapper.initializeView]: Error in logging Customer Intelligence data. Error: {0}", e.message));
        }
    }

    public setState(explorerView: RunExplorerView): void {
        Diag.logTracePoint("[RunQueryViewEditorWrapper.setState]: method called");
        let leftPaneOM = explorerView.getLeftPaneOM();
        this.currentQuery = explorerView.getCurrentRunQuery();
        this.triageView.setQuery(this.currentQuery);
        leftPaneOM.queryTree.setSelectedNodeByType(ValueMap.TestQueryableItemTypes.TestRun, this.currentQuery, true);
        explorerView.bindGridInfoBar(this.triageView.getGrid());
    }

    public getEnabledState(): boolean {
        Diag.logTracePoint("[RunQueryViewEditorWrapper.getEnabledState]: method called");
        return this.isEnabled;
    }

    public setStateEnabled(isEnabled: boolean): void {
        this.isEnabled = isEnabled;
    }

    public show() {
        if (this.$container) {
            this.$container.show();
        }
    }

    public hide() {
        if (this.$container) {
            this.$container.hide();
        }
    }

    private setContainer($parentContainer: JQuery): JQuery {
        Diag.logTracePoint("[ResultQueryViewWrapper.setContainer]: method called");

        if (this.$container == null) {
            this.$container = $("<div />").addClass("viewContainer").appendTo($parentContainer);
        }
        this.$container.empty();
        return this.$container;
    }
}

VSS.initClassPrototype(RunQueryViewEditorWrapper, {
    isEnabled: false,
    name: ValueMap.RunExplorerViewTabs.RunQueryEditor,
    triageView: null,
    currentResultQuery: null
});

export class RunSummaryViewWrapper implements IViewWrapper {
    private isEnabled: boolean;
    private $container: JQuery;
    private currentQuery: any;
    private triageView: TestRunSummaryControl.TestRunSummaryView;

    public name: string;

    public constructor() {
        this.name = ValueMap.RunExplorerViewTabs.RunCharts;
    }

    public initializeView(explorerView: RunExplorerView, $parentContainer: JQuery): void {
        Diag.logTracePoint("[RunSummaryViewWrapper.initializeView]: method called");
        // Set/Create div container
        this.setContainer($parentContainer);
        // Instantiate view object
        this.triageView = <TestRunSummaryControl.TestRunSummaryView>Controls.BaseControl.createIn(TestRunSummaryControl.TestRunSummaryView, this.$container, {
            runId: explorerView.getCurrentRunId(),
            updateLeftPaneAndTitleFunc: Utils_Core.delegate(explorerView, explorerView.updateLeftPaneAndTitle)
        });

        try {
            TelemetryService.publishEvent(TelemetryService.featureTestRunSummary, TelemetryService.eventPageLoad, 1);
        }
        catch (e) {
            Diag.logError(Utils_String.format("[RunSummaryViewWrapper.initializeView]: Error in logging Customer Intelligence data. Error: {0}", e.message));
        }
    }

    public setState(explorerView: RunExplorerView): void {
        Diag.logTracePoint("[RunSummaryViewWrapper.setState]: method called");
        this.currentQuery = explorerView.getCurrentResultQuery();
        this.triageView.setQuery(this.currentQuery);
        explorerView.bindGridInfoBar(this.triageView);
    }

    public getEnabledState(): boolean {
        Diag.logTracePoint("[RunSummaryViewWrapper.getEnabledState]: method called");
        return this.isEnabled;
    }

    public setStateEnabled(isEnabled: boolean): void {
        this.isEnabled = isEnabled;
    }

    public show() {
        if (this.$container) {
            this.$container.show();
        }
    }

    public hide() {
        if (this.$container) {
            this.$container.hide();
        }
    }

    private setContainer($parentContainer: JQuery): JQuery {
        Diag.logTracePoint("[ResultQueryViewWrapper.setContainer]: method called");

        if (this.$container == null) {
            this.$container = $("<div />").addClass("viewContainer").appendTo($parentContainer);
        }
        this.$container.empty();
        return this.$container;
    }
}

VSS.initClassPrototype(RunSummaryViewWrapper, {
    isEnabled: false,
    name: ValueMap.RunExplorerViewTabs.RunCharts,
    triageView: null,
    currentResultQuery: null
});

export class ResultSummaryViewWrapper implements IViewWrapper {
    private isEnabled: boolean;
    private $container: JQuery;
    private triageView: TcmResultSummary.TestResultSummaryView;

    public name: string;

    public constructor() {
        this.name = ValueMap.RunExplorerViewTabs.ResultSummary;
    }

    public initializeView(explorerView: RunExplorerView, $parentContainer: JQuery, previousView: IViewWrapper): void {
        Diag.logTracePoint("[ResultSummaryViewWrapper.initializeView]: method called");
        // Set/Create div container
        this.setContainer($parentContainer);
        // Instantiate view object
        this.triageView = <TcmResultSummary.TestResultSummaryView>Controls.BaseControl.createIn(TcmResultSummary.TestResultSummaryView, this.$container, {
            showTitle: false,
            viewToNavigateBack: previousView
        });

        try {
            TelemetryService.publishEvent(TelemetryService.featureTestResultSummary, TelemetryService.eventPageLoad, 1);
        }
        catch (e) {
            Diag.logError(Utils_String.format("[ResultSummaryViewWrapper.initializeView]: Error in logging Customer Intelligence data. Error: {0}", e.message));
        }
    }

    public setState(explorerView: RunExplorerView): void {
        Diag.logTracePoint("[ResultSummaryViewWrapper.setState]: method called");
        this.triageView.setResult(explorerView.getCurrentRunId(), explorerView.getCurrentResultId(), explorerView.getCurrentResultOrder(), (testCaseTitle) => {
            explorerView.bindResultSummaryInfoBar(this.triageView, testCaseTitle);
        }, (error) => {
            explorerView.showError(error.message);
            });
    }

    public getEnabledState(): boolean {
        Diag.logTracePoint("[ResultSummaryViewWrapper.getEnabledState]: method called");
        return this.isEnabled;
    }

    public setStateEnabled(isEnabled: boolean): void {
        this.isEnabled = isEnabled;
    }

    public show() {
        if (this.$container) {
            this.$container.show();
        }
    }

    public hide() {
        if (this.$container) {
            this.$container.hide();
        }
    }

    private setContainer($parentContainer: JQuery): JQuery {
        Diag.logTracePoint("[ResultQueryViewWrapper.setContainer]: method called");

        if (this.$container == null) {
            this.$container = $("<div />").addClass("viewContainer").appendTo($parentContainer);
        }
        this.$container.empty();
        return this.$container;
    }
}

VSS.initClassPrototype(ResultSummaryViewWrapper, {
    isEnabled: false,
    name: ValueMap.RunExplorerViewTabs.ResultSummary,
    triageView: null,
    currentResultQuery: null
});



export class ErrorViewWrapper implements IViewWrapper {
    private _$errorDiv: JQuery;
    private _isEnabled: boolean;
    public name: string;

    public constructor() {
        this.name = ValueMap.RunExplorerViewTabs.Error;
    }

    public initializeView(explorerView: RunExplorerView, $container: JQuery): void {
        Diag.logVerbose("[ErrorViewWrapper.initializeView]: method called.");
        this._$errorDiv = $("<div />").addClass("inline-error").appendTo($container);
    }

    public setErrorText(text: string): void {
        Diag.logVerbose("[ErrorViewWrapper.setErrorText]: method called.");
        this._$errorDiv.text(text);
    }

    public setState(explorerView: RunExplorerView) {
        // Nothing to be implemented here
    }

    public getEnabledState() {
        return this._isEnabled;
    }

    public setStateEnabled(isEnabled: boolean) {
        this._isEnabled = isEnabled;
    }

    public show() {
        this._$errorDiv.show();
    }

    public hide() {
        this._$errorDiv.hide();
    }
}

VSS.initClassPrototype(ErrorViewWrapper, {
    isEnabled: false,
    name: ValueMap.RunExplorerViewTabs.Error
});

export class ContributedTabsWrapper implements IViewWrapper {
    public name: string;
    
    public constructor(tabItem: Navigation.IPivotViewItem) {
        this._tabItem = tabItem;
        this.name = tabItem.text;
    }

    public initializeView(explorerView: RunExplorerView, $parentContainer: JQuery): void {
        Diag.logTracePoint("[ContributedTabsWrapper.initializeView]: method called");
        
        if (!ContributedTabsWrapper._tabDictionary || !ContributedTabsWrapper._tabDictionary[this._tabItem.id]) {
            this.setContainer($parentContainer);
            this.settabDictionary(this._tabItem.id, true);
            PivotTabsContributionProvider.getContributedExtensionHost(this._container, this._tabItem.id);
        }
    }

    public setState(explorerView: RunExplorerView): void {
        let data: DataStore = new DataStore(explorerView.getCurrentResultId(), explorerView.getCurrentRunId());
        Q.all([data.getResultData()]).then((response: any[]) => {
            let testCaseResult: TCMContracts.TestCaseResult = response[0];
            let testCaseTitle: string = testCaseResult.testCaseTitle;
            explorerView.setContributionLevelTitle(testCaseTitle);
        });
    }

    public getEnabledState(): boolean {
        return this._isEnabled;
    }

    public setStateEnabled(isEnabled: boolean): void {
        this._isEnabled = true;
    }

    public show(): void {
        if (this._container) {
            this._container.show();
        }
    }

    public hide(): void {
        if (this._container) {
            this._container.hide();
        }
    }

    public settabDictionary(id: string, val: boolean) {
        ContributedTabsWrapper._tabDictionary[id] = val;
    }

    public static clearContributedTabDictionary(): void {
        ContributedTabsWrapper._tabDictionary = {};
    }
    
    public isContributedView(): boolean {
        return true;
    }

    private setContainer($parentContainer: JQuery): JQuery {
        Diag.logTracePoint("[ContributedTabsWrapper.setContainer]: method called");

        if (!this._container) {
            this._container = $("<div />").addClass("viewContainer").appendTo($parentContainer);
        }
        this._container.empty();
        return this._container;
    }

    public getContainer(): JQuery{
        return this._container;
    }


    private _tab: any;
    private static _tabDictionary: IDictionaryStringTo<boolean> = {};
    private _tabItem: Navigation.IPivotViewItem;
    private _isEnabled: boolean;
    private _container: JQuery;
}

export class DataStore {
    private static result: IPromise<TCMContracts.TestCaseResult>;
    private _resultId: number;
    private _runId: number;

    public constructor(resultVal: number, runVal: number) {
        this._resultId = resultVal;
        this._runId = runVal;
    } 

    public getResultData(): IPromise<TCMContracts.TestCaseResult> {
        if (!DataStore.result) {
            DataStore.result = TMUtils.getTestResultManager().beginGetTestCaseResultById(this._runId, this._resultId);
        }
        return DataStore.result;
    }

    public static clearResultData() {
        DataStore.result = null;
    }
}

Controls.Enhancement.registerEnhancement(RunExplorerView, ".testmanagement-runexplorer-view");

// TFS plugin model requires this call for each tfs module.
VSS.tfsModuleLoaded("TFS.TestManagement.RunsView.RunExplorer.View", exports);
