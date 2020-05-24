import "VSS/LoaderPlugins/Css!WorkItemsHub/Scripts/Components/WorkItemsTabContent";

import { CheckboxVisibility, ConstrainMode, DetailsListLayoutMode, IColumn, SelectionMode, DetailsRow, IDetailsRowProps } from "OfficeFabric/DetailsList";
import { Link } from "OfficeFabric/Link";
import { Spinner, SpinnerSize } from "OfficeFabric/Spinner";
import { autobind, css, Async } from "OfficeFabric/Utilities";
import { Selection } from "OfficeFabric/utilities/selection/Selection";
import { WorkItemStateColorsProvider } from "Presentation/Scripts/TFS/FeatureRef/WorkItemStateColorsProvider";
import * as PresentationResources from "Presentation/Scripts/TFS/Resources/TFS.Resources.Presentation";
import * as React from "react";
import * as VSSComponent from "VSS/Flux/Component";
import * as Utils_Array from "VSS/Utils/Array";
import * as Utils_String from "VSS/Utils/String";
import { IFilter, FILTER_CHANGE_EVENT } from "VSSUI/Utilities/Filter";
import { VssDetailsList, IVssDetailsList } from "VSSUI/VssDetailsList";
import { ActionsCreator } from "WorkItemsHub/Scripts/Actions/ActionsCreator";
import { IWorkItemsGridData, IWorkItemsGridRow } from "WorkItemsHub/Scripts/DataContracts/IWorkItemsGridData";
import { WorkItemsGridDataProvider } from "WorkItemsHub/Scripts/DataProviders/WorkItemsGridDataProvider";
import { WorkItemsHubCommandProvider } from "WorkItemsHub/Scripts/DataProviders/WorkItemsHubCommandProvider";
import { WorkItemsHubTabs } from "WorkItemsHub/Scripts/Generated/Constants";
import { WorkItemsHubPaging } from "WorkItemsHub/Scripts/Generated/Constants";
import { WorkItemsHubData, WorkItemsHubSortOption } from "WorkItemsHub/Scripts/Generated/Contracts";
import * as Resources from "WorkItemsHub/Scripts/Resources/TFS.Resources.WorkItemsHub";
import { WorkItemsHubStore } from "WorkItemsHub/Scripts/Stores/WorkItemsHubStore";
import { PerformanceTelemetryHelper, UsageTelemetryHelper } from "WorkItemsHub/Scripts/Utils/Telemetry";
import { IWorkItemsGridColumnFactory } from "WorkItemsHub/Scripts/Utils/WorkItemsGridColumnFactory";
import * as WorkItemsHubTabUtils from "WorkItemsHub/Scripts/Utils/WorkItemsHubTabUtils";
import { ZeroDataFactory } from "WorkItemsHub/Scripts/Utils/ZeroDataFactory";
import {
    generateDefaultFilterState,
    mapToFilterState,
    resolveFilterState,
} from "WorkItemTracking/Scripts/Controls/Filters/WorkItemFilter";
import { isFilterStateEmpty } from "WorkItemTracking/Scripts/Filtering/FilterManager";
import { CoreFieldRefNames } from "Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants";
import { IContextualMenuItem } from 'OfficeFabric/ContextualMenu';
import { OnOpenWorkItemHandler } from "WorkItemsHub/Scripts/Utils/NavigationUtils";
import { getWorkItemsHubTriageData, IWorkItemsHubTriageData } from "WorkItemsHub/Scripts/WorkItemsViewRegistration";
import { updateColumnSettings } from "WorkItemsHub/Scripts/Utils/WorkItemsHubTabSettings";
import * as Utils_Accessibility from "VSS/Utils/Accessibility";
import { equals } from "VSS/Utils/String";

export interface IWorkItemsTabContentData {
    /**
     * Tab ID.
     */
    tabId: string;
    /**
     * Work item IDs of items that are selected
     */
    selectionIds: number[];
    /**
     * Indicates if content has filter applied
     */
    hasFilter: boolean;
}

export interface IWorkItemsTabContentProps extends VSSComponent.Props {
    tabId: string;
    gridClassName?: string;
    store: WorkItemsHubStore;
    actionsCreator: ActionsCreator;
    gridColumnFactory: IWorkItemsGridColumnFactory;
    projectInfo: ContextIdentifier;
    tagWidthsCache: IDictionaryStringTo<number>;
    performanceTelemetry?: PerformanceTelemetryHelper;
    commandProvider?: WorkItemsHubCommandProvider;
    filter?: IFilter;
    onOpenWorkItem: OnOpenWorkItemHandler;
    /*
     * Callback when tab content changes.
     * @param tabData The data containing information about tab content.
     */
    onTabContentChanged?: (tabData: IWorkItemsTabContentData) => void;
    scrollableContentContainer: Element;
}

export interface IWorkItemsTabContentState {
    initialized: boolean;
    selection: Selection;
    gridData: IWorkItemsGridData;
    columns: IColumn[];
    totalItemCount: number;
    visibleItemCount: number;
    isFiltered: boolean;
    isError: boolean;
    isSupportedFeature: boolean;
    isPagingInProgress: boolean;
}

const ShowingResultsMessageFormatMap: IDictionaryStringTo<string> = {
    "": Resources.ShowingItemsFormat, // this is the fallback/default
    [WorkItemsHubTabUtils.TabIdByTabEnumValueMap[WorkItemsHubTabs.RecentlyCreated]]: Resources.ShowingRecentlyCreatedItemsFormat,
    [WorkItemsHubTabUtils.TabIdByTabEnumValueMap[WorkItemsHubTabs.RecentlyCompleted]]: Resources.ShowingRecentlyCompletedItemsFormat,
    [WorkItemsHubTabUtils.TabIdByTabEnumValueMap[WorkItemsHubTabs.RecentlyUpdated]]: Resources.ShowingRecentlyUpdatedItemsFormat
};

const ShowingSingularResultMessageFormatMap: IDictionaryStringTo<string> = {
    "": Resources.ShowingItemFormat, // this is the fallback/default
    [WorkItemsHubTabUtils.TabIdByTabEnumValueMap[WorkItemsHubTabs.RecentlyCreated]]: Resources.ShowingRecentlyCreatedItemFormat,
    [WorkItemsHubTabUtils.TabIdByTabEnumValueMap[WorkItemsHubTabs.RecentlyCompleted]]: Resources.ShowingRecentlyCompletedItemFormat,
    [WorkItemsHubTabUtils.TabIdByTabEnumValueMap[WorkItemsHubTabs.RecentlyUpdated]]: Resources.ShowingRecentlyUpdatedItemFormat
};

export class WorkItemsTabContent extends VSSComponent.Component<IWorkItemsTabContentProps, IWorkItemsTabContentState> {
    public static readonly BaseClassName = "work-items-tab-content";
    public static readonly GridBaseClassName = "work-items-hub-grid";
    public static readonly WorkItemsHubDetailsListClassName = "work-items-hub-detailslist";
    public static readonly WorkItemsHubGridRowClassName = "work-items-hub-row";

    private static readonly ItemHeight = 41;  // Height of a single item in the list
    private static readonly PageSize = 10;    // Number of items in a list page.

    private static ColumnResizeDefaultDelayTimeInMilliseconds = 500;

    private _selectedIds: number[] = [];
    private _telemetrySent = false;
    private _vssDetailsList: IVssDetailsList;
    private _initialSelectedIndex: number;
    private _recreateColumns: boolean = false;
    private _delayedOnColumnResize: (column?: IColumn, newWidth?: number, columnIndex?: number) => void;
    private _async: Async;

    constructor(props?: IWorkItemsTabContentProps, context?: any) {
        super(props, context);

        this._async = new Async();
        this._delayedOnColumnResize = this._async.debounce(this._onColumnResize, WorkItemsTabContent.ColumnResizeDefaultDelayTimeInMilliseconds, { leading: false, trailing: true });
    }

    public render(): JSX.Element {
        const tabId: string = this.props.tabId;
        const { initialized, totalItemCount, visibleItemCount, gridData, isError, isSupportedFeature } = this.state;
        const store = this.getStore();
        const dataSource = store.getHubFilterDataSource(this.props.tabId);

        let content: JSX.Element | JSX.Element[];
        if (isError) {
            content = ZeroDataFactory.createForMissingTabData();
        }
        else if (!initialized) {
            content = <Spinner size={SpinnerSize.large} className="work-items-hub-spinner" label={PresentationResources.Loading} />;
        }
        else if (visibleItemCount === 0) {
            const zeroDataContent = ZeroDataFactory.createForEmptyData(tabId, isSupportedFeature, totalItemCount > 0);
            content = dataSource.canPageMoreItems() ?
                <div>{zeroDataContent}<div className="zero-data-load-more">{this._buildLoadMoreLink()}</div></div> : zeroDataContent;
        }
        else {
            content = <div role="navigation" aria-label={Resources.WorkItemsHubGridLandmarkLabel}>
                {this._buildDetailList(gridData)}
                {this._buildLoadMoreLink()}
            </div>;
        }

        return <div className={WorkItemsTabContent.BaseClassName}>{content}</div>;
    }

    private _buildDetailList(gridData: IWorkItemsGridData): JSX.Element {
        const { columns, selection, isFiltered } = this.state;
        const getMenuItems = (item: IWorkItemsGridRow): IContextualMenuItem[] =>
            this.props.commandProvider && this.props.commandProvider.getContextMenuItems(this.props.store.getWorkItemsHubPermission(), item);

        return (
            <VssDetailsList
                className={css(WorkItemsTabContent.WorkItemsHubDetailsListClassName, this.props.gridClassName)}
                usePresentationStyles={true}
                items={gridData}
                columns={columns}
                isHeaderVisible={true}
                onColumnHeaderClick={this._onColumnClick}
                onColumnResize={this._delayedOnColumnResize}
                constrainMode={ConstrainMode.unconstrained}
                selectionMode={SelectionMode.multiple}
                checkboxVisibility={CheckboxVisibility.onHover}
                checkButtonAriaLabel={Resources.CheckButtonLabel}
                actionsColumnKey={CoreFieldRefNames.Title}
                getMenuItems={getMenuItems}
                layoutMode={DetailsListLayoutMode.fixedColumns}
                selection={selection}
                onItemInvoked={this._handleNavigateToEdit}
                listProps={{
                    getPageHeight: this._getPageHeight,
                    getItemCountForPage: this._getItemCountForPage,
                    renderedWindowsAhead: isFiltered ? 0 : undefined,
                    renderedWindowsBehind: isFiltered ? 0 : undefined
                }}
                onRenderRow={this._onRenderRow}
                onRowDidMount={this._onRowDidMount}
                setKey={WorkItemsTabContent.GridBaseClassName}
                initialFocusedIndex={this._initialSelectedIndex}
                componentRef={this._onDetailsListRef}
            />
        );
    }

    @autobind
    private _onColumnClick(ev?: React.MouseEvent<HTMLElement>, column?: IColumn): void {
        const shiftClick = ev.shiftKey;
        let newSortOptions: WorkItemsHubSortOption[];

        const fieldReferenceName = column.key;
        const store = this.props.store;
        const dataSource = store.getHubFilterDataSource(this.props.tabId);

        // No-op if this is an unsortable field
        if (!dataSource.isSortableField(fieldReferenceName)) {
            return;
        }

        // Get current sorting values        
        const oldSortOptions = dataSource.getSortOptions();
        const oldIndex = oldSortOptions.findIndex(option => option.fieldReferenceName === fieldReferenceName);

        if (!shiftClick) {
            // clear any secondary sort choices
            // flip choice of ascending/descending if the column is already being sorted
            const isAscending = oldIndex < 0 || !oldSortOptions[oldIndex].isAscending;
            newSortOptions = [{
                fieldReferenceName,
                isAscending
            } as WorkItemsHubSortOption];
        }
        else {
            // if column is already being sorted, flip its direction
            // otherwise, add as a new sorted column
            newSortOptions = oldSortOptions.slice();
            if (oldIndex < 0) {
                newSortOptions.push({
                    fieldReferenceName,
                    isAscending: true
                } as WorkItemsHubSortOption);
            }
            else {
                newSortOptions[oldIndex].isAscending = !oldSortOptions[oldIndex].isAscending;
            }
        }

        this.props.actionsCreator.sortColumn(this.props.tabId, newSortOptions);

        // get existing column display
        const columnOptions = dataSource.getCurrentColumnOptions();

        UsageTelemetryHelper.publishColumnHeaderClick(this.props.tabId, {
            sortedColumnCount: newSortOptions.length,
            sortedColumns: newSortOptions.map(option => option.fieldReferenceName).join(),
            sortedOrder: newSortOptions.map(option => option.isAscending).join()
        });

        const version: number = dataSource.getCurrentColumnSettingsVersion();

        updateColumnSettings(this.props.projectInfo.id, this.props.tabId, columnOptions, newSortOptions, version);

        // build new columns
        this._recreateColumns = true;
    }

    @autobind
    private _onColumnResize(column?: IColumn, newWidth?: number, columnIndex?: number): void {
        // Get current column settings
        const fieldReference = column.key;
        const store = this.props.store;
        const dataSource = store.getHubFilterDataSource(this.props.tabId);
        const columnOptions = dataSource.getCurrentColumnOptions();
        const sortOptions = dataSource.getSortOptions();

        // Always save width as an integer value
        newWidth = Math.ceil(newWidth)

        columnOptions.forEach(option => {
            if (equals(option.fieldReferenceName, fieldReference, true)) {
                option.width = newWidth;
            }
        });

        UsageTelemetryHelper.publishColumnResize(this.props.tabId, {
            columnName: fieldReference,
            width: newWidth
        });
        const version: number = dataSource.getCurrentColumnSettingsVersion();

        // save new column size
        updateColumnSettings(this.props.projectInfo.id, this.props.tabId, columnOptions, sortOptions, version);
    }

    @autobind
    private _onDetailsListRef(ref: IVssDetailsList): void {
        this._vssDetailsList = ref;
    }

    @autobind
    private _handleNavigateToEdit(item: IWorkItemsGridRow) {
        return this.props.onOpenWorkItem(item.id);
    }

    @autobind
    private _getPageHeight(): number {
        return WorkItemsTabContent.ItemHeight * this._getItemCountForPage();
    }

    @autobind
    private _getItemCountForPage(): number {
        return WorkItemsTabContent.PageSize;
    }

    @autobind
    private _onRenderRow(props: IDetailsRowProps): JSX.Element {
        return <DetailsRow {...props} className={WorkItemsTabContent.WorkItemsHubGridRowClassName} data-item-key={props.item.key} />;
    }

    @autobind
    private _onRowDidMount(item: IWorkItemsGridRow): void {
        if (!this._vssDetailsList || !this._vssDetailsList.detailsList || !this.state.selection || this._initialSelectedIndex === -1) {
            return;
        }

        const { selection } = this.state;

        // This is the same technique used by DetailsList internally (to set focus on a row), we're
        // waiting for the first row mount and then scrolling to our target row and setting selection on it; we're only
        // scroll and select once (notice setting _initialSelectedIndex to -1 at the end and the condition above).
        const initialIndex = this._initialSelectedIndex;

        if (!this._trySetEffectiveScrollPosition(initialIndex)) {
            this._vssDetailsList.detailsList.scrollToIndex(initialIndex);
        }

        requestAnimationFrame(() => selection.setIndexSelected(initialIndex, true, true));

        this._initialSelectedIndex = -1;
    }

    public componentDidMount(): void {
        super.componentDidMount();
        const isDataInitialized = this.props.store.isHubDataInitialized(this.props.tabId);
        if (!isDataInitialized) {
            this._performanceScenarioSplit("FetchData");
            this.props.actionsCreator.refreshDataProviderAsync(this.props.tabId);
        }
        else if (this.props.filter) {
            this._performanceScenarioSplit("SetFilterForTab");
            this._setFilterForTab();
        }

        if (this.props.performanceTelemetry) {
            this.props.performanceTelemetry.addData({ isDataCached: isDataInitialized });
        }

        const stateColorDataProvider = WorkItemStateColorsProvider.getInstance();
        const projectName: string = this.props.projectInfo.name;
        if (!stateColorDataProvider.isPopulated(projectName)) {
            this._performanceScenarioSplit("LoadStatesColorAsync");
            this.props.actionsCreator.loadStatesColorAsync(projectName);
        }

        this._tryEndPerformanceScenario();
    }

    public componentWillUnmount() {
        super.componentWillUnmount();
        this._unsubscribeFilter();

        if (this._async) {
            this._async.dispose();
            this._async = null;
        }
    }

    @autobind
    private _filterChanged() {
        const { filter, actionsCreator, tabId } = this.props;

        actionsCreator.updateFilterState(tabId, mapToFilterState(filter.getState()));
        this._onTabContentChanged();
        Utils_Accessibility.announce(Utils_String.format(Resources.FilterChangedAnnouncementFormat, this._getResultMessage()), true);
    }

    public componentWillUpdate(nextProps: IWorkItemsTabContentProps, nextState: IWorkItemsTabContentState) {
        // Cache selected keys so they can be restored after updating.
        const { selection } = this.state;
        this._selectedIds = selection.getSelectedCount() > 0 ?
            selection.getSelection().map((row: IWorkItemsGridRow) => row.id) : [];

        if (this.state.initialized && !nextState.initialized) {
            // Tab data was refreshed - unsubscribe from the filter.
            this._unsubscribeFilter();
        } else if (!this.state.initialized && nextState.initialized) {
            // Tab was loading before, now that it's setup, initialize the filter with the loaded filter state
            this._setFilterForTab();
        }
    }

    private _trySetEffectiveScrollPosition(initialIndex: number): boolean {
        let isEffectiveScrollPositionSet: boolean = false;

        // No point messing with the Math if current index of selected element is 0. This can happen quite frequently with 'My Activity' or 'Recently Updated' tabs.
        if (initialIndex !== 0) {
            const { scrollableContentContainer } = this.props;
            const triageData: IWorkItemsHubTriageData = getWorkItemsHubTriageData();

            if (scrollableContentContainer &&
                triageData && triageData.lastTriagedWorkItemId) {
                let effectiveScrollTopValue = triageData.selectedIndexScrollTopValue;
                const oldIndexOfLastTriagedWorkItem = triageData.selectedItemIndexInVisibleList;
                effectiveScrollTopValue -= ((oldIndexOfLastTriagedWorkItem - initialIndex) * WorkItemsTabContent.ItemHeight);
                scrollableContentContainer.scrollTop = effectiveScrollTopValue;
                isEffectiveScrollPositionSet = true;
            }
        }

        return isEffectiveScrollPositionSet;
    }

    private _getResultMessage(): string {
        const { tabId } = this.props;
        const store = this.getStore();

        if (!store.isHubDataInitialized(tabId)) {
            return null;
        }

        const totalResult = store.getVisibleItemsCount(this.props.tabId);
        const map = totalResult <= 1 ? ShowingSingularResultMessageFormatMap : ShowingResultsMessageFormatMap;
        const messageTextFormat: string = map[this.props.tabId] || map[""];
        return Utils_String.format(messageTextFormat, totalResult);
    }

    private _buildLoadMoreLink(): JSX.Element {
        const store = this.getStore();
        const dataSource = store.getHubFilterDataSource(this.props.tabId);
        if (!dataSource.isPagingSupported()) {
            return null;
        }

        if (this.state.isPagingInProgress) {
            return <div className="message-container">
                <Spinner size={SpinnerSize.small} className="spinner" />
                <div className="spinner-label">{PresentationResources.Loading}</div>
            </div>;
        }
        else {
            let linkText: string = null;
            let matchDetails: string = null;
            if (this.state.isFiltered) {
                if (this.state.totalItemCount > WorkItemsHubPaging.MaxWorkItems) {
                    matchDetails = Utils_String.format(Resources.PagingFilterMatchSummary,
                        this.state.visibleItemCount, dataSource.getPagedItemsCount(), this.state.totalItemCount);
                    linkText = dataSource.canPageMoreItems() ? Resources.PagingContinueSearch : null;
                }
                else {
                    linkText = Resources.PagingSeeMoreItemsOnline;
                }
            }
            else {
                linkText = dataSource.canPageMoreItems() ? Resources.PagingSeeMoreItems : null;
            }

            return <div className="message-container">
                {matchDetails} <Link onClick={this._onLoadMore}> {linkText} </Link >
            </div>;
        }
    }

    @autobind
    private _onLoadMore() {
        const { tabId, store, actionsCreator } = this.props;
        const dataSource = store.getHubFilterDataSource(tabId);
        actionsCreator.pageWorkItems(tabId, dataSource);
    }

    private _unsubscribeFilter() {
        const { filter } = this.props;
        filter.unsubscribe(this._filterChanged, FILTER_CHANGE_EVENT);
    }

    private _setFilterForTab() {
        // Set persisted filter state
        const store = this.getStore();

        const { tabId, filter } = this.props;
        const filterFields = store.getHubFilterFields(tabId);
        const filterDataSource = store.getHubFilterDataSource(tabId);
        const filterState = filterDataSource ? filterDataSource.getFilterState() : null;

        filter.setDefaultState(generateDefaultFilterState(filterFields));
        filter.reset();

        if (!isFilterStateEmpty(filterState)) {
            resolveFilterState(filterFields, filterDataSource, filterState).then(resolvedFilterState => {
                filter.setState(resolvedFilterState);
                filter.subscribe(this._filterChanged, FILTER_CHANGE_EVENT);
            }, () => {
                // Ignore error, just clear out filter
                filter.reset();
            });
        } else {
            filter.subscribe(this._filterChanged, FILTER_CHANGE_EVENT);
        }

        this._onTabContentChanged();
    }

    public componentDidUpdate() {
        const { gridData, selection } = this.state;
        if (gridData) {
            selection.setItems(gridData, true);
            if (this._selectedIds.length > 0) {
                const indicesToSelect: number[] = [];
                gridData.forEach((row: IWorkItemsGridRow, index: number) => {
                    if (this._selectedIds.indexOf(row.id) > -1) {
                        indicesToSelect.push(index);
                    }
                });
                requestAnimationFrame(() => indicesToSelect.forEach((index: number) => selection.setIndexSelected(index, true, true)));
            }
        }

        this._tryEndPerformanceScenario();
    }

    private _buildColumns(hubData: WorkItemsHubData, sortOptions: WorkItemsHubSortOption[], columnFieldRefNames: string[]): IColumn[] {
        let columns: IColumn[] = null;

        if (!hubData) {
            return columns;
        }

        if (this.state && this.state.columns && !this._recreateColumns) {
            const currentFieldRefNames = this.state.columns.map(col => col.fieldName);
            if (Utils_Array.arrayEquals(currentFieldRefNames, columnFieldRefNames)) {
                return this.state.columns;
            }
        }

        columns = WorkItemsGridDataProvider.buildColumns(
            this.props.projectInfo.name,
            hubData,
            sortOptions,
            this.props.gridColumnFactory,
            new Date(),
            this.props.onOpenWorkItem);

        this._recreateColumns = false;

        return columns;
    }

    protected getState(): IWorkItemsTabContentState {
        const store: WorkItemsHubStore = this.getStore();
        const tabId: string = this.props.tabId;
        const initialized: boolean = store.isHubDataInitialized(tabId);
        const isError: boolean = store.isHubDataError(tabId);
        const isSupportedFeature: boolean = store.isSupportedFeature(tabId);
        const totalItemCount: number = store.getTotalItemsCount(tabId);
        const visibleItemCount: number = store.getVisibleItemsCount(tabId);
        const dataSource = store.getHubFilterDataSource(tabId);

        let sortOptions: WorkItemsHubSortOption[] = null;
        let columnFieldRefNames: string[] = null;
        let isFiltered = false;
        let isPagingInProgress = false;
        let hubData: WorkItemsHubData = null;
        let gridData: IWorkItemsGridData = null;

        if (dataSource) {
            sortOptions = dataSource.getSortOptions();
            columnFieldRefNames = dataSource.getDisplayedFieldReferenceNames();
            isFiltered = dataSource.hasFilter();
            isPagingInProgress = dataSource.isPagingInProgress();
        }

        if (initialized) {
            hubData = store.getHubDisplayData(tabId);
            gridData = WorkItemsGridDataProvider.getData(hubData, isFiltered, this.props.tagWidthsCache);
        }

        const selection = this.state && this.state.selection || new Selection({ onSelectionChanged: this._onTabContentChanged });

        const previousInitializedState: boolean = this.state && this.state.initialized;
        if (!previousInitializedState && gridData && gridData.length > 0) {
            let selectedIndex = 0;
            const triageData: IWorkItemsHubTriageData = getWorkItemsHubTriageData();
            if (triageData && triageData.lastTriagedWorkItemId != null) {
                selectedIndex = Utils_Array.findIndex(gridData, (r: IWorkItemsGridRow) => r.id === triageData.lastTriagedWorkItemId);
            }
            this._initialSelectedIndex = Math.max(0, selectedIndex);
        }

        const columns: IColumn[] = this._buildColumns(hubData, sortOptions, columnFieldRefNames);

        return {
            initialized,
            totalItemCount,
            visibleItemCount,
            gridData,
            columns,
            selection,
            isFiltered,
            isError,
            isSupportedFeature,
            isPagingInProgress
        };
    }

    protected getStore(): WorkItemsHubStore {
        return this.props.store;
    }

    /**
     * This function should get call whenever tab content changes.
     */
    @autobind
    private _onTabContentChanged() {
        if (this.props.onTabContentChanged) {
            const { selection } = this.state;
            const itemsSelection = selection.getSelection();
            const selectionIds = itemsSelection.map((row: IWorkItemsGridRow) => row.id);
            const store = this.getStore();
            const tabId = this.props.tabId;
            const dataSource = store.getHubFilterDataSource(tabId);
            const hasFilter = dataSource ? dataSource.hasFilter() : false;

            this.props.onTabContentChanged({ selectionIds, hasFilter, tabId });
        }
    }

    /**
     * Try to end a currently active performance scenario. This function is called at two places:
     * - componentDidMount  : this is for the initial load or switch to a tab that has cached data
     * - componentDidUpdate : this is for switching to a tab that doesn't have cached data
     */
    private _tryEndPerformanceScenario() {
        if (this.props.performanceTelemetry) {
            if (this._telemetrySent || !this.props.performanceTelemetry.isActive()) {
                return;
            }

            const store: WorkItemsHubStore = this.getStore();
            const tabId: string = this.props.tabId;
            const isDataInitialized = store.isHubDataInitialized(tabId);

            if (isDataInitialized) {
                const dataSource = store.getHubFilterDataSource(tabId);
                const totalWorkItemsCount = dataSource ? dataSource.getItemCount() : -1;
                const hasFilters = dataSource ? dataSource.hasFilter() : false;

                this.props.performanceTelemetry.addData({
                    tabId: tabId,
                    totalWorkItemsCount: totalWorkItemsCount,
                    hasFilters: hasFilters,
                    completedItems: dataSource.shouldShowCompletedItems(),
                });

                const columnOptions = dataSource.getCurrentColumnOptions();
                this.props.performanceTelemetry.addData({
                    columnCount: dataSource.getDisplayedFieldReferenceNames().length,
                    columnNames: columnOptions.map(option => option.fieldReferenceName),
                    columnWidths: columnOptions.map(option => option.width),
                    sortedColumnCount: dataSource.getSortOptions().length,
                    sortedColumnNames: dataSource.getSortOptions().map(option => option.fieldReferenceName)
                });

                this.props.performanceTelemetry.end();
                this._telemetrySent = true;
            }
        }
    }

    private _performanceScenarioSplit(name: string) {
        if (this.props.performanceTelemetry) {
            this.props.performanceTelemetry.split(name);
        }
    }
}
