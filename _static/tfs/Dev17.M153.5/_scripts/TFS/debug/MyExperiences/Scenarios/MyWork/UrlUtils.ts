import * as Locations from "VSS/Locations";
import * as Contracts_Platform from "VSS/Common/Contracts/Platform";
import * as TFS_OM_Identities from "Presentation/Scripts/TFS/TFS.OM.Identities";

export function getWorkItemEditUrl(project: string, id: number): string {
    return Locations.urlHelper.getMvcUrl(
        {
            level: Contracts_Platform.NavigationContextLevels.Project,
            project: project,
            action: "edit",
            controller: "workitems",
            parameters: [id.toString(10)],
            queryParams: {
                fullScreen: "true"
            }
        }
    );
}

/**
 * SearchConstants = require("Search/Scripts/Common/TFS.Search.Constants")
 *
 * The reason for this is that we can't take a dependency on 'Search' otherwise build will break...
 */
export function getGlobalWorkItemSearchUrlHelper(SearchConstants): (filter: string) => string {
    return (filter: string) => {
        let queryParams = {
            [SearchConstants.SearchConstants.ProviderIdParameterName]: SearchConstants.SearchConstants.WorkItemEntityTypeId,
        };

        if (!!filter) {
            queryParams[SearchConstants.SearchConstants.ActionTextParameterNameInUrl] = SearchConstants.SearchConstants.SearchActionName;
            queryParams[SearchConstants.SearchConstants.SearchTextParameterName] = filter;
        }

        return Locations.urlHelper.getMvcUrl(
            {
                level: Contracts_Platform.NavigationContextLevels.Collection,
                controller: SearchConstants.SearchConstants.SearchControllerName,
                queryParams: queryParams
            }
        ).replace("+", "%20"); // The Search endpoint does not support '+' for some reason...
    };
}

export function getProjectUrl(project: string): string {
    return Locations.urlHelper.getMvcUrl({ level: Contracts_Platform.NavigationContextLevels.Project, project: project });
}

export function getIdentityImageUrl(uniquefiedName: string): string {
    var identity = TFS_OM_Identities.IdentityHelper.parseUniquefiedIdentityName(uniquefiedName);
    return getIdentityImageUrlByIdentity(identity);
}

export function getIdentityImageUrlByIdentity(identity: TFS_OM_Identities.IIdentityReference): string {
    if (identity) {
        return TFS_OM_Identities.IdentityHelper.getIdentityImageUrl(identity, TFS_OM_Identities.IdentityImageMode.ShowGenericImage, TFS_OM_Identities.IdentityImageSize.Small);
    }
    else {
        return Locations.urlHelper.getVersionedContentUrl("notassigned-user.svg");
    }
}
