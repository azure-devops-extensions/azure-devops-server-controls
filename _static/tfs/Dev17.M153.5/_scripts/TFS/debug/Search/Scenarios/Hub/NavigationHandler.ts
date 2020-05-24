import { ActionCreator, getEntityId } from "Search/Scenarios/Hub/Flux/ActionCreator";
import { ContributedSearchTabsStoreState } from "Search/Scenarios/Hub/Flux/Stores/ContributedSearchTabsStore";
import { ignoreCaseComparer } from "VSS/Utils/String";

export interface UrlParams {
    text: string;

    type: string;

    filters?: string;

    sortOptions?: string;

    result?: string;

    action?: string;

    lp?: string;
}

export function applyNavigatedUrl(
    actionCreator: ActionCreator,
    rawState: UrlParams,
    state: ContributedSearchTabsStoreState): void {
    const isFirstTime = !state.availableTabs || state.availableTabs.length <= 0;

    if (isFirstTime) {
        actionCreator.intializePage(rawState);

        return;
    }

    const { selectedTabId, availableTabs } = state;
    const contributions = availableTabs.map(tab => tab.contributionInfo);
    const providerIdInUrl = getEntityId(rawState.type, contributions) || contributions[0].id;
    const needsProviderUpdation: boolean = ignoreCaseComparer(providerIdInUrl, selectedTabId) !== 0;

    if (needsProviderUpdation) {
        actionCreator.changeSearchProvider(providerIdInUrl);
    }
    else {
        actionCreator.navigateToProvider(rawState);
    }
}