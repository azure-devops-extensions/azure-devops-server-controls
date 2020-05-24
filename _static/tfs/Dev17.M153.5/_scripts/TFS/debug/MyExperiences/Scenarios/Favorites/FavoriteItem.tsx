/// <reference types="react" />
/// <reference types="react-dom" />

import { IHubGroupColumn, IHubItem} from  "MyExperiences/Scenarios/Shared/Models";
import {FavoriteHubItemData} from  "MyExperiences/Scenarios/Favorites/FavoritesHubModels";
import {FavoritesHubActionsCreator} from  "MyExperiences/Scenarios/Favorites/FavoritesHubActionsCreator";
import * as React from "react";
import {BaseFavoriteHubItemContribution} from "MyExperiences/Scenarios/Favorites/BaseFavoriteHubItemContribution";
import { StarView } from "Favorites/Controls/StarView";
import { FavoritesHubDataProvider } from "MyExperiences/Scenarios/Favorites/FavoritesHubDataProvider";
import { FavoritesHubStore } from "MyExperiences/Scenarios/Favorites/FavoritesHubStore";
import * as ErrorUtils from "MyExperiences/Scenarios/MyWork/ErrorUtils";

export interface FavoriteLineProps {
    /** Payload data reflecting the favorite that needs to be rendered */
    lineData: FavoriteHubItemData;

    actionCreator: FavoritesHubActionsCreator;
}

/**
 * Helper that constructs all columns needed by favorite line on favorites hub
 */
export class FavoriteItemHelper {

    /**
     * Interrogates contribution and returns list of columns to be rendered
     * @param contribution
     */
    public static makeColumns(contribution: BaseFavoriteHubItemContribution<FavoriteHubItem>, actionCreator: FavoritesHubActionsCreator, dataProvider: FavoritesHubDataProvider, store: FavoritesHubStore): IHubGroupColumn<FavoriteHubItem>[] {
        var ret = contribution.getColumns();
        ret.push(
            {
                minWidth: 25, // bowtie
                maxWidth: 25,
                createCell: item => {
                    return {
                        content: (<StarView
                            artifact={item.data.favorite}
                            actionsCreator={actionCreator}
                            dataProvider={dataProvider}
                            store={store}
                            serviceInstanceId={item.data.contribution.properties.serviceInstanceType} />)
                    };
                }
            }
        );
        return ret;
    }
}


/**
 * Line-level contract between datalist and store, allowing filtering and getting line ID
 */
export class FavoriteHubItem implements IHubItem {
    public data: FavoriteHubItemData;
    public iconName: string;
    public iconClass: string;
    public iconColor: string;
    public displayName?: string;
    public deletedArtifactMessage: string;
    public artifactMetaDataElement: JSX.Element;


    constructor(data: FavoriteHubItemData) {
        this.data = data;
    }

    /**
     * Return unique row id
     */
    public getId(): string {
        return this.data.favorite.id;
    }

    /**
     * Return true if favorite line matches the query, and when the query string is empty.
     * If provider implementation throws for any reason, returns false, and publishes error telemetry.
     * @param query
     */
    public isMatch(query: string): boolean {
        if (!query || query.trim().length === 0) {
            return true;
        } else {
            try
            {
                return this.data.contributionInstance.isMatch(this.data.favorite, query);
            }
            catch (e)
            {
                ErrorUtils.publishError("FavoriteItem.isMatch_" + this.data.favorite.artifactType, e);
                return false;
            }
        }
    }

    /**
     * Returns true if favorited item was deleted
     */
    public isDisabled(): boolean {
        return this.data.favorite.artifactIsDeleted;
    }
}
