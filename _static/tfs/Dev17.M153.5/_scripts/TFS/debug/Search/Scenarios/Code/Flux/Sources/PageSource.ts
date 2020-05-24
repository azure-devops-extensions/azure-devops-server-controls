import * as _NavigationHandler from "Search/Scenarios/Hub/NavigationHandler";
import { TfsContext, IRouteData } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { EntityTypeUrlParam } from "Search/Scenarios/Code/Constants";
import { serializeFilters, isEmpty } from "Search/Scenarios/Shared/Utils";

export class PageSource {
    public openUrlInNewtab(url: string): void {
        window.open(url, "_blank");
    }

    public navigateToAccount = (accountName: string, searchText: string, filters: IDictionaryStringTo<string[]>): void => {
        const context: TfsContext = TfsContext.getDefault(),
            presentAccount: string = context.contextData.account.name,
            params: _NavigationHandler.UrlParams = { type: EntityTypeUrlParam, text: searchText };

        if (filters && !isEmpty(filters)) {
            params.filters = serializeFilters(filters);
        }

        const url = context.getPublicActionUrl("", "search", params as IRouteData).replace(presentAccount.toLocaleLowerCase(), accountName);
        this.openUrlInNewtab(url);
    }

    public navigateToNewSearch = (searchText: string, filters: IDictionaryStringTo<string[]>): void => {
        const context: TfsContext = TfsContext.getDefault(),
            presentAccount: string = context.contextData.account.name;

        this.navigateToAccount(presentAccount, searchText, filters);
    }
}