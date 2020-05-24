/// <amd-dependency path='VSS/LoaderPlugins/Css!PullRequestsView' />

import ko = require("knockout");

import Controls = require("VSS/Controls");
import Navigation = require("VSS/Controls/Navigation");
import Navigation_Services = require("VSS/Navigation/Services");
import Performance = require("VSS/Performance");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import Utils_String = require("VSS/Utils/String");
import Utils_Array = require("VSS/Utils/Array");
import VSS = require("VSS/VSS");

import VCResources = require("VersionControl/Scripts/Resources/TFS.Resources.VersionControl");
import * as CustomerIntelligenceConstants from "VersionControl/Scripts/CustomerIntelligenceConstants";
import * as GitRefUtility from "VersionControl/Scripts/GitRefUtility";
import {GitRepositoryContext} from "VersionControl/Scripts/GitRepositoryContext";
import VCContracts = require("TFS/VersionControl/Contracts");
import VCPullRequestQueryCriteria = require("VersionControl/Scripts/PullRequestQueryCriteria");
import VCPullRequestsControls = require("VersionControl/Scripts/Controls/PullRequest");
import VCPullRequestsResultsTabs = require("VersionControl/Scripts/Views/Tabs/PullRequestsResultsTabs");
import VCPullRequestsViewViewModel = require("VersionControl/Scripts/ViewModels/PullRequestsViewViewModel");
import VCPullRequestViewBase = require("VersionControl/Scripts/Views/PullRequestBaseView");
import * as VersionControlUrls from "VersionControl/Scripts/VersionControlUrls";
import {CustomerIntelligenceData} from "VersionControl/Scripts/CustomerIntelligenceData";
import Utils_UI = require("VSS/Utils/UI");
import VCEmptyPRListExperience_NO_REQUIRE = require("VersionControl/Scenarios/PullRequestList/EmptyListExperience");

import TfsContext = TFS_Host_TfsContext.TfsContext;
import domElem = Utils_UI.domElem;

export class PullRequestsView extends VCPullRequestViewBase.PullRequestViewBase {
    private _viewModel: VCPullRequestsViewViewModel.ViewViewModel;

    protected _authoredByPicker: any;
    protected _assignedToPicker: any;

    protected _performance: Performance.IScenarioDescriptor;
    private _tabNavigationPerformance: Performance.IScenarioDescriptor;

    private static EMPTY_PR_LIST_CONTAINER = "empty-pr-list-container";

    constructor(options?) {
        super($.extend({
            attachNavigate: true,
            titleElementSelector: ".vc-page-title",
            pullRequestsSuggestionParentSelector: ".hub-content"
        }, options));

        this._performance = Performance.getScenarioManager().startScenarioFromNavigation(
            CustomerIntelligenceConstants.VERSION_CONTROL_AREA,
            options.telemeteryFeatureArea || CustomerIntelligenceConstants.PULL_REQUEST_VIEW_FEATURE,
            true);
    }

    public initializeOptions(options?) {
        const tabs = {};

        tabs[VCPullRequestsControls.PullRequestsActions.MINE] = VCPullRequestsResultsTabs.MyResultsTab;

        tabs[VCPullRequestsControls.PullRequestsActions.ACTIVE] = VCPullRequestsResultsTabs.ActiveResultsTab;
        tabs[VCPullRequestsControls.PullRequestsActions.COMPLETED] = VCPullRequestsResultsTabs.CompletedResultsTab;
        tabs[VCPullRequestsControls.PullRequestsActions.ABANDONED] = VCPullRequestsResultsTabs.AbandonedResultsTab;

        super.initializeOptions($.extend({
            tabs: tabs,
            hubContentSelector: ".versioncontrol-pullrequests-content",
            pivotTabsSelector: ".vc-pullrequest-tabs",
            showPullRequestSuggestion: true,
        }, options));
    }

    public initialize(options?) {
        this._customerIntelligenceData.setView("PullRequestsView");
        if (this._performance) {
            this._performance.addSplitTiming("startedInitialization");
        }
        const state = Navigation_Services.getHistoryService().getCurrentState();

        this._initializeViewModel(<GitRepositoryContext>this._repositoryContext, {
            projectGuid: this._options.projectGuid,
            vcUserPreferences: this._options.vcUserPreferences
        });

        super.initialize();
        this._bindViewModel();

        if (this._performance) {
            this._performance.addSplitTiming("initialized");
        }
    }

    public parseStateInfo(action: string, rawState: any, callback: IResultCallback) {
        this._tabNavigationPerformance = Performance.getScenarioManager().startScenario(CustomerIntelligenceConstants.VERSION_CONTROL_AREA, "PullRequestTabNavigation");

        const state: any = {};
        if (action && VCPullRequestsControls.PullRequestsActions.CREATENEW === action.toLocaleLowerCase()) {
            //this has moved so redirect
            window.location.href = VersionControlUrls.getCreatePullRequestUrl(<GitRepositoryContext>this._repositoryContext,
                rawState.sourceRef ? decodeURIComponent(rawState.sourceRef) : null,
                rawState.targetRef ? decodeURIComponent(rawState.targetRef) : null);
                
            // redirected successfully no reason to continue
            return;
        }
        const currentAction = this._resolveActionString(action);

        this.setState(state);

        state.viewModel = this._viewModel;
        state.repositoryContext = this._repositoryContext;
        
        if (this._emptyRepository) {
            this._showEmptyRepositoryView();
            this.setHubPivotVisibility(false);
            return;
        }
        callback(currentAction, state);

    }

    private _showEmptyPullRequestListExperience(): void {
        const $container = $(domElem("div")).addClass("navigation-view-tab").addClass(PullRequestsView.EMPTY_PR_LIST_CONTAINER);
        VSS.using(["VersionControl/Scenarios/PullRequestList/EmptyListExperience"],
            (VCEmptyPRListExperience: typeof VCEmptyPRListExperience_NO_REQUIRE) => {

                const props = {
                    customerIntelligenceData: this._customerIntelligenceData,
                    newPullRequestURL: VersionControlUrls.getCreatePullRequestUrl(this._repositoryContext as GitRepositoryContext)
                } as VCEmptyPRListExperience_NO_REQUIRE.IEmptyPRListExperienceProps;

                VCEmptyPRListExperience.createIn($container[0], props);

            });
        this._element.find('.versioncontrol-pullrequests-content').append($container)
    }

    private onEmptyPRListViewNavigateAway(): void {
        this._element.find("." + PullRequestsView.EMPTY_PR_LIST_CONTAINER).remove();
    }

    private _resolveActionString(inputAction: string): string {
        let resolvedAction: string = null;

        if (!inputAction) {
            resolvedAction = VCPullRequestsControls.PullRequestsActions.MINE;
        }
        else if (VCPullRequestsControls.PullRequestsActions.ALL === inputAction.toLowerCase()) {
            resolvedAction = VCPullRequestsControls.PullRequestsActions.ACTIVE;
        }
        else {
            resolvedAction = inputAction;
        }

        return resolvedAction;
    }

    public onNavigate(state: any) {

        if (this._emptyRepository) {
            this._updateViewToShowDivs();

            // Mark that the initial update for an empty repository is complete.
            this._initialUpdateComplete('myPullRequestsTabComplete');
            return;
        }

        if (this._isMyResultsView(state.action)) {
            this._updateViewToShowMyPullRequests();
        } else if (this._isAllResultsView(state.action)) {
            let status = VCContracts.PullRequestStatus.Active;

            const currectAction = state.action || this.getCurrentAction();

            switch (this.getCurrentAction().toLowerCase()) {
                case "completed":
                    status = VCContracts.PullRequestStatus.Completed;
                    break;
                case "abandoned":
                    status = VCContracts.PullRequestStatus.Abandoned;
                    break;
            }

            this._updateViewToShowPullRequests(status);
        }

        this._updateTitle();
        this._updateViewToShowDivs();
    }

    private _initializeViewModel(repositoryContext: GitRepositoryContext, options?) {
        this._viewModel = new VCPullRequestsViewViewModel.ViewViewModel(repositoryContext, options);
    }

    private _bindViewModel() {
        const titleElement = this._element.find('.vc-page-title-area');

        if (titleElement) {
            ko.applyBindings(this._viewModel, titleElement[0]);
        }

        const hubPivot = this._element.find('.vc-pullrequests-page-hubpivot-area');

        if (hubPivot) {
            ko.applyBindings(this._viewModel, hubPivot[0]);
        }

        this._viewModel.pageTitle.subscribe((newValue) => {
            this._updateTitle();
        });
        // Once empty PR view is shown, it will not go away until sub-tab changes or some kind of reload. so this can only change from 'false to true' 
        this._viewModel.showEmptyPRListExperience.subscribe((newValue: boolean) => {
            this.onEmptyPRListViewNavigateAway();
            if (newValue) {
                this._showEmptyPullRequestListExperience();
            }
        });
    }

    private _isResultsView(rawAction?): boolean {
        const action = rawAction || this.getCurrentAction();

        return !action ||
            Utils_String.localeIgnoreCaseComparer(action, VCPullRequestsControls.PullRequestsActions.ALL) === 0;
    }

    private _isMyResultsView(rawAction?): boolean {
        const action = rawAction || this.getCurrentAction();

        return !action ||
            Utils_String.localeIgnoreCaseComparer(action, VCPullRequestsControls.PullRequestsActions.MINE) === 0;
    }

    private _isAllResultsView(rawAction?): boolean {
        const action = rawAction || this.getCurrentAction();

        return this._isActiveView(action) ||
            this._isCompletedView(action) ||
            this._isAbandonedView(action);
    }

    private _isActiveView(rawAction?): boolean {
        const action = rawAction || this.getCurrentAction();

        return Utils_String.localeIgnoreCaseComparer(action, VCPullRequestsControls.PullRequestsActions.ACTIVE) === 0;
    }

    private _isCompletedView(rawAction?): boolean {
        const action = rawAction || this.getCurrentAction();

        return Utils_String.localeIgnoreCaseComparer(action, VCPullRequestsControls.PullRequestsActions.COMPLETED) === 0;
    }

    private _isAbandonedView(rawAction?): boolean {
        const action = rawAction || this.getCurrentAction();

        return Utils_String.localeIgnoreCaseComparer(action, VCPullRequestsControls.PullRequestsActions.ABANDONED) === 0;
    }

    /**
     * Update the view to show all results.
     *
     * @param {VCPullRequestsControls.PullRequestStatusFilter} The index of the pull request status filter to select (or null for default)
     */
    private _updateViewToShowPullRequests(pullRequestStatusFilter: VCContracts.PullRequestStatus) {
        this._viewModel.updateViewMode(VCPullRequestsControls.PullRequestViewMode.RESULTS);

        const criteria = new VCPullRequestQueryCriteria();
        criteria.status = pullRequestStatusFilter;

        // Start query when we have the criteria set.
        const promise = this._viewModel.resultsViewModel.updateQueryCriteriaAsync(criteria, true);

        // Publish telemetry on filter selection.
        const ci: CustomerIntelligenceData = this._customerIntelligenceData.clone();
        ci.properties["StatusFilter"] = criteria.status;
        ci.publish(CustomerIntelligenceConstants.PULL_REQUEST_QUERY_CRITERIA_FEATURE);

        this.setHubPivotVisibility(true);
        this.setPullRequestSuggestionVisibility(true);

        let scenarioName = "";
        switch (pullRequestStatusFilter) {
            case VCContracts.PullRequestStatus.Active:
                scenarioName = "ActivePullRequestsTabComplete";
                break;
            case VCContracts.PullRequestStatus.Completed:
                scenarioName = "CompletedPullRequestsTabComplete";
                break;
            case VCContracts.PullRequestStatus.Abandoned:
                scenarioName = "AbandonedPullRequestsTabComplete";
                break;
        }

        promise.done(() => this._initialUpdateComplete(scenarioName));
    }

    private _initialUpdateComplete(scenarioName: string) {
        if (this._performance) {
            this._performance.addSplitTiming(scenarioName);
            this._performance.end();
            this._performance = null;
        }

        if (this._tabNavigationPerformance) {
            this._tabNavigationPerformance.addSplitTiming(scenarioName);
            this._tabNavigationPerformance.end();
            this._tabNavigationPerformance = null;
        }
    }

    private _updateViewToShowMyPullRequests() {
        this._viewModel.updateViewMode(VCPullRequestsControls.PullRequestViewMode.MINE);

        const promise = this._viewModel.myResultsViewModel.refreshAsync();

        this.setHubPivotVisibility(true);
        this.setPullRequestSuggestionVisibility(true);

        promise.done(() => this._initialUpdateComplete('myPullRequestsTabComplete'));
    };

    private _updateViewToShowDivs() {
        // We add the class to the hub-pivot here because this is where we show the pull request pivot area
        // The hub-pivot div is visible (by default), and we do not want to show a bottom border
        // until we are ready to show our tab pivots.
        this._element.find('.hub-pivot').addClass('subtlePivotBottomBorder');
        $('.vc-pullrequests-pivotArea').show();
        $('.vc-pullrequests-titleArea').show();
    }

    private _updateTitle() {
        this.setViewTitle(this._options.viewTitle || this._viewModel.pageTitle());
        this.setWindowTitle(VCResources.PullRequest_HubName);
    }

    private _getPullRequestStatusFromString(action) {
        if (Utils_String.localeIgnoreCaseComparer(action, "active") === 0) {
            return VCContracts.PullRequestStatus.Active;
        }
        else if (Utils_String.localeIgnoreCaseComparer(action, "completed") === 0) {
            return VCContracts.PullRequestStatus.Completed;
        }
        else if (Utils_String.localeIgnoreCaseComparer(action, "abandoned") === 0) {
            return VCContracts.PullRequestStatus.Abandoned;
        }

        return null;
    }

    private _getPullRequestStatusFilterFromString(action) {
        if (Utils_String.localeIgnoreCaseComparer(action, "active") === 0) {
            return VCPullRequestsControls.PullRequestStatusFilter.ACTIVE;
        }
        else if (Utils_String.localeIgnoreCaseComparer(action, "completed") === 0) {
            return VCPullRequestsControls.PullRequestStatusFilter.COMPLETED;
        }
        else if (Utils_String.localeIgnoreCaseComparer(action, "abandoned") === 0) {
            return VCPullRequestsControls.PullRequestStatusFilter.ABANDONED;
        }

        return null;
    }
}

VSS.classExtend(PullRequestsView, TfsContext.ControlExtensions);

Controls.Enhancement.registerEnhancement(PullRequestsView, ".versioncontrol-pullrequests-view");
