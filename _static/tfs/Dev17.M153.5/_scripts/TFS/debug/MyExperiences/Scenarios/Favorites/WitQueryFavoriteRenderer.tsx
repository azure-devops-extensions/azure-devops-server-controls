import * as React from "react";
import { IHubGroupColumn, IHubItem, ColumnType} from  "MyExperiences/Scenarios/Shared/Models";
import * as TFS_Host_TfsContext from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import * as SDK from "VSS/SDK/Shim";
import * as Utils_String from "VSS/Utils/String";
import {FavoriteHubItem} from  "MyExperiences/Scenarios/Favorites/FavoriteItem";
import {Favorite, FavoriteCreateParameters}  from "Favorites/Contracts";
import * as MyExperiencesResources from "MyExperiences/Scripts/Resources/TFS.Resources.MyExperiences";
import { MyExperiencesTelemetry } from "MyExperiences/Scripts/Telemetry";
import {FavoriteRendererHelper} from  "MyExperiences/Scenarios/Favorites/FavoriteRendererHelper";
import { BaseFavoriteHubItemContribution} from "MyExperiences/Scenarios/Favorites/BaseFavoriteHubItemContribution";
import { FavoriteHubItemData } from "MyExperiences/Scenarios/Favorites/FavoritesHubModels";
import * as RichContentTooltip from "VSSPreview/Flux/Components/RichContentTooltip";

/**
 * Contribution prodiving rendering of Work Item Queries in Fabric DataList
 */
export class WitQueryFavoriteRenderer extends BaseFavoriteHubItemContribution<FavoriteHubItem> {
    public getIconClass(data: FavoriteHubItemData): string {
        return "bowtie-query-list";
    }

    public getArtifactDeletedMessage(data: FavoriteHubItemData): string {
        return MyExperiencesResources.Favorite_WitQuery_DeletedMessage;
    }

    public getArtifactMetadata(hubItemData: FavoriteHubItemData): JSX.Element {
        var path = WitQueryFavoriteRenderer.getQueryPath(hubItemData.favorite);
        return (<span title={path.fullPath} className="witquery-fullpath">{path.shortPath} </span>);
    }

    /**
     * Get list of columns with component generation factory
     */
    public getColumns(): IHubGroupColumn<FavoriteHubItem>[] {
        return [
            FavoriteRendererHelper.getIconAndNameColumnDefinition(),
            FavoriteRendererHelper.getProjectNameColumnDefinition(),
            FavoriteRendererHelper.getArtifactMetadataColumnDefinition(425)

        ];
    }

    public static getQueryPath(data: Favorite): { shortPath: string, fullPath: string } {
        var result = { fullPath: "", shortPath: "" };
        try {
            var parsed = data.artifactProperties as any;
            result.fullPath = parsed.QueryPath;
            var pathParts = parsed.QueryPath.split("/") as string[];

            // case 1: My Query/Open Bugs
            if (pathParts.length === 2) {
                result.shortPath = pathParts[0];
            }
            else if (pathParts.length > 2) {
                // If query is at deeper level, use last two folder names (last split is the query name itself)
                // case 2: Query Path1/ Query Path2/ Open bugs
                result.shortPath = pathParts[pathParts.length - 3] + "/" + pathParts[pathParts.length - 2];

                // If the query is too deep, we would append a .../ at the front to show there are more parent
                if (pathParts.length > 3) {
                    result.shortPath = ".../" + result.shortPath;
                }
            }
        }
        catch (e) {
            MyExperiencesTelemetry.LogFavoriteWITQueryPathParseException(e);
        }
        return result;
    }

    public isMatch(data: Favorite, query: string): boolean {
        var contentText = FavoriteRendererHelper.prepareSearchableText(data) + " " + WitQueryFavoriteRenderer.getQueryPath(data).fullPath;
        return FavoriteRendererHelper.isMatch(contentText, query);
    }
}

SDK.registerContent("accounthome.witqueryfavoriteitem-init", (context) => {
return new WitQueryFavoriteRenderer();
});
