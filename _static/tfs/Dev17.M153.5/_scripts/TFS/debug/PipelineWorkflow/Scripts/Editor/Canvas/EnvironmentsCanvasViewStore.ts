import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { StoreBase, IStoreState } from "DistributedTaskControls/Common/Stores/Base";
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { EdgeMatrix } from "DistributedTaskControls/Components/Canvas/Types";
import { SaveStatus, SaveStatusActionsHub } from "DistributedTaskControls/Actions/SaveStatusActionsHub";

import { DeployPipelineStoreKeys } from "PipelineWorkflow/Scripts/Editor/Constants";
import { EnvironmentListStore } from "PipelineWorkflow/Scripts/Editor/Environment/EnvironmentListStore";
import { IEnvironmentData } from "PipelineWorkflow/Scripts/Shared/EnvironmentList/EnvironmentListModel";
import { EnvironmentTriggerStore } from "PipelineWorkflow/Scripts/Editor/Environment/EnvironmentTriggerStore";
import { EnvironmentPreDeploymentPanelViewStore } from "PipelineWorkflow/Scripts/Editor/Canvas/EnvironmentPreDeploymentPanelViewStore";
import { EnvironmentCorePropertiesViewStore } from "PipelineWorkflow/Scripts/Editor/Canvas/EnvironmentCorePropertiesViewStore";
import { EnvironmentPostDeploymentPanelViewStore } from "PipelineWorkflow/Scripts/Editor/Canvas/EnvironmentPostDeploymentPanelViewStore";
import { EnvironmentUtils } from "PipelineWorkflow/Scripts/Shared/Utils/EnvironmentUtils";
import { FeatureFlagUtils } from "PipelineWorkflow/Scripts/Shared/Utils/FeatureFlagUtils";
import { PipelineDefinitionEnvironment } from "PipelineWorkflow/Scripts/Common/Types";
import { CoreDefinitionStore } from "PipelineWorkflow/Scripts/Editor/Definition/CoreDefinitionStore";

import * as ReleaseContracts from "ReleaseManagement/Core/Contracts";

import * as ArrayUtils from "VSS/Utils/Array";

export interface IEnvironmentsCanvasViewState extends IStoreState {
    environmentConnections: EdgeMatrix;
    environmentsData: IEnvironmentData<PipelineDefinitionEnvironment>[];
    newEnvironmentInstanceId?: string;
    releaseDefinitionFolderPath?: string;
    releaseDefinitionId?: number;
    folderPath: string;
}

export class EnvironmentsCanvasViewStore extends StoreBase {

    public static getKey(): string {
        return DeployPipelineStoreKeys.StoreKey_DeployPipelineCanvasEnvironmentsStoreKey;
    }

    public initialize(instanceId: string): void {
        this._state = {} as IEnvironmentsCanvasViewState;
        this._saveStatusActions = ActionsHubManager.GetActionsHub<SaveStatusActionsHub>(SaveStatusActionsHub);
        this._saveStatusActions.updateSaveStatus.addListener(this._handleSaveStatusUpdate);

        this._environmentListStore = StoreManager.GetStore<EnvironmentListStore>(EnvironmentListStore);
        this._environmentListStore.addChangedListener(this._onEnvironmentListStoreChanged);
        this._onEnvironmentListStoreChanged();

        this._coreDefinitionStore = StoreManager.GetStore<CoreDefinitionStore>(CoreDefinitionStore);
        this._coreDefinitionStore.addChangedListener(this._onCoreDefinitionStoreChanged);
        this._onCoreDefinitionStoreChanged();
    }

    public disposeInternal(): void {
        this._environmentListStore.removeChangedListener(this._onEnvironmentListStoreChanged);
        this._coreDefinitionStore.removeChangedListener(this._onCoreDefinitionStoreChanged);
        this._saveStatusActions.updateSaveStatus.removeListener(this._handleSaveStatusUpdate);
    }

    public getState(): IEnvironmentsCanvasViewState {
        return this._state;
    }

    public isValid(): boolean {
        let isValid: boolean = true;
        const environmentsInstanceId: string[] = this._getAllEnvironmentsInstanceId();
        for (let instanceId of environmentsInstanceId) {
            // We have not added change listeners of each view store since this store is listening to change event of environmentListStore and that is
            // sufficient to handle any change in environment.
            if (instanceId) {
                const preDeploymentPanelViewStore = StoreManager.GetStore<EnvironmentPreDeploymentPanelViewStore>(EnvironmentPreDeploymentPanelViewStore, instanceId);
                const environmentCorePropertiesViewStore = StoreManager.GetStore<EnvironmentCorePropertiesViewStore>(EnvironmentCorePropertiesViewStore, instanceId);
                const postDeploymentPanelViewStore = StoreManager.GetStore<EnvironmentPostDeploymentPanelViewStore>(EnvironmentPostDeploymentPanelViewStore, instanceId);

                isValid = isValid && preDeploymentPanelViewStore.isValid()
                    && environmentCorePropertiesViewStore.isValid()
                    && postDeploymentPanelViewStore.isValid();
            }

            if (!isValid) {
                break;
            }
        }
        return isValid;
    }

    private _handleSaveStatusUpdate = (status: SaveStatus) => {
        // Emit change on successful save definition, this will render the layout again
        if (status === SaveStatus.Success) {
            this._setState(true);
            this.emitChanged();
        }
    }

    private _onEnvironmentListStoreChanged = (): void => {

        if (this._shouldUpdateState()) {

            this._setState();

            // Clean-up all the listeners on trigger stores.
            this._environmentTriggerStores.forEach((triggerStore) => {
                triggerStore.removeChangedListener(this._onTriggerStoreChanged);
            });

            this._environmentTriggerStores = [];

            // Add listeners to the existing trigger stores.
            const environmentsInstanceId: string[] = this._getAllEnvironmentsInstanceId();
            for (let instanceId of environmentsInstanceId) {
                if (instanceId) {
                    let triggerStore = StoreManager.GetStore<EnvironmentTriggerStore>(EnvironmentTriggerStore, instanceId);
                    triggerStore.addChangedListener(this._onTriggerStoreChanged);
                    this._environmentTriggerStores.push(triggerStore);
                }
            }
            this.emitChanged();
        }
    }

    private _onCoreDefinitionStoreChanged = (): void => {
        const coreState = this._coreDefinitionStore.getState();
        if (this._state.releaseDefinitionId !== coreState.id){
            this._state.releaseDefinitionId = coreState.id;
            this._state.releaseDefinitionFolderPath = coreState.folderPath;
            this.emitChanged();
        }
    }

    private _onTriggerStoreChanged = (): void => {
        let environments = this._environmentListStore.getCurrentState();
        this._setState();
        this.emitChanged();
    }

    private _setState(conditionsUseEnvironmentNames: boolean = false): void {
        this._state.environmentsData = this._environmentListStore.getEnvironmentsData();
        this._state.environmentConnections = this._environmentListStore.getEnvironmentConnections(conditionsUseEnvironmentNames);
        this._state.newEnvironmentInstanceId = this._environmentListStore.getEnvironmentInstanceId(this._environmentListStore.getLastLocallyAddedEnvironmentId());
    }

    private _shouldUpdateState(): boolean {
        return !this._state.environmentsData || this._shouldForceUpdateEnvironmentList();
    }

    private _shouldForceUpdateEnvironmentList(): boolean {

        let environments = this._environmentListStore.getCurrentState();
        let comparer = (s: string, t: string) => s === t;
        if (this._state.environmentsData.length !== environments.length)
        {
            return true;
        }

        const areInstanceIdsSame = ArrayUtils.arrayEquals(this._state.environmentsData.map(({ instanceId }) => instanceId),
            environments.map(({ id }) => this._environmentListStore.getEnvironmentInstanceId(id)),
            comparer, true);

        let areRanksSame = true;
        environments.forEach((env, index) => {
            if (env.rank !== this._state.environmentsData[index].environment.rank) {
                areRanksSame = false;
                return;
            }
        });

        return !areInstanceIdsSame || !areRanksSame;
    }

    private _getAllEnvironmentsInstanceId(): string[] {
        let instanceIds: string[] = [];
        let environmentStores = this._environmentListStore.getDataStoreList();
        for (let store of environmentStores) {
            instanceIds.push(store.getInstanceId());
        }
        return instanceIds;
    }

    private _environmentTriggerStores: EnvironmentTriggerStore[] = [];
    private _environmentListStore: EnvironmentListStore;
    private _state: IEnvironmentsCanvasViewState;
    private _coreDefinitionStore: CoreDefinitionStore;
    private _saveStatusActions: SaveStatusActionsHub;
}

