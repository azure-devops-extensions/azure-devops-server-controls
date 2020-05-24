import { ExceptionInfo } from "Agile/Scripts/Models/ExceptionInfo";
import { HubMessagesActions } from "Agile/Scripts/Common/Messages/HubMessagesActions";
import { publishErrorToTelemetry } from "VSS/Error";
import * as VSS from "VSS/VSS";
import { IMessage } from "Presentation/Scripts/TFS/Components/Messages";
import { MessageBarType } from "OfficeFabric/MessageBar";
import * as Service from "VSS/Service";
import * as Settings from "VSS/Settings";

export interface IHubMessagesActionsCreator {
    /**
     * Adds an error message
     * @param error The error
     * @param closable Whether the message is closable or not, if not specified, it will be true by default
     */
    addErrorMessage(error: Error, closable?: boolean): void;
    /**
     * Adds an array of ExceptionInfo objects.
     * @param source The source of the exceptions.
     * @param closable Whether the message is closable or not.
     * @param exceptionsInfo The array of ExceptionInfo objects to add.
     */
    addExceptionsInfo(source: string, closable: boolean, ...exceptionsInfo: ExceptionInfo[]): void;
    /**
     * Clear a messsage
     * @param messageId The message Id
     */
    clearPageMessage(messageId: string, persistDismissal?: boolean): void;

    /**
     * Clears all messages, does not persist dismissal
     */
    clearAllMessages(): void;

    addMessage(message: IMessage): void;
}

export class HubMessagesActionsCreator implements IHubMessagesActionsCreator {
    private _actions: HubMessagesActions;
    private static readonly DISMISSED_SETTING_PREFIX: string = "DISMISSED_BANNER_";

    public constructor(actions: HubMessagesActions) {
        this._actions = actions;
    }

    public addErrorMessage(error: Error, closable: boolean = true) {
        this._actions.addMessage.invoke({
            closeable: closable,
            messageType: MessageBarType.error,
            message: VSS.getErrorMessage(error)
        } as IMessage);

        publishErrorToTelemetry(error);
    }

    public addExceptionsInfo(source: string, closable: boolean, ...exceptionsInfo: ExceptionInfo[]): void {

        if (exceptionsInfo) {

            this._actions.addExceptionsInfo.invoke(exceptionsInfo.map((ex) => {
                return {
                    exceptionInfo: ex,
                    closable: closable
                };
            }));

            exceptionsInfo.forEach((ex) => publishErrorToTelemetry({
                name: source,
                message: ex.exceptionMessage
            }));
        }
    }

    public addMessage(message: IMessage) {
        // If the message specifies persistent dismissal & it was dismissed, don't show it(just return)
        if (message.persistDismissal && message.id) {

            const isDismissed = Service.getLocalService(Settings.LocalSettingsService).read<boolean>(this._getKey(message.id), /* defaultValue */ false, Settings.LocalSettingsScope.Project);
            if (isDismissed) {
                return;
            }
        }

        this._actions.addMessage.invoke(message);
    }

    public clearPageMessage(messageId: string, persistDismissal?: boolean) {
        // Store the dismissal to local storage (use the messageId to identify it)
        if (persistDismissal && messageId) {
            Service.getLocalService(Settings.LocalSettingsService).write(this._getKey(messageId), true, Settings.LocalSettingsScope.Project);
        }

        this._actions.clearPageMessage.invoke(messageId);
    }

    public clearAllMessages() {
        this._actions.clearAllMessages.invoke(null);
    }

    private _getKey(messageId: string) {
        return HubMessagesActionsCreator.DISMISSED_SETTING_PREFIX + messageId;
    }
}
