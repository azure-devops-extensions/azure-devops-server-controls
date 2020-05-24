
import { isPromise, makePromise, IOptionalPromise } from "Presentation/Scripts/TFS/TFS.Core.Utils";

import * as CommonHelper from "TestManagement/Scripts/Scenarios/TestTabExtension/CommonHelper";
import { IFilterDataSource, FilterValue } from "TestManagement/Scripts/Scenarios/Common/TestResultsFilter/TestResults.Filtering.Common";
import { ITestResultsFilterItem, ITestResultsFilterItemProvider, ITestResultsFilterPickListItemResult } from "TestManagement/Scripts/TestReporting/TestTabExtension/Filtering/TestResultsFilter";
import { TestResultsOutcomeFilterPivots, FilterByFields } from "TestManagement/Scripts/TestReporting/TestTabExtension/Common";
import * as Resources  from "TestManagement/Scripts/Resources/TFS.Resources.TestManagement";

/** Default filter value provider to be used if no custom one is set */
export class OutcomeFilterValueProvider implements ITestResultsFilterItemProvider {

    protected fieldName: string = FilterByFields.Outcome;
    protected dataSource: IFilterDataSource;

    constructor(dataSource: IFilterDataSource) {
        this.dataSource = dataSource;
    }

	getItems(persistedValues?: FilterValue[]): IOptionalPromise<ITestResultsFilterItem[]> {
		const uniqueValues = this.dataSource.getFieldValues(this.fieldName);

		if (isPromise(uniqueValues)) {
			return uniqueValues.then(r => this.transformResults(r, persistedValues));
		} else {
			return this.transformResults(uniqueValues, persistedValues);
		}
	}

	getItemsForValues(values: FilterValue[]): IOptionalPromise<ITestResultsFilterItem[]> {
        return this.transformResults(values);
    }

    getListItem(filterItem: ITestResultsFilterItem): ITestResultsFilterPickListItemResult {
        return {
            item: {
                key: filterItem.key,
                name: filterItem.display,
                value: filterItem.value
            }
        };
    }

    protected transformResults(uniqueValues: FilterValue[], persistedValues?: FilterValue[]): ITestResultsFilterItem[] {
        return uniqueValues.map(this.transformResult); // We don't need persistedValues as that will be part of the unique values
    }

	protected transformResult(result: FilterValue): ITestResultsFilterItem {
		let displayString: string = CommonHelper.FilterHelper.getOutcomeFilterDisplayName(result);

        return {
            key: result,
            value: result,
            display: displayString
        } as ITestResultsFilterItem;
    }
}
