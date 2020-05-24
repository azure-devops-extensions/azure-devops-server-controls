/**
 * @brief This file contains list of all actions related to external service end points
 */
import { ServiceEndpoint } from "TFS/ServiceEndpoint/Contracts";

import { Action } from "VSS/Flux/Action";
import { ActionsHubBase } from "DistributedTaskControls/Common/Actions/Base";
import { ActionsKeys } from "DistributedTaskControls/Common/Common";

export interface IServiceEndpointApiData {
    endpointId: string;
    endpointName: string;
    url: string;
    username: string;
    passwordKey: string;
    type: string;
    scheme: string;
    parameters?: {
        [key: string]: string;
    };
}

export interface INewServiceEndpoint {
    endpoint: ServiceEndpoint;
    errorMessage: string;
}

export interface IServiceEndpoints {
    type: string;
    endpoints: ServiceEndpoint[];
    errorMessage: string;
}

export interface INewConnectionStatus {
    connectionName: string;
    authRequestUrl: string;
    strongboxKey: string;
    accessToken: string;
    errorMessage: string;
    isAuthorizing: boolean;
    scheme: string;
    loginUser: string;
    loginUserAvatarUrl: string;
    serverUrl: string;
    type: string;
    data: IDictionaryStringTo<string>;
    popupWindow: Window;
}

/**
 * @brief Actions class
 */
export class ConnectedServiceEndpointActions extends ActionsHubBase {

    public initialize(): void {
        this._addedNewServiceEndpoint = new Action<INewServiceEndpoint>();
        this._updateServiceEndpoints = new Action<IServiceEndpoints>();
        this._updateNewConnectionInfo = new Action<INewConnectionStatus>();
    }

    public static getKey(): string {
        return ActionsKeys.ConnectedServiceEndpointActions;
    }

    public get UpdateNewConnectionInfo(): Action<INewConnectionStatus> {
        return this._updateNewConnectionInfo;
    }

    public get AddedNewServiceEndpoint(): Action<INewServiceEndpoint> {
        return this._addedNewServiceEndpoint;
    }

    public get UpdateServiceEndpoints(): Action<IServiceEndpoints> {
        return this._updateServiceEndpoints;
    }

    private _updateNewConnectionInfo: Action<INewConnectionStatus>;
    private _addedNewServiceEndpoint: Action<INewServiceEndpoint>;
    private _updateServiceEndpoints: Action<IServiceEndpoints>;
}
