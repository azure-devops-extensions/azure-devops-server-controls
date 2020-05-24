
import Action_Base = require("VSS/Flux/Action");
import Contributions_Contracts = require("VSS/Contributions/Contracts");
import * as NotificationContracts from "Notifications/Contracts";
import { INotificationIdentity, SubscriptionsPayload } from "NotificationsUI/Scripts/UIContracts";
import { Action } from "VSS/Flux/Action";


export var ToggleSubscriptionEnabled = new Action_Base.Action<NotificationContracts.NotificationSubscription>();
export var ToggleSubscriptionDiagnosticsEnabled = new Action_Base.Action<SubscriptionDiagnosticsChange>();
export var CreateSubscription = new Action_Base.Action<any>();
export var EditSubscription = new Action_Base.Action<NotificationSubscriptionKey>();
export var DeleteSubscription = new Action_Base.Action<NotificationContracts.NotificationSubscription>();
export var OpenSubscription = new Action_Base.Action<NotificationSubscriptionKey>();
export var SubscriptionDeleted = new Action_Base.Action<NotificationContracts.NotificationSubscription>();
export var ChangeSubscriptionOptOut = new Action_Base.Action<SubscriptionOptOutChange>();
export var UnsubscribeSubscription = new Action_Base.Action<NotificationSubscriptionKey>();
export var FocusSubscription = new Action_Base.Action<NotificationSubscriptionKey>();
export var DataLoadError = new Action_Base.Action<any>();
export var Navigate = new Action_Base.Action<string>();
export var GenericError = new Action_Base.Action<any>();
export var IdentitySelected = new Action_Base.Action<INotificationIdentity>();
export var EditSubscriberDeliveryPreferences = new Action_Base.Action<NotificationContracts.NotificationSubscriber>();
export var SubscriberDeliveryPreferencesUpdated = new Action_Base.Action<any>();
export var SetAdminDefaultGroupDeliveryPreference = new Action_Base.Action<NotificationContracts.DefaultGroupDeliveryPreference>();

export module Creator {
    /**
     * Triggers a generic error.
     *
     * @param error
     */
    function genericError(error: any): void {
        GenericError.invoke(error);
    }

    export function createSubscription() {
        CreateSubscription.invoke(null);
    }

    export function editSubscription(subscriptionKey: NotificationSubscriptionKey) {
        EditSubscription.invoke(subscriptionKey);
    }

    export function deleteSubscription(subscription: NotificationContracts.NotificationSubscription) {
        DeleteSubscription.invoke(subscription);
    }

    export function subscriptionDeleted(subscription: NotificationContracts.NotificationSubscription) {
        SubscriptionDeleted.invoke(subscription);
    }

    export function toggleSubscriptionEnabled(subscription: NotificationContracts.NotificationSubscription) {
        ToggleSubscriptionEnabled.invoke(subscription);
    }

    export function toggleSubscriptionDiagnosticsEnabled(diagnosticsChange: SubscriptionDiagnosticsChange) {
        ToggleSubscriptionDiagnosticsEnabled.invoke(diagnosticsChange);
    }
    
    export function identitySelected(identity: INotificationIdentity) {
        IdentitySelected.invoke(identity);
    }

    export function openSubscription(subscriptionKey: NotificationSubscriptionKey) {
        OpenSubscription.invoke(subscriptionKey);
    }

    export function changeSubscriptionOptOut(optOutChange: SubscriptionOptOutChange) {
        ChangeSubscriptionOptOut.invoke(optOutChange);
    }


    export function unsubscribeSubscription(subscriptionKey: NotificationSubscriptionKey) {
        UnsubscribeSubscription.invoke(subscriptionKey);
    }

    export function focusSubscription(subscriptionKey: NotificationSubscriptionKey) {
        FocusSubscription.invoke(subscriptionKey);
    }

    export function editSubscriberDeliveryPreferences(subscriber: NotificationContracts.NotificationSubscriber) {
        EditSubscriberDeliveryPreferences.invoke(subscriber);
    }

    export function subscriberDeliveryPreferencesUpdated() {
        SubscriberDeliveryPreferencesUpdated.invoke(null);
    }

    export function setAdminDefaultGroupDeliveryPreference(deliveryPreference: NotificationContracts.DefaultGroupDeliveryPreference) {
        SetAdminDefaultGroupDeliveryPreference.invoke(deliveryPreference);
    }
}

export class SubscriptionOptOutChange {
    subscription: NotificationContracts.NotificationSubscription;
    newValue: boolean;
    skipWarn?: boolean;
}

export class NotificationSubscriptionKey {
    subscriptionId: string;
    publisherId?: string;
    readOnly?: boolean;
}

export class SubscriptionDiagnosticsChange {
    subscription: NotificationContracts.NotificationSubscription;
    enabled: boolean;
}