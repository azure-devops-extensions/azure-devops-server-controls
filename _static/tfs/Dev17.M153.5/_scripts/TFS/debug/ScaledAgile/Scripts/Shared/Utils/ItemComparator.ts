import {IItem} from "ScaledAgile/Scripts/Shared/Models/IItem";
const MaxBacklogOrderValue = Math.pow(2, 32);

export class ItemComparator {
    /**
     * Comparer for Items. Sorting is ascending on the Product Backlog Order field.
     * @param items The items to be sorted
     * @param orderFieldRefName Reference name of field specifying backlog order
     */
    public sortSameLevelItems(items: IItem[], orderFieldRefName: string): IItem[] {
        let itemsClone = items.slice(0);

        const itemsMap = this._getItemsMap(itemsClone);
        itemsClone.sort((a: IItem, b: IItem) => this._sameLevelCompare(a, b, orderFieldRefName, itemsMap));
        return itemsClone;
    }

    private _getItemsMap(items: IItem[]): IDictionaryNumberTo<IItem> {
        let itemsMap: IDictionaryNumberTo<IItem> = {};

        for (let item of items) {
            itemsMap[item.id] = item;
        }

        return itemsMap;
    }

    /**
     * Comparer for Items. Sorting is ascending on the Product Backlog Order field.
     * @param a The first item
     * @param b The second item
     * @param orderField The order field
     * @param itemsMap The id to IItem dictionary
     * @returns Returns 0 if value1==value2, less than 0 if value1 < value2, greater than 0 if value1 > value2.
     */
    protected _sameLevelCompare(a: IItem, b: IItem, orderField: string, itemsMap: IDictionaryNumberTo<IItem>): number {
        if (a.id == null || b.id == null) {
            throw new Error("id is required for item");
        }

        // If either of the items is a temporary item and if the order value is not present in either of them, use id to compare them.
        // temporary items are placed before real items
        if ((a.id < 0 || b.id < 0)
            && !(a.getFieldValue(orderField) && b.getFieldValue(orderField))) {
            return a.id - b.id;
        }

        let item1Ancestors = this._getAncestors(a.id, itemsMap);
        let item2Ancestors = this._getAncestors(b.id, itemsMap);        

        let item1Ancestor: IItem;
        let item1AncestorValue: number;

        let item2Ancestor: IItem;
        let item2AncestorValue: number;

        let l = Math.max(item1Ancestors.length, item2Ancestors.length);
        for (let i = 0; i < l; i++) {
            if (item1Ancestors[i] == null) {
                return -1;
            } else if (item2Ancestors[i] == null) {
                return 1;
            } else if (item1Ancestors[i] !== item2Ancestors[i]) {
                item1Ancestor = itemsMap[item1Ancestors[i]];
                item1AncestorValue = item1Ancestor.getFieldValue(orderField);
                if (item1AncestorValue === null || item1AncestorValue === undefined) {
                    item1AncestorValue = MaxBacklogOrderValue;
                }

                item2Ancestor = itemsMap[item2Ancestors[i]];
                item2AncestorValue = item2Ancestor.getFieldValue(orderField);
                if (item2AncestorValue === null || item2AncestorValue === undefined) {
                    item2AncestorValue = MaxBacklogOrderValue;
                }

                return (item1AncestorValue - item2AncestorValue) ||
                    (item1Ancestor.id - item2Ancestor.id);
            }
        }

        return a.id - b.id;
    }

    /**
     * Get the Ancestors of the item, the item itself is included in the result.
     * @param id the id of the item
     * @param itemsMap the id to item dictionary
     */
    private _getAncestors(id: number, itemsMap: IDictionaryNumberTo<IItem>): number[] {
        let ancestorIds: number[] = [];

        let parentId = itemsMap[id] && itemsMap[id].parentId;
        while (parentId && itemsMap[parentId]) {
            ancestorIds.push(parentId);
            parentId = itemsMap[parentId].parentId;
        }

        ancestorIds.push(id);
        return ancestorIds;
    }
}
