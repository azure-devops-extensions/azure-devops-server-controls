import { Action } from "VSS/Flux/Action";

import * as PivotView from "Presentation/Scripts/TFS/Components/PivotView";
import { GitPullRequest } from "TFS/VersionControl/Contracts";
import { PullRequestSummaryDetails } from "VersionControl/Scenarios/PullRequestList/PullRequestListDataModel";
import { PullRequestFilterSearchCriteria } from "VersionControl/Scenarios/PullRequestList/PullRequestListFilter";
import { PullRequestListQueryCriteria } from "VersionControl/Scenarios/PullRequestList/PullRequestListQueryCriteria";
import { PullRequestListPermissionsSet } from "VersionControl/Scenarios/PullRequestList/Stores/PullRequestListPermissionsStore";
import { PullRequestArtifactStats } from "VersionControl/Scenarios/PullRequestList/Stores/PullRequestListUpdatesStore";
import { SectionState } from "VersionControl/Scenarios/PullRequestList/Stores/SectionStateStore";
import { TabInfo } from "VersionControl/Scenarios/PullRequestList/Stores/TabsInfoStore";
import { Notification } from "VersionControl/Scenarios/Shared/Notifications/NotificationStore";

export class ActionsHub {
    // contributions actions
    public contributionsRetrieved = new Action<ContributionsRetrievedPayload>();

    // tabs info actions
    public tabInfoUpdated = new Action<TabInfoUpdatedPayload>();
    public filterCriteriaChanged = new Action<PullRequestFilterSearchCriteria>();

    // pullRequestList actions
    public pullRequestListUpdated = new Action<PullRequestListUpdatedPayload>();
    public pullRequestListBulkUpdated = new Action<PullRequestListUpdatedBulkPayload>();
    public pullRequestListUpdateStarted = new Action<PullRequestListUpdateStartedPayload>();
    public pullRequestListArtifactStatsUpdated = new Action<PullRequestListArtifactStatsUpdatedPayload>();
    public pullRequestListReviewersUpdated = new Action<PullRequestListReviewersUpdatedPayload>();
    public pullRequestListPermissionsUpdated = new Action<PullRequestListPermissionsSet>();

    // customization
    public pullRequestListCustomCriteriaUpdated = new Action<PullRequestListCustomCriteriaPayload>();
    public pullRequestListTeamMembershipUpdated = new Action<PullRequestListTeamMembershipPayload>();

    // feature flag actions
    public setFeatureFlags = new Action<SetFeatureFlagsPayload>();

    // search pull request actions
    public pullRequestSearchStarted = new Action<{}>();
    public pullRequestFound = new Action<GitPullRequest>();
    public pullRequestSearchError = new Action<PullRequestSearchErrorPayload>();

    // notifications
    public notificationDismissed = new Action<Notification>();
    public addNotification = new Action<Notification>();
    public clearErrors = new Action<void>();

    // PivotView actions
    public pivotViewActions = new PivotView.ActionsHub();

    // section state
    public sectionStateUpdated = new Action<SectionStateUpdatedPayload>();
}

export interface ContributionsRetrievedPayload {
    targetId: string;
    contributions: Contribution[];
}

export interface PullRequestListUpdatedPayload {
    /** results of server query */
    pullRequests: GitPullRequest[];
    /** query criteria */
    criteria: PullRequestListQueryCriteria;
    /** is loaded from cache/dataIsland */
    initialLoad: boolean;
    /** has more pull requests */
    hasMore: boolean;
}

/** event payload for bulk update */
export interface PullRequestListUpdatedBulkPayload {
    pullRequestLists: PullRequestListUpdatedPayload[];
    isDayZeroExperience: boolean;
}

export interface PullRequestListReviewersUpdatedPayload {
    /** results of server query */
    pullRequests: GitPullRequest[];
}

export interface PullRequestListUpdateStartedPayload {
    /** query criteria */
    criteria: PullRequestListQueryCriteria;
    /** determines whether we load next page or updating first page */
    nextPage: boolean;
    /** determines whether we load list on refresh */
    initialLoad: boolean;
}

export interface PullRequestListArtifactStatsUpdatedPayload {
    /** artifact stats per pull request */
    pullRequestArtifactStatsList: PullRequestArtifactStats[];
}

export interface PullRequestListCustomCriteriaPayload {
    criteria: PullRequestListQueryCriteria;
}

export interface PullRequestListTeamMembershipPayload {
    teams: string[];
}

/** feature flags toggles */
export interface SetFeatureFlagsPayload {
    features: IDictionaryStringTo<boolean>;
}

export interface TabInfoUpdatedPayload {
    tabs: TabInfo[];
}

export interface PullRequestSearchErrorPayload {
    pullRequestId: number;
    error: Error;
}

/** Section state */
export interface SectionStateUpdatedPayload {
    key: string;
    sectionState: SectionState;
}