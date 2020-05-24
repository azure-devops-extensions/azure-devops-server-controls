import { Action } from "VSS/Flux/Action";
import * as Models from "Search/Scripts/React/Models";

export interface IResultsSortCriteriaPayload {
    sortOptions: Models.ISortOption[],
    searchProvider: Models.SearchProvider;
}

export interface IResultsObtainedPayLoad {
    activityId: string,
    searchResponse: any,
    indexUnderFocus: number,
    availableWidth: number,
    entity: Models.SearchProvider
}

export interface IResultsErrorPayload {
    activityId: string,
    errors: any[],
    response: any,
    showMoreResults: boolean
}

export interface IResultsViewChangedPayLoad {
    resultsViewMode: string
}

export interface IPreviewOrientationChangedPayload {
    orientation: string
}

export interface IResultsPaneRowSelectionChangedPayload {
    item: any,
    index: number,
    sender: any
}

export interface IResultPaneRowInvokedPayload
    extends IResultsPaneRowSelectionChangedPayload {
}

export interface IShowMoreActivatedPayload {
    sender: any
}

export interface ITfsDataChangedPayload {
    data: any
}

export interface ISearchResultContextMenuKeyPressedPayload {
    item: any,
    rowIndex: number,
    sender: any
}

export interface IFilterSelectionChangedPayload {
    filters: any[],
    retainFocusOnDropdown: boolean;
}

export interface ISearchProvidersPayload {
    currentProvider: Models.SearchProvider,
    availableProviders: Models.SearchProvider[]
}

export const events = {
    RESULTS_GRID_ACTIVE_ROW_CHANGED_EVENT: "RESULTS_GRID_ACTIVE_ROW_CHANGED_EVENT",
    RESULTS_GRID_ACTIVE_ROW_INVOKED_EVENT: "RESULTS_GRID_ACTIVE_ROW_INVOKED_EVENT",
    SHOW_MORE_RESULTS_EVENT: "SHOW_MORE_RESULTS_EVENT",
    TOGGLE_RESULT_ITEM_CONTEXT_MENU: "TOGGLE_RESULT_ITEM_CONTEXT_MENU"
};

export class ActionsHub {
    private static instance: ActionsHub;

    public searchResultsSortCriteriaChanged = new Action<IResultsSortCriteriaPayload>();
    public resultsObtained = new Action<IResultsObtainedPayLoad>();
    public workItemResultsViewChanged = new Action<IResultsViewChangedPayLoad>();
    public previewOrientationChanged = new Action<IPreviewOrientationChangedPayload>();
    public resetSearch = new Action();
    public searchProvidersUpdated = new Action<ISearchProvidersPayload>();

    public resultsPaneRowSelectionChanged = new Action<IResultsPaneRowSelectionChangedPayload>();
    public resultsPaneRowInvoked = new Action<IResultPaneRowInvokedPayload>();
    public showMoreActivated = new Action<IShowMoreActivatedPayload>();
    public tfsDataChanged = new Action<ITfsDataChangedPayload>();
    public searchResultContextMenuKeyPressed = new Action<ISearchResultContextMenuKeyPressedPayload>();
    public searchErrorOccurred = new Action<IResultsErrorPayload>();
    public filtersUpdated = new Action<any[]>();
    public filterSelectionChanged = new Action<IFilterSelectionChangedPayload>();
    public filtersVisibilityToggled = new Action();
    public accountsUpdated = new Action<any[]>();
    public searchInitiated = new Action<boolean>();
    public pathsLoaded = new Action<any>();
    public searchEntityChanged = new Action<string>();

    public static getInstance(): ActionsHub {
        if (!ActionsHub.instance) {
            ActionsHub.instance = new ActionsHub();
        }

        return ActionsHub.instance;
    }
}
