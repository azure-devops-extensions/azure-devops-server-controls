import { getClient as getFavoritesClient } from "Favorites/RestClient";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { FavoriteCreateParameters, Favorite } from "Favorites/Contracts";
import { toNativePromise } from "VSSPreview/Utilities/PromiseUtils";

const ARTIFACT_SCOPE_TYPE = "Project";

export interface IDirectoryFavoriteService {
    /** Create a favorite from a team id and name */
    createFavorite(teamId: string, teamName: string): Promise<Favorite>;
    /** Delete a favorite by favorite id */
    deleteFavorite(favoriteId: string): Promise<void>;
}

export class DirectoryFavoriteService implements IDirectoryFavoriteService {
    private _favoriteType: string;

    constructor(favoriteType: string) {
        this._favoriteType = favoriteType;
    }

    public createFavorite(teamId: string, teamName: string): Promise<Favorite> {
        const favoriteParameters: FavoriteCreateParameters = {
            artifactId: teamId,
            artifactProperties: {},
            artifactName: teamName,
            artifactType: this._favoriteType,
            artifactScope: {
                id: this._getProjectIdFromContext(),
                type: ARTIFACT_SCOPE_TYPE,
                name: null
            },
            owner: null
        };

        return toNativePromise(getFavoritesClient().createFavorite(favoriteParameters));
    }

    public deleteFavorite(favoriteId: string): Promise<void> {
        return toNativePromise(getFavoritesClient().deleteFavoriteById(
            favoriteId,
            this._favoriteType,
            ARTIFACT_SCOPE_TYPE,
            this._getProjectIdFromContext()
        ));
    }

    /**
     * Get project id from context
     */
    private _getProjectIdFromContext(): string {
        return TfsContext.getDefault().contextData.project.id;
    }
}