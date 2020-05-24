import { CoreFieldRefNames } from "Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants";
import { IFilterProvider, IFilter } from "WorkItemTracking/Scripts/Filtering/FilterManager";
import { FieldFilterProvider } from "WorkItemTracking/Scripts/Filtering/FieldFilterProvider";
import { TagUtils } from "WorkItemTracking/Scripts/Utils/TagUtils";

export class TagsFilterProvider extends FieldFilterProvider implements IFilterProvider {
    private _filterValues: string[];

    constructor() {
        super(CoreFieldRefNames.Tags);
        this._filterValues = [];
    }

    /**
     * Override to process the options which are specific to TagsFilterProvider
     */
    public setFilter(filter: IFilter) {
        super.setFilter(filter);

        // Cache the filter values array for faster 'and' operations.
        this._filterValues = filter ? filter.values as string[] : [];
    }

    /**
     * Override for tag specific processing.
     * @param value
     */
    protected matchesFilter(value: string): boolean {
        if (value) {
            const tags: string[] = TagUtils.splitAndTrimTags(value as string);

            if (this._filter && this._filter.options && this._filter.options.useAndOperator) {
                // all tags in the filter must exist in the source
                return this._filterValues.every((filter: string) => tags.indexOf(filter) >= 0);
            }
            else {
                // Any of the tags in the source exist in the filter
                return tags.some((tagName: string) => { return tagName in this._filterValueMap; });
            }
        }

        return false;
    }
}
