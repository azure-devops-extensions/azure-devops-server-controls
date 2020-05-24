import * as React from "react";
import { IHubGroupColumn } from "MyExperiences/Scenarios/Shared/Models";
import * as TFS_Host_TfsContext from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import * as SDK from "VSS/SDK/Shim";
import * as Utils_String from "VSS/Utils/String";
import { FavoriteHubItem } from "MyExperiences/Scenarios/Favorites/FavoriteItem";
import { Favorite } from "Favorites/Contracts";
import * as MyExperiencesResources from "MyExperiences/Scripts/Resources/TFS.Resources.MyExperiences";
import { FavoriteRendererHelper } from "MyExperiences/Scenarios/Favorites/FavoriteRendererHelper";
import { BaseFavoriteHubItemContribution } from "MyExperiences/Scenarios/Favorites/BaseFavoriteHubItemContribution";
import { FavoriteHubItemData } from "MyExperiences/Scenarios/Favorites/FavoritesHubModels";

export class DashboardRenderer extends BaseFavoriteHubItemContribution<FavoriteHubItem> {
    public getIconClass(data: FavoriteHubItemData): string {
        return "bowtie-dashboard";
    }

    public getArtifactDeletedMessage(data: FavoriteHubItemData): string {
        return MyExperiencesResources.Favorite_Dashboard_DeletedMessage;
    }

    public getArtifactMetadata(hubItemData: FavoriteHubItemData): JSX.Element {
        return (<span className="dashboard-team"> {DashboardRenderer.getDashboardTeam(hubItemData.favorite)} </span>);
    }

    /**
     * Get list of columns with component generation factory
     */
    public getColumns(): IHubGroupColumn<FavoriteHubItem>[] {
        return [
            FavoriteRendererHelper.getIconAndNameColumnDefinition(),
            FavoriteRendererHelper.getProjectNameColumnDefinition(),
            FavoriteRendererHelper.getArtifactMetadataColumnDefinition(445)
        ];
    }

    public static getDashboardTeam(data: Favorite): string {
        var parsed = data.artifactProperties as any;
        var teamName: string = "";

        if (parsed.TeamName != undefined) {
            teamName = parsed.TeamName;
        }

        return teamName;
    }

    public isMatch(data: Favorite, query: string): boolean {
        return FavoriteRendererHelper.simpleMatch(data, query);
    }
}

SDK.registerContent("accounthome.dashboardfavoriteitem-init", (context) => {
    return new DashboardRenderer();
});