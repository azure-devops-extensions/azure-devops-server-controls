import * as VSSStore from "VSS/Flux/Store";
import { getErrorMessage } from "VSS/VSS";

export enum NotificationType {
    success,
    info,
    warning,
    error,
}

export interface Notification {
    key?: string;
    type: NotificationType;
    message?: string;

    /**
     * Well-known string to identify this notification. Store won't understand it.
     * It will be provided with the notification, and only has meaning when handling or rendering it from consumer code.
     */
    specialType?: string;

    /**
     * Additional content required to render this notification. Store won't understand it.
     */
    specialContent?: any;

    isDismissable: boolean;
}

export interface NotificationState {
    notifications: Notification[];
    nextKey: number;
}

export enum AddMode {
    adding,
    replacingWarningsAndErrors,
    replacingItsType,
    replacingItsSpecialType,
}

/**
 * Errors, suggestions, and other notifications store.
 */
export class NotificationStore extends VSSStore.Store {
    public state: NotificationState = {
        notifications: [],
        nextKey: 1,
    };

    public addError = (error: Error): void => {
        this.add(createErrorNotification(error));
    }

    public addSoloError = (error: Error): void => {
        this.add(createErrorNotification(error), AddMode.replacingWarningsAndErrors);
    }

    public addWarning = (error: Error): void => {
        this.add(createWarningNotification(error));
    }

    public addSoloWarning = (error: Error): void => {
        this.add(createWarningNotification(error), AddMode.replacingWarningsAndErrors);
    }

    public addSoloSpecialType = (notification: Notification): void => {
        this.add(notification, AddMode.replacingItsSpecialType);
    }

    public add = (notification: Notification, mode = AddMode.adding): void => {
        notification.key = this.state.nextKey.toString();

        const preservedNotifications =
            mode === AddMode.replacingWarningsAndErrors
            ? filterOutWarningsAndErrors(this.state.notifications)
            : mode === AddMode.replacingItsType
            ? filterOutType(this.state.notifications, notification.type)
            : mode === AddMode.replacingItsSpecialType
            ? filterOutSpecialType(this.state.notifications, notification.specialType)
            : this.state.notifications;

        this.state.notifications = [...preservedNotifications, notification];
        this.state.nextKey++;

        this.emitChanged();
    }

    public dismiss = (notification: Notification): void => {
        this.state.notifications = this.state.notifications.filter(n => n !== notification);

        this.emitChanged();
    }

    public clearAll = (): void => {
        this.state.notifications = [];
        this.emitChanged();
    }

    public clearErrors = (): void => {
        this.state.notifications = filterOutWarningsAndErrors(this.state.notifications);
        this.emitChanged();
    }

    public clearType = (notificationType: NotificationType): void => {
        this.state.notifications = filterOutType(this.state.notifications, notificationType);
        this.emitChanged();
    }

    public clearSpecialType(specialType: string): void {
        this.state.notifications = this.state.notifications.filter(notification => notification.specialType !== specialType);
        this.emitChanged();
    }
}

function createErrorNotification(error: Error): Notification {
    return {
        type: NotificationType.error,
        message: getErrorMessage(error),
        isDismissable: true,
    };
}

function createWarningNotification(error: Error): Notification {
    return {
        type: NotificationType.warning,
        message: getErrorMessage(error),
        isDismissable: true,
    };
}

function filterOutWarningsAndErrors(notifications: Notification[]): Notification[] {
    return notifications.filter(notification => notification.type !== NotificationType.error && notification.type !== NotificationType.warning);
}

function filterOutType(notifications: Notification[], notificationType: NotificationType): Notification[] {
    return notifications.filter(notification => notification.type !== notificationType);
}

function filterOutSpecialType(notifications: Notification[], specialType: string): Notification[] {
    return notifications.filter(notification => notification.specialType !== specialType);
}
