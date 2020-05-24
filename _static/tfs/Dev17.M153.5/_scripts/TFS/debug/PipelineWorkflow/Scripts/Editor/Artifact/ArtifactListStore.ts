/**
 * @brief ArtifactListDataStore
 */

import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { ListDataStoreBase } from "DistributedTaskControls/Common/Stores/ListDataStoreBase";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { JQueryWrapper } from "DistributedTaskControls/Common/JQueryWrapper";
import { Telemetry, Feature, Properties } from "DistributedTaskControls/Common/Telemetry";

import { DeployPipelineStoreKeys } from "PipelineWorkflow/Scripts/Editor/Constants";
import { IArtifactStoreArgs, ArtifactStore, IArtifactsDefinitionVisitor } from "PipelineWorkflow/Scripts/Editor/Artifact/ArtifactStore";
import {
    PipelineArtifact,
    PipelineDefinition,
    PipelineArtifactDefinition,
    PipelineArtifactTypeDefinition,
    PipelineArtifactDefinitionConstants,
    PipelineArtifactSourceReference,
    IArtifactTriggersMap,
    PipelineTriggerType,
    IUpdateArtifactListActionPayload
} from "PipelineWorkflow/Scripts/Common/Types";
import { ArtifactListActions } from "PipelineWorkflow/Scripts/Editor/Artifact/ArtifactListActions";

import * as Utils_Array from "VSS/Utils/Array";
import * as Utils_Core from "VSS/Utils/Core";
import * as Utils_String from "VSS/Utils/String";

/**
 * @brief The store contains information about Artifacts
 */
export class ArtifactListStore extends ListDataStoreBase<ArtifactStore> {

    public initialize(instanceId?: string): void {
        super.initialize(instanceId);
        this._artifactListActions = ActionsHubManager.GetActionsHub<ArtifactListActions>(ArtifactListActions);
        this._artifactListActions.updateArtifactsList.addListener(this._updateArtifactsList);
        this._artifactListActions.initializeArtifacts.addListener(this._initializeArtifacts);
        this._artifactListActions.removeArtifact.addListener(this._removeArtifact);
        this._artifactListActions.addArtifact.addListener(this._addArtifact);
    }

    public disposeInternal(): void {
        this._artifactListActions.updateArtifactsList.removeListener(this._updateArtifactsList);
        this._artifactListActions.initializeArtifacts.removeListener(this._initializeArtifacts);
        this._artifactListActions.removeArtifact.removeListener(this._removeArtifact);
        this._artifactListActions.addArtifact.removeListener(this._addArtifact);
        super.disposeInternal();
    }

    /**
     * @brief Returns the store key
     */
    public static getKey(): string {
        return DeployPipelineStoreKeys.StoreKey_DeployPipelineArtifactsStoreKey;
    }

    public updateVisitor(visitor: PipelineDefinition): void {
        if (visitor) {
            visitor.artifacts = [];
            visitor = this._retainOnlyScheduledTriggers(visitor);
            this._updateVisitorInternal(visitor);
        }
    }

    public getTemporaryArtifactInstanceId(): string {
        let stores: ArtifactStore[] = this.getDataStoreList();

        for (let store of stores) {
            if (store.isTemporary()) {
                return store.getInstanceId();
            }
        }

        return null;
    }

    public getArtifactList(): PipelineArtifact[] {
        let artifacts: PipelineArtifact[] = [];
        let artifactStores: ArtifactStore[] = this.getDataStoreList();
        if (artifactStores && artifactStores.length > 0) {
            artifactStores.forEach((artifactStore: ArtifactStore) => {
                artifacts.push(artifactStore.getState());
            });
        }
        return artifacts;
    }

    private _updateVisitorInternal(visitor: PipelineDefinition): void {
        this.getDataStoreList().forEach((store: ArtifactStore, index: number) => {
            let artifact: PipelineArtifactDefinition = JQueryWrapper.extend({}, null);

            let artifactsDefinitionVisitor: IArtifactsDefinitionVisitor = {
                artifact: artifact,
                definition: visitor
            };

            store.updateVisitor(artifactsDefinitionVisitor);
            visitor.artifacts.push(artifactsDefinitionVisitor.artifact);
        });
    }

    private _retainOnlyScheduledTriggers(visitor: PipelineDefinition): PipelineDefinition {
        let triggers = [];
        if (visitor.triggers) {
            //Because RM does not have concrete data type for each trigger type
            //Here we are keeping only scheduled based triggers in the definition
            visitor.triggers.forEach((trigger: any) => {
                if (trigger.triggerType === PipelineTriggerType.Schedule) {
                    triggers.push(trigger);
                }
            });
        }
        visitor.triggers = triggers;
        return visitor;
    }

    public getStores(): ArtifactStore[] {
        return this.getDataStoreList();
    }

    public getValue(): PipelineArtifactDefinition[] {
        return this.getDataStoreList().map((artifactStore: ArtifactStore): PipelineArtifactDefinition => { return artifactStore.getState(); });
    }

    public isArtifactAliasDuplicated(artifactId: string, alias: string): boolean {
        const dataStoreList = this.getDataStoreList();

        if (!alias || dataStoreList.length === 0) {
            return false;
        }

        for (let artifactStore of dataStoreList) {
            const artifactAlias: string = artifactStore.getAlias();
            if (artifactStore.getInstanceId() !== artifactId &&
                Utils_String.localeIgnoreCaseComparer(alias.trim(), artifactAlias ? artifactAlias.trim() : Utils_String.empty) === 0) {
                return true;
            }
        }

        return false;
    }

    public getArtifactById(artifactId: string): ArtifactStore {
        if (!artifactId) {
            return null;
        }

        let artifactLength: number = this.getDataStoreList().length;
        for (let artifactIndex: number = 0; artifactIndex < artifactLength; artifactIndex++) {
            let artifactStore: ArtifactStore = this.getDataStoreList()[artifactIndex];
            if (Utils_String.ignoreCaseComparer(artifactId, artifactStore.getInstanceId()) === 0) {
                return artifactStore;
            }
        }

        return null;
    }

    public getArtifactByAlias(alias: string): ArtifactStore {
        if (!alias) {
            return null;
        }

        let artifactLength: number = this.getDataStoreList().length;
        for (let artifactIndex: number = 0; artifactIndex < artifactLength; artifactIndex++) {
            let artifactStore: ArtifactStore = this.getDataStoreList()[artifactIndex];
            if (Utils_String.localeIgnoreCaseComparer(alias, artifactStore.getState().alias) === 0) {
                return artifactStore;
            }
        }

        return null;
    }

    public getFirstArtifact(): ArtifactStore {
        let storeList = this.getDataStoreList();
        if (storeList.length > 0) {
            return storeList[0];
        }

        return null;
    }

    public getPrimaryArtifact(): ArtifactStore {
        return Utils_Array.first(this.getDataStoreList(),
            (artifact: ArtifactStore): boolean => {
                return artifact.getState().isPrimary;
            });
    }

    private _updateArtifactsList = (updateArtifactListActionPayload: IUpdateArtifactListActionPayload) => {
        let forcedUpdate = updateArtifactListActionPayload.forcedUpdate || false;
        if (forcedUpdate) {
            this.getDataStoreList().forEach(store => {
                this.removeFromDataStoreList(store);
            });
            this._initializeArtifacts(updateArtifactListActionPayload.artifactTriggersMap || []);
        }
        else {
            this.handleUpdate();
        }
    }

    private _initializeArtifacts = (artifactTriggerMapArray: IArtifactTriggersMap[]) => {
        if (!artifactTriggerMapArray) {
            return;
        }
        let stores: ArtifactStore[] = [];

        artifactTriggerMapArray.forEach((artifactTriggerMap: IArtifactTriggersMap) => {
            stores.push(this._createArtifactStore(artifactTriggerMap, false));
        });

        this.initializeListDataStore(stores);

        this.emitChanged();
    }

    private _removeArtifact = (artifactId: string): void => {
        if (!artifactId) {
            return;
        }

        let artifactToBeRemoved: ArtifactStore = this.getArtifactById(artifactId);
        if (!artifactToBeRemoved) {
            return;
        }
        
        let removeIndex = this.getDataStoreList().indexOf(artifactToBeRemoved);

        if (removeIndex >= 0) {
            this.removeFromDataStoreList(artifactToBeRemoved);
            this._publishRemoveArtifactTelemetry(artifactToBeRemoved);
        }

        this.emitChanged();
    }

    private _publishRemoveArtifactTelemetry(artifactRemoved: ArtifactStore) {
        let eventProperties: IDictionaryStringTo<any> = {};
        eventProperties[Properties.ArtifactType] = artifactRemoved.getState().type;

        Telemetry.instance().publishEvent(Feature.RemoveArtifact, eventProperties);
    }

    private _addArtifact = (artifact: PipelineArtifactDefinition): void => {
        let artifactTriggerMap: IArtifactTriggersMap = {
            artifact: artifact,
            trigger: undefined,
            pullRequestTrigger: null,
            artifactTypeDefinition: null
        };

        let store = this._createArtifactStore(artifactTriggerMap, true);
        this.addToStoreList(store);

        this.emitChanged();
    }

    private _createArtifactStore(artifactTriggerMap: IArtifactTriggersMap, isTemporary?: boolean): ArtifactStore {
        let storeArgs: IArtifactStoreArgs = {
            artifact: artifactTriggerMap.artifact,
            isAliasDuplicated: Utils_Core.delegate(this, this.isArtifactAliasDuplicated),
            trigger: artifactTriggerMap.trigger,
            pullRequestTrigger: artifactTriggerMap.pullRequestTrigger,
            id: Utils_String.generateUID(),
            isTemporary: isTemporary,
            artifactTypeDefinition: artifactTriggerMap.artifactTypeDefinition
        };

        return StoreManager.CreateStore<ArtifactStore, IArtifactStoreArgs>(ArtifactStore, storeArgs.id, storeArgs);
    }

    private _artifactListActions: ArtifactListActions;
}