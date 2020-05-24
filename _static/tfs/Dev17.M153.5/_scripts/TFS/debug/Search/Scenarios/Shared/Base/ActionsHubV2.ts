import * as _PreviewSettingsPivot from "Search/Scenarios/Shared/Components/PreviewSettingsPivot";
import { IOrganizationInfo } from "Search/Scenarios/Shared/Base/Stores/OrganizationInfoStore";
import * as _SearchSharedContracts from "Search/Scripts/Generated/Search.Shared.Contracts";

import { Action } from "VSS/Flux/Action";

export interface SortOptionChangedPayload<TItem> {
    sortedItems: TItem[];

    sortOption: _SearchSharedContracts.SortOption;
}

export interface SearchFailedPayload {
}

export interface PreviewOrientationChangedPayload {
    previewOrientation: _PreviewSettingsPivot.PreviewSetting;
}

export interface ItemChangedPayload<TItem> {
    item: TItem;

    changedOnNavigation?: boolean;
}

export interface SearchStartedPayload<TRequest extends _SearchSharedContracts.EntitySearchRequest> {
    request: TRequest;

    sortScenario?: boolean;

    filterApplication?: boolean;

    fetchMoreScenario?: boolean;

    searchTextModified?: boolean;
}

export interface ResultsLoadedPayload<TRequest extends _SearchSharedContracts.EntitySearchRequest, TResponse extends _SearchSharedContracts.EntitySearchResponse, TItem> {
    response: TResponse;

    request: TRequest;

    activeItem?: TItem;

    fetchMoreScenario?: boolean;
}

export interface PageInitializationStartedPayload<TRequest extends _SearchSharedContracts.EntitySearchRequest>
    extends SearchStartedPayload<TRequest> {
    activeTabKey?: string;

    isLandingPage?: boolean;
}

export class ActionsHub<TRequest extends _SearchSharedContracts.EntitySearchRequest, TResponse extends _SearchSharedContracts.EntitySearchResponse, TItem> {
    public searchStarted = new Action<SearchStartedPayload<TRequest>>();
    public searchFailed = new Action<SearchFailedPayload>();
    public resultsLoaded = new Action<ResultsLoadedPayload<TRequest, TResponse, TItem>>();
    public pageInitializationStarted = new Action<PageInitializationStartedPayload<TRequest>>();
    public itemChanged = new Action<ItemChangedPayload<TItem>>();
    public sortOptionChanged = new Action<SortOptionChangedPayload<TItem>>();
    public filterPaneVisibilityChanged = new Action<boolean>();
    public previewOrientationChanged = new Action<PreviewOrientationChangedPayload>();
    public organizationInfoLoaded = new Action<IOrganizationInfo>();
    public organizationInfoLoadFailed = new Action<{}>();
    public errorNotificationBannerDismissed = new Action<{}>();
    public filterReset = new Action<{}>();
}
