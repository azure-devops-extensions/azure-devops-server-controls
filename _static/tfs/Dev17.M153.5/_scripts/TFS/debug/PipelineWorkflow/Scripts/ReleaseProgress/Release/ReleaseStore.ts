import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { AggregatorDataStoreBase } from "DistributedTaskControls/Common/Stores/AggregatorStoreBase";
import { JQueryWrapper } from "DistributedTaskControls/Common/JQueryWrapper";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { DeploymentGroupsStore } from "DistributedTaskControls/Stores/DeploymentGroupsStore";

import { ReleaseProgressStoreKeys } from "PipelineWorkflow/Scripts/ReleaseProgress/Constants";
import { ReleaseActionsHub, IReleaseActionsPayload, ISiblingReleasesPayload } from "PipelineWorkflow/Scripts/ReleaseProgress/Release/ReleaseActionsHub";
import { ReleaseEnvironmentListStore } from "PipelineWorkflow/Scripts/ReleaseProgress/ReleaseEnvironmentList/ReleaseEnvironmentListStore";
import { ReleaseVariablesUtils } from "PipelineWorkflow/Scripts/ReleaseProgress/Utilities/ReleaseVariablesUtils";
import { ReleaseVariablesListStore } from "PipelineWorkflow/Scripts/ReleaseProgress/Release/ReleaseVariablesListStore";
import { PermissionHelper } from "PipelineWorkflow/Scripts/SharedComponents/Security/PermissionHelper";

import * as ReleaseContracts from "ReleaseManagement/Core/Contracts";

import * as Utils_String from "VSS/Utils/String";
import * as Utils_Array from "VSS/Utils/Array";
import * as Diag from "VSS/Diag";
import { getDefaultWebContext } from "VSS/Context";

export interface IReleaseState {
    releaseId: number;
    releaseDefinitionFolderPath: string;
    releaseDefinitionId: number;
    siblingReleases: IPromise<ReleaseContracts.Release[]>;
    artifacts: ReleaseContracts.Artifact[];
    description: string;
    tags: string[];
    allTags: string[];
    hasVariableGroups: boolean;
}

export class ReleaseStore extends AggregatorDataStoreBase {

    public constructor() {
        super();
        let releaseState = {
            releaseId: 0,
            releaseDefinitionFolderPath: "\\",
            releaseDefinitionId: 0,
            artifacts: [],
            tags: [],
            description: Utils_String.empty,
            allTags: [],
            hasVariableGroups: false,
        } as IReleaseState;
        this._initializeReleaseState(releaseState);
    }

    public static getKey(): string {
        return ReleaseProgressStoreKeys.Release;
    }

    public initialize(instanceId: string): void {
        super.initialize(instanceId);

        this.addToStoreList(this._environmentListStore = StoreManager.GetStore<ReleaseEnvironmentListStore>(ReleaseEnvironmentListStore));
        this.addToStoreList(this._releaseVariableListStore = StoreManager.GetStore<ReleaseVariablesListStore>(ReleaseVariablesListStore));

        this._deploymentGroupsStore = StoreManager.GetStore<DeploymentGroupsStore>(DeploymentGroupsStore);

        this._releaseActions = ActionsHubManager.GetActionsHub<ReleaseActionsHub>(ReleaseActionsHub);
        this._releaseActions.initializeRelease.addListener(this._handleInitializeRelease);
        this._releaseActions.updateExistingRelease.addListener(this._handleUpdateExistingRelease);
        this._releaseActions.initializeSiblingReleases.addListener(this._handleInitializeSiblingReleases);
        this._releaseActions.initializeAllTags.addListener(this._initializeAllTags);
        this._releaseActions.updateDescription.addListener(this._updateDescription);
        this._releaseActions.updateTags.addListener(this._updateTags);
        this._releaseActions.updateServerTags.addListener(this._updateServerTags);
        this._releaseActions.resetTags.addListener(this._resetTags);
        this._releaseActions.updateReleaseFromService.addListener(this._updateReleaseFromService);
        this._releaseActions.updateMyPendingApprovals.addListener(this._updateMyPendingApprovals);
    }

    protected disposeInternal(): void {
        this._releaseActions.initializeRelease.removeListener(this._handleInitializeRelease);
        this._releaseActions.updateExistingRelease.removeListener(this._handleUpdateExistingRelease);
        this._releaseActions.initializeSiblingReleases.removeListener(this._handleInitializeSiblingReleases);
        this._releaseActions.initializeAllTags.removeListener(this._initializeAllTags);
        this._releaseActions.updateDescription.removeListener(this._updateDescription);
        this._releaseActions.updateTags.removeListener(this._updateTags);
        this._releaseActions.updateServerTags.removeListener(this._updateServerTags);
        this._releaseActions.resetTags.removeListener(this._resetTags);
        this._releaseActions.updateReleaseFromService.removeListener(this._updateReleaseFromService);
        super.disposeInternal();
    }

    public getReleaseDefinitionFolderPath(): string {
        return this._currentState && this._currentState.releaseDefinitionFolderPath ? this._currentState.releaseDefinitionFolderPath : "\\";
    }

    public getReleaseDefinitionId(): number {
        return this._currentState && this._currentState.releaseDefinitionId ? this._currentState.releaseDefinitionId : 0;
    }

    public getReleaseDefinitionName(): string {
        return this._release ? this._release.releaseDefinition.name : Utils_String.empty;
    }

    public getReleaseId(): number {
        return this._release ? this._release.id : 0;
    }

    public getReleaseName(): string {
        return this._release ? this._release.name : Utils_String.empty;
    }

    public getArtifacts(): ReleaseContracts.Artifact[] {
        return (this._currentState && this._currentState.artifacts) ? this._currentState.artifacts : [];
    }

    public getState(): IReleaseState {
        return this._currentState;
    }

    public getUpdatedRelease(): ReleaseContracts.Release {
        let updatedRelease = JQueryWrapper.extendDeep({}, this._release) as ReleaseContracts.Release;
        if (this._currentState) {
            // All other properties are right now static, populate them on need basis
            updatedRelease.description = this._currentState.description;
            updatedRelease.tags = this._currentState.tags ? Utils_Array.clone(this._currentState.tags) : [];
        }

        updatedRelease.environments = [];
        this._environmentListStore.updateVisitor(updatedRelease.environments);
        this._releaseVariableListStore.updateVisitor(updatedRelease);
        return updatedRelease;
    }

    public getRelease(): ReleaseContracts.Release {
        return this._release;
    }

    public getTaskIdsInUse(): string[] {
        if (this._taskIdsInUse && this._taskIdsInUse.length > 0) {
            return this._taskIdsInUse;
        }
        this._taskIdsInUse = [];
        let environments: ReleaseContracts.ReleaseEnvironment[] = this._release.environments || [];
        for (let environment of environments) {
            let deployPhasesSnapshot: ReleaseContracts.DeployPhase[] = environment.deployPhasesSnapshot || [];
            for (let deployPhase of deployPhasesSnapshot) {
                let workflowTasks: ReleaseContracts.WorkflowTask[] = deployPhase.workflowTasks || [];
                for (let workflowTask of workflowTasks) {
                    if (!workflowTask.enabled) {
                        continue;
                    }
                    let taskId: string = workflowTask.taskId;
                    this._taskIdsInUse.push(taskId);
                }
            }
        }
        return this._taskIdsInUse;
    }

    public isReleaseRunning(): boolean {
        return this._isReleaseRunning;
    }

    public isDescriptionDirty(): boolean {
        let isDirty: boolean = false;
        if (this._currentState && this._originalState) {
            isDirty = !Utils_String.equals(this._currentState.description, this._originalState.description, false);
        }
        return isDirty;
    }

    public getProjectReferenceId(): string {
        return this._release ? this._release.projectReference.id : getDefaultWebContext().project.id;
    }

    public hasManageReleasePermission(): boolean {
        if (this._release) {
            const hasPermission = PermissionHelper.hasManageReleasePermission(
                this.getReleaseDefinitionFolderPath(),
                this.getReleaseDefinitionId(),
                this.getProjectReferenceId());

            return hasPermission;
        }
        else {
            return false;
        }
    }

    public canAbandonRelease(): boolean {
        return !this.isReleaseAbandoned();
    }

    public isReleaseAbandoned(): boolean {
        if (this._release && this._release.status === ReleaseContracts.ReleaseStatus.Abandoned) {
            return true;
        }
        return false;
    }

    public getLogsContainerUrl(): string {
        return this._release ? this._release.logsContainerUrl : Utils_String.empty;
    }

    public updateVisitor(release: ReleaseContracts.Release): void {
        // Only for the purpose of ensuring that it is implemented. 
        // The concept of update visitor is not the right design. Need to replace update
        // with a Get<> pattern
    }

    private _handleInitializeRelease = (payload: IReleaseActionsPayload): void => {
        this._initializeRelease(payload);
    }

    private _handleInitializeSiblingReleases = (payload: ISiblingReleasesPayload): void => {
        if (this._currentState) {
            this._currentState.siblingReleases = payload.siblingReleases;
        }
    }

    public getSiblingReleases = (): Promise<ReleaseContracts.Release[]> => {
        return this._currentState.siblingReleases as Promise<ReleaseContracts.Release[]>;
    }

    private _initializeAllTags = (allTags: string[]): void => {
        if (this._currentState) {
            this._currentState.allTags = allTags;
            this._originalState.allTags = allTags;
            this.emitChanged();
        }
    }

    private _updateDescription = (description: string): void => {
        if (this._currentState) {
            this._currentState.description = description;
            this.emitChanged();
        }
    }

    private _updateReleaseFromService = (release: ReleaseContracts.Release): void => {
        this._release = release;
        this._updateReleaseRunningStatus();
    }

    private _updateMyPendingApprovals = (): void => {
        //  Cache is already updated by the action creator, we just need to re-render the UI.
        //  This will lead to UI taking the latest value from cache.
        this.emitChanged();
    }

    private _updateTags = (tags: string[]): void => {
        if (this._currentState) {
            this._currentState.tags = tags ? Utils_Array.clone(tags) : [];
            this.emitChanged();
        }
    }

    private _updateServerTags = (tags: string[]): void => {
        if (this._originalState) {
            this._originalState.tags = tags ? Utils_Array.clone(tags) : [];
            this.emitChanged();
        }
    }

    private _resetTags = (): void => {
        if (this._currentState && this._originalState) {
            this._currentState.tags = this._originalState.tags ? Utils_Array.clone(this._originalState.tags) : [];
            this.emitChanged();
        }
    }

    private _handleUpdateExistingRelease = (payload: IReleaseActionsPayload): void => {
        if (!this._release) {
            throw new Error("No release to update");
        }

        if (this._release.id !== payload.release.id) {
            throw new Error("Update existing release should happen for the same release id");
        }

        this._initializeRelease(payload);
    }

    private _initializeRelease(payload: IReleaseActionsPayload) {
        if (payload && payload.release) {
            this._refreshState(payload.release);
        }
        else if (payload) {
            Diag.logError("release object in payload should not be null");
        }
        else {
            Diag.logError("Payload for initialize release should not be null");
        }
    }

    private _refreshState(release: ReleaseContracts.Release) {
        this._release = release;
        this._taskIdsInUse = [];
        const releaseDefinitionId = this._release.releaseDefinition ? this._release.releaseDefinition.id : 0;
        const releaseDefinitionFolderPath = this._release.releaseDefinition ? this._release.releaseDefinition.path : "\\";

        const distinctVariableGroups: ReleaseContracts.VariableGroup[] = ReleaseVariablesUtils.getDistinctVariableGroups(release);

        let releaseState: IReleaseState = this._currentState;
        if (releaseState) {
            releaseState.releaseId = this._release.id;
            releaseState.artifacts = this._release.artifacts;
            releaseState.releaseDefinitionFolderPath = releaseDefinitionFolderPath,
                releaseState.releaseDefinitionId = releaseDefinitionId;
            releaseState.description = this._release.description;
            releaseState.tags = this._release.tags ? this._release.tags : [];
            releaseState.hasVariableGroups = (distinctVariableGroups.length !== 0);
        }
        this._initializeReleaseState(releaseState);
        this._updateReleaseRunningStatus();
    }

    private _initializeReleaseState(releaseState: IReleaseState) {
        this._currentState = JQueryWrapper.extendDeep({}, releaseState) as IReleaseState;
        this._originalState = JQueryWrapper.extendDeep({}, releaseState) as IReleaseState;
        this.emitChanged();
    }

    private _updateReleaseRunningStatus(): void {
        let isReleaseRunning =
            this._release
            && this._release.environments
            && this._release.environments.some((env: ReleaseContracts.ReleaseEnvironment) => {
                return env.status === ReleaseContracts.EnvironmentStatus.Queued || env.status === ReleaseContracts.EnvironmentStatus.InProgress;
            });
        this._isReleaseRunning = isReleaseRunning;
    }

    private _releaseActions: ReleaseActionsHub;
    private _release: ReleaseContracts.Release;
    private _releaseVariableListStore: ReleaseVariablesListStore;
    private _environmentListStore: ReleaseEnvironmentListStore;
    private _currentState: IReleaseState;
    private _originalState: IReleaseState;
    private _isReleaseRunning: boolean = false;
    private _taskIdsInUse: string[] = [];
    private _deploymentGroupsStore: DeploymentGroupsStore;
}