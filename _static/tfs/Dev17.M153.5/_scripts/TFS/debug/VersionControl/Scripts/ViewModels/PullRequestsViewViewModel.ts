import ko = require("knockout");
import Utils_String = require("VSS/Utils/String");
import {RepositoryContext} from "VersionControl/Scripts/RepositoryContext";
import * as CustomerIntelligenceConstants from "VersionControl/Scripts/CustomerIntelligenceConstants";
import VCPullRequestsControls = require("VersionControl/Scripts/Controls/PullRequest");
import VCPullRequestsOverviewViewModel = require("VersionControl/Scripts/ViewModels/PullRequestsOverviewViewModel");
import VCPullRequestsAllResultsViewModel = require("VersionControl/Scripts/ViewModels/PullRequestsAllResultsViewModel");
import * as VersionControlUrls from "VersionControl/Scripts/VersionControlUrls";
import {GitRepositoryContext} from "VersionControl/Scripts/GitRepositoryContext";
import VCResources = require("VersionControl/Scripts/Resources/TFS.Resources.VersionControl");
import VCViewModel = require("VersionControl/Scripts/TFS.VersionControl.ViewModel");
import VSS_Telemetry = require("VSS/Telemetry/Services");

/**
 * Page level ViewModel backing the Pull Requests page. Contains sub-ViewModels for the
 * individual tabs ("My Pull Requests", "All Pull Requests", "Create Pull Request"..).
 */
export class ViewViewModel extends VCViewModel.VersionControlViewModel {

    /**
     * View model for the "all" pull requests tab.
     */
    public resultsViewModel: VCPullRequestsAllResultsViewModel.AllResultsViewModel;

    /**
     * View model for the "mine" pull requests tab.
     */
    public myResultsViewModel: VCPullRequestsOverviewViewModel;

    /**
     * Is page currently showing the "All" pull request tab.
     */
    public isShowingAllPullRequestResults: KnockoutComputed<boolean>;

    /**
     * Should page show author / reviewer filters.
     */
    public isShowingFilters: KnockoutComputed<boolean>;

    public pageTitle: KnockoutComputed<string>;

    public viewMode: KnockoutObservable<VCPullRequestsControls.PullRequestViewMode>;

    public showEmptyPRListExperience: KnockoutComputed<boolean>;

    public newPullRequestButtonText = VCResources.PullRequest_CreatePullRequestButtonCaption;

    constructor(repositoryContext: RepositoryContext, options?) {
        super(repositoryContext, null, options);

        this.viewMode = <KnockoutObservable<VCPullRequestsControls.PullRequestViewMode>>ko.observable(null);

        this.isShowingAllPullRequestResults = ko.computed(this._computeIsShowingResults, this);
        this.isShowingFilters = ko.computed(this._computeIsShowingFilters, this);

        this._initialize(this._getViewModeFromOptions());

        this.pageTitle = ko.computed(this._computeTitleText, this);

        this.showEmptyPRListExperience = ko.computed(this._computeShowEmptyPRListExperience, this);
    }

    /**
     * Updates the state about which tab is currently active.
     * (just updates the datamodel to match the selection on the page).
     */
    public updateViewMode(viewMode: VCPullRequestsControls.PullRequestViewMode) {
        if (this.viewMode() === viewMode) {
            return;
        }

        this.viewMode(viewMode);
    }

    private _initialize(viewMode: VCPullRequestsControls.PullRequestViewMode) {

        // ViewMode will always set during OnNavigate call
        this.viewMode(null);

        this.resultsViewModel = new VCPullRequestsAllResultsViewModel.AllResultsViewModel(this.repositoryContext, this, {
            projectGuid: this.options.projectGuid,
        });

        this.myResultsViewModel = new VCPullRequestsOverviewViewModel(this.repositoryContext, this, {
            projectGuid: this.options.projectGuid
        });
    }

    private _computeIsShowingFilters(): boolean {
        return this.viewMode() == VCPullRequestsControls.PullRequestViewMode.RESULTS;
    }

    private _computeShowEmptyPRListExperience(): boolean {
        if (this.viewMode() === VCPullRequestsControls.PullRequestViewMode.MINE) {
            return this.myResultsViewModel.isResultSetEmpty();
        }
        return this.resultsViewModel.isResultSetEmpty();
    }

    private _computeIsShowingResults(): boolean {
        return this.viewMode() == VCPullRequestsControls.PullRequestViewMode.RESULTS;
    }

    private _computeTitleText(): string {
        return VCResources.PullRequest_HubName;
    }

    private _getViewModeFromOptions(): VCPullRequestsControls.PullRequestViewMode {
        if (this.options && this.options.action) {
            if (Utils_String.localeIgnoreCaseComparer(this.options.action, VCPullRequestsControls.PullRequestsActions.MINE) === 0) {
                return VCPullRequestsControls.PullRequestViewMode.MINE;
            }
            if (Utils_String.localeIgnoreCaseComparer(this.options.action, VCPullRequestsControls.PullRequestsActions.ALL) === 0) {
                return VCPullRequestsControls.PullRequestViewMode.RESULTS;
            }
        }

        return VCPullRequestsControls.PullRequestViewMode.MINE;
    }

    public newPullRequest() {
        VSS_Telemetry.publishEvent(new VSS_Telemetry.TelemetryEventData(CustomerIntelligenceConstants.VERSION_CONTROL_AREA, CustomerIntelligenceConstants.PULL_REQUEST_CREATE_FEATURE, {
            "SourceUI": CustomerIntelligenceConstants.PULL_REQUEST_CREATE_SOURCEUI_TOOLBAR
        }), true);
        
        window.location.href = VersionControlUrls.getCreatePullRequestUrl(<GitRepositoryContext>this.repositoryContext);
    }
}