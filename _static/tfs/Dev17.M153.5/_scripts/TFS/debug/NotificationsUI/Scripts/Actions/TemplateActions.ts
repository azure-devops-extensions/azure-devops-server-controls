
import * as ActionBase from "VSS/Flux/Action";
import * as NotificationContracts from "Notifications/Contracts";

export var TemplateSelected = new ActionBase.Action<NotificationContracts.NotificationSubscriptionTemplate>();

export module Creator {
    export function templateSelected(template: NotificationContracts.NotificationSubscriptionTemplate) {
        TemplateSelected.invoke(template);
    }
}