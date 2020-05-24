/// <reference types="react" />

import * as React from 'react';
import * as Tooltip from 'VSSUI/Tooltip';
import ProcessContracts = require("TFS/WorkItemTracking/ProcessContracts");
import { WorkItemStateCellRenderer, IProcessedStateColor } from "Presentation/Scripts/TFS/FeatureRef/WorkItemStateCellRenderer";

export const StateTitle: React.StatelessComponent<ProcessContracts.WorkItemStateResultModel> = (state: ProcessContracts.WorkItemStateResultModel): JSX.Element => {
    let colorObj: IProcessedStateColor = WorkItemStateCellRenderer.getProcessedStateColor("#" + state.color);
    let style: React.CSSProperties = {
        backgroundColor: colorObj.backgroundColor,
        borderColor: colorObj.borderColor,
        marginTop: "11px"
    }
    return <div className="workitem-state-text">
        <Tooltip.TooltipHost content={state.name} overflowMode={Tooltip.TooltipOverflowMode.Parent}>
            <span className={"workitem-state-circle"} style={style}></span>
            <span>{state.name}</span>
        </Tooltip.TooltipHost>
    </div>;
}

export const StateOption: React.StatelessComponent<ProcessContracts.WorkItemStateResultModel> = (state: ProcessContracts.WorkItemStateResultModel): JSX.Element => {
    let colorObj: IProcessedStateColor = WorkItemStateCellRenderer.getProcessedStateColor("#" + state.color);
    let style: React.CSSProperties = {
        backgroundColor: colorObj.backgroundColor,
        borderColor: colorObj.borderColor,
        marginTop: "7px"
    }
    // TODO: after office fabric issue https://github.com/OfficeDev/office-ui-fabric-react/issues/2150 has been closed add the tooltip here as well
    return <div className="workitem-state-text">
        <span className={"workitem-state-circle"} style={style}></span>
        <span>{state.name}</span>
    </div>;
}