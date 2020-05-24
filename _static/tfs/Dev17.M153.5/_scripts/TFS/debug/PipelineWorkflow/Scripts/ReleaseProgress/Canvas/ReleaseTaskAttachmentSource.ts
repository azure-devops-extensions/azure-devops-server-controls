import * as Q from "q";

import { SourceManager } from "DistributedTaskControls/Common/Sources/SourceManager";
import { ReleaseManagementSourceBase } from "PipelineWorkflow/Scripts/Common/Sources/ReleaseManagementSourceBase";
import { ReleaseProgressSourceKeys } from "PipelineWorkflow/Scripts/ReleaseProgress/Constants";
import { ReleaseTaskAttachmentUtils } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleaseTaskAttachmentUtils";

import * as RMContracts from "ReleaseManagement/Core/Contracts";

import { format } from "VSS/Utils/String";

export class ReleaseTaskAttachmentSource extends ReleaseManagementSourceBase {

    public static getKey(): string {
        return ReleaseProgressSourceKeys.ReleaseTaskAttachmentSource;
    }

    public static instance(): ReleaseTaskAttachmentSource {
        return SourceManager.getSource(ReleaseTaskAttachmentSource);
    }

    public static dispose(): void {
        return ReleaseTaskAttachmentSource.instance().disposeInternal();
    }

    public getReleaseTaskAttachments(releaseId: number, environmentId: number, attemptId: number, planId: string): IPromise<RMContracts.ReleaseTaskAttachment[]> {
        if (!this._releaseTaskAttachmentsPromise[planId]) {
            return this.getClient().getReleaseTaskAttachments(releaseId, environmentId, attemptId, planId, this._TASK_ATTACHMENT_TYPE).then((releaseTaskAttachments: RMContracts.ReleaseTaskAttachment[]) => {
                this._releaseTaskAttachmentsPromise[planId] = Q.resolve(releaseTaskAttachments);
                return this._releaseTaskAttachmentsPromise[planId];
            }, (error) => {
                return Q.reject(error);
            });
        }

        return this._releaseTaskAttachmentsPromise[planId];
    }

    public getReleaseTaskAttachmentContent(releaseId: number, environmentId: number, attemptId: number, planId: string, timelineId: string, recordId: string, type: string, name: string): IPromise<string> {
        const cacheKey = ReleaseTaskAttachmentUtils.getAttachmentContentCacheKeyId(planId, timelineId, recordId);

        if (!this._releaseTaskAttachmentContentPromise[cacheKey]) {
            return this.getClient().getReleaseTaskAttachmentContent(releaseId, environmentId, attemptId, planId, timelineId, recordId, type, name).then((taskAttachmentContent: string) => {
                this._releaseTaskAttachmentContentPromise[cacheKey] = Q.resolve(taskAttachmentContent);
                return this._releaseTaskAttachmentContentPromise[cacheKey];
            }, (error) => {
                return Q.reject(error);
            });
        }
        return this._releaseTaskAttachmentContentPromise[cacheKey];
    }

    private _releaseTaskAttachmentsPromise: IDictionaryStringTo<IPromise<RMContracts.ReleaseTaskAttachment[]>> = {};
    private _releaseTaskAttachmentContentPromise: IDictionaryStringTo<IPromise<string>> = {};
    private readonly _TASK_ATTACHMENT_TYPE: string = "Distributedtask.Core.Summary";
}
