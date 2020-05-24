import { ActionCreatorBase, ActionsHubBase, Action } from "DistributedTaskControls/Common/Actions/Base";
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { GatesPhaseActionsHub } from "PipelineWorkflow/Scripts/Editor/Environment/GatesPhaseActionsHub";
import { IDuration } from "DistributedTaskControls/SharedControls/InputControls/Components/DurationInputComponent";

export class GatesPhaseActionsCreator extends ActionCreatorBase {
    public static getKey(): string {
        return "GatesPhaseActionsCreator";
    }

    public initialize(instanceId?: string): void {
        this.actionsHub = ActionsHubManager.GetActionsHub<GatesPhaseActionsHub>(GatesPhaseActionsHub, instanceId);
    }

    public updateStabilizationTime(newTime: IDuration): void {
        this.actionsHub.updateStabilizationTime.invoke(newTime);
    }

    public updateTimeout(newTime: IDuration): void {
        this.actionsHub.updateTimeout.invoke(newTime);
    }

    public updateSamplingInterval(newTime: IDuration): void {
        this.actionsHub.updateSamplingInterval.invoke(newTime);
    }

    public updateMinimumSuccessDuration(newTime: IDuration): void {
        this.actionsHub.updateMinimumSuccessDuration.invoke(newTime);
    }

    private actionsHub: GatesPhaseActionsHub;
}