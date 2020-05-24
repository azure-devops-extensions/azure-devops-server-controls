import * as Tooltip from "VSSUI/Tooltip";
import * as React from "react";

export interface ISimpleCellOptions {
    text: string;
}

export function createWorkItemSimpleCell(options: ISimpleCellOptions): JSX.Element {
    return (
        <Tooltip.TooltipHost hostClassName="work-item-simple-cell" content={options.text} overflowMode={Tooltip.TooltipOverflowMode.Self}>
            <span>{options.text}</span>
        </Tooltip.TooltipHost>
    );
}
