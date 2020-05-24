import { logError } from "VSS/Diag";

import { MessageBarType } from "OfficeFabric/components/MessageBar/MessageBar.types";

import { MessageHandlerActionsCreator } from "DistributedTaskControls/Actions/MessageHandlerActionsCreator";

export function handleErrorAndDisplayInMessageBar(error, messageHandlerActionCreator: MessageHandlerActionsCreator, parentKey: string): void {
    let errorMessage: string = getErrorMessage(error);
    if (errorMessage) {
        logError(errorMessage);
        messageHandlerActionCreator.addMessage(parentKey, errorMessage, MessageBarType.error);
    }
}

export function clearErrorMessage(parentKey: string, messageHandlerActionCreator: MessageHandlerActionsCreator): void {
    messageHandlerActionCreator.dismissMessage(parentKey);
}

export function getErrorMessage(error): string {
    if (!error) {
        return null;
    }

    return error.message || error;
}
