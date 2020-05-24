
import { Workflow } from 'TestManagement/Scripts/Scenarios/Analytics/InContextReports/Common/Types';

export class WorkflowPickerSelector {
    private propertyName: string;

    constructor(propertyName: string) {
        this.propertyName = propertyName;
    }

    public getSelectedWorkflow(properties: IDictionaryStringTo<any>): Workflow {
        return properties[this.propertyName] as Workflow;
    }
}