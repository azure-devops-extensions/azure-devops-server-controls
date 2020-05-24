import * as React from "react";
import * as Tooltip from "OfficeFabric/Tooltip";
import "VSS/LoaderPlugins/Css!WorkItemsHub/Scripts/Components/Cells/WorkItemCommentCountCell";

import * as WITResources from "WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking";
import * as Utils_String from "VSS/Utils/String";


export interface ICommentCountCellOptions {
    workItemCommentCount : string
}

const MAX_COUNT = 99;
const TRUNC_COUNT = Utils_String.format(WITResources.WorkItemsHubTruncatedCommentCount, MAX_COUNT);

export function createWorkItemCommentCountCell(options : ICommentCountCellOptions): JSX.Element {
    var count = Number(options.workItemCommentCount) > MAX_COUNT ? TRUNC_COUNT : options.workItemCommentCount;

    return (
        <Tooltip.TooltipHost hostClassName="work-item-comment-count-cell" content={count} overflowMode={Tooltip.TooltipOverflowMode.Self}>
            <span className="bowtie-icon bowtie-comment-discussion work-item-comment-count-icon" />
            <span>{count}</span>
        </Tooltip.TooltipHost>
    );
}