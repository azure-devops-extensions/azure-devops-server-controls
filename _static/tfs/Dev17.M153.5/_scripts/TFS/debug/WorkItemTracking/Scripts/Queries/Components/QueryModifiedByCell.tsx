import "VSS/LoaderPlugins/Css!Queries/Components/QueryModifiedByCell";

import * as React from "react";
import { IdentityReference } from "TFS/WorkItemTracking/Contracts";
import { TooltipHost } from "VSSUI/Tooltip";
import { DirectionalHint } from "OfficeFabric/common/DirectionalHint";
import { getId as getTooltipId } from "OfficeFabric/Utilities";
import { Component as IdentityComponent } from "Presentation/Scripts/TFS/Components/InlineIdentity";
import { WITIdentityHelpers } from "TfsCommon/Scripts/WITIdentityHelpers";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import * as Utils_Date from "VSS/Utils/Date";
import * as Resources from "WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking";

export interface IQueryModifiedByCellProps {
    modifiedBy: IdentityReference;
    modifiedDate: Date;
    tfsContext: TfsContext;
}

export const QueryModifiedByCell: React.StatelessComponent<IQueryModifiedByCellProps> =
    (props: IQueryModifiedByCellProps): JSX.Element => {
        if (props && props.modifiedBy && props.modifiedDate && props.tfsContext) {
            const componentClassName = "query-modifiedby-cell-component";
            const tooltipId = getTooltipId(componentClassName);

            const queryDateString = `${Resources.Updated} ${Utils_Date.friendly(props.modifiedDate)}`;
            const uniqueDisplayName = props.modifiedBy.name;
            const { displayName } = WITIdentityHelpers.parseUniquefiedIdentityName(uniqueDisplayName);
            const tooltipString = `${uniqueDisplayName}, ${queryDateString}`;

            // Instead of using tooltip from identity component, manage tooltip our own for the cell
            // This is because that we need to show the date as part of the tooltip as well
            return <div className={componentClassName}>
                <TooltipHost
                    content={tooltipString}
                    directionalHint={DirectionalHint.bottomCenter}
                    id={tooltipId}
                    hostClassName={"query-modifiedby-cell-tooltip-host"}>
                    <span aria-describedby={tooltipId}>
                        <IdentityComponent
                            id={props.modifiedBy.id}
                            displayName={displayName}
                            tfsContext={props.tfsContext}
                            supressTooltip={true}
                        />
                    </span>
                    <span aria-describedby={tooltipId}>{queryDateString}</span>
                </TooltipHost>
            </div>;
        }

        return null;
    };