import { serializeFilters } from "Search/Scenarios/Shared/Utils";
import { ReadWriteSettingsStorage } from "Search/Scenarios/Shared/Base/ReadWriteSettingsStorage";
import { FilterKeys } from "Search/Scenarios/Code/Constants";

const SearchFilterPreferenceKey = "vss-search-platform/code/LastUpdatedFilters";

export class LocalFilterPreferenceStorage extends ReadWriteSettingsStorage<IDictionaryStringTo<string[]>> {
    constructor(isProjectContext: boolean) {
        super(SearchFilterPreferenceKey, isProjectContext);
    }

    public writeLocalPreference(searchFilters: IDictionaryStringTo<string[]>): void {
        // we don't want to persist code element filters as user preference.
        searchFilters = Object.assign({}, searchFilters);
        delete searchFilters[FilterKeys.CodeTypeFiltersKey];

        super.writeLocalPreference(searchFilters);
    }

    public readFiltersAsString(): string {
        return serializeFilters(this.readLocalPreference());
    }
}