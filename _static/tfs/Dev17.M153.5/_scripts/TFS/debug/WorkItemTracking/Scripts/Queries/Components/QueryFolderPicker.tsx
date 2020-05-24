import { IconButton } from "OfficeFabric/Button";
import { Callout, DirectionalHint } from "OfficeFabric/Callout";
import { ColumnActionsMode, IColumn } from "OfficeFabric/DetailsList";
import { TextField } from "OfficeFabric/TextField";
import { BaseComponent, IBaseProps } from "OfficeFabric/Utilities";
import { SelectionMode } from "OfficeFabric/utilities/selection/index";
import "VSS/LoaderPlugins/Css!Queries/Components/QueryFolderPicker";
import { KeyCode } from "VSS/Utils/UI";
import { IQueriesHubContext } from "WorkItemTracking/Scripts/Queries/Components/QueriesHubContext";
import { QueryFolderPickerItem } from "WorkItemTracking/Scripts/Queries/Components/QueryFolderPickerItem";
import { QueriesColumnKey, ExtendedQueryHierarchyItem, QueryTreeItem } from "WorkItemTracking/Scripts/Queries/Models/Models";
import { QueryUtilities } from "WorkItemTracking/Scripts/Queries/QueryUtilities";
import * as Resources from "WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking";
import * as React from "react";
import { Tree, TreeItemProvider } from "VSSUI/Tree";
import { IQueryHierarchyItemDataProvider } from "WorkItemTracking/Scripts/Queries/Stores/QueryHierarchyItemStore";
import { QueryFolderPickerActionsCreator } from "WorkItemTracking/Scripts/Queries/Actions/QueryFolderPickerActionsCreator";
import { QueryHierarchyItem } from "TFS/WorkItemTracking/Contracts";

export interface IQueryFolderPickerProps extends IBaseProps {
    path?: string;
    queriesHubContext: IQueriesHubContext;
    onPathChanged: (path: string, isValid: boolean) => void;
}

class QueryTreeItemProvider extends TreeItemProvider<ExtendedQueryHierarchyItem> {
    private _idToTreeItemMap: { [id: string]: QueryTreeItem } = {};
    private _queryFolderPickerActionsCreator: QueryFolderPickerActionsCreator;

    public constructor(
        private _queryHierarchyItemProvider: IQueryHierarchyItemDataProvider,
        private _onChildrenLoaded: (queryFolder: QueryHierarchyItem) => void,
        private _onLoadChildrenError: (error: any) => void) {
        super();
        this._queryFolderPickerActionsCreator = new QueryFolderPickerActionsCreator(this._queryHierarchyItemProvider);
    }

    getChildren(hierarchyItem: ExtendedQueryHierarchyItem | undefined): ExtendedQueryHierarchyItem[] | Promise<ExtendedQueryHierarchyItem[]> {
        //initial root
        if (!hierarchyItem
            && this._queryHierarchyItemProvider.areRootFolderItemsLoaded()) {
            const rootHierarchy: ExtendedQueryHierarchyItem[] = [];
            const myQueriesFolder = this._queryHierarchyItemProvider.getMyQueriesFolderItem();
            this._queryFolderPickerActionsCreator.constructQueryTreeItems(myQueriesFolder, this._idToTreeItemMap, 0);
            rootHierarchy.push(myQueriesFolder);

            // access to shared queries can be blocked by permissions, so we need
            // to handle the undefined case
            const sharedQueriesFolder = this._queryHierarchyItemProvider.getSharedQueriesFolderItem();
            if (sharedQueriesFolder) {
                this._queryFolderPickerActionsCreator.constructQueryTreeItems(sharedQueriesFolder, this._idToTreeItemMap, 0);
                rootHierarchy.push(sharedQueriesFolder);
            }

            return rootHierarchy;
        }

        //load from store
        hierarchyItem = this._queryHierarchyItemProvider.getItem(hierarchyItem.id);

        if (hierarchyItem.isEmptyFolderContext) {
            return [];
        }

        //the children is loaded
        if (!hierarchyItem.hasChildren || hierarchyItem.isChildrenLoaded) {
            const queryTreeItem = this._idToTreeItemMap[hierarchyItem.id];
            return queryTreeItem.children.map(child => child.item);
        }

        //load children from server and construct sub tree 
        return this._queryFolderPickerActionsCreator.loadQueryFolderChildren(hierarchyItem, this._onChildrenLoaded, this._onLoadChildrenError).then((item) => {
            let queryTreeItem = this._queryFolderPickerActionsCreator.constructQueryTreeItems(item, this._idToTreeItemMap, this.getTreeItem(hierarchyItem).depth);
            return queryTreeItem.children.map(child => child.item);
        });
    }

    getTreeItem(item: ExtendedQueryHierarchyItem): QueryTreeItem {
        return this._idToTreeItemMap[item.id];
    }
}

export interface IQueryFolderPickerState {
    isCalloutVisible?: boolean;
    path: string;
    errorMessage?: string;
}

export class QueryFolderPicker extends BaseComponent<IQueryFolderPickerProps, IQueryFolderPickerState> {
    private _debouncedFolderPathValidation: (folderPath: string) => void;
    private _textFieldElement: HTMLElement;
    private _provider: QueryTreeItemProvider;

    constructor(props: IQueryFolderPickerProps, context: any) {
        super(props, context);
        this.state = this.getState();
        this._provider = new QueryTreeItemProvider(this.props.queriesHubContext.stores.queryHierarchyItemStore,
            (queryFolder: QueryHierarchyItem) => {
                this.props.queriesHubContext.actionsCreator.invokeEnsureQueryItemActions(queryFolder);
            },
            (error) => {
                this.props.queriesHubContext.actionsCreator.showErrorMessageForQueriesView(error.message);
            });

        this._debouncedFolderPathValidation = this._async.debounce(this._performFolderPathValidation, QueryUtilities.DefaultDebounceWait);
    }

    public componentDidMount() {
        this.props.queriesHubContext.actionsCreator.initializeAllQueries();
    }

    public render(): JSX.Element {
        return <div className="textfield-error-spacer">
            <div className="query-folder-picker-container" onKeyDown={this._onTextAreaKeyDown} aria-label={Resources.FolderLabel} role="combobox" ref={(textElement) => this._textFieldElement = textElement}>
                <TextField
                    className="query-name-fixed-container"
                    inputClassName="query-folder-input"
                    label={Resources.FolderLabel}
                    placeholder={Resources.FolderLabel}
                    value={this.state.path}
                    onClick={this._onClick}
                    onChanged={this._setPath}
                    required={true}
                    errorMessage={this.state.errorMessage}
                    width={"400px"}
                    ariaLabel={Resources.FolderLabel}
                    onRenderSuffix={this._onRenderIcon}
                    spellCheck={false}
                />
            </div>

            {this.state.isCalloutVisible && (<Callout
                className="query-folder-dropdown"
                target={this._textFieldElement}
                onDismiss={this._onCalloutDismiss}
                setInitialFocus={true}
                isBeakVisible={false}
                directionalHint={DirectionalHint.bottomLeftEdge}
                directionalHintFixed={true}
                calloutMaxHeight={400}
                calloutWidth={this._textFieldElement.offsetWidth}
                preventDismissOnScroll={true}
            >
                {<Tree
                    treeItemProvider={this._provider}
                    columns={this.getColumns()}
                    primaryTreeColumnKey={QueriesColumnKey.Title}
                    selectionMode={SelectionMode.single}
                    isHeaderVisible={false}
                    initialFocusedIndex={0}
                    onRowKeyDown={this._rowOnKeyDown}
                    onPrimaryCellClick={(e, item: ExtendedQueryHierarchyItem) => {
                        this._onRowSelected(item);
                        e.stopPropagation();
                        e.preventDefault();
                    }}
                />
                }
            </Callout>)
            }
        </div>;
    }

    private _onRenderIcon = (): JSX.Element => {
        return <IconButton
            tabIndex={-1}
            iconProps={{ iconName: "ChevronDown" }}
            className="query-dropdown-button"
            onClick={this._toggleCallout}
            ariaLabel={Resources.QuerySaveDialog_FolderCombo_ExpandButtonAriaLabel}
        />;
    }

    private _onClick = () => {
        this.setState({
            isCalloutVisible: true,
        });
    }

    private _onTextAreaKeyDown = (e: React.KeyboardEvent<HTMLDivElement>): void => {
        if (e.altKey && e.keyCode === KeyCode.DOWN) {
            this._toggleCallout();

            e.preventDefault();
            e.stopPropagation();
        }
    }

    private _onRowSelected = (queryItem: ExtendedQueryHierarchyItem): void => {
        // Disable click on "no sub-folder" item
        if (queryItem.isNoSubfolderContext) {
            return;
        }

        this._setPath(queryItem.path);
    }

    private _onRenderItemColumn = (item?: QueryTreeItem, index?: number, column?: IColumn): JSX.Element => {
        if (!item) {
            return <div />;
        }

        return <QueryFolderPickerItem key={item.id} queryItem={item} />;
    }

    private _rowOnKeyDown = (e: React.KeyboardEvent<HTMLDivElement>, queryItem: ExtendedQueryHierarchyItem): void => {
        if (e.keyCode === KeyCode.TAB) {
            this._onCalloutDismiss();
            e.preventDefault();
            e.stopPropagation();
            return;
        }

        if (e.altKey && e.keyCode === KeyCode.DOWN) {
            // Toggle callout
            this._toggleCallout();

            e.preventDefault();
            e.stopPropagation();
            return;
        }

        switch (e.keyCode) {
            case KeyCode.ENTER:
                this._onRowSelected(queryItem);
                e.preventDefault();
                e.stopPropagation();
                break;
        }
    }

    protected getColumns(): IColumn[] {
        return [
            {
                fieldName: QueriesColumnKey.Title,
                key: QueriesColumnKey.Title,
                name: Resources.QueryColumnTitle,
                columnActionsMode: ColumnActionsMode.disabled,
                minWidth: 426,
                maxWidth: 426,
                className: "query-column-cell query-name",
                isResizable: false,
                onRender: (treeItem: QueryTreeItem) => { return this._onRenderItemColumn(treeItem) }
            } as IColumn
        ];
    }

    private _onCalloutDismiss = () => {
        this.setState({
            isCalloutVisible: false
        });
    }

    private _toggleCallout = () => {
        this.setState({
            isCalloutVisible: !this.state.isCalloutVisible
        });
    }

    private getState(): IQueryFolderPickerState {
        return {
            isCalloutVisible: this.state ? this.state.isCalloutVisible : false,
            path: this.state ? this.state.path : this.props.path,
            errorMessage: undefined
        };
    }

    private _setPath = (newPath: string): void => {
        newPath = newPath || "";
        this.setState({
            isCalloutVisible: false,
            path: newPath
        });
        this._debouncedFolderPathValidation(newPath);
    }

    private _performFolderPathValidation = (folderPath: string): void => {
        folderPath = folderPath.trim();

        if (!folderPath) {
            this._updateValidationResult(folderPath, Resources.QueryFolderPicker_ErrorMessage_FolderRequired);
        } else {
            // Validate if the path exist. This needs to go to the server if the query item not populated in local store.
            this.props.queriesHubContext.actionsCreator.ensureQueryItem(folderPath).then(
                () => this._updateValidationResult(folderPath, undefined),
                (error) => this._updateValidationResult(folderPath, Resources.QueryFolderPicker_ErrorMessage_FolderDoesNotExist));
        }
    }

    private _updateValidationResult(folderPath: string, message: string): void {
        this.setState({ errorMessage: message });
        this.props.onPathChanged(folderPath, !message);
    }
}
