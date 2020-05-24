import { ChartMetric, GroupBy, TestOutcome, GroupingProperty } from 'TestManagement/Scripts/Scenarios/Analytics/InContextReports/Common/Types';
import { PropertyDefinition } from "VSSPreview/Config/Framework/PropertyDefinition";

export interface TestMetricSettings {
    metric: ChartMetric,
    testOutcomes: TestOutcome[],
    groupBy: GroupingProperty
}

/**
 * Implementation of {PropertyDefinition} for {TestMetricPicker}
 */
export class TestMetricPickerPropertyDefinition implements PropertyDefinition {

    constructor(
        public name: string,
        private isSecondary: boolean
    ) {
    }

    canSave(properties: IDictionaryStringTo<any>): boolean {
        return true;
    }

    getDefaultValue() {
        const metric = this.isSecondary ? ChartMetric.None : ChartMetric.ResultCount;
        return {
            metric: metric,
            testOutcomes: [ TestOutcome.Failed ],
            groupBy: GroupingProperty.None
        }
    }
}