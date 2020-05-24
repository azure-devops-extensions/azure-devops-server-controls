/// <reference types="react" />
/// <reference types="react-dom" />

import * as React from "react";
import * as ReactDOM from "react-dom";
import { TooltipHost, TooltipOverflowMode } from "VSSUI/Tooltip";
import { DirectionalHint } from "OfficeFabric/common/DirectionalHint";
import { HasMore } from "VersionControl/Scenarios/Branches/Components/BranchesUtils";
import { HasMoreRow } from "VersionControl/Scenarios/Shared/RefTree/HasMoreRow";
import { FolderName } from "VersionControl/Scenarios/Shared/RefTree/RefFolderName";
import { RefNameLinkInTree } from "VersionControl/Scenarios/Shared/RefTree/RefNameLinkInTree";
import { CodeHubContributionIds } from "VersionControl/Scripts/CodeHubContributionIds";
import { GitRepositoryContext } from "VersionControl/Scripts/GitRepositoryContext";
import { RepositoryContext } from "VersionControl/Scripts/RepositoryContext";
import { GitTagVersionSpec } from "VersionControl/Scripts/TFS.VersionControl.VersionSpecs";
import { getTagExplorerUrl } from "VersionControl/Scripts/VersionControlUrls";
import { onClickNavigationHandler } from "VersionControl/Scripts/Utils/XhrNavigationUtils";
import { getFullRefNameFromTagName } from "VersionControl/Scripts/GitRefUtility";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";

import "VSS/LoaderPlugins/Css!VersionControl/TagNameCell";

export interface TagNameCellProps {
    name: string;
    fullName: string;
    isFolder: boolean;
    depth: number;
    highlightText: string;
    hasMore: HasMore;
    isLightWeight: boolean;

    // Folder specific properties - present if isFolder is true
    folderExpandCollapseHandler?(name: string, expanding: boolean, expanded: boolean): void;
    isFolderExpanded?: boolean;
    isFolderExpanding?: boolean;

    // non-folder properties - present if isFolder is false
    tagComment?: string;
    repositoryContext?: RepositoryContext;
    isDeleted?: boolean;
    isCompareTagBase?: boolean;
}

export const TagNameCell = (props: TagNameCellProps): JSX.Element => {
    return (<span className="tag-cell-content">
        {
            props.isFolder
                ? <FolderName
                    key={"F" + props.fullName}
                    depth={props.depth}
                    name={props.name}
                    fullname={props.fullName}
                    expanded={props.isFolderExpanded}
                    expanding={props.isFolderExpanding}
                    highlightText={props.highlightText}
                    expandHandler={() => props.folderExpandCollapseHandler(props.fullName, props.isFolderExpanding, props.isFolderExpanded)} />
                : props.hasMore.isHasMore
                    ? <HasMoreRow
                        key={"H" + props.fullName}
                        folderName={props.fullName}
                        depth={props.depth}
                        expanding={props.hasMore.expanding}
                        onFolderExpanded={() => props.folderExpandCollapseHandler(props.fullName, props.isFolderExpanding, props.isFolderExpanded)} />
                    : <TagNameAndDescription
                        depth={props.depth}
                        name={props.name}
                        fullName={props.fullName}
                        isDeleted={props.isDeleted}
                        isCompareTagBase={props.isCompareTagBase}
                        highlightText={props.highlightText}
                        tagComment={props.tagComment}
                        isLightWeight={props.isLightWeight}
                        repositoryContext={props.repositoryContext} />
        }
    </span>);
}

interface TagNameAndDescriptionProps {
    repositoryContext?: RepositoryContext;
    name: string;
    fullName: string;
    depth: number;
    highlightText: string;
    tagComment: string;
    isDeleted: boolean;
    isLightWeight: boolean;
    isCompareTagBase?: boolean;
}

const TagNameAndDescription = (props: TagNameAndDescriptionProps): JSX.Element => {
    const tagExplorerUrl = getTagExplorerUrl(props.repositoryContext as GitRepositoryContext, props.fullName);
    const _onLinkClick = (event: React.MouseEvent<HTMLAnchorElement>): void => {
        onClickNavigationHandler(event, CodeHubContributionIds.gitFilesHub, event.currentTarget.href);
    };

    return (
        <div className="tag-description">
            <RefNameLinkInTree
                refIcon="bowtie-tag tag-icon"
                depth={props.depth}
                key={props.fullName}
                leaveRoomForBadge={false}
                leaveRoomForChevrons={true}
                name={getFullRefNameFromTagName(props.fullName)}
                isDeleted={props.isDeleted}
                deletedRefText={""} // deleted tags not supported for now
                highlightText={props.highlightText}
                redirectUrl={tagExplorerUrl}
                className="tag-name"
                onLinkClicked={_onLinkClick}
                appendAdditionalTooltip={props.isLightWeight ? VCResources.LightweightTagsInfo : null}
                />
            {props.isCompareTagBase &&
                <span className={"vc-grey-tag-badge"}>{VCResources.Compare}</span>
            }
            {props.tagComment &&
                <TooltipHost
                    content={props.tagComment}
                    overflowMode={TooltipOverflowMode.Parent}
                    directionalHint={DirectionalHint.bottomCenter}>
                    <span className="tag-comment">{props.tagComment}</span>
                </TooltipHost>
            }
        </div>);
}