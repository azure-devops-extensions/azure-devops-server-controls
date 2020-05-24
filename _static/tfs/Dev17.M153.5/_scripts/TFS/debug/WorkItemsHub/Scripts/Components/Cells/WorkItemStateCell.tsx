import "VSS/LoaderPlugins/Css!WorkItemsHub/Scripts/Components/Cells/WorkItemStateCell";

import * as Tooltip from "VSSUI/Tooltip";
import {
    IProcessedStateColor,
    WorkItemStateCellRenderer,
} from "Presentation/Scripts/TFS/FeatureRef/WorkItemStateCellRenderer";
import * as React from "react";

export interface IStateCellOptions {
    workItemStateName: string;
    workItemStateColor: string;
}

export function createWorkItemStateCell(options: IStateCellOptions): JSX.Element {
    const colorObj: IProcessedStateColor = WorkItemStateCellRenderer.getProcessedStateColor(options.workItemStateColor);

    return (
        <Tooltip.TooltipHost hostClassName="work-item-state-cell" content={options.workItemStateName} overflowMode={Tooltip.TooltipOverflowMode.Self}>
            <span className="work-item-state-circle" style={{ backgroundColor: colorObj.backgroundColor, borderColor: colorObj.borderColor }} />
            <span>{options.workItemStateName}</span>
        </Tooltip.TooltipHost>
    );
}
