import { PropertyDefinition } from "VSSPreview/Config/Framework/PropertyDefinition";
import { Workflow } from 'TestManagement/Scripts/Scenarios/Analytics/InContextReports/Common/Types';

/**
 * Implementation of {PropertyDefinition} for {WorkflowPicker}
 */
export class WorkflowPickerPropertyDefinition implements PropertyDefinition {

    constructor(public name: string) { }

    canSave(properties: { [key: string]: any }): boolean {
        return true;
    }

    getDefaultValue(): any {
        return Workflow.Build;
    }
}