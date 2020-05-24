import { WorkItemsHubTabs } from "WorkItemsHub/Scripts/Generated/Constants";
import { handleError } from "VSS/VSS";
import * as Service from "VSS/Service";
import * as Contributions_Contracts from "VSS/Contributions/Contracts";
import * as Contribution_Services from "VSS/Contributions/Services";
import { WorkItemsHubTabGroupContributionId } from "WorkItemsHub/Scripts/Constants";

export const TabEnumValueByTabIdMap: IDictionaryStringTo<number> = {};
export const TabIdByTabEnumValueMap: IDictionaryNumberTo<string> = {};
export const TabIds: string[] = [];

Object.keys(WorkItemsHubTabs).every(k => {
    if (typeof (WorkItemsHubTabs[k]) === "number") {
        // break out of the every loop the moment the key becomes the friendly enum name and value is numeric
        return false;
    }

    const tab: number = parseInt(k, 10);
    const tabStringValue: string = WorkItemsHubTabs[tab];
    const tabId: string = tabStringValue.toLowerCase();
    TabEnumValueByTabIdMap[tabId] = tab;
    TabIdByTabEnumValueMap[tab] = tabId;
    TabIds.push(tabId);
    return true;
});

export function getTabIdByName(name: string): string {
    if (name) {
        const tabId = name.toLowerCase();
        if (TabIds.indexOf(tabId) >= 0) {
            return tabId;
        }
    }

    return null;
}

export interface ITabContributionInfo {
    tabId: string;
    friendlyName: string;
}

export function getTabContributionInfoAsync(): IPromise<ITabContributionInfo[]> {
    const dataSvc = Service.getService(Contribution_Services.ExtensionService);
    return dataSvc.getContributionsForTarget(WorkItemsHubTabGroupContributionId, "ms.vss-web.tab")
        .then((contributions: Contributions_Contracts.Contribution[]) => {
            return contributions.map(c => ({ tabId: getTabIdByName(c.properties.itemKey), friendlyName: c.properties.name } as ITabContributionInfo));
        }, handleError);
}
