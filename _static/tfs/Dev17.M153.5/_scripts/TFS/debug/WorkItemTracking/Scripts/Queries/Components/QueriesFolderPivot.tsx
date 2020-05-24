import { CheckboxVisibility, ColumnActionsMode, ConstrainMode, DetailsListLayoutMode, IColumn, SelectionMode } from "OfficeFabric/DetailsList";
import { GenericFilterZeroData } from "Presentation/Scripts/TFS/Components/GenericFilterZeroData";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { getDefaultPageTitle } from "VSS/Navigation/Services";
import * as Utils_Array from "VSS/Utils/Array";
import * as Utils_String from "VSS/Utils/String";
import { VssDetailsList } from "VSSUI/VssDetailsList";
import { NameColumn } from "WorkItemTracking/Scripts/Queries/Components/NameColumn";
import { IQueriesPivotProps, IQueriesPivotState, QueriesPivot } from "WorkItemTracking/Scripts/Queries/Components/QueriesPivot";
import { QueryModifiedByCell } from "WorkItemTracking/Scripts/Queries/Components/QueryModifiedByCell";
import { TabLoading } from "WorkItemTracking/Scripts/Queries/Components/TabLoading";
import { QueriesHubConstants } from "WorkItemTracking/Scripts/Queries/Models/Constants";
import { QueriesColumnKey, QueryItem, QueryLoadingState } from "WorkItemTracking/Scripts/Queries/Models/Models";
import { QueryUtilities } from "WorkItemTracking/Scripts/Queries/QueryUtilities";
import * as Resources from "WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking";
import * as React from "react";

export interface IQueriesFolderPivotProps extends IQueriesPivotProps {
    folderName: string;
    folderIdOrPath: string;
    onFolderClick: (event: React.MouseEvent<HTMLAnchorElement>, id: string) => void;
}
export class QueriesFolderPivot extends QueriesPivot<IQueriesFolderPivotProps, IQueriesPivotState> {

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
        const noFilterResults = !hasQueries && this.state.isSearching ? <GenericFilterZeroData artifactName={Resources.Items} /> : null;
        return <main aria-label={this.props.folderName} role="treegrid">
            <VssDetailsList
                setKey={"folder-queries"} // setKey is required to keep focus on the selected item when the row is re-rendered
                layoutMode={DetailsListLayoutMode.justified}
                constrainMode={ConstrainMode.unconstrained}
                columns={this.getColumns()}
                className="folder-queries"
                items={items}
                checkboxVisibility={CheckboxVisibility.hidden}
                selectionMode={SelectionMode.single}
                dragDropEvents={this._getDragDropEvents()}
                actionsColumnKey={QueriesColumnKey.Title}
                allocateSpaceForActionsButtonWhileHidden={true}
                shouldDisplayActions={this.shouldDisplayActions}
                getMenuItems={this.getMenuItems}
                getMenuItemProviders={this.getMenuItemProviders}
                onRenderItemColumn={this.onRenderItemColumn}
                onRenderRow={this.onRenderRow}
                initialFocusedIndex={document.activeElement === document.body ? 0 : -1}
                getKey={(item: QueryItem) => item.id}
                minimumPixelsForDrag={0}
            />
            {noFilterResults}
        </main>;
    }

    public componentDidUpdate(prevProps: IQueriesFolderPivotProps) {
        if (this.props.folderIdOrPath !== prevProps.folderIdOrPath) {
            // Set state to show the loading experience
            this.setState(this.getStateFromStore());

            this._initializeQueryFolder(this.props.folderIdOrPath).then(() => {
                this.setState(this.getStateFromStore());
            });
        }
    }

    protected getColumns(): IColumn[] {
        return [
            {
                fieldName: QueriesColumnKey.Title,
                key: QueriesColumnKey.Title,
                name: Resources.QueryColumnTitle,
                minWidth: 300,
                maxWidth: 500,
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
                minWidth: 150,
                maxWidth: 400,
                headerClassName: "query-column-header query-lastmodifiedby",
                className: "query-column-cell query-lastmodifiedby",
                columnActionsMode: ColumnActionsMode.disabled
            }
        ];
    }

    protected initialize(): void {
        this._draggedItem = null;
        this._initializeQueryFolder(this.props.folderIdOrPath);
    }

    protected getStateFromStore(): IQueriesPivotState {
        const parent = this.context.stores.queryHierarchyItemStore.getItem(this.props.folderIdOrPath);
        const isFiltering = this.context.stores.queryFolderStore.isFiltering();

        if (parent && parent.children) {
            const filterIds = this.context.stores.queryFolderStore.getFilteredIds();
            const filteredItems = isFiltering ? parent.children.filter((item) => Utils_Array.contains(filterIds, item.id, Utils_String.ignoreCaseComparer)) : parent.children;
            QueryUtilities.sortQueryFolderItems(filteredItems);

            return {
                items: filteredItems as QueryItem[],
                loadingState: QueryLoadingState.Loaded,
                isSearching: isFiltering
            };
        }

        return {
            loadingState: !parent || parent.hasChildren ? QueryLoadingState.Loading : QueryLoadingState.Loaded,
            items: [],
            isSearching: isFiltering
        } as IQueriesPivotState;
    }

    protected onRenderItemColumn = (item?: QueryItem, index?: number, column?: IColumn): JSX.Element => {
        const { onFolderClick } = this.props;

        if (!item) {
            return <div></div>;
        }

        switch (column.fieldName) {
            case QueriesColumnKey.Title:
                return <NameColumn
                    key={item.id}
                    queryItem={item}
                    ignoreDepth={true}
                    pivot={QueriesHubConstants.QueryFoldersPageAction}
                    ignoreExpansion={true}
                    onFolderNameClick={onFolderClick}
                />;
            case QueriesColumnKey.LastModifiedBy:
                if (item.lastModifiedBy) {
                    return <QueryModifiedByCell
                        modifiedBy={item.lastModifiedBy}
                        modifiedDate={item.lastModifiedDate}
                        tfsContext={TfsContext.getDefault()}
                    />;
                }
                break;
            default:
                return <div></div>;
        }
    }

    private _initializeQueryFolder(pathOrId: string): Promise<void> {
        return this.context.actionsCreator.ensureQueryFolderItem(pathOrId).then(() => {
            const folder = this.context.stores.queryHierarchyItemStore.getItem(pathOrId);
            if (folder) {
                // If it is not an id, change url
                if (!Utils_String.isGuid(pathOrId)) {
                    this.context.navigationActionsCreator.replaceUrlPathById(folder.id);
                }
                document.title = getDefaultPageTitle(folder.name);
            }
        }, (error: Error) => {
            this.context.navigationActionsCreator.navigateToQueriesPage(false, true);
            this.context.actionsCreator.showErrorMessageForQueriesView(error.message);
        });
    }
}
