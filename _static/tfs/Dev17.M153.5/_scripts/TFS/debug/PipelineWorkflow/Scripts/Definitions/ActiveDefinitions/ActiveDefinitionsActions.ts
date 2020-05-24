import * as ActionBase from "DistributedTaskControls/Common/Actions/Base";

import { DefinitionsActionHubKeys } from "PipelineWorkflow/Scripts/Definitions/Constants";
import { PipelineDefinition } from "PipelineWorkflow/Scripts/Common/Types";
import { IActiveDefinitionReference } from "PipelineWorkflow/Scripts/Definitions/ReleasesHubServiceData";
import { ReleaseEnvironment } from "ReleaseManagement/Core/Contracts";

import { PinArgs } from "TFSUI/Dashboards/AddToDashboard";

export interface IActiveDefinitionsSearchResultsPayload {
    isLoading: boolean;
    showSearchResults: boolean;
    releaseDefinitions: PipelineDefinition[];
}

export interface IActiveDefinitionsPayload {
    activeDefinitions: IActiveDefinitionReference[];
    recentDefinitions: IActiveDefinitionReference[];
}

export class ActiveDefinitionsActionsHub extends ActionBase.ActionsHubBase {
    public static getKey(): string {
        return DefinitionsActionHubKeys.ActionHubKey_ActiveDefinitionsActionHub;
    }

    public initialize(): void {
        this._setActiveDefinitions = new ActionBase.Action<IActiveDefinitionsPayload>();
        this._releaseEnvironmentUpdated = new ActionBase.Action<ReleaseEnvironment>();
        this._environmentLastDeploymentUpdated = new ActionBase.Action<ReleaseEnvironment>();
        this._setSearchResultsForLeftPane = new ActionBase.Action<IActiveDefinitionsSearchResultsPayload>();
		this._setInitialSelectedDefinition = new ActionBase.Action<number>();
        this._setDefaultSelectedDefinitionForDefinitionsHub = new ActionBase.Action<any>();
		this._deleteDefinition = new ActionBase.Action<number>();
        this._updateLoadingStatus = new ActionBase.Action<boolean>();
        this._toggleActiveReleasesFilterBar = new ActionBase.Action<boolean>();
        this._clearFavoriteInProgressId = new ActionBase.Action<any>();
        this._setAddToDashboardMessageState = new ActionBase.Action<PinArgs>();
    }

    public get setActiveDefinitions(): ActionBase.Action<IActiveDefinitionsPayload> {
        return this._setActiveDefinitions;
    }

    public get releaseEnvironmentUpdated(): ActionBase.Action<ReleaseEnvironment> {
        return this._releaseEnvironmentUpdated;
    }

    public get environmentLastDeploymentUpdated(): ActionBase.Action<ReleaseEnvironment> {
        return this._environmentLastDeploymentUpdated;
    }

    public get setSearchResults(): ActionBase.Action<IActiveDefinitionsSearchResultsPayload> {
        return this._setSearchResultsForLeftPane;
    }

    public get setInitialSelectedDefinition(): ActionBase.Action<number> {
        return this._setInitialSelectedDefinition;
	}

    public get setDefaultSelectedDefinitionForDefinitionsHub(): ActionBase.Action<any> {
        return this._setDefaultSelectedDefinitionForDefinitionsHub;
	}

	public get deleteDefinition(): ActionBase.Action<number> {
		return this._deleteDefinition;
	}

    public get updateLoadingStatus(): ActionBase.Action<boolean> {
        return this._updateLoadingStatus;
    }

    public get toggleActiveReleasesFilterBar(): ActionBase.Action<boolean> {
        return this._toggleActiveReleasesFilterBar;
    }

    public get clearFavoriteInProgressId(): ActionBase.Action<any> {
        return this._clearFavoriteInProgressId;
    }

    public get setAddToDashboardMessageState(): ActionBase.Action<PinArgs> {
        return this._setAddToDashboardMessageState;
    }

    private _setActiveDefinitions: ActionBase.Action<IActiveDefinitionsPayload>;
    private _releaseEnvironmentUpdated: ActionBase.Action<ReleaseEnvironment>;
    private _environmentLastDeploymentUpdated: ActionBase.Action<ReleaseEnvironment>;
    private _setSearchResultsForLeftPane: ActionBase.Action<IActiveDefinitionsSearchResultsPayload>;
    private _setInitialSelectedDefinition: ActionBase.Action<number>;
    private _setDefaultSelectedDefinitionForDefinitionsHub: ActionBase.Action<any>;
    private _deleteDefinition: ActionBase.Action<number>;
    private _updateLoadingStatus: ActionBase.Action<boolean>;
    private _toggleActiveReleasesFilterBar: ActionBase.Action<boolean>;
    private _clearFavoriteInProgressId: ActionBase.Action<any>;
    private _setAddToDashboardMessageState: ActionBase.Action<PinArgs>;
}