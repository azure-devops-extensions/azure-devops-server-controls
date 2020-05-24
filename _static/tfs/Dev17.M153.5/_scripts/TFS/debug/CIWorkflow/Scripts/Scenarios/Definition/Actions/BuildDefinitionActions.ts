/**
 * @brief This file contains list of All actions related to Build Definition Scenario
 */
import { IEmptyActionPayload, IActionPayload, ActionsHubBase } from "DistributedTaskControls/Common/Actions/Base";

import * as BuildContracts from "TFS/Build/Contracts";

import { Action } from "VSS/Flux/Action";

export interface IToggleBuildOptionActionPayload extends IActionPayload {
    key: string;
    value: boolean;
}

export interface IBuildDefinitionNameActionPayload extends IActionPayload {
    name: string;
    isCalledFromCreateClone?: boolean;
    defaultDefinitionName?: string;
}

/**
 * @brief Actions class
 */
export class BuildDefinitionActions extends ActionsHubBase {
    private _createBuildDefinition: Action<BuildContracts.BuildDefinition>;
    private _editBuildDefinition: Action<IEmptyActionPayload>;
    private _updateBuildDefinition: Action<BuildContracts.BuildDefinition>;
    private _cloneBuildDefinition: Action<BuildContracts.BuildDefinition>;
    private _changeName: Action<IBuildDefinitionNameActionPayload>;
    private _changeDescription: Action<string>;
    private _changeBuildNumberFormat: Action<string>;
    private _changeBadgeEnabled: Action<boolean>;
    private _changeQueueStatus: Action<BuildContracts.DefinitionQueueStatus>;
    private _changeYamlPath: Action<string>;
    private _refreshYamlContent: Action<BuildContracts.YamlProcess>;
    private _showSaveDialog: Action<IEmptyActionPayload>;
    private _closeSaveDialog: Action<IEmptyActionPayload>;
    private _updateRevisions: Action<BuildContracts.BuildDefinitionRevision[]>;
    private _fetchRevisionData: Action<IEmptyActionPayload>;
    private _toggleBuildOption: Action<IToggleBuildOptionActionPayload>;
    private _updateScope: Action<number>;
    private _updateBuildJobTimeout: Action<string>;
    private _updateBuildJobCancelTimeout: Action<string>;
    private _creatingYamlBuildDefinitionFromRepositoryFile: Action<IEmptyActionPayload>;

    public initialize(): void {
        this._createBuildDefinition = new Action<BuildContracts.BuildDefinition>();
        this._editBuildDefinition = new Action<IEmptyActionPayload>();
        this._updateBuildDefinition = new Action<BuildContracts.BuildDefinition>();
        this._cloneBuildDefinition = new Action<BuildContracts.BuildDefinition>();
        this._changeName = new Action<IBuildDefinitionNameActionPayload>();
        this._changeDescription = new Action<string>();
        this._changeBuildNumberFormat = new Action<string>();
        this._changeBadgeEnabled = new Action<boolean>();
        this._changeYamlPath = new Action<string>();
        this._refreshYamlContent  = new Action<BuildContracts.YamlProcess>();
        this._changeQueueStatus = new Action<BuildContracts.DefinitionQueueStatus>();
        this._showSaveDialog = new Action<IEmptyActionPayload>();
        this._closeSaveDialog = new Action<IEmptyActionPayload>();
        this._updateRevisions = new Action<BuildContracts.BuildDefinitionRevision[]>();
        this._fetchRevisionData = new Action<IEmptyActionPayload>();
        this._toggleBuildOption = new Action<IToggleBuildOptionActionPayload>();
        this._updateScope = new Action<number>();
        this._updateBuildJobTimeout = new Action<string>();
        this._updateBuildJobCancelTimeout = new Action<string>();
        this._creatingYamlBuildDefinitionFromRepositoryFile = new Action<IEmptyActionPayload>();
    }

    public get createBuildDefinition(): Action<BuildContracts.BuildDefinition> {
        return this._createBuildDefinition;
    }

    public static getKey(): string {
        return "CI.BuildDefinitionActions";
    }

    public get editBuildDefinition(): Action<IEmptyActionPayload> {
        return this._editBuildDefinition;
    }

    public get cloneBuildDefinition(): Action<BuildContracts.BuildDefinition> {
        return this._cloneBuildDefinition;
    }

    public get updateBuildDefinition(): Action<BuildContracts.BuildDefinition> {
        return this._updateBuildDefinition;
    }

    public get changeName(): Action<IBuildDefinitionNameActionPayload> {
        return this._changeName;
    }

    public get changeDescription(): Action<string> {
        return this._changeDescription;
    }

    public get changeBuildNumberFormat(): Action<string> {
        return this._changeBuildNumberFormat;
    }

    public get changeYamlPath(): Action<string> {
        return this._changeYamlPath;
    }

    
    public get refreshYamlContent(): Action<BuildContracts.YamlProcess> {
        return this._refreshYamlContent;
    }

    public get changeBadgeEnabled(): Action<boolean> {
        return this._changeBadgeEnabled;
    }

    public get changeQueueStatus(): Action<BuildContracts.DefinitionQueueStatus> {
        return this._changeQueueStatus;
    }

    public get showSaveDialog(): Action<IEmptyActionPayload> {
        return this._showSaveDialog;
    }

    public get closeSaveDialog(): Action<IEmptyActionPayload> {
        return this._closeSaveDialog;
    }

    public get updateRevisions(): Action<BuildContracts.BuildDefinitionRevision[]> {
        return this._updateRevisions;
    }

    public get fetchRevisionData(): Action<IEmptyActionPayload> {
        return this._fetchRevisionData;
    }

    public get toggleBuildOption(): Action<IToggleBuildOptionActionPayload> {
        return this._toggleBuildOption;
    }

    public get updateBuildJobTimeout(): Action<string> {
        return this._updateBuildJobTimeout;
    }

    public get updateBuildJobCancelTimeout(): Action<string> {
        return this._updateBuildJobCancelTimeout;
    }

    public get updateScope(): Action<number> {
        return this._updateScope;
    }

    public get creatingYamlBuildDefinitionFromRepositoryFile(): Action<IEmptyActionPayload> {
        return this._creatingYamlBuildDefinitionFromRepositoryFile;
    }
}
