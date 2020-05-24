import * as _RepositorySource from "Search/Scenarios/Code/Flux/Sources/RepositorySource";
import * as _VCLegacyContracts from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";
import * as _VCRepositoryContext from "VersionControl/Scripts/RepositoryContext";
import * as _FilePathsSource from "Search/Scenarios/Code/Flux/Sources/FilePathsSource";
import * as KnownPathsStore from "Search/Scenarios/Code/Flux/Stores/KnownPathsStore";
import { createKey } from "Search/Scenarios/Code/Flux/Stores/KnownItemsStore";
import { normalizePath, isGitRepo, getParentPaths } from "Search/Scenarios/Code/Utils";
import { PathSourceParams } from "Search/Scenarios/Code/Flux/ActionsHub";
import { AggregatedState } from "Search/Scenarios/Code/Flux/StoresHub";
import { TfvcRootPath, ErrorTypeKeys } from "Search/Scenarios/Code/Constants";

export interface ItemRetrievalInvokers {
    itemRetrieved: (requestedPath: string, items: _VCLegacyContracts.ItemModel[], params: PathSourceParams) => void;
    itemRetrievalFailed: () => void;
    initialItemsRetrieved: (requestedPath: string, items: _VCLegacyContracts.ItemModel[], params: PathSourceParams) => void;
    knowItemsFetched: (requestedPath: string, items: _VCLegacyContracts.ItemModel[], params: PathSourceParams) => void;
    treeItemExpanding: (path: string) => void;
    treeItemExpanded: (path: string) => void;
    udpateDefaultPath: (path: string) => void;
    filePathsRetrievalFailed: (project: string, repoName: string) => void;
    filePathsRetrieved: (requestedPath: string, filePaths: string[], params: PathSourceParams) => void;
    knownFilePathsRetrieved: (requestedPath: string, filePaths: string[], params: PathSourceParams) => void;
}

/**
 * Implementation of action creators that retrieve items.
 */
export class ItemRetrievalBridge {
    constructor(
        private readonly invokers: ItemRetrievalInvokers,
        private readonly repositorySource: _RepositorySource.RepositorySource,
        private readonly filePathsSource: _FilePathsSource.FilePathsSource,
        private readonly getAggregateState: () => AggregatedState) {
    }

    public getFolders = (defaultPath: string, params: PathSourceParams, repositoryContext: _VCRepositoryContext.RepositoryContext): void => {
        const { project, repositoryName, versionString } = params,
            isGit = isGitRepo(repositoryName),
            rootPath = isGit ? repositoryContext.getRootPath() : repositoryName,
            requestedPath = defaultPath || rootPath;

        this.invokers.udpateDefaultPath(normalizePath(requestedPath, isGit, rootPath));

        const isBigRepo = this.isBigRepo(project, repositoryName);

        // Donot try to fetct all paths at once if the repository in question is huge containing > 200000 files.
        if (isGit && !isBigRepo) {
            // Try fetching all items at once. If it fails try fetching items lazily.
            this.tryFetchAll(requestedPath, params, repositoryContext);
        }
        else {
            // For Tfvc or big git repos we always load the items lazyly.
            this.fetchOneRecursionLevel(requestedPath, params, repositoryContext);
        }
    }

    public expandTreeItem(folderPath: string, params: PathSourceParams, repositoryContext: _VCRepositoryContext.RepositoryContext): void {        
        const { project, repositoryName, versionString } = params,
            isGit = isGitRepo(repositoryName),
            rootPath = isGit ? repositoryContext.getRootPath() : repositoryName;

        folderPath = normalizePath(folderPath, isGit, rootPath);

        if (this.areAllPathsLoaded(project, repositoryName, versionString) ||
            this.isPathReadyForDisplay(folderPath, project, repositoryName, versionString)) {
            this.invokers.treeItemExpanded(folderPath);
        }
        else {
            this.invokers.treeItemExpanding(folderPath);

            this.fetchAndExpandFolder(folderPath, params, repositoryContext);
        }
    }

    /**
     * Method made public for stubbing purposes in L0s
     */
    public getErrorTypeKey = (error): string => {
        const { serverError } = error;
        return serverError.typeKey;
    }

    private fetchAndExpandFolder(path: string, params: PathSourceParams, repositoryContext: _VCRepositoryContext.RepositoryContext): void {
        const { project, repositoryName, versionString } = params;
        if (project && repositoryName) {
            const itemDescriptor = { path, version: versionString };
            this.repositorySource
                .getItems([itemDescriptor], repositoryContext)
                .then((fetchedItems: _VCLegacyContracts.ItemModel[]) => {
                    this.invokers.itemRetrieved(path, fetchedItems, params);
                }, reject => {
                    this.invokers.treeItemExpanded(path);
                });
        }
    }

    private isPathReadyForDisplay(path: string, project: string, repoName: string, version: string): boolean {
        const item = this.getKnownItem(path, project, repoName, version);
        return item && item.isFolder && !!item.childItems;
    }

    private getKnownItem(path: string, project: string, repoName: string, version: string): _VCLegacyContracts.ItemModel {
        const { knownItemsState } = this.getAggregateState();
        const { lowerCaseKnownItems } = knownItemsState;

        return lowerCaseKnownItems[createKey(path, project, repoName, version)];
    }

    private getMissingAndKnownPaths(
        path: string,
        project: string,
        repoName: string,
        version: string): {
            knownPaths: string[],
            unknownPaths: string[]
        } {
        // We don't want tfvc root path to be there for which the items are fetched.
        const allPaths = [path, ...getParentPaths(path)].filter(p => p !== TfvcRootPath);
        const unknownPaths: string[] = allPaths.filter(folder => !this.isPathReadyForDisplay(folder, project, repoName, version));
        const knownPaths: string[] = allPaths.filter(folder => this.isPathReadyForDisplay(folder, project, repoName, version));

        return {
            knownPaths,
            unknownPaths
        }
    }

    private getAllItems(path: string, project: string, repoName: string, version: string): _VCLegacyContracts.ItemModel[] {
        const knownItem = this.getKnownItem(path, project, repoName, version);
        if (!knownItem.childItems) {
            return [knownItem];
        }
        else {
            let knownItems = [];
            knownItem.childItems.forEach(f => {
                knownItems = knownItems.concat(this.getAllItems(f.serverItem, project, repoName, version));
            });

            return [knownItem].concat(knownItems);
        }
    }

    private getFilePaths = (
        project: string,
        repoName: string,
        versionString: string,
        repositoryContext: _VCRepositoryContext.RepositoryContext): IPromise<string[]> => {
        return this.filePathsSource
            .getFilePaths(project, repoName, versionString, repositoryContext);
    }

    private getKnownPaths(project: string, repoName: string, version: string): string[] {
        const { knownPathsState } = this.getAggregateState(),
            knownPaths = knownPathsState.knownPaths[KnownPathsStore.createKey(project, repoName, version)];

        return knownPaths;
    }

    private isBigRepo(project: string, repoName: string): boolean {
        const { knownPathsState } = this.getAggregateState();
        return knownPathsState.bigRepos[project.toLowerCase()] &&
            knownPathsState.bigRepos[project.toLowerCase()].indexOf(repoName.toLowerCase()) > -1;
    }

    private tryFetchAll(requestedPath: string, params: PathSourceParams, repositoryContext: _VCRepositoryContext.RepositoryContext): void {
        const { project, repositoryName, versionString } = params;
        const knownPaths = this.getKnownPaths(project, repositoryName, versionString);
        if (knownPaths && knownPaths.length) {
            this.invokers.knownFilePathsRetrieved(requestedPath, knownPaths, params);
        }
        else {
            this.getFilePaths(project, repositoryName, versionString, repositoryContext)
                .then(paths => {
                    this.invokers.filePathsRetrieved(requestedPath, paths, params);
                }, error => {
                    const errorTypeKeyString = this.getErrorTypeKey(error);
                    // If no of file paths exceeded max threshold => mark the repo as a big repo.
                    if (errorTypeKeyString &&
                        errorTypeKeyString.toLowerCase() === ErrorTypeKeys.GitFilePathsMaxCountExceededException.toLowerCase()) {
                        this.invokers.filePathsRetrievalFailed(project, repositoryName)
                    }

                    // On failure fallback to lazy item retrieval
                    this.fetchOneRecursionLevel(requestedPath, params, repositoryContext);
                });
        }
    }

    private fetchOneRecursionLevel(requestedPath: string, params: PathSourceParams, repositoryContext: _VCRepositoryContext.RepositoryContext): void {
        const { project, repositoryName, versionString } = params;
        const missingAndKnownPaths = this.getMissingAndKnownPaths(requestedPath, project, repositoryName, versionString);

        // Fetch unknown items
        if (missingAndKnownPaths.unknownPaths.length) {
            const itemDescriptors = missingAndKnownPaths
                .unknownPaths
                .map(f => { return { path: f, version: versionString } });
            this.repositorySource
                .getItems(itemDescriptors, repositoryContext)
                .then((fetchedItems: _VCLegacyContracts.ItemModel[]) => {
                    this.invokers.initialItemsRetrieved(requestedPath, fetchedItems, params);
                }, reject => this.invokers.itemRetrievalFailed());
        }

        // Retrieve known items from KnownItemsStore
        if (missingAndKnownPaths.knownPaths.length) {
            let knownItems = [];
            missingAndKnownPaths.knownPaths.forEach(f =>
                knownItems = knownItems.concat(this.getAllItems(f, project, repositoryName, versionString)));

            this.invokers.knowItemsFetched(requestedPath, knownItems, params);
        }
    }

    private areAllPathsLoaded(project: string, repoName: string, version: string): boolean {
        const { knownPathsState } = this.getAggregateState();
        const allFilePaths = knownPathsState.knownPaths[KnownPathsStore.createKey(project, repoName, version)];
        return !!allFilePaths;
    }
}
