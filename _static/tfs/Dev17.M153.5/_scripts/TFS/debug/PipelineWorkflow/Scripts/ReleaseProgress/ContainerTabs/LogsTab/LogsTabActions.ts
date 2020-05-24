import * as ActionBase from "DistributedTaskControls/Common/Actions/Base";

import { LogsTabKeys } from "PipelineWorkflow/Scripts/ReleaseProgress/Constants";
import { JobSortType } from "DistributedTaskUI/Logs/Logs.Types";
import { DeploymentMachine } from "TFS/DistributedTask/Contracts";

export interface IAddLogsPayload extends ActionBase.IActionPayload {
    logLines: string[];
    timelineRecordId: string;
    stepRecordId?: string;
}

export class DeploymentGroupPhaseMachines {
    machines: DeploymentMachine[];
    deploymentGroupPhaseId: number;
}

export class LogsTabActions extends ActionBase.ActionsHubBase {

    public static getKey(): string {
        return LogsTabKeys.LogsTabActions;
    }

    public initialize(): void {
        this._addLogs = new ActionBase.Action<IAddLogsPayload>();
        this._selectLogItem = new ActionBase.Action<string>();
        this._resetLogItemSelection = new ActionBase.Action<ActionBase.IEmptyActionPayload>();
        this._onSortOrderSelected = new ActionBase.Action<JobSortType>();
        this._getDeploymentMachines = new ActionBase.Action<DeploymentGroupPhaseMachines>();
    }

    public get addLogs(): ActionBase.Action<IAddLogsPayload> {
        return this._addLogs;
    }

    public get selectLogItem(): ActionBase.Action<string> {
        return this._selectLogItem;
    }

    public get resetLogItemSelection(): ActionBase.Action<ActionBase.IEmptyActionPayload> {
        return this._resetLogItemSelection;
    }

    public get onSortOrderSelected(): ActionBase.Action<JobSortType> {
        return this._onSortOrderSelected;
    }

    public get getDeploymentMachines(): ActionBase.Action<DeploymentGroupPhaseMachines> {
        return this._getDeploymentMachines;
    }

    private _addLogs: ActionBase.Action<IAddLogsPayload>;
    private _selectLogItem: ActionBase.Action<string>;
    private _resetLogItemSelection: ActionBase.Action<ActionBase.IEmptyActionPayload>;
    private _onSortOrderSelected: ActionBase.Action<JobSortType>;
    private _getDeploymentMachines: ActionBase.Action<DeploymentGroupPhaseMachines>;
}