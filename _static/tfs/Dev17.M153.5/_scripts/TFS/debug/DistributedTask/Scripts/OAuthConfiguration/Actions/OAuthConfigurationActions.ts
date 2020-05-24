import { ActionsHubBase, Action } from "DistributedTaskControls/Common/Actions/Base";
import { ActionKeys } from "DistributedTask/Scripts/OAuthConfiguration/Common/OAuthConfigurationConstants";
import { OAuthConfiguration, ServiceEndpointType } from "TFS/ServiceEndpoint/Contracts";

export interface ILoadOAuthConfigurationPayload {
    oauthConfiguration: OAuthConfiguration;
    sourceTypes: ServiceEndpointType[];
}

export class OAuthConfigurationActions extends ActionsHubBase {

    public static getKey(): string {
        return ActionKeys.OAuthConfiguration;
    }

    public initialize(): void {
        this._createOAuthConfiguration = new Action<OAuthConfiguration>();
        this._loadOAuthConfiguration = new Action<ILoadOAuthConfigurationPayload>();
        this._newOAuthConfiguration = new Action<ServiceEndpointType[]>();
        this._updateName = new Action<string>();
        this._updateSourceType = new Action<string>();
        this._updateUrl = new Action<string>();
        this._updateClientId = new Action<string>();
        this._updateClientSecret = new Action<string>();
    }

    public get createOAuthConfiguration(): Action<OAuthConfiguration> {
        return this._createOAuthConfiguration;
    }

    public get loadOAuthConfiguration(): Action<ILoadOAuthConfigurationPayload> {
        return this._loadOAuthConfiguration;
    }

    public get newOAuthConfiguration(): Action<ServiceEndpointType[]> {
        return this._newOAuthConfiguration;
    }

    public get updateName(): Action<string> {
        return this._updateName;
    }

    public get updateSourceType(): Action<string> {
        return this._updateSourceType;
    }

    public get updateUrl(): Action<string> {
        return this._updateUrl;
    }

    public get updateClientId(): Action<string> {
        return this._updateClientId;
    }
    
    public get updateClientSecret(): Action<string> {
        return this._updateClientSecret;
    }

    private _createOAuthConfiguration: Action<OAuthConfiguration>;
    private _loadOAuthConfiguration: Action<ILoadOAuthConfigurationPayload>;
    private _newOAuthConfiguration: Action<ServiceEndpointType[]>;
    private _updateName: Action<string>;
    private _updateSourceType: Action<string>;
    private _updateUrl: Action<string>;
    private _updateClientId: Action<string>;
    private _updateClientSecret: Action<string>;
}