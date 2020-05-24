import * as Q from "q";
import * as VSS from "VSS/VSS";
import * as _VCThrottledPathsSearchSource from "VersionControl/Scenarios/Shared/Path/ThrottledPathsSearchSource";
import * as _VCPathsSearchSource from "VersionControl/Scenarios/Shared/Path/PathsSearchSource";
import { RepositoryContext } from "VersionControl/Scripts/RepositoryContext";
import { queueModulePreload } from "VersionControl/Scripts/DeferredJobQueue";
import ThrottledSearchResults = _VCThrottledPathsSearchSource.ThrottledSearchResults;

export class LazyPathsSearchSource {
    private _throttledSource: Q.Deferred<_VCThrottledPathsSearchSource.ThrottledPathsSearchSource>;

    constructor(private repositoryContext: RepositoryContext) {
        queueModulePreload([
            "VersionControl/Scenarios/Shared/Path/ThrottledPathsSearchSource",
            "VersionControl/Scenarios/Shared/Path/PathsSearchSource",
        ]);
    }

    public getInFolderSearchResults(searchText: string, version: string, isFolder: boolean = false): IPromise<ThrottledSearchResults> {
        return this.getThrottledSource().then(filePathsSource => {
            // for folder paths we need to show next level search results
            const text = isFolder ? ensureTrailingSlash(searchText) : searchText;
            return filePathsSource.getInFolderSearchResults(text, version).then(
                searchResults => {
                    if (!searchResults.searchCancelled) {
                        // reset the search text to original
                        searchResults.results.searchText = searchText;
                    }
                    return searchResults;
                });
        });
    }

    public getGlobalSearchResults(searchText: string, version: string): IPromise<ThrottledSearchResults> {
        return this.getThrottledSource().then(filePathsSource => {
            return filePathsSource.getGlobalSearchResults(searchText, version);
        });
    }

    private getThrottledSource(): IPromise<_VCThrottledPathsSearchSource.ThrottledPathsSearchSource> {
        if (!this._throttledSource) {
            this._throttledSource = Q.defer<_VCThrottledPathsSearchSource.ThrottledPathsSearchSource>();

            VSS.using(
                [
                    "VersionControl/Scenarios/Shared/Path/ThrottledPathsSearchSource",
                    "VersionControl/Scenarios/Shared/Path/PathsSearchSource",
                ],
                (vcThrottledPathsSearchSource: typeof _VCThrottledPathsSearchSource, vcPathsSearchSource: typeof _VCPathsSearchSource) => {
                    this._throttledSource.resolve(
                        new vcThrottledPathsSearchSource.ThrottledPathsSearchSource(
                            new vcPathsSearchSource.PathsSearchSource(this.repositoryContext)));
            });
        }

        return this._throttledSource.promise;
    }
}

function ensureTrailingSlash(path: string): string {
    if (!path) {
        return path;
    }
    return path[path.length - 1] === "/" ? path : path + "/";
}
