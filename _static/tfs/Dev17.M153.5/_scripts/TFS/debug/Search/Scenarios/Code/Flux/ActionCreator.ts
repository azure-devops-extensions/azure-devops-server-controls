import * as React from "react";
import * as _SearchSharedContracts from "Search/Scripts/Generated/Search.SharedLegacy.Contracts";
import * as _VCRepositoryContext from "VersionControl/Scripts/RepositoryContext";
import * as _VCLegacyContracts from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";
import * as _SortOptionProps from "SearchUI/Components/SortOptions/SortOptions.Props";
import * as _PreviewSettingProps from "Search/Scenarios/Shared/Components/PreviewSettingsPivot/PreviewSettingsPivot.Props";
import * as _AdornmentCommon from "Presentation/Scripts/TFS/TFS.Adornment.Common";
import * as _VCFileViewer from "VersionControl/Scripts/Controls/FileViewer";
import * as _SearchSharedLegacy from "Search/Scripts/Generated/Search.SharedLegacy.Contracts";
import * as _TelemetryWriter from "Search/Scenarios/Code/Flux/Sources/TelemetryWriter";
import * as _SharedSearchHelpProps from "Search/Scenarios/Shared/Components/SearchHelp/SearchHelp.Props";
import * as Constants from "Search/Scenarios/Code/Constants";
import * as SharedConstants from "Search/Scenarios/Shared/Constants";
import * as _ContextualMenu from "OfficeFabric/components/ContextualMenu/ContextualMenu.types";
import { Filter, FILTER_CHANGE_EVENT, IFilterState, FILTER_RESET_EVENT } from "SearchUI/Utilities/Filter";
import { EventGroup } from "OfficeFabric/Utilities";
import { Action } from "VSS/Flux/Action";
import { ActionsHub, PathSourceParams, ItemRetrievedPayload } from "Search/Scenarios/Code/Flux/ActionsHub";
import { SortOptionChangedPayload, SearchFailedPayload, SearchSourceType } from "Search/Scenarios/Shared/Base/ActionsHub";
import { getPathSourceParams, AggregatedState, getDefaultPath } from "Search/Scenarios/Code/Flux/StoresHub";
import { CodeSearchSource } from "Search/Scenarios/Code/Flux/Sources/CodeSearchSource";
import { RepositorySource } from "Search/Scenarios/Code/Flux/Sources/RepositorySource";
import { FilePathsSource } from "Search/Scenarios/Code/Flux/Sources/FilePathsSource";
import { FileContentSource } from "Search/Scenarios/Code/Flux/Sources/FileContentSource";
import { TenantSource } from "Search/Scenarios/Code/Flux/Sources/TenantSource";
import { ContentRendererSource } from "Search/Scenarios/Code/Flux/Sources/ContentRendererSource";
import { ContextRetrievalBridge, ContextRetrievalInvokers } from "Search/Scenarios/Code/Flux/Bridges/ContextRetrievalBridge";
import { PageSource } from "Search/Scenarios/Code/Flux/Sources/PageSource";
import { OrgInfoDataProviderSource } from "Search/Scenarios/Shared/Base/Sources/OrgInfoDataProviderSource";
import { ItemRetrievalBridge, ItemRetrievalInvokers } from "Search/Scenarios/Code/Flux/Bridges/ItemRetrievalBridge";
import { FileContentRetrievalBridge, FileContentRetrievalInvokers } from "Search/Scenarios/Code/Flux/Bridges/FileContentRetrievalBridge";
import { SearchQuery, CodeQueryResponse, CodeResult } from "Search/Scenarios/WebApi/Code.Contracts";
import { isPositionAtFileEnd, isPositionAtFileStart } from "Search/Scenarios/Code/Flux/Stores/HitNavigationStore";
import { deserialize, constructCompleteOrgSearchURL } from "Search/Scenarios/Shared/Utils";
import { getItemResultKey, isVCType, isGitRepo, getFileExtension, isGitType, isTfvcType } from "Search/Scenarios/Code/Utils";
import { localeIgnoreCaseComparer } from "VSS/Utils/String";
import { IOrganizationInfo, OrgSearchUrlLoadState } from "Search/Scenarios/Shared/Base/Stores/OrganizationInfoStore";
import { SearchPerfTelemetryAdditionalData } from "Search/Scenarios/Shared/Base/Telemetry";
import { getLWPModule } from "VSS/LWP";

const FPS = getLWPModule("VSS/Platform/FPS");

export interface Sources {
    searchSource: CodeSearchSource;

    repositorySource: RepositorySource;

    fileContentSource: FileContentSource;

    filePathsSource: FilePathsSource;

    pageSource: PageSource;

    tenantSource: TenantSource;

    contentRendererSource: ContentRendererSource;

    orgInfoDataProviderSource: OrgInfoDataProviderSource;
}

export interface Bridges {
    contextRetrievalBridge: ContextRetrievalBridge;

    itemRetrievalBridge: ItemRetrievalBridge;

    fileContentRetrievalBridge: FileContentRetrievalBridge;
}

type HitNavigateInvoker = (hits: _AdornmentCommon.DecorationAdornment[], index: number, itemPos: number, items: CodeResult[], cursorPos: _VCFileViewer.FileViewerSelection) => void;

export class ActionCreator {
    // Making bridges public for stubbing purposes.
    public readonly bridges: Bridges;
    private readonly events: EventGroup;

    constructor(
        private readonly actionsHub: ActionsHub,
        private readonly filter: Filter,
        private readonly sources: Sources,
        private readonly pageContext: Object,
        private getAggregatedState: () => AggregatedState,
        private readonly telemetryWriter?: _TelemetryWriter.TelemetryWriter,
        private onFullScreen?: (isFullScreen: boolean) => void,
    ) {
        const contextRetrievalInvokers: ContextRetrievalInvokers = {
            contextRetrievalStarted: () => actionsHub.contextRetrievalStarted.invoke({}),
            contextRetrieved: this.loadContext,
            contextRetrievalFailed: error => actionsHub.contextRetrievalFailed.invoke({ error })
        };

        const itemRetrievalInvokers: ItemRetrievalInvokers = {
            initialItemsRetrieved: this.handleInitialRetrievedPathItems,
            itemRetrieved: this.handleRetrievedPathItems,
            itemRetrievalFailed: this.handleRetrievalFailed,
            treeItemExpanding: path => actionsHub.treeItemExpanding.invoke(path),
            treeItemExpanded: path => actionsHub.treeItemExpanded.invoke(path),
            knowItemsFetched: this.handleKnownRetrievedPathItems,
            udpateDefaultPath: folderPath => actionsHub.treePathUpdated.invoke(folderPath),
            filePathsRetrieved: this.handleFilePathsRetrieved,
            knownFilePathsRetrieved: this.handleKnowFilePathsFetched,
            filePathsRetrievalFailed: (project: string, repositoryName: string) =>
                actionsHub.filePathsRetrievalFailed.invoke({ project, repositoryName })
        };

        const fileContentRetrievalInvokers: FileContentRetrievalInvokers = {
            fileContentRetrievalStarted: () => actionsHub.fileContentRetrievalStarted.invoke({}),
            fileContentRetrieved: this.loadFileContent,
            fileContentRetrievalFailed: (error) => actionsHub.fileContentRetrievalFailed.invoke({ error })
        }

        this.filter.subscribe(this.applyFilter, FILTER_CHANGE_EVENT);
        this.events = new EventGroup(this.filter);
        this.events.on(this.filter, FILTER_RESET_EVENT, this.onFilterResetClick);

        this.bridges = {
            contextRetrievalBridge: new ContextRetrievalBridge(contextRetrievalInvokers, this.sources.repositorySource),
            itemRetrievalBridge: new ItemRetrievalBridge(itemRetrievalInvokers, this.sources.repositorySource, this.sources.filePathsSource, this.getAggregatedState),
            fileContentRetrievalBridge: new FileContentRetrievalBridge(fileContentRetrievalInvokers, this.sources.fileContentSource)
        };
    }

    public dispose = (): void => {
        this.events.off(this.filter);
    }

    public loadInitialState = (
        searchText: string,
        filters?: string,
        sortOptions?: string,
        result?: string,
        activeTab?: string,
        launchPoint?: string): void => {
        const query = {
            searchText,
            skipResults: 0,
            takeResults: Constants.CodeSearchTakeResults,
            sortOptions: sortOptions ? deserialize<_SearchSharedContracts.EntitySortOption[]>(sortOptions) : [],
            summarizedHitCountsNeeded: true,
            searchFilters: filters ? deserialize<IDictionaryStringTo<string[]>>(filters) : {}
        } as SearchQuery;

        this.actionsHub.pageInitializationStarted.invoke({ query, activeTabKey: activeTab, launchPoint });
        this.sources
            .searchSource
            .getQueryResults(query)
            .then(({ responseWithActivityId, source }) => {
                const codeQueryResponse = (responseWithActivityId.response || responseWithActivityId) as CodeQueryResponse;
                const activityId = responseWithActivityId.activityId && responseWithActivityId.activityId[0];
                let activeItem;

                if (result) {
                    activeItem = this.getActiveItem(codeQueryResponse.results.values, result);
                }

                this.handleResultsLoaded(query, codeQueryResponse, source, activityId, activeItem);
            }, (error: SearchFailedPayload<SearchQuery>) => {
                this.actionsHub.searchFailed.invoke({ ...error, query });
            });
    }

    /**
     * Send query on landing page scenario to update searchstore to an adequate state
     */
    public showLandingPage = (filter?: string): void => {
        const query = {
            skipResults: 0,
            takeResults: Constants.CodeSearchTakeResults,
            sortOptions: [],
            summarizedHitCountsNeeded: true,
            searchFilters: filter ? deserialize<IDictionaryStringTo<string[]>>(filter) : {}
        } as SearchQuery;

        this.actionsHub.pageInitializationStarted.invoke({ query, isLandingPage: true });
    }

    public performSearch = (text: string, sortOptions: _SearchSharedContracts.EntitySortOption[], filters: { [id: string]: string[] }): void => {
        const searchQuery = {
            searchText: text,
            skipResults: 0,
            summarizedHitCountsNeeded: true,
            takeResults: Constants.CodeSearchTakeResults,
            sortOptions: sortOptions,
            searchFilters: filters,
        } as SearchQuery;

        this.doSearch(searchQuery);
    }

    public openSearchInNewTab = (searchText: string): void => {
        const { searchStoreState } = this.getAggregatedState();
        this.sources.pageSource.navigateToNewSearch(searchText, searchStoreState.query.searchFilters);
        this.telemetryWriter.publish(Constants.CustomerIntelligenceConstants.SearchInNewTab)
    }

    public applySearchText = (searchText: string) => {
        const { searchStoreState } = this.getAggregatedState();
        const searchQuery = {
            ...searchStoreState.query,
            searchText: searchText,
            takeResults: Constants.CodeSearchTakeResults,
            summarizedHitCountsNeeded: true
        };

        this.doSearch(searchQuery, false, false, false, true);
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

    public changeActiveItem = (item: CodeResult, changedOnNavigation?: boolean) => {
        const { selectedItem } = this.getAggregatedState();
        if (!!item && item !== selectedItem) {
            this.actionsHub.itemChanged.invoke({ item, changedOnNavigation });
            this.loadPreview(item);
        }
    }

    public changeActiveTab = (tabKey: string, changeOnNavigation: boolean = false) => {
        const { pivotTabsState } = this.getAggregatedState();
        if (pivotTabsState.currentTab !== tabKey) {
            this.actionsHub.activeTabChanged.invoke({ activeTabKey: tabKey, changeOnNavigation });
        }
    }

    public toggleFilePaneVisibility = (isVisible: boolean) => {
        this.actionsHub.filterPaneVisibilityChanged.invoke(isVisible);
    }

    public changePreviewOrienation = (previewOrientation: _PreviewSettingProps.PreviewSetting) => {
        this.actionsHub.previewOrientationChanged.invoke({ previewOrientation: previewOrientation });
    }

    public changeSortCriteria = (sortOption: _SortOptionProps.SortOption) => {
        const entitySortOption: _SearchSharedContracts.EntitySortOption = { field: sortOption.key, sortOrder: sortOption.order };
        if (sortOption.key === Constants.SortActionIds.Relevance) {
            const { searchStoreState } = this.getAggregatedState();
            // Re-issue a new search with no sort option(by default sort by relevance, and reduced Take value).
            const searchQuery: SearchQuery = {
                ...searchStoreState.query,
                sortOptions: [],
                takeResults: Constants.CodeSearchTakeResults,
                summarizedHitCountsNeeded: true
            };
            this.doSearch(searchQuery, false, true);
        }
        else {
            // sort items locally and update stores.
            const { searchStoreState } = this.getAggregatedState();
            const { response } = searchStoreState;
            const items = response ? response.results.values : [];

            this.sortItems(items, entitySortOption);
            this.actionsHub.sortOptionChanged.invoke({ sortedItems: items, sortOption: entitySortOption });
            this.loadPreview(items[0]);
        }
    }

    public expandTreeItem = (folderPath: string): void => {
        const { searchStoreState, repositoryContextStoreState } = this.getAggregatedState();
        const params = getPathSourceParams(searchStoreState.response.filterCategories);
        const { repositoryContext } = repositoryContextStoreState;

        if (repositoryContext) {
            this.bridges.itemRetrievalBridge.expandTreeItem(folderPath, params, repositoryContext);
        }
    }

    public collapseTreeItem = (path: string): void => {
        this.actionsHub.treeItemCollapsed.invoke(path);
    }

    public refineTreeItems = (searchText: string): void => {
        this.actionsHub.treeSearchTextChanged.invoke(searchText);
    }

    public dismissTreeDropdown = (): void => {
        this.actionsHub.treeDropdownDismissed.invoke(null);
    }

    public invokeTreeDropdown = (): void => {
        this.actionsHub.treeDropdownInvoked.invoke(null);
    }

    public updateHelpDropdownVisibility = (isVisible: boolean): void => {
        this.actionsHub.helpDropdownVisibilityChanged.invoke(isVisible);
    }

    public notifyFeedbackMailLinkClicked = (): void => {
        this.telemetryWriter.publish(Constants.CustomerIntelligenceConstants.FeedbackMailLinkClicked);
    }

    public fetchMoreResults = () => {
        const { searchStoreState } = this.getAggregatedState();
        const searchQuery = {
            ...searchStoreState.query,
            takeResults: Constants.CodeSearchShowMoreTakeResults,
            summarizedHitCountsNeeded: true
        };

        this.doSearch(searchQuery, true);
    }

    public gotoNextHit = () => {
        const actionInvoker = (
            highlights: _AdornmentCommon.DecorationAdornment[],
            activeHighlightIndex: number,
            itemPosition: number,
            items: CodeResult[],
            cursorPos: _VCFileViewer.FileViewerSelection) => {
            const totalHighlights = highlights.length;
            if (totalHighlights <= 0 ||
                isPositionAtFileEnd(highlights.length, activeHighlightIndex, cursorPos, highlights[totalHighlights - 1])) {
                this.changeActiveItem(items[itemPosition + 1]);
            }
            else {
                this.actionsHub.nextHitNavigated.invoke({});
            }
        }

        this.hitNavigate(actionInvoker);
    }

    public gotoPrevHit = () => {
        const actionInvoker = (
            highlights: _AdornmentCommon.DecorationAdornment[],
            activeHighlightIndex: number,
            itemPosition: number,
            items: CodeResult[],
            cursorPos: _VCFileViewer.FileViewerSelection) => {
            const totalHighlights = highlights.length;
            if (totalHighlights <= 0 ||
                isPositionAtFileStart(activeHighlightIndex, cursorPos, highlights[0])) {
                this.changeActiveItem(items[itemPosition - 1], true);
            }
            else {
                this.actionsHub.prevHitNavigated.invoke({});
            }
        }

        this.hitNavigate(actionInvoker);
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

    public publishZeroData = (scenarioType: string, error?: any): void => {
        this.telemetryWriter.publish(
            Constants.CustomerIntelligenceConstants.ZeroData,
            {
                scenarioType,
                error
            });
    }

    public publishNotificationBanner = (scenarioType: string): void => {
        this.telemetryWriter.publish(Constants.CustomerIntelligenceConstants.NotificationBanner, { scenarioType });
    }

    public errorNotificationBannerDismissed = (): void => {
        this.actionsHub.errorNotificationBannerDismissed.invoke({});
    }

    public publishSearchHelpFilter = (helpFilter: _SharedSearchHelpProps.ISearchFilter): void => {
        this.telemetryWriter.publish(Constants.CustomerIntelligenceConstants.SearchHelpFilterActivated, {
            filterText: helpFilter && helpFilter.text
        });
    }

    public dismissCrossAccountMenu = (): void => {
        this.actionsHub.crossAccountMenuDismissed.invoke(null);
    }

    public toggleAccountMenu = (): void => {
        const { accountStoreState, searchStoreState } = this.getAggregatedState();
        this.actionsHub.crossAccountMenuToggled.invoke(null);

        // Fire tenant query if not already.
        if (!accountStoreState.loadState) {
            // Apply only CodeElement filter if any.
            const searchFilters = searchStoreState
                .query
                .searchFilters[Constants.FilterKeys.CodeTypeFiltersKey] ? {
                    [Constants.FilterKeys.CodeTypeFiltersKey]:
                        searchStoreState
                            .query
                            .searchFilters[Constants.FilterKeys.CodeTypeFiltersKey]
                } : {};

            const query = {
                searchText: searchStoreState.query.searchText,
                sortOptions: [],
                searchFilters,
                takeResults: Constants.CodeSearchTakeResults,
                skipResults: 0,
                summarizedHitCountsNeeded: true
            } as SearchQuery;

            this.startTenantQuery(query);
        }
    }

    public activateCrossAccountItem = (item: _SearchSharedContracts.Filter): void => {
        const { accountStoreState } = this.getAggregatedState();
        const searchText = accountStoreState.searchQuery.searchText;
        const codeTypes = accountStoreState.searchQuery.searchFilters[Constants.FilterKeys.CodeTypeFiltersKey];
        const filters = codeTypes ? { [Constants.FilterKeys.CodeTypeFiltersKey]: codeTypes } : {};

        this.actionsHub.crossAccountMenuDismissed.invoke(null);
        this.sources.pageSource.navigateToAccount(item.name, searchText, filters);
    }

    private hitNavigate = (actionInvoker: HitNavigateInvoker) => {
        const { hitNavigationState, searchStoreState, selectedItem } = this.getAggregatedState();
        const { activeHighlightedAdornmentIndex, hitAdornments, cursorPosition } = hitNavigationState;
        const { results } = searchStoreState.response;
        const resultPosition: number = results.values.indexOf(selectedItem);
        actionInvoker(hitAdornments, activeHighlightedAdornmentIndex, resultPosition, results.values, cursorPosition);
    }

    public onCursorPositionChange = (cursorPosition: _VCFileViewer.FileViewerSelection) => {
        this.actionsHub.cursorPositionChanged.invoke({ cursorPosition: cursorPosition });
    }

    public onPreviewLoaded = (): void => {
        this.telemetryWriter.initialScenario.notifyPreviewLoaded(true);
    }

    public onPreviewLoadFailed = (): void => {
        this.telemetryWriter.initialScenario.notifyPreviewLoaded(false);
    }

    public onDiffLinesChanged = (diffLines: number[]) => {
        this.actionsHub.diffLinesChanged.invoke({ diffLines: diffLines });
    }

    public onCompareVersionPicked = (version: string, isOriginalSide: boolean) => {
        this.actionsHub.compareVersionPicked.invoke({ version, isOriginalSide });
    }

    public gotoNextCompareHit = () => {
        this.actionsHub.nextCompareHitNavigated.invoke({});
    }

    public gotoPrevCompareHit = () => {
        this.actionsHub.prevCompareHitNavigated.invoke({});
    }

    public toggleCompareView = () => {
        this.actionsHub.compareViewToggled.invoke({});
    }

    public downloadFile = (selectedItem: CodeResult) => {
        const { project, repositoryId, path, fileName, contentId, changeId, repository } = selectedItem;

        if (isGitType(selectedItem.vcType)) {
            this.sources.repositorySource.getGitItemDownloadUrl(
                project,
                repositoryId,
                path,
                changeId).then(downloadUrl => {
                    this.sources.pageSource.openUrlInNewtab(downloadUrl);
                    this.telemetryWriter.publish(Constants.CustomerIntelligenceConstants.FileDownloadStarted);
                });
        }
        else if (isTfvcType(selectedItem.vcType)) {
            this.sources.repositorySource.getTfvcItemDownloadUrl(
                project,
                path,
                changeId).then(downloadUrl => {
                    this.sources.pageSource.openUrlInNewtab(downloadUrl);
                    this.telemetryWriter.publish(Constants.CustomerIntelligenceConstants.FileDownloadStarted);
                });
        }
        else {
            this.sources.repositorySource.getCustomItemDownloadUrl(
                project,
                repository,
                path,
                fileName,
                contentId).then(downloadUrl => {
                    this.sources.pageSource.openUrlInNewtab(downloadUrl);
                    this.telemetryWriter.publish(Constants.CustomerIntelligenceConstants.FileDownloadStarted);
                });
        }
    }

    public toggleFullScreen = (isFullScreen: boolean) => {
        if (this.onFullScreen) {
            this.onFullScreen(isFullScreen);
        }

        this.actionsHub.fullScreenToggled.invoke(isFullScreen);
    }

    public applyDocumentKeyDown = (e: KeyboardEvent) => {
        if (e.keyCode === Constants.KeyCodes.F8_KeyCode) {
            e.preventDefault();
            if (e.shiftKey) {
                this.gotoPrevHit();
            }
            else if (isExclusivelyKeyPress(e)) {
                this.gotoNextHit();
            }
        }
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

    public clickContextualMenuItem = (menuItem: _ContextualMenu.IContextualMenuItem): void => {
        this.telemetryWriter.publish(Constants.CustomerIntelligenceConstants.ContextualMenuItemClicked, { menuItem: menuItem.name });

        if (menuItem.key === Constants.ItemCommandKeys.download) {
            this.downloadFile(menuItem.data.item);
        }
    }

    public clickFileNameLink = (link: string, evt: React.MouseEvent<HTMLElement>): void => {
        this.telemetryWriter.publish(Constants.CustomerIntelligenceConstants.FileNameClicked);

        // Instead of redirecting the browser, use Fast past switch to code hub.
        FPS.onClickFPS(this.pageContext, link, true, evt);
    }

    public clickLeftPaneFileNameLink = (link: string, evt: React.MouseEvent<HTMLElement>): void => {
        this.telemetryWriter.publish(Constants.CustomerIntelligenceConstants.LeftPaneFileNameClicked);

        // Instead of redirecting the browser, use Fast past switch to code hub.
        FPS.onClickFPS(this.pageContext, link, true, evt);
    }

    public onFiltersChanged = (name: string): void => {
        this.telemetryWriter.publish(Constants.CustomerIntelligenceConstants.FiltersUpdated, { name });
    }

    public clickLearnMoreLinkForPartialResults = (): void => {
        this.telemetryWriter.publish(Constants.CustomerIntelligenceConstants.LearnMoreOnPartialCodeResultsClicked);
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
                Constants.CustomerIntelligenceConstants.OrgSearchNavigationFromCodeSearchPageSource,
                SharedConstants.OrgSearchUrlTypeRepository);
            this.sources.pageSource.openUrlInNewtab(completeOrgSearchUrl);
        }
    }

    private doSearch(
        query: SearchQuery,
        fetchMoreScenario?: boolean,
        sortScenario?: boolean,
        filterApplication?: boolean,
        searchTextModified?: boolean): void {
        this.actionsHub.searchStarted.invoke({ query, sortScenario, filterApplication, fetchMoreScenario, searchTextModified });
        this.sources
            .searchSource
            .getQueryResults(query)
            .then(({ responseWithActivityId, source }) => {
                const codeQueryResponse = (responseWithActivityId.response || responseWithActivityId) as CodeQueryResponse;
                const { response } = this.getAggregatedState().searchStoreState;
                const activityId = responseWithActivityId.activityId && responseWithActivityId.activityId[0];
                const previousItemsCount = !!response ? response.results.values.length : 0;

                let activeItemIndex = 0;

                if (fetchMoreScenario) {
                    activeItemIndex = previousItemsCount;
                }
                this.handleResultsLoaded(query, codeQueryResponse, source, activityId, undefined, activeItemIndex);
            }, (error: SearchFailedPayload<SearchQuery>) => {
                this.actionsHub.searchFailed.invoke({ ...error, query });
            });
    }

    private handleRetrievedPathItems = (requestedPath: string, items: _VCLegacyContracts.ItemModel[], params: PathSourceParams): void => {
        this.invokeTreeItemsRetrieved(this.actionsHub.itemRetrieved, requestedPath, items, params);
    }

    private handleInitialRetrievedPathItems = (requestedPath: string, items: _VCLegacyContracts.ItemModel[], params: PathSourceParams): void => {
        this.invokeTreeItemsRetrieved(this.actionsHub.initialItemsRetrieved, requestedPath, items, params);
    }

    private handleKnownRetrievedPathItems = (requestedPath: string, items: _VCLegacyContracts.ItemModel[], params: PathSourceParams): void => {
        this.invokeTreeItemsRetrieved(this.actionsHub.knowItemsFetched, requestedPath, items, params);
    }

    private handleFilePathsRetrieved = (requestedPath: string, paths: string[], pathSourceParams: PathSourceParams): void => {
        this.actionsHub.filePathsRetrieved.invoke({ paths, pathSourceParams, requestedPath });
    }

    private handleRepositoryContextRetrieved = (
        repositoryContext: _VCRepositoryContext.RepositoryContext,
        project: string,
        repositoryName: string): void => {
        this.actionsHub.repositoryContextRetrieved.invoke({ project, repositoryContext, repositoryName });
    }

    private handleKnowFilePathsFetched = (requestedPath: string, paths: string[], pathSourceParams: PathSourceParams): void => {
        this.actionsHub.knownFilePathsFetched.invoke({ paths, pathSourceParams, requestedPath });
    }

    private handleRetrievalFailed = (): void => {
        this.actionsHub.itemRetrievalFailed.invoke(null);
    }

    private invokeTreeItemsRetrieved = (
        action: Action<ItemRetrievedPayload>,
        requestedPath: string,
        allRetrievedItems: _VCLegacyContracts.ItemModel[],
        pathSourceParams: PathSourceParams) => {
        action.invoke({ requestedPath, allRetrievedItems, pathSourceParams });
    }

    private handleResultsLoaded = (
        searchQuery: SearchQuery,
        response: CodeQueryResponse,
        source: SearchSourceType,
        activityId: string,
        activeItem?: CodeResult,
        activeItemIndex?: number): void => {
        const { appliedEntitySortOption } = this.getAggregatedState();
        const items = response.results.values;

        // sort items locally.
        this.sortItems(items, appliedEntitySortOption);
        // If no item is activated by default, first item or the item at index 'activeItemIndex' in the list of sorted results set is the one which needs to be activated.
        activeItem = activeItem || items[activeItemIndex] || items[0];

        this.refreshTreeStoreIfNeeded(response);
        this.actionsHub.resultsLoaded.invoke({ response, activeItem, activityId, source });
        this.postResultsLoad(searchQuery, response, activeItem);
    }

    private refreshTreeStoreIfNeeded = (response: CodeQueryResponse) => {
        const { searchStoreState } = this.getAggregatedState();
        const currentResponse = searchStoreState.response;

        if (!currentResponse) {
            this.actionsHub.treeRefreshed.invoke({});
            return;
        }

        const currentPathSourceParam = getPathSourceParams(currentResponse.filterCategories);
        const newPathSourceParam = getPathSourceParams(response.filterCategories);
        const refreshNeeded = currentPathSourceParam.project !== newPathSourceParam.project ||
            currentPathSourceParam.repositoryName !== newPathSourceParam.repositoryName ||
            currentPathSourceParam.versionString !== newPathSourceParam.versionString;

        if (refreshNeeded) {
            this.actionsHub.treeRefreshed.invoke({});
        }
    }

    private loadContext = (
        item: CodeResult,
        repoContext: _VCRepositoryContext.RepositoryContext,
        serverItem: _VCLegacyContracts.ItemModel,
        latestServerItem: _VCLegacyContracts.ItemModel): void => {
        this.actionsHub.contextRetrieved.invoke({ item, repositoryContext: repoContext, serverItem, latestServerItem });
        this.bridges.fileContentRetrievalBridge.getFileContents(item, repoContext);
    }

    private loadFileContent = (item: CodeResult, fileContent: _VCLegacyContracts.FileContent): void => {
        this.actionsHub.fileContentRetrieved.invoke({ fileContent: fileContent, item });
    }

    private applyFilter = (): void => {
        const currentFilterState = this.filter.getState();
        const { filterStoreState, searchStoreState } = this.getAggregatedState();
        const { filterItems } = filterStoreState;

        const filters: IDictionaryStringTo<string[]> = {};
        Object
            .keys(currentFilterState)
            .forEach((key) => {
                const value = currentFilterState[key].value;
                if (!value) {
                    return;
                }

                if (filterItems[key].enabled) {
                    filters[key] = value as string[];
                }
            });

        const searchQuery = {
            ...searchStoreState.query,
            searchFilters: scrub(filters),
            takeResults: Constants.CodeSearchTakeResults,
            summarizedHitCountsNeeded: true
        };

        this.doSearch(searchQuery, false, false, true);
    }

    private onFilterResetClick = (): void => {
        this.actionsHub.filterReset.invoke({});
        this.telemetryWriter.publish(Constants.CustomerIntelligenceConstants.FilterResetClicked);
    }

    private startTenantQuery = (query: SearchQuery): void => {
        // Return the error delegate so that the "query" is in the closure of the function.
        const onError = ((tenantQuery: SearchQuery) => {
            return error => this.actionsHub.tenantQueryFailed.invoke({ error, query: tenantQuery });
        })(query);

        this.actionsHub.tenantQueryStarted.invoke({ query });
        this.sources
            .tenantSource
            .getTenantQueryResults(query)
            .then(response => this.actionsHub.tenantResultsLoaded.invoke({ response }), onError);
    }

    /**
     * ItemKey should be undefined in all cases except URL sharing scenarios.
     * Returns either the first element on show more scenario or item identified by itemKey or the first item in the result set.
     */
    private getActiveItem = (newItems: CodeResult[], itemKey: string): CodeResult => {
        const activeItems = newItems.filter(i => getItemResultKey(i) === itemKey);

        return activeItems.length ? activeItems[0] : newItems[0];
    }

    private sortItems = (items: CodeResult[], sortOption: _SearchSharedContracts.EntitySortOption): void => {
        // Sort only for non-relevance sort action ids.
        if (sortOption.field !== Constants.SortActionIds.Relevance) {
            items.sort(this.comparer(sortOption));
        }
    }

    private comparer(sortOption: _SearchSharedContracts.EntitySortOption) {
        return (first: CodeResult, second: CodeResult) => {
            // using localeIgnoreCaseComparer so that it works for all locales.
            const compareValue: number = localeIgnoreCaseComparer(first[sortOption.field], second[sortOption.field]);
            return (sortOption.sortOrder === "desc") ? -compareValue : compareValue;
        }
    }

    private postResultsLoad = (searchQuery: SearchQuery, response: CodeQueryResponse, activeItem: CodeResult): void => {
        const pathSourceParams = getPathSourceParams(response.filterCategories)

        if (pathSourceParams.project && pathSourceParams.repositoryName) {
            // if item is sd type, no need to wait until repo context is fetched.
            if (activeItem && !isVCType(activeItem.vcType)) {
                this.fetchDataForPreview(activeItem, undefined);
            }

            // If for a project, search is scoped within a repository then page should work within the context of that "repository"
            this.getRepoContextPromise(pathSourceParams.project, pathSourceParams.repositoryName)
                .then(repoContext => {
                    if (activeItem && isVCType(activeItem.vcType)) {
                        this.fetchDataForPreview(activeItem, repoContext);
                    }

                    this.fetchFolders(searchQuery, pathSourceParams, repoContext);
                });
        }
        else if (activeItem) {
            this.loadPreview(activeItem);
        }
    }

    private fetchDataForPreview = (activeItem: CodeResult, repoContext: _VCRepositoryContext.RepositoryContext): void => {
        this.sources
            .contentRendererSource
            .getRenderer(getFileExtension(activeItem.path))
            .then(renderer =>
                this.actionsHub.contentRendererFetched.invoke({ isRendererPresent: !!renderer, item: activeItem }));
        this.bridges.contextRetrievalBridge.getContext(activeItem, repoContext);
    }

    private fetchFolders = (
        searchQuery: SearchQuery,
        pathSourceParams: PathSourceParams,
        repositoryContext: _VCRepositoryContext.RepositoryContext): void => {
        const { project, repositoryName, versionString } = pathSourceParams;

        const isGit = isGitRepo(repositoryName);
        const defaultPath = getDefaultPath(searchQuery.searchFilters);
        this.bridges.itemRetrievalBridge.getFolders(
            defaultPath, {
                project,
                repositoryName,
                versionString
            },
            repositoryContext);
    }

    private getRepoContextPromise = (project: string, repositoryName: string): IPromise<_VCRepositoryContext.RepositoryContext> => {
        const { knownRepositories } = this.getAggregatedState();
        const repoContext = knownRepositories[project.toLowerCase()] && knownRepositories[project.toLowerCase()][repositoryName.toLowerCase()];
        if (repoContext) {
            this.actionsHub.knownRepositoryContextRetrieved.invoke({ project, repositoryContext: repoContext, repositoryName });
            return Promise.resolve(repoContext);
        }
        else {
            return this.sources
                .repositorySource
                .getRepositoryContext(isGitRepo(repositoryName), project, repositoryName)
                .then(repositoryContext => {
                    this.actionsHub.repositoryContextRetrieved.invoke({ repositoryContext, project, repositoryName });
                    return repositoryContext;
                }, error => {
                    this.actionsHub.repositoryContextRetrievalFailed.invoke({ error, project, repositoryName });
                    throw { error };
                });
        }
    }

    private loadPreview = (item: CodeResult): void => {
        if (!isVCType(item.vcType)) {
            this.fetchDataForPreview(item, undefined);
        }
        else {
            this.getRepoContextPromise(item.project, item.repository)
                .then(repoContext => this.fetchDataForPreview(item, repoContext));
        }
    }
}

function isExclusivelyKeyPress(e: KeyboardEvent): boolean {
    return !e.ctrlKey && !e.altKey && !e.shiftKey;
}

function scrub(selectedFilterState: IDictionaryStringTo<string[]>): IDictionaryStringTo<string[]> {
    const selectedProjectsCount = selectedFilterState[Constants.FilterKeys.ProjectFiltersKey] &&
        selectedFilterState[Constants.FilterKeys.ProjectFiltersKey].length;

    if (!selectedProjectsCount) {
        Object.keys(selectedFilterState)
            .forEach(key => {
                if (key !== Constants.FilterKeys.CodeTypeFiltersKey) {
                    delete selectedFilterState[key];
                }
            });

        return selectedFilterState;
    }

    if (selectedProjectsCount > 1) {
        Object.keys(selectedFilterState)
            .forEach(key => {
                if (key !== Constants.FilterKeys.ProjectFiltersKey &&
                    key !== Constants.FilterKeys.CodeTypeFiltersKey) {
                    delete selectedFilterState[key];
                }
            });

        return selectedFilterState;
    }

    const selectedReposCount = selectedFilterState[Constants.FilterKeys.RepositoryFiltersKey]
        ? selectedFilterState[Constants.FilterKeys.RepositoryFiltersKey].length
        : 0;

    if (selectedProjectsCount > 0 && selectedReposCount > 1) {
        Object.keys(selectedFilterState)
            .forEach(key => {
                if (key !== Constants.FilterKeys.ProjectFiltersKey &&
                    key !== Constants.FilterKeys.CodeTypeFiltersKey &&
                    key !== Constants.FilterKeys.RepositoryFiltersKey) {
                    delete selectedFilterState[key];
                }
            });

        return selectedFilterState;
    }

    if (selectedProjectsCount > 0 && selectedReposCount <= 0) {
        Object.keys(selectedFilterState)
            .forEach(key => {
                if (key !== Constants.FilterKeys.ProjectFiltersKey &&
                    key !== Constants.FilterKeys.CodeTypeFiltersKey) {
                    delete selectedFilterState[key];
                }
            });

        return selectedFilterState;
    }

    const appliedPath = selectedFilterState[Constants.FilterKeys.PathFiltersKey] &&
        selectedFilterState[Constants.FilterKeys.PathFiltersKey][0];
    if (appliedPath === "/" || appliedPath === "\\" || appliedPath === "$/") {
        // No scoping required.
        delete selectedFilterState[Constants.FilterKeys.PathFiltersKey];
    }

    return selectedFilterState;
}
