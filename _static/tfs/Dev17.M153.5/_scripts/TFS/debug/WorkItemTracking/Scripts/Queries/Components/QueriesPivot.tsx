import * as TFS_Admin_Security_NOREQUIRE from "Admin/Scripts/TFS.Admin.Security";
import { IContextualMenuItem } from "OfficeFabric/ContextualMenu";
import { IColumn } from "OfficeFabric/DetailsList";
import { DetailsRow, IDetailsRowProps } from "OfficeFabric/components/DetailsList/DetailsRow";
import { IGroup } from "OfficeFabric/components/GroupedList/index";
import { IDragDropContext, IDragDropEvents } from "OfficeFabric/utilities/dragdrop/interfaces";
import { ISelection } from "OfficeFabric/utilities/selection/interfaces";
import { KeyboardAccesibleComponent } from "Presentation/Scripts/TFS/Components/KeyboardAccessible";
import { MessageDialog } from "VSS/Controls/Dialogs";
import "VSS/LoaderPlugins/Css!Queries/Components/QueriesPivot";
import { INavigationHistoryService, getNavigationHistoryService } from "VSS/Navigation/NavigationHistoryService";
import { TelemetryEventData, publishEvent } from "VSS/Telemetry/Services";
import { getDirectoryName, getRootDirectory } from "VSS/Utils/File";
import * as Utils_String from "VSS/Utils/String";
import { KeyCode } from "VSS/Utils/UI";
import { using } from "VSS/VSS";
import { ContributableMenuItemProvider } from "VSSPreview/Providers/ContributableMenuItemProvider";
import { IVssContextualMenuItemProvider } from "VSSUI/VssContextualMenu";
import { ActionParameters } from "WorkItemTracking/Scripts/ActionUrls";
import { QueryResultsProvider } from "WorkItemTracking/Scripts/Controls/WorkItemsProvider";
import { PerformanceEvents, WITCustomerIntelligenceArea, WITCustomerIntelligenceFeature } from "WorkItemTracking/Scripts/CustomerIntelligence";
import { promptMessageDialog } from "WorkItemTracking/Scripts/Dialogs/WITDialogs";
import { IQueriesHubContext, QueriesHubContextPropTypes } from "WorkItemTracking/Scripts/Queries/Components/QueriesHubContext";
import { addToTeamFavorites, divider, removeFromTeamFavorites, security } from "WorkItemTracking/Scripts/Queries/ContextMenuItems";
import { QueriesHubConstants } from "WorkItemTracking/Scripts/Queries/Models/Constants";
import { QueryItem, QueryLoadingState, QuerySaveDialogMode } from "WorkItemTracking/Scripts/Queries/Models/Models";
import { QueryUtilities } from "WorkItemTracking/Scripts/Queries/QueryUtilities";
import * as Resources from "WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking";
import { PerfScenarioManager } from "WorkItemTracking/Scripts/Utils/PerfScenarioManager";
import * as React from "react";
import { showDialog } from "WorkItemTracking/Scripts/Queries/Components/QuerySaveDialog.Renderer";

let queryItemSecurityManager: TFS_Admin_Security_NOREQUIRE.SecurityManager;

export interface IQueriesPivotProps {
}

export interface IQueriesPivotState {
    items: QueryItem[];
    loadingState: QueryLoadingState;
    groups?: IGroup[];
    isSearching?: boolean;
}

export abstract class QueriesPivot<TProps extends IQueriesPivotProps, TState extends IQueriesPivotState> extends React.Component<TProps, TState> {
    protected SCENARIO_NAME: string;
    protected _draggedItem: QueryItem;

    static contextTypes = QueriesHubContextPropTypes;

    public context: IQueriesHubContext;
    private _rows: IDictionaryStringTo<DetailsRow> = {};
    private _historyService: INavigationHistoryService;
    protected _groupHeaders: IDictionaryStringTo<KeyboardAccesibleComponent> = {};

    constructor(props: TProps, context: IQueriesHubContext) {
        super(props, context);
        this.state = this.getStateFromStore();
        this._historyService = getNavigationHistoryService();
    }

    public componentWillMount() {
        PerfScenarioManager.addSplitTiming(PerformanceEvents.QUERIESHUB_QUERIESPIVOT_COMPONENT_MOUNT, true);
    }

    public componentDidMount() {
        PerfScenarioManager.addSplitTiming(PerformanceEvents.QUERIESHUB_QUERIESPIVOT_COMPONENT_MOUNT, false);

        this.context.stores.queryHierarchyItemStore.addChangedListener(this.onStoreChanged);
        this.context.stores.queryHierarchyStore.addChangedListener(this.onStoreChanged);
        this.context.stores.queryFavoriteGroupStore.addChangedListener(this.onStoreChanged);
        this.context.stores.queryPermissionMetadataStore.addChangedListener(this.onStoreChanged);
        this.context.stores.queryErrorMessageStore.addChangedListener(this.onStoreChanged);
        this.context.stores.querySearchStore.addChangedListener(this.onStoreChanged);
        this.context.stores.queryFolderStore.addChangedListener(this.onStoreChanged);

        this.initialize();
    }

    public componentWillUnmount() {
        this.context.stores.queryHierarchyItemStore.removeChangedListener(this.onStoreChanged);
        this.context.stores.queryHierarchyStore.removeChangedListener(this.onStoreChanged);
        this.context.stores.queryFavoriteGroupStore.removeChangedListener(this.onStoreChanged);
        this.context.stores.queryPermissionMetadataStore.removeChangedListener(this.onStoreChanged);
        this.context.stores.queryErrorMessageStore.removeChangedListener(this.onStoreChanged);
        this.context.stores.querySearchStore.removeChangedListener(this.onStoreChanged);
        this.context.stores.queryFolderStore.removeChangedListener(this.onStoreChanged);
    }

    private _setSelected(selection: ISelection, deselectIndex: number, selectIndex: number): void {
        // Remove old selection
        selection.setIndexSelected(deselectIndex, false, false);
        // Set new selection
        selection.setIndexSelected(selectIndex, true, true);
    }

    /**
     * Gets row id for the DetailsRow lookup.
     *
     * By default, query item guid is used as uniqueidentifier of the rows.
     */
    protected _getRowId(queryItem: QueryItem): string {
        if (queryItem) {
            return queryItem.id;
        }

        return null;
    }

    protected _getRow(queryItem: QueryItem): DetailsRow {
        const rowId = this._getRowId(queryItem);
        if (!rowId) {
            return null;
        }

        return this._rows[rowId];
    }

    protected _setRowFocus(queryItem: QueryItem): void {
        const row = this._getRow(queryItem);
        if (row) {
            row.focus();
        }
    }

    private _getGroupHeader(id: string): KeyboardAccesibleComponent {
        if (!id) {
            return null;
        }
        return this._groupHeaders[id];
    }

    private rowOnKeyDown = (e: React.KeyboardEvent<HTMLDivElement>, props: IDetailsRowProps) => {
        const isRow = (target: EventTarget) => $(target).parent().hasClass("queries-list-row");
        if (e.altKey || e.ctrlKey || !isRow(e.target)) {
            return;
        }

        const queryItem: QueryItem = props.item;
        const { expanded, isFolder, isEmptyFolderContext } = queryItem;
        const toggleFolder = () => {
            if (expanded) {
                this.context.actions.QueryFolderCollapsed.invoke(queryItem);
            } else {
                this.context.actionsCreator.expandQueryFolder(queryItem);
            }
        };
        const state = this._historyService.getState();
        switch (e.keyCode) {
            case KeyCode.SPACE:
                // Disable space key toggling selection unless toggle folder
                if (isFolder) {
                    toggleFolder();
                }

                e.preventDefault();
                e.stopPropagation();
                break;
            case KeyCode.LEFT:
                if (isFolder && expanded) {
                    this.context.actions.QueryFolderCollapsed.invoke(queryItem);
                } else if (!isFolder || !expanded) {
                    const parentQueryItem = QueryUtilities.getParentQueryItem(queryItem, this.context.stores.queryHierarchyItemStore);
                    const parentRow = this._getRow(parentQueryItem as QueryItem);
                    const parentGroup = this._getGroupHeader(queryItem.id);
                    if (parentRow) {
                        parentRow.focus();
                        this._setSelected(props.selection, props.itemIndex, parentRow.props.itemIndex);
                    } else if (parentGroup) {
                        parentGroup.focus();
                        props.selection.setIndexSelected(props.itemIndex, false, false);
                    }
                }
                break;
            case KeyCode.RIGHT:
                if (isFolder && !expanded && state[ActionParameters.VIEW] !== QueriesHubConstants.QueryFoldersPageAction) {
                    this.context.actionsCreator.expandQueryFolder(queryItem);
                    e.preventDefault();
                    e.stopPropagation();
                }
                break;
            case KeyCode.ENTER:
                if (isFolder && state[ActionParameters.VIEW] === QueriesHubConstants.QueryFoldersPageAction) {
                    this.context.navigationActionsCreator.navigateToQueriesFolderPage(queryItem.id, false);
                } else if (isFolder) {
                    toggleFolder();
                } else if (!isEmptyFolderContext) {
                    this.context.navigationActionsCreator.navigateToRunQuery(queryItem.id, false);
                }
                break;
        }
    }

    private onRowFocus = (props: IDetailsRowProps) => {
        // Need to manually set the row when moving from element within the row.
        if (props.selection.getSelectedCount() === 0) {
            return;
        }

        const previousRowId = this._getRowId(props.item as QueryItem);
        const selectedRowId = this._getRowId(props.selection.getSelection()[0] as QueryItem);
        if (previousRowId === selectedRowId) {
            return;
        }

        const selectedRow = this._rows[selectedRowId];
        if (selectedRow) {
            this._setSelected(props.selection, selectedRow.props.itemIndex, props.itemIndex);
        }
    }

    protected onRenderRow = (props: IDetailsRowProps): JSX.Element => {
        const item: QueryItem = props.item as QueryItem;
        const rowId = this._getRowId(item);
        return <div className="queries-list-row"
            onFocus={e => this.onRowFocus(props)}
            onKeyDown={e => this.rowOnKeyDown(e, props)}>
            <DetailsRow
                {...props}
                ref={elem => { this._rows[rowId] = elem; }}
                aria-expanded={item.isFolder ? item.expanded : undefined}
            />
        </div>;
    }

    private onStoreChanged = (handler: IEventHandler): void => {
        const newState = this.getStateFromStore();
        // set state is asynchronous, so we need to check
        // the new state in a callback
        this.setState(newState, () => {
            if (this.state.loadingState === QueryLoadingState.Loaded) {
                PerfScenarioManager.endScenario(this.SCENARIO_NAME);
            }
        });
    }

    protected abstract initialize(): void;

    protected abstract getStateFromStore(): TState;

    protected abstract onRenderItemColumn: (item?: QueryItem, index?: number, column?: IColumn) => JSX.Element;

    protected abstract getColumns(): IColumn[];

    protected shouldDisplayActions = (queryItem: QueryItem): boolean => {
        return !queryItem.isEmptyFolderContext;
    }

    protected getMenuItemProviders = (queryItem: QueryItem): IVssContextualMenuItemProvider[] => {
        const extensionContext = {
            query: QueryUtilities.getContributedQueryMenuItemContext(queryItem)
        };

        return [new ContributableMenuItemProvider(["ms.vss-work-web.work-item-query-menu"], extensionContext)];
    }

    private sendContextMenuTelemetry(menuItemKey: string, queryItem: QueryItem) {
        const historyState = this._historyService.getState();

        publishEvent(new TelemetryEventData(
            WITCustomerIntelligenceArea.NEW_QUERIES_EXPERIENCE,
            WITCustomerIntelligenceFeature.NEWQUERYEXPERIENCE_QUERY_ACTION,
            {
                "key": menuItemKey,
                "pivot": historyState && historyState[ActionParameters.VIEW],
                "source": "context-menu",
                "queryId": queryItem.id,
                "isPublic": queryItem.isPublic
            }));
    }

    protected getMenuItems = (queryItem: QueryItem): IContextualMenuItem[] => {
        const menuItems: IContextualMenuItem[] = [];

        if (queryItem.isFolder) {
            menuItems.push(
                {
                    key: "new-query", name: Resources.NewQuery, iconProps: { className: "bowtie-icon bowtie-math-plus" },
                    onClick: (event?: React.MouseEvent<HTMLElement>, item?: IContextualMenuItem) => {
                        this.sendContextMenuTelemetry("new-query", queryItem);
                        this.context.navigationActionsCreator.navigateToNewQuery(false, queryItem.id);
                    }
                },
                {
                    key: "new-query-folder", name: Resources.NewFolder,
                    onClick: (event?: React.MouseEvent<HTMLElement>, item?: IContextualMenuItem) => {
                        this.sendContextMenuTelemetry("new-query-folder", queryItem);
                        this._showQuerySaveDialog(null, QuerySaveDialogMode.NewFolder, queryItem.path);
                    }
                });

            const state = this._historyService.getState();
            const depth = queryItem.depth || 0;
            if (depth !== 0 || state[ActionParameters.VIEW] === QueriesHubConstants.QueryFoldersPageAction) {
                menuItems.push(
                    divider(menuItems),
                    {
                        key: "rename-query-folder", name: Resources.RenameQueryFolder, iconProps: { className: "bowtie-icon bowtie-edit-rename" },
                        onClick: (event?: React.MouseEvent<HTMLElement>, item?: IContextualMenuItem) => {
                            this.sendContextMenuTelemetry("rename-query-folder", queryItem);
                            this._showQuerySaveDialog(queryItem, QuerySaveDialogMode.RenameFolder, getDirectoryName(queryItem.path) || queryItem.path);
                        }
                    },
                    {
                        key: "delete-query-folder", name: Resources.DeleteQueryFolder, iconProps: { className: "bowtie-icon bowtie-edit-delete" },
                        onClick: (event?: React.MouseEvent<HTMLElement>, item?: IContextualMenuItem) => {
                            this.sendContextMenuTelemetry("delete-query-folder", queryItem);
                            this._deleteQueryItemContextMenu(queryItem);
                        }
                    });
            }
        } else {
            menuItems.push(
                {
                    key: "run-query", name: Resources.RunQuery, iconProps: { iconName: "Play" },
                    onClick: (event?: React.MouseEvent<HTMLElement>, item?: IContextualMenuItem) => {
                        this.sendContextMenuTelemetry("run-query", queryItem);
                        this.context.navigationActionsCreator.navigateToRunQuery(queryItem.id, false);
                    }
                },
                {
                    key: "edit-query", name: Resources.EditQuery, iconProps: { iconName: "Edit" },
                    onClick: (event?: React.MouseEvent<HTMLElement>, item?: IContextualMenuItem) => {
                        this.sendContextMenuTelemetry("edit-query", queryItem);
                        this.context.navigationActionsCreator.navigateToEditQuery(queryItem.id, false);
                    }
                },
                {
                    key: "rename-query", name: Resources.RenameQuery, iconProps: { iconName: "Rename" },
                    onClick: (event?: React.MouseEvent<HTMLElement>, item?: IContextualMenuItem) => {
                        this.sendContextMenuTelemetry("rename-query", queryItem);
                        this._showQuerySaveDialog(queryItem, QuerySaveDialogMode.RenameQuery, getDirectoryName(queryItem.path) || queryItem.path);
                    }
                },
                {
                    key: "delete-query", name: Resources.DeleteQuery, iconProps: { className: "bowtie-icon bowtie-edit-delete" },
                    onClick: (event?: React.MouseEvent<HTMLElement>, item?: IContextualMenuItem) => {
                        this.sendContextMenuTelemetry("delete-query", queryItem);
                        this._deleteQueryItemContextMenu(queryItem);
                    }
                });

            menuItems.push(divider(menuItems));

            const existingTeams: IContextualMenuItem[] = [];
            const teamsTobeAdded: IContextualMenuItem[] = [];

            for (const queryFavoriteGroup of this.context.stores.queryFavoriteGroupStore.getTeams()) {
                const childMenu = {
                    key: queryFavoriteGroup.id,
                    name: queryFavoriteGroup.name,
                    disabled: false,
                    groupName: QueriesHubConstants.MinePageAction,
                } as IContextualMenuItem;

                const queryFavorite = queryFavoriteGroup.favorites.filter((value) => {
                    return Utils_String.equals(value.artifactId, queryItem.id, true);
                });

                if (queryFavorite.length === 1) {
                    childMenu.onClick = (event?: React.MouseEvent<HTMLElement>, item?: IContextualMenuItem) => {
                        this.sendContextMenuTelemetry("remove-team-favorite", queryItem);
                        this.context.actionsCreator.removeTeamFavorite(queryFavorite[0]);
                        this._setRowFocus(queryItem);
                    };
                    existingTeams.push(childMenu);
                } else {
                    childMenu.onClick = (event?: React.MouseEvent<HTMLElement>, item?: IContextualMenuItem) => {
                        this.sendContextMenuTelemetry("add-team-favorite", queryItem);
                        this.context.actionsCreator.addTeamFavorite(queryItem, queryFavoriteGroup.id, queryFavoriteGroup.name);
                        this._setRowFocus(queryItem);
                    };

                    teamsTobeAdded.push(childMenu);
                }
            }

            if (existingTeams.length > 0) {
                const removeFromTeamFavoritesContextMenuItem = removeFromTeamFavorites(existingTeams, false);
                menuItems.push(removeFromTeamFavoritesContextMenuItem);
            }

            if (queryItem.isPublic && teamsTobeAdded.length > 0) {
                const addToTeamFavoritesContextMenuItem = addToTeamFavorites(teamsTobeAdded, false);
                menuItems.push(addToTeamFavoritesContextMenuItem);
            }
        }

        if (queryItem.isPublic) {
            // TODO: Create "Add to dashboard" menu item for public query
            //this._buildDashboardMenuEntry(menuItems, queryItem.id, queryItem.name, queryItem.isPublic);

            // Enable option to change security settings
            const securityMenuItem: IContextualMenuItem = security();
            securityMenuItem.onClick = (event?: React.MouseEvent<HTMLElement>, item?: IContextualMenuItem) => {
                this.sendContextMenuTelemetry("query-security", queryItem);
                this._showSecurityDialog(queryItem);
            };

            menuItems.push(
                divider(menuItems),
                securityMenuItem
            );
        }

        return menuItems;
    }

    private _showQuerySaveDialog = (queryItem: QueryItem, mode: QuerySaveDialogMode, parentPath: string) => {
        showDialog(this.context, mode, queryItem, parentPath, (savedQueryItem: QueryItem) => {
            QueryResultsProvider.remove(savedQueryItem.id);
        });
    }

    private _showSecurityDialog = (queryItem: QueryItem): void => {
        using(["Admin/Scripts/TFS.Admin.Security"], (TFS_Admin_Security: typeof TFS_Admin_Security_NOREQUIRE) => {
            if (!queryItemSecurityManager) {
                queryItemSecurityManager = TFS_Admin_Security.SecurityManager.create(this.context.stores.queryPermissionMetadataStore.getAll());
            }
            queryItemSecurityManager.showPermissions(queryItem.id, queryItem.path);
        });
    }

    private _deleteQueryItemContextMenu = (queryItemToDelete: QueryItem): void => {
        MessageDialog.showMessageDialog(Utils_String.format(Resources.ConfirmDeleteQuery, queryItemToDelete.path))
            .then(() => {
                this.context.actionsCreator.deleteQuery(queryItemToDelete);
            });
    }

    protected _getDragDropEvents(): IDragDropEvents {
        return {
            canDrop: (dropContext?: IQueryDropProperties, dragContext?: IDragDropContext) => {
                return !this.state.isSearching &&
                    !!dropContext &&
                    dropContext.data.isFolder;
            },
            canDrag: (sourceItem?: QueryItem) => {
                return !this.state.isSearching && !!sourceItem && (sourceItem.depth !== 0) && !sourceItem.isEmptyFolderContext; // do not allow dragging root folders or empty folder text
            },
            onDragEnter: (targetItem?: QueryItem, event?: DragEvent) => { return this._draggedItem && "dragged-row-hover"; }, // return string is the css classes that will be added to the entering element.
            onDrop: (targetItem?: QueryItem, event?: DragEvent) => {
                if (this._draggedItem && targetItem && targetItem.isFolder) {
                    if (this._draggedItem.isPublic && !targetItem.isPublic) {
                        this._confirmMoveQueryItemContextMenu(this._draggedItem, targetItem);
                    } else {
                        this._moveQuery(this._draggedItem, targetItem);
                    }

                    if (event) {
                        event.preventDefault();
                    }
                }
                this._draggedItem = null;
            },
            onDragStart: (sourceItem?: any, itemIndex?: number, selectedItems?: any[], event?: MouseEvent) => {
                this._draggedItem = sourceItem;
                event.stopPropagation();
            }
        };
    }

    private _confirmMoveQueryItemContextMenu = (queryItemToMove: QueryItem, targetItem: QueryItem): void => {
        const sourceRootName = getRootDirectory(queryItemToMove.path) || queryItemToMove.path;
        const targetRootName = getRootDirectory(targetItem.path) || targetItem.path;

        promptMessageDialog(Utils_String.format(Resources.QueryConfirmDragDropOperation, sourceRootName, targetRootName), Resources.Confirm)
            .then(() => {
                this._moveQuery(queryItemToMove, targetItem);
            });
    }

    private _moveQuery = (queryItemToMove: QueryItem, targetItem: QueryItem) => {
        const targetParentPath = targetItem.path;
        this.context.actionsCreator.moveQuery(queryItemToMove, targetItem, null, null, true)
            .then((updatedQuery: QueryItem) => {
                this._setRowFocus(updatedQuery);
            }, (error: TfsError) => {
                const errorMessage = (error.serverError || error)["message"];
                this.context.actionsCreator.showErrorMessageForQueriesView(errorMessage);
            });

        const updatedTarget = this.context.stores.queryHierarchyItemStore.getItem(targetItem.path) as QueryItem;
        if (!updatedTarget.expanded) {
            this.context.actionsCreator.expandQueryFolder(updatedTarget);
        }
    }
}

interface IQueryDropProperties extends IDragDropContext {
    data: QueryItem;
}
