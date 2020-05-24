import * as Q from "q";
import * as Favorites_RestClient from "Favorites/RestClient";

import { ViewPerfScenarioManager } from "ScaledAgile/Scripts/Shared/Utils/Telemetry";

import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";

import { Favorite, FavoriteCreateParameters } from "Favorites/Contracts";
import { IPlanHubFavoritesDataProvider } from "ScaledAgile/Scripts/PlanHub/DataProviders/IPlanHubFavoritesDataProvider";

import { Plan, PlanMetadata } from "TFS/Work/Contracts";

export class PlanHubFavoritesDataProvider implements IPlanHubFavoritesDataProvider {
    public static FavoriteType: string = "Microsoft.TeamFoundation.Work.Plans";

    private _favoritesClient: Favorites_RestClient.FavoriteHttpClient3_1;

    public createFavorite(plan: Plan): IPromise<Favorite> {
        let favorite = this._createNewFavorite(plan);
        return this._getFavoritesClient().createFavorite(favorite);
    }

    public deleteFavorite(favoriteId: string): IPromise<void> {
        return this._getFavoritesClient().deleteFavoriteById(
            favoriteId,
            PlanHubFavoritesDataProvider.FavoriteType,       // artifactType
            "Project",                                       // artifactScopeType
            TfsContext.getDefault().contextData.project.id); // artifactScopeId
    }

    public getFavorites(includeExtendedDetails?: boolean): IPromise<Favorite[]> {
        ViewPerfScenarioManager.split("GetFavoritePlansStart");
        return this._getFavoritesClient().getFavorites(PlanHubFavoritesDataProvider.FavoriteType, "Project", TfsContext.getDefault().contextData.project.id, includeExtendedDetails).then(
            (favorites: Favorite[]) => {
                ViewPerfScenarioManager.split("GetFavoritePlansEnd");
                // We are returning the contract code and not a mapped version of the code => We need to do adjustments, like to cast to Date the modified date
                if (favorites) {
                    favorites.forEach(favorite => {
                        if (favorite.artifactProperties) {
                            let favoriteTyped = favorite.artifactProperties as PlanMetadata;
                            if (favoriteTyped.modifiedDate) {
                                favoriteTyped.modifiedDate = new Date(favoriteTyped.modifiedDate);
                            }
                        }
                    });
                }
                return favorites;
            },
            (error: any) => {
                ViewPerfScenarioManager.split("GetFavoritePlansEnd");
                return Q.reject(error);
            }
        );
    }

    protected _createNewFavorite(plan: Plan): FavoriteCreateParameters {
        const data: PlanMetadata = { description: plan.description, modifiedDate: plan.modifiedDate, createdByIdentity: plan.createdByIdentity, userPermissions: plan.userPermissions };
        return {
            artifactId: plan.id,
            artifactProperties: data,
            artifactType: PlanHubFavoritesDataProvider.FavoriteType,
            artifactName: plan.name,
            artifactScope: { id: TfsContext.getDefault().contextData.project.id, type: "Project", name: undefined },
            owner: undefined
        } as FavoriteCreateParameters;
    }

    protected _getFavoritesClient(): Favorites_RestClient.FavoriteHttpClient3_1 {
        return this._favoritesClient || (this._favoritesClient = Favorites_RestClient.getClient());
    }
}
