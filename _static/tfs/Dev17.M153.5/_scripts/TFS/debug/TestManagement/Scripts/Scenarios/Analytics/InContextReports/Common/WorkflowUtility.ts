
import * as Resources from "TestManagement/Scripts/Resources/TFS.Resources.TestManagement";
import { Workflow } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Common/Types";

interface Metadata {
    displayName: string;
}

export class WorkflowUtility {

    private static metadata: {[key: number]: Metadata}  = {
        [Workflow.Build]: {
            displayName: Resources.Workflow_Build,
        },
        [Workflow.Release]: {
            displayName: Resources.Workflow_Release,
        },
    };

    public static getDisplayName(workflow: Workflow): string {
        return this.metadata[workflow].displayName;
    }

}