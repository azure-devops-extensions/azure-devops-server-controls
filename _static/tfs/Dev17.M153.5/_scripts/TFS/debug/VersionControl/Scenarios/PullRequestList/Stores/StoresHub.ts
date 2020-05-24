import * as Actions from "VersionControl/Scenarios/PullRequestList/Actions/ActionsHub";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { ContributionsStore } from "VersionControl/Scenarios/PullRequestList/Stores/ContributionsStore";
import { PullRequestListStore } from "VersionControl/Scenarios/PullRequestList/Stores/PullRequestListStore";
import { PullRequestListUpdatesStore } from "VersionControl/Scenarios/PullRequestList/Stores/PullRequestListUpdatesStore";
import { TabsInfoStore } from "VersionControl/Scenarios/PullRequestList/Stores/TabsInfoStore";
import { FeatureAvailabilityStore } from "VersionControl/Scenarios/Shared/Stores/FeatureAvailabilityStore";
import { NotificationStore } from "VersionControl/Scenarios/PullRequestList/Stores/NotificationStore";
import { PullRequestListReviewersStore } from "VersionControl/Scenarios/PullRequestList/Stores/PullRequestListReviewersStore";
import { SearchPullRequestStore } from "VersionControl/Scenarios/PullRequestList/Stores/SearchPullRequestStore";
import { SectionStateStore } from "VersionControl/Scenarios/PullRequestList/Stores/SectionStateStore";
import { PullRequestListPermissionsStore } from "VersionControl/Scenarios/PullRequestList/Stores/PullRequestListPermissionsStore";

import { RepositoryContext } from "VersionControl/Scripts/RepositoryContext";

export class StoresHub {
    public contributionsStore: ContributionsStore;
    public pullRequestListStore: PullRequestListStore;
    public updatesStore: PullRequestListUpdatesStore;
    public featureAvailabilityStore: FeatureAvailabilityStore;
    public reviewersStore: PullRequestListReviewersStore;
    public searchPullRequestStore: SearchPullRequestStore;
    public tabsInfoStore: TabsInfoStore;
    public notificationStore: NotificationStore;
    public sectionStateStore: SectionStateStore;
    public permissionsStore: PullRequestListPermissionsStore;

    constructor(actionsHub: Actions.ActionsHub, tfsContext: TfsContext, repositoryContext: RepositoryContext) {

        this.contributionsStore = new ContributionsStore();
        actionsHub.contributionsRetrieved.addListener(payload => this.contributionsStore.onContributionsRetrieved(payload.targetId, payload.contributions));

        this.pullRequestListStore = new PullRequestListStore(repositoryContext);
        actionsHub.pullRequestListUpdated.addListener(payload => this.pullRequestListStore.onPullRequestListUpdated(payload));
        actionsHub.pullRequestListUpdateStarted.addListener(payload => 
            this.pullRequestListStore.onPullRequestListUpdateStarted(payload.criteria, payload.nextPage, payload.initialLoad));
        actionsHub.pullRequestListBulkUpdated.addListener(this.pullRequestListStore.onPullRequestListUpdatedBulk);
        actionsHub.pullRequestListCustomCriteriaUpdated.addListener(payload => this.pullRequestListStore.onCustomCriteriaUpdated(payload.criteria));
        actionsHub.pullRequestListTeamMembershipUpdated.addListener(payload => this.pullRequestListStore.onTeamMembershipUpdated(payload.teams));

        this.updatesStore = new PullRequestListUpdatesStore();
        actionsHub.pullRequestListArtifactStatsUpdated.addListener(payload => this.updatesStore.updatePullRequestArtifactStats(payload.pullRequestArtifactStatsList));

        this.featureAvailabilityStore = new FeatureAvailabilityStore();
        actionsHub.setFeatureFlags.addListener(payload => this.featureAvailabilityStore.onFeatureFlagEnabledUpdated(payload));

        this.reviewersStore = new PullRequestListReviewersStore(tfsContext);
        actionsHub.pullRequestListReviewersUpdated.addListener(payload => this.reviewersStore.onPullRequestsListUpdated(payload.pullRequests));

        this.tabsInfoStore = new TabsInfoStore(tfsContext);
        actionsHub.tabInfoUpdated.addListener((payload) => this.tabsInfoStore.onTabInfoUpdated(payload.tabs));
        actionsHub.filterCriteriaChanged.addListener((payload) => this.tabsInfoStore.onFilterCriteriaChanged(payload));

        this.searchPullRequestStore = new SearchPullRequestStore();
        actionsHub.pullRequestSearchStarted.addListener(this.searchPullRequestStore.startSearch);
        actionsHub.pullRequestFound.addListener(this.searchPullRequestStore.findPullRequest);
        actionsHub.pullRequestSearchError.addListener(this.searchPullRequestStore.failSearch);

        this.notificationStore = new NotificationStore();
        actionsHub.addNotification.addListener(this.notificationStore.add);
        actionsHub.notificationDismissed.addListener(this.notificationStore.dismiss);
        actionsHub.clearErrors.addListener(this.notificationStore.clearErrors);
        actionsHub.pullRequestSearchError.addListener(this.notificationStore.failSearch);

        this.sectionStateStore = new SectionStateStore();
        actionsHub.sectionStateUpdated.addListener(payload => this.sectionStateStore.updateSectionState(payload.key, payload.sectionState));
        actionsHub.pullRequestListUpdateStarted.addListener(payload => payload.nextPage && this.sectionStateStore.updateLatestLoadMoreSection(payload.criteria.key));

        this.permissionsStore = new PullRequestListPermissionsStore();
        actionsHub.pullRequestListPermissionsUpdated.addListener(this.permissionsStore.onPermissionsUpdated);
    }
}
