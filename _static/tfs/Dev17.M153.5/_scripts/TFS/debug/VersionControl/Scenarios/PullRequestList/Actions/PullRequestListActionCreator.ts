import { autobind } from "OfficeFabric/Utilities";
import * as Q from "q";
import * as React from "react";
import * as Actions from "VersionControl/Scenarios/PullRequestList/Actions/ActionsHub";
import { StoresHub } from "VersionControl/Scenarios/PullRequestList/Stores/StoresHub";

import { IArtifactStatsSource } from "VersionControl/Scenarios/PullRequestList/Sources/ArtifactStatsSource";
import { PullRequestListSource, PullRequestListResult } from "VersionControl/Scenarios/PullRequestList/Sources/PullRequestListSource";
import { SourcesHub } from "VersionControl/Scenarios/PullRequestList/Sources/SourcesHub";

import * as UserClaimsService from "VSS/User/Services";
import { GitRepositoryPermissionSet } from "VersionControl/Scenarios/Shared/Permissions/GitPermissionsSource";
import { GitRepositoryPermissions } from "VersionControl/Scripts/Generated/TFS.VersionControl.Common";

import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { RepositoryContext } from "VersionControl/Scripts/RepositoryContext";

import { GitPullRequest } from "TFS/VersionControl/Contracts";
import { PullRequestFilterSearchCriteria } from "VersionControl/Scenarios/PullRequestList/PullRequestListFilter";
import { PullRequestListQueryCriteria } from "VersionControl/Scenarios/PullRequestList/PullRequestListQueryCriteria";
import { NotificationSpecialType } from "VersionControl/Scenarios/PullRequestList/Stores/NotificationStore";
import { PullRequestListStatus } from "VersionControl/Scenarios/PullRequestList/Stores/PullRequestListStore";
import { PullRequestArtifactStats } from "VersionControl/Scenarios/PullRequestList/Stores/PullRequestListUpdatesStore";
import { Notification, NotificationType } from "VersionControl/Scenarios/Shared/Notifications/NotificationStore";
import { CodeHubContributionIds } from "VersionControl/Scripts/CodeHubContributionIds";
import { PullRequestArtifact } from "VersionControl/Scripts/PullRequestArtifact";
import { CodeReviewArtifact } from "VersionControl/Scripts/TFS.VersionControl";
import { onClickNavigationHandler } from "VersionControl/Scripts/Utils/XhrNavigationUtils";

import { PullRequestListTelemetry } from "VersionControl/Scenarios/PullRequestList/PullRequestListTelemetry";
import * as ServerConstants from "Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants";
import * as VCContracts from "TFS/VersionControl/Contracts";
import * as VCPullRequestsControls from "VersionControl/Scripts/Controls/PullRequest";
import { Suggestion } from "VersionControl/Scenarios/Shared/Suggestion";

import * as VersionControlUrls from "VersionControl/Scripts/VersionControlUrls";
import * as Resources_Platform from "VSS/Resources/VSS.Resources.Platform";
import * as VSS_Telemetry from "VSS/Telemetry/Services";
import * as Utils_String from "VSS/Utils/String";
import { Identity } from "VSS/Identities/Contracts";

import * as CustomerIntelligenceConstants from "VersionControl/Scripts/CustomerIntelligenceConstants";
import * as Navigation_Services from "VSS/Navigation/Services";
import { SectionState } from "VersionControl/Scenarios/PullRequestList/Stores/SectionStateStore";

import { Debug } from "VSS/Diag";

interface PullRequestListArtifactCollection {
    artifactToPrId: IDictionaryStringTo<number>;
    pullRequestArtifactIds: string[];
    discussionArtifactIds: string[];
}

interface PullRequestListArtifactIds {
    pullRequest: string;
    discussion: string;
}

/**
 * Number of sections for initial load: Created by me section, Assigned to me section, plus 50 team sections.
 * Make sure all of them are in the data island for initial load.
 * This constant must be in sync with constant in Tfs\Service\WebAccess\VersionControl.Plugins\PullRequest\BaseProviders\PullRequestsListProviderBase.cs
 */
const MAX_SECTIONS_FOR_INITIAL_LOAD = 52;

export class PullRequestListActionCreator {
    private readonly _uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;    

    private _actionsHub: Actions.ActionsHub;
    private _sourcesHub: SourcesHub;
    private _storesHub: StoresHub;

    private _repositoryContext: RepositoryContext;
    private _tfsContext: TfsContext;
    private _telemetry: PullRequestListTelemetry;

    private _featureFlags: IDictionaryStringTo<boolean> = {};

    constructor(repositoryContext: RepositoryContext, tfsContext: TfsContext, actionsHub: Actions.ActionsHub,
        sources: SourcesHub, storesHub: StoresHub, telemetry: PullRequestListTelemetry) {
        this._actionsHub = actionsHub;
        this._sourcesHub = sources;
        this._storesHub = storesHub;
        this._repositoryContext = repositoryContext;
        this._tfsContext = tfsContext;
        this._telemetry = telemetry;
    }

    public getContributionsForTarget(targetId: string, contributionType?: string): void {
        const contributionService = this._sourcesHub.contributionsSource.getContributionsForTarget(targetId, contributionType).then((contributions: Contribution[]) => {
            this._actionsHub.contributionsRetrieved.invoke({
                targetId: targetId,
                contributions: contributions
            });
        }, (err: any) => {
            this._actionsHub.contributionsRetrieved.invoke({
                targetId: targetId,
                contributions: []
            });
        });
    }

    public getInputAction(): string {
        const historyService = Navigation_Services.getHistoryService();
        const currentState = historyService.getCurrentState();
        const inputAction = currentState && currentState.action && currentState.action.toLowerCase();
        return inputAction || "";
    }

    public navigateToTab(contributionTabKey: string, isInitialized: boolean): void {
        this.clearErrors();

        // we cannot always default to the defaultAction since default tab can be hidden for public projects
        // instead we need to default to tabKey from tab contribution since it is a first tab that exists on the page

        let currentAction = this.getInputAction();

        if (currentAction && !VCPullRequestsControls.PullRequestsActions.isActionValid(currentAction)) {
            // if currentAction is not valid, show an error
            this.addError(new Error(Utils_String.format(Resources_Platform.NavigationViewUnknownTabErrorFormat, currentAction)));
        }

        // when currentAction is empty or is not supported fallback to contributionTabKey
        if (!currentAction || !this._storesHub.tabsInfoStore.isTabSupported(currentAction)) {
            currentAction = contributionTabKey;
            this.updateCurrentFilterCriteria(currentAction);
        }
        else if (currentAction === VCPullRequestsControls.PullRequestsActions.MINE) {
            // Clear out the filters when switching to the "mine" tab
            this.updateCurrentFilterCriteria(currentAction);
        }

        // refresh data provider when default action and page already initialized
        const isDefaultTab: boolean = this._storesHub.tabsInfoStore.isDefaultTab(currentAction);
        const refreshDataProvider: boolean = isDefaultTab && isInitialized;

        this.queryTabData(currentAction, refreshDataProvider);
    }

    public setInitialSearchCriteriaFromNavigationState(): IPromise<void> {
        const criteria = {
            creator: null,
            creatorAlias: null,
            creatorId: null,
            reviewer: null,
            reviewerAlias: null,
            reviewerId: null,
        };

        if (!UserClaimsService.getService().hasClaim(UserClaimsService.UserClaims.Member)) {
            // reset filters when not a member
            this.updateCurrentFilterCriteria(this.getInputAction(), {} as PullRequestFilterSearchCriteria);
            return Q.resolve(null);
        }

        let creatorCriteria: Identity = null;
        let reviewerCriteria: Identity = null;
        const currentState = Navigation_Services.getHistoryService().getCurrentState();
        const creatorLookupPromise = this._lookupInitialUserId(currentState.creatorId);
        const reviewerLooiupPromise = this._lookupInitialUserId(currentState.reviewerId);

        return Q.all([creatorLookupPromise, reviewerLooiupPromise]).then(identities => {
            if (identities && identities.length === 2) {
                creatorCriteria = identities[0][0];
                reviewerCriteria = identities[1][0];
            }

            if (creatorCriteria) {
                criteria.creator = creatorCriteria.providerDisplayName;
                criteria.creatorId = creatorCriteria.id;
                criteria.creatorAlias = creatorCriteria.properties.Mail ? creatorCriteria.properties.Mail.$value : "";
            }

            if (reviewerCriteria) {
                criteria.reviewer = reviewerCriteria.providerDisplayName;
                criteria.reviewerId = reviewerCriteria.id;
                criteria.reviewerAlias = reviewerCriteria.properties.Mail ? reviewerCriteria.properties.Mail.$value : "";
            }

            this.applySearchCriteria(criteria, true);
        });
    }

    private _lookupInitialUserId(id: string): IPromise<Identity[]> {
        if (id && this._uuidRegex.test(id)) {
            return this._sourcesHub.identitiesSource.getIdentities([id]);
        }

        return Q.resolve([null]);
    }

    public applySearchCriteria(searchCriteria: PullRequestFilterSearchCriteria, initialLoad: boolean = false): void {
        if (!this._repositoryContext) {
            // search criteria can be applied only on repository level
            return;
        }

        let currentAction = this.getInputAction();

        if (!UserClaimsService.getService().hasClaim(UserClaimsService.UserClaims.Member)) {
            // reset filters when not a member
            this.updateCurrentFilterCriteria(currentAction, {} as PullRequestFilterSearchCriteria);
            return;
        }

        if (initialLoad && (searchCriteria.creatorId || searchCriteria.reviewerId) && currentAction === VCPullRequestsControls.PullRequestsActions.MINE) {
            // in case of initial "mine" tab load stay on "mine" tab and remove search criteria
            // e.g. Open "mine" tab in the new tab should reset the search filter and stay on "mine" tab
            searchCriteria = {} as PullRequestFilterSearchCriteria;
        }

        if (!initialLoad && (searchCriteria.creatorId || searchCriteria.reviewerId) && currentAction === VCPullRequestsControls.PullRequestsActions.MINE) {
            // in case of NOT initial load don't filter the "mine" tab; switch to the "active" tab instead
            currentAction = VCPullRequestsControls.PullRequestsActions.ACTIVE;
        }

        this.updateCurrentFilterCriteria(currentAction, searchCriteria);

        // don't refresh tab data on first load unless extra search criteria was provided
        if (!initialLoad || searchCriteria.creatorId || searchCriteria.reviewerId) {
            this.queryTabData(currentAction, true);
        }
    }

    public updateCurrentFilterCriteria(currentAction: string, criteria?: PullRequestFilterSearchCriteria) {
        const historyService = Navigation_Services.getHistoryService();
        criteria = criteria || {} as PullRequestFilterSearchCriteria;

        historyService.replaceHistoryPoint(currentAction, { creatorId: criteria.creatorId, reviewerId: criteria.reviewerId });
        this._actionsHub.filterCriteriaChanged.invoke(criteria);
    }

    public queryTabData(tabId: string, refreshDataProvider: boolean): void {
        const criterias = this.getQueryCriterias(tabId);
        criterias.forEach(criteria =>
            this._actionsHub.pullRequestListUpdateStarted.invoke({ criteria: criteria, nextPage: false, initialLoad: true }));

        if (refreshDataProvider) {
            this._resetDataProviderAndRefreshQueries(criterias);
        } else {
            this._queryPullRequestsBulkInternal(criterias, true);
        }
    }

    private getQueryCriterias(tabId: string): PullRequestListQueryCriteria[] {
        // get sections for current tab and filter
        const sections = this._storesHub.tabsInfoStore.getSections(tabId);
        // request sections lists
        const expandedSections = sections.filter(s => !s.isCollapsed);
        const collapsedSections = sections.filter(s => s.isCollapsed);

        const sectionsToRequest = (MAX_SECTIONS_FOR_INITIAL_LOAD > expandedSections.length) ?
            expandedSections.concat(collapsedSections.slice(0, MAX_SECTIONS_FOR_INITIAL_LOAD - expandedSections.length))
            : expandedSections;

        return sectionsToRequest.map(section => section.criteria);
    }

    private _queryPullRequestsBulkInternal(criterias: PullRequestListQueryCriteria[], initialLoad: boolean): void {
        const top = PullRequestListQueryCriteria.MaxPullRequestsPerQueryCount;
        const skip = 0;

        const promises = criterias.map(c => this._sourcesHub.pullRequestListSource.queryPullRequestListAsync(c, top, skip));
        Q.allSettled(promises).then(
            (resolutions) => {
                const results: Actions.PullRequestListUpdatedPayload[] = [];
                let rejectionReason = null;
                let queryCountTelemetry: IDictionaryStringTo<any> = { initialLoad: initialLoad };
                // apply client filter on results
                resolutions.forEach(r => {
                    if (r.state === "fulfilled") {
                        const page = this._cutPageSizeAndApplyClientFilter(r.value.criteria, r.value.pullRequests);
                        results.push({
                            criteria: r.value.criteria,
                            pullRequests: page.pullRequests,
                            initialLoad: initialLoad,
                            hasMore: page.hasMore
                        });
                        queryCountTelemetry[r.value.criteria.telemetryGroupName] = page.pullRequests.length;
                    } else if (r.state === "rejected") {
                        rejectionReason = r.reason;
                    }
                });

                if (rejectionReason) {
                    this.addError(rejectionReason);
                }

                // Query the user's custom criteria. The actual results were already grabbed above with everything else
                // but we need the criteria itself to pre-populate the dialog if the user wants to edit their settings
                let customCriteria = this._sourcesHub.pullRequestListSource.getCustomCriteria();
                this._actionsHub.pullRequestListCustomCriteriaUpdated.invoke({ criteria: customCriteria });

                // Query team membership from the data provider (will only exist if needed and only checks the data provider cache)
                let teamMembership = this._sourcesHub.pullRequestListSource.getTeamMemberships().then(teams => {
                    this._actionsHub.pullRequestListTeamMembershipUpdated.invoke({ teams: teams.map(t => t.id) });
                });

                let isDayZeroExperience =
                    results.every(list => list.pullRequests.length === 0) &&
                    this._sourcesHub.pullRequestListSource.getIsDayZeroExperience();

                if (isDayZeroExperience === null) {
                    isDayZeroExperience = this._storesHub.pullRequestListStore.getIsDayZeroExperience();
                }

                // invoke pullRequestListUpdated for all criterias to populate ui asap
                this._actionsHub.pullRequestListBulkUpdated.invoke({
                    pullRequestLists: results,
                    isDayZeroExperience,
                });

                // merge all results into one array
                const allPullRequests = this._mergePullRequestsDistinct(results);

                // load other data async
                this._actionsHub.pullRequestListReviewersUpdated.invoke({ pullRequests: allPullRequests });
                if (allPullRequests && allPullRequests.length > 0) {
                    this.queryPullRequestsArtifactStats(allPullRequests);
                }

                this._telemetry.logListQuery(CustomerIntelligenceConstants.PULL_REQUESTS_LIST_QUERY_RESULTS_FEATURE, queryCountTelemetry);
            },
            (error) => this.addError(error)
        );
    }

    private _mergePullRequestsDistinct(results: PullRequestListResult[]): GitPullRequest[] {
        if (results.length === 1) {
            return results[0].pullRequests;
        }

        const allPullRequests = [];
        const ids: IDictionaryNumberTo<boolean> = {};
        results.forEach(result => {
            result.pullRequests.forEach(pr => {
                if (!ids[pr.pullRequestId]) {
                    ids[pr.pullRequestId] = true;
                    allPullRequests.push(pr);
                }
            });
        });

        return allPullRequests;
    }

    public queryPullRequests(criteria: PullRequestListQueryCriteria, nextPage: boolean = false) {
        const top = PullRequestListQueryCriteria.MaxPullRequestsPerQueryCount;
        const listState = this._storesHub.pullRequestListStore.getPullRequestListState(criteria);
        const skip = nextPage ? listState.pagesLoaded * PullRequestListActionCreator.PageSize : 0;

        this._telemetry.logActivity(CustomerIntelligenceConstants.PULL_REQUESTS_LIST_QUERY_FEATURE, {
            "criteria": criteria.key,
            "loadMore": nextPage,
            "top": top,
            "skip": skip
        });

        this._actionsHub.pullRequestListUpdateStarted.invoke({ criteria: criteria, nextPage: nextPage, initialLoad: false });
        this._sourcesHub.pullRequestListSource.queryPullRequestListAsync(criteria, top, skip)
            .then(result => {
                const page = this._cutPageSizeAndApplyClientFilter(criteria, result.pullRequests);
                this._actionsHub.pullRequestListUpdated.invoke({ criteria: criteria, pullRequests: page.pullRequests, initialLoad: false, hasMore: page.hasMore });
                this._actionsHub.pullRequestListReviewersUpdated.invoke({ pullRequests: page.pullRequests });
                if (page.pullRequests && page.pullRequests.length > 0) {
                    this.queryPullRequestsArtifactStats(page.pullRequests);
                }
            }, error => {
                this.addError(error);
            });
    }

    private static PageSize = PullRequestListQueryCriteria.MaxPullRequestsPerQueryCount - 1;
    private _cutPageSizeAndApplyClientFilter(criteria: PullRequestListQueryCriteria, pullRequestList: GitPullRequest[]): { pullRequests: GitPullRequest[], hasMore: boolean } {
        // hasMore check should be called before applying client filter
        const hasMore = pullRequestList.length > PullRequestListActionCreator.PageSize;
        if (hasMore) {
            pullRequestList.splice(PullRequestListActionCreator.PageSize);
        }
        const pullRequests = criteria.tryApplyClientFilter(pullRequestList);
        return {
            pullRequests: pullRequests,
            hasMore: hasMore
        };
    }

    public queryPullRequestsArtifactStats(pullRequests: GitPullRequest[]) {
        if (!pullRequests || pullRequests.length === 0) {
            return;
        }

        const artifacts = this._getArtifactCollection(pullRequests);
        this._queryPullRequestsArtifactStatsInternal(artifacts);
    }

    private _queryPullRequestsArtifactStatsInternal(artifacts: PullRequestListArtifactCollection) {
        // check PullRequestContribute permissions from repository level page
        const hasPermissionsPromise: IPromise<boolean> = this._repositoryContext
            ? this._checkGitRepositoryPermissions(GitRepositoryPermissions.PullRequestContribute)
            : Q.resolve(true);

        hasPermissionsPromise
            .then(hasPermission => {
                if (hasPermission) {
                    this._sourcesHub.artifactStatsSource.getArtifactStats(artifacts.pullRequestArtifactIds, artifacts.discussionArtifactIds, true)
                        .then(results => {
                            if (results && results.length > 0) {
                                const statsPayload = results.map(artifactStats => {
                                    return {
                                        pullRequestId: artifacts.artifactToPrId[artifactStats.artifactId.toLowerCase()],
                                        artifactStats: artifactStats
                                    };
                                });
                                this._actionsHub.pullRequestListArtifactStatsUpdated.invoke({ pullRequestArtifactStatsList: statsPayload });
                            }
                        })
                        .then(null, error => this.addError(error));
                }
            })
            .then(null, error => this.addError(error));
    }

    private _getArtifactCollection(pullRequests: GitPullRequest[]): PullRequestListArtifactCollection {
        const artifactToPrId: { [key: string]: number } = {};
        const pullRequestArtifactIds: string[] = [];
        const discussionArtifactIds: string[] = [];

        pullRequests.forEach(pr => {
            const artifactIds: PullRequestListArtifactIds = this._getArtifactIds(pr);

            artifactToPrId[artifactIds.pullRequest.toLowerCase()] = pr.pullRequestId;
            artifactToPrId[artifactIds.discussion.toLowerCase()] = pr.pullRequestId;

            pullRequestArtifactIds.push(artifactIds.pullRequest);
            discussionArtifactIds.push(artifactIds.discussion);
        });

        return {
            artifactToPrId: artifactToPrId,
            pullRequestArtifactIds: pullRequestArtifactIds,
            discussionArtifactIds: discussionArtifactIds
        } as PullRequestListArtifactCollection;
    }

    public queryFeatureFlags() {
        if (Object.keys(this._featureFlags).length > 0) {
            this._sourcesHub.featureAvailabilitySource.getFeatureFlags(this._featureFlags).then(
                (features) => {
                    this._actionsHub.setFeatureFlags.invoke({ features: features });
                },
                (error) => {
                    this.addError(error);
                }
            );
        }
    }

    public searchPullRequest(pullRequestId: number) {
        this._actionsHub.pullRequestSearchStarted.invoke(undefined);

        this._sourcesHub.pullRequestListSource.getPullRequestById(pullRequestId).then(
            pullRequest => this._actionsHub.pullRequestFound.invoke(pullRequest),
            error => this._actionsHub.pullRequestSearchError.invoke({ pullRequestId, error }));
    }

    public querySuggestions(): void {
        this._sourcesHub.pullRequestListSource.getPullRequestSuggestion().then(
            suggestion => suggestion && this._actionsHub.addNotification.invoke({
                type: NotificationType.info,
                specialType: NotificationSpecialType.createPullRequestSuggestion,
                specialContent: suggestion,
                isDismissable: true,
            }),
            (error) => {
                Debug.fail((error && error.message) ? error.message : (error + ""));
            }
        );
    }

    public queryPermissions(): void {
        Q.all([
            this._sourcesHub.permissionsSource.queryDefaultGitRepositoryPermissionsAsync(),
            this._sourcesHub.settingsPermissionsSource.querySettingsPermissionsAsync(),
        ])
        .then(
            ([gitRepositoryPermissionSet, settingsPermissions]) =>
                gitRepositoryPermissionSet &&
                settingsPermissions &&
                this._actionsHub.pullRequestListPermissionsUpdated.invoke({
                    gitRepositoryPermissionSet,
                    settingsPermissions,
                }),
            this.addError);
    }

    private _checkGitRepositoryPermissions(permissionToCheck: GitRepositoryPermissions): IPromise<boolean> {
        return this._sourcesHub.permissionsSource.queryDefaultGitRepositoryPermissionsAsync()
            .then((permissionSet: GitRepositoryPermissionSet) => {
                return permissionSet && permissionSet.repository[GitRepositoryPermissions[permissionToCheck]];
            })
            .then(null, error => this.addError(error));
    }

    public addNotification(notification: Notification): void {
        this._actionsHub.addNotification.invoke(notification);
    }

    @autobind
    public addError(error: Error): void {
        if (!error || !error.message) {
            return;
        }

        this._telemetry.logError(CustomerIntelligenceConstants.PULL_REQUESTS_LIST_VIEW_FEATURE, error);

        this._actionsHub.addNotification.invoke({
            message: error.message,
            type: NotificationType.error,
            isDismissable: true,
        });
    }

    public clearErrors(): void {
        this._actionsHub.clearErrors.invoke(null);
    }

    public dismissNotification(notification: Notification): void {
        if (notification.specialType === NotificationSpecialType.createPullRequestSuggestion) {
            const suggestion = <Suggestion>notification.specialContent;
            if (suggestion) {
                this._sourcesHub.pullRequestListSource.dismissCreatePullRequestSuggestion(suggestion);
            }
        }

        this._actionsHub.notificationDismissed.invoke(notification);
    }

    @autobind
    public navigateToNewPullRequestFromZeroDataButton(event: React.MouseEvent<HTMLAnchorElement>): void {
        this.onNavigateToNewPullRequest(CustomerIntelligenceConstants.PULL_REQUEST_CREATE_SOURCEUI_TOOLBAR);
        onClickNavigationHandler(event, CodeHubContributionIds.pullRequestHub, event.currentTarget.href);
    }

    public onNavigateToNewPullRequest(source: string = null): void {
        this._telemetry.logNavigation(CustomerIntelligenceConstants.PULL_REQUESTS_LIST_VIEW_FEATURE, { "SourceUI": source });
    }

    public onLinkNavigation(cidata: IDictionaryStringTo<any>): void {
        this._telemetry.onLinkNavigation(CustomerIntelligenceConstants.PULL_REQUESTS_LIST_LINK_CLICKED_FEATURE, cidata);
    }

    public navigateToUrl(url: string, source: string = null): void {
        this._telemetry.logNavigation(CustomerIntelligenceConstants.PULL_REQUESTS_LIST_VIEW_FEATURE,
            { "SourceUI": source });

        window.location.href = url;
    }

    public navigateToGitAction(action: string, fragment?: string): void {
        let url = VersionControlUrls.getGitActionUrl(this._tfsContext, this._repositoryContext.getRepository().name, action, null);
        if (fragment) {
            url = url + Navigation_Services.getHistoryService().getFragmentActionLink(fragment);
        }
        this.navigateToUrl(url);
    }

    public logActivity(featureName: string, cidata: IDictionaryStringTo<any> = {}): void {
        this._telemetry.logActivity(featureName, cidata);
    }

    public collapseSection(sectionCriteria: PullRequestListQueryCriteria): void {
        this._updateSectionState(sectionCriteria.key, { isCollapsed: true });
    }

    public expandSection(sectionCriteria: PullRequestListQueryCriteria): void {
        const status = this._storesHub.pullRequestListStore.getPullRequestListState(sectionCriteria).status;
        this.logActivity(CustomerIntelligenceConstants.MY_PULL_REQUEST_LIST_EXPAND_FEATURE, {
            "groupName": sectionCriteria.criteriaTitle,
            "groupStatus": status
        });
        if (status === PullRequestListStatus.NotLoaded) {
            this.queryPullRequests(sectionCriteria);
        }
        this._updateSectionState(sectionCriteria.key, { isCollapsed: false });
    }

    private _updateSectionState(key: string, state: SectionState): void {
        this._actionsHub.sectionStateUpdated.invoke({ key: key, sectionState: state });
    }

    private _getArtifactIds(pullRequest: GitPullRequest): PullRequestListArtifactIds {
        const projectGuid: string = pullRequest.repository.project.id;
        const pullRequestId: number = pullRequest.pullRequestId;

        const pullRequestArtifact: PullRequestArtifact = new PullRequestArtifact({
            projectGuid: projectGuid,
            repositoryId: pullRequest.repository.id,
            pullRequestId: pullRequestId
        });

        const discussionArtifact: CodeReviewArtifact = new CodeReviewArtifact({
            projectGuid: projectGuid,
            pullRequestId: pullRequestId,
            codeReviewId: pullRequest.codeReviewId,
            supportsIterations: pullRequest.supportsIterations
        });

        return {
            pullRequest: pullRequestArtifact.getUri(),
            discussion: discussionArtifact.getUri()
        } as PullRequestListArtifactIds;
    }

    @autobind
    public updateSectionCriteria(sectionId: string, sectionCriteria: PullRequestListQueryCriteria) {
        // Save this custom criteria under user preferences and then refresh the data provider to get the new results
        this._actionsHub.pullRequestListUpdateStarted.invoke({ criteria: sectionCriteria, nextPage: false, initialLoad: true });
        this._sourcesHub.pullRequestListSource.saveCustomCriteria(sectionCriteria).then(() => {
            this._resetDataProviderAndRefreshQueries([sectionCriteria]);
        });
    }

    private _resetDataProviderAndRefreshQueries(criterias: PullRequestListQueryCriteria[]): void {
        this._sourcesHub.pullRequestListSource.resetCache();
        this._sourcesHub.dataProviderSource.refresh().then
            (
            () => {
                this._queryPullRequestsBulkInternal(criterias, true);
            },
            (error) => {
                this.addError(error);
            }
            );
    }
}