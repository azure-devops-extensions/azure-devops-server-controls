import { empty as emptyString, localeComparer as localeStringComparer } from "VSS/Utils/String";

import * as DistributedTaskContracts from "TFS/DistributedTask/Contracts";

import * as Actions from "DistributedTaskControls/Actions/TaskGroupPropertiesActions";
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { AppContext, AppCapability } from "DistributedTaskControls/Common/AppContext";
import { StoreKeys } from "DistributedTaskControls/Common/Common";
import * as ComponentBase from "DistributedTaskControls/Common/Components/Base";
import * as StoreCommonBase from "DistributedTaskControls/Common/Stores/Base";
import * as Resources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";

export interface ITaskGroupPropertiesState extends ComponentBase.IState {
    name: string;
    description: string;
    category: string;
}

export class TaskGroupPropertiesStore extends StoreCommonBase.DataStoreBase {

    constructor() {
        super();
        this._originalState = {
            name: emptyString,
            description: emptyString,
            category: emptyString
        };

        this._currentState = {
            name: emptyString,
            description: emptyString,
            category: emptyString
        };
    }

    public initialize(instanceId?: string): void {
        super.initialize(instanceId);
        this._taskGroupPropertiesActions = ActionsHubManager.GetActionsHub<Actions.TaskGroupPropertiesActions>(Actions.TaskGroupPropertiesActions, instanceId);
        this._taskGroupPropertiesActions.InitializeTaskGroupProperties.addListener(this._handleInitializeTaskGroupProperties);
        this._taskGroupPropertiesActions.ChangeTaskGroupName.addListener(this._handleTaskGroupNameChanged);
        this._taskGroupPropertiesActions.ChangeTaskGroupDescription.addListener(this._handleTaskGroupDescriptionChanged);
        this._taskGroupPropertiesActions.ChangeTaskGroupCategory.addListener(this._handleTaskGroupCategoryChanged);
    }

    protected disposeInternal(): void {
        this._taskGroupPropertiesActions.InitializeTaskGroupProperties.removeListener(this._handleInitializeTaskGroupProperties);
        this._taskGroupPropertiesActions.ChangeTaskGroupName.removeListener(this._handleTaskGroupNameChanged);
        this._taskGroupPropertiesActions.ChangeTaskGroupDescription.removeListener(this._handleTaskGroupDescriptionChanged);
        this._taskGroupPropertiesActions.ChangeTaskGroupCategory.removeListener(this._handleTaskGroupCategoryChanged);
    }

    public static getKey(): string {
        return StoreKeys.TaskGroupPropertiesStore;
    }

    public isDirty(): boolean {
        // We should have case sensitive checks because case changes should be treated as dirty
        if (localeStringComparer(this._originalState.name, this._currentState.name) !== 0) {
            return true;
        }

        if (localeStringComparer(this._originalState.description, this._currentState.description) !== 0) {
            return true;
        }

        if (localeStringComparer(this._originalState.category, this._currentState.category) !== 0) {
            return true;
        }

        return false;
    }

    public isValid(): boolean {
        if (!this._currentState.name) {
            return false;
        }

        return true;
    }

    public updateVisitor(taskGroup: DistributedTaskContracts.TaskGroup): void {
        taskGroup.name = this._currentState.name;
        taskGroup.friendlyName = this._currentState.name;

        taskGroup.description = this._currentState.description;
        taskGroup.category = this._currentState.category;
    }

    private _handleInitializeTaskGroupProperties = (payload: Actions.IInitializeTaskGroupPropertiesPayload): void => {
        let selectedCategory = payload.category;
        if (!selectedCategory) {
            selectedCategory = TaskGroupPropertiesStore._defaultBuildCategory;
            if (AppContext.instance().isCapabilitySupported(AppCapability.Deployment)) {
                selectedCategory = TaskGroupPropertiesStore._defaultReleaseCategory;
            }
        }

        this._originalState = this._getStateFromProperties(payload.name, payload.description, selectedCategory);
        this._currentState = this._getStateFromProperties(payload.name, payload.description, selectedCategory);
        this.emitChanged();
    }

    private _getStateFromProperties(name: string, description: string, category: string): ITaskGroupPropertiesState {
        return {
            category: category,
            description: description,
            name: name
        };
    }

    private _handleTaskGroupNameChanged = (name: string): void => {
        this._currentState.name = name;
        this.emitChanged();
    }

    private _handleTaskGroupDescriptionChanged = (description: string): void => {
        this._currentState.description = description;
        this.emitChanged();
    }

    private _handleTaskGroupCategoryChanged = (category: string): void => {
        this._currentState.category = category;
        this.emitChanged();
    }

    public getState(): ITaskGroupPropertiesState {
        return this._currentState;
    }

    private _taskGroupPropertiesActions: Actions.TaskGroupPropertiesActions;
    private _originalState: ITaskGroupPropertiesState;
    private _currentState: ITaskGroupPropertiesState;
    private static readonly _defaultBuildCategory: string = "Build";
    private static readonly _defaultReleaseCategory: string = "Deploy";
}