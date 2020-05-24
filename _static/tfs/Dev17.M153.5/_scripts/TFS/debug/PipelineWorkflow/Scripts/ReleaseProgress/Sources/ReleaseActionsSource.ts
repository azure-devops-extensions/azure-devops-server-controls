import { SourceManager } from "DistributedTaskControls/Common/Sources/SourceManager";
import { ReleaseManagementSourceBase } from "PipelineWorkflow/Scripts/Common/Sources/ReleaseManagementSourceBase";
import { ReleaseEnvironment } from "ReleaseManagement/Core/Contracts";
import * as RMContracts from "ReleaseManagement/Core/Contracts";


export class ReleaseActionsSource extends ReleaseManagementSourceBase {

    public cancelReleaseEnvironment(releaseId: number, releaseEnvironmentId: number, comment: string): IPromise<ReleaseEnvironment> {
        return this.getClient().beginCancelReleaseEnvironment(releaseId, releaseEnvironmentId, comment);
    }

    public deployReleaseEnvironment(releaseId: number, releaseEnvironmentId: number, comment: string, deployTimeOverrideVariables?: IDictionaryStringTo<RMContracts.ConfigurationVariableValue>): IPromise<ReleaseEnvironment> {
        return this.getClient().beginDeployReleaseEnvironment(releaseId, releaseEnvironmentId, comment, deployTimeOverrideVariables);
    }

    public static getKey(): string {
        return "ReleaseActionsSource";
    }

    public static instance(): ReleaseActionsSource {
        return SourceManager.getSource(ReleaseActionsSource);
    }
}
