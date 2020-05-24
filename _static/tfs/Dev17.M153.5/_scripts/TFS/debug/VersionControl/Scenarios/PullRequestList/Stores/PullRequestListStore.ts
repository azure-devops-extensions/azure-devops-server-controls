import { autobind } from "OfficeFabric/Utilities";
import * as VSSStore from "VSS/Flux/Store";

import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { RepositoryContext } from "VersionControl/Scripts/RepositoryContext";
import { GitRepositoryContext } from "VersionControl/Scripts/GitRepositoryContext";
import { PullRequestCardInfo } from "VersionControl/Scenarios/Shared/PullRequest/PullRequestCardDataModel";
import * as VCContracts from "TFS/VersionControl/Contracts";
import * as VersionControlUrls from "VersionControl/Scripts/VersionControlUrls";
import { PullRequestListQueryCriteria } from "VersionControl/Scenarios/PullRequestList/PullRequestListQueryCriteria";
import { PullRequestStatus } from "TFS/VersionControl/Contracts";
import { PullRequestListUpdatedPayload, PullRequestListUpdatedBulkPayload } from "VersionControl/Scenarios/PullRequestList/Actions/ActionsHub";

export enum PullRequestListStatus {
    Updating = 0,
    LoadingMore = 1,
    Loaded = 2,
    NotLoaded = 3
}

export class PullRequestListStore extends VSSStore.Store {
    private _repositoryContext: RepositoryContext;

    private _pullRequestsByCriteria: IDictionaryStringTo<PullRequestListState>;
    private _customCriteria: PullRequestListQueryCriteria;
    private _userTeams: string[];
    private _isDayZeroExperience: boolean;

    constructor(repositoryContext: RepositoryContext) {
        super();

        this._repositoryContext = repositoryContext;
        this._pullRequestsByCriteria = {};
        this._userTeams = [];
    }

    public onPullRequestListUpdateStarted(criteria: PullRequestListQueryCriteria, nextPage: boolean, initialLoad: boolean) {
        const key = criteria.key;

        if (!this._pullRequestsByCriteria[key]) {
            this._pullRequestsByCriteria[key] = initializeListState([], PullRequestListStatus.Updating, false, initialLoad);
        } else {
            this._pullRequestsByCriteria[key].status = nextPage ? PullRequestListStatus.LoadingMore : PullRequestListStatus.Updating;
        }

        this.emitChanged();
    }

    public onPullRequestListUpdated(updatedListPayload: PullRequestListUpdatedPayload): void {
        if (this._updatePullRequestList(updatedListPayload)) {
            this.emitChanged();
        }
    }

    @autobind
    public onPullRequestListUpdatedBulk(payload: PullRequestListUpdatedBulkPayload): void {
        const hasChangedDayZero = this._isDayZeroExperience !== payload.isDayZeroExperience;
        this._isDayZeroExperience = payload.isDayZeroExperience;

        const haveChangedPRs = payload.pullRequestLists
            .map(this._updatePullRequestList)
            .some(hasChanged => hasChanged);

        if (hasChangedDayZero || haveChangedPRs) {
            this.emitChanged();
        }
    }

    @autobind
    private _updatePullRequestList(updatedListPayload: PullRequestListUpdatedPayload): boolean {
        const key = updatedListPayload.criteria.key;

        if (!this._pullRequestsByCriteria[key] || this._pullRequestsByCriteria[key].status === PullRequestListStatus.Loaded) {
            return false;
        }

        const summaries = updatedListPayload.pullRequests.map(pr => new PullRequestCardInfo(pr, this._repositoryContext));

        if (this._pullRequestsByCriteria[key].status === PullRequestListStatus.Updating) {
            this._pullRequestsByCriteria[key] = initializeListState(summaries, PullRequestListStatus.Loaded, updatedListPayload.hasMore, updatedListPayload.initialLoad);
        }
        else {
            // next page loaded
            this._pullRequestsByCriteria[key] = addNewPage(this._pullRequestsByCriteria[key], summaries, PullRequestListStatus.Loaded, updatedListPayload.hasMore, updatedListPayload.initialLoad);
        }

        return true;
    }

    public getPullRequestListState(criteria: PullRequestListQueryCriteria): PullRequestListState {
        return this._pullRequestsByCriteria[criteria.key] || DefaultListState;
    }

    public getStoreState(): IDictionaryStringTo<PullRequestListState> {
        return this._pullRequestsByCriteria;
    }

    public getNewPullRequestUrl(): string {
        return VersionControlUrls.getCreatePullRequestUrl(this._repositoryContext as GitRepositoryContext);
    }

    public getIsDayZeroExperience(): boolean {
        return this._isDayZeroExperience;
    }

    public onCustomCriteriaUpdated(customCriteria: PullRequestListQueryCriteria): void {
        this._customCriteria = customCriteria;
        this.emitChanged();
    }

    public customCriteria(): PullRequestListQueryCriteria {
        return this._customCriteria;
    }

    public onTeamMembershipUpdated(teams: string[]): void {
        this._userTeams = teams;
        this.emitChanged();
    }

    public getTeamMembership(): string[] {
        return this._userTeams;
    }
}

export interface PullRequestListState {
    items: PullRequestCardInfo[];
    pagesLoaded: number;
    status: PullRequestListStatus;
    initialLoad: boolean;
    hasMore: boolean;
    lastPageStartIndex: number;
    ids: IDictionaryNumberTo<boolean>;
}

export const DefaultListState: PullRequestListState = {
    items: null,
    status: PullRequestListStatus.NotLoaded,
    pagesLoaded: 0,
    hasMore: false,
    initialLoad: false,
    lastPageStartIndex: -1,
    ids: null
};

// Class encapsulates merge logic for pullRequests pagination, and status of PullRequestList by criteria
function initializeListState(list: PullRequestCardInfo[], status: PullRequestListStatus, hasMore: boolean, initialLoad: boolean): PullRequestListState {
    const state = {
        status: status,
        initialLoad: initialLoad,
        hasMore: hasMore,
        pagesLoaded: status === PullRequestListStatus.Loaded ? 1 : 0,
        items: [],
        lastPageStartIndex: 0,
        ids: {}
    };
    return mergeNewItems(state, list);
}

function addNewPage(state: PullRequestListState, list: PullRequestCardInfo[], status: PullRequestListStatus, hasMore: boolean, initialLoad: boolean): PullRequestListState {
    state.status = status;
    state.pagesLoaded++;
    state.hasMore = hasMore;
    state.initialLoad = initialLoad;
    return mergeNewItems(state, list);
}

function mergeNewItems(state: PullRequestListState, items: PullRequestCardInfo[]): PullRequestListState {
    const newItems = [];
    items.forEach(item => {
        if (!state.ids[item.gitPullRequest.pullRequestId]) {
            state.ids[item.gitPullRequest.pullRequestId] = true;
            newItems.push(item);
        }
    });

    const newPageStartIndex = newItems.length ? state.items.length : state.items.length - 1;

    state.items = state.items.concat(newItems);
    state.lastPageStartIndex = newPageStartIndex;
    return state;
}

