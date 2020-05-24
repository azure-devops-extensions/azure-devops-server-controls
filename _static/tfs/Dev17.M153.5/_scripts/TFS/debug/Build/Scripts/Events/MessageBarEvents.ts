import { EventManager } from "Build/Scripts/Events/EventManager";

import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";

import { logError, logInfo } from "VSS/Diag";
import { handleError } from "VSS/VSS";

var eventManager: MessageBarEventManager = null;

export namespace MessageTypes {
    export const Error = "error";
    export const Info = "info";
    export const Success = "success";
    export const Warning = "warning";

    // Match with Tfs/Web/extensions/tfs/vss-tfs-web/global-banner/Components/GlobalMessageBanner.tsx
    export function getLevel(type: string) {
        type = type || MessageTypes.Info;
        if (type === MessageTypes.Info) {
            return 0;
        }
        if (type === MessageTypes.Warning) {
            return 1;
        }
        if (type === MessageTypes.Error) {
            return 2;
        }
        if (type === MessageTypes.Success) {
            return 3;
        }
    }
}

export interface IMessageLink {
    name: string;
    href: string;
}

export interface IMessageContent {
    type?: string;
    format: string;
    links?: IMessageLink[];
}

export namespace MessageBarEvents {
    export const MESSAGE_AVAILABLE = "MESSAGE_AVAILABLE";
    export const MESSAGE_ERRORS_AVAILABLE = "MESSAGE_ERRORS_AVAILABLE";
}

export function getMessageBarEventManager(): MessageBarEventManager | null {
    return eventManager;
}

export function initializeEventManager(vssPageContext: Object) {
    if (eventManager == null) {
        eventManager = new MessageBarEventManager(vssPageContext);
    }
}

export function raiseTfsError(error: TfsError) {
    raiseTfsErrors([error]);
}

export function raiseTfsErrors(errors: TfsError[]) {
    if (!errors || errors.length == 0) {
        return;
    }

    if (eventManager == null) {
        logInfo("MessageBarEventManager is not initialized, falling back to VSS Handler");
        errors.forEach((error) => {
            handleError(error);
        });

        return;
    }

    eventManager.raiseEvent(MessageBarEvents.MESSAGE_ERRORS_AVAILABLE, errors.map(error => error.message));
}

export function disposeMessageBarEventManager() {
    if (!!eventManager) {
        eventManager.dispose();
    }
}

// object where we can hook up events to
export class MessageBarEventManager extends EventManager {
    private _vssPageContext: Object;
    constructor(vssPageContext: Object) {
        super();
        this._vssPageContext = vssPageContext;
        this.addEventGroupListener(MessageBarEvents.MESSAGE_ERRORS_AVAILABLE, this._errorsTextHandler);
        this.addEventGroupListener(MessageBarEvents.MESSAGE_AVAILABLE, this._messageHandler);
    }

    public raiseInfoMessage(message: IMessageContent) {
        this.raiseEvent(MessageBarEvents.MESSAGE_AVAILABLE, message);
    }

    public dispose() {
        this.removeEventGroupListener(MessageBarEvents.MESSAGE_ERRORS_AVAILABLE, this._errorsTextHandler);
        this.removeEventGroupListener(MessageBarEvents.MESSAGE_AVAILABLE, this._messageHandler);
    }

    private _errorsTextHandler = (errors: string[]) => {
        errors = errors || [];
        this._updateMessage(errors.join(";"), undefined, MessageTypes.Error);
    }

    private _messageHandler = (messageContent: IMessageContent) => {
        this._updateMessage(messageContent.format, messageContent.links, messageContent.type);
    }

    private _updateMessage(format: string, links?: IMessageLink[], level?: string) {
        const pageContext = this._vssPageContext as any;
        if (pageContext && pageContext.getService) {
            // See Tfs/Web/extensions/tfs/vss-tfs-web/global-banner/GlobalMessagesService.ts
            // This is new webplatform, so can't be used directly, temporary code to display messages until we move to new webplatform altogether
            const globalMessageService = pageContext.getService("IGlobalMessagesService");
            if (globalMessageService) {
                let banner: any = {
                    level: MessageTypes.getLevel(level),
                    messageLinks: links
                };

                if (links) {
                    banner.messageFormat = format;
                }
                else {
                    banner.message = format;
                }

                globalMessageService.setGlobalMessageBanner(
                    banner,
                    true //closeExisting
                );
            }
            else {
                logError("Could not get IGlobalMessageService, message cannot be displayed to the user - " + format);
            }
        }
    }
}