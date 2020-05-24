import * as Q from "q";
import { first, union } from "VSS/Utils/Array";

import { IOptionalPromise } from "Presentation/Scripts/TFS/TFS.Core.Utils";
import {
    IWorkItemFilterItem, IWorkItemFilterPickListItemResult, workItemFilterItemComparer, IWorkItemFilterItemProvider
} from "WorkItemTracking/Scripts/Controls/Filters/WorkItemFilter";
import { FilterValue } from "WorkItemTracking/Scripts/Filtering/FilterManager";

import { IBoardFilterDataSource } from "Agile/Scripts/Board/BoardFilterDataSource";

/**
 * Filter value provider for parent work items on the board
 */
export class ParentItemFilterValueProvider implements IWorkItemFilterItemProvider {
    constructor(private _dataSource: IBoardFilterDataSource) {
    }

    getItems(persistedValues?: FilterValue[]): IOptionalPromise<IWorkItemFilterItem[]> {
        if (!this._dataSource) {
            return [];
        }

        return Q.all([this._dataSource.getParentItems(), this.getItemsForValues(persistedValues)])
            .spread((result: IWorkItemFilterItem[], persistedValuesResult: IWorkItemFilterItem[]) => {
                return union(result, persistedValuesResult, workItemFilterItemComparer);
            });
    }

    getItemsForValues(values: FilterValue[]): IOptionalPromise<IWorkItemFilterItem[]> {
        if (!this._dataSource || !values || values.length === 0) {
            return [];
        }

        return this._dataSource.getParentItems().then(items => {
            return values.map(value => {
                // Select the first item with this value as integer, since serializing from server converts it to a string
                const item = first(items, x => x.value === +value);
                // Return the found item or if not found - item with id as a display string.
                return item || {
                    key: value,
                    display: value,
                    value: value
                } as IWorkItemFilterItem;
            });
        });
    }

    getListItem(filterItem: IWorkItemFilterItem): IWorkItemFilterPickListItemResult {
        return {
            item: {
                key: filterItem.key,
                name: filterItem.display,
                value: filterItem.value
            }
        };
    }
}