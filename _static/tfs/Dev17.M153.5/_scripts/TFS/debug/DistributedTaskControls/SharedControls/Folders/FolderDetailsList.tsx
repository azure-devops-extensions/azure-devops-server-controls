/// <reference types="react" />

import * as React from "react";

import { IColumn, ColumnActionsMode, IDetailsRowProps, DetailsRow } from "OfficeFabric/DetailsList";
import { SelectionMode } from "OfficeFabric/Selection";
import { IContextualMenuItem } from "OfficeFabric/ContextualMenu";

import { VssDetailsList } from "VSSUI/Components/VssDetailsList/VssDetailsList";
import { IVssContextualMenuItemProvider } from "VSSUI/VssContextualMenu";

import * as Resources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";
import { FolderDetailsListBase, IStateBase, IPropsBase } from "DistributedTaskControls/SharedControls/Folders/FolderDetailsListBase";
import { IFolderItem, IChildItem, IDetailsRowItem, FolderConstants, RowType } from "DistributedTaskControls/SharedControls/Folders/Types";

import "VSS/LoaderPlugins/Css!DistributedTaskControls/SharedControls/Folders/FolderDetailsList";

export interface IProps<F extends IFolderItem, C extends IChildItem> extends IPropsBase<F, C> {
    columns: IColumn[];
    actionsColumnKey: string;
    classNameForDetailsList: string;
    classNameForDetailsRow: string;

    onGetFolderMenuItems: (folder: F) => IContextualMenuItem[];
    onGetChildMenuItems: (childItem: C) => IContextualMenuItem[];
    onGetFolderMenuItemProviders?: (folder: F) => IVssContextualMenuItemProvider[];
    onGetChildMenuItemProviders?: (childItem: C) => IVssContextualMenuItemProvider[];
    onRenderChildItemColumn: (childItem: C, index: number, column?: IColumn) => JSX.Element;
    onActiveItemChanged: (item: F | C, isFolder: boolean) => void;
}

export interface IState extends IStateBase { }

export class FolderDetailsList<F extends IFolderItem, C extends IChildItem> extends FolderDetailsListBase<F, C, IProps<F, C>, IState> {

    protected shouldShowChevronForEmptyFolder(): boolean {
        return true;
    }

    public render(): JSX.Element {
        return (<div className="dtc-foldersdetailslist-container">
            <VssDetailsList
                isHeaderVisible={true}
                selectionMode={SelectionMode.single}
                className={this.props.classNameForDetailsList}
                columns={this._getColumns()}
                items={this.state.rows}
                actionsColumnKey={this.props.actionsColumnKey}
                getMenuItems={this._getMenuItems}
                getMenuItemProviders={this._getMenuItemProviders}
                allocateSpaceForActionsButtonWhileHidden={true}
                setKey={"folders-detailslist"}
                shouldDisplayActions={this._shouldDisplayActions}
                onRenderRow={this._onRenderRow}
                onRenderItemColumn={this._onRenderItemColumn}
                onActiveItemChanged={this._onActiveItemChanged} />
        </div>);
    }

    public componentWillMount() {
        // initially all folders are collapsed except root folder
        this.initializeDetailsRows([1], this.props.folders, this.props.childItems);
    }

    private _getColumns(): IColumn[] {
        let columns: IColumn[] = [
            {
                key: FolderConstants.NameColumnHeaderKey,
                fieldName: FolderConstants.NameColumnHeaderKey,
                name: Resources.FoldersNameHeader,
                minWidth: 400,
                maxWidth: 600,
                isResizable: true,
                columnActionsMode: ColumnActionsMode.disabled
            },
        ];

        return columns.concat(this.props.columns);
    }

    private _getMenuItems = (rowItem: IDetailsRowItem): IContextualMenuItem[] => {
        if (rowItem.rowType === RowType.Folder) {
            return this.props.onGetFolderMenuItems(rowItem.item);
        } else if (rowItem.id === -2) {
            return [];
        } else {
            return this.props.onGetChildMenuItems(rowItem.item);
        }
    }

    private _getMenuItemProviders = (rowItem: IDetailsRowItem): IVssContextualMenuItemProvider[] => {
        if (rowItem.rowType === RowType.Folder) {
            if (this.props.onGetFolderMenuItemProviders) {
                return this.props.onGetFolderMenuItemProviders(rowItem.item);
            }
        } else if (rowItem.id === -2) {
            return [];
        } else {
            if (this.props.onGetChildMenuItemProviders) {
                return this.props.onGetChildMenuItemProviders(rowItem.item);
            }
        }
    }

    private _shouldDisplayActions = (rowItem: IDetailsRowItem): boolean => {
        const menuItemsCount: number = this._getMenuItems(rowItem).length;
        if (rowItem.id === -2 || menuItemsCount === 0) {
            return false;
        }
        return true;
    }

    private _onRenderRow = (props: IDetailsRowProps): JSX.Element => {
        const item: IDetailsRowItem = props.item;
        if (props.item.id === -1) {
            //Render the no-item-row for empty folder
            const iconWidth = 16;
            let marginLeft = props.item.depth * iconWidth + 15;
            return (<div className={"folders-detailslist-noitems"} style={{ marginLeft: marginLeft }}>
                {props.item.name}
            </div>);
        }
        else {
            return (
                <div className={this.props.classNameForDetailsRow}
                    onKeyDown={(event) => { this._onRowKeyDown(event, item); }}
                    onClick={(e) => { this._onRowClicked(e, item); }}>
                    <DetailsRow {...props} aria-expanded={item.rowType === RowType.Folder ? item.isExpanded : null} />
                </div>
            );
        }
    }

    private _onRenderItemColumn = (rowItem: IDetailsRowItem, index: number, column?: IColumn): JSX.Element => {
        if (rowItem.rowType === RowType.Folder) {
            if (column.fieldName === FolderConstants.NameColumnHeaderKey) {
                return this.getFolderNameElement(rowItem);
            } else {
                return null;
            }
        } else if (rowItem.id === -2) {
            if (column.fieldName === FolderConstants.NameColumnHeaderKey) {
                return this.getShowMoreElement(rowItem);
            } else {
                return null;
            }
        } else {
            if (column.fieldName === FolderConstants.NameColumnHeaderKey) {
                return this.getChildItemNameElement(rowItem);
            } else {
                return this.props.onRenderChildItemColumn(rowItem.item, index, column);
            }
        }
    }

    private _onActiveItemChanged = (rowItem?: IDetailsRowItem, index?: number, ev?: React.FocusEvent<HTMLElement>): void => {
        if (this.props.onActiveItemChanged) {
            if (rowItem) {
                const isFolder: boolean = (rowItem.rowType === RowType.Folder);
                this.props.onActiveItemChanged(rowItem.item, isFolder);
            }
            else {
                this.props.onActiveItemChanged(null, false);
            }
        }
    }

    private _onRowClicked(event: any, item: IDetailsRowItem) {
        if (item.id === -2) {
            if (item.item.id !== this.state.loadingFolderId && this.props.showMoreInFolder) {
                this.props.showMoreInFolder(item.item);
            }
        } else {
            this.toggleFolder(item);
        }
    }

    private _onRowKeyDown(event: any, item: IDetailsRowItem) {
        this.handleRowKeyDownEvent(event, item);
    }

}