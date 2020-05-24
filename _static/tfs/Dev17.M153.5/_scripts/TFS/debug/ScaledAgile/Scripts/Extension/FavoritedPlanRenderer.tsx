import * as React from "react";
import * as SDK from "VSS/SDK/Shim";
import * as ScaledAgileResources from "ScaledAgile/Scripts/Resources/TFS.Resources.ScaledAgile";

import { IHubGroupColumn } from "MyExperiences/Scenarios/Shared/Models";
import { FavoriteHubItem } from "MyExperiences/Scenarios/Favorites/FavoriteItem";
import { FavoriteRendererHelper } from "MyExperiences/Scenarios/Favorites/FavoriteRendererHelper";
import { BaseFavoriteHubItemContribution } from "MyExperiences/Scenarios/Favorites/BaseFavoriteHubItemContribution";

import { Favorite } from "Favorites/Contracts";
import { PlanMetadata } from "TFS/Work/Contracts";

import { FavoritedPlanMetadataHelper } from "ScaledAgile/Scripts/Shared/Utils/FavoritedPlanMetadataHelper";
import { FavoriteHubItemData } from "MyExperiences/Scenarios/Favorites/FavoritesHubModels";
import { TooltipHost } from "VSSUI/Tooltip";

/**
 * Contribution prodiving rendering of Plans in Fabric DataList
 */
export class PlanRenderer extends BaseFavoriteHubItemContribution<FavoriteHubItem> {
    public getIconClass(data: FavoriteHubItemData): string {
        return "bowtie-plan";
    }

    public getArtifactDeletedMessage(data: FavoriteHubItemData): string {
        return ScaledAgileResources.Favorite_Plan_DeletedMessage;
    }

    public getArtifactMetadata(hubItemData: FavoriteHubItemData): JSX.Element {
        const favoriteMetadata: PlanMetadata = FavoritedPlanMetadataHelper.convertToPlanMetadata(hubItemData.favorite.artifactProperties);
        const styles: React.CSSProperties = {
            display: "inline-block",
            textOverflow: "ellipsis",
            overflow: "hidden",
            width: "100%"
        };

        return (<span title={favoriteMetadata.description} style={styles} className="plan-description" >{favoriteMetadata.description}</span>);
    }

    /**
     * Get list of columns with component generation factory
     * See BaseFavoriteHubItemContribution.getColumns
     */
    public getColumns(): IHubGroupColumn<FavoriteHubItem>[] {
        return [
            FavoriteRendererHelper.getIconAndNameColumnDefinition(),
            FavoriteRendererHelper.getProjectNameColumnDefinition(),
            FavoriteRendererHelper.getArtifactMetadataColumnDefinition()
        ];
    }

    /**
     * See BaseFavoriteHubItemContribution.isMatch
     */
    public isMatch(data: Favorite, query: string): boolean {
        return FavoriteRendererHelper.simpleMatch(data, query);
    }
}

SDK.registerContent("accounthome.planfavoriteitem-init", (context: SDK.InternalContentContextData): PlanRenderer => {
    return new PlanRenderer();
});
