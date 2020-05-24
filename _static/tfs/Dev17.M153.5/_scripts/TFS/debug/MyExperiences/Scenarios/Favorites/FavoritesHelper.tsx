import * as React from "react";
import {FavoritesHubStore} from "MyExperiences/Scenarios/Favorites/FavoritesHubStore";
import {StarComponent} from "Favorites/Controls/StarComponent";
import * as ComponentBase from "VSS/Flux/Component";
import {FavoriteHubItemData} from "MyExperiences/Scenarios/Favorites/FavoritesHubModels";
import * as TFS_OM_Common from "Presentation/Scripts/TFS/TFS.OM.Common";
import {FavoritesHubActionsCreator} from "MyExperiences/Scenarios/Favorites/FavoritesHubActionsCreator";
import {FavoritesHubDataProvider} from "MyExperiences/Scenarios/Favorites/FavoritesHubDataProvider";
import {Favorite, FavoriteCreateParameters}  from "Favorites/Contracts";
import { FeatureAvailabilityFlags } from "Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants";
import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";

export class FavoritesHelper {
    /**
     * Create a favorite structure for a given project
     * @param projectId ID of the project
     * @param projectName Name of the project
     */
    public static createProjectFavorite(projectId: string, projectName: string): FavoriteCreateParameters {

        return {
            artifactType: TFS_OM_Common.FavoriteItem.FAVITEM_TYPE_PROJECT,
            artifactId: projectId,
            projectId: projectId,
            artifactScope: {
                type: "Project",
                id: projectId,
                name: projectName
            },
            artifactName: projectName,
            artifactProperties: undefined, //Note: We do want to remove this as part of creation contract.
            owner: undefined               //Owner is optional for support of future Admin Scenarios. When unspecified, it is auto-set to the current user.
        } as FavoriteCreateParameters;
    }

    /**
     * Create a favorite structure for a given team
     * @param projectId ID of the project
     * @param projectName Name of the project
     * @param teamId ID of the team
     * @param teamName Name of the team
     */
    public static createTeamFavorite(projectId: string, projectName: string, teamId: string, teamName: string): FavoriteCreateParameters {
        return {
            artifactType: TFS_OM_Common.FavoriteItem.FAVITEM_TYPE_TEAM,
            artifactId: teamId,
            artifactScope: { id: projectId, type: "Project", name: projectName },
            artifactName: teamName,
            artifactProperties: undefined //Note: We do want to remove this as part of creation contract.
        } as FavoriteCreateParameters;
    };
}