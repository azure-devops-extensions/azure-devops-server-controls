import { ActionsHubBase, Action, IEmptyActionPayload } from "DistributedTaskControls/Common/Actions/Base";
import { ActionsKeys } from "DistributedTaskControls/Common/Common";

export interface IInitializeTaskGroupPropertiesPayload {
    name: string;
    description: string;
    category: string;
}

export class TaskGroupPropertiesActions extends ActionsHubBase {

    public initialize(instanceId?: string): void {
        this._initializeTaskGroupProperties = new Action<IInitializeTaskGroupPropertiesPayload>();
        this._changeTaskGroupName = new Action<string>();
        this._changeTaskGroupDescription = new Action<string>();
        this._changeTaskGroupCategory = new Action<string>();
    }

    public static getKey(): string {
        return ActionsKeys.TaskGroupPropertiesActions;
    }

    public get InitializeTaskGroupProperties(): Action<IInitializeTaskGroupPropertiesPayload> {
        return this._initializeTaskGroupProperties;
    }

    public get ChangeTaskGroupName(): Action<string> {
        return this._changeTaskGroupName;
    }

    public get ChangeTaskGroupDescription(): Action<string> {
        return this._changeTaskGroupDescription;
    }

    public get ChangeTaskGroupCategory(): Action<string> {
        return this._changeTaskGroupCategory;
    }

    private _initializeTaskGroupProperties: Action<IInitializeTaskGroupPropertiesPayload>;
    private _changeTaskGroupName: Action<string>;
    private _changeTaskGroupDescription: Action<string>;
    private _changeTaskGroupCategory: Action<string>;
}