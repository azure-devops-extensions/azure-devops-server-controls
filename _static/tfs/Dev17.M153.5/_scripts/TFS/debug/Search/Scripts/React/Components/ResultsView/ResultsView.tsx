/// Copyright (c) Microsoft Corporation. All rights reserved.
/// <reference types="react" />
/// <reference types="react-dom" />

"use strict";

import * as React from "react";
import * as ReactDOM from "react-dom";
import * as Models from "Search/Scripts/React/Models";
import * as CellRenderers from "Search/Scripts/React/Components/GridCellRenderers/GridCellRenderers";
import * as Performance from "VSS/Performance";
import {PerfConstants} from "Search/Scripts/Common/TFS.Search.Performance";
import { css } from "OfficeFabric/Utilities";
import { domElem} from "VSS/Utils/UI";
import { SearchConstants } from "Search/Scripts/Common/TFS.Search.Constants";
import { SelectionMode } from "OfficeFabric/utilities/selection/interfaces";
import { DetailsList, IColumn, ConstrainMode, DetailsListLayoutMode, CheckboxVisibility } from "OfficeFabric/DetailsList";
import { IDetailsRowProps, DetailsRow } from "OfficeFabric/components/DetailsList/DetailsRow";
import { Selection } from "OfficeFabric/utilities/selection/index";
import { Fabric } from "OfficeFabric/Fabric";
import { StoresHub } from "Search/Scripts/React/StoresHub";
import { ActionCreator} from "Search/Scripts/React/ActionCreator";
import {events} from "Search/Scripts/React/ActionsHub";
import {ignoreCaseComparer} from "VSS/Utils/String";

import "VSS/LoaderPlugins/Css!fabric";
import "VSS/LoaderPlugins/Css!Search/React/Components/ResultsView";

namespace KeyCodes {
    export const F10 = 121;
}

export interface ISearchGridCellColumn {
    contentRenderer: (props: CellRenderers.GridCellRenderProps) => JSX.Element;
    key: string;
    displayName: string;
    minWidth?: number;
    maxWidth?: number;
}

export interface ISearchResultsGridProps {
    items: any[];
    initialRowIndexUnderFocus: number;
    columns: ISearchGridCellColumn[];
    actionCreator: ActionCreator;
    storesHub: StoresHub;
    availableWidth: number;
    renderMode: string;
    isClientSideSortEnabled: boolean;
    isServerSortEnabled: boolean;
    getItemKey: (item, index) => any;
    searchEntity: string;
    isV2Layout: boolean;
    // optionals

    getComparerDelegate?: (fieldName, order) => Function;
    data?: any;
    isHeaderVisible?: boolean;
}

export interface ISearchResultsGridState {
    items: any;
    mode: string,
    orientation: string,
    tfsData: any;
    initialRowIndexUnderFocus: number;
    availableWidth: number;
    optionalResultsMetadata?: IDictionaryStringTo<any>;
}

interface ISearchResultRowProps {
    rowProps: IDetailsRowProps;
}

export function renderResultsView(container: any, props: ISearchResultsGridProps): void {
    ReactDOM.render(
        <SearchResultsGrid { ...props }/>,
        container);
}

export class SearchResultsGrid extends React.Component<ISearchResultsGridProps, ISearchResultsGridState> {
    private _viewState: ISearchResultsGridState;
    private _selection: SearchGridSelection;
    private _activeRows: Array<DetailsRow>;
    private _viewsDataCache: IDictionaryStringTo<any>;

    constructor(props: ISearchResultsGridProps) {
        super(props);

        this._viewState = {
            items: props.items,
            initialRowIndexUnderFocus: props.initialRowIndexUnderFocus,
            availableWidth: props.availableWidth,
            tfsData: props.data || {},
            orientation: props.storesHub.previewOrientationStore.orientation,
            mode: props.storesHub.resultsViewStore.viewMode
        } as ISearchResultsGridState

        this._activeRows = [];
        this.state = this._viewState;
        this._selection = new SearchGridSelection({
            getKey: props.getItemKey,
            onSelectionChanged: () => {
                let item = this._selection.getSelection().length > 0 ? this._selection.getSelection()[0] : null,
                    index = this._selection.getSelectedIndices().length > 0 ? this._selection.getSelectedIndices()[0] : -1;

                if (!$.isEmptyObject(item) && index !== -1) {
                    // ToDo: piyusing, this should actually create an action.
                    // Rather than directly updating store use action creator here.
                    // Reason: On research on context menu clicks onActiveItemChanged delegate is called(no obvious reason found yet)
                    // Which causes multiple action to fire at same violating mutext policy of actions causing error messages in console.
                    this.props.storesHub.searchResultsActionStore.updateActiveItemRow(item, index, this);
                }
            }
        });
        this._viewsDataCache = {};
    }

    public render(): JSX.Element {
        let className = "item-container",
            scenarioName = SearchResultsGrid._getScenarioName(this.props.searchEntity);

        // if the control need not to be rendered, don't render the details list.
        let isVisible = this.state.items.length > 0 &&
            this.state.mode === this.props.renderMode;

        if (!isVisible) {
            className += " collapsed";
        }

        // abort scenario if already active.
        Performance
            .getScenarioManager()
            .abortScenario("SearchPortal", scenarioName);
        // start scenario again.
        Performance
            .getScenarioManager()
            .startScenario("SearchPortal", scenarioName);
        let resultView = <div className={className}>
            <DetailsList
                setKey="searchResultsGrid"  // Setting setKey variable with random text so that selection of DetailsList will not change on resizing
                items={this.state.items}
                initialFocusedIndex={this.state.initialRowIndexUnderFocus}
                selection={this._selection}
                columns={this._getColumns() }
                selectionMode={SelectionMode.single}
                constrainMode={ConstrainMode.unconstrained}
                layoutMode={DetailsListLayoutMode.justified}
                checkboxVisibility={CheckboxVisibility.hidden}
                isHeaderVisible={this.props.isHeaderVisible}
                selectionPreservedOnEmptyClick={true}
                onDidUpdate={this._onDidUpdate.bind(this) }
                onRenderRow={
                    (p: IDetailsRowProps) => {
                        let onDidMount = p.onDidMount;
                        p.onDidMount = (row: DetailsRow) => {
                            let index = (row as any).props.itemIndex;
                            this._activeRows[index] = row;

                            if (onDidMount) {
                                onDidMount(row);
                            }
                        };

                        return (<Row
                            {...p}
                            orientation={this.state.orientation}
                            searchEntity={this.props.searchEntity}
                            onShowContextMenu={this._onShowContextMenu.bind(this)} />);
                    }
                }
                onItemInvoked={(item?: any, index?: number, ev?: Event) => {
                    if (!$.isEmptyObject(item)) {
                        this.props.actionCreator.invokeActiveRow(item, index, this);
                    }
                    else {
                        // click is on show more. Fetch more items
                        this.props.actionCreator.fetchMoreItems(this);
                    }
                } }/>
        </div>

        //Fabric wrapper is added only on the results grid for old layout as for the new layout we will have it on the page level for all react components.
        //This is done to get outline around rows in focus in the result grid.
        if (!this.props.isV2Layout) {
            return (
                <Fabric>
                    {resultView}
                </Fabric>
            );
        }
        else {
            return (resultView);
        }
    }

    /**
     * Method called when the component is successfully mounted in the component's lifecycle.
     * We are using this method to bind to changes in the results info store.
     */
    public componentDidMount(): void {
        this.props.storesHub.searchResultsStore.addChangedListener(this._onResultsStoreChanged.bind(this));
        this.props.storesHub.previewOrientationStore.addChangedListener(this._onPreviewOrientationChanged.bind(this));
        this.props.storesHub.resultsViewStore.addChangedListener(this._onResultsViewModeChanged.bind(this));
        this.props.storesHub.tfsDataStore.addChangedListener(this._onTfsDataChanged.bind(this));
        this.props.storesHub.searchResultsActionStore.addListener(events.RESULTS_GRID_ACTIVE_ROW_CHANGED_EVENT, this._onActiveRowChanged.bind(this));

        if (this.props.isClientSideSortEnabled || this.props.isServerSortEnabled) {
            this.props.storesHub.sortCriteriaStore.addChangedListener(this._onSortCriteriaChanged.bind(this));
        }
    }

    private _onDidUpdate(): void {
        let index = this._selection.getSelectedIndices().length > 0 ? this._selection.getSelectedIndices()[0] : -1;
        if (index !== -1) {
            let item = this.props.storesHub.searchResultsStore.items[index];
            if (item) {
                this.props.storesHub.searchResultsActionStore.updateActiveItemRow(item, index, this);
            }
        }

        Performance
            .getScenarioManager()
            .endScenario("SearchPortal",
            SearchResultsGrid._getScenarioName(this.props.searchEntity));
    }

    private _onResultsStoreChanged(): void {
        let items = this.props.storesHub.searchResultsStore.items,
            queryTakeResults = this.props.storesHub.searchResultsStore.query.takeResults || 0,
            indexUnderFocus = this.props.storesHub.searchResultsStore.selectedIndex,
            availableWidth = this.props.storesHub.searchResultsStore.availableWidth,
            totalResultsCount = this.props.storesHub.searchResultsStore.totalResultsCount,
            tfsData = this.props.storesHub.tfsDataStore.state.data,
            orientation = this.props.storesHub.previewOrientationStore.orientation,
            optionalResultsMetadata = this.props.storesHub.searchResultsStore.resultsMetadata;

        // sort the data set based on sort criteria iff client sort is enabled.
        // in server sort scenario whenever the results store changes the data is sorted from server.
        if (this.props.isClientSideSortEnabled) {
            let fieldRefName: string = this.props.storesHub.sortCriteriaStore.firstSortOption.field,
                sortOrder: string = this.props.storesHub.sortCriteriaStore.firstSortOption.sortOrder;

            items = this._getItems(items, fieldRefName, sortOrder);

            // set the new order in store too so as to avoid sorting everytime when the results view mode changes.
            this.props.storesHub.searchResultsStore.items = items;
        }

        this._viewState.items = $.extend(true, [], items);

        // Add a dummy row only in case of Code search results to morph into show more link.
        if (ignoreCaseComparer(this.props.searchEntity, SearchConstants.CodeEntityTypeId) === 0 &&
            (totalResultsCount > queryTakeResults &&
                queryTakeResults === SearchConstants.DefaultTakeResults)) {
            this._viewState.items.push({});
        }

        this._viewState.initialRowIndexUnderFocus = indexUnderFocus;
        this._viewState.availableWidth = availableWidth;
        this._viewState.tfsData = tfsData;
        this._viewState.orientation = orientation;
        this._viewState.optionalResultsMetadata = optionalResultsMetadata;

        // set selected index in the selection so that the row is selected upon render completion.
        this._selection.setIndexUnderFocus(indexUnderFocus);

        // clean up views data cache. It is supposed to be repopulated once the results grid is finished rendering.
        this._viewsDataCache = {};
        this.setState(this._viewState);
    }

    private _onPreviewOrientationChanged(): void {
        let shouldUpdate = this.state.items.length > 0 &&
            this.state.mode === this.props.renderMode;
        if (shouldUpdate) {
            this._viewState.orientation = this.props.storesHub.previewOrientationStore.orientation;
            this.setState(this._viewState);
        }
    }

    private _onResultsViewModeChanged(): void {
        this._viewState.mode = this.props.storesHub.resultsViewStore.viewMode;

        // if control is not visible, empty the contents to prevent some cpu cycles spent while drawing rows.
        if (this._viewState.mode !== this.props.renderMode) {
            this._viewState.items = [];
        }
        else {
            this._viewState.items = this.props.storesHub.searchResultsStore.items;
            this._viewState.initialRowIndexUnderFocus = 0;
        }

        this.setState(this._viewState);
    }

    private _onSortCriteriaChanged(): void {
        // Peform client sort if the feature is enabled or if server sort is enabled but the results set is small
        // enough to perform sort on client itself.
        let shouldUpdate = this.state.items.length > 0 && this.state.mode === this.props.renderMode,
            fieldRefName: string = this.props.storesHub.sortCriteriaStore.firstSortOption.field,
            sortOrder: string = this.props.storesHub.sortCriteriaStore.firstSortOption.sortOrder;

        if (shouldUpdate &&
            (this.props.isClientSideSortEnabled ||
                (this.props.isServerSortEnabled &&
                    this.state.items.length <= SearchConstants.WorkItemSearchTakeResults &&
                    ignoreCaseComparer(fieldRefName, "relevance") !== 0)) &&
            this.props.getComparerDelegate) {
            let items = $.extend(true, [], this.state.items),
                sortedItems = this._getItems(items, fieldRefName, sortOrder);
            this._viewState.items = sortedItems;
            // To retain the focus on the sort control itself.
            this._viewState.initialRowIndexUnderFocus = null;
            // Unselect all the elements in the results grid
            this._selection.setAllSelected(false);
            this._selection.setIndexUnderFocus(0);
            // set the new order in store too so as to avoid sorting everytime when the results view mode changes.
            this.props.storesHub.searchResultsStore.items = sortedItems;
            this.setState(this._viewState);
        }
    }

    private _onActiveRowChanged(): void {
        let index = this.props.storesHub.searchResultsActionStore.index; 
        if (this._activeRows &&
            this._activeRows[index] &&
            !this._selection.isIndexSelected(index)) {
            //Unselect all the elements in the results grid
            this._selection.setAllSelected(false);
            //Select only the active element
            this._selection.setIndexSelected(index, true, false);
            //Set the active element under focus
            this._selection.setIndexUnderFocus(index);
            this._activeRows[index].focus();
        }
      
    }

    private _onTfsDataChanged(): void {
        let data = this.props.storesHub.tfsDataStore.state.data;
        this._viewState.tfsData = data;
        this.setState(this._viewState);
    }

    private _getColumns(): IColumn[] {
        // return empty array if the current results view need not to be rendered.
        let shouldUpdate = this.state.items.length > 0 && this.state.mode === this.props.renderMode;
        if (!shouldUpdate) {
            return [];
        }

        let columnData = {
            previewOrientation: this.state.orientation,
            actionCreator: this.props.actionCreator,
            storesHub: this.props.storesHub,
            availableWidth: this.state.availableWidth,
            data: this.state.tfsData,
            optionalResultsMetadata: this.state.optionalResultsMetadata,
            cache: {
                get: ((key: string) => { return this._viewsDataCache[key]; }).bind(this),
                set: ((key: string, value: any) => {
                    this._viewsDataCache[key] = value;
                }).bind(this)
            }
        },
            columns = this.props.columns.map((col: ISearchGridCellColumn, index) => {
                return {
                    className: "search-grid-cell",
                    fieldName: col.key,
                    key: col.key,
                    name: col.displayName,
                    minWidth: col.minWidth,
                    maxWidth: col.maxWidth,
                    isCollapsable: true,
                    isResizable: true,
                    data: columnData,
                    contentRenderer: col.contentRenderer
                } as IColumn;
            });
        return columns;
    }

    private _getItems(items: Array<any>, sortFieldName: string, sortFieldOrder: string): Array<any> {
        // sort the contents before hand.
        if (this.props.getComparerDelegate) {
            let comparer: any = this.props.getComparerDelegate(sortFieldName, sortFieldOrder);
            if (comparer && $.isFunction(comparer)) {
                items = items.sort(comparer);
            }
        }

        return items;
    }

    private static _getScenarioName(searchEntity: string): string {
        return ignoreCaseComparer(searchEntity, SearchConstants.CodeEntityTypeId) === 0
            ? PerfConstants.CodeSearchReactViewRendering
            : PerfConstants.WorkItemSearchReactViewRendering;
    }

    private _onShowContextMenu(item: any, index: number): any {
        return this.props.actionCreator.showSearchResultContextMenu(item, index, this);
    }
}

export class Row extends React.Component<any, any> {
    constructor(props: any) {
        super(props);
    }

    public render(): JSX.Element {
        let orientation = this.props.orientation,
            searchEntity = this.props.searchEntity;
        return (
            <div className={ css("search-result-row", {
                "vertical-split": orientation === "bottom",
                "code-entity": searchEntity === SearchConstants.CodeEntityTypeId
            }) } onKeyDown={
                ((evt) => {
                    if (evt && evt.shiftKey && evt.which === KeyCodes.F10) {
                        this.props.onShowContextMenu(this.props.item, this.props.itemIndex);
                        evt.preventDefault();
                    }
                }).bind(this)
            } >
                <DetailsRow {...this.props as IDetailsRowProps} onRenderItemColumn={
                    ((item: any, index: number, column: any) => {
                        if (column) {
                            let props = {
                                item: item,
                                index: index,
                                columnData: column.data
                            };

                            return column.contentRenderer(props);
                        }
                    }).bind(this)
                } />
            </div>
        );
    }
}

class SearchGridSelection extends Selection {
    private _indexUnderFocus: number;

    public setIndexUnderFocus(index: number): void {
        this._indexUnderFocus = index;
    }

    public getIndexUnderFocus(): number {
        return this._indexUnderFocus;
    } 

    public setItems(items: any, shouldResetSelection: boolean): void {
        super.setItems(items, shouldResetSelection);

        if (typeof this._indexUnderFocus !== "undefined") {
            super.setIndexSelected(this._indexUnderFocus, true, false);
        }
    }
}