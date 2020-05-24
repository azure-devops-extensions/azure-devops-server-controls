
import * as ActionBase from "VSS/Flux/Action";
import * as NotificationContracts from "Notifications/Contracts";

export const StatisticTabOpened = new ActionBase.Action<any>();

export function statisticTabOpened() {
    StatisticTabOpened.invoke(null);
}