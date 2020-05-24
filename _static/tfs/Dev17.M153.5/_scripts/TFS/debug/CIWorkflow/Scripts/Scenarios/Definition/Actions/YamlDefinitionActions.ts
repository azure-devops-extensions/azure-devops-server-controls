import { IRepositoryItem } from "CIWorkflow/Scripts/Scenarios/Definition/Sources/VersionControlInterfaces";

import { ActionsHubBase } from "DistributedTaskControls/Common/Actions/Base";

import { Action } from "VSS/Flux/Action";

export interface IPathContentsPayload {
    connectionId: string;
    repositoryType: string;
    errorMessage?: string;
    items: IRepositoryItem[];
}

export interface IBooleanPayload {
    value: boolean;
}

export class YamlDefinitionActions extends ActionsHubBase {
    private readonly _actionScope = "YAMLDEFINITIONACTIONS_SCOPE";
    private _listUnusedYamlFiles: Action<IPathContentsPayload>;
    private _setListUnusedYamlFilesEnabled: Action<IBooleanPayload>;

    public initialize(): void {
        this._listUnusedYamlFiles = new Action<IPathContentsPayload>(this._actionScope);
        this._setListUnusedYamlFilesEnabled = new Action<IBooleanPayload>(this._actionScope);
    }

    public static getKey(): string {
        return "CI.YamlDefinitionActions";
    }

    public get listUnusedYamlFiles(): Action<IPathContentsPayload> {
        return this._listUnusedYamlFiles;
    }

    public get setListUnusedYamlFilesEnabled(): Action<IBooleanPayload> {
        return this._setListUnusedYamlFilesEnabled;
    }
}
