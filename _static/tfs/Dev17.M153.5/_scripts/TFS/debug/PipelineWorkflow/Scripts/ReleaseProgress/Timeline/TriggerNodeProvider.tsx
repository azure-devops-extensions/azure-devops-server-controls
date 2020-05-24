import { ReleaseDeploymentAttemptHelper } from "PipelineWorkflow/Scripts/ReleaseProgress/ReleaseEnvironment/ReleaseDeploymentAttemptHelper";
import * as Types from "PipelineWorkflow/Scripts/ReleaseProgress/Timeline/Timeline.types";
import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";
import { IdentityHelper } from "PipelineWorkflow/Scripts/Shared/Utils/IdentityHelper";

import * as RMContracts from "ReleaseManagement/Core/Contracts";

import { empty } from "VSS/Utils/String";
import { VssIconType, IVssIconProps } from "VSSUI/VssIcon";

export class TriggerNodeProvider implements Types.ITimelineSnapshotDetailsProvider {

    public constructor(
        private _deploymentAttempt: RMContracts.DeploymentAttempt
    ) {
    }

    public getKey(): string {
        return "trigger-snapshot";
    }
    
    public getIconProps(): IVssIconProps {
        return {
            iconName: "bowtie-trigger environment-triggered",
            iconType: VssIconType.bowtie
        };
    }

    public getInitializeSnapshot(): Types.InitializeSnapshot {
        return this._initializeTriggerSnapshot;
    }

    public getHeaderData(instanceId?: string): Types.ISnapshotHeaderData {
        let header = empty;

        switch (this._deploymentAttempt.reason) {
            case RMContracts.DeploymentReason.Automated:
                header = Resources.TimelineHeaderAutomaticTrigger;
                break;
            case RMContracts.DeploymentReason.Manual:
                header = Resources.TimelineHeaderManualTrigger;
                break;
            case RMContracts.DeploymentReason.Scheduled:
                header = Resources.TimelineHeaderScheduledTrigger;
                break;
        }

        return {
            name: header
        } as Types.ISnapshotHeaderData;
    }

    public getDescriptionData(): Types.SnapshotDescriptionDataType {
        let descriptionData: Types.ISnapshotDescriptionData = {
            timeStampDescriptionPrefix: Resources.TimelineDescriptionDeploymentTriggeredPrefix
        };

        switch (this._deploymentAttempt.reason) {
            case RMContracts.DeploymentReason.Manual:
                if (this._deploymentAttempt.requestedBy) {
                    descriptionData.users = [{
                        displayName: this._deploymentAttempt.requestedBy.displayName,
                        imageUrl: IdentityHelper.getIdentityAvatarUrl(this._deploymentAttempt.requestedBy)
                    }];
                }
            case RMContracts.DeploymentReason.Automated:
            case RMContracts.DeploymentReason.Scheduled:
                descriptionData.timeStamp = this._deploymentAttempt.queuedOn;
                break;
        }

        return descriptionData;
    }

    public getAdditionalContent(): JSX.Element {
        return null;
    }

    private _initializeTriggerSnapshot = (resource: ReleaseDeploymentAttemptHelper, callback: (marker: Date) => void) => {
        const deploymentAttempt = resource.getDeploymentAttempt();
        callback(deploymentAttempt ? deploymentAttempt.queuedOn : null);
    }
}