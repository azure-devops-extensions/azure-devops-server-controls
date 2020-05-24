/// <reference types="react" />

import * as React from "react";

import { css } from "OfficeFabric/Utilities";
import { Spinner, SpinnerSize } from "OfficeFabric/Spinner";
import { TooltipDelay, TooltipHost, DirectionalHint, TooltipOverflowMode } from "VSSUI/Tooltip";

import * as Utils_Array from "VSS/Utils/Array";
import * as Utils_String from "VSS/Utils/String";
import { KeyCode } from "VSS/Utils/UI";

import * as Resources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";
import * as Base from "DistributedTaskControls/Common/Components/Base";
import { SafeLink } from "DistributedTaskControls/Components/SafeLink";
import { IFolderItem, IChildItem, IDetailsRowItem, RowType } from "DistributedTaskControls/SharedControls/Folders/Types";
import { FolderUtils } from "DistributedTaskControls/SharedControls/Folders/FolderUtils";

import { getLocalService } from "VSS/Service";
import { HubsService } from "VSS/Navigation/HubsService";

import "VSS/LoaderPlugins/Css!DistributedTaskControls/SharedControls/Folders/FolderDetailsListBase";

export interface IPropsBase<F extends IFolderItem, C extends IChildItem> extends Base.IProps {
    showRootFolder: boolean;
    rootFolderName: string;
    folders: F[];
    childItems: C[];
    childItemIcon: string;
    onFetchChildItems: (folder: F) => void;
    showMoreInFolder?: (folder: F) => void;
}

export interface IStateBase extends Base.IState {
    rows: IDetailsRowItem[];
    loadingFolderId: number;
    expandedFolderIds: number[];
}

export abstract class FolderDetailsListBase<F extends IFolderItem, C extends IChildItem, P extends IPropsBase<F, C>, S extends IStateBase> extends Base.Component<P, S> {

    protected getFolderNameElement(rowItem: IDetailsRowItem): JSX.Element {
        const iconWidth = 16;
        let marginLeft = rowItem.depth * iconWidth;
        let isLoading = (this.state.loadingFolderId === rowItem.id);

        return (<div className={"folders-detailslist-folder-row"} key={rowItem.item.path}>
            <span className={"folders-detailslist-folder-name"} style={{ marginLeft: marginLeft }}>
                {
                    isLoading &&
                    <Spinner className={"folders-detailslist-loading"} key={"Spinner"} size={SpinnerSize.small} />
                }
                {
                    !isLoading &&
                    <span className={this._getChevronIconClassName(rowItem)}
                        onKeyDown={(event) => { this._onChevronKeyDown(event, rowItem); }}
                        onClick={(e) => { this._onChevronClicked(e, rowItem); }} />
                }
            </span>
            <span className={"bowtie-icon bowtie-folder folders-detailslist-icon"} />
            <span>{rowItem.name}</span>
        </div>);
    }

    protected getChildItemNameElement(item: IDetailsRowItem): JSX.Element {
        const iconWidth = 16;
        let marginLeft = item.depth * iconWidth + 20;

        let childItemIconClassName = css("bowtie-icon", this.props.childItemIcon, "folders-detailslist-icon");

        return (
            <TooltipHost
                content={item.name}
                overflowMode={TooltipOverflowMode.Parent}
                directionalHint={DirectionalHint.bottomCenter}
                delay={TooltipDelay.medium}
                calloutProps={{
                    isBeakVisible: true,
                    setInitialFocus: false,
                }} >
                <span className={"folders-detailslist-child-name"} style={{ marginLeft: marginLeft }}>
                    <span className={childItemIconClassName} />
                    <SafeLink
                        href={item.url}
                        allowRelative={true}
                        onClick={(event: React.MouseEvent<HTMLElement>) => { this._onChildItemNameClicked(event, item.url, item.navigationHubId); }}>
                        {item.name}
                    </SafeLink>
                </span>
            </TooltipHost>);
    }

    protected getShowMoreElement(item: IDetailsRowItem): JSX.Element {
        const iconWidth = 16;
        let marginLeft = item.depth * iconWidth + iconWidth;
        if (item.item.id !== this.state.loadingFolderId) {
            return (
                <TooltipHost
                    content={item.name}
                    overflowMode={TooltipOverflowMode.Parent}
                    directionalHint={DirectionalHint.bottomCenter}
                    delay={TooltipDelay.medium}
                    calloutProps={{
                        isBeakVisible: true,
                        setInitialFocus: false,
                    }} >
                    <span className={"folders-detailslist-child-name"} style={{ marginLeft: marginLeft }}>
                        <a onKeyDown={(event) => { this._onShowMoreClicked(event, item); }}
                            onClick={(e) => { this._onShowMoreClicked(e, item); }}>{item.name}</a>
                    </span>
                </TooltipHost>);
        }
        else {
            return (<span style={{ marginLeft: marginLeft }}><Spinner className={"show-more-loading"} key={"Spinner"} size={SpinnerSize.small} ariaLabel={Resources.Loading} />{Resources.Loading}</span>);
        }
    }

    protected handleRowKeyDownEvent(event: any, item: IDetailsRowItem) {
        if (event.altKey || event.ctrlKey) {
            return;
        }

        if (Utils_String.equals(event.target.type, "button", true)) {
            // Do nothing - button will have it's own handlers
            return;
        }

        let eventHandled = false;
        switch (event.keyCode) {
            case KeyCode.SPACE:
            case KeyCode.ENTER:
                if (item.rowType === RowType.Folder) {
                    this.toggleFolder(item);
                    eventHandled = true;
                }
                break;

            case KeyCode.LEFT:
                if (item.rowType === RowType.Folder && item.isExpanded) {
                    this.collapseFolder(item);
                    eventHandled = true;
                }
                break;

            case KeyCode.RIGHT:
                if (item.rowType === RowType.Folder && !item.isExpanded) {
                    this.expandFolder(item);
                    eventHandled = true;
                }
                break;
        }

        if (eventHandled) {
            event.preventDefault();
            event.stopPropagation();
        }
    }

    protected initializeDetailsRows(expandedFolderIds: number[], folders: IFolderItem[], childItems: IChildItem[]): void {
        let rows: IDetailsRowItem[] = [];

        if (folders && folders.length > 0) {
            let rootNode = FolderUtils.createFoldersStructure(this.props.rootFolderName, folders, childItems);
            if (rootNode) {
                if (this.props.showRootFolder) {
                    rows = FolderUtils.createDetailsRows(expandedFolderIds, [rootNode], [], -1, !!this.props.showMoreInFolder);
                }
                else {
                    rows = FolderUtils.createDetailsRows(expandedFolderIds, rootNode.childFolders, rootNode.childItems, -1, !!this.props.showMoreInFolder);
                }
            }
        }
        else {
            rows = FolderUtils.createFlatListRows(childItems);
        }

        this.setState({
            rows: rows,
            loadingFolderId: 0,
            expandedFolderIds: expandedFolderIds
        });
    }

    protected toggleFolder(item: IDetailsRowItem) {
        if (item.isExpanded) {
            this.collapseFolder(item);
        }
        else {
            this.expandFolder(item);
        }
    }

    protected expandFolder(rowItem: IDetailsRowItem): void {
        if (rowItem.rowType === RowType.Folder) {
            let expandedFolderIds = this.state.expandedFolderIds || [];
            Utils_Array.add(expandedFolderIds, rowItem.id);

            if (this.props.onFetchChildItems && rowItem.item.hasMoreChildItems) {
                this.props.onFetchChildItems(rowItem.item);
                this.setState({
                    loadingFolderId: rowItem.id
                });
            }
            else {
                this.initializeDetailsRows(expandedFolderIds, this.props.folders, this.props.childItems);
            }
        }
    }

    protected collapseFolder(rowItem: IDetailsRowItem): void {
        if (rowItem.rowType === RowType.Folder) {
            let expandedFolderIds = this.state.expandedFolderIds || [];
            Utils_Array.remove(expandedFolderIds, rowItem.id);

            this.initializeDetailsRows(expandedFolderIds, this.props.folders, this.props.childItems);
        }
    }

    protected abstract shouldShowChevronForEmptyFolder(): boolean;

    // just because this method was called, does not mean the value of props has changed
    // and at the same time it's not easy to detect the delta changes if the objects are passed by reference
    public componentWillReceiveProps(nextProps: P) {
        this.initializeDetailsRows(this.state.expandedFolderIds, nextProps.folders, nextProps.childItems);
    }

    private _getChevronIconClassName(item: IDetailsRowItem): string {
        //Do not show chevron if there are no children and we are not displaying empty folder row
        if (!item.hasChildren && !this.shouldShowChevronForEmptyFolder()) {
            return "no-child-item-folder-row";
        }

        if (item.isExpanded === true) {
            return css("bowtie-icon", "bowtie-chevron-down");
        }
        else {
            return css("bowtie-icon", "bowtie-chevron-right");
        }
    }

    private _onChevronClicked(event: any, item: IDetailsRowItem) {
        this.toggleFolder(item);

        event.preventDefault();
        event.stopPropagation();
    }

    private _onChevronKeyDown(event: any, item: IDetailsRowItem): void {
        if (event.keyCode === KeyCode.SPACE || event.keyCode === KeyCode.ENTER) {
            this.toggleFolder(item);

            event.preventDefault();
            event.stopPropagation();
        }
    }

    private _onShowMoreClicked(event: any, item: IDetailsRowItem) {
        if (this.props.showMoreInFolder) {
            this.props.showMoreInFolder(item.item);
        }
    }

    private _onChildItemNameClicked(event: React.MouseEvent<HTMLElement>, url: string, hubId: string): void {
        if (!!url && !!hubId) {
            const hubsService = getLocalService(HubsService);

            // Copying this code from Tfs/Service/WebAccess/VersionControl/Scripts/Utils/XhrNavigationUtils.ts
            const result = hubsService.getHubNavigateHandler(hubId, url)(event.nativeEvent);
            if (!result) {
                event.stopPropagation();
                event.preventDefault();
            }
        }
    }
}