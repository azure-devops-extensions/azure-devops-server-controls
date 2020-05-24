import { serializeFilters } from "Search/Scenarios/Shared/Utils";
import { ReadWriteSettingsStorage } from "Search/Scenarios/Shared/Base/ReadWriteSettingsStorage";
import { FilterKeys } from "Search/Scenarios/WorkItem/Constants";

const SearchFilterPreferenceKey = "vss-search-platform/workitem/LastUpdatedFilters";

export class LocalFilterPreferenceStorage extends ReadWriteSettingsStorage<IDictionaryStringTo<string[]>> {
    constructor(isProjectContext: boolean) {
        super(SearchFilterPreferenceKey, isProjectContext);
    }

    public writeLocalPreference(searchFilters: IDictionaryStringTo<string[]>): void {        
        searchFilters = Object.assign({}, searchFilters);
        // we don't want to persist filters other that area path, and project

        delete searchFilters[FilterKeys.AssignedToFiltersKey];
        delete searchFilters[FilterKeys.StateFiltersKey];
        delete searchFilters[FilterKeys.WorkItemTypesFiltersKey];

        super.writeLocalPreference(searchFilters);
    }

    public readFiltersAsString(): string {
        return serializeFilters(this.readLocalPreference());
    }
}