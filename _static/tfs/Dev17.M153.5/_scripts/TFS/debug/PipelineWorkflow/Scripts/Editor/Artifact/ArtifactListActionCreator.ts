import * as ActionBase from "DistributedTaskControls/Common/Actions/Base";
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { Actions as ItemSelectorActions } from "DistributedTaskControls/Actions/ItemSelectorActions";
import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";

import { PipelinePullRequestTriggerContractMetadata } from "PipelineWorkflow/Scripts/Editor/Common/Types";
import { ArtifactPropertiesItem, IArtifactPropertiesItemArgs } from "PipelineWorkflow/Scripts/Editor/Canvas/ArtifactPropertiesItem";
import { ArtifactListStore } from "PipelineWorkflow/Scripts/Editor/Artifact/ArtifactListStore";
import { ArtifactActions } from "PipelineWorkflow/Scripts/Editor/Artifact/ArtifactActions";
import { ArtifactListActions } from "PipelineWorkflow/Scripts/Editor/Artifact/ArtifactListActions";
import { ArtifactSource } from "PipelineWorkflow/Scripts/Editor/Artifact/ArtifactSource";
import { ArtifactTriggerUtils } from "PipelineWorkflow/Scripts/Editor/Common/ArtifactTriggerUtils";
import { CanvasSelectorConstants, ArtifactMode } from "PipelineWorkflow/Scripts/Editor/Common/Constants";
import { DeployPipelineActionCreatorKeys } from "PipelineWorkflow/Scripts/Editor/Constants";
import { ArtifactTriggerConditionActions } from "PipelineWorkflow/Scripts/SharedComponents/ArtifactTriggerCondition/ArtifactTriggerConditionActions";
import { ArtifactTriggerActionsCreator } from "PipelineWorkflow/Scripts/Editor/Artifact/ArtifactTriggerActionsCreator";
import { PullRequestTriggerActionsCreator } from "PipelineWorkflow/Scripts/Editor/Artifact/PullRequestTriggerActionsCreator";

import {
    PipelineTriggerType,
    IArtifactTriggersMap,
    PipelineTriggerBase,
    PipelineArtifactDefinition,
    PipelineArtifactTypeDefinition,
    PipelineArtifactSourceTrigger,
    PipelineSourceRepoTrigger,
    PipelineContainerImageTrigger,
    PipelinePackageTrigger,
    PipelinePullRequestTrigger
} from "PipelineWorkflow/Scripts/Common/Types";

import * as Utils_Array from "VSS/Utils/Array";
import * as Utils_String from "VSS/Utils/String";
import { ContractSerializer } from "VSS/Serialization";

export class ArtifactListActionCreator extends ActionBase.ActionCreatorBase {

    public static getKey(): string {
        return DeployPipelineActionCreatorKeys.ActionCreatorKey_ArtifactListActionCreator;
    }

    public initialize(instanceId?: string): void {
        this._artifactListActions = ActionsHubManager.GetActionsHub<ArtifactListActions>(ArtifactListActions);
        this._artifactListStore = StoreManager.GetStore<ArtifactListStore>(ArtifactListStore);
        this._artifactActions = ActionsHubManager.GetActionsHub<ArtifactActions>(ArtifactActions);
        this._itemSelectorActions = ActionsHubManager.GetActionsHub<ItemSelectorActions>(ItemSelectorActions, CanvasSelectorConstants.CanvasSelectorInstance);
        this._artifactSource = ArtifactSource.instance();
    }

    /**
    * @brief raise action required to add an artifact
    */
    public addArtifact(artifact: PipelineArtifactDefinition): void {
        this._artifactListActions.addArtifact.invoke(artifact);
        this._setPrimaryArtifactIfRequired();
        this._selectNewlyAddedArtifact();
    }

    /**
     * @brief raise action required to remove an artifact
     */
    public removeArtifact(artifactId: string): void {
        this._artifactListActions.removeArtifact.invoke(artifactId);
        this._setPrimaryArtifactIfRequired();
        this._artifactActions.refreshArtifacts.invoke({});
    }

    /**
     * @brief raise action required to reInitialize artifacts
     */
    public updateArtifacts(artifacts: PipelineArtifactDefinition[], triggers: PipelineTriggerBase[], forcedUpdate: boolean): void {
        let artifactTriggerMap = this._createArtifactTriggersMap(artifacts, triggers) || [];
        this._artifactActions.updateArtifacts.invoke(artifactTriggerMap);
        this._artifactListActions.updateArtifactsList.invoke({ artifactTriggersMap: artifactTriggerMap, forcedUpdate: forcedUpdate });

        artifactTriggerMap.forEach((artifactTriggerMap: IArtifactTriggersMap) => {
            let artifactTriggerConfiguration = (!!artifactTriggerMap.artifactTypeDefinition) ? artifactTriggerMap.artifactTypeDefinition.artifactTriggerConfiguration : null;
            let isReleaseTriggerSupportedInArtifact = ArtifactTriggerUtils.isReleaseTriggerSupportedInArtifact(artifactTriggerMap.artifact.type, artifactTriggerConfiguration);
            if (isReleaseTriggerSupportedInArtifact) {

                let artifactStore = this._artifactListStore.getArtifactByAlias(artifactTriggerMap.artifact.alias);
                if (artifactStore) {
                    let instanceId = artifactStore.getInstanceId();

                    let trigger = artifactTriggerMap.trigger;
                    let artifactTriggerConditionActions = ActionsHubManager.GetActionsHub<ArtifactTriggerConditionActions>(ArtifactTriggerConditionActions, instanceId);
                    artifactTriggerConditionActions.updateTriggerConditions.invoke(ArtifactTriggerUtils.getTriggerConditions(trigger));

                    let artifactTriggerActionsCreator = ActionCreatorManager.GetActionCreator<ArtifactTriggerActionsCreator>(ArtifactTriggerActionsCreator, instanceId);
                    artifactTriggerActionsCreator.resetToggleState(!!trigger);
                    artifactTriggerActionsCreator.resetCreateReleaseOnBuildTagging(ArtifactTriggerUtils.isCreateReleaseOnBuildTagging(trigger));

                    let pullRequestTriggerActionsCreator = ActionCreatorManager.GetActionCreator<PullRequestTriggerActionsCreator>(PullRequestTriggerActionsCreator, instanceId);
                    pullRequestTriggerActionsCreator.updateTrigger(artifactTriggerMap.pullRequestTrigger);
                }
            }
        });
    }

    /**
     * @brief raise action required to initialize artifacts
     */
    public initializeArtifacts(artifacts: PipelineArtifactDefinition[], triggers: PipelineTriggerBase[]): void {
            this._artifactTypeDefinitions = this._artifactSource.getPreFetchedArtifactTypeDefinitions();
            let artifactTriggerMap = this._createArtifactTriggersMap(artifacts, triggers);
            this._artifactListActions.initializeArtifacts.invoke(artifactTriggerMap);
    }

    public getArtifactTypeDefinition(artifactType: string): PipelineArtifactTypeDefinition {
        let artifactTypeDefinition = Utils_Array.first(this._artifactTypeDefinitions,
            (artifactDefinition: PipelineArtifactTypeDefinition): boolean => {
                return (artifactDefinition.name === artifactType);
            });
        
        return artifactTypeDefinition;
    }

    private _setPrimaryArtifactIfRequired(): void {
        let primaryArtifactStore = this._artifactListStore.getPrimaryArtifact();
        if (!primaryArtifactStore) {
            let firstArtifactStore = this._artifactListStore.getFirstArtifact();
            if (firstArtifactStore) {
                this._artifactActions.setPrimaryArtifact.invoke(firstArtifactStore.getInstanceId());
            }
        }
    }

    private _selectNewlyAddedArtifact(): void {
        let instanceId = this._artifactListStore.getTemporaryArtifactInstanceId();
        if (!instanceId) {
            return;
        }

        this._itemSelectorActions.selectItem.invoke({ data: new ArtifactPropertiesItem({ instanceId: instanceId, mode: ArtifactMode.Edit } as IArtifactPropertiesItemArgs) });
    }

    private _createArtifactTriggersMap(artifacts: PipelineArtifactDefinition[], triggers: PipelineTriggerBase[]): IArtifactTriggersMap[] {
        let map: IArtifactTriggersMap[] = [];

        artifacts = artifacts || [];
        triggers = triggers || [];

        artifacts.forEach((artifact: PipelineArtifactDefinition) => {
            let mapData: IArtifactTriggersMap = {
                artifact: artifact,
                trigger: undefined,
                pullRequestTrigger: null,
                artifactTypeDefinition: this.getArtifactTypeDefinition(artifact.type)
            };

            triggers.forEach((trigger: PipelineTriggerBase) => {
                if (trigger.triggerType === PipelineTriggerType.ArtifactSource) {
                    let artifactTrigger = trigger as PipelineArtifactSourceTrigger;
                    if (Utils_String.localeIgnoreCaseComparer(artifact.alias, artifactTrigger.artifactAlias) === 0) {
                        mapData.trigger = artifactTrigger;
                    }
                }
                else if (trigger.triggerType === PipelineTriggerType.SourceRepo) {
                    let artifactTrigger = trigger as PipelineSourceRepoTrigger;
                    if (Utils_String.localeIgnoreCaseComparer(artifact.alias, artifactTrigger.alias) === 0) {
                        mapData.trigger = artifactTrigger;
                    }
                }
                else if (trigger.triggerType === PipelineTriggerType.ContainerImage) {
                    let artifactTrigger = trigger as PipelineContainerImageTrigger;
                    if (Utils_String.localeIgnoreCaseComparer(artifact.alias, artifactTrigger.alias) === 0) {
                        mapData.trigger = artifactTrigger;
                    }
                }
                else if (trigger.triggerType === PipelineTriggerType.Package) {
                    let artifactTrigger = trigger as PipelinePackageTrigger;
                    if (Utils_String.localeIgnoreCaseComparer(artifact.alias, artifactTrigger.alias) === 0) {
                        mapData.trigger = artifactTrigger;
                    }
                }

                // This is special case so we don't insert it in triggers.
                else if (trigger.triggerType === PipelineTriggerType.PullRequest) {
                    // We need to serialize deserizalie here because trigger is of type ReleaseTrigger
                    // which doesn't have pullRequestConfiguration in its definition, so the enums inside pullRequestConfiguration are
                    // not converted to numbers properly
                    let pullRequestTrigger = ContractSerializer.deserialize(trigger, PipelinePullRequestTriggerContractMetadata);
                    if (Utils_String.localeIgnoreCaseComparer(artifact.alias, pullRequestTrigger.artifactAlias) === 0) {
                        // Assign it to pull request trigger instead of triggers.
                        mapData.pullRequestTrigger = pullRequestTrigger;
                    }
                }
            });

            map.push(mapData);
        });

        return map;
    }

    private _artifactActions: ArtifactActions;
    private _artifactListActions: ArtifactListActions;
    private _artifactListStore: ArtifactListStore;
    private _itemSelectorActions: ItemSelectorActions;
    private _artifactSource: ArtifactSource;
    private _artifactTypeDefinitions: PipelineArtifactTypeDefinition[];
}


