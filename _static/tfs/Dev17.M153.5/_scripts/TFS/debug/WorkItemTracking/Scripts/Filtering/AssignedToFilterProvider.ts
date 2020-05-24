import { CoreFieldRefNames } from "Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants";
import { IdentityHelper } from "Presentation/Scripts/TFS/TFS.OM.Identities";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { IFilterProvider, IFilter } from "WorkItemTracking/Scripts/Filtering/FilterManager";
import { FieldFilterProvider } from "WorkItemTracking/Scripts/Filtering/FieldFilterProvider";
import { equals } from "VSS/Utils/String";
import { WiqlOperators } from "WorkItemTracking/Scripts/OM/WiqlOperators";
import { WorkItemIdentityRef } from "WorkItemTracking/Scripts/OM/WorkItemInterfaces";
import { isWorkItemIdentityRef } from "WorkItemTracking/Scripts/Utils/WorkItemIdentityHelper";

export class AssignedToFilterProvider extends FieldFilterProvider implements IFilterProvider {
    constructor() {
        super(CoreFieldRefNames.AssignedTo);
    }

    public setFilter(filter: IFilter) {
        super.setFilter(filter);

        const filterValues = Object.keys(this._filterValueMap);
        for (const filterValue of filterValues) {
            // Resolve filter value
            if (equals(filterValue, WiqlOperators.MacroMe, true)) {
                // Get current user and filter on that
                const currentUserValue = IdentityHelper.getFriendlyDistinctDisplayName(TfsContext.getDefault().currentIdentity);
                delete this._filterValueMap[filterValue];
                this._filterValueMap[currentUserValue] = true;
            }
        }
    }

    /**
     * Override for IdentityRef specific processing.
     * @param value
     */
    protected matchesFilter(value: string | WorkItemIdentityRef): boolean {
        if (!isWorkItemIdentityRef(value)) {
            // Fall back to the FieldFilterProvider for default implementation
            return super.matchesFilter(value);
        }

        const text = (value as WorkItemIdentityRef).distinctDisplayName || ""; // Default to Unassigned if the value is null
        return this._filterValueMap.hasOwnProperty(text);
    }
}
