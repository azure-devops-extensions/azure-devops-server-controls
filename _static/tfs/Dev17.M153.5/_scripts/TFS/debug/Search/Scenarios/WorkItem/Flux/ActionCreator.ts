import * as _AgileCommon from "Presentation/Scripts/TFS/FeatureRef/TFS.AgileCommon";
import * as _SortOptionProps from "SearchUI/Components/SortOptions/SortOptions.Props";
import * as _PreviewSettingProps from "Search/Scenarios/Shared/Components/PreviewSettingsPivot/PreviewSettingsPivot.Props";
import * as _SharedSearchHelpProps from "Search/Scenarios/Shared/Components/SearchHelp/SearchHelp.Props";
import * as Constants from "Search/Scenarios/WorkItem/Constants";
import * as SharedConstants from "Search/Scenarios/Shared/Constants";
import * as _SearchSharedContracts from "Search/Scripts/Generated/Search.SharedLegacy.Contracts";
import * as _WITContracts from "TFS/WorkItemTracking/Contracts";
import * as _WITDialogShim from "WorkItemTracking/SharedScripts/WorkItemDialogShim";
import * as VSS from "VSS/VSS";
import { Filter, FILTER_CHANGE_EVENT, IFilterState, FILTER_RESET_EVENT } from "SearchUI/Utilities/Filter";
import { deserialize, constructCompleteOrgSearchURL } from "Search/Scenarios/Shared/Utils";
import { ActionsHub, ColorsDataPayload, IWITFieldWrapper, } from "Search/Scenarios/WorkItem/Flux/ActionsHub";
import { AggregatedState, getOnlyAppliedFilterInCategory } from "Search/Scenarios/WorkItem/Flux/StoresHub";
import { EventGroup } from "OfficeFabric/Utilities";
import { PageSource } from "Search/Scenarios/WorkItem/Flux/Sources/PageSource";
import { WorkItemSearchSource } from "Search/Scenarios/WorkItem/Flux/Sources/WorkItemSearchSource";
import { WorkItemFieldsSource } from "Search/Scenarios/WorkItem/Flux/Sources/WorkItemFieldsSource";
import { AreaNodesSource } from "Search/Scenarios/WorkItem/Flux/Sources/AreaNodesSource";
import { ColorsDataSource } from "Search/Scenarios/WorkItem/Flux/Sources/ColorsDataSource";
import { OrgInfoDataProviderSource } from "Search/Scenarios/Shared/Base/Sources/OrgInfoDataProviderSource";
import { WorkItemSearchRequest, WorkItemSearchResponse, WorkItemResult, WorkItemFieldType, WorkItemField } from "Search/Scenarios/WebApi/Workitem.Contracts";
import { WorkitemPreviewPaneScenario } from "Search/Scenarios/WorkItem/Flux/Stores/NotificationStore";
import { AreaNodeRetrievalBridge, AreaNodeRetrievalInvokers } from "Search/Scenarios/WorkItem/Flux/Bridges/AreaNodeRetrievalBridge";
import { ColorsDataRetrievalBridge, ColorsDataRetrievalInvokers } from "Search/Scenarios/WorkItem/Flux/Bridges/ColorsDataRetrievalBridge";
import { WorkItemFieldsRetrievalBridge, WorkItemFieldsRetrievalInvokers } from "Search/Scenarios/WorkItem/Flux/Bridges/WorkItemFieldsRetrievalBridge";
import { SortOptionChangedPayload, SearchFailedPayload, SearchSourceType } from "Search/Scenarios/Shared/Base/ActionsHub";
import { TelemetryWriter } from "Search/Scenarios/WorkItem/Flux/Sources/TelemetryWriter";
import { localeIgnoreCaseComparer } from "VSS/Utils/String";
import { getFieldValue } from "Search/Scenarios/WorkItem/Utils";
import { IOrganizationInfo, OrgSearchUrlLoadState } from "Search/Scenarios/Shared/Base/Stores/OrganizationInfoStore";
import { SearchPerfTelemetryAdditionalData } from "Search/Scenarios/Shared/Base/Telemetry";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";

export interface Sources {
    searchSource: WorkItemSearchSource;

    areaNodesSource: AreaNodesSource;

    colorsDataSource: ColorsDataSource;

    workItemFieldsSource: WorkItemFieldsSource;

    pageSource: PageSource;

    orgInfoDataProviderSource: OrgInfoDataProviderSource;
}

export interface Bridges {
    areaPathRetrievalBridge: AreaNodeRetrievalBridge;

    colorsDataRetrievalBridge: ColorsDataRetrievalBridge;

    workItemFieldsRetrievalBridge: WorkItemFieldsRetrievalBridge;
}

export class ActionCreator {
    private bridges: Bridges;
    private readonly events: EventGroup;

    constructor(
        private readonly actionsHub: ActionsHub,
        private readonly filter: Filter,
        private readonly sources: Sources,
        private getAggregatedState: () => AggregatedState,
        private readonly currentProject?: string,
        private readonly telemetryWriter?: TelemetryWriter
    ) {
        this.filter.subscribe(this.applyFilter, FILTER_CHANGE_EVENT);
        this.events = new EventGroup(this.filter);
        this.events.on(this.filter, FILTER_RESET_EVENT, this.onFilterResetClick);

        const areaNodeRetrievalInvokers: AreaNodeRetrievalInvokers = {
            areaNodeRetrieved: (project: string, node: _AgileCommon.INode) => {
                this.actionsHub.areaNodeRetrieved.invoke({ areaNode: node, project })
            },
            knownAreaNodeFetched: (project: string, node: _AgileCommon.INode) => {
                this.actionsHub.knownAreaNodeFetched.invoke({ areaNode: node, project })
            },
            udpateDefaultAreaPath: (requestedPath) => {
                this.actionsHub.updateDefaultAreaPath.invoke(requestedPath)
            },
            areaNodeRetrievalFailed: this.handleAreaNodeRetrievalFailed
        },
            colorsDataRetrievalInvokers: ColorsDataRetrievalInvokers = {
                colorsDataRetrieved: (colorsData: ColorsDataPayload) => {
                    this.actionsHub.colorsDataRetrieved.invoke(colorsData);
                }
            },
            workItemFieldsRetrievalInvokers: WorkItemFieldsRetrievalInvokers = {
                handleSuggestionText: (text: string) => actionsHub.workItemSearchTextChanged.invoke(text),
                workItemFieldsRetrievalFailed: (error: any) => actionsHub.workItemFieldsRetrievalFailed.invoke({ error }),
                workItemFieldsRetrieved: (text: string, fields: IWITFieldWrapper[]) => actionsHub.workItemFieldsRetrieved.invoke({ fields, text })
            };


        this.bridges = {
            areaPathRetrievalBridge: new AreaNodeRetrievalBridge(areaNodeRetrievalInvokers, this.sources.areaNodesSource, this.getAggregatedState),
            colorsDataRetrievalBridge: new ColorsDataRetrievalBridge(colorsDataRetrievalInvokers, this.sources.colorsDataSource),
            workItemFieldsRetrievalBridge: new WorkItemFieldsRetrievalBridge(workItemFieldsRetrievalInvokers, this.sources.workItemFieldsSource, this.getAggregatedState)
        }
    }

    public dispose = (): void => {
        this.events.off(this.filter);
    }

    public loadInitialState = (text: string, filtersString?: string, sortOptionsString?: string, launchPoint?: string): void => {
        const sortOptions = sortOptionsString ? deserialize<_SearchSharedContracts.EntitySortOption[]>(sortOptionsString) : [];
        const query = {
            searchText: text,
            skipResults: 0,
            takeResults: Constants.WorkItemSearchTakeResults,
            sortOptions: stripOffRelevance(sortOptions),
            summarizedHitCountsNeeded: true,
            searchFilters: filtersString ? deserialize<IDictionaryStringTo<string[]>>(filtersString) : {}
        } as WorkItemSearchRequest;

        this.actionsHub.pageInitializationStarted.invoke({ query, sortScenario: true, launchPoint });
        this.sources
            .searchSource
            .getQueryResults(query)
            .then(({ responseWithActivityId, source }) => {
                const workItemSearchResponse = (responseWithActivityId.response || responseWithActivityId) as WorkItemSearchResponse,
                    activityId = responseWithActivityId.activityId && responseWithActivityId.activityId[0];
                this.handleResultsLoaded(query, workItemSearchResponse, activityId, source, 0 );
            }, (error: SearchFailedPayload<WorkItemSearchRequest>) => this.actionsHub.searchFailed.invoke({ ...error, query }));
    }

    /**
     *  Send query on landing page scenario to update searchstore to an adequate state
     */
    public showLandingPage = (filter?: string): void => {
        const query = {
            skipResults: 0,
            takeResults: Constants.WorkItemSearchTakeResults,
            sortOptions: [],
            summarizedHitCountsNeeded: true,
            searchFilters: filter ? deserialize<IDictionaryStringTo<string[]>>(filter) : {}
        } as WorkItemSearchRequest;

        this.actionsHub.pageInitializationStarted.invoke({ query, isLandingPage: true });
    }

    public performSearch = (
        text: string,
        sortOptions: _SearchSharedContracts.EntitySortOption[],
        filters: { [id: string]: string[] }): void => {
        const searchQuery = {
            searchText: text,
            skipResults: 0,
            summarizedHitCountsNeeded: true,
            takeResults: Constants.WorkItemSearchTakeResults,
            sortOptions,
            searchFilters: filters
        } as WorkItemSearchRequest;

        this.doSearch(searchQuery, true);
    }

    public applyFilter = (filterState: IFilterState): void => {
        const currentFilterState = this.filter.getState();
        const aggregatedState = this.getAggregatedState();
        const { filterStoreState, appliedEntitySortOption, searchStoreState } = aggregatedState,
            { filterItems } = filterStoreState;

        let filters: IDictionaryStringTo<string[]> = {};
        Object
            .keys(currentFilterState)
            .forEach((key) => {
                const value = currentFilterState[key].value;
                if (!value) {
                    return;
                }

                if (filterItems[key].enabled) {
                    filters[key] = value;
                }
            });

        // Create a new search query with updated filters and latest applied sort options.
        const searchQuery = {
            ...searchStoreState.query,
            searchFilters: scrub(filters),
            sortOptions: [appliedEntitySortOption],
            takeResults: Constants.WorkItemSearchTakeResults,
            summarizedHitCountsNeeded: true
        };

        this.doSearch(searchQuery, false, true);
    }

    public openSearchInNewTab = (searchText: string): void => {
        const { searchStoreState } = this.getAggregatedState();
        this.sources.pageSource.navigateToNewSearch(searchText, searchStoreState.query.searchFilters, searchStoreState.query.sortOptions);
        this.telemetryWriter.publish(Constants.CustomerIntelligenceConstants.SearchInNewTab);
    }

    public applySearchText = (searchText: string) => {
        const aggregatedState = this.getAggregatedState();
        const { searchStoreState, appliedEntitySortOption } = aggregatedState;

        // Create a new search query with updated filters, latest sort options and new search text
        const searchQuery = {
            ...searchStoreState.query,
            searchText: searchText,
            sortOptions: [appliedEntitySortOption],
            takeResults: Constants.WorkItemSearchTakeResults,
            summarizedHitCountsNeeded: true
        };

        this.doSearch(searchQuery, false, false, true);
    }

    public onRemoveSearchText = () => {
        this.telemetryWriter.publish(Constants.CustomerIntelligenceConstants.SearchTextRemoved);
    }

    /**
     * Method exposed for L0 testing purposes.
     */
    public applyFilters = (filters: IDictionaryStringTo<string[]>): void => {
        const filterState: IFilterState = {};

        Object.keys(filters)
            .forEach(key => {
                filterState[key] = { value: filters[key] }
            });

        this.filter.setState(filterState);
    }

    public showBanner = (scenario: WorkitemPreviewPaneScenario) => {
        this.actionsHub.showPreviewMessageBanner.invoke(scenario);
    }

    public dismissBanner = () => {
        this.actionsHub.dismissPreviewMessageBanner.invoke({});
    }

    public changeActiveItem = (item: WorkItemResult) => {
        const { selectedItem } = this.getAggregatedState();
        if (item !== selectedItem) {
            this.actionsHub.itemChanged.invoke({ item });
        }
    }

    public toggleFilePaneVisibility = (isVisible: boolean) => {
        this.actionsHub.filterPaneVisibilityChanged.invoke(isVisible);
    }

    public changePreviewOrienation = (previewOrientation: _PreviewSettingProps.PreviewSetting) => {
        this.actionsHub.previewOrientationChanged.invoke({ previewOrientation: previewOrientation });
    }

    public changeSortCriteria = (sortOption: _SortOptionProps.SortOption) => {
        const { searchStoreState } = this.getAggregatedState(),
            { response, query } = searchStoreState;
        const entitySortOption: _SearchSharedContracts.EntitySortOption = { field: sortOption.key, sortOrder: sortOption.order };

        if (this.shouldPerformServerSort(response, sortOption.key)) {
            const entitySortOptions: _SearchSharedContracts.EntitySortOption[] =
                sortOption.key !== Constants.SortActionIds.Relevance ? [{
                    field: sortOption.key,
                    sortOrder: sortOption.order
                }] : [],
                searchQuery: WorkItemSearchRequest = { ...query, sortOptions: entitySortOptions, summarizedHitCountsNeeded: true };
            this.doSearch(searchQuery, true);
        }
        else {
            const items = response ? response.results.values : [];
            this.sortItems(items, entitySortOption);
            this.actionsHub.sortOptionChanged.invoke({ sortedItems: items, sortOption: entitySortOption });
        }
    }

    public expandTreeItem = (path: string): void => {
        this.actionsHub.treeItemExpanded.invoke(path);
    }

    public collapseTreeItem = (path: string): void => {
        this.actionsHub.treeItemCollapsed.invoke(path);
    }

    public refineTreeItems = (searchText: string): void => {
        this.actionsHub.treeSearchTextChanged.invoke(searchText);
    }

    private handleAreaNodeRetrievalFailed = (): void => {
        this.actionsHub.areaNodeRetrievalFailed.invoke(null);
    }

    public dismissTreeDropdown = (): void => {
        this.actionsHub.treeDropdownDismissed.invoke(null);
    }

    public invokeTreeDropdown = (): void => {
        this.actionsHub.treeDropdownInvoked.invoke(null);
    }

    public notifyResultsRendered = (): void => {
        const { searchStoreState } = this.getAggregatedState();
        const data = {
            responseActivityId: searchStoreState.activityId,
            searchSource: SearchSourceType[searchStoreState.source]
        } as SearchPerfTelemetryAdditionalData;

        this.telemetryWriter.initialScenario.notifyResultsRendered(data);
        this.telemetryWriter.subsequentScenario.notifyResultsRendered(data);
    }

    public notifySearchFailed = (): void => {
        this.telemetryWriter.initialScenario.notifySearchFailed();
        this.telemetryWriter.subsequentScenario.notifySearchFailed();
    }

    public notifyFeedbackMailLinkClicked = (): void => {
        this.telemetryWriter.publish(Constants.CustomerIntelligenceConstants.FeedbackMailLinkClicked);
    }

    public onPreviewLoaded = (): void => {
        this.telemetryWriter.initialScenario.notifyPreviewRendered(true);
    }

    public onPreviewLoadFailed = (): void => {
        this.telemetryWriter.initialScenario.notifyPreviewRendered(false);
    }

    public publishZeroData = (scenarioType: string, error?: any): void => {
        this.telemetryWriter.publish(Constants.CustomerIntelligenceConstants.ZeroData, { scenarioType, error });
    }

    public publishNotificationBanner = (scenarioType: string): void => {
        this.telemetryWriter.publish(Constants.CustomerIntelligenceConstants.NotificationBanner, { scenarioType });
    }

    public errorNotificationBannerDismissed = (): void => {
        this.actionsHub.errorNotificationBannerDismissed.invoke({});
    }

    public refineHelperSuggestions = (text: string, caretPos: number): void => {
        if (text.length === caretPos) {
            this.bridges.workItemFieldsRetrievalBridge.getFields(this.currentProject, text);
        }
    }

    public updateHelpDropdownVisibility = (isVisible: boolean): void => {
        this.actionsHub.helpDropdownVisibilityChanged.invoke(isVisible);
    }

    public selectSearchHelpFilter = (helpFilter: _SharedSearchHelpProps.ISearchFilter): void => {
        // Hide help
        this.actionsHub.helpDropdownVisibilityChanged.invoke(false);
        this.telemetryWriter.publish(
            Constants.CustomerIntelligenceConstants.SearchHelpFilterActivated, {
                filterText: helpFilter && helpFilter.text
            });
    }

    public clickAccountLink = (): void => {
        this.telemetryWriter.publish(Constants.CustomerIntelligenceConstants.AccountLinkClicked);
    }

    public clickAccountButton = (url: string): void => {
        this.sources.pageSource.openUrlInNewtab(url);
        this.telemetryWriter.publish(Constants.CustomerIntelligenceConstants.AccountButtonClicked);
    }

    public clickFeedbackLink = (): void => {
        this.telemetryWriter.publish(Constants.CustomerIntelligenceConstants.FeedbackLinkClicked);
    }

    public onFilterResetClick = (): void => {
        this.actionsHub.filterReset.invoke({});
        this.telemetryWriter.publish(Constants.CustomerIntelligenceConstants.FilterResetClicked);
    }

    public onFiltersChanged = (name: string): void => {
        this.telemetryWriter.publish(Constants.CustomerIntelligenceConstants.FiltersUpdated, { name });
    }

    public handleSearchThisOrgButtonClick = (searchText: string): void => {
        const { orgSearchUrlLoadState } = this.getAggregatedState().organizationInfoState;
        if (orgSearchUrlLoadState === OrgSearchUrlLoadState.OrgSearchUrlLoadSucceed) {
            this.navigateToOrgSearchPage(searchText);
        }
        else {
            this.loadOrganizationInfoAndNavigateToUrl(searchText);
        }
    }

    public fetchMoreResults = () => {
        const { searchStoreState } = this.getAggregatedState();
        const searchQuery = {
            ...searchStoreState.query,
            takeResults: Constants.WorkItemSearchShowMoreTakeResults,
            summarizedHitCountsNeeded: true
        };

        this.doSearch(searchQuery, false, false, false, true);
    }

    public onWorkItemInvoked = (workItemId: string, url:string, openInNewTab: boolean): void => {
        if (openInNewTab) {
            this.openWorkItemInNewTab(url);
        }
        else {
            this.openWorkItemInModalDialog(workItemId);
        }
    }

    private openWorkItemInModalDialog = (workItemId: string): void => {
        VSS.using(["WorkItemTracking/SharedScripts/WorkItemDialogShim"], (WITDialogShim: typeof _WITDialogShim) => {
            WITDialogShim.showWorkItemDialogById(parseInt(workItemId), TfsContext.getDefault());
            this.telemetryWriter.publish(Constants.CustomerIntelligenceConstants.WorkItemOpenForm, { originArea: "WITSearch", IsDialog: true });
        })
    }

    private openWorkItemInNewTab = (url: string): void => {
        this.sources.pageSource.openUrlInNewtab(url);
        this.telemetryWriter.publish(Constants.CustomerIntelligenceConstants.WorkItemOpenForm, { originArea: "WITSearch", IsDialog: false })
    }

    private loadOrganizationInfoAndNavigateToUrl = (searchText: string): void => {
        this.sources.orgInfoDataProviderSource.getOrganizationInfo().then(
            (organizationInfo: IOrganizationInfo) => {
                if (organizationInfo && organizationInfo.organizationUrl) {
                    this.actionsHub.organizationInfoLoaded.invoke(organizationInfo);
                    this.navigateToOrgSearchPage(searchText);
                }
                else {
                    this.actionsHub.organizationInfoLoadFailed.invoke({});
                }
            },
            (error: Error) => {
                this.actionsHub.organizationInfoLoadFailed.invoke({});
            }
        );
    }

    private navigateToOrgSearchPage = (searchText: string): void => {
        const url: string = this.getAggregatedState().organizationInfoState.organizationInfo.organizationUrl;
        if (url !== undefined) {
            const completeOrgSearchUrl = constructCompleteOrgSearchURL(
                url,
                searchText,
                Constants.CustomerIntelligenceConstants.OrgSearchNavigationFromWorkItemSearchPageSource,
                SharedConstants.OrgSearchUrlTypeProjects);
            this.sources.pageSource.openUrlInNewtab(completeOrgSearchUrl);
        }
    }

    private doSearch(
        query: WorkItemSearchRequest,
        sortScenario?: boolean,
        filterApplication?: boolean,
        searchTextModified?: boolean,
        fetchMoreScenario?: boolean): void {
        this.actionsHub.searchStarted.invoke({ query, sortScenario, filterApplication, fetchMoreScenario, searchTextModified });

        // Strip off 'relevance' sort field
        query.sortOptions = stripOffRelevance(query.sortOptions);

        this.sources
            .searchSource
            .getQueryResults(query)
            .then(({ responseWithActivityId, source }) => {
                const workItemSearchResponse = (responseWithActivityId.response || responseWithActivityId) as WorkItemSearchResponse,
                    activityId = responseWithActivityId.activityId && responseWithActivityId.activityId[0],
                    { response } = this.getAggregatedState().searchStoreState,
                    previousItemsCount = !!response ? response.results.values.length : 0;
                let activeItemIndex = 0;

                if (fetchMoreScenario) {
                    activeItemIndex = previousItemsCount;
                }
                this.handleResultsLoaded(query, workItemSearchResponse, activityId, source, activeItemIndex);
            }, (error: SearchFailedPayload<WorkItemSearchRequest>) => this.actionsHub.searchFailed.invoke({ ...error, query }));
    }

    private refreshTreeStoreIfNeeded = (response: WorkItemSearchResponse) => {
        const { searchStoreState } = this.getAggregatedState(),
            currentResponse = searchStoreState.response;

        if (!currentResponse) {
            this.actionsHub.refreshTree.invoke({});
            return;
        }

        const currentProject = getOnlyAppliedFilterInCategory(currentResponse.filterCategories, Constants.FilterKeys.ProjectFiltersKey);
        const newProject = getOnlyAppliedFilterInCategory(response.filterCategories, Constants.FilterKeys.ProjectFiltersKey);

        if (!currentProject ||
            !newProject ||
            currentProject.toLowerCase() !== newProject.toLowerCase()) {
            this.actionsHub.refreshTree.invoke({});
        }
    }

    private shouldPerformServerSort(response: WorkItemSearchResponse, sortOptionKey: string): boolean {
        // ToDo: Add feature flag check.
        // Perform server sort even if the previous response was null(coulbe a error scenario)
        return !response ||
            response.results.count > Constants.WorkItemSearchTakeResults ||
            sortOptionKey === Constants.SortActionIds.Relevance;
    }

    private sortItems = (items: WorkItemResult[], sortOption: _SearchSharedContracts.EntitySortOption): void => {
        items.sort(this.comparer(sortOption));
    }

    private handleResultsLoaded = (
        query: WorkItemSearchRequest,
        workItemSearchResponse: WorkItemSearchResponse,
        activityId: string,
        source: SearchSourceType,
        activeItemIndex: number): void => {
        const { appliedEntitySortOption } = this.getAggregatedState(),
            items = workItemSearchResponse && workItemSearchResponse.results.values;

        const activeItem = items && items[activeItemIndex] ? items[activeItemIndex] : (items[0] ? items[0] : null);

        this.refreshTreeStoreIfNeeded(workItemSearchResponse);
        this.actionsHub.resultsLoaded.invoke({ response: workItemSearchResponse, activeItem, activityId, source });

        this.bridges.areaPathRetrievalBridge.getAreaNode(query, workItemSearchResponse);
        this.bridges.colorsDataRetrievalBridge.getColorsData(workItemSearchResponse.results.values);
    }

    private comparer(sortOption: _SearchSharedContracts.EntitySortOption) {
        const sortFieldType: WorkItemFieldType = Constants.FieldType[sortOption.field]
            ? Constants.FieldType[sortOption.field]
            : null;

        let compareDelegate: Function;
        if (sortFieldType === WorkItemFieldType.DateTime) {
            compareDelegate = (first: string, second: string) => {
                const d1 = new Date(first),
                    d2 = new Date(second);
                return d1.getTime() - d2.getTime();
            }
        }
        else if (sortFieldType === WorkItemFieldType.Integer) {
            compareDelegate = (first: string, second: string) => {
                const v1 = parseInt(first),
                    v2 = parseInt(second);

                return v1 - v2;
            }
        }
        else {
            // Changing it from ignoreCaseComparer to localeIgnoreCaseComparer for localisation.
            compareDelegate = localeIgnoreCaseComparer;
        }

        return (
            (refName: string, order: string, comparisonDelegate: Function) => {
                return (first: WorkItemResult, second: WorkItemResult) => {
                    const v1: string = getFieldValue(first.fields, refName),
                        v2: string = getFieldValue(second.fields, refName);
                    let compareValue: number = comparisonDelegate(v1, v2);

                    // if field to sort on have same values in both rows, then break the tie based on the work item id.
                    if (compareValue === 0) {
                        const id1 = parseInt(getFieldValue(first.fields, Constants.SortActionIds.ID)),
                            id2 = parseInt(getFieldValue(second.fields, Constants.SortActionIds.ID));

                        compareValue = id1 - id2;
                    }


                    if (order === "desc") {
                        return -compareValue;
                    }

                    return compareValue;
                };
            })(sortOption.field, sortOption.sortOrder, compareDelegate);
    }
}

function stripOffRelevance(sortOptions: _SearchSharedContracts.EntitySortOption[]): _SearchSharedContracts.EntitySortOption[] {
    return sortOptions.filter(so => so.field !== Constants.SortActionIds.Relevance);
}

function scrub(selectedFilterState: IDictionaryStringTo<string[]>): IDictionaryStringTo<string[]> {
    const selectedProjectsCount = selectedFilterState[Constants.FilterKeys.ProjectFiltersKey] &&
        selectedFilterState[Constants.FilterKeys.ProjectFiltersKey].length;

    // Remove area path filter if there are no projects selected or more than 1 project is selected.
    if (selectedProjectsCount !== 1) {
        delete selectedFilterState[Constants.FilterKeys.AreaPathsFilterKey];
    }

    return selectedFilterState;
}
