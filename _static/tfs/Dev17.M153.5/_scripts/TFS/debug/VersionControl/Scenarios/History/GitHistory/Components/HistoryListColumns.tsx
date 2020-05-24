
import * as React from "react";

import { DirectionalHint } from "OfficeFabric/common/DirectionalHint";
import { IContextualMenuItem } from "OfficeFabric/ContextualMenu";
import {
    ColumnActionsMode,
    IColumn,
} from "OfficeFabric/DetailsList";
import { TooltipHost } from "VSSUI/Tooltip";
import { GitStatus } from "TFS/VersionControl/Contracts";
import { HistoryListColumnKeys } from "TFS/VersionControl/Controls";
import { TelemetryEventData } from "VSS/Telemetry/Services";
import * as Utils_Date from "VSS/Utils/Date";
import * as Utils_String from "VSS/Utils/String";

import { IContributableCommitActionParams, getContributableCommitActionContext } from "VersionControl/Scenarios/Shared/ContributableCommitAction";
import { CommitActionMenu, CommonCommitActionMenu, CommonCommitActionMenuProps } from "VersionControl/Scenarios/ChangeDetails/Components/CommitActionMenu";
import { AvatarImageSize } from "VersionControl/Scenarios/Shared/AvatarImageInterfaces";
import { CommitHash } from "VersionControl/Scenarios/Shared/CommitHash";
import { StakeholdersFlyout, IStakeholdersProps } from "VersionControl/Scenarios/Shared/StakeholdersFlyout";
import { StatBadge } from "VersionControl/Scenarios/Shared/StatBadge";
import { StatusTextIcon } from "VersionControl/Scenarios/Shared/StatusBadge";

import { ExtendedGitIdentityReference, HistoryPermissionSet } from "VersionControl/Scenarios/History/GitHistory/Actions/HistoryTabActionsHub";
import { GitShortCommentWithTags } from "VersionControl/Scenarios/History/GitHistory/Components/GitShortCommentWithTags";
import { HistoryListProps, HistoryListItem, HistoryListColumnMapper } from "VersionControl/Scenarios/History/GitHistory/Components/HistoryListInterfaces";
import { GitCommitExtended, PullRequest, GitTag } from "VersionControl/Scenarios/History/GitHistory/GitCommitExtendedContracts";
import { GraphSettingsConstants } from "VersionControl/Scenarios/History/GitHistory/GitGraph/GraphConstants";
import { GraphRow } from "VersionControl/Scenarios/History/GitHistory/GitGraph/GraphRow";
import { HistoryGraphCellRenderer } from "VersionControl/Scenarios/History/GitHistory/GitGraph/HistoryGraphCellRenderer";
import { IHistoryGraph, IHistoryGraphRow } from "VersionControl/Scenarios/History/GitHistory/GitGraph/HistoryGraphContracts";
import { getCommitId } from "VersionControl/Scenarios/History/GitHistory/HistoryUtils";

import { CodeHubContributionIds } from "VersionControl/Scripts/CodeHubContributionIds";
import { VersionControlActionIds } from "VersionControl/Scripts/Controls/ControlsCommon";
import { ChangeList, GitCommit, GitObjectType, HistoryEntry } from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";
import { GitRepositoryContext } from "VersionControl/Scripts/GitRepositoryContext";
import { RepositoryContext } from "VersionControl/Scripts/RepositoryContext";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import * as VCOM from "VersionControl/Scripts/TFS.VersionControl";
import * as VCDateUtils from "VersionControl/Scripts/Utils/VersionControlDateUtils";
import { onClickNavigationHandler } from "VersionControl/Scripts/Utils/XhrNavigationUtils";
import * as VersionControlUrls from "VersionControl/Scripts/VersionControlUrls";
import { IVssContextualMenuItemProvider } from "VSSUI/VssContextualMenu";
import { ContributableMenuItemProvider } from "VSSPreview/Providers/ContributableMenuItemProvider"

export function getHistoryDetailsListColumns(props: HistoryListProps): IColumn[] {
        const columns: HistoryListColumnMapper[] = props.columns || DefaultColumns.AllColumns;
        const detailsListColumns: IColumn[] = columns.map((fxn: HistoryListColumnMapper) => fxn(props)) ;
        return detailsListColumns;
}

export class HistoryListColumns {
    // Do not use these directly to construct historylist columns,
    // instead use one of the constants from the DefaultColumns namespace in the end of the file.
    public static readonly GraphColumn = (props: HistoryListProps) => HistoryListColumns._getGraphColumn(props.gitGraph);
    public static readonly AuthorColumn = (props: HistoryListProps) => HistoryListColumns._getAuthorColumn();
    public static readonly ChangeTypeColumn = (props: HistoryListProps) => HistoryListColumns._getChangeTypeColumn();
    public static readonly AuthoredDateColumn = (props: HistoryListProps) => HistoryListColumns._getAuthoredDateColumn();
    public static readonly PullRequestColumn = (props: HistoryListProps) => HistoryListColumns._getPullRequestColumn(props.telemetryEventData);
    public static readonly BuildStatusColumn = (props: HistoryListProps) => HistoryListColumns._getBuildStatusColumn();
    public static readonly ContextMenuColumn = (props: HistoryListProps) =>
        HistoryListColumns._getContextMenuColumn(props.repositoryContext, props.telemetryEventData, props.currentBranchFullname, props.permissionSet);
    public static readonly MessageColumn = (props: HistoryListProps) =>
        HistoryListColumns._getMessageColumn(props.repositoryContext, props.resultsObjectType, props.currentBranchFullname, props.onItemSelected);
    public static readonly CommitHashColumn = (props: HistoryListProps) => {
        // If no context menu, show copy button.
        const showCopyButton = props.columns && !(props.columns.indexOf(HistoryListColumns.ContextMenuColumn) >= 0);
        return HistoryListColumns._getCommitHashColumn(props.repositoryContext, props.resultsObjectType, props.currentBranchFullname, showCopyButton);
    }

    // Column creation helper functions, keep them all pure functions.
    private static _getCommitHashColumn(
        repositoryContext: RepositoryContext,
        resultsObjectType: GitObjectType,
        currentBranchFullname: string,
        showCopyButton: boolean
        ): IColumn {
        return {
            key: HistoryListColumnKeys.Commit,
                name: VCResources.HistoryList_CommitColumnHeader,
                fieldName: null,
                className: "history-commit",
                headerClassName: "history-commit-header",
                minWidth: (showCopyButton) ? 80 : 60,
                maxWidth: (showCopyButton) ? 80 : 60,
                isResizable: false,
                columnActionsMode: ColumnActionsMode.disabled,
                onRender: (historyListItem: HistoryListItem) => {
                    const item: HistoryEntry = historyListItem.item;
                    const gitCommit = item.changeList as GitCommit;
                    return <CommitHash
                        href={gitCommit.url ||
                            (repositoryContext &&
                                VersionControlUrls.getCommitDetailUrl(
                                    repositoryContext as GitRepositoryContext,
                                    gitCommit.commitId.full,
                                    item.serverItem,
                                    resultsObjectType,
                                    VCOM.ChangeType.isEdit(item.itemChangeType) ?
                                        VersionControlActionIds.Compare
                                        : VersionControlActionIds.Contents,
                                    this._getRouteDataForCommitDetailUrl(currentBranchFullname),
                                ))}
                        onLinkClick={event => onClickNavigationHandler(event, CodeHubContributionIds.historyHub, event.currentTarget.href)}
                        commitId={gitCommit.commitId}
                        showCopyButton={showCopyButton}
                        rightAlignCopyToolTip={true}
                        />;
                },
            };
    }

    private static _getContextMenuColumn(
        repositoryContext: RepositoryContext,
        telemetryEventData: TelemetryEventData,
        currentBranchFullname: string,
        permissionSet: HistoryPermissionSet
        ): IColumn {
        return {
                key: HistoryListColumnKeys.CommitOptions,
                name: "",
                fieldName: null,
                className: "commit-option",
                headerClassName: "commit-option-header",
                minWidth: 32,
                maxWidth: 32,
                isResizable: false,
                columnActionsMode: ColumnActionsMode.disabled,
                onRender: (historyListItem: HistoryListItem) => {
                    const item: HistoryEntry = historyListItem.item;
                    const gitCommit = item.changeList as GitCommit;
                    const commitId = gitCommit.commitId.full;

                    const commonProps: CommonCommitActionMenuProps = {
                        commitId: gitCommit.commitId,
                        comment: gitCommit.comment,
                        branchName: currentBranchFullname,
                        hasCreateBranchPermissions: permissionSet ? permissionSet.hasCreateBranchPermission : false,
                        hasCreateTagPermissions: permissionSet ? permissionSet.hasCreateTagPermission : false,
                        telemetryEventData,
                        repositoryContext,
                        path: item.serverItem,
                        commentTruncated: gitCommit.commentTruncated
                    };
                    const commonCommitActionMenu = new CommonCommitActionMenu(commonProps);

                    const tfsContext = repositoryContext.getTfsContext();
                    return (
                        <CommitActionMenu 
                            getItems={() => this._getContextMenuItems(commonCommitActionMenu)}
                            getItemProviders={() => this._getMenuItemProviders(
                                getContributableCommitActionContext(
                                    repositoryContext,
                                    commonProps, 
                                    commonProps.path))}
                            {...commonProps} />
                    );
                },
            };
    }

    private static _getMessageColumn(
        repositoryContext: RepositoryContext,
        resultsObjectType: GitObjectType,
        currentBranchFullname: string,
        onItemSelected: (event: React.MouseEvent<HTMLAnchorElement>, telemetryEventData: TelemetryEventData) => void,
        ): IColumn {
        return {
                key: HistoryListColumnKeys.Message,
                name: VCResources.HistoryList_MessageColumnHeader,
                fieldName: null,
                headerClassName: "history-message-header",
                className: "history-message",
                minWidth: 400,
                maxWidth: 99999,
                isResizable: true,
                columnActionsMode: ColumnActionsMode.disabled,
                onRender: (historyListItem: HistoryListItem, index: number) => {
                    const item: HistoryEntry = historyListItem.item;
                    const tags: GitTag[] = this._getTags(item.changeList);
                    const gitCommit = item.changeList as GitCommit;
                    const commitHref = gitCommit.url ||
                        (repositoryContext &&
                            VersionControlUrls.getCommitDetailUrl(
                                repositoryContext as GitRepositoryContext,
                                (item.changeList as GitCommit).commitId.full,
                                item.serverItem,
                                resultsObjectType,
                                VCOM.ChangeType.isEdit(item.itemChangeType) ?
                                    VersionControlActionIds.Compare
                                    : VersionControlActionIds.Contents,
                                this._getRouteDataForCommitDetailUrl(currentBranchFullname)));
                    return (
                        <GitShortCommentWithTags
                            repositoryContext={repositoryContext as GitRepositoryContext}
                            onClickedHref={commitHref}
                            onItemClicked={onItemSelected}
                            tagsList={tags}
                            fullComment={item.changeList.comment}
                            isCommentTruncated={item.changeList.commentTruncated}
                            serverItemPath={item.serverItem}/>
                    );
                },
            };
    }

    private static _getGraphColumn(gitGraph: IHistoryGraph): IColumn {
        const graphColumnWidth = HistoryListColumns._getGraphColumnWidth(gitGraph);
        return {
                key: HistoryListColumnKeys.Graph,
                name: VCResources.HistoryList_GraphColumnHeader,
                fieldName: null,
                headerClassName: "history-graph-header",
                className: "history-graph",
                minWidth: graphColumnWidth,
                maxWidth: graphColumnWidth,
                isResizable: false,
                columnActionsMode: ColumnActionsMode.disabled,
                onRender: (item: HistoryListItem) => {
                    if (!gitGraph) {
                        return null;
                    }

                    const graphRow = gitGraph.rows[getCommitId(item.item.changeList)];
                    const renderSettings = gitGraph.settings.renderSettings;

                    if (graphRow) {
                        return (<GraphRow
                            row={graphRow}
                            rowMinWidth={graphColumnWidth}
                            staticHeight={renderSettings.cellStaticHeight}
                            staticWidth={renderSettings.cellStaticWidth}
                            cellRenderer={new HistoryGraphCellRenderer(gitGraph.settings.orientation, renderSettings)} />);
                    } else {
                        return null;
                    }
                },
            };
    }

    private static _getAuthorColumn(): IColumn {
        return {
                key: HistoryListColumnKeys.Author,
                name: VCResources.HistoryList_AuthorColumnHeader,
                fieldName: null,
                headerClassName: "history-author-header",
                className: "history-author",
                minWidth: 150,
                maxWidth: 190,
                isResizable: true,
                columnActionsMode: ColumnActionsMode.disabled,
                onRender: (historyListItem: HistoryListItem) => {
                    const item: HistoryEntry = historyListItem.item;
                    const stakeholders = this._getStakeholders(item.changeList);

                    return <StakeholdersFlyout
                        badgeHeader={stakeholders.badgeHeader}
                        author={stakeholders.author}
                        authoredDate={stakeholders.authoredDate}
                        committer={stakeholders.committer}
                        commitDate={stakeholders.commitDate}
                        pusher={stakeholders.pusher}
                        pushedDate={stakeholders.pushedDate}
                        pushUrl={stakeholders.pushUrl}
                        flyoutContentClassName={"history-list-stakeholdersflyout"} />;
                },
            };
    }

    private static _getAuthoredDateColumn(): IColumn {
        return {
                key: HistoryListColumnKeys.Date,
                name: VCResources.HistoryList_DateColumnHeader,
                fieldName: null,
                headerClassName: "history-date-header",
                className: "history-date",
                minWidth: 150,
                maxWidth: 175,
                isResizable: true,
                columnActionsMode: ColumnActionsMode.disabled,
                onRender: (historyListItem: HistoryListItem) => {
                    const item: HistoryEntry = historyListItem.item;
                    const creationDate = this._getAuthoredDate(item.changeList);
                    const creationDateTooltip = this._getTooltipForAuthoredDate(item.changeList);
                    return (
                        <TooltipHost
                            content={creationDateTooltip}
                            directionalHint={DirectionalHint.bottomCenter}>
                            <div className={"inline"} >
                                {creationDate}
                            </div>
                        </TooltipHost>
                    );
                },
            };
    }

    private static _getPullRequestColumn(telemetryEventData: TelemetryEventData): IColumn {
        return {
            key: HistoryListColumnKeys.PullRequest,
                name: VCResources.HistoryList_PullRequestColumnHeader,
                fieldName: null,
                headerClassName: "history-pullrequest-header",
                className: "history-pullrequest",
                minWidth: 100,
                maxWidth: 150,
                isResizable: true,
                columnActionsMode: ColumnActionsMode.disabled,
                onRender: (historyListItem: HistoryListItem, index: number) => {
                    const item: HistoryEntry = historyListItem.item;
                    const pullRequest = this._getPullRequest(item.changeList);
                    if (pullRequest) {
                        return (
                            <StatBadge
                                iconClassName={"bowtie-tfvc-pull-request"}
                                className={"ms-Link"}
                                title={pullRequest.id}
                                tooltip={Utils_String.format(
                                    VCResources.PullRequest_PullRequestDetailsTitle,
                                    pullRequest.id,
                                    pullRequest.title)}
                                url={pullRequest.url}
                                onLinkClick={
                                    (event: React.MouseEvent<HTMLAnchorElement>) =>
                                        onClickNavigationHandler(event, CodeHubContributionIds.pullRequestHub, (event.currentTarget as HTMLAnchorElement).href)}
                                telemetryEventData={telemetryEventData}
                                />
                        );
                    } else {
                        return null;
                    }
                },
            };
    }

    private static _getBuildStatusColumn(): IColumn{
        return {
                key: HistoryListColumnKeys.Build,
                name: VCResources.HistoryList_BuildStatusHeader,
                fieldName: null,
                headerClassName: "history-build-header",
                className: "history-build",
                minWidth: 42,
                maxWidth: 70,
                isResizable: true,
                columnActionsMode: ColumnActionsMode.disabled,
                onRender: (historyListItem: HistoryListItem) => {
                    const item: HistoryEntry = historyListItem.item;
                    const statuses = this._getStatuses(item.changeList);
					if (statuses && statuses.length > 0) {
                        return <StatusTextIcon className={"vc-build-status"} statuses={statuses} isSetupExperienceVisible={false} isSetupReleaseExperienceVisible={false} showOnlyBadge={true} />;
                    } else {
                        return <div />;
                    }
                },
            };
    }

    private static _getChangeTypeColumn(): IColumn{
        return {
                key: HistoryListColumnKeys.ChangeType,
                name: VCResources.HistoryList_ChangeTypeColumnHeader,
                fieldName: null,
                headerClassName: "history-change-type-header",
                className: "history-change-type",
                minWidth: 50,
                maxWidth: 100,
                isResizable: true,
                columnActionsMode: ColumnActionsMode.disabled,
                onRender: (historyListItem: HistoryListItem) => {
                    const item: HistoryEntry = historyListItem.item;
                    const changeType = VCOM.ChangeType.getDisplayText(item.itemChangeType);
                    return <div className={"inline"} title={changeType} aria-label={changeType}>
                        {changeType}
                    </div>;
                },
            };
    }

    // Helpers functions, keep them all as pure functions.

    // public for UTs.
    public static _getStakeholders(changeList: ChangeList): IStakeholdersProps {
        const gitCommit = changeList as GitCommit;
        const author = gitCommit.author as ExtendedGitIdentityReference;
        const committer = gitCommit.committer as ExtendedGitIdentityReference;

        // if email does not exists use only the author displayname.
        const authorEmailString: string = !!author.id
            ? Utils_String.format(VCResources.CommitOwnerDisplayNameFormat, author.displayName, author.id)
            : author.displayName;

        const committerEmailString: string = !!gitCommit.committer.id
            ? Utils_String.format(VCResources.CommitOwnerDisplayNameFormat, gitCommit.committer.displayName, gitCommit.committer.id)
            : gitCommit.committer.displayName;

        return {
            badgeHeader: {
                email: authorEmailString,
                displayName: author.displayName,
                identityId: null,
                size: AvatarImageSize.SmallMinus,
                imageUrl: author.imageUrl,
            },
            author: {
                email: authorEmailString,
                displayName: author.displayName,
                identityId: null,
                imageUrl: author.imageUrl,
            },
            authoredDate: author.date,

            committer: {
                email: committerEmailString,
                displayName: committer.displayName,
                identityId: null,
                imageUrl: committer.imageUrl,
            },
            commitDate: committer.date,

            pusher: null,
            pushedDate: null,   
            pushUrl: undefined,
        };
    }

    private static _getMenuItemProviders(commitContext: IContributableCommitActionParams): IVssContextualMenuItemProvider[] {
        return [new ContributableMenuItemProvider(["ms.vss-code-web.git-commit-list-menu"], commitContext)];
    }
    
    private static _getContextMenuItems(commonCommitActionMenu: CommonCommitActionMenu): IContextualMenuItem[] {
        const menuItems = [
            commonCommitActionMenu.getCopyCommitSHA(),
            commonCommitActionMenu.getBrowseFiles(),
            commonCommitActionMenu.getSeparator(),
            commonCommitActionMenu.getCreateBranchOption(),
            commonCommitActionMenu.getCreateTagOption(),
        ];

        return menuItems.filter(item => item);
    }

    private static _getGraphColumnWidth(gitGraph: IHistoryGraph): number {
        if (gitGraph &&
            gitGraph.settings &&
            gitGraph.settings.renderSettings &&
            gitGraph.settings.renderSettings.cellStaticWidth) {
            return (this._getMaxGraphRowCellId(gitGraph) + 1 + 2) * gitGraph.settings.renderSettings.cellStaticWidth;  // +1 since the id starts from 0, +2 for excision cells
        }

        return GraphSettingsConstants.GraphColumnDefaultWidth;
    }

    private static _getMaxGraphRowCellId(gitGraph: IHistoryGraph): number {
        let maxCellId = 0;
        if (gitGraph && gitGraph.rows) {
            for (const commitId in gitGraph.rows) {
                const row: IHistoryGraphRow = gitGraph.rows[commitId];
                maxCellId = row.maxCellId > maxCellId ? row.maxCellId : maxCellId;
            }
        }

        return maxCellId;
    }

    private static _getStatuses(changeList: ChangeList): GitStatus[] {
        const gitCommit = changeList as GitCommitExtended;

        if (gitCommit) {
            return gitCommit.statuses;
        }
    }

    private static _getPullRequest(changeList: ChangeList): PullRequest {
        const gitCommit = changeList as GitCommitExtended;

        if (gitCommit) {
            return gitCommit.pullRequest;
        }
    }

    private static _getRouteDataForCommitDetailUrl(currentBranchFullname: string): { [refName: string]: string } {
        if (currentBranchFullname) {
            return { refName: currentBranchFullname };
        }
        else {
            return {};
        }
    }

    private static _getTags(changeList: ChangeList): GitTag[] {
        const gitCommit = changeList as GitCommitExtended;
        if (gitCommit) {
            return gitCommit.tags;
        }
    }

    private static _getAuthorColumnPosition(columns: IColumn[]): number {
        for (let i = 0; i < columns.length; i++) {
            if (columns[i].key === HistoryListColumnKeys.Author) {
                return i;
            }
        }
        return -1;
    }

    private static _getAuthoredDate(changeList: ChangeList): string {
        const gitCommit = changeList as GitCommit;
        if (gitCommit && gitCommit.commitId) {
            const isDateRecent: boolean = VCDateUtils.isDateRecent(gitCommit.creationDate);
            return isDateRecent ? Utils_Date.friendly(gitCommit.creationDate) : Utils_Date.localeFormat(gitCommit.creationDate, "g");
        }
        return "";
    }

    private static _getTooltipForAuthoredDate(changeList: ChangeList): string {
        const gitCommit = changeList as GitCommit;
        if (gitCommit && gitCommit.commitId) {
            return VCDateUtils.getDateStringWithUTCOffset(gitCommit.creationDate, "F");
        }
        return "";
    }

}

export class HistoryListColumnsMap {

    public static getHistoryListColumn(columnKey: string): HistoryListColumnMapper {
        return this._historyListColumnsMap[columnKey];
    }

    private static _initializeHistoryListColumnsMap(): IDictionaryStringTo<HistoryListColumnMapper> { 
        let columnsMap = {};
        columnsMap[HistoryListColumnKeys.Graph] = HistoryListColumns.GraphColumn;
        columnsMap[HistoryListColumnKeys.Author] = HistoryListColumns.AuthorColumn;
        columnsMap[HistoryListColumnKeys.Message] = HistoryListColumns.MessageColumn;
        columnsMap[HistoryListColumnKeys.PullRequest] = HistoryListColumns.PullRequestColumn;
        columnsMap[HistoryListColumnKeys.Date] = HistoryListColumns.AuthoredDateColumn;
        columnsMap[HistoryListColumnKeys.Commit] = HistoryListColumns.CommitHashColumn;
        columnsMap[HistoryListColumnKeys.Build] = HistoryListColumns.BuildStatusColumn;
        columnsMap[HistoryListColumnKeys.ChangeType] = HistoryListColumns.ChangeTypeColumn;
        columnsMap[HistoryListColumnKeys.CommitOptions] = HistoryListColumns.ContextMenuColumn;
        return columnsMap;      
    }
    private static _historyListColumnsMap: IDictionaryStringTo<HistoryListColumnMapper> = HistoryListColumnsMap._initializeHistoryListColumnsMap();
}

export class DefaultColumns {
    public static get AllColumns(): HistoryListColumnMapper[] {
        const allColumns: HistoryListColumnMapper[] = [
            HistoryListColumns.GraphColumn,
            HistoryListColumns.CommitHashColumn,
            HistoryListColumns.ContextMenuColumn,
            HistoryListColumns.MessageColumn,
            HistoryListColumns.AuthorColumn,
            HistoryListColumns.ChangeTypeColumn,
            HistoryListColumns.AuthoredDateColumn,
            HistoryListColumns.PullRequestColumn,
            HistoryListColumns.BuildStatusColumn,
        ];
        return allColumns;
    }

    public static get BasicColumns(): HistoryListColumnMapper[] {
        const basicColumns: HistoryListColumnMapper[] = [
            HistoryListColumns.CommitHashColumn,
            HistoryListColumns.MessageColumn,
            HistoryListColumns.AuthorColumn,
            HistoryListColumns.AuthoredDateColumn,
        ];
        return basicColumns;
    }

    public static get BasicColumnsFileLevel(): HistoryListColumnMapper[] {
        const basicColumnsFileLevel = [
            HistoryListColumns.CommitHashColumn,
            HistoryListColumns.MessageColumn,
            HistoryListColumns.AuthorColumn,
            HistoryListColumns.ChangeTypeColumn,
            HistoryListColumns.AuthoredDateColumn,
        ];
        return basicColumnsFileLevel;
    }

    public static GetCustomColumns(columnKeys: string[]): HistoryListColumnMapper[] {
        let customColumns: HistoryListColumnMapper[] = [];
        columnKeys.forEach((columnKey: string) => {
            let historyListColumnMapper = HistoryListColumnsMap.getHistoryListColumn(columnKey);
            if (historyListColumnMapper) {
                customColumns.push(historyListColumnMapper);
            }
        });
        return customColumns;
    }

}
