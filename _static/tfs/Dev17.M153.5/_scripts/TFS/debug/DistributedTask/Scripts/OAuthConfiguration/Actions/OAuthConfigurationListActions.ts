import Action_Base = require("VSS/Flux/Action");
import { ActionsHubBase } from "DistributedTaskControls/Common/Actions/Base";
import Contracts = require("TFS/ServiceEndpoint/Contracts");
import { ActionKeys } from "DistributedTask/Scripts/OAuthConfiguration/Common/OAuthConfigurationConstants";

export interface ILoadOAuthConfigurationListPayload {
    oauthConfigurations: Contracts.OAuthConfiguration[];
    sourceTypes: Contracts.ServiceEndpointType[];
}

export class OAuthConfigurationListActions extends ActionsHubBase {

    public static getKey(): string {
        return ActionKeys.OAuthConfigurationList;
    }

    public initialize(): void {
        this._oauthConfigurationListLoaded = new Action_Base.Action<ILoadOAuthConfigurationListPayload>();
        this._oauthConfigurationDeleted = new Action_Base.Action<string>();
        this._oauthConfigurationListUpdated = new Action_Base.Action<Contracts.OAuthConfiguration>();
    }

    public get getOAuthConfigurations(): Action_Base.Action<ILoadOAuthConfigurationListPayload> {
        return this._oauthConfigurationListLoaded;
    }

    public get deleteOAuthConfiguration(): Action_Base.Action<string> {
        return this._oauthConfigurationDeleted;
    }

    public get updateOAuthConfigurationList(): Action_Base.Action<Contracts.OAuthConfiguration> {
        return this._oauthConfigurationListUpdated;
    } 

    private _oauthConfigurationListLoaded: Action_Base.Action<ILoadOAuthConfigurationListPayload>;
    private _oauthConfigurationDeleted: Action_Base.Action<string>;
    private _oauthConfigurationListUpdated: Action_Base.Action<Contracts.OAuthConfiguration>;
}