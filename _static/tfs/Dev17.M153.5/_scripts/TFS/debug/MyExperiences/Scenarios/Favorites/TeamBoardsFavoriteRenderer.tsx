import * as SDK from "VSS/SDK/Shim";
import * as Utils_String from "VSS/Utils/String";
import { Favorite } from "Favorites/Contracts";

import { IHubGroupColumn } from "MyExperiences/Scenarios/Shared/Models";
import { FavoriteHubItem } from "MyExperiences/Scenarios/Favorites/FavoriteItem";
import { FavoriteRendererHelper } from "MyExperiences/Scenarios/Favorites/FavoriteRendererHelper";
import { FavoriteHubItemData } from "MyExperiences/Scenarios/Favorites/FavoritesHubModels";
import { BaseFavoriteHubItemContribution } from "MyExperiences/Scenarios/Favorites/BaseFavoriteHubItemContribution";
import * as MyExperiencesResources from "MyExperiences/Scripts/Resources/TFS.Resources.MyExperiences";

export class TeamBoardsFavoriteRenderer extends BaseFavoriteHubItemContribution<FavoriteHubItem> {

    // Override
    public getIconClass(data: FavoriteHubItemData): string {
        // Using fabric icon in getIconName
        return "";
    }

   public getIconName(data: FavoriteHubItemData): string {
       return "BacklogBoard";
   }

    // Override
    public getArtifactDeletedMessage(data: FavoriteHubItemData): string {
        return MyExperiencesResources.Favorite_Board_DeletedMessage;
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

    /**
     * See BaseFavoriteHubItemContribution.isMatch
     */
    public isMatch(data: Favorite, query: string): boolean {
        return Utils_String.caseInsensitiveContains(data.artifactName, query);
    }

}

SDK.registerContent("accounthome.teamboardsfavoriterenderer-init", (context: SDK.InternalContentContextData): TeamBoardsFavoriteRenderer => {
    return new TeamBoardsFavoriteRenderer();
});