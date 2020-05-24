import * as _NavigationHandler from "Search/Scenarios/Hub/NavigationHandler";
import * as _SearchSharedContracts from "Search/Scripts/Generated/Search.SharedLegacy.Contracts";
import { TfsContext, IRouteData } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { EntityTypeUrlParam } from "Search/Scenarios/WorkItem/Constants";
import { serializeFilters, serializeSortOptions, isEmpty } from "Search/Scenarios/Shared/Utils";

export class PageSource {
    public openUrlInNewtab(url: string): void {
        window.open(url, "_blank");
    }

    public navigateToNewSearch = (searchText: string, filters: IDictionaryStringTo<string[]>, sortOptions: _SearchSharedContracts.EntitySortOption[]): void => {
        const context: TfsContext = TfsContext.getDefault(),
            params: _NavigationHandler.UrlParams = { type: EntityTypeUrlParam, text: searchText };

        if (filters && !isEmpty(filters)) {
            params.filters = serializeFilters(filters);
        }

        if (sortOptions && sortOptions.length) {
            params.sortOptions = serializeSortOptions(sortOptions);
        }

        const url = `${context.getPublicActionUrl("", "search", params as IRouteData)}`;

        this.openUrlInNewtab(url);
    }
}