import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import * as ActionsBase from "DistributedTaskControls/Common/Actions/Base";

import { LogsTabKeys } from "PipelineWorkflow/Scripts/ReleaseProgress/Constants";
import {
    DeploymentGroupLogsTabActions,
} from "PipelineWorkflow/Scripts/ReleaseProgress/ContainerTabs/LogsTab/DeploymentGroupLogsTabActions";
import {
    ReleaseEnvironmentHelper,
} from "PipelineWorkflow/Scripts/ReleaseProgress/ReleaseEnvironment/ReleaseEnvironmentHelper";
import { ILogsFilterState } from "PipelineWorkflow/Scripts/ReleaseProgress/Types";

import * as RMContracts from "ReleaseManagement/Core/Contracts";

import { DeploymentMachine } from "TFS/DistributedTask/Contracts";

export class DeploymentGroupLogsTabActionCreator extends ActionsBase.ActionCreatorBase {

    public static getKey(): string {
        return LogsTabKeys.DeploymentGroupLogsTabActionCreator;
    }

    public initialize(instanceId?: string): void {
        this._deploymentGroupLogsTabActions = ActionsHubManager.GetActionsHub<DeploymentGroupLogsTabActions>(DeploymentGroupLogsTabActions, instanceId);
    }

    public getDeploymentMachines(deploymentGroupPhase: RMContracts.ReleaseDeployPhase, environment: RMContracts.ReleaseEnvironment): void {
        let releaseEnvironmentHelper = new ReleaseEnvironmentHelper(environment);
        let deploymentGroupMachinesPromise = releaseEnvironmentHelper.getDeploymentGroupPhaseMachines(deploymentGroupPhase.rank);
        deploymentGroupMachinesPromise.then((machines: DeploymentMachine[]) => {
            this._deploymentGroupLogsTabActions.getDeploymentMachines.invoke(machines);
        }, () => { });
    }


    public filtersChanged(filterState: ILogsFilterState) {
        this._deploymentGroupLogsTabActions.filtersChanged.invoke(filterState);
    }

    private _deploymentGroupLogsTabActions: DeploymentGroupLogsTabActions;
}