// Copyright (c) Microsoft Corporation.  All rights reserved.

import { TaskListActions as GateListActions } from "DistributedTaskControls/Actions/TaskListActions";
import { ActionCreatorBase } from "DistributedTaskControls/Common/Actions/Base";
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { INewable } from "DistributedTaskControls/Common/Factory";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { DtcUtils } from "DistributedTaskControls/Common/Utilities";
import { TaskDefinitionSource } from "DistributedTaskControls/Sources/TaskDefinitionSource";
import { IDuration } from "DistributedTaskControls/SharedControls/InputControls/Components/DurationInputComponent";

import { IPayloadUpdateGates } from "PipelineWorkflow/Scripts/Editor/Environment/Types";
import { GatesActionsHub } from "PipelineWorkflow/Scripts/Editor/Environment/GatesActionsHub";
import { GatesStore } from "PipelineWorkflow/Scripts/Editor/Environment/GatesStore";

import { ApprovalExecutionOrder as PipelineApprovalExecutionOrder } from "ReleaseManagement/Core/Contracts";

import { TaskDefinition as GateDefinition } from "TFS/DistributedTask/Contracts";
import * as TaskTypes from "DistributedTasksCommon/TFS.Tasks.Types";

import * as Utils_Array from "VSS/Utils/Array";
import * as Utils_String from "VSS/Utils/String";

export abstract class GatesActionCreator extends ActionCreatorBase {
    protected actionsHub: GatesActionsHub;

    protected initializeActions(
        storeClass: INewable<GatesStore, {}>,
        actionsClass: INewable<GatesActionsHub, {}>,
        instanceId: string): void {
        this.actionsHub = ActionsHubManager.GetActionsHub(actionsClass, instanceId);
        const gateListInstanceId: string = StoreManager.GetStore(storeClass, instanceId).gateListInstanceId;
        this._gateListActionsHub = ActionsHubManager.GetActionsHub<GateListActions>(GateListActions, gateListInstanceId);
    }

    public updateEnvironmentGatesState(enableGates: boolean): void {
        this.actionsHub.updateGatesState.invoke(enableGates);
    }

    public updateGatesStabilizationTime(newTime: IDuration): void {
        this.actionsHub.updateStabilizationTime.invoke(newTime);
    }

    public updateGateListTimeout(newTime: IDuration): void {
        this.actionsHub.updateTimeout.invoke(newTime);
    }

    public updateGateListSamplingInterval(newTime: IDuration): void {
        this.actionsHub.updateSamplingInterval.invoke(newTime);
    }

    public updateGateListMinimumSuccessDuration(newTime: IDuration): void {
        this.actionsHub.updateMinimumSuccessDuration.invoke(newTime);
    }

    public updateApprovalExecutionOrder(approvalExecutionOrder: PipelineApprovalExecutionOrder): void {
        this.actionsHub.updateApprovalExecutionOrder.invoke(approvalExecutionOrder);
    }

    public updateGatesData(updatedData: IPayloadUpdateGates): void {
        this.actionsHub.updateGatesData.invoke(updatedData);
        this._gateListActionsHub.updateTasks.invoke({ tasks: GatesStore.getGateListTasks(updatedData.gatesStep), forceUpdate: false });
    }

    public updateGateDefinitions(): void {
        TaskDefinitionSource.instance().getTaskDefinitionList()
            .then((definitions: GateDefinition[]) => {
                let gateDefinitions: GateDefinition[] = (definitions || []).filter((definition: GateDefinition) => {
                    return GatesActionCreator.canTaskRunOnServerGate(definition.runsOn);
                });

                if (gateDefinitions && gateDefinitions.length > 0) {
                    gateDefinitions.sort((a: GateDefinition, b: GateDefinition) => {
                        return Utils_String.localeIgnoreCaseComparer(a.friendlyName, b.friendlyName);
                    });

                    this.actionsHub.updateGateDefinitions.invoke(gateDefinitions);
                }
            });
    }

    private static canTaskRunOnServerGate(taskRunsOn: string[]): boolean {
        return !!taskRunsOn && Utils_Array.contains<string>(taskRunsOn, TaskTypes.TaskRunsOnConstants.RunsOnServerGate, Utils_String.localeIgnoreCaseComparer);
    }

    private _gateListActionsHub: GateListActions;
}