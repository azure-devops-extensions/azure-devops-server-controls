import * as ActionBase from "DistributedTaskControls/Common/Actions/Base";

import { ReleaseProgressActionKeys } from "PipelineWorkflow/Scripts/ReleaseProgress/Constants";
import { IMarkdownMetadata } from "PipelineWorkflow/Scripts/ReleaseProgress/ReleaseEnvironment/ReleaseEnvironmentTypes";

export interface IReleaseTaskAttachmentContentMetaDataPayload {
    markdownMetadata: IMarkdownMetadata;
    runPlanId: string;
    timelineId: string;
    recordId: string;
}

export class ReleaseTaskAttachmentActions extends ActionBase.ActionsHubBase {

    public static getKey(): string {
        return ReleaseProgressActionKeys.ReleaseTaskAttachmentActions;
    }

    public initialize(instanceId: string): void {
        this._addNewAttachmentContent = new ActionBase.Action<IReleaseTaskAttachmentContentMetaDataPayload>();
        this._clearCache = new ActionBase.Action<ActionBase.IEmptyActionPayload>();
    }

    public get addNewAttachmentContent(): ActionBase.Action<IReleaseTaskAttachmentContentMetaDataPayload> {
        return this._addNewAttachmentContent;
    }

    public get clearCache(): ActionBase.Action<ActionBase.IEmptyActionPayload> {
        return this._clearCache;
    }

    private _addNewAttachmentContent: ActionBase.Action<IReleaseTaskAttachmentContentMetaDataPayload>;
    private _clearCache: ActionBase.Action<ActionBase.IEmptyActionPayload>;
}