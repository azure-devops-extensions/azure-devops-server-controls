import * as VSSStore from "VSS/Flux/Store";
import { MessageBarType } from "OfficeFabric/MessageBar";

export interface NotificationState {
    message: string;
    messageType: MessageBarType;
    isDismissable?: boolean;
}

export class NotificationStore extends VSSStore.Store {
    public state: NotificationState;

    constructor() {
        super();
        this.state = {
            message: '',
            messageType: MessageBarType.info,
        }
    }

    public clearNotifications = (): void => {
        this.state.message = '';

        this.emitChanged();
    } 

    public setErrorNotification = (error: string): void => {
        this._setNotification({
            message: error,
            messageType: MessageBarType.error,
            isDismissable: true
        });
    }

    public setInfoNotification = (msg: string): void => {
        this._setNotification({
            message: msg,
            messageType: MessageBarType.info,
            isDismissable: false,
        });
    }

    public getState = (): NotificationState => {
        return this.state;
    }

    public dispose(): void {
        this.state = null;
    }
    
    private _setNotification = (newState: NotificationState): void => {
        this.state = newState;
        this.emitChanged();
    }
}