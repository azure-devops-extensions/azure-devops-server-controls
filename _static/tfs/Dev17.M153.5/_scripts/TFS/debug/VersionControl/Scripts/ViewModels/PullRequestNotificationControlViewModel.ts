import ko = require("knockout");

export class NotificationViewModel {
    public errors: KnockoutObservableArray<string>;
    public notifications: KnockoutObservableArray<string>;
    public notificationLink: KnockoutObservable<string>;
    public notificationLinkAction: () => void;

    public errorMessages: KnockoutComputed<string>;
    public hasError: KnockoutComputed<boolean>;
    public notificationMessages: KnockoutComputed<string>;
    public hasNotification: KnockoutComputed<boolean>;

    public isVisible: KnockoutComputed<boolean>;

    private _notificationLink: any;

    constructor() {
        this.errors = ko.observableArray(<string[]>[]);
        this.notifications = ko.observableArray(<string[]>[]);
        this.notificationLink = <KnockoutObservable<string>>ko.observable();

        this.notificationLinkAction = () => {
            this._notificationLinkAction();
        };

        this.notificationMessages = ko.computed(this._computeNotificationMessages, this);
        this.hasNotification = ko.computed(this._computeHasNotification, this);

        this.errorMessages = ko.computed(this._computeErrorMessages, this);
        this.hasError = ko.computed(this._computeHasError, this);

        this.isVisible = ko.computed(this._computeIsVisible, this);
    }

    public clear() {
        this.clearErrors();
        this.clearNotifications();
    }

    public clearErrors() {
        this.errors.removeAll();
    }

    public clearNotifications() {
        this.notifications.removeAll();
        this.notificationLink(null);
        this._notificationLink = null;
    }

    public addError(error: string) {
        this.errors.push(error);
    }

    public addNotification(notification: string) {
        this.notifications.push(notification);
    }

    public addNotificationWithLink(notification: string, link: string, callback: () => void) {
        this.addNotification(notification);
        this.notificationLink(link);
        this._notificationLink = callback;
    }

    private _notificationLinkAction() {
        if (this._notificationLink) {
            this._notificationLink();
        }
    }

    private _computeMessages(messages: string[]): string {
        let messagesString = "";

        $.each(messages, (index, msg) => {
            messagesString += msg;
        });

        return messagesString;
    }

    private _computeHasMessage(messages: string[]): boolean {
        return messages.length > 0;
    }

    private _computeNotificationMessages(): string {
        return this._computeMessages(this.notifications());
    }

    private _computeHasNotification(): boolean {
        return this._computeHasMessage(this.notifications());
    }

    private _computeErrorMessages(): string {
        return this._computeMessages(this.errors());
    }

    private _computeHasError(): boolean {
        return this._computeHasMessage(this.errors());
    }

    private _computeIsVisible(): boolean {
        return this.hasError() || this.hasNotification();
    }
}