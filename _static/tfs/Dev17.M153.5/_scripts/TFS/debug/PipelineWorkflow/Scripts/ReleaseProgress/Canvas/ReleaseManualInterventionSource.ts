/**
* @brief Source for functionality related to Pipeline Definition
*/
import { SourceManager } from "DistributedTaskControls/Common/Sources/SourceManager";
import { ReleaseManagementSourceBase } from "PipelineWorkflow/Scripts/Common/Sources/ReleaseManagementSourceBase";
import * as RMContracts from "ReleaseManagement/Core/Contracts";

/**
 * @brief Source for DeployPipeline definition
 */
export class ReleaseManualInterventionSource extends ReleaseManagementSourceBase {

    public static getKey(): string {
        return "ReleaseManualInterventionSource";
    }

    public static instance(): ReleaseManualInterventionSource {
        return SourceManager.getSource(ReleaseManualInterventionSource);
    }

    public resumeManualIntervention(comment: string, manualInterventionId: number, releaseId: number): IPromise<RMContracts.ManualIntervention> {
        const updateInfo: RMContracts.ManualInterventionUpdateMetadata = {
            status: RMContracts.ManualInterventionStatus.Approved,
            comment: comment
        };

        return this.getClient().updateManualIntervention(updateInfo, manualInterventionId, releaseId);
    }
    
    public rejectManualIntervention(comment: string, manualInterventionId: number, releaseId: number): IPromise<RMContracts.ManualIntervention> {
        const updateInfo: RMContracts.ManualInterventionUpdateMetadata = {
            status: RMContracts.ManualInterventionStatus.Rejected,
            comment: comment
        };

        return this.getClient().updateManualIntervention(updateInfo, manualInterventionId, releaseId);
    }
}
