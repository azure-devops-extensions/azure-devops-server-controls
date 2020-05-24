import * as VSSStore from "VSS/Flux/Store";
import { ignoreCaseComparer } from "VSS/Utils/String";

import { ItemModel, TfsItem, GitItem, GitObjectType } from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";
import { VersionSpec } from "VersionControl/Scripts/TFS.VersionControl.VersionSpecs";
import * as VCFileIconPicker from "VersionControl/Scripts/VersionControlFileIconPicker";
import { getFolderName, getParentPaths, getFileName, combinePaths } from "VersionControl/Scripts/VersionControlPath";

export interface KnownItemsState {
    isGit: boolean;
    rootNodeIconClass: string;
    knownItems: IDictionaryStringTo<ItemModel>;
    lowerCaseKnownItems: IDictionaryStringTo<ItemModel>;
    iconClasses: IDictionaryStringTo<string>;
    /**
     * The paths of the temporary items before they are committed.
     * It may list separately a new file and its required new subfolders (when they didn't exist).
     */
    creatingItemPaths: string[];
}

export interface DiscardEditPayload {
    navigateVersionSpec?: VersionSpec;
}

export interface AddNewItemPayload {
    newFileItem: ItemModel;
    allRetrievedItems: ItemModel[];
    newFolders: ItemModel[];
}

/**
 * A store containing the known items for the current version.
 * This acts as a cache and also provides extra data to components to render properly.
 */
export class KnownItemsStore extends VSSStore.Store {
    public state: KnownItemsState = {
        isGit: undefined,
        rootNodeIconClass: undefined,
        knownItems: {},
        lowerCaseKnownItems: {},
        iconClasses: {},
        creatingItemPaths: undefined,
    };

    public initializeRepository = (isGit: boolean, rootNodeIconClass: string): void => {
        this.state.isGit = isGit;
        this.state.rootNodeIconClass = rootNodeIconClass;

        this.emitChanged();
    }

    public reset = (): void => {
        this.state.knownItems = {};
        this.state.lowerCaseKnownItems = {};
        this.state.iconClasses = {};

        this.emitChanged();
    }

    public addNewItem = ({ newFileItem, newFolders, allRetrievedItems }: AddNewItemPayload): void => {
        this.state.creatingItemPaths =
            [newFileItem, ...newFolders]
            .map(item => item.serverItem);

        this.loadItems([newFileItem, ...newFolders, ...allRetrievedItems]);
    }

    public loadItems = (items: ItemModel[]): void => {
        if (items && items.length) {
            const sortedItems = orderItemsByParentFirst(items);
            for (const item of sortedItems) {
                if (item) {
                    this.saveItem(item);

                    if (item.childItems) {
                        for (const childItem of item.childItems) {
                            this.saveItem(childItem);
                        }
                    }
                }
            }
        }

        this.emitChanged();
    }

    public discardEdit = ({ navigateVersionSpec }: DiscardEditPayload): void => {
        if (navigateVersionSpec) {
            this.reset();
        } else if (this.state.creatingItemPaths) {
            for (const creatingItemPath of this.state.creatingItemPaths) {
                delete this.state.knownItems[creatingItemPath];
                delete this.state.lowerCaseKnownItems[creatingItemPath.toLowerCase()];
            }

            this.state.creatingItemPaths = undefined;

            this.emitChanged();
        }
    }

    public confirmSavedItems = (paths: string[]): void => {
        this.state.creatingItemPaths = undefined;

        for (const path of paths) {
            delete this.state.knownItems[path];
            delete this.state.lowerCaseKnownItems[path.toLowerCase()];

            // Delete parent folder too, because childItems may be stale after a rename/delete.
            const parentPath = getFolderName(path);
            delete this.state.knownItems[parentPath];
            delete this.state.lowerCaseKnownItems[parentPath.toLowerCase()];
        }

        this.emitChanged();
    }

    private saveItem(item: ItemModel): void {
        const knownItem = this.state.knownItems[item.serverItem];
        if (knownItem && knownItem.contentMetadata && !item.contentMetadata) {
            return;
        }

        if (knownItem && knownItem.childItems && !item.childItems) {
            return;
        }

        this.addToLookup(item, item.serverItem);

        if (this.state.isGit) {
            this.ensureCompactedParentsAreKnown(item);
        } else {
            this.addCasingVariants(item);
        }
    }

    private addCasingVariants(item: ItemModel) {
        const isCasingCorrect = getParentPaths(item.serverItem).every(ancestor => Boolean(this.state.knownItems[ancestor]));
        if (!isCasingCorrect) {
            const parentPath = getFolderName(item.serverItem);

            for (const variant of this.findCasingVariants(parentPath)) {
                this.addToLookup(item, combinePaths(variant, getFileName(item.serverItem)));
            }
        }
    }

    private findCasingVariants(path: string): string[] {
        return Object.keys(this.state.knownItems)
            .filter(existing => ignoreCaseComparer(existing, path) === 0 && existing !== path);
    }

    /**
     * Detects which parents are compacted on the provided items and adds new ItemModels for them to the lookup.
     * It must be called after all retrieved parents have been added to lookup.
     */
    private ensureCompactedParentsAreKnown(item: ItemModel): void {
        let parentPath = getFolderName(item.serverItem);
        while (!this.state.knownItems[parentPath]) {
            this.addToLookup(copyItem(parentPath, item), parentPath);
            parentPath = getFolderName(parentPath);
        }
    }

    private addToLookup(item: ItemModel, key: string): void {
        this.state.knownItems[key] = item;
        this.state.lowerCaseKnownItems[key.toLowerCase()] = item;

        this.state.iconClasses[key] = this.calculateItemIconClass(item);
    }

    private calculateItemIconClass(item: ItemModel): string {
        if (isRoot(item.serverItem, this.state.isGit)) {
            return this.state.rootNodeIconClass;
        } else if ((item as TfsItem).isBranch) {
            return "bowtie-tfvc-branch";
        } else if ((item as GitItem).gitObjectType === GitObjectType.Commit) {
            return "bowtie-repository-submodule";
        } else if (item.isSymLink) {
            return "bowtie-file-symlink";
        } else if (item.isFolder) {
            return "bowtie-folder";
        } else {
            return VCFileIconPicker.getIconNameForFile(item.serverItem);
        }
    }
}

/**
 * Gets whether the path belongs to a root item.
 * Like "/" in Git or "$/Team" in TFVC.
 * No need to worry about "$" because we never represent that level with an ItemModel.
 */
function isRoot(path: string, isGit: boolean): boolean {
    if (isGit) {
        return path === "/";
    } else {
        const slashCount = path.split("/").length - 1;
        return slashCount === 1;
    }
}

/**
 * Gets a new array ensuring no child is before its parent.
 */
function orderItemsByParentFirst(items: ItemModel[]): ItemModel[] {
    return [...items].sort(comparePathLength);
}

/**
 * Compares two items by the length of its full path.
 * Null/undefined items are considered smaller.
 */
function comparePathLength(a: ItemModel, b: ItemModel): number {
    const aLength = a ? a.serverItem.length : 0;
    const bLength = b ? b.serverItem.length : 0;
    return aLength === bLength
        ? 0
        : aLength < bLength
        ? -1
        : 1;
}

function copyItem(serverItem: string, baseItem: ItemModel): ItemModel {
    return {
        ...baseItem,
        serverItem,
    };
}
