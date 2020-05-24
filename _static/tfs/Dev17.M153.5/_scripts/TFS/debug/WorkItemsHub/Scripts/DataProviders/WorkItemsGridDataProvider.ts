import { IColumn } from "OfficeFabric/DetailsList";
import { CoreFieldRefNames } from "Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants";
import { findIndex, toDictionary } from "VSS/Utils/Array";
import { equals } from "VSS/Utils/String";
import { IWorkItemsGridData, IWorkItemsGridRow } from "WorkItemsHub/Scripts/DataContracts/IWorkItemsGridData";
import {
    WorkItemsHubColumnOption,
    WorkItemsHubData,
    WorkItemsHubSortOption,
} from "WorkItemsHub/Scripts/Generated/Contracts";
import { WorkItemsHubFilterDataSource } from "WorkItemsHub/Scripts/Stores/WorkItemsHubFilterDataSource";
import { OnOpenWorkItemHandler } from "WorkItemsHub/Scripts/Utils/NavigationUtils";
import {
    IWorkItemsGridColumnFactory,
    WorkItemsGridColumnFactory,
} from "WorkItemsHub/Scripts/Utils/WorkItemsGridColumnFactory";
import { getFieldFriendlyName } from "WorkItemsHub/Scripts/Utils/WorkItemsHubDataUtils";

/**
 * Provides data for the grid (based on the hub data and a column factory).
 */
export namespace WorkItemsGridDataProvider {

    export function buildColumns(
        projectName: string,
        hubData: WorkItemsHubData,
        sortOptions: WorkItemsHubSortOption[],
        gridColumnFactory: IWorkItemsGridColumnFactory,
        friendlyStartDateTime: Date,
        onOpenWorkItem: OnOpenWorkItemHandler): IColumn[] {

        const columnMap = _getColumnMap(hubData);
        const columnsToShow: WorkItemsHubColumnOption[] = _getColumnsToShow(hubData);

        return columnsToShow.map(column =>
            gridColumnFactory.create(
                projectName, column.fieldReferenceName,
                getFieldFriendlyName(column.fieldReferenceName, hubData.processSettings),
                columnMap,
                friendlyStartDateTime,
                onOpenWorkItem,
                _isColumnSorted(column.fieldReferenceName, sortOptions),
                _isColumnSortedDescending(column.fieldReferenceName, sortOptions),
                column.width));
    }

    export function getData(
        hubData: WorkItemsHubData,
        isFiltered: boolean,
        tagWidthsCache: IDictionaryStringTo<number>): IWorkItemsGridData {

        if (!hubData || !hubData.processSettings || !hubData.processSettings.fieldReferenceNames || (!hubData.fieldValues)) {
            return null;
        }

        const stateIndex = findIndex(hubData.processSettings.fieldReferenceNames, (fieldRefName: string) => equals(fieldRefName, CoreFieldRefNames.State, true));

        return hubData.fieldValues.map((securedData, i) => {
            const values = securedData.data;
            const id: number = values[0];
            const state: string = values[stateIndex];
            const isCompleted: boolean = findIndex(hubData.processSettings.doneStateNames, (stateName: string) => equals(stateName, state, true)) >= 0;

            // Per guidance on https://reactjs.org/docs/lists-and-keys.html#keys, we should avoid using index as key; however, our data is static and we benefit
            // noticeably as we have many rows and many elements on each.
            return { key: i.toString(10), id, isCompleted, values, tagWidthsCache } as IWorkItemsGridRow;
        });
    }

    function _getColumnMap(hubData: WorkItemsHubData): IDictionaryStringTo<number> {
        return toDictionary(hubData.processSettings.fieldReferenceNames, (fieldReferenceName) => fieldReferenceName, (_, index) => index);
    }

    function _getColumnsToShow(hubData: WorkItemsHubData): WorkItemsHubColumnOption[] {
        let columns: WorkItemsHubColumnOption[];

        if (hubData.userSettings) {
            const columnSettings = hubData.userSettings.columnSettings;
            if (columnSettings && columnSettings.columnOptions && columnSettings.columnOptions.length > 0) {
                columns = hubData.userSettings.columnSettings.columnOptions;
            }
        }

        if (!columns) {
            // Remove work item type and my activity details from default column list
            const filteredDefaultFields  = hubData.processSettings.fieldReferenceNames.filter(f => WorkItemsHubFilterDataSource.ExcludedFieldsFromDefaultColumns.indexOf(f) < 0);
            columns = filteredDefaultFields.map(fieldName =>
                ({
                    fieldReferenceName: fieldName,
                    width: WorkItemsGridColumnFactory.getDefaultColumnWidth(fieldName)
                } as WorkItemsHubColumnOption)
            );
        }

        return columns;
    }

    function _isColumnSorted(fieldReferenceName: string, sortOptions: WorkItemsHubSortOption[]): boolean {
        let sorted = false;
        if (sortOptions) {
            sortOptions.forEach(option => {
                if (equals(option.fieldReferenceName, fieldReferenceName, true)) {
                    sorted = true;
                }
            });
        }

        return sorted;
    }

    function _isColumnSortedDescending(fieldReferenceName: string, sortOptions: WorkItemsHubSortOption[]): boolean {
        let sorted = false;
        sortOptions.forEach(option => {
            if (equals(option.fieldReferenceName, fieldReferenceName, true)) {
                sorted = !option.isAscending;
            }
        });

        return sorted;
    }

}
