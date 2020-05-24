
import { ActionCreatorBase } from "DistributedTaskControls/Common/Actions/Base";
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { ActionCreatorKeys } from "DistributedTaskControls/Common/Common";
import { AgentsSource } from "DistributedTaskControls/Sources/AgentsSource";
import { DeploymentGroupsActions } from "DistributedTaskControls/Actions/DeploymentGroupsActions";
import { DeployPhaseActionsHub } from "DistributedTaskControls/Phase/Actions/DeployPhaseActions";
import * as DistributedTaskContract from "TFS/DistributedTask/Contracts";
import { DtcUtils } from "DistributedTaskControls/Common/Utilities";
import { IDeploymentGroupsResult } from "DistributedTaskControls/Common/Types";
import { MachinesActions } from "DistributedTaskControls/Actions/MachinesActions";
import * as Utils_Array from "VSS/Utils/Array";
import * as Utils_String from "VSS/Utils/String";

export class DeploymentGroupsActionsCreator extends ActionCreatorBase {

    public static getKey(): string {
        return ActionCreatorKeys.DeploymentGroupsActionsCreator;
    }

    public initialize(instanceId?: string) {
        this._actions = ActionsHubManager.GetActionsHub<DeploymentGroupsActions>(DeploymentGroupsActions);
        this._deployPhaseActionsHub = ActionsHubManager.GetActionsHub<DeployPhaseActionsHub>(DeployPhaseActionsHub, instanceId);
        this._machineActions = ActionsHubManager.GetActionsHub<MachinesActions>(MachinesActions, instanceId);
    }

    public refreshDeploymentGroups(): void {
        this._getAllDeploymentGroups(null, true);
    }

    public manageDeploymentGroups(deploymentGroupId: number): void {
        this._actions.manageDeploymentGroups.invoke(deploymentGroupId);
    }

    public addDeploymentGroups(deploymentGroupName: string) {
        AgentsSource.instance().getDeploymentGroupsByNameOrRegex(true, deploymentGroupName).then(
            (deploymentGroupsResult: IDeploymentGroupsResult) => {
		    const deploymentGroups: DistributedTaskContract.DeploymentGroup[] = deploymentGroupsResult.deploymentGroups;
            this._actions.addDeploymentGroups.invoke(deploymentGroups);
            const deploymentGroup = this._getDeploymentGroupByName(deploymentGroupName, deploymentGroups);
            this._deployPhaseActionsHub.updateDeploymentMachineGroup.invoke(deploymentGroup ? deploymentGroup.id : null);
            this._updateMachinesActions(deploymentGroup);
        }, (error) => {
                this._sendErrorActions();
            }
        );
    }

    private _updateMachinesActions(deploymentGroup: DistributedTaskContract.DeploymentGroup, continuationToken?: string, deploymentMachines?: DistributedTaskContract.DeploymentMachine[]) {
        if (deploymentGroup) {
            AgentsSource.instance().getTargets(deploymentGroup.id).then((deploymentMachines: DistributedTaskContract.DeploymentMachine[]) => {
				this._machineActions.updateMachines.invoke({ deploymentGroupId: deploymentGroup.id, deploymentMachines: deploymentMachines });
            }, (error) => {
                this._sendErrorActions();
            });
        } else {
            this._machineActions.changeMachineGroup.invoke(null);
        }
    }

    private _sendErrorActions(): void {
        this._deployPhaseActionsHub.updateDeploymentMachineGroup.invoke(null);
        this._machineActions.changeMachineGroup.invoke(null);
    }

    private _getDeploymentGroupByName(name: string, deploymentMachineGroups: DistributedTaskContract.DeploymentGroup[]): DistributedTaskContract.DeploymentGroup {
		let selectedDeploymentGroup: DistributedTaskContract.DeploymentGroup = Utils_Array.first(
            deploymentMachineGroups,
            (deploymentMachineGroup: DistributedTaskContract.DeploymentGroup) => {
                return (Utils_String.ignoreCaseComparer(name, deploymentMachineGroup.name) === 0);
            }
        );
        return selectedDeploymentGroup;
    }

    private _getAllDeploymentGroups(continuationToken?: string, isFirstBatch?: boolean) {
        AgentsSource.instance().getPermissibleDeploymentGroups(true, null, DistributedTaskContract.DeploymentGroupExpands.None, continuationToken).then(
            (deploymentGroupsResult: IDeploymentGroupsResult) => {
                this._actions.refreshDeploymentGroups.invoke({
                    permissibleDeploymentGroups: deploymentGroupsResult.deploymentGroups,
                    isFirstBatch: isFirstBatch
                });
                if (deploymentGroupsResult.continuationToken) {
                    this._getAllDeploymentGroups(deploymentGroupsResult.continuationToken, false);
                }
            }, (error) => {
                this._sendErrorActions();
            });
    }

    private _actions: DeploymentGroupsActions;
    private _deployPhaseActionsHub: DeployPhaseActionsHub;
    private _machineActions: MachinesActions;
}