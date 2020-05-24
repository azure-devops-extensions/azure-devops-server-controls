import * as ActionsBase from "DistributedTaskControls/Common/Actions/Base";

import { AzureSubscription, ServiceEndpoint } from "TFS/DistributedTask/Contracts";

import { Action } from "VSS/Flux/Action";

export interface IAuthorizationState {
    showAuthorize: boolean;
    enableAuthorize: boolean;
    authInProgress: boolean;
}

export class ARMInputActions extends ActionsBase.ActionsHubBase {

    public initialize(): void {
        this._updateText = new Action<string>();
        this._updateSubscription = new Action<AzureSubscription>();
        this._updateAuthorizationState = new Action<IAuthorizationState>();
        this._showAddServiceEndpointLink = new Action<boolean>();
        this._updateEndpointAuthorizationScope = new Action<string>();
        this._updateEndpoints = new Action<IDictionaryStringTo<ServiceEndpoint>>();
    }

    public static getKey(): string {
        return "CI.ARMInputActions";
    }

    public get UpdateText(): Action<string> {
        return this._updateText;
    }

    public get UpdateSubscription(): Action<AzureSubscription> {
        return this._updateSubscription;
    }

    public get UpdateEndpoints(): Action<IDictionaryStringTo<ServiceEndpoint>> {
        return this._updateEndpoints;
    }

    public get UpdateAuthorizationState(): Action<IAuthorizationState> {
        return this._updateAuthorizationState;
    }

    public get ShowAddServiceEndpointLink(): Action<boolean> {
        return this._showAddServiceEndpointLink;
    }

    public get UpdateEndpointAuthorizationScope(): Action<string> {
        return this._updateEndpointAuthorizationScope;
    }

    private _updateText: Action<string>;
    private _updateSubscription: Action<AzureSubscription>;
    private _updateAuthorizationState: Action<IAuthorizationState>;
    private _showAddServiceEndpointLink: Action<boolean>;
    private _updateEndpointAuthorizationScope: Action<string>;
    private _updateEndpoints: Action<IDictionaryStringTo<ServiceEndpoint>>;
}