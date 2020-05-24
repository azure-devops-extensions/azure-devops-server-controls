/// <reference types="react" />

import * as React from "react";

import * as Utils_String from "VSS/Utils/String";

import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import { GitTag } from "VersionControl/Scenarios/History/GitHistory/GitCommitExtendedContracts";
import { LinkWithTooltip } from "VersionControl/Scenarios/Shared/LinkWithTooltip";
import { TagsList } from "VersionControl/Scenarios/Shared/TagsList";
import * as VCCommentParser from "VersionControl/Scripts/CommentParser";
import { CustomerIntelligenceData } from "VersionControl/Scripts/CustomerIntelligenceData";
import { GitRepositoryContext } from "VersionControl/Scripts/GitRepositoryContext";

import "VSS/LoaderPlugins/Css!VersionControl/GitShortCommentWithTags";

const c_maxTagCount = 3;

export interface GitShortCommentWithTagsProps extends React.Props<void> {
    repositoryContext: GitRepositoryContext;
    fullComment: string;
    isCommentTruncated?: boolean;
    // data for displaying tag list, if avaialable
    tagsList?: GitTag[];
    serverItemPath?: string;
    // link/onclick behavior for selectionhandler
    onClickedHref?: string;
    onItemClicked?(e: React.MouseEvent<HTMLAnchorElement>, ci: CustomerIntelligenceData): void;
    customerIntelligenceData?: CustomerIntelligenceData;
}

export const GitShortCommentWithTags = (props: GitShortCommentWithTagsProps): JSX.Element =>
    <div className="vc-history-message-container">
        <div className="comment-section">
            <div className="ellipsis-text">
                <LinkWithTooltip
                    href={props.onClickedHref}
                    tooltipContent={getFormattedTooltip(props.fullComment, props.isCommentTruncated)}
                    className="inline text-dark change-link ms-Link"
                    onClick={(e: React.MouseEvent<HTMLAnchorElement>) => props.onItemClicked && props.onItemClicked(e, props.customerIntelligenceData)}>
                        {VCCommentParser.Parser.getFirstLine(getFormattedComment(props.fullComment, props.isCommentTruncated))}
                </LinkWithTooltip>
            </div>
        </div>
        <div>
            { props.tagsList && props.tagsList.length &&
                <TagsList
                    tags={props.tagsList}
                    itemPath={props.serverItemPath}
                    repositoryContext={props.repositoryContext}
                    maxTagCount={c_maxTagCount}
                    className="tags-section" />
            }
        </div>
    </div>;

function getFormattedTooltip(fullComment: string, isCommentTruncated: boolean): string {
    let formatTooltip: string = fullComment;
    if (isCommentTruncated) {
        formatTooltip = Utils_String.format("{0}...{1}", fullComment, VCResources.GitShortCommentWithTags_ClickToSeeMoreMessage);
    }

    return formatTooltip;
}

function getFormattedComment(fullComment: string, isCommentTruncated: boolean): string {
    let formatComment: string = fullComment;
    if (isCommentTruncated) {
        formatComment = Utils_String.format("{0}...", fullComment);
    }

    return formatComment;
}