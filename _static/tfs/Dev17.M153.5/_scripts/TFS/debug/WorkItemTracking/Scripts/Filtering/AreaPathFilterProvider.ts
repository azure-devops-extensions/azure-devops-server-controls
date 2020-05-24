import { CoreFieldRefNames } from "Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants";
import { IFilterProvider } from "WorkItemTracking/Scripts/Filtering/FilterManager";
import { FieldFilterProvider } from "WorkItemTracking/Scripts/Filtering/FieldFilterProvider";
import { getAreaPathLeafNode } from "WorkItemTracking/Scripts/Utils/AreaPathHelper";

export class AreaPathFilterProvider extends FieldFilterProvider implements IFilterProvider {
    constructor() {
        super(CoreFieldRefNames.AreaPath);
    }

    /**
     * Override for area path match which checks only leaf node
     * @param areaPath
     */
    protected matchesFilter(areaPath: string): boolean {
        const text = getAreaPathLeafNode(areaPath);

        if (text in this._filterValueMap) {
            return true;
        }

        return false;
    }
}
