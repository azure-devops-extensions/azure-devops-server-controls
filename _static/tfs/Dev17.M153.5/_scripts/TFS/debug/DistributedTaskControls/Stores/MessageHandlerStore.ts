
import * as Store from "DistributedTaskControls/Common/Stores/Base";
import { StoreKeys } from "DistributedTaskControls/Common/Common";
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import * as Actions from "DistributedTaskControls/Actions/MessageHandlerActions";
import { IErrorState } from "DistributedTaskControls/Common/Types";
import { MessageBarComponentUtils } from "DistributedTaskControls/Utilities/MessageBarComponentUtils";

import { MessageBarType } from "OfficeFabric/MessageBar";

export class MessageHandlerStore extends Store.StoreBase {

    constructor() {
        super();
        this._messages = {};
        this._type = {};
    }

    public initialize(): void {
        this._messageHandlerActions = ActionsHubManager.GetActionsHub<Actions.MessageHandlerActions>(Actions.MessageHandlerActions);
        this._messageHandlerActions.addMessage.addListener(this._handleAddMessage);
        this._messageHandlerActions.dismissMessage.addListener(this._handleDismissMessage);
    }

    public static getKey(): string {
        return StoreKeys.MessageHandlerStore;
    }

    public getMessage(parentKey: string): string | JSX.Element {
        return this._messages[parentKey];
    }

    public getType(parentKey: string): MessageBarType {
        return this._type[parentKey];
    }

    protected disposeInternal(): void {
        this._messageHandlerActions.addMessage.removeListener(this._handleAddMessage);
        this._messageHandlerActions.dismissMessage.removeListener(this._handleDismissMessage);
    }

    private _handleAddMessage = (message: Actions.IAddMessagePayload) => {
        this._messages[message.parentKey] = MessageBarComponentUtils.getErrorMessage(message.statusCode) || message.message;
        this._type[message.parentKey] = message.type || MessageBarType.error;
        this.emitChanged();
    }

    private _handleDismissMessage = (parentKey: string) => {
        delete this._messages[parentKey];
        this.emitChanged();
    }

    private _type: IDictionaryStringTo<MessageBarType>;
    private _messages: IDictionaryStringTo<string | JSX.Element>;
    private _messageHandlerActions: Actions.MessageHandlerActions;
}
