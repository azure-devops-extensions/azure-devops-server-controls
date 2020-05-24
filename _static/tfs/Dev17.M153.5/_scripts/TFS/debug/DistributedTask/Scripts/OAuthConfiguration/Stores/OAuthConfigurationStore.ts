import { OAuthConfigurationActions, ILoadOAuthConfigurationPayload } from "DistributedTask/Scripts/OAuthConfiguration/Actions/OAuthConfigurationActions";
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import * as StoreCommonBase from "DistributedTaskControls/Common/Stores/Base";
import * as Base from "DistributedTaskControls/Common/Components/Base";
import * as Contracts from "TFS/ServiceEndpoint/Contracts";
import { StoreKeys, NavigationConstants, OAuthConfigurationHubEvents } from "DistributedTask/Scripts/OAuthConfiguration/Common/OAuthConfigurationConstants";
import * as Utils_String from "VSS/Utils/String";
import * as Navigation_Services from "VSS/Navigation/Services";
import * as Events_Services  from"VSS/Events/Services";
import * as VSS from "VSS/VSS";

export interface IOAuthConfigurationState extends Base.IState {
    oAuthConfiguration: Contracts.OAuthConfiguration;
    sourceTypes: Contracts.ServiceEndpointType[];
    errorMessage: string;
    dataLoaded: boolean;
}

export class OAuthConfigurationStore extends StoreCommonBase.StoreBase {

    public static getKey(): string {
        return StoreKeys.OAuthConfiguration;
    }

    public initialize(): void {
        super.initialize();
        this._oauthConfigurationActions = ActionsHubManager.GetActionsHub<OAuthConfigurationActions>(OAuthConfigurationActions);
        this._oauthConfigurationActions.loadOAuthConfiguration.addListener(this._onLoadOAuthConfiguration);
        this._oauthConfigurationActions.newOAuthConfiguration.addListener(this._onNewOAuthConfiguration);
        this._oauthConfigurationActions.updateName.addListener(this._onUpdateName);
        this._oauthConfigurationActions.updateSourceType.addListener(this._onUpdateSourceType);
        this._oauthConfigurationActions.updateUrl.addListener(this._onUpdateUrl);
        this._oauthConfigurationActions.updateClientId.addListener(this._onUpdateClientId);
        this._oauthConfigurationActions.updateClientSecret.addListener(this._onUpdateClientSecret);

        this._eventManager = Events_Services.getService();
        this._eventManager.attachEvent(OAuthConfigurationHubEvents.UpdateErrorMessage, this._updateErrorMessage);
        this._eventManager.attachEvent(OAuthConfigurationHubEvents.ClearErrorMessage, this._clearErrorMessage);

        this._initializeState();
        this._originalState = this._cloneState(this._state);
    }

    protected disposeInternal(): void {
        this._oauthConfigurationActions.loadOAuthConfiguration.removeListener(this._onLoadOAuthConfiguration);
        this._oauthConfigurationActions.newOAuthConfiguration.removeListener(this._onNewOAuthConfiguration);
        this._oauthConfigurationActions.updateName.removeListener(this._onUpdateName);
        this._oauthConfigurationActions.updateSourceType.removeListener(this._onUpdateSourceType);
        this._oauthConfigurationActions.updateUrl.removeListener(this._onUpdateUrl);
        this._oauthConfigurationActions.updateClientId.removeListener(this._onUpdateClientId);
        this._oauthConfigurationActions.updateClientSecret.removeListener(this._onUpdateClientSecret);

        this._eventManager.detachEvent(OAuthConfigurationHubEvents.UpdateErrorMessage, this._updateErrorMessage);
        this._eventManager.detachEvent(OAuthConfigurationHubEvents.ClearErrorMessage, this._clearErrorMessage);
    }

    public getState(): IOAuthConfigurationState {
        return this._state;
    }

    public isDirty(): boolean {
        let currentConfiguration = this._state.oAuthConfiguration;
        let originalConfiguration = this._originalState.oAuthConfiguration;
        return (
            !!Utils_String.localeComparer(currentConfiguration.name, originalConfiguration.name) ||
            !!Utils_String.localeComparer(currentConfiguration.endpointType, originalConfiguration.endpointType) ||
            !!Utils_String.localeComparer(currentConfiguration.url, originalConfiguration.url) ||
            !!Utils_String.localeComparer(currentConfiguration.clientId, originalConfiguration.clientId) ||
            !!Utils_String.localeComparer(currentConfiguration.clientSecret, Utils_String.empty)
        );
    }

    public isSecretInvalid(): boolean {
        return this._state.oAuthConfiguration.clientSecret === Utils_String.empty && this.isDirty();
    }

    public isValid(): boolean {
        let configuration = this._state.oAuthConfiguration;
        return (
            configuration.name !== Utils_String.empty &&
            configuration.endpointType !== Utils_String.empty &&
            configuration.url !== Utils_String.empty &&
            configuration.clientId !== Utils_String.empty &&
            (configuration.id !== Utils_String.empty || configuration.clientSecret !== Utils_String.empty)
        );
    }

    private _initializeState() {
        this._state = {
            oAuthConfiguration: {
                clientId: Utils_String.empty,
                clientSecret: Utils_String.empty,
                createdBy: null,
                createdOn: null,
                endpointType: Utils_String.empty,
                id: Utils_String.empty,
                modifiedBy: null,
                modifiedOn: null,
                name: Utils_String.empty,
                url: Utils_String.empty
            },
            sourceTypes: [],
            errorMessage: Utils_String.empty,
            dataLoaded: false
        };
    }

    private _onLoadOAuthConfiguration = (loadOAuthConfigurationPayload: ILoadOAuthConfigurationPayload): void => {
        this._initializeState();
        this._state.dataLoaded = true;
        this._state.oAuthConfiguration = {
            clientId: loadOAuthConfigurationPayload.oauthConfiguration.clientId,
            clientSecret: loadOAuthConfigurationPayload.oauthConfiguration.clientSecret,
            createdBy: loadOAuthConfigurationPayload.oauthConfiguration.createdBy,
            createdOn: loadOAuthConfigurationPayload.oauthConfiguration.createdOn,
            endpointType: loadOAuthConfigurationPayload.oauthConfiguration.endpointType,
            id: loadOAuthConfigurationPayload.oauthConfiguration.id,
            modifiedBy: loadOAuthConfigurationPayload.oauthConfiguration.modifiedBy,
            modifiedOn: loadOAuthConfigurationPayload.oauthConfiguration.modifiedOn,
            name: loadOAuthConfigurationPayload.oauthConfiguration.name,
            url: loadOAuthConfigurationPayload.oauthConfiguration.url
        };
        this._state.sourceTypes = loadOAuthConfigurationPayload.sourceTypes || [];
        this._state.oAuthConfiguration.clientSecret = this._state.oAuthConfiguration.clientSecret || Utils_String.empty;
        this._originalState = this._cloneState(this._state);
        Navigation_Services.getHistoryService().replaceHistoryPoint(undefined, { view: NavigationConstants.OAuthConfigurationView, configurationId: this._state.oAuthConfiguration.id });
        this.emitChanged();
    }

    private _onNewOAuthConfiguration = (sourceTypes: Contracts.ServiceEndpointType[]): void => {
        this._initializeState();
        this._state.dataLoaded = true;
        this._state.sourceTypes = sourceTypes;        
        this._state.oAuthConfiguration.endpointType = !!(sourceTypes[0]) && sourceTypes[0].name || Utils_String.empty;
        this._originalState = this._cloneState(this._state);

        this.emitChanged();
    }

    private _onUpdateName = (name: string): void => {
        this._state.oAuthConfiguration.name = name;
        this.emitChanged();
    }

    private _onUpdateSourceType = (sourceType: string): void => {
        this._state.oAuthConfiguration.endpointType = sourceType;
        this.emitChanged();
    }

    private _onUpdateUrl = (url: string): void => {
        this._state.oAuthConfiguration.url = url;
        this.emitChanged();
    }

    private _onUpdateClientId = (clientId: string): void => {
        this._state.oAuthConfiguration.clientId = clientId;
        this.emitChanged();
    }

    private _onUpdateClientSecret = (clientSecret: string): void => {
        this._state.oAuthConfiguration.clientSecret = clientSecret;
        this.emitChanged();
    }

    private _updateErrorMessage = (sender: any, error: any) => {
        this._state.errorMessage = VSS.getErrorMessage(error);
        this.emitChanged();
    }

    private _clearErrorMessage = () => {
        this._state.errorMessage = Utils_String.empty;
        this.emitChanged();
    }

    private _cloneState(state: IOAuthConfigurationState): IOAuthConfigurationState {
        return JSON.parse(JSON.stringify(state));
    }

    private _state: IOAuthConfigurationState;
    private _originalState: IOAuthConfigurationState;
    private _oauthConfigurationActions: OAuthConfigurationActions;
    private _eventManager: Events_Services.EventService;
}