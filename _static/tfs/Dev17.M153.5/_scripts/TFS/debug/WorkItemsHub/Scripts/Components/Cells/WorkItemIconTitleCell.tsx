import "VSS/LoaderPlugins/Css!WorkItemsHub/Scripts/Components/Cells/WorkItemIconTitleCell";

import * as React from "react";
import * as Tooltip from "VSSUI/Tooltip";
import * as UrlUtils from "WorkItemsHub/Scripts/Utils/UrlUtils";
import { WorkItemTypeIcon } from "Presentation/Scripts/TFS/Components/WorkItemTypeIcon";
import { Link } from "OfficeFabric/Link";
import { OnOpenWorkItemHandler } from "WorkItemsHub/Scripts/Utils/NavigationUtils";

export interface ITitleCellOptions {
    workItemId: number;
    workItemTitle: string;
    workItemType: string;
    projectName: string;
    onOpenWorkItem: OnOpenWorkItemHandler;
}

export function createWorkItemIconTitleCell(options: ITitleCellOptions): JSX.Element {
    const onTitleClick = (e: React.MouseEvent<HTMLAnchorElement>) => options.onOpenWorkItem(options.workItemId, e);

    // Important: when changing the structure and CSS for this cell, make sure to test for accessibility borders
    return (
        <div className="work-item-icon-title-cell">
            <WorkItemTypeIcon className="work-item-icon" workItemTypeName={options.workItemType} projectName={options.projectName} />
            <div className="work-item-title">
                <Link className="work-item-title-link" href={UrlUtils.getEditWorkItemUrl(options.workItemId)} onClick={onTitleClick}>
                    <Tooltip.TooltipHost content={options.workItemTitle} overflowMode={Tooltip.TooltipOverflowMode.Self} hostClassName="work-item-title-tooltiphost">
                        {options.workItemTitle}
                    </Tooltip.TooltipHost>
                </Link>
            </div>
        </div>
    );
};
