import { HubMessagesActions } from "Agile/Scripts/Common/Messages/HubMessagesActions";
import { IHubMessagesExceptionInfo } from "Agile/Scripts/Common/Messages/HubMessagesContracts";
import { MessageBarType } from "OfficeFabric/MessageBar";
import { IMessage, IMessageLink } from "Presentation/Scripts/TFS/Components/Messages";
import { GUIDUtils } from "Presentation/Scripts/TFS/TFS.Core.Utils";
import { Store } from "VSS/Flux/Store";
import * as Utils_Array from "VSS/Utils/Array";
import * as Utils_String from "VSS/Utils/String";

export interface IHubMessagesStore {
    // Get the list of messages in the store
    getMessages(): IMessage[];
    addChangedListener(handler: IEventHandler): void;
    removeChangedListener(handler: IEventHandler): void;
}

export class HubMessagesStore extends Store implements IHubMessagesStore {
    private _messages: IMessage[] = [];

    constructor(actions: HubMessagesActions) {
        super();
        this._attachActionListeners(actions);
    }

    /**
     *  The messages for the pages.
     */
    public getMessages(): IMessage[] {
        return this._messages;
    }

    protected _attachActionListeners(actions: HubMessagesActions) {
        actions.addExceptionsInfo.addListener(this._handleAddExceptionsInfo);
        actions.clearPageMessage.addListener(this._handleClearPageMessage);
        actions.addMessage.addListener(this._handleAddMessage);
        actions.clearAllMessages.addListener(this._handleClearAllMessages);
    }

    /**
     * Clears all messages
     */
    private _handleClearAllMessages = () => {
        this._messages = [];
        this.emitChanged();
    }

    /**
     * Given the message id, find it in the messages and remove it.
     * @param id The id of the message.
     */
    private _handleClearPageMessage = (id: string): void => {
        const messages = this._messages;
        for (let i = 0, len = messages.length; i < len; i++) {
            if (messages[i].id === id) {
                messages.splice(i, 1);
                this._messages = messages.slice();
                this.emitChanged();
                break;
            }
        }
    }

    private _handleAddMessage = (message: IMessage): void => {
        const id = message.id ? message.id : GUIDUtils.newGuid();
        this._setPageMessages([new Message(id, message.messageType, message.message, message.closeable, message.link, message.persistDismissal, message.children)]);
    }

    private _handleAddExceptionsInfo = (exceptionsInfo: IHubMessagesExceptionInfo[]): void => {
        if (exceptionsInfo && exceptionsInfo.length > 0) {
            const messages = exceptionsInfo.map((ex) => {
                return new Message(
                    GUIDUtils.newGuid(),
                    MessageBarType.error,
                    ex.exceptionInfo.exceptionMessage,
                    ex.closable,
                    {
                        text: ex.exceptionInfo.primaryLinkText,
                        href: ex.exceptionInfo.primaryLinkHref
                    }
                );
            });

            this._setPageMessages(messages);
        }
    }

    /**
     * Adds the messages, excluding duplicates based on message string.
     * @param messages The messages to be added.
     */
    private _setPageMessages(messages: IMessage[]): void {

        let messagesAdded: boolean = false;

        messages.forEach((newMessage) => {
            // Prevent duplicate messages from being added
            if (newMessage &&
                !Utils_Array.arrayContains<IMessage, IMessage>(
                    newMessage,
                    this._messages,
                    (a, b) => Utils_String.defaultComparer(a.message, b.message) === 0)) {

                this._messages.push(newMessage);
                messagesAdded = true;
            }
        });

        if (messagesAdded) {
            this._messages = this._messages.slice();
            this.emitChanged();
        }
    }
}

class Message implements IMessage {
    constructor(public id: string, public messageType: MessageBarType, public message: string,
        public closeable: boolean, public link?: IMessageLink, public persistDismissal?: boolean,
        public children?: React.ReactNode) {
    }
}