import * as Utils_String from "VSS/Utils/String";
import * as Utils_Date from "VSS/Utils/Date";

import { PlanColumnKey } from "ScaledAgile/Scripts/PlanHub/Models/PlanHubStoreInterfaces";
import { TabRowPlanData } from "ScaledAgile/Scripts/PlanHub/Models/TabRowPlanData";

export class TabRowPlanDataUtils {
    public static compareByName(lhs: TabRowPlanData, rhs: TabRowPlanData, sortDescending: boolean) {
        const compareField = Utils_String.localeComparer(lhs.name, rhs.name);
        if (compareField !== 0) {
            return ((sortDescending) ? -compareField : compareField);
        }
        return TabRowPlanDataUtils._compareAllFields(lhs, rhs, PlanColumnKey.Name);
    }

    public static compareDescription(lhs: TabRowPlanData, rhs: TabRowPlanData, sortDescending: boolean) {
        const compareField = Utils_String.localeComparer(lhs.description, rhs.description);
        if (compareField !== 0) {
            return ((sortDescending) ? -compareField : compareField);
        }
        return TabRowPlanDataUtils._compareAllFields(lhs, rhs, PlanColumnKey.Description);
    }

    public static compareCreatedBy(lhs: TabRowPlanData, rhs: TabRowPlanData, sortDescending: boolean) {
        const compareField = Utils_String.localeComparer(lhs.createdByIdentity.displayName, rhs.createdByIdentity.displayName);
        if (compareField !== 0) {
            return ((sortDescending) ? -compareField : compareField);
        }
        return TabRowPlanDataUtils._compareAllFields(lhs, rhs, PlanColumnKey.CreatedBy);
    }

    public static compareModifiedDate(lhs: TabRowPlanData, rhs: TabRowPlanData, sortDescending: boolean) {
        const compareField = Utils_Date.defaultComparer(lhs.modifiedDate, rhs.modifiedDate);
        if (compareField !== 0) {
            return ((sortDescending) ? -compareField : compareField);
        }
        return TabRowPlanDataUtils._compareAllFields(lhs, rhs, PlanColumnKey.ModifiedDate);
    }

    /**
     * Compare two rows by all columns except the given one - returns as if sorting in ascending order.
     * The order here is for the Plans hub (Favorites and All) - this is the order things will appear there.
     */
    protected static _compareAllFields(lhs: TabRowPlanData, rhs: TabRowPlanData, ignoreColumn: string) {
        if (ignoreColumn !== PlanColumnKey.Name) {
            const compareName = Utils_String.localeComparer(lhs.name, rhs.name);
            if (compareName !== 0) {
                return compareName;
            }
        }
        if (ignoreColumn !== PlanColumnKey.Description) {
            const compareDescription = Utils_String.localeComparer(lhs.description, rhs.description);
            if (compareDescription !== 0) {
                return compareDescription;
            }
        }
        if (ignoreColumn !== PlanColumnKey.CreatedBy) {
            const compareCreatedBy = Utils_String.localeComparer(lhs.createdByIdentity.displayName, rhs.createdByIdentity.displayName);
            if (compareCreatedBy !== 0) {
                return compareCreatedBy;
            }
        }
        if (ignoreColumn !== PlanColumnKey.ModifiedDate) {
            const compareModifiedDate = Utils_Date.defaultComparer(lhs.modifiedDate, rhs.modifiedDate);
            if (compareModifiedDate !== 0) {
                return compareModifiedDate;
            }
        }
        return Utils_String.localeComparer(lhs.id, rhs.id);
    }
}
