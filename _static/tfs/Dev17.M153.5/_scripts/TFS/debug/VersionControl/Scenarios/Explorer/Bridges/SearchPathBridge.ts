import * as Q from "q";
import { ActionsHub } from "VersionControl/Scenarios/Explorer/ActionsHub";
import { AggregateState } from "VersionControl/Scenarios/Explorer/Stores/StoresHub";
import { LazyPathsSearchSource } from "VersionControl/Scenarios/Shared/Path/LazyPathsSearchSource";

/**
 * Implementation of action creators that handle path searching.
 */
export class SearchPathBridge {
    constructor(
        private actionsHub: ActionsHub,
        private searchSource: LazyPathsSearchSource,
        private getAggregateState: () => AggregateState) {
    }

    public startPathEditing(): IPromise<void> {
        const currentPath = this.getAggregateState().path;
        const version = this.getAggregateState().version;
        let tailoredPath = currentPath;
        if (this.getAggregateState().isGit) {
            tailoredPath = customizeGitPath(currentPath);
        }

        this.actionsHub.pathEditingStarted.invoke(tailoredPath);
        return this.searchInFolderPaths(tailoredPath, version, this.getAggregateState().isFolder);
    }

    public editPathText(text: string): IPromise<{}> {
        this.actionsHub.pathEdited.invoke(text);

        const version = this.getAggregateState().version;
        return Q.all([
            this.searchInFolderPaths(text, version),
            this.searchGlobalPaths(text, version),
        ]);
    }

    private searchInFolderPaths(searchText: string, version: string, isFolder: boolean = false): IPromise<void> {
        if (this.searchSource) {
            return this.searchSource.getInFolderSearchResults(searchText, version, isFolder).then(
                searchResults => {
                    if (!searchResults.searchCancelled) {
                        this.actionsHub.inFolderPathSearchResultsLoaded.invoke(searchResults.results);
                    }
                },
                error => this.handlePathSearchError(error));
        }
    }

    private searchGlobalPaths(searchText: string, version: string): IPromise<void> {
        if (this.searchSource) {
            return this.searchSource.getGlobalSearchResults(searchText, version).then(
                searchResults => {
                    if (!searchResults.searchCancelled) {
                        this.actionsHub.globalPathSearchResultsLoaded.invoke(searchResults.results);
                    }
                },
                error => this.handlePathSearchError(error));
        }
    }

    private handlePathSearchError(error: Error): void {
        this.actionsHub.pathSearchFailed.invoke(error);
    }
}

function ensureTrailingSlash(path: string): string {
    if (!path) {
        return path;
    }
    return path[path.length - 1] === "/" ? path : path + "/";
}

function customizeGitPath(text: string): string {
    const leadingSlashesRegex = /^[\/\\]+/;
    return text.replace(leadingSlashesRegex, "");
}
