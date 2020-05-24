import { ServiceEndpointType } from "DistributedTasksCommon/ServiceEndpoints/ServiceEndpoint.Common";
import { StoreKeys, EndpointAuthorizationSchemes } from "DistributedTaskControls/Common/Common";
import { StoreBase } from "DistributedTaskControls/Common/Stores/Base";
import * as Actions from "DistributedTaskControls/Actions/ConnectedServiceEndpointActions";
import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";

import { EndpointAuthorization } from "TFS/ServiceEndpoint/Contracts";

import * as Utils_String from "VSS/Utils/String";

export interface IState {
    isAuthorized: boolean;
    canAddNewConnection: boolean;
    connectionInfo: Actions.INewConnectionStatus;
}

export class IConnectedServiceEndPointState {
    authRequestUrl: string;
    errorMessage: string;
    isAuthorizing: boolean;
}

export class ConnectedServiceStore extends StoreBase {
    constructor() {
        super();

        this._connectionInfo = <Actions.INewConnectionStatus>{
            scheme: EndpointAuthorizationSchemes.PersonalAccessToken,
        };
    }

    public static getKey(): string {
        return StoreKeys.ConnectedServiceEndpointStore;
    }

    public initialize(id: string): void {
        this._connectionInfo.type = id;
        this._connectedServiceEndpointActions = ActionsHubManager.GetActionsHub<Actions.ConnectedServiceEndpointActions>(Actions.ConnectedServiceEndpointActions);
        this._connectedServiceEndpointActions.UpdateNewConnectionInfo.addListener(this._handleUpdateNewConnectionInfo);
        this._connectedServiceEndpointActions.AddedNewServiceEndpoint.addListener(this._handleAddNewServiceEndpoint);
    }

    protected disposeInternal(): void {
        this._connectedServiceEndpointActions.UpdateNewConnectionInfo.removeListener(this._handleUpdateNewConnectionInfo);
        this._connectedServiceEndpointActions.AddedNewServiceEndpoint.removeListener(this._handleAddNewServiceEndpoint);
    }

    public getState(): IState {
        return {
            isAuthorized: this._isAuthorized(),
            canAddNewConnection: this._canAddNewConnection(),
            connectionInfo: this._connectionInfo
        } as IState;
    }

    public getServiceEndpointDetails(): Actions.IServiceEndpointApiData {
        let connectionIdTemp = Utils_String.generateUID();

        let password = this._connectionInfo.strongboxKey ? this._connectionInfo.strongboxKey : this._connectionInfo.accessToken;

        let params = this._connectionInfo.data;
        if (this._connectionInfo.loginUserAvatarUrl) {
            params = {
                ...this._connectionInfo.data,
                AvatarUrl: this._connectionInfo.loginUserAvatarUrl
            };
        }

        return {
            endpointId: connectionIdTemp,
            endpointName: this._connectionInfo.connectionName,
            url: this._connectionInfo.serverUrl,
            username: this._connectionInfo.loginUser,
            passwordKey: password,
            type: this._connectionInfo.type,
            scheme: this._connectionInfo.scheme,
            parameters: params
        } as Actions.IServiceEndpointApiData;
    }

    public getAuthorizationInfo(): EndpointAuthorization {
        if (this._connectionInfo.type === ServiceEndpointType.GitHubEnterprise && this._connectionInfo.scheme === EndpointAuthorizationSchemes.PersonalAccessToken ) {
            // The auth info for ghe has to match what is specified in the DistributedTask\Service\ExtensionPackages\GitHubEnterprise\vss-extension.json file
            // This means the parameter name is apitoken instead of token and the scheme is Token instead of PersonalAccessToken
            return { parameters: {
                         apiToken: this._connectionInfo.accessToken
                     },
                     scheme: "Token" };
        }

        // For the built-in types, this will be created later
        return undefined;
    }

    private _isAuthorized(): boolean {
        const connectionEndpointType: string = this._connectionInfo.type || Utils_String.empty;

        switch (connectionEndpointType) {
            case ServiceEndpointType.GitHub:
            case ServiceEndpointType.GitHubBoards:
                return this._isGitHubAuthorized();

            case ServiceEndpointType.GitHubEnterprise:
                return !!this._connectionInfo.serverUrl && this._isGitHubAuthorized();

            case ServiceEndpointType.Bitbucket:
                return (!!this._connectionInfo.strongboxKey && this._connectionInfo.scheme === EndpointAuthorizationSchemes.OAuth) ||
                    (!!this._connectionInfo.loginUser && !!this._connectionInfo.accessToken && this._connectionInfo.scheme === EndpointAuthorizationSchemes.UsernamePassword);

            case ServiceEndpointType.ExternalGit:
            case ServiceEndpointType.Subversion:
                return !!this._connectionInfo.serverUrl;

            default:
                return false;
        }
    }

    private _canAddNewConnection(): boolean {
        return !!this._connectionInfo.connectionName && this._isAuthorized();
    }

    private _isGitHubAuthorized(): boolean {
        return (!!this._connectionInfo.strongboxKey && this._connectionInfo.scheme === EndpointAuthorizationSchemes.OAuth) ||
            (!!this._connectionInfo.accessToken && this._connectionInfo.scheme === EndpointAuthorizationSchemes.PersonalAccessToken) ||
            (!!this._connectionInfo.loginUser && !!this._connectionInfo.accessToken && this._connectionInfo.scheme === EndpointAuthorizationSchemes.UsernamePassword);
    }

    private _updateConnectionInfo(connectionInfo: Actions.INewConnectionStatus): void {
        if (connectionInfo.authRequestUrl !== undefined) {
            this._connectionInfo.authRequestUrl = connectionInfo.authRequestUrl;
        }

        if (connectionInfo.errorMessage !== undefined) {
            this._connectionInfo.errorMessage = connectionInfo.errorMessage;
        }

        if (connectionInfo.isAuthorizing !== undefined) {
            this._connectionInfo.isAuthorizing = connectionInfo.isAuthorizing;
        }

        if (connectionInfo.strongboxKey !== undefined) {
            this._connectionInfo.strongboxKey = connectionInfo.strongboxKey;
        }

        if (connectionInfo.accessToken !== undefined) {
            this._connectionInfo.accessToken = connectionInfo.accessToken;
        }

        if (connectionInfo.connectionName !== undefined) {
            this._connectionInfo.connectionName = connectionInfo.connectionName;
        }

        if (connectionInfo.scheme !== undefined) {
            this._connectionInfo.scheme = connectionInfo.scheme;
        }

        if (connectionInfo.type !== undefined) {
            this._connectionInfo.type = connectionInfo.type;
        }

        if (connectionInfo.serverUrl !== undefined) {
            this._connectionInfo.serverUrl = connectionInfo.serverUrl;
        }

        if (connectionInfo.loginUser !== undefined) {
            this._connectionInfo.loginUser = connectionInfo.loginUser;
        }

        if (connectionInfo.loginUserAvatarUrl !== undefined) {
            this._connectionInfo.loginUserAvatarUrl = connectionInfo.loginUserAvatarUrl;
        }

        if (connectionInfo.data !== undefined) {
            this._connectionInfo.data = connectionInfo.data;
        }

        if (connectionInfo.popupWindow !== undefined) {
            this._connectionInfo.popupWindow = connectionInfo.popupWindow;
        }
    }

    private _handleUpdateNewConnectionInfo = (connectionInfo: Actions.INewConnectionStatus) => {
        if (this._connectionInfo.type === connectionInfo.type) {
            this._updateConnectionInfo(connectionInfo);
        }
        this.emitChanged();
    }

    private _handleAddNewServiceEndpoint = (payload: Actions.INewServiceEndpoint) => {
        // clear the connection info on successful add
        this._connectionInfo = <Actions.INewConnectionStatus>{
            scheme: EndpointAuthorizationSchemes.PersonalAccessToken,
            type: this._connectionInfo.type
        };

        this.emitChanged();
    }

    private _connectionInfo: Actions.INewConnectionStatus;
    private _connectedServiceEndpointActions: Actions.ConnectedServiceEndpointActions;
}