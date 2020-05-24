/*
* ---------------------------------------------------------
* Copyright(C) Microsoft Corporation. All rights reserved.
* ---------------------------------------------------------
*/

import SessionViewModel = require("TestManagement/Scripts/TestReporting/ExploratorySession/ViewModel");
import WorkItemDataProvider = require("TestManagement/Scripts/TestReporting/DataProviders/WorkItem.DataProvider");
import QueryScalar = require("Widgets/Scripts/QueryScalar");
import UserSettings = require("TestManagement/Scripts/TestReporting/ExploratorySession/UserSettings");
import SessionChart = require("TestManagement/Scripts/TestReporting/ExploratorySession/Charts");
import ResultViewModel = require("TestManagement/Scripts/TestReporting/ExploratorySession/ResultsViewModel");
import * as TCMCommonBase from "TestManagement/Scripts/TestReporting/Common/Common";
import TCMCommon = require("TestManagement/Scripts/TestReporting/TestTabExtension/Common");
import ManualUtils = require("TestManagement/Scripts/TestReporting/ExploratorySession/Utils");
import Common = require("TestManagement/Scripts/TestReporting/ExploratorySession/Common");
import Control = require("TestManagement/Scripts/TestReporting/ExploratorySession/Control");
import SessionDetail = require("TestManagement/Scripts/TestReporting/ExploratorySession/Detail");
import Navigation = require("VSS/Controls/Navigation");
import MessageArea = require("TestManagement/Scripts/TFS.TestManagement.MessageArea");
import TCMTelemetry = require("TestManagement/Scripts/TFS.TestManagement.Telemetry");
import Resources = require("TestManagement/Scripts/Resources/Tfs.Resources.TestManagement");
import QueryView = require("TestManagement/Scripts/TestReporting/ExploratorySession/QueryDialogView");
import {
    mountBreadcrumb, IProps
} from "TestManagement/Scripts/TestReporting/ExploratorySession/Components/TeamFilterComponent";
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import Dialogs = require("VSS/Controls/Dialogs");
import Splitter = require("VSS/Controls/Splitter");
import Utils_Core = require("VSS/Utils/Core");
import TCMContracts = require("TFS/TestManagement/Contracts");
import Controls = require("VSS/Controls");
import VSS = require("VSS/VSS");
import Diag = require("VSS/Diag");
import Contracts = require("TFS/TestManagement/Contracts");
import Utils_String = require("VSS/Utils/String");
import * as Service from "VSS/Service";
import { WebPageDataService } from "VSS/Contributions/Services";

let SettingsConstant = UserSettings.ExploratorySessionUserSettingsConstant;
let getErrorMessage = VSS.getErrorMessage;
let FilterSelectors = Common.FilterSelectors;
let delegate = Utils_Core.delegate;
let TelemetryService = TCMTelemetry.TelemetryService;

export interface IViewContextHandler {
    sourceCallback(data: any, subData: any): void;
}

export class ExploratorySessionTabView extends Controls.BaseControl {

    public selectedQuery: QueryScalar.IQueryInformation;

    private _exploratorySessionCharts: SessionChart.ExploratorySessionCharts;
    private _layout: JQuery;
    private _leftPane: JQuery;
    private _rightPane: JQuery;
    private _sessionViewModel: SessionViewModel.ExploratorySessionViewModel;
    private _resultViewModel: ResultViewModel.ResultsViewModel;
    private _viewContextHandler: IViewContextHandler;
    private _splitter: Splitter.Splitter;
    private _toolbar: Control.Toolbar;
    private _groupBy: Control.GroupBy;
    private _filterBy: Control.FilterBy;
    private _sessionDetail: SessionDetail.SessionDetailView;
    private _bodySection: JQuery;
    private _disposalManager: Utils_Core.DisposalManager = new Utils_Core.DisposalManager();
    private _showNoSessionView: (message: string) => void;
    private _initializeContainerForSessionView: () => void;
    private _ownerFilter: Navigation.PivotFilter;
    private _querySelectorFilter: Navigation.PivotFilter;
    private _periodFilter: Navigation.PivotFilter;
    private _selectedPeriodFilter: number;
    private _selectedOwnerFilter: boolean;
    private _selectedTeamFilter: string;
    private _defaultSessionPeriodInDays: number = 7;
    private _fullscreen: Control.FullScreenToggle;
    private _detailsPaneToggle: Control.DetailsPaneToggle;
    private _errorSection: MessageArea.MessageAreaView;
    private _sessionListMessageArea: MessageArea.MessageAreaView;
    private _clickedOwnerOption: string = null;
    private _clickedPeriodOption: string = null;
    private _clickedQueryOption: string = null;
    private _dialogBox: QueryView.QueryDialogView;
    private _queryPivotFilterItem: Navigation.IPivotFilterItem;
    private readonly teamsDataProviderId: string = "ms.vss-test-web.test-teams-data-provider";

    constructor(options?) {
        super(<any>$.extend({
            cssClass: "exploratory-session-view",
            showTitle: true
        }, options));
    }

    public initializeOptions(options: any) {
        super.initializeOptions(options);
        this._showNoSessionView = options.noSessionViewCallBack;
        this._initializeContainerForSessionView = options.sessionContainerInitializeCallBack;
    }

    public initialize() {
        super.initialize();

        this._updateUserSettings();
        this._resultViewModel = new ResultViewModel.ResultsViewModel();
        this._sessionViewModel = new SessionViewModel.ExploratorySessionViewModel(this._resultViewModel);
        this._createLayout();
        this._populateSections();
        this._setSessionListMessageArea();
        this.applySettings();
        this._loadSessionData(this._selectedTeamFilter,
            this._periodFilter.getSelectedItem().value,
            this._ownerFilter.getSelectedItem().value === "all",
            this.selectedQuery ? this.selectedQuery.queryId : null);
    }

    public dispose(): void {

        // dispose elements
        this._leftPane = null;
        this._rightPane = null;
        this._layout = null;
        this._bodySection = null;
        this._queryPivotFilterItem = null;

        // dispose controls
        if (this._exploratorySessionCharts) {
            this._exploratorySessionCharts.dispose();
            this._exploratorySessionCharts = null;
        }
        if (this._errorSection) {
            this._errorSection.dispose();
            this._errorSection = null;
        }
        if (this._splitter) {
            this._splitter.dispose();
            this._splitter = null;
        }
        if (this._toolbar) {
            this._toolbar.dispose();
            this._toolbar = null;
        }
        if (this._groupBy) {
            this._groupBy.dispose();
            this._groupBy = null;
        }
        if (this._filterBy) {
            this._filterBy.dispose();
            this._filterBy = null;
        }
        if (this._detailsPaneToggle) {
            this._detailsPaneToggle.dispose();
            this._detailsPaneToggle = null;
        }
        if (this._fullscreen) {
            this._fullscreen.dispose();
            this._fullscreen = null;
        }
        if (this._sessionListMessageArea) {
            this._sessionListMessageArea.dispose();
            this._sessionListMessageArea = null;
        }
        if (this._sessionDetail) {
            this._sessionDetail.dispose();
            this._sessionDetail = null;
        }
        if (this._ownerFilter) {
            this._ownerFilter._unbind("changed");
        }
        if (this._periodFilter) {
            this._periodFilter._unbind("changed");
        }
        if (this._querySelectorFilter) {
            this._querySelectorFilter._unbind("changed");
        }
        if (this._dialogBox) {
            this._dialogBox.dispose();
        }

        // dispose subscribed objects
        if (this._disposalManager) {
            this._disposalManager.dispose();
        }

        // dispose delegates
        if (this._showNoSessionView) {
            this._showNoSessionView = null;
        }
        if (this._initializeContainerForSessionView) {
            this._initializeContainerForSessionView = null;
        }

        super.dispose();
    }

    public applySettings() {
        this._detailsPaneToggle.applySettings();
        this._sessionDetail.applySettings();
    }

    private _updateUserSettings() {
        let userSettings = Utils_Core.parseJsonIsland($(document), ".__exploratorySessionUserSettings", true);
        if (userSettings) {
            UserSettings.ExploratorySessionUserSettings.getInstance().setUserSettings(userSettings);
        }
    }

    private _createLayout() {
        Diag.logVerbose("Creating  exploratory session insights page layout");

        this._layout = $(
            `<div class='exploratory-sessions-layout fixed-section' >
                <div class='message-area-part' />
                <div class='exploratory-sessions-details-part fixed-section' >
                    <div class='head-section' tabindex='0' >
                        <div class='exploratory-sessions-summary-charts-section' />
                    </div>
                    <div class='exploratory-session-spillter'>
                </div>
                </div>
            </div>`
        );

        this._leftPane = $(
            `<div class='controls-section' >
                <div class='left-section left'>
                    <div class='toolbar-section left' />
                </div>
                <div class='right-section right' >
                    <div class='groupby-section left' />
                    <div class='filters-section left' />
                    <div class='expand-option left' />
                    <div class='details-pane left' />
                </div>
            </div>
            <div class='grid-message-area' />
            <div class='results-section fixed-section' >
                <div class='exploratory-session-grid' />
            </div>`
        );

        this._rightPane = $(
            `<div class='exploratory-session-result-section fixed-section' >
                <div class='summary-section'></div>
                <div class='work-item-section'></div>
             </div>`
        );

        this._element.append(this._layout);
    }

    private _populateSections() {
        Diag.logVerbose("Populating the sections of the session insights page within the layout");

        // Add Session Charts on header
        this._exploratorySessionCharts = <SessionChart.ExploratorySessionCharts>Controls.BaseControl.createIn(
            SessionChart.ExploratorySessionCharts,
            this._layout.find(".exploratory-sessions-summary-charts-section"), ({
                viewModel: this._sessionViewModel.getExploratorySessionChartsViewModel()
            }));

        this._layout.find(".head-section").attr("aria-label", Resources.ChartsHeaderSectionLabel);

        // Add error control
        let $errorArea = this._layout.find(".message-area-part");
        $errorArea.addClass("content");

        this._errorSection = <MessageArea.MessageAreaView>Controls.BaseControl.enhance(MessageArea.MessageAreaView, $errorArea, {
            viewModel: this._sessionViewModel.getMessageAreaViewModel()
        });

        // Add splitter control
        this._splitter = <Splitter.Splitter><any>Controls.BaseControl.createIn(Splitter.Splitter,
            this._layout.find(".exploratory-session-spillter"),
            { cssClass: "content", fixedSide: "right" });
        this._splitter.horizontal();
        this._splitter.resize("40%");

        this._splitter.leftPane.append(this._leftPane);
        this._splitter.rightPane.append(this._rightPane);

        // Tool bar section
        this._toolbar = <Control.Toolbar>Controls.BaseControl.createIn(Control.Toolbar, this._leftPane.find(".toolbar-section"), {
            onExecuteCommand: delegate(this, this._handleCommand)
        });

        this._groupBy = <Control.GroupBy>Controls.BaseControl.createIn(Control.GroupBy, this._leftPane.find(".groupby-section"));
        this._disposalManager.addDisposable(this._groupBy.groupByOption.subscribe((option: string) => {
            this._sessionDetail.handlePivotChanged(option, TCMCommon.Filters.GroupBy);
        }));

        this._filterBy = <Control.FilterBy>Controls.BaseControl.createIn(Control.FilterBy, this._leftPane.find(".filters-section"));
        this._disposalManager.addDisposable(this._filterBy.filterByOption.subscribe((option: string) => {
            this._sessionDetail.handlePivotChanged(option, TCMCommon.Filters.Outcome);
        }));

        this._detailsPaneToggle = <Control.DetailsPaneToggle>Controls.BaseControl.createIn(Control.DetailsPaneToggle, this._leftPane.find(".details-pane"), {
            splitter: this._splitter
        });

        this._fullscreen = <Control.FullScreenToggle>Controls.BaseControl.createIn(Control.FullScreenToggle, this._leftPane.find(".expand-option"), {
            fullScreenDelegate: delegate(this, this._handleFullScreen)
        });

        // Body section //
        this._bodySection = this._layout.find(".exploratory-sessions-details-part");

        // Session results detail section
        this._sessionDetail = new SessionDetail.SessionDetailView({
            container: this._bodySection,
            viewModel: this._sessionViewModel.getSessionListViewModel()
        });

        // Message area section for result list
        this._sessionListMessageArea = <MessageArea.MessageAreaView>Controls.BaseControl.createIn(MessageArea.MessageAreaView, this._bodySection.find(".grid-message-area"), {
            viewModel: this._sessionViewModel.getSessionListMessageAreaViewModel(),
            closeable: false
        });

        this._createFilters();

    }

    /// <summary>
    /// delegates the command from tool bar to results sections
    /// </summary>
    private _handleCommand(command: string): void {
        this._sessionDetail.handleCommand(command);
    }

    private _getGridListSection(): JQuery {
        return this._layout.find(".results-section");
    }

    private _getGridResultSection(): JQuery {
        return this._layout.find(".exploratory-session-result-section");
    }

    private _setSessionListMessageArea(): void {
        let sessionListViewModel = this._sessionViewModel.getSessionListViewModel();
        let sessionListMessageAreaViewModel = this._sessionViewModel.getSessionListMessageAreaViewModel();

        this._disposalManager.addDisposable(sessionListViewModel.showMessageOnGrid.subscribe((newValue: boolean) => {
            if (newValue) {
                this._getGridListSection().hide();
                this._getGridResultSection().hide();
            } else {
                sessionListMessageAreaViewModel.clear();
                this._getGridListSection().show();
                this._getGridResultSection().show();
            }
        }));
    }

    private _loadSessionData(team:string, period: number = this._defaultSessionPeriodInDays, allSessions: boolean = true, wiqlQuery: string = null) {
        Diag.logVerbose("Loading session data for period " + period + "and owner filter = " + allSessions);

        let workItemColors = Utils_Core.parseJsonIsland($(document), ".__workItemColors", false);
        let workItemTypeCategories = Utils_Core.parseJsonIsland($(document), ".__workItemTypeCategories", false);
        let testSessions = Utils_Core.parseJsonIsland($(document), ".__testSessions", true);

        if (workItemTypeCategories && workItemColors) {
            ManualUtils.WorkItemMetaDataCache.setWorkItemMetaData(workItemTypeCategories, workItemColors);
        } else {
            Diag.logError("WorkItemMetaData loading fail in jsonIsland");
        }

        this._selectedTeamFilter = team;
        this._selectedOwnerFilter = allSessions;
        this._selectedPeriodFilter = period;
        this._viewContextHandler = new TestContextHandler(this._resultViewModel);

        // fetch workitems based on selected query
        WorkItemDataProvider.WorkItemDataProvider.getInstance().beginGetWorkItemsFromQueryId(wiqlQuery)
            .then((fetchedWorkItems: IDictionaryStringTo<Contracts.WorkItemReference>) => {
                let witIds: number[] = null;
                if (fetchedWorkItems) {
                    witIds = [];
                    for (let item in fetchedWorkItems) {
                        if (ManualUtils.isLinkabaleWorkItem(fetchedWorkItems[item].type)) {
                            witIds.push(parseInt(fetchedWorkItems[item].id));
                        }
                    }
                }

                if (witIds && fetchedWorkItems && Object.keys(fetchedWorkItems).length === 0) {
                    //Executes this._showNoSessionView() when there is no result from query
                    this.delayExecute("noWorkItemInQueryView", ManualUtils.ExploratorySessionConstant.NoWorkItemInQueryViewDelay, false, () => {
                        this._showNoSessionView(Resources.SessionInsightNoWorkItemInQueryResultText);
                    });
                }
                else if (witIds && witIds.length === 0) {
                    //Executes this._showNoSessionView() when query is not supporting any criteria for traceability
                    this.delayExecute("noWorkItemInQueryView", ManualUtils.ExploratorySessionConstant.NoWorkItemInQueryViewDelay, false, () => {
                        this._showNoSessionView(Resources.SessionInsightNoWorkItemSupportedInQueryText);
                    });
                } else {

                    if (testSessions) {
                        this._initalizeSessionView(testSessions, witIds);
                    } else {
                        let promise = this._beginGetAllExploratorySessions(this._selectedTeamFilter, this._selectedPeriodFilter, this._selectedOwnerFilter);
                        promise.then((testSessions: TCMContracts.TestSession[]) => {
                            this._initalizeSessionView(testSessions, witIds);
                        }, (error: TfsError) => {
                            this._logError(error);
                        });
                    }
                }
            }, (error: TfsError) => {
                Diag.logError(Utils_String.format("failed to fetch workitem from query id. Error: {0}", (error.message || error)));
                this._showNoSessionView(ManualUtils.getErrorMessageFromQueryIdResult(error.message));
            });
    }

    private _initalizeSessionView(testSessions: TCMContracts.TestSession[], witIds: number[] = null): void {
        testSessions = ManualUtils.getSessionsForCustomQuery(testSessions, witIds);
        if (testSessions.length === 0) {
            //Executes this._showNoSessionView() when there is no sessions associated
            this.delayExecute("zeroExploratorySessionView", ManualUtils.ExploratorySessionConstant.ZeroSessionViewDelay, false, () => {
                this._showNoSessionView(Resources.ExploratorySessionViewNoSessionText);

                //If sessionCount is zero then changing periodRegistry setting to 90Days again
                UserSettings.ExploratorySessionUserSettings.getInstance().updateUserSettings(SettingsConstant.PeriodFilterSettingString, "90");
            });

        } else {
            this._initializeContainerForSessionView();
            this._viewContextHandler.sourceCallback(testSessions, witIds);
        }
        TelemetryService.publishEvent(TelemetryService.featureExploratorySessionsCount, "Count", testSessions.length);
    }

    private _logError(error: TfsError): void {
        if (error) {
            this._sessionViewModel.getMessageAreaViewModel().logError(error.message);
        }
    }

    private _handleFullScreen(isFullScreen: boolean): void {
        Diag.logVerbose("Session grid full screen toggle mode changing to: " + isFullScreen);

        let classesToAttachInFullScreenMode: string[] = [
            ".exploratory-sessions-summary-charts-section",
            ".hub-title",
            ".hub-pivot",
            ".hub-content",
            ".right-hub-content",
            ".exploratory-session-spillter",
            ".head-section",
            ".hub-pivot-content"
        ];

        classesToAttachInFullScreenMode.forEach((searchPattern: string) => {
            $(searchPattern).toggleClass("full-screen-mode-exploratory-sessions", isFullScreen);
        });
    }

    private _beginGetAllExploratorySessions(team:string, period: number, allSessions: boolean): IPromise<TCMContracts.TestSession[]> {
        return ManualUtils.getAllExploratorySessions(team, period, allSessions);
    }

    private _createFilters() {
        this._createTeamFilter();
        this._createOwnerFilter();
        this._createPeriodFilter();
        this._createQueryFilter();
    }

    private _getTeamContext(): TeamContext {
        return TFS_Host_TfsContext.TfsContext.getDefault().contextData.team;
    }

    private _createTeamFilter() {
        //AT-DT handling
        const team = this._getTeamContext();
        if (team) {
            this._selectedTeamFilter = team.id;
        } else {
            Diag.logVerbose("Initializing team filter");
            mountBreadcrumb($(FilterSelectors.team)[0], this._createTeamFilterProps());
        }
    }

    private _createTeamFilterProps() {

        const userSettings = UserSettings.ExploratorySessionUserSettings.getInstance().getUserSettings();
        const teamFilter = userSettings.teamFilter;

        // Get page data from the data provider
        const pageDataService = Service.getService(WebPageDataService);
        const pageData = pageDataService.getPageData<ManualUtils.IProjectTeamsData>(this.teamsDataProviderId);

        const selectedTeam = this._getSeletedTeam(pageData, teamFilter);
        this._selectedTeamFilter = selectedTeam.id;

        const props: IProps = {
            selectedTeam: selectedTeam,
            allTeams: pageData.allTeams,
            onSelectionChange: (teamId) => {
                this._filterValueChanged(FilterSelectors.team, teamId);
                TelemetryService.publishEvents(TelemetryService.featureControlTabInExploratorySessions_TeamTabClicked, {
                    "DropDownSelected": teamId
                });

                userSettings.teamFilter = teamId;
                UserSettings.ExploratorySessionUserSettings.getInstance().updateUserSettings(SettingsConstant.TeamFilterSettingString, teamId);
            }
        }

        return props;
    }

    private _getSeletedTeam(pageData: ManualUtils.IProjectTeamsData, teamFilter: string): ManualUtils.ITeam {
        const filterdTeam = pageData.allTeams.filter((team) => {
            return team.id === teamFilter;
        });

        return filterdTeam.length > 0 ? filterdTeam[0] : pageData.defaultTeam;
    }

    private _createOwnerFilter() {
        Diag.logVerbose("Initializing owners filter");
        let userSettings = UserSettings.ExploratorySessionUserSettings.getInstance().getUserSettings();

        this._ownerFilter = <Navigation.PivotFilter>Controls.Enhancement.ensureEnhancement(Navigation.PivotFilter, $(FilterSelectors.owner));
        if (this._ownerFilter) {

            // read user setting and update filter
            let ownerFilter = userSettings.ownerFilter;
            if (this._ownerFilter.getSelectedItem() && this._ownerFilter.getSelectedItem().value !== ownerFilter) {
                this._updateFilterSelection(this._ownerFilter, "ownerFilter", ownerFilter);
            }

            this._clickedOwnerOption = ManualUtils.ExploratorySessionConstant.defaultOwnerFilter;
            this._ownerFilter._bind("changed", delegate(this, (sender, item) => {
                this._filterValueChanged(FilterSelectors.owner, item.value);
                TelemetryService.publishEvents(TelemetryService.featureControlTabInExploratorySessions_ViewTabClicked, {
                    "Clicked": this._clickedOwnerOption,
                    "DropDownSelected": item.id
                });
                this._clickedOwnerOption = item.id;

                userSettings.ownerFilter = item.value;
                UserSettings.ExploratorySessionUserSettings.getInstance().updateUserSettings(SettingsConstant.OwnerFilterSettingString, item.value);
            }));
        }
    }

    private _createPeriodFilter() {
        Diag.logVerbose("Initializing period filter");
        let userSettings = UserSettings.ExploratorySessionUserSettings.getInstance().getUserSettings();

        this._periodFilter = <Navigation.PivotFilter>Controls.Enhancement.ensureEnhancement(Navigation.PivotFilter, $(FilterSelectors.period));
        if (this._periodFilter) {

            // read user setting and update filter
            let periodFilter = userSettings.periodFilter;
            if (this._periodFilter.getSelectedItem() && this._periodFilter.getSelectedItem().value !== periodFilter) {
                this._updateFilterSelection(this._periodFilter, "periodFilter", periodFilter);
            }

            this._clickedPeriodOption = ManualUtils.ExploratorySessionConstant.defaultPeriodFilter;
            this._periodFilter._bind("changed", delegate(this, (sender, item) => {
                this._filterValueChanged(FilterSelectors.period, item.value);
                TelemetryService.publishEvents(TelemetryService.featureControlTabInExploratorySessions_PeriodTabClicked, {
                    "Clicked": this._clickedPeriodOption,
                    "DropDownSelected": item.id
                });
                this._clickedPeriodOption = item.id;

                userSettings.periodFilter = item.value;
                UserSettings.ExploratorySessionUserSettings.getInstance().updateUserSettings(SettingsConstant.PeriodFilterSettingString, item.value);
            }));
        }
    }

    private _createQueryFilter() {
        Diag.logVerbose("Initializing query filter");
        let userSettings = UserSettings.ExploratorySessionUserSettings.getInstance().getUserSettings();

        this._querySelectorFilter = <Navigation.PivotFilter>Controls.Enhancement.ensureEnhancement(Navigation.PivotFilter, $(FilterSelectors.query));
        if (this._querySelectorFilter) {

            // read user setting and update filter and selectedQuery
            let queryFilterName = userSettings.queryFilterName;
            let queryFilterValue = userSettings.queryFilterValue;
            if (queryFilterValue !== "none") {
                this._queryPivotFilterItem = {
                    value: "default", text: queryFilterName, selected: true
                };
                this._querySelectorFilter.setSelectedItem(this._queryPivotFilterItem);
                this.selectedQuery = {
                    queryName: queryFilterName,
                    queryId: queryFilterValue
                };
            } else {
                let text = this._querySelectorFilter.getItem(queryFilterValue).text;
                this._queryPivotFilterItem = {
                    value: "default", text: text, selected: true
                };
                this._querySelectorFilter.setSelectedItem(this._queryPivotFilterItem);
                this.selectedQuery = null;
            }

            this._clickedQueryOption = ManualUtils.ExploratorySessionConstant.defaultQueryFilter;
            this._querySelectorFilter._bind("changed", delegate(this, (sender, item) => {
                if (item.value !== "default") {

                    TelemetryService.publishEvents(TelemetryService.featureControlTabInExploratorySessions_QueryTabClicked, {
                        "Clicked": this._clickedQueryOption,
                        "DropDownSelected": item.id
                    });
                    this._clickedQueryOption = item.id;

                    if (item.value === "select-query") {
                        this._dialogBox = Dialogs.show(QueryView.QueryDialogView, $.extend({
                            onOkClickDelegate: Utils_Core.delegate(this, this._onOkButtonClicked),
                            onCancelClickDelegate: Utils_Core.delegate(this, this._onCancelButtonClicked),
                            team: this._selectedTeamFilter
                        }));
                    } else if (item.value === "none") {
                        this._sessionViewModel.getSessionListViewModel().clearCache();
                        this.selectedQuery = null;
                        this._queryPivotFilterItem.text = item.text;
                        this._querySelectorFilter.setSelectedItem(this._queryPivotFilterItem);
                        this._updateQueryFilterSetting(item.text, item.value);
                        this._loadSessionData(this._selectedTeamFilter,this._selectedPeriodFilter, this._selectedOwnerFilter);
                    }
                }
            }));
        }
    }

    private _updateFilterSelection(filter, key: string, value: string) {
        if (value) {
            let item = filter.getItem(value);
            if (item) {
                filter.setSelectedItem(item);
            }
        }
    }

    private _onOkButtonClicked(query: QueryScalar.IQueryInformation) {
        this._sessionViewModel.getSessionListViewModel().clearCache();
        this.selectedQuery = query;
        this._queryPivotFilterItem.text = query.queryName;
        this._querySelectorFilter.setSelectedItem(this._queryPivotFilterItem);
        this._updateQueryFilterSetting(query.queryName, query.queryId);
        this._loadSessionData(this._selectedTeamFilter, this._selectedPeriodFilter, this._selectedOwnerFilter, query.queryId);
    }

    private _onCancelButtonClicked() {
        this._querySelectorFilter.setSelectedItem(this._queryPivotFilterItem);
    }

    private _updateQueryFilterSetting(command: string, value: string) {
        let userSettings = UserSettings.ExploratorySessionUserSettings.getInstance().getUserSettings();
        userSettings.queryFilterName = command;
        userSettings.queryFilterValue = value;
        UserSettings.ExploratorySessionUserSettings.getInstance().updateUserSettings(SettingsConstant.QueryFilterNameSettingString, userSettings.queryFilterName);
        UserSettings.ExploratorySessionUserSettings.getInstance().updateUserSettings(SettingsConstant.QueryFilterValueSettingString, userSettings.queryFilterValue);
    }

    private _filterValueChanged(selector: string, value: string) {
        this._sessionViewModel.getSessionListViewModel().clearCache();

        let queryId = null;
        if (this.selectedQuery) {
            queryId = this.selectedQuery.queryId;
        }

        if (selector === FilterSelectors.owner) {
            this._loadSessionData(this._selectedTeamFilter, this._selectedPeriodFilter, value === "all", queryId);
        } else if (selector === FilterSelectors.period) {
            this._loadSessionData(this._selectedTeamFilter, parseInt(value), this._selectedOwnerFilter, queryId);
        } else if (selector === FilterSelectors.team) {
            this._loadSessionData(value, this._selectedPeriodFilter, this._selectedOwnerFilter, queryId);
        }
    }
}

export class TestContextHandler implements IViewContextHandler {
    private _resultsViewModel: ResultViewModel.IManualResultViewModel;

    constructor(viewModel: ResultViewModel.ResultsViewModel) {
        this._resultsViewModel = viewModel;
    }

    /** Method use to load exploratory session view with new data.
     * 
     * @param sessionDetails View model which binded with exploratory session view.
     * @publicapi
     * 
     */
    public sourceCallback(testSessions: TCMContracts.TestSession[], witIds: number[]) {
        let viewContextData: TCMCommon.IViewContextData = {
            viewContext: TCMCommonBase.ViewContext.ExploratorySession,
            data: {
                mainData: testSessions,
                subData: witIds
            }
        };
        this._resultsViewModel.load(viewContextData);
    }
}

// TFS plug-in model requires this call for each TFS module.
VSS.tfsModuleLoaded("ExploratorySession/TabView", exports);
