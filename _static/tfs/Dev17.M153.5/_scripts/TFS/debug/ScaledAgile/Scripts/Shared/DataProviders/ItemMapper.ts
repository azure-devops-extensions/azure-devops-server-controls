import { IItem } from "ScaledAgile/Scripts/Shared/Models/IItem";
import { Item } from "ScaledAgile/Scripts/Shared/Models/Item";
import { WorkItem } from "WorkItemTracking/Scripts/TFS.WorkItemTracking";
import { WorkItemUtils } from "Agile/Scripts/Common/Utils";

export interface IItemMapper {
    /**
     * Convert WorkItemTracking WorkItem object models into shallow Items consumable by Item/Card component
     * @param input a full work item objects
     * @returns transformed data into IItem
     */
    mapWorkItemToItem(input: WorkItem): IItem;
}

export class ItemMapper {
    /**
     * Map each server side work item to client side item/card
     * @param workItem single server side work item
     * @returns single client side item
     */
    public mapWorkItemToItem(workItem: WorkItem): IItem {
        let parentId = this._getParentId(workItem);
        // The "unique" ID is always the standard ID, unless this work item has not yet been saved.
        // In that case, this ID will be the temporary ID (negative value).
        let id = workItem.getUniqueId();

        let fieldData = {} as IDictionaryStringTo<any>;
        for (let key in workItem.fieldMap) {
            if (workItem.fieldMap.hasOwnProperty(key)) {
                let field = workItem.fieldMap[key];
                if (field && field.fieldDefinition) {
                    let fieldRefName = field.fieldDefinition.referenceName;
                    fieldData[fieldRefName] = workItem.getFieldValue(fieldRefName);
                }
            }
        };

        return new Item(id, fieldData, parentId);
    }

    private _getParentId(workItem: WorkItem): number {
        let parentLink = WorkItemUtils.getWorkItemParentLink(workItem);
        if (parentLink) {
            return parentLink.linkData.ID;
        }

        return null;
    }
}