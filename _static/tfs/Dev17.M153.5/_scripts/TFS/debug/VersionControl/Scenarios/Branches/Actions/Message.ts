import * as BranchActions from "VersionControl/Scenarios/Branches/Actions/BranchesActions";
import { IMessage, MessageLevel } from "VersionControl/Scenarios/Shared/MessageArea";
import * as BranchResources from "VersionControl/Scripts/Resources/TFS.Resources.Branches";

// Place holder for explicit messages
export const FILTER_MESSAGE_NUM: number = -10;
export const BRANCH_MESSAGE_NUM: number = -9;
export const LOADING_BRANCHES_MESSAGE_NUM: number = -8;
export const NO_BRANCHES_MESSAGE_NUM: number = -7;

export module Creators {

    /**
     * Dismiss a message.
     * @param key
     */
    export function dismissMessage(key: number) {
        BranchActions.DismissMessage.invoke({ key: key } as IMessage);
    }

    /**
    * Dismiss the no branches message.
    */
    export function dismissNoBranchesMessage(messsage: string) {
        BranchActions.DismissMessage.invoke({ key: NO_BRANCHES_MESSAGE_NUM, text: messsage } as IMessage);
    }

    /**
    * Show the no branches message
    */
    export function showNoBranchesMessage(message: string) {
        showInfoNoAction(message, null, NO_BRANCHES_MESSAGE_NUM);
    }

    /**
     * Reserve a message key. Useful for explicitly managing message lifetimes.
     */
    let _currentMessageId = 0;
    export function reserveMessageKey(): number {
        return _currentMessageId++;
    }

    /**
     * Show a info message.
     */
    export function showInfo(message: Partial<IMessage>): number {
        const key = message.key || reserveMessageKey();

        BranchActions.ShowMessage.invoke({
            ...message,
            key,
            level: MessageLevel.INFO,
        } as IMessage);

        return message.key;
    }

    /**
     * Show a info message with No Action
     */
    export function showInfoNoAction(message: string, icon?: string, explicitKey?: number): number {
        const id = explicitKey || reserveMessageKey();
        BranchActions.ShowMessage.invoke(<any>{
            key: id,
            iconCssClass: icon,
            text: message,
            level: 0 /* INFO */
        } as IMessage);
        return id;
    }

    /**
    * Show an error with Clear button.
    */
    export function showWarningWithClear(message: string) {
        const messageId = showInfo({
            text: message,
            actionLabel: BranchResources.ClearText,
            actionCallback: () => dismissMessage(messageId),
        });
    }

    /**
    * Show an error with Clear button.
    */
    export function showErrorWithClear(message: string) {
        const messageId = showError(message,
            null,
            BranchResources.ClearText,
            null,
            () => {
                dismissMessage(messageId);
            });
    }

    /**
    * Show an error message.
    */
    export function showError(message: string, icon?: string, actionLabel?: string, actionIcon?: string, action?: Function, explicitKey?: number): number {
        const id = explicitKey || reserveMessageKey();
        BranchActions.ShowMessage.invoke({
            key: id,
            iconCssClass: icon,
            text: message,
            actionLabel: actionLabel,
            actionCallback: action,
            actionIconCssClass: actionIcon,
            level: 1 /* ERROR */
        } as IMessage);
        return id;
    }

}