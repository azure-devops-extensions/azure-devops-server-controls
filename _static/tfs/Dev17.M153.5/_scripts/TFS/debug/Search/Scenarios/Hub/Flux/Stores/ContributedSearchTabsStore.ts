import * as VSSStore from "VSS/Flux/Store";
import * as Contributions_Contracts from "VSS/Contributions/Contracts";
import { RelationFromExactCount } from "Search/Scripts/Generated/Search.SharedLegacy.Contracts";
import { SearchContributedTabsPayload, ProviderImplementationChangeStartedPayload, SearchContributedTabsLoadFailedPayload, ResultsCountPayLoad, ReceiveResultsCountFailedPayLoad } from "Search/Scenarios/Hub/Flux/ActionsHub";
import { CountFormat } from "Search/Scenarios/Shared/Components/PivotContainer/PivotContainer.Props";
import { ignoreCaseComparer } from "VSS/Utils/String";

export interface PivotTabInfo {
    contributionInfo: Contributions_Contracts.Contribution;

    count?: number;

    countFormat?: CountFormat;
}

export interface ContributedSearchTabsStoreState {
    availableTabs: PivotTabInfo[];

    selectedTabId: string;

    error?: any;
}

export class ContributedSearchTabsStore extends VSSStore.Store {
    private _state = { availableTabs: [] } as ContributedSearchTabsStoreState;

    public get state(): ContributedSearchTabsStoreState {
        return this._state;
    }

    public loadContributedSearchTabs = (payload: SearchContributedTabsPayload): void => {
        this._state.availableTabs = payload.providers.map<PivotTabInfo>(provider => {
            return {
                contributionInfo: provider,
                count: undefined,
                countFormat: undefined
            }
        });

        this._state.selectedTabId = payload.selectedProviderId;

        this.emitChanged();
    }

    public onLoadFailed = (payload: SearchContributedTabsLoadFailedPayload): void => {
        this._state.availableTabs = [];
        this._state.selectedTabId = "";
        this._state.error = payload.error;
        this.emitChanged();
    }

    public changeSelectedTab = (payload: ProviderImplementationChangeStartedPayload): void => {
        this._state.selectedTabId = payload.providerId;
        this.emitChanged();
    }

    public updatePivotCount = (payload: ResultsCountPayLoad): void => {
        for (let entityResult of payload.entityResults) {
            for (let tab of this._state.availableTabs) {
                if (ignoreCaseComparer(tab.contributionInfo.id, entityResult.entityId) === 0) {
                    const { count, relationFromExactCount, isEntityActive } = entityResult;
                    tab.count = count;
                    tab.countFormat = isEntityActive
                        ? CountFormat.ToNearest
                        : relationFromExactCount === RelationFromExactCount.LessThanEqualTo
                            ? CountFormat.LessThanEqualTo
                            : CountFormat.None;
                }
            }
        }

        this.emitChanged();
    }

    /**
    * Reset pivot count if:
    * 1. resultsCount failed for currently selected tab, then reset for current tab only
    * 2. resultsCount failed for inactive entity, then reset count for all tabs except currently selected tab
    */
    public resetPivotCount = (payload: ReceiveResultsCountFailedPayLoad): void => {
        for (let tab of this._state.availableTabs) {
            const isTabSelected: boolean = ignoreCaseComparer(tab.contributionInfo.id, this._state.selectedTabId) === 0;
            /**
            * reset count if resultsCount failed for selected entity and this is the selected entity or
            * resultsCount failed for inactive entity and this is one of the inactive tabs.
            */
            if (payload.isActiveEntity === isTabSelected) {

                tab.count = tab.countFormat = undefined;
            }
        }

        this.emitChanged();
    }
}