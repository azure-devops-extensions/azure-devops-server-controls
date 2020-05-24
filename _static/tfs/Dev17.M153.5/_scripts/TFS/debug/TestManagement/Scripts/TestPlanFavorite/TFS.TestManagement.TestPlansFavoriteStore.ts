import * as Q from "q";
import TFS_Core_Utils = require("Presentation/Scripts/TFS/TFS.Core.Utils");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import * as Favorites_RestClient from "Favorites/RestClient";
import { Favorite, FavoriteCreateParameters } from "Favorites/Contracts";

export class TestPlansFavoriteStore {
    private static FAVITEM_TYPE_TEST_PLAN: string = "Microsoft.TeamFoundation.TestManagement.Plan";
    private static FAVITEM_TEST_PLAN_SCOPE : string = "Project";

    private _favoritesClient: Favorites_RestClient.FavoriteHttpClient;
    private _children: TFS_Core_Utils.Dictionary<string>;

    private _getFavoritesClient(): Favorites_RestClient.FavoriteHttpClient {
        return this._favoritesClient || (this._favoritesClient = Favorites_RestClient.getClient());
    }

    public constructor()
    {
        this._children = new TFS_Core_Utils.Dictionary<string>();
    }

    public isFavoriteItem(data: string): boolean
    {
        return this._children.containsKey(data);
    }

    public remove(favorite: string): IPromise<void> {
        let deferred = Q.defer<void>();
        if (favorite != null) {
            if (this._children && this.isFavoriteItem(favorite)) {                
                // Remove from local array
                let favoriteId = this._children.get(favorite);
                this._children.remove(favorite);
                this._getFavoritesClient().deleteFavoriteById(
                    favoriteId,
                    TestPlansFavoriteStore.FAVITEM_TYPE_TEST_PLAN,
                    TestPlansFavoriteStore.FAVITEM_TEST_PLAN_SCOPE,
                    TFS_Host_TfsContext.TfsContext.getDefault().contextData.project.id).then(
                    () => {
                        deferred.resolve(null);
                    },
                    (error: any) => {
                        this._children.set(favorite, favoriteId);
                        deferred.reject(error);
                    }
                    );
            }
        }
        return deferred.promise;
    }
    
    public createNewItem(encodedName: string, data: string): IPromise<void> {
        if (!this.isFavoriteItem(data)) {
            let deferred = Q.defer<void>();
            let projectid = TFS_Host_TfsContext.TfsContext.getDefault().contextData.project.id;
            // put a placeholder
            this._children.set(data, data);
            let favorite =
                {
                    artifactScope: { id: projectid, type: TestPlansFavoriteStore.FAVITEM_TEST_PLAN_SCOPE, name: undefined },
                    artifactName: encodedName,
                    artifactId: data,
                    artifactType: TestPlansFavoriteStore.FAVITEM_TYPE_TEST_PLAN
                } as FavoriteCreateParameters;
            this._getFavoritesClient().createFavorite(
                favorite
            ).then(
                (favitem: Favorite) => {
                    // set the correct id
                    this._children.set(favitem.artifactId, favitem.id);
                    deferred.resolve(null);
                }, (error: TfsError) => {
                    this._children.remove(data);
                    deferred.reject(error);
                }
                );
            return deferred.promise;
        } else {
            // Item is already in the favorite list. Ignore
            return Q.resolve<void>(null);
        }
    }

    public getFavoritePlanIdsfromStore(): string [] {
        return this._children.keys();
    }

    public static createTestPlanFavoriteStore(): TestPlansFavoriteStore
	{
        return new TestPlansFavoriteStore();
	}

    public static getFavoriteStore(tfsContext: TFS_Host_TfsContext.TfsContext, level: TFS_Host_TfsContext.NavigationContextLevels, identity: string): IPromise<TestPlansFavoriteStore>{
        let deferred = Q.defer<TestPlansFavoriteStore>();
        let testplanfavoritestore  = TestPlansFavoriteStore.createTestPlanFavoriteStore();
        testplanfavoritestore._getFavoritesClient().getFavorites(TestPlansFavoriteStore.FAVITEM_TYPE_TEST_PLAN, TestPlansFavoriteStore.FAVITEM_TEST_PLAN_SCOPE, tfsContext.contextData.project.id, false).then(
            (favorites: Favorite[]) =>
            {
                let children: TFS_Core_Utils.Dictionary<string> = testplanfavoritestore._children;
                favorites.forEach(
                    (value: Favorite) =>
                    {
                        children.set(value.artifactId, value.id);
                    }
                );
                deferred.resolve(testplanfavoritestore);
            },
            (error: TfsError) => {
                deferred.reject(error);
            }
        );
        return deferred.promise;
    }
}