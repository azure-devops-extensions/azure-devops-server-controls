import * as Store from "DistributedTaskControls/Common/Stores/Base";
import { ActionsHubManager} from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { StoreKeys } from "DistributedTaskControls/Common/Common";
import { ARMInputActions, IAuthorizationState } from "DistributedTaskControls/SharedControls/InputControls/Components/ARMInputActions";
import { AzureSubscription, ServiceEndpoint } from "TFS/DistributedTask/Contracts";

export interface IAzureRMInputBaseState {
    text: string;
    subscription: AzureSubscription;
    showAuthorize: boolean;
    enableAuthorize: boolean;
    authInProgress: boolean;
    showAddServiceEndpointLink: boolean;
    showLoadingIcon?: boolean;
    authorizationScope?: string;
    endpoints: IDictionaryStringTo<ServiceEndpoint>;
}

export class ARMInputStore extends Store.StoreBase {

    constructor() {
        super();

        this._state = {
            text: "",
            subscription: null,
            showAuthorize: false,
            enableAuthorize: false,
            authInProgress: false,
            showAddServiceEndpointLink: false,
            endpoints: {}
        };
    }

    public getState(): IAzureRMInputBaseState {
        return this._state;
    }

    public static getKey(): string {
        return StoreKeys.ARMInputStore;
    }

    public initialize(instanceId: string): void {

        this._actions = ActionsHubManager.GetActionsHub<ARMInputActions>(ARMInputActions, instanceId);

        this._actions.UpdateText.addListener(this._handleUpdateText);
        this._actions.UpdateSubscription.addListener(this._handleUpdateSubscription);
        this._actions.UpdateAuthorizationState.addListener(this._handleUpdateAuthorizeButtonState);
        this._actions.ShowAddServiceEndpointLink.addListener(this._handleShowAddServiceEndpointLink);
        this._actions.UpdateEndpointAuthorizationScope.addListener(this._handleUpdateEndpointAuthorizationScope);
        this._actions.UpdateEndpoints.addListener(this._handleUpdateEndpoints);
    }

    protected disposeInternal(): void {

        // removeListener for every action
        this._actions.UpdateText.removeListener(this._handleUpdateText);
        this._actions.UpdateSubscription.removeListener(this._handleUpdateSubscription);
        this._actions.UpdateAuthorizationState.removeListener(this._handleUpdateAuthorizeButtonState);
        this._actions.ShowAddServiceEndpointLink.removeListener(this._handleShowAddServiceEndpointLink);
        this._actions.UpdateEndpointAuthorizationScope.removeListener(this._handleUpdateEndpointAuthorizationScope);
        this._actions.UpdateEndpoints.removeListener(this._handleUpdateEndpoints);
    }

    private _handleUpdateText = (text: string) => {
        this._state.text = text;
        this.emitChanged();
    }

    private _handleUpdateSubscription = (subscription: AzureSubscription) => {
        this._state.subscription = subscription;
        this.emitChanged();
    }

    private _handleUpdateAuthorizeButtonState = (state: IAuthorizationState) => {
        this._state.enableAuthorize = state.enableAuthorize;
        this._state.showAuthorize = state.showAuthorize;
        this._state.authInProgress = state.authInProgress;
        this.emitChanged();
    }

    private _handleShowAddServiceEndpointLink = (showAddServiceEndpointLink: boolean) => {
        this._state.showAddServiceEndpointLink = showAddServiceEndpointLink;
        this.emitChanged();
    }

    private _handleUpdateEndpointAuthorizationScope = (scope: string) => {
        this._state.authorizationScope = scope;
        this.emitChanged();
    }

    private _handleUpdateEndpoints = (endpoints: IDictionaryStringTo<ServiceEndpoint>) => {
        this._state.endpoints = endpoints;
        this.emitChanged();
    }

    private _actions: ARMInputActions;
    private _state: IAzureRMInputBaseState;
}