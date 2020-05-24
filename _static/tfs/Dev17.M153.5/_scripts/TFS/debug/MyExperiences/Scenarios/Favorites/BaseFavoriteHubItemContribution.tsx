import * as React from "react";
import {IHubGroupColumn, IHubItem} from  "MyExperiences/Scenarios/Shared/Models";
import {FavoriteHubItem} from  "MyExperiences/Scenarios/Favorites/FavoriteItem";
import {Favorite}  from "Favorites/Contracts";
import { FavoriteHubItemData } from "MyExperiences/Scenarios/Favorites/FavoritesHubModels";

/** Base class for contributions rendering favorites on Fabric datalist */
export abstract class BaseFavoriteHubItemContribution<T extends IHubItem> {
    /** Test if the item matches entered query, return true if it does, false otherwise */
    abstract isMatch(data: Favorite, query: string): boolean;

    /** Generates a list of column definitions (which contain component generator factories for cells) */
    abstract getColumns(): IHubGroupColumn<T>[];

    /**
     * Get the css class represention of the icon to be used with this favorite type
     */
    abstract getIconClass(hubItemData: FavoriteHubItemData): string;

    /**
     * Get the message to show when the artifact is deleted. 
     */
    abstract getArtifactDeletedMessage(hubItemData: FavoriteHubItemData): string;

    /**
     * rendering of the artifact metadata. Individual favorite renderers can override this to control how this is to be rendered. 
     * @param hubItemData
     */
    public getArtifactMetadata(hubItemData: FavoriteHubItemData): JSX.Element {
        return null;
    }

    /**
     * Get the display name if its different than the artifact name for the favorite. Individual favorite renderers can override this to make their own selection on the display name. 
     */
    public getDisplayName(hubItemData: FavoriteHubItemData): string {
        return hubItemData.favorite.artifactName;
    }

    /** Sorting logic for item within the group */
    public compareItems(data1: Favorite, data2: Favorite): number {
        return data1.artifactName.localeCompare(data2.artifactName);
    }

    /**
     * Get hex icon color 
     * @param hubItemData
     */
    public getIconColor(hubItemData: FavoriteHubItemData): string {
        return null;
    }

    /**
     * Get the name for the icon to be used for the favorite type. This will be preferrer
     * over the icon class if one is provided. 
     */
    public getIconName(hubItemData: FavoriteHubItemData): string {
        return null;
    }
}