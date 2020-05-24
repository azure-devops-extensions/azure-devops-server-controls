import * as Contracts from "Agile/Scripts/SprintsHub/Capacity/CapacityContracts";
import * as Work_Contracts from "TFS/Work/Contracts";
import * as Utils_Number from "VSS/Utils/Number";

export namespace WorkContractsMapper {

    /**
     * Maps the capacities
     * @param capacities
     */
    export function mapCapacities(capacities: Work_Contracts.TeamMemberCapacity[]): Contracts.IUserCapacity[] {

        return capacities.map((capacity) => {
            const activities: Contracts.IActivity[] = capacity.activities.map(mapActivity);

            const daysOff: Contracts.IDaysOff[] = mapDaysOff(capacity.daysOff);

            return {
                teamMember: mapUser(capacity.teamMember),
                activities: activities,
                daysOff: daysOff
            } as Contracts.IUserCapacity;
        });
    }

    export function mapDaysOff(daysOff: Work_Contracts.DateRange[]) {
        return daysOff.map((dayOff) => {
            return {
                start: dayOff.start,
                end: dayOff.end
            };
        });
    }

    export function mapUser(user: Work_Contracts.Member): Contracts.IUser {
        return {
            id: user.id,
            displayName: user.displayName,
            uniqueName: user.uniqueName
        };
    }

    export function mapActivity(activity: Work_Contracts.Activity): Contracts.IActivity {
        return {
            name: activity.name,
            capacityPerDay: activity.capacityPerDay,
            displayValue: Utils_Number.toDecimalLocaleString(activity.capacityPerDay) // Set the capacity string we display to user's local format
        };
    }
}