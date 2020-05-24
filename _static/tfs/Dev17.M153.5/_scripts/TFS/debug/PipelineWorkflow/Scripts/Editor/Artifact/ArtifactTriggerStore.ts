/**
 * Store for Artifact Trigger View
 */

import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { DataStoreBase, IStoreState } from "DistributedTaskControls/Common/Stores/Base";
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { Telemetry, Feature, Properties } from "DistributedTaskControls/Common/Telemetry";
import { JQueryWrapper } from "DistributedTaskControls/Common/JQueryWrapper";
import { DtcUtils } from "DistributedTaskControls/Common/Utilities";

import {
    PipelineDefinition,
    PipelineTriggerBase,
    PipelineArtifactSourceTrigger,
    PipelineTriggerType
} from "PipelineWorkflow/Scripts/Common/Types";
import { PipelineArtifactFilter } from "PipelineWorkflow/Scripts/Common/Types";
import { ArtifactTriggerConditionStore, IArtifactTriggerConditionViewState, IArtifactTriggerConditionOptions } from "PipelineWorkflow/Scripts/SharedComponents/ArtifactTriggerCondition/ArtifactTriggerConditionStore";
import { DeployPipelineStoreKeys } from "PipelineWorkflow/Scripts/Editor/Constants";
import { ArtifactTriggerActions } from "PipelineWorkflow/Scripts/Editor/Artifact/ArtifactTriggerActions";
import { MessageBarType } from "OfficeFabric/MessageBar";
import { ArtifactTriggerUtils } from "PipelineWorkflow/Scripts/Editor/Common/ArtifactTriggerUtils";
import { FeatureFlagUtils } from "PipelineWorkflow/Scripts/Shared/Utils/FeatureFlagUtils";

import * as Utils_Array from "VSS/Utils/Array";
import * as Utils_Core from "VSS/Utils/Core";
import { AggregatorDataStoreBase } from "DistributedTaskControls/Common/Stores/AggregatorStoreBase";

export interface IArtifactTriggerViewState {
    isToggleEnabled: boolean;
    createReleaseOnBuildTagging: boolean;
}

export interface IArtifactTriggerOptions extends IArtifactTriggerConditionOptions {
    isTriggerEnabled?: boolean;
    createReleaseOnBuildTagging?: boolean;
}

export class ArtifactTriggerStore extends AggregatorDataStoreBase {

    public static getKey(): string {
        return DeployPipelineStoreKeys.StoreKey_DeployPipelineArtifactTriggerStore;
    }

    constructor(options: IArtifactTriggerOptions) {
        super();
        this._options = options;
        this._currentState = this._initializeEmptyState();
        this._originalState = this._initializeEmptyState();

        if (this._options) {
            this._options.changeTagsCallback = Utils_Core.delegate(this, this._updateCreateReleaseOnBuildTaggingOnChangeTags);
            this._initializeStates(this._currentState, this._options);
            this._initializeStates(this._originalState, this._options);
        }
    }

    public initialize(instanceId: string): void {
        super.initialize(instanceId);
        this.addToStoreList(this._artifactTriggerConditionStore = StoreManager.CreateStore<ArtifactTriggerConditionStore, IArtifactTriggerConditionOptions>(
            ArtifactTriggerConditionStore,
            instanceId,
            this._options));

        this._actionsHub = ActionsHubManager.GetActionsHub<ArtifactTriggerActions>(ArtifactTriggerActions, instanceId);
        this._actionsHub.toggleChanged.addListener(this._handleToggleChanged);
        this._actionsHub.resetToggleState.addListener(this._handleResetToggle);
        this._actionsHub.updateCreateReleaseOnBuildTagging.addListener(this._handleUpdateCreateReleaseOnBuildTagging);
        this._actionsHub.resetCreateReleaseOnBuildTagging.addListener(this._handleResetCreateReleaseOnBuildTagging);
    }

    public disposeInternal(): void {
        super.disposeInternal();
        this._actionsHub.toggleChanged.removeListener(this._handleToggleChanged);
        this._actionsHub.resetToggleState.removeListener(this._handleResetToggle);
        this._actionsHub.updateCreateReleaseOnBuildTagging.removeListener(this._handleUpdateCreateReleaseOnBuildTagging);
        this._actionsHub.resetCreateReleaseOnBuildTagging.removeListener(this._handleResetCreateReleaseOnBuildTagging);
    }

    public isDirty(): boolean {
        const isToggleDirty: boolean = this._currentState.isToggleEnabled !== this._originalState.isToggleEnabled;
        const isCreateReleaseOnBuildTaggingDirty: boolean = this._currentState.createReleaseOnBuildTagging !== this._originalState.createReleaseOnBuildTagging;
        if (!isToggleDirty && !isCreateReleaseOnBuildTaggingDirty && this._currentState.isToggleEnabled) {
            return super.isDirty();
        }
        return isToggleDirty || isCreateReleaseOnBuildTaggingDirty;
    }

    public updateVisitor(definition: PipelineDefinition): void {
        if (!!definition) {
            if (this._currentState.isToggleEnabled) {
                let triggers: PipelineTriggerBase[] = [];
                this._artifactTriggerConditionStore.updateVisitor(triggers);
                if (triggers.length === 0) {
                    // If toggle is enabled but no filters are added, add default trigger
                    let trigger = ArtifactTriggerUtils.getTriggerFromFilter(
                        this._artifactTriggerConditionStore.getAlias(),
                        this._artifactTriggerConditionStore.getArtifactType(),
                        ArtifactTriggerUtils.getDefaultTriggerCondition(),
                        this._artifactTriggerConditionStore.getReleaseTriggerType());

                    if (trigger) {
                        Utils_Array.add(definition.triggers, trigger);
                    }
                }
                else {
                    // Consolidate multiple trigger conditions into one trigger
                    let trigger: PipelineTriggerBase = ArtifactTriggerUtils.getTriggerWithConsolidatedConditions(triggers);
                    if (trigger) {
                        // Set createReleaseOnBuildTagging flag for ArtifactSource trigger only
                        if (trigger.triggerType === PipelineTriggerType.ArtifactSource) {
                            let artifactSourceTrigger = trigger as PipelineArtifactSourceTrigger;
                            if (!!artifactSourceTrigger && !!artifactSourceTrigger.triggerConditions && artifactSourceTrigger.triggerConditions.length > 0) {
                                artifactSourceTrigger.triggerConditions.forEach((filter) => {
                                    filter.createReleaseOnBuildTagging = this._currentState.createReleaseOnBuildTagging;
                                });
                            }
                        }
                        Utils_Array.add(definition.triggers, trigger);
                    }
                }
            }
        }
    }

    public updateCreateReleaseOnBuildTagging(state: boolean): void {
        let originalState = this._currentState.createReleaseOnBuildTagging;
        this._currentState.createReleaseOnBuildTagging = state;
        if (originalState !== state) {
            this.emitChanged();
        }
    }

    public hasTagsInTriggerConditions(): boolean {
        return this._artifactTriggerConditionStore.hasTagsInTriggerConditions();
    }

    public getState(): IArtifactTriggerViewState {
        return this._currentState;
    }

    private _initializeStates(state: IArtifactTriggerViewState, options: IArtifactTriggerOptions) {
        state.isToggleEnabled = options.isTriggerEnabled ? options.isTriggerEnabled : false;
        state.createReleaseOnBuildTagging = options.createReleaseOnBuildTagging ? options.createReleaseOnBuildTagging : false;
    }

    private _initializeEmptyState(): IArtifactTriggerViewState {
        return {
            isToggleEnabled: false,
            createReleaseOnBuildTagging: false
        };
    }

    private _handleToggleChanged = (checked: boolean) => {
        this._currentState.isToggleEnabled = checked;
        this.emitChanged();
        this._publishTriggerToggleTelemetry(checked);
    }

    private _handleResetToggle = (checked: boolean) => {
        this._currentState.isToggleEnabled = checked;
        this._originalState.isToggleEnabled = checked;
    }

    private _handleUpdateCreateReleaseOnBuildTagging = (state: boolean) => {
        this.updateCreateReleaseOnBuildTagging(state);
    }

    private _handleResetCreateReleaseOnBuildTagging = (checked: boolean) => {
        this._currentState.createReleaseOnBuildTagging = checked;
        this._originalState.createReleaseOnBuildTagging = checked;
    }

    private _publishTriggerToggleTelemetry(state: boolean) {
        let eventProperties: IDictionaryStringTo<any> = {};
        eventProperties[Properties.ToggleState] = state;
        Telemetry.instance().publishEvent(Feature.ContinuosDeploymentTriggerToggle, eventProperties);
    }

    private _updateCreateReleaseOnBuildTaggingOnChangeTags(hasTagsBeforeChange: boolean, hasTagsAfterChange: boolean): void {
        if (!hasTagsBeforeChange && hasTagsAfterChange) {
            // Set createReleaseOnBuildTagging flag to true when tag(s) are first added to trigger condition
            this.updateCreateReleaseOnBuildTagging(true);
        }
        else if (hasTagsBeforeChange && !hasTagsAfterChange) {
            // Reset createReleaseOnBuildTagging flag to false when all tags are removed from trigger conditions
            this.updateCreateReleaseOnBuildTagging(false);
        }
    }

    private _actionsHub: ArtifactTriggerActions;
    private _currentState: IArtifactTriggerViewState;
    private _originalState: IArtifactTriggerViewState;
    private _artifactTriggerConditionStore: ArtifactTriggerConditionStore;
    private _options: IArtifactTriggerOptions;
}
