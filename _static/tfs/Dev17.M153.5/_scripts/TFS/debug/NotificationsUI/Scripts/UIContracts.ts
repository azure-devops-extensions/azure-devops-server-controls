
import * as NotificationContracts from "Notifications/Contracts";
import { IdentityRef } from "VSS/WebApi/Contracts";

export interface SubscriptionsPayload {
    isAdmin: boolean;
    subscriber: IdentityRef;
    events: { [key: string]: NotificationContracts.NotificationEventType; };
    subscriptions: {[key: string]: { [key: string]: NotificationContracts.NotificationSubscription; }};
    statistics: { [key: number]: NotificationContracts.NotificationStatistic[]; };
    eventTypes: { [key: string]: NotificationContracts.NotificationEventType; };
    queryDate: Date;
}

export interface INotificationIdentity extends IdentityRef {
    email?: string;
    type?: string;
}