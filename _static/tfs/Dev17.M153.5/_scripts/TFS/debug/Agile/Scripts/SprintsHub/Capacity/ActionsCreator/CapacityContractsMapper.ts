import * as Contracts from "Agile/Scripts/SprintsHub/Capacity/CapacityContracts";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import * as Work_Contracts from "TFS/Work/Contracts";
import { IEntity } from "VSS/Identities/Picker/RestClient";
import * as Utils_Date from "VSS/Utils/Date";
import { format } from "VSS/Utils/String";

export namespace CapacityContractsMapper {

    /**
     * Maps the capacities
     * @param capacities
     */
    export function mapCapacities(capacities: Contracts.IUserCapacity[], shiftDates: boolean): Work_Contracts.TeamMemberCapacity[] {

        return capacities.map((capacity) => {
            const activities: Work_Contracts.Activity[] = capacity.activities.map(mapActivity);

            const daysOff: Work_Contracts.DateRange[] = shiftDates ? mapDaysOff(capacity.daysOff) : capacity.daysOff;

            return <Work_Contracts.TeamMemberCapacity>{
                teamMember: mapUser(capacity.teamMember),
                activities: activities,
                daysOff: daysOff
            };
        });
    }

    export function mapDaysOff(daysOff: Contracts.IDaysOff[]): Work_Contracts.DateRange[] {
        return daysOff.map((dayOff) => {
            return {
                // Serializer will shift date to UTC. This date is currently in the format
                // the user wants (e.g. 1/1/2010 00:00 for Jan 1st). We need to convert to
                // local time (e.g. 12/31/2009 16:00 PST-8) so that it will be seralized
                // and sent to server as correct date (e.g. 1/1/2010)
                start: Utils_Date.shiftToLocal(dayOff.start),
                end: Utils_Date.shiftToLocal(dayOff.end)
            };
        });
    }

    export function mapUser(user: Contracts.IUser): Work_Contracts.Member {
        return <Work_Contracts.Member>{
            id: user.id,
            displayName: user.displayName,
            uniqueName: user.uniqueName
        };
    }

    export function mapActivity(activity: Contracts.IActivity): Work_Contracts.Activity {
        return {
            name: activity.name,
            capacityPerDay: activity.capacityPerDay
        };
    }

    export function mapEntity(entity: IEntity): Contracts.IUser {
        if (TfsContext.getDefault().isHosted) {
            return mapHostedEntity(entity);
        } else {
            return mapOnPremEntity(entity);
        }
    }

    export function mapHostedEntity(entity: IEntity): Contracts.IUser {
        const id = entity.localId;
        const uniqueName = entity.signInAddress;
        const displayName = formatDisplayName(entity.displayName, uniqueName);

        return {
            id: id,
            uniqueName: uniqueName,
            displayName: displayName
        };
    }

    export function mapOnPremEntity(entity: IEntity): Contracts.IUser {
        const id = entity.localId;
        const uniqueName = `${entity.scopeName}\\${entity.samAccountName}`;
        const displayName = formatDisplayName(entity.displayName, uniqueName);

        return {
            id: id,
            uniqueName: uniqueName,
            displayName: displayName
        };
    }

    export function formatDisplayName(displayName: string, uniqueName: string): string {
        return format("{0} <{1}>", displayName, uniqueName);
    }
}