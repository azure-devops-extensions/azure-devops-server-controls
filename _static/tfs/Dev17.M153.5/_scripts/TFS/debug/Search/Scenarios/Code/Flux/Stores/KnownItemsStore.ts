import * as VSSStore from "VSS/Flux/Store";
import * as _VCLegacyContracts from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";
import { PathSourceParams } from "Search/Scenarios/Code/Flux/ActionsHub";

export interface KnownItemsState {
    knownItems: IDictionaryStringTo<_VCLegacyContracts.ItemModel>;

    lowerCaseKnownItems: IDictionaryStringTo<_VCLegacyContracts.ItemModel>;
}

/**
 * A store containing the known items for the current version.
 * This acts as a cache and also provides extra data to components to render properly.
 */
export class KnownItemsStore extends VSSStore.Store {
    public state: KnownItemsState = {
        knownItems: {},
        lowerCaseKnownItems: {},
    };

    public reset = (): void => {
        this.state.knownItems = {};
        this.state.lowerCaseKnownItems = {};
    }

    public loadItems = (items: _VCLegacyContracts.ItemModel[], params: PathSourceParams): void => {
        if (items && items.length) {
            const sortedItems = orderItemsByParentFirst(items);
            for (const item of sortedItems) {
                if (item) {
                    this.saveItem(item, params);

                    if (item.childItems) {
                        for (const childItem of item.childItems) {
                            this.saveItem(childItem, params);
                        }
                    }
                }
            }
        }

        this.emitChanged();
    }

    private saveItem(item: _VCLegacyContracts.ItemModel, params: PathSourceParams): void {
        const { project, repositoryName, versionString } = params,
            key = createKey(item.serverItem, project, repositoryName, versionString),
            knownItem = this.state.knownItems[key];
        if (knownItem && knownItem.childItems) {
            return;
        }

        this.addToLookup(item, key);
    }

    private addToLookup(item: _VCLegacyContracts.ItemModel, key: string): void {
        this.state.knownItems[key] = item;
        this.state.lowerCaseKnownItems[key.toLowerCase()] = item;
    }
}

/**
 * Gets a new array ensuring no child is before its parent.
 */
function orderItemsByParentFirst(items: _VCLegacyContracts.ItemModel[]): _VCLegacyContracts.ItemModel[] {
    return [...items].sort(comparePathLength);
}

/**
 * Compares two items by the length of its full path.
 * Null/undefined items are considered smaller.
 */
function comparePathLength(a: _VCLegacyContracts.ItemModel, b: _VCLegacyContracts.ItemModel): number {
    const aLength = a ? a.serverItem.length : 0;
    const bLength = b ? b.serverItem.length : 0;
    return aLength === bLength
        ? 0
        : aLength < bLength
            ? -1
            : 1;
}

export function createKey(serverItem: string, project: string, repositoryName: string, versionString: string): string {
    return `${project.toLowerCase()}||${repositoryName.toLowerCase()}||${versionString.toLowerCase()}||${serverItem.toLowerCase()}||`;
}
