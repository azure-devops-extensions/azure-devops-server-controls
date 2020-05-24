import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { ListDataStoreBase } from "DistributedTaskControls/Common/Stores/ListDataStoreBase";
import { DtcUtils } from "DistributedTaskControls/Common/Utilities";
import { DataStoreBase } from "DistributedTaskControls/Common/Stores/Base";
import { JQueryWrapper } from "DistributedTaskControls/Common/JQueryWrapper";

import { ArtifactTriggerUtils } from "PipelineWorkflow/Scripts/Editor/Common/ArtifactTriggerUtils";
import { EnvironmentArtifactTriggerUtils } from "PipelineWorkflow/Scripts/Editor/Common/EnvironmentArtifactTriggerUtils";
import { DeployPipelineStoreKeys } from "PipelineWorkflow/Scripts/Editor/Constants";
import {
    PipelineArtifactFilter,
    PipelineEnvironmentTriggerCondition,
    PipelineEnvironmentTriggerConditionType,
    PipelineDefinitionEnvironment,
    PipelineArtifact,
    PipelineTriggerBase,
    PipelineArtifactTypes,
    PipelineArtifactSourceTrigger,
    PipelineSourceRepoTrigger
} from "PipelineWorkflow/Scripts/Common/Types";
import { ArtifactListStore } from "PipelineWorkflow/Scripts/Editor/Artifact/ArtifactListStore";
import { ArtifactStore } from "PipelineWorkflow/Scripts/Editor/Artifact/ArtifactStore";
import { ArtifactTriggerConditionStore, IArtifactTriggerConditionOptions } from "PipelineWorkflow/Scripts/SharedComponents/ArtifactTriggerCondition/ArtifactTriggerConditionStore";
import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";
import { EnvironmentArtifactTriggerActions } from "PipelineWorkflow/Scripts/Editor/Environment/EnvironmentArtifactTriggerActions";
import { ArtifactListActions } from "PipelineWorkflow/Scripts/Editor/Artifact/ArtifactListActions";
import { EnvironmentTriggerComparer } from "PipelineWorkflow/Scripts/Editor/Environment/EnvironmentTriggerComparer";

import * as Utils_Array from "VSS/Utils/Array";
import * as Utils_String from "VSS/Utils/String";
import * as VssContext from "VSS/Context";

// Used to prepare the environment artifact trigger conditions for artifact condition data stores only on initialiasation
export interface IArtifactTriggerContainer {
    alias: string;
    triggerConditions: PipelineArtifactFilter[];
}

export interface IEnvironmentArtifactTriggerStoreArgs {
    artifactTriggerConditions: PipelineEnvironmentTriggerCondition[];
}

//store state has only toggle state since trigger conditions are stored in ArtifactTriggerConditionStore
export interface IEnvironmentArtifactTriggerStoreState {
    isToggleEnabled: boolean;
}

export class EnvironmentArtifactTriggerStore extends ListDataStoreBase<ArtifactTriggerConditionStore> {

    public static getKey(): string {
        return DeployPipelineStoreKeys.StoreKey_DeployPipelineEnvironmentArtifactTriggerStoreKey;
    }

    constructor(args: IEnvironmentArtifactTriggerStoreArgs) {
        super();
        this._artifactListStore = StoreManager.GetStore<ArtifactListStore>(ArtifactListStore);
        this._artifactTriggerContainers = EnvironmentArtifactTriggerUtils.getArtifactTriggerContainers(args.artifactTriggerConditions);
    }

    public initialize(instanceId?: string): void {
        super.initialize(instanceId);
        this._initializeDataStores();
        this._actionsHub = ActionsHubManager.GetActionsHub<EnvironmentArtifactTriggerActions>(EnvironmentArtifactTriggerActions, instanceId);
        this._artifactListActions = ActionsHubManager.GetActionsHub<ArtifactListActions>(ArtifactListActions);
        this._actionsHub.addArtifactTrigger.addListener(this._handleAddArtifactTrigger);
        this._actionsHub.deleteArtifactTrigger.addListener(this._handleDeleteArtifactTrigger);
        this._actionsHub.updateToggleState.addListener(this._handleUpdateToggle);
        this._actionsHub.resetToggleState.addListener(this._handleResetToggle);
        this._actionsHub.updateArtifactTriggers.addListener(this._handleUpdateEnvironmentArtifactTrigger);
        this._artifactListActions.removeArtifact.addListener(this._handleRemoveArtifact);
        this._initializeToggleState();
    }

    public disposeInternal(): void {
        this._actionsHub.addArtifactTrigger.removeListener(this._handleAddArtifactTrigger);
        this._actionsHub.deleteArtifactTrigger.removeListener(this._handleDeleteArtifactTrigger);
        this._actionsHub.updateToggleState.removeListener(this._handleUpdateToggle);
        this._actionsHub.resetToggleState.removeListener(this._handleResetToggle);
        this._actionsHub.updateArtifactTriggers.removeListener(this._handleUpdateEnvironmentArtifactTrigger);
        this._artifactListActions.removeArtifact.removeListener(this._handleRemoveArtifact);
    }

    public updateVisitor(environment: PipelineDefinitionEnvironment): void {
        if (!!environment && !!environment.conditions) {

            let environmentTriggerConditions: PipelineEnvironmentTriggerCondition[] = [];
            environment.conditions.forEach(condition => {
                if (condition.conditionType !== PipelineEnvironmentTriggerConditionType.Artifact) {
                    environmentTriggerConditions.push(condition);
                }
            });

            if (this._currentState.isToggleEnabled) {
                Utils_Array.addRange(environmentTriggerConditions, this._getArtifactTriggerConditionsFromStores());
            }

            Utils_Array.clear(environment.conditions);
            Utils_Array.addRange(environment.conditions, environmentTriggerConditions);
        }
    }

    public isDirty(): boolean {
        if (this._currentState.isToggleEnabled) {
            return super.isDirty();
        }

        let isToggleDirty: boolean = this._currentState.isToggleEnabled !== this._originalState.isToggleEnabled;
        return isToggleDirty;
    }

    public isValid(): boolean {
        if (!this._currentState.isToggleEnabled) {
            return true;
        }

        return super.isValid();
    }

    public getState(): IEnvironmentArtifactTriggerStoreState {
        return this._currentState;
    }

    private _initializeToggleState() {
        let isToggleEnabled = this._getInitialToggleState();
        this._originalState = {
            isToggleEnabled: isToggleEnabled
        };
        this._currentState = {
            isToggleEnabled: isToggleEnabled
        };
    }

    private _getInitialToggleState(): boolean {
        let isToggleEnabled: boolean = false;
        let artifactTriggerConditionStoreList: ArtifactTriggerConditionStore[] = this.getDataStoreList() as ArtifactTriggerConditionStore[];
        if (artifactTriggerConditionStoreList.length > 0) {
            isToggleEnabled = true;
        }

        return isToggleEnabled;
    }

    private _initializeDataStores(): void {
        let storeList: ArtifactTriggerConditionStore[] = [];
        this._artifactTriggerContainers.forEach(container => {
            let artifactTriggerConditionStore: DataStoreBase = this._createArtifactTriggerConditionStore(container.alias, container.triggerConditions) as DataStoreBase;
            if (artifactTriggerConditionStore) {
                storeList.push(artifactTriggerConditionStore as ArtifactTriggerConditionStore);
            }
        });
        this.initializeListDataStore(storeList);

    }

    private _createArtifactTriggerConditionStore(alias: string, triggerConditions: PipelineArtifactFilter[]): ArtifactTriggerConditionStore {
        const instanceId: string = DtcUtils.getUniqueInstanceId();
        let artifactStore: ArtifactStore = this._artifactListStore.getArtifactByAlias(alias);
        let artifactTriggerConditionStore: ArtifactTriggerConditionStore;
        if (artifactStore) {
            artifactTriggerConditionStore = StoreManager.CreateStore<ArtifactTriggerConditionStore, IArtifactTriggerConditionOptions>(
                ArtifactTriggerConditionStore,
                instanceId,
                {
                    triggerConditions: triggerConditions,
                    isEnvironmentArtifactTrigger: true,
                    getAliasCallback: () => artifactStore.getAlias(),
                    getArtifactTypeCallback: () => artifactStore.getArtifactType(),
                    getArtifactStoreInstanceId: () => artifactStore.getInstanceId(),
                    getReleaseTriggerType: () => artifactStore.getTriggerType()
                } as IArtifactTriggerConditionOptions);
        }
        return artifactTriggerConditionStore;
    }

    private _handleAddArtifactTrigger = (artifact: PipelineArtifact) => {
        let artifactTriggerConditionStore: ArtifactTriggerConditionStore = this._createArtifactTriggerConditionStore(artifact.alias, [ArtifactTriggerUtils.getDefaultTriggerCondition()]);
        if (artifactTriggerConditionStore) {
            this.insertDataStore(artifactTriggerConditionStore as DataStoreBase, this.getDataStoreList().length);
            if (artifactTriggerConditionStore.getState() != null &&
                artifactTriggerConditionStore.getState().artifactTriggerConditionRequired != null &&
                artifactTriggerConditionStore.getState().artifactTriggerConditionRequired.length === 1) {
                artifactTriggerConditionStore.getState().artifactTriggerConditionRequired[0] = true;
            }
        }
        this.emitChanged();
    }

    private _handleDeleteArtifactTrigger = (index: number) => {
        let artifactTriggerConditionStore: any = null;
        let dataStoreList = this.getDataStoreList();
        if (dataStoreList.length >= index + 1) {
            artifactTriggerConditionStore = dataStoreList[index];
        }

        if (artifactTriggerConditionStore) {
            this.removeFromDataStoreList(artifactTriggerConditionStore);
        }

        this.emitChanged();
    }

    private _handleRemoveArtifact = (artifactId: string) => {
        if (!artifactId) {
            return;
        }

        let dataStoreList = this.getDataStoreList() as ArtifactTriggerConditionStore[];
        let index = 0;
        for (let datastore of dataStoreList) {
            if (Utils_String.localeIgnoreCaseComparer(datastore.getArtifactStoreInstanceId(), artifactId) === 0) {
                this.removeFromDataStoreList(datastore);
                break;
            }

            index++;
        }

        if (this.getDataStoreList().length === 0) {
            this._currentState.isToggleEnabled = false;
        }

        this.emitChanged();
    }

    private _handleUpdateToggle = (isToggleEnabled: boolean) => {
        this._currentState.isToggleEnabled = isToggleEnabled;
        this.emitChanged();
    }

    private _handleResetToggle = (checked: boolean) => {
        this._currentState = { isToggleEnabled: checked };
        this._originalState = { isToggleEnabled: checked };
    }

    private _handleUpdateEnvironmentArtifactTrigger = (artifactTriggerContainers: IArtifactTriggerContainer[]) => {
        let dataStoreList = Utils_Array.clone(this.getDataStoreList() as ArtifactTriggerConditionStore[]);
        dataStoreList.forEach(store => {
            //if store doesn't have a relevant container, remove it
            if (!artifactTriggerContainers.some(container => (Utils_String.localeIgnoreCaseComparer(container.alias, store.getAlias()) === 0))) {
                this.removeFromDataStoreList(store);
            }
        });
        this.handleUpdate();
    }

    // Get Each Artifact's Trigger Conditions from Data Stores
    private _getArtifactTriggerConditionsFromStores(): PipelineEnvironmentTriggerCondition[] {
        let environmentTriggerConditions: PipelineEnvironmentTriggerCondition[] = [];
        if (this.getDataStoreList()) {
            let artifactTriggerConditionStoreList: ArtifactTriggerConditionStore[] = this.getDataStoreList() as ArtifactTriggerConditionStore[];
            artifactTriggerConditionStoreList.forEach((artifactTriggerConditionStore) => {
                let triggers: PipelineTriggerBase[] = [];
                artifactTriggerConditionStore.updateVisitor(triggers);
                let artifactType: string = artifactTriggerConditionStore.getArtifactType();
                const alias: string = artifactTriggerConditionStore.getAlias();
                this._removeNullTriggers(artifactType, alias, triggers);
                if (triggers) {
                    triggers.forEach(trigger => {
                        Utils_Array.addRange(environmentTriggerConditions, EnvironmentArtifactTriggerUtils.convertTriggerToConditions(trigger, artifactType));
                    });
                }
            });
        }
        return environmentTriggerConditions;
    }

    private _removeNullTriggers(artifactType: string, alias: string, triggers: PipelineTriggerBase[]): void {
        if (artifactType === PipelineArtifactTypes.Build) {
            let pipelineTriggers: PipelineArtifactSourceTrigger[] = triggers as PipelineArtifactSourceTrigger[];
            Utils_Array.removeWhere(pipelineTriggers, trigger => (trigger && trigger.triggerConditions === null));
        }
        else if (artifactType === PipelineArtifactTypes.GitId || artifactType === PipelineArtifactTypes.GitHubId) {
            let pipelineTriggers: PipelineSourceRepoTrigger[] = triggers as PipelineSourceRepoTrigger[];
            Utils_Array.removeWhere(pipelineTriggers, trigger => (trigger && trigger.branchFilters && trigger.branchFilters.length === 0));
        }
    }

    private _currentState: IEnvironmentArtifactTriggerStoreState;
    private _originalState: IEnvironmentArtifactTriggerStoreState;
    private _actionsHub: EnvironmentArtifactTriggerActions;
    private _artifactStore: ArtifactStore;
    private _artifactListStore: ArtifactListStore;
    private _artifactTriggerContainers: IArtifactTriggerContainer[];
    private _artifactListActions: ArtifactListActions;
}
