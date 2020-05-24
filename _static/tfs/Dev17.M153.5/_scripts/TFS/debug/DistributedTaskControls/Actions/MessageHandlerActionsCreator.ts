
import { ActionCreatorKeys } from "DistributedTaskControls/Common/Common";
import { ActionCreatorBase } from "DistributedTaskControls/Common/Actions/Base";
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import * as Actions from "DistributedTaskControls/Actions/MessageHandlerActions";

import { MessageBarType } from "OfficeFabric/MessageBar";

export class MessageHandlerActionsCreator extends ActionCreatorBase {

    constructor() {
        super();
    }

    public static getKey(): string {
        return ActionCreatorKeys.MessageHandlerActionsCreator;
    }

    public initialize() {
        this._actions = ActionsHubManager.GetActionsHub<Actions.MessageHandlerActions>(Actions.MessageHandlerActions);
    }

    public addMessage(parentKey: string, message: string | JSX.Element, type?: MessageBarType, statusCode?: number): void {
        this._actions.addMessage.invoke({ parentKey: parentKey, message: message, type: type, statusCode: statusCode } as Actions.IAddMessagePayload);
    }

    public dismissMessage(parentKey: string): void {
        this._actions.dismissMessage.invoke(parentKey);
    }

    private _actions: Actions.MessageHandlerActions;
}