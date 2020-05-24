import { first } from "VSS/Utils/Array";
import { format, ignoreCaseComparer } from "VSS/Utils/String";

import { ChangeItemOptions } from "VersionControl/Scenarios/Explorer/ActionsHub";
import { getKnownItem, isKnownNonexistent } from "VersionControl/Scenarios/Explorer/Bridges/KnownItemsUtils";
import { RepositorySource, ItemDescriptor } from "VersionControl/Scenarios/Explorer/Sources/RepositorySource";
import { KnownItemsState } from "VersionControl/Scenarios/Explorer/Stores/KnownItemsStore";
import { queueModulePreload } from "VersionControl/Scripts/DeferredJobQueue";
import { ItemModel, FileContentMetadata } from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import { Scenario } from "VersionControl/Scripts/TFS.VersionControl.FileDefaultContentProvider.Scenario";
import { VersionSpec, GitBranchVersionSpec } from "VersionControl/Scripts/TFS.VersionControl.VersionSpecs";
import { getFileExtension, getParentPaths, normalizePath, getFolderName } from "VersionControl/Scripts/VersionControlPath";

export interface GetItemOptions extends ChangeItemOptions {
    hasChangedPath?: boolean;
    hasChangedVersion?: boolean;
    needsContentMetadata?: boolean;
    forceFetch?: boolean;
}

export interface GetItemResult {
    item: ItemModel;
    isKnownNonexistent: boolean;
}

export interface AggregateState {
    isGit: boolean;
    rootPath: string;
    path: string;
    version: string;
    knownItemsState: KnownItemsState;
}

export interface TreeItemExpandedPayload {
    folderPath: string;
    allRetrievedItems?: ItemModel[];
}

export interface ItemRetrievalInvokers {
    itemRetrieved(requestedPath: string, currentItem: ItemModel, items: ItemModel[], notFoundError: Error): void;
    treeItemExpanded(payload: TreeItemExpandedPayload): void;
    treeItemExpanding(folderPath: string): void;
}

export type AddNewFileFunction = (newFilePath: string, version: string, scenario?: string, retrievedItems?: ItemModel[]) => void;

/**
 * Implementation of action creators that retrieve items.
 */
export class ItemRetrievalBridge {
    private addNewFile: AddNewFileFunction | undefined;

    constructor(
        private readonly invokers: ItemRetrievalInvokers,
        private readonly repositorySource: RepositorySource,
        private readonly getAggregateState: () => AggregateState) {
    }

    public setAddNewFileFunction(addNewFile: AddNewFileFunction | undefined): void {
        this.addNewFile = addNewFile;
    }

    /**
     * If the item is known, returns it, otherwise fetches it and any missing parent item.
     * When they are retrieved, itemRetrieved will be invoked.
     * If any parent has children loaded and it doesn't contain the path, fetch won't happen
     * and isKnownNonexistent will be turned on.
     */
    public getItem = (
        path: string,
        versionSpec: VersionSpec,
        options: GetItemOptions = {},
    ): GetItemResult => {
        const version = versionSpec.toVersionString();
        const itemDescriptors = this.getMissingItemDescriptors(path, version, options.needsContentMetadata, options.forceFetch);

        if (itemDescriptors.length) {
            this.repositorySource.getItems(itemDescriptors, options.needsContentMetadata).then(
                items => this.handleFetchItems(path, versionSpec, items, options),
                error => this.invokers.itemRetrieved(path, undefined, [], error));
        }

        const item = this.getKnownItem(path);
        return {
            item,
            isKnownNonexistent: !item && itemDescriptors.length === 0,
        };
    }

    public expandTreeItem(folderPath: string): void {
        const { isGit, rootPath } = this.getAggregateState();
        folderPath = normalizePath(folderPath, isGit, rootPath);

        if (this.isPathReadyForDisplay(folderPath, false)) {
            this.invokers.treeItemExpanded({ folderPath });
        } else {
            this.invokers.treeItemExpanding(folderPath);

            this.fetchAndExpandFolder(folderPath);
        }
    }

    public fetchAndExpandFolder(folderPath: string): void {
        const { version } = this.getAggregateState();
        const itemDescriptors = this.getMissingItemDescriptors(folderPath, version);
        if (itemDescriptors.length) {
            this.repositorySource.getItems(itemDescriptors, false)
                .then(
                    allRetrievedItems => this.invokers.treeItemExpanded({ folderPath, allRetrievedItems }),
                    error => this.invokers.itemRetrieved(folderPath, undefined, [], error));
        }
    }

    private handleFetchItems(
        requestedPath: string,
        requestedVersionSpec: VersionSpec,
        items: ItemModel[],
        { createIfNew, hasChangedPath, hasChangedVersion }: GetItemOptions,
    ): void {
        const aggregateState = this.getAggregateState();
        const requestedVersion = requestedVersionSpec.toVersionString();
        if (aggregateState.version !== requestedVersion) {
            return;
        }

        let currentPath = aggregateState.path;
        let currentItem =
            findItem(items, currentPath) ||
            this.getKnownItem(currentPath);

        let notFoundError: Error;
        const onlyChangedVersion = hasChangedVersion && !hasChangedPath;
        if (!currentItem && requestedPath === currentPath && onlyChangedVersion) {
            currentItem = items.filter(item => item)[0];
            if (currentItem) {
                notFoundError = new Error(format(VCResources.ExplorerPathNotFoundInVersion, currentPath, getVersionFriendlyName(requestedVersionSpec)));
                currentPath = currentItem.serverItem;
            }
        }

        if (!currentItem && createIfNew) {
            this.addNewFile(currentPath, requestedVersion, Scenario.MissingFile, items);
        } else {
            if (hasChangedVersion) {
                this.repositorySource.changeUserDefaultVersion(requestedVersionSpec);
            }

            // There's always at least one item on this code path,
            // otherwise we would have gotten a 404 and enter the error path in getItems.
            this.invokers.itemRetrieved(requestedPath, currentItem, items, notFoundError);
        }
    }

    private getMissingItemDescriptors(path: string, version: string, needsContentMetadata: boolean = false, forceFetch: boolean = false): ItemDescriptor[] {
        const allPaths = [path, ...getParentPaths(path)];
        const hasChangedVersion = this.getAggregateState().version !== version;

        let unknownPaths: string[];
        if (forceFetch || hasChangedVersion) {
            unknownPaths = allPaths;
        } else {
            unknownPaths = allPaths.filter(folder =>
                !this.isPathReadyForDisplay(folder, path === folder && needsContentMetadata));

            const shortestUnknownPath = unknownPaths[unknownPaths.length - 1];
            if (shortestUnknownPath && isKnownNonexistent(shortestUnknownPath, this.getAggregateState().knownItemsState)) {
                unknownPaths = [];
            }
        }

        const tfvcCollectionRoot = "$/";
        return unknownPaths
            .filter(folder => folder !== tfvcCollectionRoot || this.repositorySource.isCollectionLevel() || folder === path)
            .map(folder => ({ path: folder, version }));
    }

    private isPathReadyForDisplay(path: string, needsContentMetadata: boolean): boolean {
        return isItemReadyForDisplay(this.getKnownItem(path), needsContentMetadata);
    }

    private getKnownItem(path: string) {
        return getKnownItem(path, this.getAggregateState().knownItemsState);
    }
}

export function findItem(items: ItemModel[], path: string): ItemModel | undefined {
    return items.filter(item => item && ignoreCaseComparer(item.serverItem, path) === 0)[0];
}

export function isItemReadyForDisplay(item: ItemModel, needsContentMetadata: boolean): boolean {
    return item && !!(item.isFolder
        ? item.childItems
        : (item.contentMetadata || !needsContentMetadata));
}

function startsWith(text: string, part: string): boolean {
    return text.substring(0, part.length) === part;
}

export function getVersionFriendlyName(versionSpec: VersionSpec) {
    if (versionSpec instanceof GitBranchVersionSpec) {
        return format(VCResources.BranchVersionDisplayText, versionSpec.branchName);
    } else {
        return versionSpec.toDisplayText();
    }
}
