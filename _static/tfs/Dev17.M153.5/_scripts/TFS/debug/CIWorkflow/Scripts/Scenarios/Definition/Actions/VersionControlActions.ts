/**
 * @brief This file contains list of actions related to all version control scenarios
 */
import { IRepository, IRepositoryWebhook } from "CIWorkflow/Scripts/Scenarios/Definition/Sources/VersionControlInterfaces";

import { ActionsHubBase , IEmptyActionPayload } from "DistributedTaskControls/Common/Actions/Base";

import { Action } from "VSS/Flux/Action";

// TODO remove reference to stores and move mapping items to Actions or Interfaces
import { ISubversionMappingItem } from "../Stores/SubversionStore";
import { ITfvcMappingItem } from "../Stores/TfvcMappingHelper";

import { DefinitionTriggerType } from "TFS/Build/Contracts";

export enum RepositoryListState {
    Uninitialized = 0,
    TopRepositories = 1,
    AllRepositories = 2,
    FetchingTopRepositories = 3,
    FetchingAllRepositories = 4
}

export interface IVersionControlActionPayload {
    errorMessage: string;
}

export interface IVersionControlActionConnectedPayload extends IVersionControlActionPayload {
    connectionId: string;
    repositoryType: string;
}

export interface IRepositoriesPayload extends IVersionControlActionConnectedPayload {
    repositories: IRepository[];
    listState: RepositoryListState;
}

export interface IRepositoryBranchesPayload extends IVersionControlActionConnectedPayload {
    repository: IRepository;
    branches: string[];
}

export interface IRepositoryPayload extends IVersionControlActionPayload {
    repository: IRepository;
    isComplete: boolean;
}

export interface IRepositoryWebhooksPayload extends IVersionControlActionConnectedPayload {
    repository: IRepository;
    webhooks: IRepositoryWebhook[];
}

export interface IRestoreRepositoryWebhooksPayload extends IVersionControlActionConnectedPayload {
    repository: IRepository;
    repositoryType: string;
    triggerTypes: DefinitionTriggerType[];
}

export interface IRepositoryWebhookRestorationStatusChangedPayload extends IVersionControlActionConnectedPayload {
    triggerTypes: DefinitionTriggerType[];
    isRestoring: boolean;
}

export interface IVersionControlPropertyChangedPayload {
    propertyName: string;
    value: string | ISubversionMappingItem | ITfvcMappingItem;
}

export interface IMappingsPayload extends IVersionControlActionPayload {
    type: string;
    tfvcMappings?: ITfvcMappingItem[];
    svnMappings?: ISubversionMappingItem[];
}

export interface IMappingPayload extends IVersionControlActionPayload {
    type: string;
    tfvcMapping?: ITfvcMappingItem;
    svnMapping?: ISubversionMappingItem;
}

/**
 * @brief Actions class
 */
export class VersionControlActions extends ActionsHubBase {
    private _updateRepositories: Action<IRepositoriesPayload>;
    private _updateTopRepositories: Action<IRepositoriesPayload>;
    private _updateSelectedRepository: Action<IRepositoryPayload>;
    private _updateBranches: Action<IRepositoryBranchesPayload>;
    private _updateSelectedBranch: Action<string>;
    private _updateSelectedConnection: Action<string>;
    private _requestAllRepositories: Action<string>;
    private _refreshConnectionStatus: Action<IEmptyActionPayload>;
    private _updateRemoteWebhooks: Action<IRepositoryWebhooksPayload>;
    private _restoreWebhook: Action<IRestoreRepositoryWebhooksPayload>;
    private _webhooksRestored: Action<IRepositoryWebhooksPayload>;
    private _webhooksRestorationStatusChanged: Action<IRepositoryWebhookRestorationStatusChangedPayload>;
    private _updateProperty: Action<IVersionControlPropertyChangedPayload>;
    private _updateMappings: Action<IMappingsPayload>;
    private _updateMapping: Action<IMappingPayload>;
    private _addMapping: Action<IMappingPayload>;
    private _clearError: Action<IEmptyActionPayload>;

    public initialize(): void {
        this._updateSelectedConnection = new Action<string>();
        this._updateRepositories = new Action<IRepositoriesPayload>();
        this._updateTopRepositories = new Action<IRepositoriesPayload>();
        this._updateSelectedRepository = new Action<IRepositoryPayload>();
        this._updateBranches = new Action<IRepositoryBranchesPayload>();
        this._requestAllRepositories = new Action<string>();
        this._refreshConnectionStatus = new Action<IEmptyActionPayload>();
        this._updateSelectedBranch = new Action<string>();
        this._updateRemoteWebhooks = new Action<IRepositoryWebhooksPayload>();
        this._restoreWebhook = new Action<IRestoreRepositoryWebhooksPayload>();
        this._webhooksRestored = new Action<IRepositoryWebhooksPayload>();
        this._webhooksRestorationStatusChanged = new Action<IRepositoryWebhookRestorationStatusChangedPayload>();
        this._updateProperty = new Action<IVersionControlPropertyChangedPayload>();
        this._updateMappings = new Action<IMappingsPayload>();
        this._updateMapping = new Action<IMappingPayload>();
        this._addMapping = new Action<IMappingPayload>();
        this._clearError = new Action<IEmptyActionPayload>();
    }

    public static getKey(): string {
        return "CI.VersionControlActions";
    }

    public get updateRepositories(): Action<IRepositoriesPayload> {
        return this._updateRepositories;
    }

    public get updateBranches(): Action<IRepositoryBranchesPayload> {
        return this._updateBranches;
    }

    public get updateSelectedRepository(): Action<IRepositoryPayload> {
        return this._updateSelectedRepository;
    }

    public get updateSelectedConnection(): Action<string> {
        return this._updateSelectedConnection;
    }

    public get requestAllRepositories(): Action<string> {
        return this._requestAllRepositories;
    }

    public get refreshConnectionStatus(): Action<IEmptyActionPayload> {
        return this._refreshConnectionStatus;
    }

    public get updateSelectedBranch(): Action<string> {
        return this._updateSelectedBranch;
    }

    public get updateRemoteWebhooks(): Action<IRepositoryWebhooksPayload> {
        return this._updateRemoteWebhooks;
    }

    public get restoreWebhook(): Action<IRestoreRepositoryWebhooksPayload> {
        return this._restoreWebhook;
    }

    public get webhooksRestored(): Action<IRepositoryWebhooksPayload> {
        return this._webhooksRestored;
    }

    public get webhooksRestorationStatusChanged(): Action<IRepositoryWebhookRestorationStatusChangedPayload> {
        return this._webhooksRestorationStatusChanged;
    }

    public get updateProperty(): Action<IVersionControlPropertyChangedPayload> {
        return this._updateProperty;
    }

    public get updateMappings(): Action<IMappingsPayload> {
        return this._updateMappings;
    }

    public get updateMapping(): Action<IMappingPayload> {
        return this._updateMapping;
    }

    public get addMapping(): Action<IMappingPayload> {
        return this._addMapping;
    }

    public get clearError(): Action<IEmptyActionPayload> {
        return this._clearError;
    }
}
