import * as Q from "q";

import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import * as ActionBase from "DistributedTaskControls/Common/Actions/Base";

import { IReleaseTaskAttachmentContentMetaDataPayload, ReleaseTaskAttachmentActions } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleaseTaskAttachmentActions";
import { ReleaseTaskAttachmentSource } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleaseTaskAttachmentSource";
import { ReleaseProgressActionCreatorKeys } from "PipelineWorkflow/Scripts/ReleaseProgress/Constants";
import { ReleaseDeploymentAttemptHelper } from "PipelineWorkflow/Scripts/ReleaseProgress/ReleaseEnvironment/ReleaseDeploymentAttemptHelper";
import { IMarkdownMetadata } from "PipelineWorkflow/Scripts/ReleaseProgress/ReleaseEnvironment/ReleaseEnvironmentTypes";
import { ReleaseDeployPhaseHelper } from "PipelineWorkflow/Scripts/Shared/Environment/ReleaseDeployPhaseHelper";

import { DeployPhaseStatus, ReleaseDeployPhase, ReleaseEnvironment, ReleaseTaskAttachment } from "ReleaseManagement/Core/Contracts";
import { TaskAttachment } from "TFS/DistributedTask/Contracts";

export class ReleaseTaskAttachmentActionCreator extends ActionBase.ActionCreatorBase {

    public static getKey(): string {
        return ReleaseProgressActionCreatorKeys.ReleaseTaskAttachmentActionCreator;
    }

    public initialize(instanceId?: string): void {
        this._actionsHub = ActionsHubManager.GetActionsHub<ReleaseTaskAttachmentActions>(ReleaseTaskAttachmentActions, instanceId);
    }

    public updateTaskAttachmentItems(releaseId: number, environment: ReleaseEnvironment): IPromise<void> {
        const deploySteps = environment.deploySteps;

        const latestAttempt = ReleaseDeploymentAttemptHelper.getLatestDeploymentAttempt(deploySteps);
        let taskAttachmentPromises: IPromise<ReleaseTaskAttachment[]>[] = [];

        // loop over phases
        if (latestAttempt && latestAttempt.releaseDeployPhases) {
            latestAttempt.releaseDeployPhases.forEach((releaseDeployPhase: ReleaseDeployPhase) => {

                if (ReleaseDeployPhaseHelper.isPhaseCompleted(releaseDeployPhase)) {

                    const releaseTaskAttachmentPromise = ReleaseTaskAttachmentSource.instance().getReleaseTaskAttachments(releaseId, environment.id, latestAttempt.attempt, releaseDeployPhase.runPlanId);            
                    taskAttachmentPromises.push(releaseTaskAttachmentPromise);

                    return releaseTaskAttachmentPromise.then((attachmentItems: ReleaseTaskAttachment[]) => {

                        let attachmentContentPromises: IPromise<string>[] = [];

                        attachmentItems.forEach((attachmentItem: ReleaseTaskAttachment) => {
                            const contentPromise = ReleaseTaskAttachmentSource.instance().getReleaseTaskAttachmentContent(releaseId, environment.id, latestAttempt.attempt, releaseDeployPhase.runPlanId, attachmentItem.timelineId, attachmentItem.recordId, attachmentItem.type, attachmentItem.name);
                            attachmentContentPromises.push(contentPromise);
                            contentPromise.then((attachmentContent: string) => {
                                const markdownMetadata: IMarkdownMetadata = {
                                    environment: environment,
                                    fileInfo: attachmentItem,
                                    markDownText: attachmentContent
                                };

                                const markdownMetadataPayload: IReleaseTaskAttachmentContentMetaDataPayload = {
                                    markdownMetadata: markdownMetadata,
                                    recordId: attachmentItem.recordId,
                                    runPlanId: releaseDeployPhase.runPlanId,
                                    timelineId: attachmentItem.timelineId
                                };

                                this._actionsHub.addNewAttachmentContent.invoke(markdownMetadataPayload);

                                return Q.resolve();
                            });
                        });

                        return Q.all<string>(attachmentContentPromises).then((attachmentContent: string[]) => {
                            return Q.resolve();
                        });
                    });
                }
            });

            return Q.all<ReleaseTaskAttachment[]>(taskAttachmentPromises).then((taskAttachments: ReleaseTaskAttachment[][]) => {
                return Q.resolve();
            });
        }
    }

    public clearCache(): void {
        this._actionsHub.clearCache.invoke(null);
        ReleaseTaskAttachmentSource.dispose();
    }
    
    private _actionsHub: ReleaseTaskAttachmentActions;
}