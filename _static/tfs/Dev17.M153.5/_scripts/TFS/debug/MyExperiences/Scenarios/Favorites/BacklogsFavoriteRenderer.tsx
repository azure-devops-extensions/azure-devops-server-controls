import { Favorite } from "Favorites/Contracts";
import { BaseFavoriteHubItemContribution } from "MyExperiences/Scenarios/Favorites/BaseFavoriteHubItemContribution";
import { FavoriteHubItem } from "MyExperiences/Scenarios/Favorites/FavoriteItem";
import { FavoriteRendererHelper } from "MyExperiences/Scenarios/Favorites/FavoriteRendererHelper";
import { FavoriteHubItemData } from "MyExperiences/Scenarios/Favorites/FavoritesHubModels";
import { IHubGroupColumn } from "MyExperiences/Scenarios/Shared/Models";
import { Favorite_Backlog_DeletedMessage } from "MyExperiences/Scripts/Resources/TFS.Resources.MyExperiences";
import * as SDK from "VSS/SDK/Shim";
import { caseInsensitiveContains, empty } from "VSS/Utils/String";

export class BacklogsFavoriteRenderer extends BaseFavoriteHubItemContribution<FavoriteHubItem> {

    // Override
    public getIconName(data: FavoriteHubItemData): string {
        return "BacklogList";
    }

    // Override
    public getIconClass(data: FavoriteHubItemData): string {
        // IconName is preferred over IconClass. Implementing this method only because its marked abstract in base
        return empty;
    }

    // Override
    public getArtifactDeletedMessage(data: FavoriteHubItemData): string {
        return Favorite_Backlog_DeletedMessage;
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
        return caseInsensitiveContains(data.artifactName, query);
    }
}

SDK.registerContent("accounthome.backlogsfavoriterenderer-init", (context: SDK.InternalContentContextData): BacklogsFavoriteRenderer => {
    return new BacklogsFavoriteRenderer();
});