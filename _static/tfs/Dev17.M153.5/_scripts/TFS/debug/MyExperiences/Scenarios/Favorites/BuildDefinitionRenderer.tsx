import * as React from "react";
import {IHubGroupColumn, IHubItem, ColumnType} from  "MyExperiences/Scenarios/Shared/Models";
import * as TFS_Host_TfsContext from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import * as SDK from "VSS/SDK/Shim";
import * as Utils_String from "VSS/Utils/String";
import {FavoriteHubItem} from  "MyExperiences/Scenarios/Favorites/FavoriteItem";
import {Favorite}  from "Favorites/Contracts";
import * as MyExperiencesResources from "MyExperiences/Scripts/Resources/TFS.Resources.MyExperiences";
import { MyExperiencesTelemetry } from "MyExperiences/Scripts/Telemetry";
import {FavoriteRendererHelper} from  "MyExperiences/Scenarios/Favorites/FavoriteRendererHelper";
import { BaseFavoriteHubItemContribution } from "MyExperiences/Scenarios/Favorites/BaseFavoriteHubItemContribution";
import { FavoriteHubItemData } from "MyExperiences/Scenarios/Favorites/FavoritesHubModels";
/**
 * Contribution prodiving rendering of Build Definitions in Fabric DataList
 */
export class BuildDefinitionRenderer extends BaseFavoriteHubItemContribution<FavoriteHubItem> {
    public getIconClass(data: FavoriteHubItemData): string {
        return "bowtie-build";
    }

    public getArtifactDeletedMessage(data: FavoriteHubItemData): string {
        return MyExperiencesResources.Favorite_BuildDefinition_DeletedMessage;
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

    public isMatch(data: Favorite, query: string): boolean {
        return FavoriteRendererHelper.simpleMatch(data, query);
    }
}

SDK.registerContent("accounthome.builddefinitionfavoriteitem-init", (context) => {
    return new BuildDefinitionRenderer();
});