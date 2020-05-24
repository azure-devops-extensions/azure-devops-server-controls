import * as React from "react";
import * as ReactDOM from "react-dom";

import { DemandInstances } from "CIWorkflow/Scripts/Common/Constants";
import * as Resources from "CIWorkflow/Scripts/Resources/TFS.Resources.CIWorkflow";
import * as Actions from "CIWorkflow/Scripts/Scenarios/Definition/Actions/QueueBuildActions";
import { BuildDefinitionStoreKeys } from "CIWorkflow/Scripts/Scenarios/Definition/Common";

import { DemandsActions } from "DistributedTaskControls/Actions/DemandsActions";
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { StoreBase } from "DistributedTaskControls/Common/Stores/Base";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { DtcUtils } from "DistributedTaskControls/Common/Utilities";
import { DemandsStore } from "DistributedTaskControls/Stores/DemandsStore";
import { RuntimeVariablesActions } from "DistributedTaskControls/Variables/RuntimeVariables/Actions/Actions";
import { RuntimeVariablesStore } from "DistributedTaskControls/Variables/RuntimeVariables/DataStore";

import { BuildRepository, BuildDefinition, DefinitionQueueStatus } from "TFS/Build/Contracts";
import { TaskAgentQueue } from "TFS/DistributedTask/Contracts";

import * as ArrayUtils from "VSS/Utils/Array";
import * as StringUtils from "VSS/Utils/String";

export type SourceBranchInvalidType = ((repositorytype: string, sourceBranch: string) => string) | null;

// Note: Tfs\Web\extensions\build\vss-build-web\build-buildsummary\content\View.tsx uses this and renders QueueBuildDialogLWPComponent
//       If some thing is required, make sure it's changed there as well
export interface IOptions {
    definitionName: string;
    definitionId: number;
    defaultSourceBranch: string;
    definition?: BuildDefinition;
    cloneId?: number;
    cloneRevision?: number;
    taskListStoreInstanceId?: string;
    enableSaveBeforeQueue?: boolean;
    definitionQueueStatus?: DefinitionQueueStatus;
    /**
     * Agent related settings.
     */
    agentQueues: TaskAgentQueue[];
    defaultAgentQueue: TaskAgentQueue;
    repository: BuildRepository;
}

export interface IQueueBuildState {
    agentQueue: TaskAgentQueue;

    /**
     *  Represents
     *     Branch for Git based repositories
     *     Branch for Subversion
     *     ShelvesetName for TFVC
     */
    sourceBranch: string;

    /**
     *  Represents
     *     CommitId for Git based repositories
     *     SourceVersion for Subversion
     *     Changeset number or Label for TFVC
     */
    sourceVersion: string;

    showDialog: boolean;

    successMessage?: string;
    errorMessage?: string;
    warningMessage?: string;
    stickyWarningMessage?: string;
    errorInRuntimeVariables: boolean;
    errorInDemands: boolean;

    ignoreWarnings: boolean;
    isQueueing: boolean;
    isQueueDisabled: boolean;

    definitionId: number;
    definition?: BuildDefinition;
    isSaveCompleted: boolean;
    isSaving: boolean;
    saveComment: string;
}

export class QueueBuildStore extends StoreBase {
    private _state: IQueueBuildState;
    private _agentQueues: TaskAgentQueue[] = [];
    private _actions: Actions.QueueBuildActions;
    private _demandsActions: DemandsActions;
    private _runtimeVariableActions: RuntimeVariablesActions;
    private _definitionName: string;
    private _repositoryType: string;
    private _isSourceBranchInvalid: SourceBranchInvalidType;
    private _taskListStoreInstanceId: string;
    private _enableSaveBeforeQueue: boolean;
    private _cloneId: number;
    private _cloneRevision: number;

    constructor(options: IOptions) {
        super();
        this._initializeOptions(options);
    }

    public static getKey(): string {
        return BuildDefinitionStoreKeys.StoreKey_QueueBuildStore;
    }

    public initialize(): void {
        this._actions = ActionsHubManager.GetActionsHub<Actions.QueueBuildActions>(Actions.QueueBuildActions);
        this._actions.updateAgentQueue.addListener(this._handleUpdateAgentQueue);
        this._actions.updateSaveComment.addListener(this._handleUpdateSaveComment);
        this._actions.saveBuildDefinition.addListener(this._handleSaveBuildDefinition);
        this._actions.buildDefinitionSaved.addListener(this._handleBuildDefinitionSaved);
        this._actions.buildDefinitionSaveFailed.addListener(this._handleBuildDefinitionSaveFailed);
        this._actions.queueBuild.addListener(this._handleQueueBuild);
        this._actions.buildQueued.addListener(this._handleBuildQueued);
        this._actions.updateSourceBranch.addListener(this._handleUpdateSourceBranch);
        this._actions.updateSourceVersion.addListener(this._handleUpdateSourceVersion);
        this._actions.dismissSuccessMessage.addListener(this._handleDismissSuccessMessage);

        this._demandsActions = ActionsHubManager.GetActionsHub<DemandsActions>(DemandsActions, DemandInstances.RuntimeInstance);
        this._demandsActions.addDemand.addListener(this._handleVariableAndDemandChange);
        this._demandsActions.deleteDemand.addListener(this._handleVariableAndDemandChange);
        this._demandsActions.updateDemandKey.addListener(this._handleVariableAndDemandChange);
        this._demandsActions.updateDemandCondition.addListener(this._handleVariableAndDemandChange);
        this._demandsActions.updateDemandValue.addListener(this._handleVariableAndDemandChange);

        this._runtimeVariableActions = ActionsHubManager.GetActionsHub<RuntimeVariablesActions>(RuntimeVariablesActions);
        this._runtimeVariableActions.addVariable.addListener(this._handleVariableAndDemandChange);
        this._runtimeVariableActions.deleteVariable.addListener(this._handleVariableAndDemandChange);
        this._runtimeVariableActions.updateVariableKey.addListener(this._handleVariableAndDemandChange);
        this._runtimeVariableActions.updateVariableValue.addListener(this._handleVariableAndDemandChange);
    }

    protected disposeInternal(): void {
        this._actions.updateAgentQueue.removeListener(this._handleUpdateAgentQueue);
        this._actions.updateSaveComment.removeListener(this._handleUpdateSaveComment);
        this._actions.saveBuildDefinition.removeListener(this._handleSaveBuildDefinition);
        this._actions.buildDefinitionSaved.removeListener(this._handleBuildDefinitionSaved);
        this._actions.buildDefinitionSaveFailed.removeListener(this._handleBuildDefinitionSaveFailed);
        this._actions.queueBuild.removeListener(this._handleQueueBuild);
        this._actions.buildQueued.removeListener(this._handleBuildQueued);
        this._actions.updateSourceBranch.removeListener(this._handleUpdateSourceBranch);
        this._actions.updateSourceVersion.removeListener(this._handleUpdateSourceVersion);
        this._actions.dismissSuccessMessage.removeListener(this._handleDismissSuccessMessage);

        this._demandsActions.addDemand.removeListener(this._handleVariableAndDemandChange);
        this._demandsActions.deleteDemand.removeListener(this._handleVariableAndDemandChange);
        this._demandsActions.updateDemandKey.removeListener(this._handleVariableAndDemandChange);
        this._demandsActions.updateDemandCondition.removeListener(this._handleVariableAndDemandChange);
        this._demandsActions.updateDemandValue.removeListener(this._handleVariableAndDemandChange);

        this._runtimeVariableActions.addVariable.removeListener(this._handleVariableAndDemandChange);
        this._runtimeVariableActions.deleteVariable.removeListener(this._handleVariableAndDemandChange);
        this._runtimeVariableActions.updateVariableKey.removeListener(this._handleVariableAndDemandChange);
        this._runtimeVariableActions.updateVariableValue.removeListener(this._handleVariableAndDemandChange);
    }

    public getState(): IQueueBuildState {
        return this._state;
    }

    public getTaskAgentQueues(): TaskAgentQueue[] {
        return ArrayUtils.clone(this._agentQueues);
    }

    public shouldSaveBeforeQueue(): boolean {
        return this._enableSaveBeforeQueue;
    }

    public getDefinitionName(): string {
        return this._definitionName;
    }

    public getCloneId(): number {
        return this._cloneId;
    }

    public getCloneRevision(): number {
        return this._cloneRevision;
    }

    public getTaskListStoreInstanceId(): string {
        return this._taskListStoreInstanceId;
    }

    public getParameters(): string {
        const runtimeVariableStore = StoreManager.GetStore<RuntimeVariablesStore>(RuntimeVariablesStore);
        return runtimeVariableStore.getSerializedRuntimeVariables();
    }

    public getSerializedDemands(): string[] {
        const demandsStore = StoreManager.GetStore<DemandsStore>(DemandsStore, DemandInstances.RuntimeInstance);
        return DtcUtils.convertDemandDataToSerializedDemand(demandsStore.getCurrentDemands());
    }

    private _initializeOptions(options: IOptions): void {
        this._state = {} as IQueueBuildState;

        if (options.repository) {
            this._repositoryType = options.repository.type;
        }

        if (options.agentQueues) {
            this._agentQueues = ArrayUtils.clone(options.agentQueues);
        }

        if (options.defaultAgentQueue) {
            const agentQueue = this._agentQueues.filter((queue: TaskAgentQueue) => {
                return queue.id === options.defaultAgentQueue.id;
            });

            if (agentQueue.length === 1) {
                this._state.agentQueue = agentQueue[0];
            }
            else if (agentQueue.length > 1) {
                throw new Error("Multiple agents with same id found");
            }
            else if (agentQueue.length === 0 && options.defaultAgentQueue) {
                // Saved queue is not found in the fetched agent pools,
                // Including the saved pool also
                this._agentQueues.push(options.defaultAgentQueue);
                this._state.agentQueue = options.defaultAgentQueue;
            }
        }

        // Sort the queues
        this._sortQueueList(this._agentQueues);

        this._definitionName = options.definitionName;

        this._cloneId = options.cloneId;
        this._cloneRevision = options.cloneRevision;
        this._enableSaveBeforeQueue = options.enableSaveBeforeQueue;
        this._state.definitionId = options.definitionId;
        this._state.definition = options.definition;
        this._state.isSaveCompleted = false;
        this._state.isSaving = false;
        this._state.saveComment = StringUtils.empty;
        this._state.sourceBranch = options.defaultSourceBranch;
        this._state.ignoreWarnings = false;
        this._state.isQueueing = false;
        this._state.isQueueDisabled = false;
        this._state.warningMessage = StringUtils.empty;
        this._state.stickyWarningMessage = StringUtils.empty;
        this._state.errorMessage = StringUtils.empty;
        this._state.successMessage = StringUtils.empty;
        this._state.errorInRuntimeVariables = false;
        this._state.errorInDemands = false;
        this._taskListStoreInstanceId = options.taskListStoreInstanceId;
        this._state.showDialog = true;

        if (options.definitionQueueStatus === DefinitionQueueStatus.Paused) {
            this._state.stickyWarningMessage = Resources.MessageBarPausedDefinitionText;
        }
    }

    private _sortQueueList(queues: TaskAgentQueue[]): void {
        if (queues) {
            queues.sort((queue1: TaskAgentQueue, queue2: TaskAgentQueue) => {
                return StringUtils.localeIgnoreCaseComparer(queue1.name, queue2.name);
            });
        }
    }

    private _handleUpdateAgentQueue = (agentQueueId: number) => {
        this._resetMessages();
        const agentQueue = this._agentQueues.filter((queue: TaskAgentQueue) => {
            return queue.id === agentQueueId;
        });

        if (agentQueue.length === 1) {
            this._state.agentQueue = agentQueue[0];
            this.emitChanged();
        }
        else if (agentQueueId > 0) {
            throw new Error("Either agent is not found or multiple agents with same id found");
        }
    }

    private _handleUpdateSaveComment = (comment: string) => {
        this._state.saveComment = comment;
        this.emitChanged();
    }

    private _handleSaveBuildDefinition = () => {
        this._state.isSaving = true;
        this.emitChanged();
    }

    private _handleBuildDefinitionSaved = (buildDefinition: BuildDefinition) => {
        this._state.isSaving = false;
        this._state.isSaveCompleted = true;
        this._state.successMessage = Resources.SaveBuildDefinitionSuccessMessage;
        this._state.definition = buildDefinition;
        this._state.definitionId = buildDefinition.id;
        this.emitChanged();
    }

    private _handleBuildDefinitionSaveFailed = (error: string) => {
        this._state.isSaving = false;
        this._state.errorMessage = error;
        this.emitChanged();
    }

    private _handleQueueBuild = () => {
        this._state.isQueueing = true;
        this.emitChanged();
    }

    private _handleBuildQueued = (payload: Actions.IBuildQueuedPayload) => {
        this._state.isQueueing = false;
        if (payload.build) {
            this._state.showDialog = false;
            this.emitChanged();
        }
        else {
            this._state.errorMessage = payload.error;
            this._state.warningMessage = payload.warning;
            if (payload.warning && !payload.error) {
                this._state.ignoreWarnings = true;
            }

            this.emitChanged();
        }
    }

    private _handleUpdateSourceBranch = (branch: string) => {
        this._state.sourceBranch = branch;
        this._state.isQueueDisabled = this._isQueueDisabled();
        this._resetMessages();
        this.emitChanged();
    }

    private _handleUpdateSourceVersion = (sourceVersion: string) => {
        this._state.sourceVersion = sourceVersion;
        this._resetMessages();
        this.emitChanged();
    }

    private _handleVariableAndDemandChange = (): void => {
        this._resetMessages();
        this._state.isQueueDisabled = this._isQueueDisabled();
        if (this._state.isQueueDisabled) {
            this._state.errorInRuntimeVariables = !this._isRuntimeVariableStoreValid();
            this._state.errorInDemands = !this._isDemandsStoreValid();
        }
        else {
            this._state.errorInRuntimeVariables = false;
            this._state.errorInDemands = false;
        }

        this.emitChanged();
    }

    private _handleDismissSuccessMessage = (): void => {
        this._state.successMessage = StringUtils.empty;
        this.emitChanged();
    }

    private _isQueueDisabled(): boolean {
        const sourceBranchInvalid: string = this._isSourceBranchInvalid && this._isSourceBranchInvalid(this._repositoryType, this._state.sourceBranch);
        return (!this._isRuntimeVariableStoreValid() || !this._isDemandsStoreValid() || !!sourceBranchInvalid);
    }

    private _isRuntimeVariableStoreValid(): boolean {
        const runtimeVariableStore = StoreManager.GetStore<RuntimeVariablesStore>(RuntimeVariablesStore);
        return runtimeVariableStore.isValid();
    }

    private _isDemandsStoreValid(): boolean {
        const demandsStore = StoreManager.GetStore<DemandsStore>(DemandsStore, DemandInstances.RuntimeInstance);
        return demandsStore.isValid();
    }

    private _resetMessages(): void {
        this._state.errorMessage = StringUtils.empty;
        this._state.warningMessage = StringUtils.empty;
        this._state.ignoreWarnings = false;
    }
}
