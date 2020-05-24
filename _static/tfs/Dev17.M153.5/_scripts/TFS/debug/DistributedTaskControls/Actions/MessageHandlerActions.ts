
import { Action } from "VSS/Flux/Action";
import { ActionsHubBase } from "DistributedTaskControls/Common/Actions/Base";
import { ActionsKeys } from "DistributedTaskControls/Common/Common";

import { MessageBarType } from "OfficeFabric/MessageBar";

export interface IAddMessagePayload {
    parentKey: string;
    message: string | JSX.Element;
    type?: MessageBarType;
    statusCode?: number;
}

export class MessageHandlerActions extends ActionsHubBase {

    public initialize(): void {
        this._addMessage = new Action<IAddMessagePayload>();
        this._dismissMessage = new Action<string>();
    }

    public static getKey(): string {
        return ActionsKeys.MessageHandlerActions;
    }

    public get addMessage(): Action<IAddMessagePayload> {
        return this._addMessage;
    }

    public get dismissMessage(): Action<string> {
        return this._dismissMessage;
    }

    private _addMessage: Action<IAddMessagePayload>;
    private _dismissMessage: Action<string>;
}