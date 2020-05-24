import { flatten } from "VSS/Utils/Array";

import { GitRefFavorite, RefFavoriteType, TypeInfo } from "TFS/VersionControl/Contracts";
import { GitRepositoryContext } from "VersionControl/Scripts/GitRepositoryContext";
import { getGitRefService, IGitRefService } from "VersionControl/Scripts/Services/GitRefService";
import { CachedSource } from "VersionControl/Scripts/Sources/Source";

/**
 * Updates favorite branches (refs and folders).
 */
export class RefFavoriteSource extends CachedSource {
    private static DATA_ISLAND_PROVIDER_ID: string = "ms.vss-code-web.pull-request-detail-data-provider";
    private static DATA_ISLAND_CACHE_PREFIX: string = "TFS.VersionControl.PullRequestDetailProvider";

    private refService: IGitRefService;

    constructor(private repositoryContext: GitRepositoryContext) {
        super(RefFavoriteSource.DATA_ISLAND_PROVIDER_ID, RefFavoriteSource.DATA_ISLAND_CACHE_PREFIX);

        this.refService = getGitRefService(repositoryContext);
    }

    public getRefFavorites(filterNames: string[]): IPromise<GitRefFavorite[]> {
        return Promise.all(filterNames.map(this.getRefFavoriteFromCache)).then(results => {
            const areAllCached = filterNames.length > 0 && results.every(Boolean);
            if (areAllCached) {
                return flatten(results);
            } else {
                return this.refService.getFavorites();
            }
        });
    }

    public addToFavorites(name: string, isFolder: boolean): IPromise<GitRefFavorite> {
        return this.refService.createFavorite({
            favorite: {
                repositoryId: this.repositoryContext.getRepositoryId(),
                name,
                type: isFolder ? RefFavoriteType.Folder : RefFavoriteType.Ref,
            } as GitRefFavorite,
        });
    }

    public removeFromFavorites(favoriteId: number): IPromise<void> {
        return this.refService.deleteFavorite({
            favoriteId,
        });
    }

    private getRefFavoriteFromCache = (name: string): IPromise<GitRefFavorite[]> => {
        const cached = this.fromCacheAsync<GitRefFavorite[]>(
            "GitRefFavorite." + name,
            TypeInfo.GitRefFavorite);

        return cached || Promise.resolve(null);
    }
}
