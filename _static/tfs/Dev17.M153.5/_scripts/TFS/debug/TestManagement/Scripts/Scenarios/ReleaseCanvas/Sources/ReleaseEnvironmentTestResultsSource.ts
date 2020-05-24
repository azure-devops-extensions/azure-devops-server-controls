import { TestResultSummary } from "TFS/TestManagement/Contracts";
import { ServiceManager as TMServiceManager, ITestResultsService } from "TestManagement/Scripts/TFS.TestManagement.Service";

export class ReleaseEnvironmentTestResultsSource {
    public fetchTestResultSummaryForEnvironment(releaseId: number, releaseEnvId: number): IPromise<TestResultSummary> {
        const publishContext = "CD";
        let service: ITestResultsService = TMServiceManager.instance().testResultsService();

        return service.getTestReportForRelease(releaseId, releaseEnvId, publishContext, false);
    }
}