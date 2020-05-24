import { IComboBoxOption } from "OfficeFabric/ComboBox";

import { ActionsHubBase, Action, IEmptyActionPayload } from "DistributedTaskControls/Common/Actions/Base";

import { ReleaseStatus, ReleaseEnvironmentStatusUpdatedEvent, ReleaseApproval } from "ReleaseManagement/Core/Contracts";

import { PipelineRelease, PipelineEnvironment, ReleaseDeployment } from "PipelineWorkflow/Scripts/Common/Types";
import { DefinitionsActionHubKeys } from "PipelineWorkflow/Scripts/Definitions/Constants";
import { IActiveReleasesFilterState } from "PipelineWorkflow/Scripts/Definitions/ActiveDefinitions/ActiveReleasesFilterStore";

export interface IActiveReleasesPayload {
    definitionId: number;
    folderPath: string;
    releases: PipelineRelease[];
    continuationToken: number;
}

export interface IUpdateReleasePayload {
    release: PipelineRelease;
}

export interface IRemoveReleasePayload {
    releaseId: number;
}

export interface IDefinitionIdPayload {
    definitionId: number;
}

export interface IActiveReleasesColumnPayload {
    definitionId: number;
    newWidth: number;
}

export class ActiveReleasesActionsHub extends ActionsHubBase {

    public static getKey(): string {
        return DefinitionsActionHubKeys.ActionHubKey_ActiveReleasesActionsHub;
    }

    public initialize(instanceId?: string): void {
        this._releasesUpdated = new Action<IActiveReleasesPayload>();
        this._releasesUpdatedWithMore = new Action<IActiveReleasesPayload>();
        this._filterUpdated = new Action<IActiveReleasesFilterState>();
        this._setCurrentlyDeployedState = new Action<boolean>();
        this._updateRelease = new Action<IUpdateReleasePayload>();
        this._releaseCreated = new Action<IUpdateReleasePayload>();
        this._removeRelease = new Action<IRemoveReleasePayload>();
        this._releaseEnvironmentUpdated = new Action<PipelineEnvironment>();
        this._releaseEnvironmentStatusUpdated = new Action<ReleaseEnvironmentStatusUpdatedEvent>();
        this._artifactSourceBranchesUpdated = new Action<string[]>();
        this._resetFilterState = new Action<any>();
        this._setLastDeploymentForSearchedRd = new Action<ReleaseDeployment>();
        this._setLastDeploymentForFavoritedRd = new Action<ReleaseDeployment>();
        this._completeReleaseAddition = new Action<IEmptyActionPayload>();
        this._setAllTags = new Action<string[]>();
        this._updateDefinitionId = new Action<IDefinitionIdPayload>();
        this._clearReleases = new Action<any>();
        this._onEnvironmentColumnResize = new Action<IActiveReleasesColumnPayload>();
        this._onReleaseColumnResize = new Action<IActiveReleasesColumnPayload>();
        this._onReleaseExpand = new Action<IActiveReleasesColumnPayload>();
    }

    public get artifactSourceBranchesUpdated(): Action<string[]> {
        return this._artifactSourceBranchesUpdated;
    }

    public get releasesUpdated(): Action<IActiveReleasesPayload> {
        return this._releasesUpdated;
    }

    public get releasesUpdatedWithMore(): Action<IActiveReleasesPayload> {
        return this._releasesUpdatedWithMore;
    }

    public get releaseEnvironmentStatusUpdated(): Action<ReleaseEnvironmentStatusUpdatedEvent> {
        return this._releaseEnvironmentStatusUpdated;
    }

    public get filterUpdated(): Action<IActiveReleasesFilterState> {
        return this._filterUpdated;
    }

    public get releaseEnvironmentUpdated(): Action<PipelineEnvironment> {
        return this._releaseEnvironmentUpdated;
    }

    public get setCurrentlyDeployedState(): Action<boolean> {
        return this._setCurrentlyDeployedState;
    }

    public get updateRelease(): Action<IUpdateReleasePayload> {
        return this._updateRelease;
    }

    public get releaseCreated(): Action<IUpdateReleasePayload> {
        return this._releaseCreated;
    }

    public get removeRelease(): Action<IRemoveReleasePayload> {
        return this._removeRelease;
    }

    public get resetFilterState(): Action<any> {
        return this._resetFilterState;
    }

    public get setLastDeploymentForSearchedRd(): Action<ReleaseDeployment> {
        return this._setLastDeploymentForSearchedRd;
    }

    public get setLastDeploymentForFavoritedRd(): Action<ReleaseDeployment> {
        return this._setLastDeploymentForFavoritedRd;
    }

    public get completeReleaseAddition(): Action<IEmptyActionPayload> {
        return this._completeReleaseAddition;
    }

    public get setAllTags(): Action<string[]> {
        return this._setAllTags;
    }

    public get updateDefinitionId(): Action<IDefinitionIdPayload> {
        return this._updateDefinitionId;
    }

    public get clearReleases(): Action<any> {
        return this._clearReleases;
    }

    public get onEnvironmentColumnResize(): Action<IActiveReleasesColumnPayload> {
        return this._onEnvironmentColumnResize;
    }

    public get onReleaseColumnResize(): Action<IActiveReleasesColumnPayload> {
        return this._onReleaseColumnResize;
    }

    public get onReleaseExpand(): Action<IActiveReleasesColumnPayload> {
        return this._onReleaseExpand;
    }

    private _releaseEnvironmentUpdated: Action<PipelineEnvironment>;
    private _releasesUpdated: Action<IActiveReleasesPayload>;
    private _releasesUpdatedWithMore: Action<IActiveReleasesPayload>;
    private _releaseEnvironmentStatusUpdated: Action<ReleaseEnvironmentStatusUpdatedEvent>;
    private _updateRelease: Action<IUpdateReleasePayload>;
    private _releaseCreated: Action<IUpdateReleasePayload>;
    private _removeRelease: Action<IRemoveReleasePayload>;
    private _filterUpdated: Action<IActiveReleasesFilterState>;
    private _setCurrentlyDeployedState: Action<boolean>;
    private _updateDefinitionId: Action<IDefinitionIdPayload>;
    private _artifactSourceBranchesUpdated: Action<string[]>;
    private _resetFilterState: Action<any>;
    private _setLastDeploymentForSearchedRd: Action<ReleaseDeployment>;
    private _setLastDeploymentForFavoritedRd: Action<ReleaseDeployment>;
    private _completeReleaseAddition: Action<IEmptyActionPayload>;
    private _setAllTags: Action<string[]>;
    private _clearReleases: Action<any>;
    private _onEnvironmentColumnResize: Action<IActiveReleasesColumnPayload>;
    private _onReleaseColumnResize: Action<IActiveReleasesColumnPayload>;
    private _onReleaseExpand: Action<IActiveReleasesColumnPayload>;
}