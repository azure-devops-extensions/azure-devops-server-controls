import { PropertyDefinition } from "VSSPreview/Config/Framework/PropertyDefinition";
import { Filters } from 'TestManagement/Scripts/TestReporting/Widgets/Config/Components/Filters';
import { Workflow } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Common/Types";

/**
 * Implementation of {PropertyDefinition} for {FiltersPicker}
 */
export class FiltersPickerPropertyDefinition implements PropertyDefinition {

    constructor(
        public name: string,
    ) {}

    canSave(properties: IDictionaryStringTo<any>): boolean {
        return true;
    }

    getDefaultValue(): Filters {
        return {
            branches: [],
            owners: [],
            stages: [],
            testFiles: [],
            testRuns: [],
            workflows: [Workflow.Build],
        };
    }
}