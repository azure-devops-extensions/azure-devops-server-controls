import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { StoreBase } from "DistributedTaskControls/Common/Stores/Base";
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";

import { ReleaseProgressStoreKeys } from "PipelineWorkflow/Scripts/ReleaseProgress/Constants";
import { IReleaseTaskAttachmentContentMetaDataPayload, ReleaseTaskAttachmentActions } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleaseTaskAttachmentActions";
import { IMarkdownMetadata } from "PipelineWorkflow/Scripts/ReleaseProgress/ReleaseEnvironment/ReleaseEnvironmentTypes";
import { ReleaseTaskAttachmentUtils } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleaseTaskAttachmentUtils";

import { autobind } from "OfficeFabric/Utilities";

export interface IReleaseTaskAttachmentViewStoreState {
    markdownMetadataArray: IMarkdownMetadata[];
}

export class ReleaseTaskAttachmentViewStore extends StoreBase {

    public static getKey(): string {
        return ReleaseProgressStoreKeys.ReleaseTaskAttachmentViewStore;
    }

    public initialize(instanceId: string): void {
        this._actionsHub = ActionsHubManager.GetActionsHub<ReleaseTaskAttachmentActions>(ReleaseTaskAttachmentActions, instanceId);

        this._actionsHub.addNewAttachmentContent.addListener(this._handleAddNewAttachmentContent);
        this._actionsHub.clearCache.addListener(this._handleClearAttachmentData);

        this._state = {
            markdownMetadataArray: []
        };
    }

    public disposeInternal(): void {
        this._actionsHub.addNewAttachmentContent.removeListener(this._handleAddNewAttachmentContent);
        this._actionsHub.clearCache.removeListener(this._handleClearAttachmentData);
    }

    public getState(): IReleaseTaskAttachmentViewStoreState {
        return this._state;
    }

    @autobind
    private _handleAddNewAttachmentContent(markdownMetadataPayload: IReleaseTaskAttachmentContentMetaDataPayload): void {
        const cacheKey = ReleaseTaskAttachmentUtils.getAttachmentContentCacheKeyId(markdownMetadataPayload.runPlanId, markdownMetadataPayload.timelineId, markdownMetadataPayload.recordId);

        if (!this._markdownMetadataEntry[cacheKey]) {
            this._state.markdownMetadataArray = ReleaseTaskAttachmentUtils.insertAttachmentAndSort(this._state.markdownMetadataArray, markdownMetadataPayload.markdownMetadata);
            this._markdownMetadataEntry[cacheKey] = true;
            this.emitChanged();        
        }
    }

    @autobind
    private _handleClearAttachmentData(): void {
        this._markdownMetadataEntry = {};
        this._state.markdownMetadataArray = [];
        this.emitChanged();
    }

    private _state: IReleaseTaskAttachmentViewStoreState;
    private _actionsHub: ReleaseTaskAttachmentActions;
    private _markdownMetadataEntry: IDictionaryStringTo<boolean> = {};
}