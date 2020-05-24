import { ActionCreatorBase } from "DistributedTaskControls/Common/Actions/Base";
import { IVariableValuePayload } from "DistributedTaskControls/Variables/Common/Actions/ActionsBase";
import { ProcessVariablesActions } from "DistributedTaskControls/Variables/ProcessVariables/Actions/Actions";
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { VariableActionCreatorKeys } from "DistributedTaskControls/Variables/Common/Constants";
import { VariablesGridActions } from "DistributedTaskControls/Variables/ProcessVariableGridView/VariablesGridActions";
import { Telemetry, Feature, Properties } from "DistributedTaskControls/Common/Telemetry";

export class VariablesGridActionsCreator extends ActionCreatorBase {

    public static getKey(): string {
        return VariableActionCreatorKeys.VariablesGrid_ActionCreator;
    }

    public initialize(instanceId?: string) {
        this._processVariablesActionsHub = ActionsHubManager.GetActionsHub<ProcessVariablesActions>(ProcessVariablesActions, instanceId);
        this._variablesGridActionsHub = ActionsHubManager.GetActionsHub<VariablesGridActions>(VariablesGridActions, instanceId);
    }

    public updateVariableValue(variableValuePayload: IVariableValuePayload): void {
        this._variablesGridActionsHub.setEditVariableInProgessDataIndex.invoke(variableValuePayload.index);
        this._processVariablesActionsHub.updateVariableValue.invoke(variableValuePayload);
        this._variablesGridActionsHub.unsetEditVariableInProgessDataIndex.invoke({});

        this._publishTelemetry();
    }

    private _publishTelemetry() {
        let eventProperties: IDictionaryStringTo<any> = {};
        eventProperties[Properties.editVariableInGridView] = true;
        Telemetry.instance().publishEvent(Feature.Variables, eventProperties);
    }

    private _processVariablesActionsHub: ProcessVariablesActions;
    private _variablesGridActionsHub: VariablesGridActions;
}
