import * as React from "react";

import { IContextualMenuItem } from "OfficeFabric/ContextualMenu";
import {
    ColumnActionsMode,
    ConstrainMode,
    DetailsListLayoutMode,
    IColumn,
    CheckboxVisibility
} from "OfficeFabric/DetailsList";
import { TooltipHost } from "VSSUI/Tooltip";
import { SelectionMode } from "OfficeFabric/utilities/selection/interfaces";
import * as Utils_Date from "VSS/Utils/Date";
import { VssDetailsList } from "VSSUI/VssDetailsList";

import { Avatar } from "VersionControl/Scenarios/Shared/AvatarSmallMinus";
import { CommitHash } from "VersionControl/Scenarios/Shared/CommitHash";
import { ExpandCollapseRow, ExpandCollapseRowProps } from "VersionControl/Scenarios/Shared/RefTree/ExpandCollapseRow";
import { IEnhancedTagRef } from "VersionControl/Scenarios/Tags/TagsPage/Actions/ActionsHub";
import { TagNameCell } from "VersionControl/Scenarios/Tags/TagsPage/Components/TagNameCell";
import { getTagsCommandsInContextMenu } from "VersionControl/Scenarios/Tags/TagsPage/Components/TagsPageUtils";
import { CodeHubContributionIds } from "VersionControl/Scripts/CodeHubContributionIds";
import { getShortCommitId } from "VersionControl/Scripts/CommitIdHelper";
import { GitObjectId } from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";
import { GitRepositoryContext } from "VersionControl/Scripts/GitRepositoryContext";
import { RepositoryContext } from "VersionControl/Scripts/RepositoryContext";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import * as VCDateUtils from "VersionControl/Scripts/Utils/VersionControlDateUtils";
import { onClickNavigationHandler } from "VersionControl/Scripts/Utils/XhrNavigationUtils";
import * as VersionControlUrls from "VersionControl/Scripts/VersionControlUrls";

import "VSS/LoaderPlugins/Css!VersionControl/TagsDetailsList";

export interface TagsDetailsListProps {
    repositoryContext: RepositoryContext;
    visibleTags: IEnhancedTagRef[];
    onFolderExpanded(folderName: string): void;
    onFolderCollapsed(folderName: string): void;
    highlightText: string;
    compareTagBase?: string;
    onXhrNavigateToHub(url: string, hubId: string): void;
    onContentFirstRendered(): void;
    onTagDeleteMenuInvoked(name: string): void; // opens delete tag dialog for confirmation
    onSetAsCompareTagInvoked(name: string): void; // sets a tag for comparison
    isCreateBranchAllowed: boolean;
    isForcePushAllowed: boolean;
    isSettingWriteAllowed: boolean;
}

export class TagsDetailsList extends React.Component<TagsDetailsListProps, {}> {
    private isFirstRendered = false;
    private tagNameColumnKey = "tagName";

    public render(): JSX.Element {
        if (!this.isFirstRendered && this.props.visibleTags.length === 0) {
            this._onContentFirstRendered();
        }

        return (
            <VssDetailsList
                items={this.props.visibleTags}
                columns={this._getColumList()}
                className={"vc-tags-details-tree bowtie-fabric"}
                layoutMode={DetailsListLayoutMode.justified}
                constrainMode={ConstrainMode.unconstrained}
                isHeaderVisible={true}
                checkboxVisibility={CheckboxVisibility.hidden}
                actionsColumnKey={this.tagNameColumnKey}
                getMenuItems={this._getMenuItems}
                allocateSpaceForActionsButtonWhileHidden={true}
                selectionMode={SelectionMode.single}
                shouldDisplayActions={this._shouldDisplayContextMenu}
                onRowDidMount={!this.isFirstRendered && this._onContentFirstRendered}
                onRenderRow={props =>
                    <ExpandCollapseRow
                        rowProps={props}
                        item={props.item.item}
                        onFolderExpanded={this.props.onFolderExpanded}
                        onFolderCollapsed={this.props.onFolderCollapsed}
                    />}
            />);
    }

    private _getColumList = (): IColumn[] => {
        const columns: IColumn[] = [];

        columns.push({
            key: this.tagNameColumnKey,
            name: VCResources.TagsPage_ListHeader_TagName,
            fieldName: null,
            className: "tag-name-cell",
            headerClassName: "tag-name-header",
            minWidth: 400,
            maxWidth: 99999,
            isResizable: false,
            columnActionsMode: ColumnActionsMode.disabled,
            onRender: (tagEnhancedRef: IEnhancedTagRef, index: number) => {

                const tag = tagEnhancedRef.item;
                return (
                    <TagNameCell
                        name={tag.name}
                        fullName={tag.fullName}
                        isFolder={tag.isFolder}
                        depth={tag.depth}
                        highlightText={this.props.highlightText}
                        folderExpandCollapseHandler={this._toggleFolderExpand}
                        isFolderExpanded={tag.expanded}
                        isFolderExpanding={tag.expanding}
                        tagComment={tagEnhancedRef.comment}
                        repositoryContext={this.props.repositoryContext}
                        hasMore={tagEnhancedRef.hasMore}
                        isDeleted={tagEnhancedRef.isDeleted}
                        isLightWeight={!tagEnhancedRef.tagger}
                        isCompareTagBase={tagEnhancedRef.isCompareTagBase} />
                );
            }
        });

        columns.push({
            key: "tagCommit",
            name: VCResources.TagsPage_ListHeader_Commit,
            fieldName: null,
            className: "tag-commit",
            headerClassName: "tag-commit-header",
            minWidth: 100,
            maxWidth: 120,
            isResizable: false,
            columnActionsMode: ColumnActionsMode.disabled,
            onRender: (tagEnhancedRef: IEnhancedTagRef, index: number) => {
                if (tagEnhancedRef.item.isFolder || this._isShowMoreItem(tagEnhancedRef)) {
                    return null;
                }

                const commitId: string = tagEnhancedRef.resolvedCommitId;
                const shortCommitId = getShortCommitId(commitId);
                const gitCommitId: GitObjectId = {
                    full: commitId,
                    short: shortCommitId
                }

                return (
                    <CommitHash
                        href={VersionControlUrls.getCommitUrl(
                            this.props.repositoryContext as GitRepositoryContext, commitId)}
                        onLinkClick={onCommitClick}
                        commitId={gitCommitId}
                        showCopyButton={true} />
                );
            }
        });

        columns.push({
            key: "tagger",
            name: VCResources.TagsPage_ListHeader_Tagger,
            fieldName: null,
            className: "tagger",
            headerClassName: "tag-tagger-header",
            minWidth: 150,
            maxWidth: 190,
            isResizable: false,
            columnActionsMode: ColumnActionsMode.disabled,
            onRender: (tagEnhancedRef: IEnhancedTagRef, index: number) => {
                return (
                    <Avatar
                        displayName={tagEnhancedRef.tagger.name}
                        email={tagEnhancedRef.tagger.email}
                        showPersonaCard={true}
                        imageUrl={tagEnhancedRef.tagger.imageUrl}
                        />
                );
            }
        });

        columns.push({
            key: "tagDate",
            name: VCResources.TagsPage_ListHeader_CreationDate,
            fieldName: null,
            className: "tag-date",
            headerClassName: "tag-date-header",
            minWidth: 100,
            maxWidth: 150,
            isResizable: false,
            columnActionsMode: ColumnActionsMode.disabled,
            onRender: (tagEnhancedRef: IEnhancedTagRef, index: number) => {
                const creationDate = tagEnhancedRef.tagger.date;
                const creationDateString = VCDateUtils.getDateString(creationDate, VCDateUtils.isDateRecent(creationDate));
                const creationDateTooltip = VCDateUtils.getDateStringWithUTCOffset(creationDate, "F");

                return (
                    <TooltipHost content={creationDateTooltip}>
                        <div className={"inline"} >
                            {creationDateString}
                        </div>
                    </TooltipHost>
                );
            }
        });
        return columns;
    }

    private _toggleFolderExpand = (folderName: string, isExpanding: boolean, isExpanded: boolean): void => {
        if (!isExpanding) {
            if (isExpanded) {
                this.props.onFolderCollapsed(folderName);
            }
            else {
                this.props.onFolderExpanded(folderName);
            }
        }
    }

    private _shouldDisplayContextMenu = (item: IEnhancedTagRef): boolean => {
        if (item.item.isFolder || this._isShowMoreItem(item)) {
            return false;
        }

        return true;
    }

    private _getMenuItems = (tagRef: IEnhancedTagRef): IContextualMenuItem[] => {

        return getTagsCommandsInContextMenu(
            tagRef,
            this.props.repositoryContext,
            this.props.onXhrNavigateToHub,
            this.props.onTagDeleteMenuInvoked,
            this.props.onSetAsCompareTagInvoked,
            this.props.isCreateBranchAllowed,
            this.props.isForcePushAllowed,
            this.props.isSettingWriteAllowed,
            this.props.compareTagBase);
    }

    private _onContentFirstRendered = (): void => {
        if (!this.isFirstRendered) {
            this.isFirstRendered = true;
            this.props.onContentFirstRendered();
        }
    }

    private _isShowMoreItem = (item: IEnhancedTagRef): boolean => {
        return (!!item.hasMore && item.hasMore.isHasMore);
    }
}

function onCommitClick(event: React.MouseEvent<HTMLLinkElement>) {
    onClickNavigationHandler(event, CodeHubContributionIds.historyHub, event.currentTarget.href);
}
