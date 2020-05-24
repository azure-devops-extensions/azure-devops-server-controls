import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { StoreBase, IStoreState } from "DistributedTaskControls/Common/Stores/Base";
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";

import { DeployPipelineStoreKeys } from "PipelineWorkflow/Scripts/Editor/Constants";
import { DeployEnvironmentStore } from "PipelineWorkflow/Scripts/Editor/Environment/EnvironmentStore";
import { EnvironmentPropertiesViewStore } from "PipelineWorkflow/Scripts/Editor/Environment/EnvironmentPropertiesViewStore";
import { PipelineDefinitionEnvironment } from "PipelineWorkflow/Scripts/Common/Types";

import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";

import * as StringUtils from "VSS/Utils/String";

export interface IEnvironmentCorePropertiesViewState extends IStoreState {

    id: number;

    name: string;

    description?: string;

    areSettingsValid: boolean;

    isEnvironmentWorkflowValid: boolean;

    isTemporary: boolean;

    showPanel: boolean;

    showDeleteDialog: boolean;

    showDeleteEnvironmentPermissionDialog?: boolean;

    rank?: number;
}

export class EnvironmentCorePropertiesViewStore extends StoreBase {
    
    public static getKey(): string {
        return DeployPipelineStoreKeys.StoreKey_DeployPipelineCanvasEnvironmentNodeStoreKey;
    }

    public initialize(instanceId: string): void {
        super.initialize(instanceId);
        this._environmentStore = StoreManager.GetStore<DeployEnvironmentStore>(DeployEnvironmentStore, instanceId);
        this._environmentPropertiesViewStore = StoreManager.GetStore<EnvironmentPropertiesViewStore>(EnvironmentPropertiesViewStore, instanceId);
        this._environmentStore.addChangedListener(this._onDataStoreChanged);
        this._environmentPropertiesViewStore.addChangedListener(this._onDataStoreChanged);
        this._onDataStoreChanged();
    }

    public disposeInternal(): void {
        this._environmentStore.removeChangedListener(this._onDataStoreChanged);
        this._environmentPropertiesViewStore.removeChangedListener(this._onDataStoreChanged);
    }

    public isValid(): boolean {
        let isValid : boolean = this._environmentPropertiesViewStore.isValid();
        return isValid;
    }

    public getState(): IEnvironmentCorePropertiesViewState {
        return this._state;
    }

    private _onDataStoreChanged = (): void => {
        let environmentData = this._environmentStore.getCurrentState();
        let environmentViewState = this._environmentPropertiesViewStore.getState();

        let areSettingsValid = environmentViewState.isValid;
        let isEnvironmentWorkflowValid = this._environmentStore.isEnvironmentWorkflowValid();
        let isTemporary = this._environmentStore.isTemporary();
        let description = this._getDescription(environmentData, isTemporary);
        let showPanel = isTemporary;
        let rank = this._environmentStore.getEnvironmentRank();

        if (!this._state ||
            this._state.id !== environmentData.id ||
            this._state.name !== environmentViewState.environmentName ||
            this._state.description !== description ||
            this._state.areSettingsValid !== areSettingsValid || 
            this._state.isEnvironmentWorkflowValid !== isEnvironmentWorkflowValid ||
            this._state.isTemporary !== isTemporary ||
            this._state.rank !== rank) {

            this._state = {
                id: environmentData.id,
                name: environmentData.name,
                description: description,
                areSettingsValid: areSettingsValid,
                isEnvironmentWorkflowValid: isEnvironmentWorkflowValid,
                isTemporary: isTemporary,
                showPanel: showPanel,
                showDeleteDialog: false,
                rank: rank
            };

            this.emitChanged();
        }
    }

    private _getDescription(environment: PipelineDefinitionEnvironment, isTemporary: boolean): string {
        if (isTemporary) {
            return Resources.SelectTemplate;
        }

        let phaseCount = 0;
        let taskCount = 0;

        if (environment && environment.deployPhases) {
            phaseCount = environment.deployPhases.length;
            environment.deployPhases.forEach((phase) => {
                if (phase && phase.workflowTasks) {
                    taskCount += phase.workflowTasks.length;
                }
            });
        }

        if (taskCount <= 1 && phaseCount <= 1) {
            return StringUtils.localeFormat(Resources.EnvironmentNodeDescriptionWithOneOrZeroPhaseAndOneOrZeroTask, phaseCount, taskCount);
        }
        else if (taskCount <= 1 && phaseCount > 1) {
            return StringUtils.localeFormat(Resources.EnvironmentNodeDescriptionWithMoreThanOnePhasesAndOneOrZeroTask, phaseCount, taskCount);
        }
        else if (taskCount > 1 && phaseCount <= 1) {
            return StringUtils.localeFormat(Resources.EnvironmentNodeDescriptionWithOneOrZeroPhaseAndMoreThanOneTasks, phaseCount, taskCount);
        }
        else {
            return StringUtils.localeFormat(Resources.EnvironmentNodeDescriptionWithMoreThanOnePhasesAndMoreThanOneTasks, phaseCount, taskCount);
        }
    }

    private _environmentStore: DeployEnvironmentStore;
    private _environmentPropertiesViewStore: EnvironmentPropertiesViewStore;
    private _state: IEnvironmentCorePropertiesViewState;
}