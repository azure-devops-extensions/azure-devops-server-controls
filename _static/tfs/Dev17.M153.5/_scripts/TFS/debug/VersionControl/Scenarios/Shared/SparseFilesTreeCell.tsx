import { css } from "OfficeFabric/Utilities";
import * as React from "react";
import { format, ignoreCaseComparer } from "VSS/Utils/String";

import { ControlledTooltipHost } from "Presentation/Scripts/TFS/Components/Tree/ControlledTooltipHost";
import { TreeCell, TreeCellProps } from "Presentation/Scripts/TFS/Components/Tree/TreeCell";
import { ChangeType } from "VersionControl/Scripts/TFS.VersionControl";
import { VersionControlChangeType } from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";
import { 
    PullRequest_ChangeExplorer_DiscussionThread_NewDecoratorLabel, 
    PullRequest_ChangeExplorer_DiscussionThread_ReplyDecoratorPluralLabel, 
    PullRequest_ChangeExplorer_DiscussionThread_ReplyDecoratorSingularLabel 
} from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";

import "VSS/LoaderPlugins/Css!VersionControl/SparseFilesTreeCell";

export interface SparseFilesTreeCellProps extends TreeCellProps {
    changeType?: VersionControlChangeType;
    hasUnseenContent?: boolean;
    numReplies?: number;
}

export const SparseFilesTreeCell = (props: SparseFilesTreeCellProps): JSX.Element => {
    const nameDecorators = [
        Boolean(props.changeType) && Boolean(ChangeType.getDecorationText(props.changeType, false)) && <ChangeTypeDecorator {...props} key="change-type" />,
    ];

    const floatDecorators = [
        <SpacerDecorator key="spacer" />,
        Boolean(props.hasUnseenContent) && <UnseenContentDecorator key="new-marker" />,
        Boolean(props.numReplies) && <ReplyCountDecorator key="reply-count" numReplies={props.numReplies} />,
    ];

    return (
        <span className="vc-sparse-files-tree-cell">
            <TreeCell
                {...props}
                decorators={nameDecorators}
                isDelete={props.changeType && ChangeType.hasChangeFlag(props.changeType, VersionControlChangeType.Delete)} />
            {floatDecorators}
        </span>);
}

/**
 * Expands to put space between any two decorators.
 */
const SpacerDecorator = (): JSX.Element =>
    <span
        className="decorator spacer"
        aria-hidden="true">
    </span>;

/**
 * Shows change type of the tree item.
 */
const ChangeTypeDecorator = (props: SparseFilesTreeCellProps): JSX.Element =>
    <span
        className="decorator change-type"
        aria-hidden="true">
        {"[" + ChangeType.getDecorationText(props.changeType, true) + "]"}
    </span>;

/**
 * Shows the number of replies next to the discussion tree item.
 */
const ReplyCountDecorator = (props: { numReplies?: number }): JSX.Element => {
    const repliesDecoratorTitleTemplate = props.numReplies > 1
        ? PullRequest_ChangeExplorer_DiscussionThread_ReplyDecoratorPluralLabel
        : PullRequest_ChangeExplorer_DiscussionThread_ReplyDecoratorSingularLabel;

    const title = format(repliesDecoratorTitleTemplate, props.numReplies);

    return <ControlledTooltipHost
        className="decorator reply-count"
        content={title}
        aria-label={title}>
        <span className="bowtie-icon bowtie-comment-discussion" />
        {props.numReplies}
    </ControlledTooltipHost>;
}

/**
 * Shows the new dot next to discussion tree items that have new content since the last visit.
 */
const UnseenContentDecorator = (): JSX.Element => {
    const title = PullRequest_ChangeExplorer_DiscussionThread_NewDecoratorLabel;

    return <ControlledTooltipHost
        className="decorator new-marker"
        content={title}
        aria-label={title}>
        <span className="bowtie-icon bowtie-dot" />
    </ControlledTooltipHost>;
}
