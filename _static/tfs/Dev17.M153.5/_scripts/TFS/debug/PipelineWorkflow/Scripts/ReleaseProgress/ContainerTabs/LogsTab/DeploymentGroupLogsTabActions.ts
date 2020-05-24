import * as ActionBase from "DistributedTaskControls/Common/Actions/Base";

import { LogsTabKeys } from "PipelineWorkflow/Scripts/ReleaseProgress/Constants";
import { ILogsFilterState } from "PipelineWorkflow/Scripts/ReleaseProgress/Types";

import { DeploymentMachine } from "TFS/DistributedTask/Contracts";


export class DeploymentGroupLogsTabActions extends ActionBase.ActionsHubBase {

    public static getKey(): string {
        return LogsTabKeys.DeploymentGroupLogsTabActions;
    }

    public initialize(): void {
        this._getDeploymentMachines = new ActionBase.Action<DeploymentMachine[]>();
        this._filtersChanged = new ActionBase.Action<ILogsFilterState>();
    }

    public get getDeploymentMachines(): ActionBase.Action<DeploymentMachine[]> {
        return this._getDeploymentMachines;
    }

    public get filtersChanged(): ActionBase.Action<ILogsFilterState> {
        return this._filtersChanged;
    }

    private _getDeploymentMachines: ActionBase.Action<DeploymentMachine[]>;
    private _filtersChanged: ActionBase.Action<ILogsFilterState>;
}