import * as ActionsBase from "DistributedTaskControls/Common/Actions/Base";
import { ITaskInputValue, ITaskInputOptions } from "DistributedTaskControls/Common/Types";
import { TaskActionsCreatorBase } from "DistributedTaskControls/Components/Task/TaskActionsCreatorBase";

import { Action } from "VSS/Flux/Action";

export interface IWIFieldKeyPayload {
    index: number;
    key: string;
}

export interface IWIFieldValuePayload {
    index: number;
    value: string;
}

export class BuildOptionActionsCreator extends TaskActionsCreatorBase {
    public updateInputAction: Action<ITaskInputValue>;
    public updateInputOptionsAction: Action<ITaskInputOptions>;
    public updateWIFieldKeyAction: Action<IWIFieldKeyPayload>;
    public updateWIFieldValueAction: Action<IWIFieldValuePayload>;
    public deleteWIFieldAction: Action<IWIFieldKeyPayload>;
    public addWIFieldAction: Action<ActionsBase.IEmptyActionPayload>;

    public initialize() {
        this.updateInputAction = new Action<ITaskInputValue>();
        this.updateInputOptionsAction = new Action<ITaskInputOptions>();
        this.updateWIFieldKeyAction = new Action<IWIFieldKeyPayload>();
        this.updateWIFieldValueAction = new Action<IWIFieldValuePayload>();
        this.deleteWIFieldAction = new Action<IWIFieldKeyPayload>();
        this.addWIFieldAction = new Action<ActionsBase.IEmptyActionPayload>();
    }

    public updateTaskInputValue(name: string, value: string): void {
        this.updateInputAction.invoke({ name: name, value: value } as ITaskInputValue);
    }

    public updateTaskInputOptions(name: string, options: IDictionaryStringTo<string>) {
        this.updateInputOptionsAction.invoke({ name: name, options: options });
    }

    public updateWIFieldValue(index: number, value: string) {
        return this.updateWIFieldValueAction.invoke({
            index: index,
            value: value
        } as IWIFieldValuePayload);
    }

    public updateWIFieldKey(index: number, key: string) {
        return this.updateWIFieldKeyAction.invoke({
            index: index,
            key: key
        } as IWIFieldKeyPayload);
    }

    public deleteWIField(index: number, key: string) {
        return this.deleteWIFieldAction.invoke({
            index: index,
            key: key
        });
    }

    public addWIField(): void {
        return this.addWIFieldAction.invoke({} as ActionsBase.IEmptyActionPayload);
    }
}
