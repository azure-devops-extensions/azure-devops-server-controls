import { ActionCreatorBase } from "DistributedTaskControls/Common/Actions/Base";
import { ActionsBase, IVariableKeyPayload, IVariableValuePayload } from "DistributedTaskControls/Variables/Common/Actions/ActionsBase";
import { IEmptyActionPayload } from "DistributedTaskControls/Common/Actions/Base";
import { Telemetry, Feature, Properties } from "DistributedTaskControls/Common/Telemetry";

export abstract class VariablesActionCreatorBase extends ActionCreatorBase {

    public updateVariableKey(variableKeyPayload: IVariableKeyPayload): void {
        this.getActionsHub().updateVariableKey.invoke(variableKeyPayload);
    }

    public updateVariableValue(variableValuePayload: IVariableValuePayload): void {
        this.getActionsHub().updateVariableValue.invoke(variableValuePayload);
        this._publishTelemetry();
    }

    public deleteVariable(variableKeyPayload: IVariableKeyPayload): void {
        this.getActionsHub().deleteVariable.invoke(variableKeyPayload);
    }

    public addVariable(emptyActionPayload: IEmptyActionPayload): void {
        this.getActionsHub().addVariable.invoke(emptyActionPayload);
    }

    private _publishTelemetry() {
        let eventProperties: IDictionaryStringTo<any> = {};
        eventProperties[Properties.editVariableInListView] = true;
        Telemetry.instance().publishEvent(Feature.Variables, eventProperties);
    }

    protected abstract getActionsHub(): ActionsBase;
}
