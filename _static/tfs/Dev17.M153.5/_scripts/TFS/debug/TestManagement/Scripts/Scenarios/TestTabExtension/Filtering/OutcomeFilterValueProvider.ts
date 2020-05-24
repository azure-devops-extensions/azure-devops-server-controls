import * as CommonHelper from "TestManagement/Scripts/Scenarios/TestTabExtension/CommonHelper";
import { FilterValue } from "TestManagement/Scripts/Scenarios/Common/TestResultsFilter/TestResults.Filtering.Common";
import { ITestResultsFilterItem, ITestResultsFilterPickListItem, ITestResultsFilterItemProvider } from "TestManagement/Scripts/Scenarios/Common/TestResultsFilter/Components/TestResultsFilter";

export class OutcomeFilterValueProvider implements ITestResultsFilterItemProvider {

	getItemsForValues(values: FilterValue[]): ITestResultsFilterItem[] {
		return this.transformResults(values);
	}

	getListItem(filterItem: ITestResultsFilterItem): ITestResultsFilterPickListItem {
		return {
			key: filterItem.key,
			name: filterItem.display,
			value: filterItem.value
		};
	}

	protected transformResults(uniqueValues: FilterValue[]): ITestResultsFilterItem[] {
		return uniqueValues.map(this.transformResult);
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