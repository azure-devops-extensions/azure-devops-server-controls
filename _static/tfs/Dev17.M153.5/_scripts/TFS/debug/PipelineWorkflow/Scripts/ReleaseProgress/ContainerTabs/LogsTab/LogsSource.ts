import * as Q from "q";
import { SourceManager } from "DistributedTaskControls/Common/Sources/SourceManager";
import { ReleaseManagementSourceBase } from "PipelineWorkflow/Scripts/Common/Sources/ReleaseManagementSourceBase";

export class LogsSource extends ReleaseManagementSourceBase {

    public static getKey(): string {
        return "LogsSource";
    }

    public static instance(): LogsSource {
        return SourceManager.getSource(LogsSource);
    }

    public getLogs(releaseId: number, environmentId: number, releaseDeployPhaseId: number, taskId: number): IPromise<string> {
        return this.getClient().downloadLog(releaseId, environmentId, releaseDeployPhaseId, taskId).
            then((logs: string) => {
                return Q.resolve(logs);
            },
            (error) => {
                return Q.reject(error);
            });
    }

    public getGateLogs(releaseId: number, environmentId: number, gateId: number, taskId: number): IPromise<string> {
        return this.getClient().downloadGateLog(releaseId, environmentId, gateId, taskId);
    }
}
