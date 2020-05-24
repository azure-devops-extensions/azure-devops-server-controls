import { DefinitionUtils } from "CIWorkflow/Scripts/Common/DefinitionUtils";
import * as Actions from "CIWorkflow/Scripts/Scenarios/Definition/Actions/BuildDefinitionActions";
import { BuildDefinitionStoreKeys } from "CIWorkflow/Scripts/Scenarios/Definition/Common";
import { Store } from "CIWorkflow/Scripts/Scenarios/Definition/Stores/Base";

import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";

import { BuildDefinition, DefinitionQuality, DefinitionQueueStatus } from "TFS/Build/Contracts";
import { ProjectVisibility } from "TFS/Core/Contracts";

export interface ICoreDefinitionState {
    name: string;
    description: string;
    id: number;
    revision: number;
    buildNumberFormat: string;
    oldBadgeEnabled: boolean;
    queueStatus: DefinitionQueueStatus;
    folderPath: string;
    isPublicProject: boolean;
    cloneId?: number;
    cloneRevision?: number;
}

/**
 * @brief This store contains the core primitive fields of a Build definition, like: name, description, author, etc.
 * @returns
 */
export class CoreDefinitionStore extends Store {
    private _currentState: ICoreDefinitionState;
    private _originalState: ICoreDefinitionState;
    private _actions: Actions.BuildDefinitionActions;

    constructor() {
        super();
        this._currentState = {} as ICoreDefinitionState;
        this._originalState = {} as ICoreDefinitionState;
    }

    /**
     * @returns Unique key to the store
     */
    public static getKey(): string {
        return BuildDefinitionStoreKeys.StoreKey_CoreDefinitionStore;
    }

    public initialize(): void {
        this._actions = ActionsHubManager.GetActionsHub<Actions.BuildDefinitionActions>(Actions.BuildDefinitionActions);
        this._actions.createBuildDefinition.addListener(this._handleCreateAndUpdateBuildDefinition);
        this._actions.updateBuildDefinition.addListener(this._handleCreateAndUpdateBuildDefinition);
        this._actions.cloneBuildDefinition.addListener(this._handleCloneBuildDefinition);
        this._actions.changeName.addListener(this._handleChangeName);
        this._actions.changeDescription.addListener(this._handleChangeDescription);
        this._actions.changeBuildNumberFormat.addListener(this._handleChangeBuildNumberFormat);
        this._actions.changeBadgeEnabled.addListener(this._handleChangeBadgeEnabled);
        this._actions.changeQueueStatus.addListener(this._handleChangeQueueStatus);
    }

    protected disposeInternal(): void {
        this._actions.cloneBuildDefinition.removeListener(this._handleCloneBuildDefinition);
        this._actions.createBuildDefinition.removeListener(this._handleCreateAndUpdateBuildDefinition);
        this._actions.updateBuildDefinition.removeListener(this._handleCreateAndUpdateBuildDefinition);
        this._actions.changeName.removeListener(this._handleChangeName);
        this._actions.changeDescription.removeListener(this._handleChangeDescription);
        this._actions.changeBuildNumberFormat.removeListener(this._handleChangeBuildNumberFormat);
        this._actions.changeBadgeEnabled.removeListener(this._handleChangeBadgeEnabled);
        this._actions.changeQueueStatus.removeListener(this._handleChangeQueueStatus);
    }

    /**
     * @brief Updates the code fields of the Build definition contract
     * @param {BuildDefinition} buildDefinition
     * @returns BuildDefinition
     */
    public updateVisitor(buildDefinition: BuildDefinition): BuildDefinition {
        buildDefinition.name = this._currentState.name;
        buildDefinition.id = this._currentState.id;
        buildDefinition.description = this._currentState.description;
        buildDefinition.revision = this._currentState.revision;
        buildDefinition.buildNumberFormat = this._currentState.buildNumberFormat;
        buildDefinition.badgeEnabled = this._currentState.oldBadgeEnabled;
        buildDefinition.queueStatus = this._currentState.queueStatus;
        if (buildDefinition.quality === DefinitionQuality.Definition || this._currentState.cloneId != null) {
            buildDefinition.draftOf = null;
        }
        return buildDefinition;
    }

    public isDirty(): boolean {
        return (this._currentState.id <= 0)
            || (this._currentState.name !== this._originalState.name)
            || (this._currentState.description !== this._originalState.description)
            || (this._currentState.buildNumberFormat !== this._originalState.buildNumberFormat)
            || (this._currentState.oldBadgeEnabled !== this._originalState.oldBadgeEnabled)
            || (this._currentState.queueStatus !== this._originalState.queueStatus);
    }

    public isValid(): boolean {
        return DefinitionUtils.isDefinitionNameValid(this._currentState.name);
    }

    public getState(): ICoreDefinitionState {
        return this._currentState;
    }

    public getPreviousName(): string {
        return this._originalState.name;
    }

    private _handleCloneBuildDefinition = (definition: BuildDefinition) => {
        this._updateStates(definition, true);
        this.emitChanged();
    }

    private _handleCreateAndUpdateBuildDefinition = (definition: BuildDefinition) => {
        this._updateStates(definition, false);
        this.emitChanged();
    }

    private _handleChangeName = (buildDefinitionNameActionPayload: Actions.IBuildDefinitionNameActionPayload) => {
        if (!buildDefinitionNameActionPayload.isCalledFromCreateClone) {
            this._currentState.name = buildDefinitionNameActionPayload.name;
        }
        else if (this._currentState.name === buildDefinitionNameActionPayload.defaultDefinitionName) {
            // update the name as user has not changed the default name yet
            this._currentState.name = buildDefinitionNameActionPayload.name;
        }
        this.emitChanged();
    }

    private _handleChangeDescription = (description: string) => {
        this._currentState.description = description;
        this.emitChanged();
    }

    private _handleChangeBuildNumberFormat = (buildNumberFormat: string) => {
        this._currentState.buildNumberFormat = buildNumberFormat;
        this.emitChanged();
    }

    private _handleChangeBadgeEnabled = (badgeEnabled: boolean) => {
        this._currentState.oldBadgeEnabled = badgeEnabled;
        this.emitChanged();
    }

    private _handleChangeQueueStatus = (queueStatus: DefinitionQueueStatus) => {
        this._currentState.queueStatus = queueStatus;
        this.emitChanged();
    }

    private _updateStates(definition: BuildDefinition, isClone: boolean) {
        this._updateState(definition, this._originalState, isClone);
        this._updateState(definition, this._currentState, isClone);
    }

    private _updateState(buildDefinition: BuildDefinition, state: ICoreDefinitionState, isClone: boolean): void {
        state.isPublicProject = buildDefinition.project && buildDefinition.project.visibility === ProjectVisibility.Public;

        state.name = buildDefinition.name;
        state.description = buildDefinition.description;
        state.buildNumberFormat = buildDefinition.buildNumberFormat;
        state.queueStatus = buildDefinition.queueStatus ? buildDefinition.queueStatus : DefinitionQueueStatus.Enabled;
        state.folderPath = buildDefinition.path;

        // if not enabled, set enabled when public
        state.oldBadgeEnabled = buildDefinition.badgeEnabled ? buildDefinition.badgeEnabled : state.isPublicProject;

        if (isClone) {
            state.cloneId = buildDefinition.id;
            state.cloneRevision = buildDefinition.revision;
            state.id = 0;
            state.revision = 0;
        }
        else {
            state.id = buildDefinition.id;
            state.revision = buildDefinition.revision;
            if (state.id > 0) {
                state.cloneId = null;
                state.cloneRevision = null;
            }
        }
    }
}
