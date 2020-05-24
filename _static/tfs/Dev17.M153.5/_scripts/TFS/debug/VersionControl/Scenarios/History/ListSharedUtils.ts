import * as Utils_Date from "VSS/Utils/Date";
import { IGroup } from "OfficeFabric/GroupedList";
import { Item } from "VersionControl/Scenarios/History/ListInterfaces";

export function getGroupsByDate(items: Item[], hasMoreUpdates: boolean): IGroup[] {
    const groupsByDate: IGroup[] = [];
    let creationDay: string = null;
    let creationDayGroup: IGroup = null;
    let groupItemList: Item[] = [];

    if (!items) {
        return groupsByDate;
    }

    for (let i = 0; i < items.length; i++) {
        const currentCreationDay = Utils_Date.localeFormat(items[i].date, "D");
        if (currentCreationDay === creationDay) {
            creationDayGroup.count++;
        }
        else {
            if (creationDayGroup) {
                creationDayGroup.data = groupItemList;
                groupsByDate.push(creationDayGroup);
                groupItemList = [];
            }

            creationDay = currentCreationDay;
            creationDayGroup = {
                key: creationDay,
                name: creationDay,
                count: 1,
                data: [],
                startIndex: creationDayGroup ? (creationDayGroup.startIndex + creationDayGroup.count) : 0,
            };
        }

        groupItemList.push(items[i]);
    }

    /*incrementing count by 1 so that list component tries to render an extra item and invokes onRenderMissingItem which is used for infinite scroll.*/
    if (hasMoreUpdates) {
        creationDayGroup.count++;
    }
    if (creationDayGroup) {
        creationDayGroup.data = groupItemList;
        groupsByDate.push(creationDayGroup);
    }

    return groupsByDate;
}