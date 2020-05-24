import { IFilterDataSource } from "WorkItemTracking/Scripts/Filtering/FilterManager";
import { TaskBoardModel } from "Agile/Scripts/Taskboard/TaskBoardModel";
import { FilterManager } from "WorkItemTracking/Scripts/Filtering/FilterManager";

/**
 * Placeholder class to represent TaskboardModel if it is not yet loaded
 */
export class EmptyTaskboardModel implements IFilterDataSource {

    private _filterManager: FilterManager;

    constructor() {
        this._filterManager = new FilterManager(this);
    }

    /**
     * Retrieve the name of the datasource, used in Telemetry.
     */
    public getDataSourceName(): string {
        return TaskBoardModel.DATASOURCE_NAME;
    }
    /**
     * Retrieve the total number of items, including items that are not yet paged.
     */
    public getItemCount(): number {
        return 0;
    }
    /**
     * Retrieve the set of ids used to index the data.  This should include only rows that has been paged.
     */
    public getIds(): number[] {
        return [];
    }
    /**
     * Retrieves data for a single field from the data provider.
     * @param id Id of item
     * @param fieldName Fieldname to get value for
     */
    public getValue(id: number, fieldName: string): any {
        return null;
    }
    /**
     * Retrieves the set of visible columns
     */
    public getVisibleColumns(): string[] {
        return [];
    }
    /**
     * Get all unique values from all items for a given field name
     * @param fieldName Field to get values for
     */
    public getUniqueValues(fieldName: string): string[] | IPromise<string[]> {
        return [];
    }

    /**
     * Returns a FilterManager object built from this data source
     */
    public getFilterManager(): FilterManager {
        return this._filterManager;
    }

}