import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import * as ActionsBase from "DistributedTaskControls/Common/Actions/Base";
import { ILogLine, JobSortType } from "DistributedTaskUI/Logs/Logs.Types";

import { LogsTabKeys } from "PipelineWorkflow/Scripts/ReleaseProgress/Constants";
import { IAddLogsPayload, LogsTabActions, DeploymentGroupPhaseMachines } from "PipelineWorkflow/Scripts/ReleaseProgress/ContainerTabs/LogsTab/LogsTabActions";
import { ReleaseEnvironmentHelper } from "PipelineWorkflow/Scripts/ReleaseProgress/ReleaseEnvironment/ReleaseEnvironmentHelper";

import * as RMContracts from "ReleaseManagement/Core/Contracts";

import { DeploymentMachine } from "TFS/DistributedTask/Contracts";

export class LogsTabActionsCreator extends ActionsBase.ActionCreatorBase {

    public static getKey(): string {
        return LogsTabKeys.LogsTabActionsCreator;
    }

    public initialize(instanceId?: string): void {
        this._logsTabActions = ActionsHubManager.GetActionsHub<LogsTabActions>(LogsTabActions, instanceId);
    }

    public addLogs(logs: string[], timelineRecordId: string, stepRecordId?: string): void {
        this._logsTabActions.addLogs.invoke({ logLines: logs, timelineRecordId: timelineRecordId, stepRecordId: stepRecordId } as IAddLogsPayload);
    }

    public selectLogItem(itemKey: string): void {
        this._logsTabActions.selectLogItem.invoke(itemKey);
    }

    public resetLogItemSelection(): void {
        this._logsTabActions.resetLogItemSelection.invoke({});
    }

    public onSortOrderSelected(sortOrder: JobSortType) {
        this._logsTabActions.onSortOrderSelected.invoke(sortOrder);
    }

    public getDeploymentMachines(deploymentGroupPhase: RMContracts.ReleaseDeployPhase, environment: RMContracts.ReleaseEnvironment): void {
        let releaseEnvironmentHelper = new ReleaseEnvironmentHelper(environment);
        let deploymentGroupMachinesPromise = releaseEnvironmentHelper.getDeploymentGroupPhaseMachines(deploymentGroupPhase.rank);
        deploymentGroupMachinesPromise.then((machines: DeploymentMachine[]) => {
            const deploymentGroupPhaseMachines: DeploymentGroupPhaseMachines = {
                machines: machines,
                deploymentGroupPhaseId: deploymentGroupPhase.id
            };

            this._logsTabActions.getDeploymentMachines.invoke(deploymentGroupPhaseMachines);
        }, () => { });
    }

    private _logsTabActions: LogsTabActions;
}