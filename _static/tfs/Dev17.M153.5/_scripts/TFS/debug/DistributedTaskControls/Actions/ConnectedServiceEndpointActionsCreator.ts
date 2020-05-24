import * as Q from "q";

import * as Actions from "DistributedTaskControls/Actions/ConnectedServiceEndpointActions";
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import * as ActionsBase from "DistributedTaskControls/Common/Actions/Base";
import { ActionCreatorKeys, EndpointAuthorizationSchemes } from "DistributedTaskControls/Common/Common";
import { IAuthRequest } from "DistributedTaskControls/Sources/ConnectedServiceClient";
import { ConnectedServiceEndpointSource } from "DistributedTaskControls/Sources/ConnectedServiceEndpointSource";
import { ConnectedServiceInputStore } from "DistributedTaskControls/SharedControls/InputControls/Components/ConnectedServiceInputStore";
import { ConnectedServiceStore } from "DistributedTaskControls/Stores/ConnectedServiceStore";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";

import { ServiceEndpoint, EndpointAuthorization } from "TFS/ServiceEndpoint/Contracts";
import * as Resources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";

import * as VSS from "VSS/VSS";
import * as Utils_String from "VSS/Utils/String";

export class ConnectedServiceActionsCreator extends ActionsBase.ActionCreatorBase {

    public static getKey(): string {
        return ActionCreatorKeys.ConnectedServiceEndpoint_ActionCreator;
    }

    public initialize(): void {
        this._actions = ActionsHubManager.GetActionsHub<Actions.ConnectedServiceEndpointActions>(Actions.ConnectedServiceEndpointActions);
    }

    /**
     * Get the serviceEndpoints for the serviceType
     *
     * @param {string} serviceType
     * @param {string} [selectedConnectionId]
     * @param {string} [selectedRepository]
     * @returns {IPromise<void>}
     *
     * @memberof ConnectedServiceActionsCreator
     */
    public getServiceEndpoints(serviceType: string, selectedConnectionId?: string, selectedRepository?: string): IPromise<void> {

        let q = Q.defer<void>();

        // Get all the service endpoints of endpointType as serviceType
        ConnectedServiceEndpointSource.instance().getServiceEndpoints(serviceType)
            .then((serviceEndpoints: ServiceEndpoint[]) => {

                // If any endpoint is selected, get the details of the endpoint from the list of endpoints user has access
                let selectedConnection: ServiceEndpoint = null;
                if (selectedConnectionId) {
                    serviceEndpoints.forEach((connection: ServiceEndpoint) => {
                        if (connection.id === selectedConnectionId) {
                            selectedConnection = connection;
                            return false;
                        }
                    });
                }

                // If user doesn't have access to the selected endpoint , make explicit call for the connection
                // This ensures that even if the user doesn't have permissions for the connection already saved in the definition
                // it gets that saved connection back and pushes to connections array,
                // so that definition would be valid and further changes can be updated
                if (!selectedConnection && selectedConnectionId) {
                    ConnectedServiceEndpointSource.instance().getServiceEndpoint(selectedConnectionId)
                        .then((serviceEndpoint: ServiceEndpoint) => {

                            // If service endpoint exists, add it to the endpoints array
                            if (serviceEndpoint) {
                                serviceEndpoints.push(serviceEndpoint);
                            }

                            // UpdateServiceEndpoints as per endpoint exists or probably deleted
                            this._actions.UpdateServiceEndpoints.invoke({
                                type: serviceType,
                                endpoints: serviceEndpoints,
                                errorMessage: serviceEndpoint ? Utils_String.empty : Utils_String.format(Resources.GitHubConnectionDeletedMessage, selectedRepository),
                            } as Actions.IServiceEndpoints);

                            q.resolve(null);
                        },
                        (error) => {

                            // In case of failure to get the details of the serviceendpoint return with correct error message
                            this._actions.UpdateServiceEndpoints.invoke({
                                type: serviceType,
                                endpoints: serviceEndpoints,
                                errorMessage: error.message || error
                            } as Actions.IServiceEndpoints);

                            q.resolve(null);
                        });
                }
                else {

                    // Everything fine, return the details
                    this._actions.UpdateServiceEndpoints.invoke({
                        type: serviceType,
                        endpoints: serviceEndpoints,
                        errorMessage: Utils_String.empty
                    } as Actions.IServiceEndpoints);

                    q.resolve(null);
                }
            },
            (error) => {

                // In case of failure to get the serviceConnections return with correct error message
                this._actions.UpdateServiceEndpoints.invoke({
                    type: serviceType,
                    endpoints: [],
                    errorMessage: error.message || error
                } as Actions.IServiceEndpoints);

                q.resolve(null);
            });

        return q.promise;
    }

    public createAuthRequest(connectedServiceType: string): IPromise<void> {
        const authWindow = window.open("", "", "width = 960, height = 600, location = true, menubar = false, toolbar = false");
        return ConnectedServiceEndpointSource.instance().createAuthRequest(connectedServiceType).then(
            (authRequest: IAuthRequest) => {
                this._actions.UpdateNewConnectionInfo.invoke({
                    authRequestUrl: authRequest.url,
                    isAuthorizing: true,
                    errorMessage: authRequest.errorMessage,
                    type: connectedServiceType,
                    popupWindow: authWindow
                } as Actions.INewConnectionStatus);
            }, (error) => {
                authWindow.close();
                this._actions.UpdateNewConnectionInfo.invoke({
                    errorMessage: error.message || error,
                    isAuthorizing: false,
                    type: connectedServiceType
                } as Actions.INewConnectionStatus);
            }
        );
    }

    public createServiceEndpoint(connectionInfo: Actions.IServiceEndpointApiData, authorizationInfo?: EndpointAuthorization): IPromise<ServiceEndpoint> {
        let serviceEndpoint: ServiceEndpoint = this._createServiceEndPoint(connectionInfo, authorizationInfo);
        return ConnectedServiceEndpointSource.instance().createServiceEndpoint(serviceEndpoint).then((endpoint: ServiceEndpoint) => {
                this._actions.AddedNewServiceEndpoint.invoke({
                    endpoint: endpoint
                } as Actions.INewServiceEndpoint);
                return Q.resolve(endpoint);
            },
            (error) => {
                this._actions.UpdateNewConnectionInfo.invoke({
                    errorMessage: error.message || error,
                    isAuthorizing: false,
                    type: connectionInfo.type
                } as Actions.INewConnectionStatus);
            }
        );
    }

    public updateNewConnectionStatusAndCreateEndpoint(connectionInfo: Actions.INewConnectionStatus, connectionId: string): IPromise<ServiceEndpoint> {
        this.updateNewConnectionStatus(connectionInfo);
        const store = StoreManager.GetStore<ConnectedServiceStore>(ConnectedServiceStore, connectionId);
        const state = store.getState();
        if (state && state.canAddNewConnection) {
            const endpointDetails = store.getServiceEndpointDetails();
            const authorizationInfo: EndpointAuthorization = store.getAuthorizationInfo();
            return this.createServiceEndpoint(endpointDetails, authorizationInfo).then((endPoint: ServiceEndpoint) => {
                return Q.resolve(endPoint);
            });
        }

        return Q.resolve(null);
    }

    public updateNewConnectionStatus(connectionInfo: Actions.INewConnectionStatus): void {
        this._actions.UpdateNewConnectionInfo.invoke(connectionInfo);
    }

    private _createServiceEndPoint(connectionInfo: Actions.IServiceEndpointApiData, authorizationInfo?: EndpointAuthorization): ServiceEndpoint {
        if (!authorizationInfo) {
            if (connectionInfo.scheme === EndpointAuthorizationSchemes.PersonalAccessToken ||
                connectionInfo.scheme === EndpointAuthorizationSchemes.OAuth) {
                authorizationInfo = {
                    parameters: {
                        accessToken: connectionInfo.passwordKey || Utils_String.empty
                    },
                    scheme: connectionInfo.scheme
                };
            } else {
                authorizationInfo = {
                    parameters: {
                        username: connectionInfo.username || Utils_String.empty,
                        password: connectionInfo.passwordKey || Utils_String.empty
                    },
                    scheme: EndpointAuthorizationSchemes.UsernamePassword
                };
            }
        }

        let endpoint: ServiceEndpoint = {
            id: connectionInfo.endpointId,
            description: Utils_String.empty,
            administratorsGroup: null,
            authorization: authorizationInfo,
            createdBy: null,
            data: connectionInfo.parameters,
            name: connectionInfo.endpointName,
            type: connectionInfo.type,
            url: connectionInfo.url,
            readersGroup: null,
            groupScopeId: null,
            isReady: false,
            isShared: undefined,
            operationStatus: null,
            owner: undefined
        };

        return endpoint;
    }

    private _actions: Actions.ConnectedServiceEndpointActions;
}