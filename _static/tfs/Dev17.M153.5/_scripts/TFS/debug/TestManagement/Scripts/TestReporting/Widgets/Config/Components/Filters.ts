import { Workflow } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Common/Types";

export interface Filters {
    workflows: Workflow[];
    branches: string[];
    stages: string[];
    testRuns: string[];
    testFiles: string[];
    owners: string[];
}