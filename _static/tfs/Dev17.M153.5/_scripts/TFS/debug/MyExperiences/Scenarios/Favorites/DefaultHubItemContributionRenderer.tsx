import { Favorite } from "Favorites/Contracts";

import * as Utils_String from "VSS/Utils/String";

import { IHubGroupColumn } from "MyExperiences/Scenarios/Shared/Models";
import {FavoriteRendererHelper} from  "MyExperiences/Scenarios/Favorites/FavoriteRendererHelper";
import { FavoriteHubItem } from "MyExperiences/Scenarios/Favorites/FavoriteItem";
import { FavoriteHubItemData } from "MyExperiences/Scenarios/Favorites/FavoritesHubModels";
import { BaseFavoriteHubItemContribution } from "MyExperiences/Scenarios/Favorites/BaseFavoriteHubItemContribution";
import * as MyExperiencesResources from "MyExperiences/Scripts/Resources/TFS.Resources.MyExperiences";

/**
 * A default renderer, that uses data from the contribution for the favorite type. 
 */
export class DefaultHubItemContributionRenderer extends BaseFavoriteHubItemContribution<FavoriteHubItem> {
    public getIconName(data: FavoriteHubItemData): string {
        return data.contribution.properties.iconName;
    }

    public getIconClass(data: FavoriteHubItemData): string {
        return data.contribution.properties.icon;
    }

    public getArtifactDeletedMessage(data: FavoriteHubItemData): string {
        return data.contribution.properties.artifactDeletedMessage ||
            Utils_String.format(MyExperiencesResources.ArtifactDeletedFormat,
            data.contribution.properties.singularName);
    }

    public getColumns(): IHubGroupColumn<FavoriteHubItem>[] {
        return [
            FavoriteRendererHelper.getIconAndNameColumnDefinition(),
            FavoriteRendererHelper.getProjectNameColumnDefinition(),
            FavoriteRendererHelper.getArtifactMetadataColumnDefinition(425)
        ];
    }

    public isMatch(data: Favorite, query: string): boolean {
        return FavoriteRendererHelper.simpleMatch(data, query);
    }
}