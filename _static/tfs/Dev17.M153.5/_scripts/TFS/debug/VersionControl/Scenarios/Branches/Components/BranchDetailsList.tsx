/// <reference types="react" />
/// <reference types="react-dom" />

// React
import * as React from "react";
import * as ReactDOM from "react-dom";
import * as ComponentBase from "VSS/Flux/Component";

// Office Fabric
import {
    CheckboxVisibility,
    ColumnActionsMode,
    ConstrainMode,
    DetailsList,
    DetailsListLayoutMode,
    DetailsRow,
    IColumn,
    SelectionMode
} from "OfficeFabric/DetailsList";
import { TooltipHost } from "VSSUI/Tooltip";

import * as BranchResources from "VersionControl/Scripts/Resources/TFS.Resources.Branches";
import {IEnhancedGitRef} from "VersionControl/Scenarios/Branches/Components/BranchesUtils";
import { BranchNameColumn,
    AheadBehind,
    PullRequest,
    getFileCommandsInContextMenu,
    hasPermissionToAnyCommand } from "VersionControl/Scenarios/Branches/Components/BranchesTreeRow";
import { FolderNameColumn, getFolderCommandsInContextMenu, hasPermissionToAnyFolderCommand} from "VersionControl/Scenarios/Branches/Components/BranchesTreeFolder";
import {HasMoreRow} from "VersionControl/Scenarios/Shared/RefTree/HasMoreRow";
import {ExpandCollapseRow, ExpandCollapseRowProps} from "VersionControl/Scenarios/Shared/RefTree/ExpandCollapseRow";
import { DeleteDialog } from "VersionControl/Scenarios/Branches/Components/BranchesDeleteDialog";
import { BranchRowActions} from "VersionControl/Scenarios/Branches/Components/BranchesUtils";
import * as RepoContext from "VersionControl/Scenarios/Branches/Stores/RepoContextStore";
import { BranchPermissions } from "VersionControl/Scenarios/Branches/Stores/BranchPermissionsStore";
import { BranchStoreFactory, StoreIds } from "VersionControl/Scenarios/Branches/Stores/BranchStoreFactory";
import { Avatar } from "VersionControl/Scenarios/Shared/AvatarSmallMinus";
import { AvatarUtils } from "VersionControl/Scenarios/Shared/AvatarUtils";
import { CommitHash } from "VersionControl/Scenarios/Shared/CommitHash";
import { StatusTextIcon } from "VersionControl/Scenarios/Shared/StatusBadge";
import { CodeHubContributionIds } from "VersionControl/Scripts/CodeHubContributionIds";
import { getShortCommitId } from "VersionControl/Scripts/CommitIdHelper";
import { GitObjectId } from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";
import * as GitRefUtility from "VersionControl/Scripts/GitRefUtility";
import * as VCDateUtils from "VersionControl/Scripts/Utils/VersionControlDateUtils";
import { onClickNavigationHandler } from "VersionControl/Scripts/Utils/XhrNavigationUtils";
import * as VersionControlUrls from "VersionControl/Scripts/VersionControlUrls";
import { VssDetailsList } from "VSSUI/VssDetailsList";
import * as VSS_Events from "VSS/Events/Services";
import { format } from "VSS/Utils/String";

export interface BranchesDetailsListProps {
    defaultBranch: IEnhancedGitRef
    compareBranch: IEnhancedGitRef;
    branches: IEnhancedGitRef[];
    permissions: BranchPermissions;
    compareIsMine: boolean;
    highlightText: string;
    displayFlatBranches: boolean;
    showDeletedColumns: boolean;
    onFolderExpanded(fullName: string): void;
    onFolderCollapsed(fullName: string): void;
}

export namespace BranchesColumns {
    export const BranchName = BranchResources.Column_Branch;
    export const Author = BranchResources.Column_Author;
    export const Date = BranchResources.Column_Date;
    export const Commit = BranchResources.Column_Commit;
    export const AheadBehind = BranchResources.Column_AheadBehind;
    export const Build = BranchResources.Column_Build;
    export const PullRequest = BranchResources.Column_PullRequest;
    export const DeletedBy = BranchResources.Column_DeletedBy;
    export const DeletedDate = BranchResources.Column_DeletedDate;
}

export interface BranchesDetailsListState {
    deletingBranch: string;  /** name of the branch delete was requested on **/
}

/**
 * Create the main detailed list for the branches page
 */
export class BranchesDetailsList extends React.Component<BranchesDetailsListProps, BranchesDetailsListState>{
    constructor(props: BranchesDetailsListProps) {
        super(props);
        this.state = {
            deletingBranch: null
        } as BranchesDetailsListState;
    }
    
    public render(): JSX.Element {
        const items: IEnhancedGitRef[] = this.props.branches;
        
        return (
            <div>
                {this.state.deletingBranch &&
                    <DeleteDialog
                        name={this.state.deletingBranch}
                        onDeleteBranch={this._setDialogDeletingBranch} />
                }
                <VssDetailsList
                    items={items}
                    columns={this.getBranchesColumns()}
                    layoutMode={DetailsListLayoutMode.justified}
                    constrainMode={ConstrainMode.unconstrained}
                    isHeaderVisible={true}
                    className={"vc-branches-details-tree bowtie-fabric"}
                    onRenderRow={(props) => <ExpandCollapseRow 
                        rowProps={props}
                        item={props.item.item}
                        onFolderExpanded={this.props.onFolderExpanded}
                        onFolderCollapsed={this.props.onFolderCollapsed} />} 
                    checkboxVisibility={CheckboxVisibility.hidden}
                    actionsColumnKey={BranchesColumns.BranchName}
                    getMenuItems={this._getMenuItems}
                    selectionMode={SelectionMode.single}
                    shouldDisplayActions={this._shouldDisplayContextMenu}
                    allocateSpaceForActionsButtonWhileHidden={true}
                />
            </div>
        );
    }

    /** Sets the branch current proposed for delete **/
    private _setDialogDeletingBranch = (deletingBranch: string) => {
        this.setState({
            deletingBranch
        });
    }

    /** Finds the menu items for the row **/
    private _getMenuItems = (itemActivated: IEnhancedGitRef) => {
        if (itemActivated.item.isFolder) {
            return getFolderCommandsInContextMenu({
                fullName: GitRefUtility.getFullRefNameFromBranch(itemActivated.item.fullName),
                favorite: itemActivated.favorite,
                permissions: this.props.permissions,
            });
        }
        else {
            return getFileCommandsInContextMenu({
                branch: itemActivated,
                compareBranch: this.props.compareBranch,
                compareIsMine: this.props.compareIsMine,
                deletingBranchDelegate: this._setDialogDeletingBranch,
                permissions: this.props.permissions,
            });
        }
    }

    private _toggleExpanded(fullFolderName: string, expanded: boolean, expanding: boolean, onFolderExpanded: (fullName: string) => void, onFolderCollapsed: (fullName: string) => void) {
        //Do nothing if we're processing
        if (!expanding) {
            if (expanded) {
                onFolderCollapsed(fullFolderName);
            }
            else {
                onFolderExpanded(fullFolderName);
            }
        }
    }

    private _shouldDisplayContextMenu = (item: IEnhancedGitRef): boolean => {
        if (item.hasMore && item.hasMore.isHasMore) {
            return false;
        }

        // hasAnyPermissions to each menu item is not a guarantee that the menu will have
        // some items, since a user might have permissions to some commands,
        // but they might be hidden for other reasons.
        const hasAnyPermission = item.item.isFolder
            ? hasPermissionToAnyFolderCommand(this.props.permissions)
            : hasPermissionToAnyCommand(this.props.permissions, item);

        return hasAnyPermission;
    }

    private renderBranchName = (item: IEnhancedGitRef, index: number) => {
        if (item.item.isFolder) {
            return (
                <FolderNameColumn
                    depth={item.item.depth}
                    name={item.item.name}
                    expanded={item.item.expanded}
                    expanding={item.item.expanding}
                    highlightText={this.props.highlightText}
                    fullname={GitRefUtility.getFullRefNameFromBranch(item.item.fullName)}
                    favorite={item.favorite}
                    permissions={this.props.permissions}
                    expandHandler={this._toggleExpanded.bind(this, item.item.fullName,
                        item.item.expanded,
                        item.item.expanding,
                        this.props.onFolderExpanded,
                        this.props.onFolderCollapsed)}
                    />
            );
        }
        else if (item.hasMore.isHasMore) {
            return <HasMoreRow
                key={"H" + item.item.fullName}
                folderName={item.item.fullName}
                depth={item.item.depth}
                expanding={item.hasMore.expanding}
                onFolderExpanded={this._onFolderExpanded} />
        } 
        return (
            <BranchNameColumn
                gitRef={item.ref.gitRef}
                fullName={item.item.fullName}
                showFullName={this.props.displayFlatBranches}
                isDeleted={item.ref.isDeleted}
                isDefault={item.isDefault}
                isCompare={item.isCompare}
                isUserCreated={item.isUserCreated}
                isNew={item.ref.isNew}
                hasPolicy={item.hasPolicy}
                favorite={item.favorite}
                leaveRoomForChevrons={true}
                depth={item.item.depth}
                highlightText={this.props.showDeletedColumns ? "" : this.props.highlightText}
                compareBranch={this.props.compareBranch.ref ? this.props.compareBranch.ref.gitRef : null}
                compareIsMine={this.props.compareIsMine}                
                onDeleteBranch={this._setDialogDeletingBranch}
                permissions={this.props.permissions} />
        );
    }

    private renderAuthor = (item: IEnhancedGitRef, index: number) => {
        return (
            item.lastUpdatedBy &&
            <Avatar
                displayName={item.lastUpdatedBy.name}
                email={item.lastUpdatedBy.email}
                imageUrl={item.lastUpdatedBy.imageUrl}
                showPersonaCard={true}
                />
        );
    }

    private renderDeletedBy = (item: IEnhancedGitRef, index: number) => {
        const imageUrl = AvatarUtils.getAvatarUrl(item.push.pushedBy);
        return (
            item.push &&
            <Avatar
                displayName={item.push.pushedBy.displayName}
                email={item.push.pushedBy.uniqueName}
                showPersonaCard={true}
                imageUrl={imageUrl}
                />
        );
    }

    private renderDate = (item: IEnhancedGitRef, index: number) => {
        let date: Date = null;
        if (this.props.showDeletedColumns && item.push) {
            date = item.push.date;
        }
        else if (!this.props.showDeletedColumns && item.lastUpdatedBy) {
            date = item.lastUpdatedBy.date;
        }

        if (date) {
            const creationDateString = VCDateUtils.getDateString(date, VCDateUtils.isDateRecent(date));
            const creationDateTooltip = VCDateUtils.getDateStringWithUTCOffset(date, "F");

            return (
                <TooltipHost content={creationDateTooltip}>
                    <span>{creationDateString}</span>
                </TooltipHost>
            );
        }
    }

    private renderCommit = (item: IEnhancedGitRef, index: number) => {
        if (item.ref) {
            const commitId: string = item.ref.gitRef.objectId;
            const shortCommitId = getShortCommitId(commitId);
            const toolTipText: string = item.comment ? format("{0}: {1}", shortCommitId, item.comment) : shortCommitId;
            const gitCommitId: GitObjectId = {
                full: commitId,
                short: shortCommitId
            }
            return (
                <CommitHash
                    href={VersionControlUrls.getCommitUrl(
                        BranchStoreFactory.get<RepoContext.Store>(StoreIds.REPO_CONTEXT).getRepoContext(), commitId)}
                    onLinkClick={onCommitClick}
                    commitId={gitCommitId}
                    overrideToolTipText={toolTipText}
                    showCopyButton={true} />
            );
        }
    }

    private renderAheadBehind = (item: IEnhancedGitRef, index: number) => {
        return (
            item.ref &&
                <AheadBehind aheadBehind={item.aheadBehindDefault}
                    compareBranchName={this.props.compareBranch.ref.gitRef ? this.props.compareBranch.ref.gitRef.name : null}
                    isCompare={item.isCompare}
            />
        );
    }

    private renderPullRequest = (item: IEnhancedGitRef, index: number) => {
        const showCreate: boolean = !item.ref.isDeleted && this.props.permissions.createPullRequest;
        return (
            item.ref &&
                <PullRequest branch={item} compareBranch={this.props.compareBranch.ref.gitRef} showCreate={showCreate} />
        );
    }

    private renderBuild = (item: IEnhancedGitRef, index: number) => {
        return (
            (item.ref && !item.ref.isDeleted && item.ref.gitRef.statuses) &&
                <StatusTextIcon
                className="vc-build-status"
                headerClassName="action-icon"
                statuses={item.ref.gitRef.statuses}
                isSetupExperienceVisible={false}
                isSetupReleaseExperienceVisible={false}
                isSetupExperienceDisabled={!this.props.permissions.setUpBuild}
                showOnlyBadge={true}
                />
        );
    }

    private _onFolderExpanded = (folder: string) => {
        VSS_Events.getService().fire(BranchRowActions.ShowMore, this);
        this.props.onFolderExpanded(folder);
    }

    public getBranchesColumns(): IColumn[] {
        const columns: IColumn[] = [];

        columns.push({
            key: BranchesColumns.BranchName,
            name: BranchesColumns.BranchName,
            fieldName: null,
            minWidth: 400,
            maxWidth: 99999,
            isResizable: false,
            columnActionsMode: ColumnActionsMode.disabled,
            onRender: this.renderBranchName
        });

        columns.push({
            key: BranchesColumns.Commit,
            name: BranchesColumns.Commit,
            fieldName: null,
            minWidth: 100,
            maxWidth: 100,
            isResizable: false,
            columnActionsMode: ColumnActionsMode.disabled,
            onRender: this.renderCommit
        });

        if (this.props.showDeletedColumns) {
            columns.push({
                key: BranchesColumns.DeletedBy,
                name: BranchesColumns.DeletedBy,
                fieldName: null,
                minWidth: 175,
                maxWidth: 175,
                isResizable: false,
                columnActionsMode: ColumnActionsMode.disabled,
                onRender: this.renderDeletedBy
            });

            columns.push({
                key: BranchesColumns.DeletedDate,
                name: BranchesColumns.DeletedDate,
                fieldName: null,
                minWidth: 100,
                maxWidth: 100,
                isResizable: false,
                columnActionsMode: ColumnActionsMode.disabled,
                onRender: this.renderDate
            });
        }
        else {
            columns.push({
                key: BranchesColumns.Author,
                name: BranchesColumns.Author,
                fieldName: null,
                minWidth: 175,
                maxWidth: 175,
                isResizable: false,
                columnActionsMode: ColumnActionsMode.disabled,
                onRender: this.renderAuthor
            });

            columns.push({
                key: BranchesColumns.Date,
                name: BranchesColumns.Date,
                fieldName: null,
                minWidth: 100,
                maxWidth: 100,
                isResizable: false,
                columnActionsMode: ColumnActionsMode.disabled,
                onRender: this.renderDate
            });
        }

        columns.push({
            key: BranchesColumns.AheadBehind,
            name: BranchesColumns.AheadBehind,
            fieldName: null,
            className: "ab-padding",
            minWidth: 110,
            maxWidth: 110,
            isResizable: false,
            columnActionsMode: ColumnActionsMode.disabled,
            onRender: this.renderAheadBehind
        });

        columns.push({
            key: BranchesColumns.Build,
            name: BranchesColumns.Build,
            fieldName: null,
            minWidth: 35,
            maxWidth: 35,
            isResizable: false,
            columnActionsMode: ColumnActionsMode.disabled,
            onRender: this.renderBuild
        });

        columns.push({
            key: BranchesColumns.PullRequest,
            name: BranchesColumns.PullRequest,
            fieldName: null,
            minWidth: 150,
            maxWidth: 150,
            isResizable: false,
            columnActionsMode: ColumnActionsMode.disabled,
            onRender: this.renderPullRequest
        });

        return columns;
    }
}

function onCommitClick(event: React.MouseEvent<HTMLLinkElement>) {
    onClickNavigationHandler(event, CodeHubContributionIds.historyHub, event.currentTarget.href);
}
