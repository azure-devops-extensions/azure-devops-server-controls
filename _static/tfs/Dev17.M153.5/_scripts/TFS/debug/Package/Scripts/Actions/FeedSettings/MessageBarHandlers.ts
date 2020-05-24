import { MessageBarType } from "OfficeFabric/MessageBar";

import { IFeedSettingsState } from "Package/Scripts/Components/Settings/IFeedSettingsState";

/**
 * Clear error message from message bar
 */
export class ClearErrorHandler {
    public static handle(state: IFeedSettingsState, emitCallback: () => void, reason?: Error): void {
        state.messageBarMessage = null;
        state.messageBarType = null;
        emitCallback();
    }
}

/**
 * Display error message in message bar
 * When messageBarMessage is set, it will get displayed on top of Hub
 */
export class DisplayErrorHandler {
    public static handle(state: IFeedSettingsState, emitCallback: () => void, reason?: Error): void {
        if (reason == null) {
            state.messageBarMessage = null;
            state.messageBarType = null;
        } else {
            state.messageBarMessage = reason.message;
            state.messageBarType = MessageBarType.error;
        }
        emitCallback();
    }
}

/**
 * Display warning message in message bar
 */
export class DisplayWarningHandler {
    public static handle(state: IFeedSettingsState, emitCallback: () => void, message?: string): void {
        if (message == null) {
            state.messageBarMessage = null;
            state.messageBarType = null;
        } else {
            state.messageBarMessage = message;
            state.messageBarType = MessageBarType.warning;
        }
        emitCallback();
    }
}
