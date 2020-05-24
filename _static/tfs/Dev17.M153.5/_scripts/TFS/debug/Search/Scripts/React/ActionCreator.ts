import * as VSS from "VSS/VSS";
import { ActionsHub } from "Search/Scripts/React/ActionsHub";
import * as Models from "Search/Scripts/React/Models";
import { ignoreCaseComparer } from "VSS/Utils/String";
import { SearchConstants } from "Search/Scripts/Common/TFS.Search.Constants";
import State = require("Search/Scripts/Common/TFS.Search.ViewState");
import Navigation_Services = require("VSS/Navigation/Services");
import { WorkItemConstants } from "Search/Scripts/Providers/WorkItem/TFS.Search.WorkItem.Constants";
import * as Path_Source_NO_REQUIRE from "Search/Scripts/React/Sources/PathDataSource";
import * as Account_Source_NO_REQUIRE from "Search/Scripts/React/Sources/AccountSource"

const LEGACY_SEARCH_PROVIDER_ID_MAP: IDictionaryStringTo<number> = {};
LEGACY_SEARCH_PROVIDER_ID_MAP[SearchConstants.CodeEntityTypeId] = Models.SearchProvider.code;
LEGACY_SEARCH_PROVIDER_ID_MAP[SearchConstants.WorkItemEntityTypeId] = Models.SearchProvider.workItem;
LEGACY_SEARCH_PROVIDER_ID_MAP[SearchConstants.WikiEntityTypeId] = Models.SearchProvider.wiki;
const FILE_PATH_COUNT_EXCEEDED = "GitFilePathsMaxCountExceededException";

export class ActionCreator {
    private static instance: ActionCreator;

    constructor(private actionsHub: ActionsHub) {
    }

    public static getInstance(): ActionCreator {
        if (!ActionCreator.instance) {
            let actionsHub = ActionsHub.getInstance();
            ActionCreator.instance = new ActionCreator(actionsHub);
        }

        return ActionCreator.instance;
    }

    /**
     * Action to update the work item search results sort criteria.
     * @param sortOptions
     * @param updateHistory
     * @param suppressNavigate
     */
    public changeSearchResultsSortCriteria(
        sortOptions: Models.ISortOption[],
        updateHistory: boolean,
        searchProvider: Models.SearchProvider,
        suppressNavigate: boolean,
        replaceHistory: boolean): void {
        this.actionsHub.searchResultsSortCriteriaChanged.invoke({
            sortOptions: sortOptions,
            searchProvider: searchProvider
        });

        if (updateHistory) {
            // Remove relevance field from  sortOptions so that it's not updated in the url
            sortOptions = sortOptions.filter((value: Models.ISortOption, index: number) => {
                return ignoreCaseComparer("relevance", value.field) !== 0;
            });
            let sortOptionsString = sortOptions.length > 0 ? JSON.stringify(sortOptions)
                : null;

            State.SearchViewState.sortOptions = sortOptionsString;
            let state = {
                sortOptions: sortOptionsString
            };

            // sortOptions is [] if the only option is sort by relevance,
            // in which case we would want search query to reach server.
            if (sortOptions.length <= 0) {
                suppressNavigate = false;
            }
            if (replaceHistory) {
                var currentState = Navigation_Services.getHistoryService().getCurrentState();
                currentState["sortOptions"] = state.sortOptions;
                Navigation_Services
                    .getHistoryService()
                    .replaceHistoryPoint(SearchConstants.SortActionName, currentState, null, suppressNavigate);
            }
            else {
                Navigation_Services
                    .getHistoryService()
                    .addHistoryPoint(SearchConstants.SortActionName, state, null, suppressNavigate);
            }
        }
    }

    /**
     * Action to refresh the search results set obtained for a query.
     * @param searchResponse
     * @param activityId
     */
    public refreshSearchResults(
        searchResponse: any,
        activityId: string,
        indexUnderFocus: number,
        availableWidth: number,
        entity: Models.SearchProvider): void {
        this.actionsHub.resultsObtained.invoke({
            searchResponse: searchResponse,
            activityId: activityId,
            indexUnderFocus: indexUnderFocus,
            availableWidth: availableWidth,
            entity: entity
        });
    }

    public resetSearch(): void {
        this.actionsHub.resetSearch.invoke({});
    }

    public refreshSearchErrors(response: any, errors: any[], activityId: string, showMoreResults:boolean): void {
        this.actionsHub.searchErrorOccurred.invoke({
            activityId: activityId,
            errors: errors,
            response: response,
            showMoreResults: showMoreResults
        });
    }

    /**
     * Action to update work item search query results information.
     * @param fetchedResultsCount
     * @param totalResultsCount
     * @param activityId
     */
    public updateWorkItemSearchResultsViewMode(resultsViewMode: string): void {
        this.actionsHub.workItemResultsViewChanged.invoke({
            resultsViewMode: resultsViewMode
        });
    }

    public changeActiveRow(item: any, index: number, sender: any): void {
        this.actionsHub.resultsPaneRowSelectionChanged.invoke({
            index: index,
            item: item,
            sender: sender
        });
    }

    public invokeActiveRow(item: any, index: number, sender: any): void {
        this.actionsHub.resultsPaneRowInvoked.invoke({
            index: index,
            item: item,
            sender: sender
        });
    }

    public fetchMoreItems(sender: any): void {
        this.actionsHub.showMoreActivated.invoke({
            sender: sender
        });
    }

    public updateTfsData(data: any): void {
        this.actionsHub.tfsDataChanged.invoke({
            data: data
        });
    }

    public updatePreviewOrientationMode(mode: string): void {
        this.actionsHub.previewOrientationChanged.invoke({
            orientation: mode
        });
    }

    public showSearchResultContextMenu(item: any, index: number, sender: any) {
        this.actionsHub.searchResultContextMenuKeyPressed.invoke({
            item: item,
            rowIndex: index,
            sender: sender
        });
    }

    public updateSearchProviders(availableProvidersIds: string[], currentProviderId: string) {
        let availableProviders: Models.SearchProvider[];
        if (availableProvidersIds &&
            currentProviderId &&
            typeof LEGACY_SEARCH_PROVIDER_ID_MAP[currentProviderId] !== "undefined") {
            availableProviders = availableProvidersIds.map((id: string) => {
                return LEGACY_SEARCH_PROVIDER_ID_MAP[id];
            }).filter((p) => {
                return typeof p !== "undefined";
            });

            this.actionsHub.searchProvidersUpdated.invoke({
                availableProviders: availableProviders,
                currentProvider: LEGACY_SEARCH_PROVIDER_ID_MAP[currentProviderId]
            });
        }
    }

    public changeFilters(filters: any[]) {
        this.actionsHub.filtersUpdated.invoke(filters);
    }

    public changeFilterSelection(filters: any[], retainFocusOnDropdown: boolean) {
        this.actionsHub.filterSelectionChanged.invoke({
            filters: filters,
            retainFocusOnDropdown: retainFocusOnDropdown
        });
    }

    public toggleFiltersVisibility() {
        this.actionsHub.filtersVisibilityToggled.invoke({});
    }
    
    public fetchAccounts(): void {
        VSS.using(["Search/Scripts/React/Sources/AccountSource"], (Module: typeof Account_Source_NO_REQUIRE) => {
            let accountSource = new Module.AccountSource();
            accountSource.getAccounts(((accounts) => {
                this.actionsHub.accountsUpdated.invoke(accounts);
            }).bind(this));
        })
    }

    /**
     * For the item provided, this function fetches the paths lazily from the respective source.
     * @param item
     */
    public loadPath(item: any): void {
        VSS.using(
            ["Search/Scripts/React/Sources/PathDataSource"],
            (PathDataSource: typeof Path_Source_NO_REQUIRE) => {
                let source: Path_Source_NO_REQUIRE.ISource;
                if (ignoreCaseComparer(item.name, SearchConstants.BranchFilters) === 0) {
                    source = new Path_Source_NO_REQUIRE.BranchPathDataSource();
                }
                else if (ignoreCaseComparer(item.name, SearchConstants.PathFilters) === 0) {
                    source = Path_Source_NO_REQUIRE.VersionControlPathDataSource.getInstance();
                }
                else if (ignoreCaseComparer(item.name, WorkItemConstants.WORK_ITEM_AREA_PATHS_FILTER_CATEGORY_NAME) === 0) {
                    source = Path_Source_NO_REQUIRE.WorkItemAreaPathDataSource.getInstance();
                }

                source.getData(item).then((items: Models.IPathControlElement[]) => {
                    this.actionsHub.pathsLoaded.invoke({
                        pathType: item.name,
                        items: items,
                        loadingState: Models.LoadingState.LoadSuccess,
                    });
                }, (error) => {
                    // In case of Failure, provide the appropriate failure reason
                    if (parseInt(error.status) === 403 &&
                        error.serverError &&
                        ignoreCaseComparer(error.serverError.typeKey, FILE_PATH_COUNT_EXCEEDED) === 0) {
                        this.actionsHub.pathsLoaded.invoke({
                            pathType: item.name,
                            items: [],
                            loadingState: Models.LoadingState.LoadFailedOnSizeExceeded
                        });
                    }
                    else if (error &&
                        ignoreCaseComparer(error.message, Path_Source_NO_REQUIRE.TFVC_PATH_LOAD_FAILED) === 0) {
                        this.actionsHub.pathsLoaded.invoke({
                            pathType: item.name,
                            items: [],
                            loadingState: Models.LoadingState.UnSupported
                        });
                    }
                    else {
                        this.actionsHub.pathsLoaded.invoke({
                            pathType: item.name,
                            items: [],
                            loadingState: Models.LoadingState.LoadFailed
                        })
                    }
                });
            });
    }
}