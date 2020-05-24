import * as React from "react";

import { TabLoading } from "WorkItemTracking/Scripts/Queries/Components/TabLoading";
import { QueriesPivot, IQueriesPivotState, IQueriesPivotProps } from "WorkItemTracking/Scripts/Queries/Components/QueriesPivot";
import { QueryLoadingState, QueryItem, QueriesColumnKey, QuerySearchStatus, ActiveQueryView } from "WorkItemTracking/Scripts/Queries/Models/Models";
import { NameColumn } from "WorkItemTracking/Scripts/Queries/Components/NameColumn";
import { DetailsListLayoutMode, IColumn, ColumnActionsMode, CheckboxVisibility, ConstrainMode, SelectionMode } from "OfficeFabric/DetailsList";
import { Label } from "OfficeFabric/Label";
import Resources = require("WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking");
import { WITPerformanceScenario, PerformanceEvents } from "WorkItemTracking/Scripts/CustomerIntelligence";
import Utils_String = require("VSS/Utils/String");
import { QueriesHubConstants } from "WorkItemTracking/Scripts/Queries/Models/Constants";
import { QueryUtilities } from "WorkItemTracking/Scripts/Queries/QueryUtilities";
import { VssDetailsList } from "VSSUI/VssDetailsList";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { autobind } from "OfficeFabric/Utilities";
import { QueryModifiedByCell } from "WorkItemTracking/Scripts/Queries/Components/QueryModifiedByCell";
import { QueryPathCell } from "WorkItemTracking/Scripts/Queries/Components/QueryPathCell";
import { GenericFilterZeroData } from "Presentation/Scripts/TFS/Components/GenericFilterZeroData";
import { getDirectoryName } from "VSS/Utils/File";

export interface IAllQueriesPivotState extends IQueriesPivotState {
    hasMoreSearchResults?: boolean;
    searchText?: string;
}
const tfsContext = TfsContext.getDefault()
export class AllQueriesPivot extends QueriesPivot<IQueriesPivotProps, IAllQueriesPivotState> {
    protected SCENARIO_NAME: string = WITPerformanceScenario.QUERIESHUB_QUERIESVIEW_OPENALLQUERIESPIVOT;

    public render(): JSX.Element {
        let pivotElement: JSX.Element = undefined;
        if (this.state.loadingState === QueryLoadingState.Loading) {
            pivotElement = <TabLoading />;
        } else {
            pivotElement = this._renderView();
        }

        return pivotElement;
    }

    private _renderView(): JSX.Element {
        const items = this.state.items;
        const hasQueries = items.length > 0;
        const isSearchView = this.state.isSearching;
        const noSearchResults = !hasQueries && isSearchView ? <GenericFilterZeroData artifactName={Resources.Items} /> : null;
        const hasMoreSearchResults = isSearchView && this.state.hasMoreSearchResults
            ? <Label className="more-results-label">{Utils_String.format(Resources.MaxQuerySearchResultMessage, QueriesHubConstants.MaxQuerySearchResultCount, this.state.searchText)}</Label>
            : null;

        return <main aria-label={Resources.Queries} role="treegrid">
            <VssDetailsList
                setKey={"all-queries"} // setKey is required to keep focus on the selected item when the row is re-rendered
                layoutMode={DetailsListLayoutMode.justified}
                constrainMode={ConstrainMode.unconstrained}
                isHeaderVisible={true}
                columns={isSearchView ? this.getSearchColumns() : this.getColumns()}
                className={isSearchView ? "search-queries" : "all-queries"}
                items={items}
                checkboxVisibility={CheckboxVisibility.hidden}
                onRenderItemColumn={isSearchView ? this.onRenderSearchResultItemColumn : this.onRenderItemColumn}
                dragDropEvents={this._getDragDropEvents()}
                onRenderRow={this.onRenderRow}
                selectionMode={SelectionMode.single}
                initialFocusedIndex={document.activeElement === document.body ? 0 : -1}
                getKey={(item: QueryItem) => item.id}
                actionsColumnKey={QueriesColumnKey.Title}
                allocateSpaceForActionsButtonWhileHidden={true}
                shouldDisplayActions={this.shouldDisplayActions}
                getMenuItems={this.getMenuItems}
                getMenuItemProviders={this.getMenuItemProviders}
                minimumPixelsForDrag={0}
            />
            {noSearchResults}
            {hasMoreSearchResults}
        </main>;
    }

    protected initialize(): void {
        this.context.actionsCreator.setActiveQueryView(ActiveQueryView.All);
        this.context.actionsCreator.initializeQuerySearch();
        this._draggedItem = null;
        this.context.actionsCreator.initializeAllQueries();
    }

    protected getStateFromStore(): IAllQueriesPivotState {
        let queryItems: QueryItem[] = [];

        if (this.context.stores.querySearchStore.getSearchStatus() === QuerySearchStatus.ResultsReady) {
            queryItems = this.context.stores.querySearchStore.getResults().map((value) => {
                return {
                    ...value,
                    depth: 0,
                    expanded: false,
                    expanding: false
                } as QueryItem;
            });
        } else {
            queryItems = QueryUtilities.mergeQueryItems(this.context.stores.queryHierarchyStore.getVisible(),
                this.context.stores.queryHierarchyItemStore.getAll());
        }

        queryItems = queryItems.filter(item => !item.isNoSubfolderContext);

        const isWaitingOnSearch = this.context.stores.querySearchStore.getSearchStatus() === QuerySearchStatus.Pending
            || this.context.stores.querySearchStore.getSearchStatus() === QuerySearchStatus.InProgress;

        const isDataReady = this.context.stores.queryFavoriteGroupStore.isLoaded()
            && this.context.stores.queryHierarchyStore.isLoaded()
            && this.context.stores.queryHierarchyItemStore.areRootFolderItemsLoaded()
            && !isWaitingOnSearch;

        return {
            items: queryItems,
            loadingState: isDataReady ? QueryLoadingState.Loaded : QueryLoadingState.Loading,
            isSearching: this.context.stores.querySearchStore.getSearchStatus() !== QuerySearchStatus.None,
            hasMoreSearchResults: this.context.stores.querySearchStore.hasMoreResults(),
            searchText: this.context.stores.querySearchStore.getSearchText()
        };
    }

    protected onRenderItemColumn = (item?: QueryItem, index?: number, column?: IColumn): JSX.Element => {
        if (!item) {
            return null;
        }

        switch (column.fieldName) {
            case QueriesColumnKey.Title:
                return <NameColumn key={item.id} queryItem={item} ignoreDepth={false} pivot={"all"} />;
            case QueriesColumnKey.LastModifiedBy:
                if (item.depth > 0 && !item.isEmptyFolderContext && item.lastModifiedBy) {
                    return <QueryModifiedByCell
                        modifiedBy={item.lastModifiedBy}
                        modifiedDate={item.lastModifiedDate}
                        tfsContext={tfsContext}
                    />;
                }
                return null;
            default:
                return null;
        }
    }

    // this has autobind since it's called as a result of a promise
    @autobind
    protected onRenderSearchResultItemColumn(item?: QueryItem, index?: number, column?: IColumn): JSX.Element {
        if (!item) {
            return null;
        }

        switch (column.fieldName) {
            case QueriesColumnKey.Title:
                return <NameColumn key={item.id} queryItem={item} ignoreDepth={true} pivot={"all"} />;
            case QueriesColumnKey.Folder:
                return <QueryPathCell path={getDirectoryName(item.path)} />;
            case QueriesColumnKey.LastModifiedBy:
                if (item.lastModifiedBy) {
                    return <QueryModifiedByCell
                        modifiedBy={item.lastModifiedBy}
                        modifiedDate={item.lastModifiedDate}
                        tfsContext={tfsContext}
                    />;
                }
                return null;
            default:
                return null;
        }
    }

    protected getColumns(): IColumn[] {
        return [
            {
                fieldName: QueriesColumnKey.Title,
                key: QueriesColumnKey.Title,
                name: Resources.QueryColumnTitle,
                minWidth: 400,
                maxWidth: 800,
                headerClassName: "query-column-header query-name",
                className: "query-column-cell query-name",
                isResizable: true,
                columnActionsMode: ColumnActionsMode.disabled
            },
            {
                fieldName: QueriesColumnKey.LastModifiedBy,
                key: QueriesColumnKey.LastModifiedBy,
                name: Resources.QueryColumnLastModifiedBy,
                isResizable: true,
                minWidth: 250,
                maxWidth: 500,
                headerClassName: "query-column-header query-lastmodifiedby",
                className: "query-column-cell query-lastmodifiedby",
                columnActionsMode: ColumnActionsMode.disabled
            }
        ];
    }

    protected getSearchColumns(): IColumn[] {
        return [
            {
                fieldName: QueriesColumnKey.Title,
                key: QueriesColumnKey.Title,
                name: Resources.QueryColumnTitle,
                minWidth: 250,
                maxWidth: 450,
                headerClassName: "query-column-header query-name",
                className: "query-column-cell query-name",
                isResizable: true,
                columnActionsMode: ColumnActionsMode.disabled
            },
            {
                fieldName: QueriesColumnKey.Folder,
                key: QueriesColumnKey.Folder,
                name: Resources.QueryColumnFolder,
                minWidth: 300,
                maxWidth: 500,
                headerClassName: "query-column-header query-path",
                className: "query-column-cell query-path",
                isResizable: true,
                columnActionsMode: ColumnActionsMode.disabled
            },
            {
                fieldName: QueriesColumnKey.LastModifiedBy,
                key: QueriesColumnKey.LastModifiedBy,
                name: Resources.QueryColumnLastModifiedBy,
                isResizable: true,
                minWidth: 150,
                maxWidth: 400,
                headerClassName: "query-column-header query-lastmodifiedby",
                className: "query-column-cell query-lastmodifiedby",
                columnActionsMode: ColumnActionsMode.disabled
            }
        ];
    }
}
