import { RepositoryProperties } from "Build.Common/Scripts/Generated/TFS.Build2.Common";

import { StoreChangedEvents } from "CIWorkflow/Scripts/Scenarios/Definition/Common";
import { VersionControlStoreBase, ISourcesVersionControlState } from "CIWorkflow/Scripts/Scenarios/Definition/Stores/VersionControlStoreBase";

import { ConnectedServiceEndpointActions, INewServiceEndpoint, IServiceEndpoints } from "DistributedTaskControls/Actions/ConnectedServiceEndpointActions";
import { ConnectedServiceActionsCreator } from "DistributedTaskControls/Actions/ConnectedServiceEndpointActionsCreator";
import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";

import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";

import { ServiceEndpoint } from "TFS/ServiceEndpoint/Contracts";

import * as Utils_String from "VSS/Utils/String";

export interface IExternalVersionControlBaseState extends ISourcesVersionControlState {
    newConnectionName: string;
    selectedConnectionId: string;
    connections: ServiceEndpoint[];
    showAddConnection: boolean;
    errorMessage: string;
    endpointType: string;
    showConnectionDialog: boolean;
    hideConnectionDropdown: boolean;
}

export abstract class ExternalVersionControlStoreBase extends VersionControlStoreBase {
    protected _showAddConnection: boolean;
    protected _connections: ServiceEndpoint[];
    protected _connectedServiceEndpointActionsCreator: ConnectedServiceActionsCreator;
    protected _errorMessage: string;
    private static _servicesConnectionHubUrlFormat: string = "{0}{1}{2}/{3}/_admin/_services/?resourceId={4}";
    private _connectionServiceEndpointActions: ConnectedServiceEndpointActions;

    constructor() {
        super();

        this._connectedServiceEndpointActionsCreator = ActionCreatorManager.GetActionCreator<ConnectedServiceActionsCreator>(ConnectedServiceActionsCreator);
    }

    public initialize(): void {
        super.initialize();

        this._connectionServiceEndpointActions = ActionsHubManager.GetActionsHub<ConnectedServiceEndpointActions>(ConnectedServiceEndpointActions);
        this._connectionServiceEndpointActions.UpdateServiceEndpoints.addListener(this._handleUpdateServiceEndPoints);
        this._connectionServiceEndpointActions.AddedNewServiceEndpoint.addListener(this._handleNewServiceEndPoint);

    }

    protected disposeInternal(): void {
        this._connectionServiceEndpointActions.UpdateServiceEndpoints.removeListener(this._handleUpdateServiceEndPoints);
        this._connectionServiceEndpointActions.AddedNewServiceEndpoint.removeListener(this._handleNewServiceEndPoint);

        super.disposeInternal();
    }

    public getState(): IExternalVersionControlBaseState {
        return super.getState() as IExternalVersionControlBaseState;
    }

    protected abstract getServiceEndpointType(): string;

    protected _updateConnections(connections: IServiceEndpoints): void {
        if (connections.endpoints && connections.endpoints.length > 0) {
            this._connections = connections.endpoints;
            const selectedConnectionId = this._repository.properties[RepositoryProperties.ConnectedServiceId];
            if (selectedConnectionId) {
                const selectionExists = connections.endpoints.some(c => c && c.id === selectedConnectionId);
                if (selectionExists) {
                    // Re-set the connection since the selected connection is set before it is added to the list.
                    // This way, derived classes can correctly set properties they pull from the connection in
                    // this list, like the connection's URL or Name.
                    this.setSelectedConnection(selectedConnectionId);
                }
                else {
                    this.setSelectedConnection(connections.endpoints[0].id);
                }
            }
            else {
                this.setSelectedConnection(connections.endpoints[0].id);
            }
            this._showAddConnection = false;
        }
        else {
            this.setSelectedConnection(null);
            this._showAddConnection = true;
        }

        this._errorMessage = connections.errorMessage;
    }

    protected setSelectedConnection(connectionId: string | null): void {
        this._repository.properties[RepositoryProperties.ConnectedServiceId] = connectionId;
    }

    private _handleUpdateServiceEndPoints = (payload: IServiceEndpoints) => {
        if (Utils_String.equals(payload.type, this.getServiceEndpointType(), true)) {
            this._updateConnections(payload);
            this.emit(StoreChangedEvents.RemoteVersionControlDataUpdatedEvent, null);
        }

        if (payload.errorMessage) {
            this.emit(StoreChangedEvents.VersionControlServerErrorEvent, this, payload.errorMessage);
        }
    }

    private _handleNewServiceEndPoint = (payload: INewServiceEndpoint) => {
        if (payload.endpoint && Utils_String.equals(payload.endpoint.type, this.getServiceEndpointType(), true)) {
            this.setSelectedConnection(payload.endpoint.id);
            this._connectedServiceEndpointActionsCreator.getServiceEndpoints(this.getServiceEndpointType());
        }

        if (payload.errorMessage) {
            this.emit(StoreChangedEvents.VersionControlServerErrorEvent, this, payload.errorMessage);
        }
    }
}
