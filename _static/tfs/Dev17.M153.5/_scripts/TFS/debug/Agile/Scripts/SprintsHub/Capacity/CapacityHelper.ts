import * as Contracts from "Agile/Scripts/SprintsHub/Capacity/CapacityContracts";
import * as Utils_Number from "VSS/Utils/Number";

export class CapacityHelper {
    public static deepCopyCapacity(capacity: Contracts.ICapacity): Contracts.ICapacity {

        if (!capacity) {
            return null;
        }

        const ret: Contracts.ICapacity = {
            teamDaysOff: CapacityHelper._deepCopyDaysOff(capacity.teamDaysOff),
            userCapacities: CapacityHelper._deepCopyUserCapacities(capacity.userCapacities)
        };
        return ret;
    }

    public static dedupeAllActivities(capacity: Contracts.ICapacity): void {
        capacity.userCapacities.forEach((userCapacity: Contracts.IUserCapacity) => {
            const activities = CapacityHelper.dedupeActivities(userCapacity.activities);
            userCapacity.activities = activities;
        });
    }

    public static dedupeActivities(activities: Contracts.IActivity[]): Contracts.IActivity[] {
        const dict: IDictionaryStringTo<number> = {};
        activities.forEach((activity) => {
            if (!dict[activity.name]) {
                dict[activity.name] = 0;
            }
            dict[activity.name] += activity.capacityPerDay;
        });

        const ret = [];
        for (const key of Object.keys(dict)) {
            ret.push({
                name: key,
                capacityPerDay: dict[key],
                displayValue: Utils_Number.toDecimalLocaleString(dict[key])
            });
        }
        return ret;
    }

    public static isActivityEqual(one: Contracts.IActivity, two: Contracts.IActivity) {
        return one.name === two.name && one.capacityPerDay === two.capacityPerDay;
    }

    public static isDayOffEqual(one: Contracts.IDaysOff, two: Contracts.IDaysOff) {
        return one.start.getTime() === two.start.getTime()
            && one.end.getTime() === two.end.getTime()
            && one.netDaysOff === two.netDaysOff;
    }

    /**
     * Determine if the given number is a valid capacity.  To be a valid capacity it must be a positive number.
     * @param value
    */
    public static isCapacityNumberValid(value: number): boolean {
        return value != null &&
            !isNaN(value) &&
            value >= 0;
    }

    private static _deepCopyUserCapacities(userCapacities: Contracts.IUserCapacity[]): Contracts.IUserCapacity[] {
        const ret: Contracts.IUserCapacity[] = [];
        userCapacities.forEach((uc) => {
            const u: Contracts.IUserCapacity = {
                activities: CapacityHelper._deepCopyActivities(uc.activities),
                daysOff: CapacityHelper._deepCopyDaysOff(uc.daysOff),
                teamMember: {
                    id: uc.teamMember.id,
                    displayName: uc.teamMember.displayName,
                    uniqueName: uc.teamMember.uniqueName
                }
            };
            ret.push(u);
        });

        return ret;
    }

    private static _deepCopyActivities(activities: Contracts.IActivity[]): Contracts.IActivity[] {
        if (!activities || activities.length === 0) {
            return [];
        }

        const ret: Contracts.IActivity[] = [];
        activities.forEach((act) => {
            ret.push({ ...act });
        });
        return ret;
    }

    private static _deepCopyDaysOff(daysOff: Contracts.IDaysOff[]): Contracts.IDaysOff[] {
        if (!daysOff || daysOff.length === 0) {
            return [];
        }
        const ret: Contracts.IDaysOff[] = [];
        daysOff.forEach((dayOff) => {
            ret.push({
                start: dayOff.start,
                end: dayOff.end,
                netDaysOff: dayOff.netDaysOff,
                ratio: dayOff.ratio
            });
        });

        return ret;
    }
}