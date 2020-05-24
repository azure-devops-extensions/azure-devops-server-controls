import * as _SearchSharedLegacy from "Search/Scripts/Generated/Search.SharedLegacy.Contracts";
import * as Contributions_Contracts from "VSS/Contributions/Contracts";
import { Action } from "VSS/Flux/Action";
import { ContributedSearchTab } from "Search/Scenarios/Shared/Base/ContributedSearchTab";

const HUB_ACTION_CONTEXT = "HUB_ACTION_CONTEXT"

export interface ProviderImplementationLoadedPayload {
    provider: ContributedSearchTab;

    providerId: string;
}

export interface ProviderImplementationChangeStartedPayload {
    providerId: string;
}

export interface ProviderImplementationLoadFailedPayload {
    providerId: string;

    error: any;
}

export interface SearchContributedTabsPayload {
    providers: Contributions_Contracts.Contribution[];

    selectedProviderId: string;
}

export interface IEntityResultCount {
    entityId: string;

    count: number;

    relationFromExactCount: _SearchSharedLegacy.RelationFromExactCount;

    isEntityActive: boolean;
}

export interface ResultsCountPayLoad {
    entityResults: IEntityResultCount[];
}

export interface SearchContributedTabsLoadFailedPayload {
    error: any;
}

export interface ReceiveResultsCountFailedPayLoad {
    error: any;
    isActiveEntity: boolean;
}

export class ActionsHub {
    public contributedSearchTabsLoaded = new Action<SearchContributedTabsPayload>(HUB_ACTION_CONTEXT);
    public contributedSearchTabsLoadFailed = new Action<SearchContributedTabsLoadFailedPayload>(HUB_ACTION_CONTEXT);
    public providerImplementationLoaded = new Action<ProviderImplementationLoadedPayload>(HUB_ACTION_CONTEXT);
    public providerImplementationLoadFailed = new Action<ProviderImplementationLoadFailedPayload>(HUB_ACTION_CONTEXT);
    public providerImplementationChangeStarted = new Action<ProviderImplementationChangeStartedPayload>(HUB_ACTION_CONTEXT);
    public activeEntityResultsCountReceived = new Action<ResultsCountPayLoad>(HUB_ACTION_CONTEXT);
    public inactiveEntityResultsCountReceived = new Action<ResultsCountPayLoad>(HUB_ACTION_CONTEXT);
    public activeEntityReceiveResultsCountFailed = new Action<ReceiveResultsCountFailedPayLoad>(HUB_ACTION_CONTEXT);
    public inactiveEntityReceiveResultsCountFailed = new Action<ReceiveResultsCountFailedPayLoad>(HUB_ACTION_CONTEXT);
}
