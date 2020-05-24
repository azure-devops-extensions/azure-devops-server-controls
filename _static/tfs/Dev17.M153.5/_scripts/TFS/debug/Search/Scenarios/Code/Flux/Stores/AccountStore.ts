import * as VSSStore from "VSS/Flux/Store";
import * as _CodeContracts from "Search/Scenarios/WebApi/Code.Contracts";
import * as _SharedContracts from "Search/Scripts/Generated/Search.SharedLegacy.Contracts";
import * as Constants from "Search/Scenarios/Code/Constants";
import { TenantQueryFailedPayload, TenantResultsLoadedPayload, TenantQueryStartedPayload } from "Search/Scenarios/Code/Flux/ActionsHub";
import { areFiltersEqual } from "Search/Scenarios/Shared/Utils";
import { LoadState } from "Search/Scenarios/Shared/Components/DropdownMenu/DropdownMenu.Props";
import { ignoreCaseComparer } from "VSS/Utils/String";

export interface AccountStoreState {
    items: _SharedContracts.Filter[];

    searchQuery: _CodeContracts.SearchQuery;

    loadState: LoadState;

    active: boolean;
}

export class AccountStore extends VSSStore.Store {
    public state: AccountStoreState = { items: [], active: false } as AccountStoreState;

    public resetState = (): void => {
        this.state = { items: [], active: false } as AccountStoreState;
        this.emitChanged();
    }

    public toggleCrossAccountMenu = (): void => {
        this.state.active = !this.state.active;
        this.emitChanged();
    }

    public onLoading = (payload: TenantQueryStartedPayload): void => {
        this.state.loadState = LoadState.Loading;
        this.state.searchQuery = payload.query;
        this.emitChanged();
    }

    public dismissCrossAccountMenu = (): void => {
        this.state.active = false;
        this.emitChanged();
    }

    public onLoadFailed = (payload: TenantQueryFailedPayload): void => {
        const { query } = payload;
        if (this.areSearchQueriesEqual(this.state.searchQuery, query)) {
            this.state.loadState = LoadState.LoadFailed;
            this.emitChanged();
        }
    }

    public updateAccounts = (payload: TenantResultsLoadedPayload): void => {
        const { response } = payload;
        if (this.areSearchQueriesEqual(this.state.searchQuery, response.query)) {
            const accountFilterCategory = response
                .filterCategories
                .filter(c => ignoreCaseComparer(c.name, Constants.FilterKeys.AccountFilterKey) === 0)[0];
            this.state.loadState = LoadState.Loaded;
            this.state.items = !!accountFilterCategory ? accountFilterCategory.filters : [];
            this.emitChanged();
        }
    }

    private areSearchQueriesEqual(query1: _CodeContracts.SearchQuery, query2: _CodeContracts.SearchQuery): boolean {
        return (areFiltersEqual(query1.searchFilters, query2.searchFilters) &&
            (query1.searchText === query2.searchText));
    }
}
