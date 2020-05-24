import * as _PreviewSettingsPivot from "Search/Scenarios/Shared/Components/PreviewSettingsPivot";
import { IOrganizationInfo } from "Search/Scenarios/Shared/Base/Stores/OrganizationInfoStore";
import * as _SearchSharedContracts from "Search/Scripts/Generated/Search.SharedLegacy.Contracts";
import { Action } from "VSS/Flux/Action";

export enum SearchSourceType {
    DataProvider,

    RestApi
}

export interface SearchSourceResponse {
    responseWithActivityId: _SearchSharedContracts.EntitySearchResponseWithActivityId;

    source: SearchSourceType;
}

export interface SearchStartedPayload<TQuery extends _SearchSharedContracts.EntitySearchQuery> {
    query: TQuery;

    sortScenario?: boolean;

    filterApplication?: boolean;

    fetchMoreScenario?: boolean;

    searchTextModified?: boolean;
}

export interface ResultsLoadedPayload<TResponse extends _SearchSharedContracts.EntitySearchResponse, TItem> {
    response: TResponse;

    activeItem: TItem;

    activityId: string;

    source: SearchSourceType;
}

export interface ItemChangedPayload<TItem> {
    item: TItem;

    changedOnNavigation?: boolean;
}

export interface SortOptionChangedPayload<TItem> {
    sortedItems: TItem[];

    sortOption: _SearchSharedContracts.EntitySortOption;
}

export interface SearchFailedPayload<TQuery extends _SearchSharedContracts.EntitySearchQuery> {
    error: any;
    
    activityId: string;

    query: TQuery;
}

export interface PreviewOrientationChangedPayload {
    previewOrientation: _PreviewSettingsPivot.PreviewSetting;
}

export interface PageInitializationStartedPayload<TQuery extends _SearchSharedContracts.EntitySearchQuery>
    extends SearchStartedPayload<TQuery> {
    activeTabKey?: string;

    isLandingPage?: boolean;

    launchPoint?: string;
}

export class ActionsHub<TQuery extends _SearchSharedContracts.EntitySearchQuery, TResponse extends _SearchSharedContracts.EntitySearchResponse, TItem> {
    public searchStarted = new Action<SearchStartedPayload<TQuery>>();
    public searchFailed = new Action<SearchFailedPayload<TQuery>>();
    public resultsLoaded = new Action<ResultsLoadedPayload<TResponse, TItem>>();
    public pageInitializationStarted = new Action<PageInitializationStartedPayload<TQuery>>();
    public itemChanged = new Action<ItemChangedPayload<TItem>>();
    public sortOptionChanged = new Action<SortOptionChangedPayload<TItem>>();
    public filterPaneVisibilityChanged = new Action<boolean>();
    public previewOrientationChanged = new Action<PreviewOrientationChangedPayload>();
    public organizationInfoLoaded = new Action<IOrganizationInfo>();
    public organizationInfoLoadFailed = new Action<{}>();
    public errorNotificationBannerDismissed = new Action<{}>();
    public filterReset = new Action<{}>();
}
