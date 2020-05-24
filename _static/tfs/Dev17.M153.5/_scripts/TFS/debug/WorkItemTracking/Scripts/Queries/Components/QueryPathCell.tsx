import "VSS/LoaderPlugins/Css!Queries/Components/QueryPathCell";

import * as React from "react";
import { TooltipHost, TooltipOverflowMode } from "VSSUI/Tooltip";
import { DirectionalHint } from "OfficeFabric/common/DirectionalHint";
import { getId as getTooltipId } from "OfficeFabric/Utilities";

export interface IQueryPathCellProps {
    path: string;
}

export const QueryPathCell: React.StatelessComponent<IQueryPathCellProps> =
    (props: IQueryPathCellProps): JSX.Element => {
        if (props && props.path) {
            const componentClassName = "query-path-cell-component";
            const tooltipId = getTooltipId(componentClassName);

            return <div className={componentClassName}>
                <TooltipHost
                    overflowMode={TooltipOverflowMode.Parent}
                    content={props.path}
                    directionalHint={DirectionalHint.bottomCenter}
                    id={tooltipId}>
                    <span key={props.path} aria-describedby={tooltipId}>{props.path}</span>
                </TooltipHost>
            </div>;
        }

        return null;
    };