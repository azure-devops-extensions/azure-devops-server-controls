import * as VSSStore from "VSS/Flux/Store";
import * as Utils_String from "VSS/Utils/String";
import { IdentityRef } from "VSS/WebApi/Contracts";
import { ActionsHub } from "VersionControl/Scenarios/ChangeDetails/GitCommit/ActionsHub";
import { PullRequestCardInfo } from "VersionControl/Scenarios/Shared/PullRequest/PullRequestCardDataModel";

export enum IdentitesFetchedState {
    Fetched,
    NotFetched,
    Failed
}

export interface PullRequestInfo {
    pullRequestCardsInfo: PullRequestCardInfo[],
    defaultBranchPrIndex: number
}
/**
 * A store containing the Pull Request data associated with the commit
 */
export class PullRequestStatsStore extends VSSStore.RemoteStore {
    private _state: PullRequestInfo;
    private _identitiesFetchedState: IdentitesFetchedState;

    constructor(private _actionsHub: ActionsHub) {
        super();
        this._state = {
            pullRequestCardsInfo: undefined,
            defaultBranchPrIndex: -1
        }
        this._identitiesFetchedState = IdentitesFetchedState.NotFetched;
        this._actionsHub.pullRequestsDataLoaded.addListener(this._loadPullRequestsData);
        this._actionsHub.identitiesForPRDataFetched.addListener(this._identitiesForPRDataFetched);
        this._actionsHub.identitiesForPRDataFailed.addListener(this._identitesForPRDataFailed);
        this._actionsHub.defaultBranchPrFound.addListener(this._defaultBranchPrIndexFound);
    }

    public get state(): PullRequestInfo {
        return this._state;
    }

    public get identitiesFetchedState(): IdentitesFetchedState {
        return this._identitiesFetchedState;
    }

    public dispose(): void {
        if (this._actionsHub) {
            this._actionsHub.pullRequestsDataLoaded.removeListener(this._loadPullRequestsData);
            this._actionsHub.identitiesForPRDataFetched.removeListener(this._identitiesForPRDataFetched);
            this._actionsHub.identitiesForPRDataFailed.removeListener(this._identitesForPRDataFailed);
            this._actionsHub.defaultBranchPrFound.removeListener(this._defaultBranchPrIndexFound);
            this._actionsHub = null;
        }

        this._state = null;
    }

    private _loadPullRequestsData = (pullRequestsDataPayload: PullRequestCardInfo[]): void => {
        if (pullRequestsDataPayload) {
            this._state.pullRequestCardsInfo = pullRequestsDataPayload;
        }
        this._loading = false;
        this.emitChanged();
    }

    private _identitiesForPRDataFetched = (identities: IdentityRef[]): void => {
        if (this._state && identities && identities.length > 0) {

            this._state.pullRequestCardsInfo = this._state.pullRequestCardsInfo.map((prCardInfo) => {
                const createdById = prCardInfo.gitPullRequest.createdBy.id;
                const createdBy: IdentityRef = identities.filter((idRef) => { return idRef.id === createdById; })[0];
                prCardInfo.gitPullRequest.createdBy = createdBy;
                prCardInfo.authorDisplayName = Utils_String.htmlEncode(createdBy.displayName);
                return prCardInfo;
            });
            this._identitiesFetchedState = IdentitesFetchedState.Fetched;
            this.emitChanged();
        }

    }

    private _identitesForPRDataFailed = (): void => {
        this._identitiesFetchedState = IdentitesFetchedState.Failed;
        this.emitChanged();
    }

    private _defaultBranchPrIndexFound = (index: number): void => {
        this._state.defaultBranchPrIndex = index;
        this.emitChanged();
    }
}
