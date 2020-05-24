import { ServiceEndpointPolicyActions, IAuthorizedEndpointData } from "Admin/Scripts/ServiceEndpoint/Actions/ServiceEndpointPolicyActions"
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { StoreBase } from "DistributedTaskControls/Common/Stores/Base";

import * as Build from "TFS/Build/Contracts";

import { autobind } from "OfficeFabric/Utilities";

export interface IServiceEndpointPolicyState {
    isAccessOnAllPipelines: boolean;
    error: string;
    loadingError: string;
}

export class ServiceEndpointPolicyStore extends StoreBase {

    public initialize(instanceId?: string): void {
        this._actions = ActionsHubManager.GetActionsHub<ServiceEndpointPolicyActions>(ServiceEndpointPolicyActions, instanceId);
        this._actions.loadServiceEndpointPolicyData.addListener(this._loadPolicyData);
        this._actions.togglePolicyForAllPipelinesCheck.addListener(this._togglePolicyForAllPipelinesCheck);
        this._actions.setError.addListener(this._setError);
        this._actions.setLoadingError.addListener(this._setLoadingError);

        this._savedState = {
            isAccessOnAllPipelines: false,
            error: null,
            loadingError: null
        } as IServiceEndpointPolicyState;

        this._currentState = {
            isAccessOnAllPipelines: false,
            error: null,
            loadingError: null
        } as IServiceEndpointPolicyState;
    }

    public static getKey(): string {
        return ServiceEndpointPolicyStore.StoreKey;
    }

    protected disposeInternal(): void {
        this._actions.loadServiceEndpointPolicyData.removeListener(this._loadPolicyData);
        this._actions.togglePolicyForAllPipelinesCheck.removeListener(this._togglePolicyForAllPipelinesCheck);
        this._actions.setError.removeListener(this._setError);
        this._actions.setLoadingError.removeListener(this._setLoadingError);
    }

    public getState(): IServiceEndpointPolicyState {
        return this._currentState;
    }

    public isSaveDisabled(): boolean {
        if (this._currentState && this._savedState) {
            return this._currentState.isAccessOnAllPipelines === this._savedState.isAccessOnAllPipelines;
        }
        return false;
    }

    @autobind
    private _loadPolicyData(endpointData: IAuthorizedEndpointData): void {
        if (endpointData && endpointData.originalEndpointId) {
            if (endpointData.authorizedResources && endpointData.authorizedResources.length > 0) {

                // Filter and find the reference with the original end point. This is to make sure reference with correct Id is honored
                const reference: Build.DefinitionResourceReference[] = endpointData.authorizedResources.filter(resourceReference => resourceReference.id === endpointData.originalEndpointId);

                if (reference[0]) {
                    this._savedState.isAccessOnAllPipelines = reference[0].authorized;
                    this._currentState.isAccessOnAllPipelines = reference[0].authorized;
                }
                else {
                    this._savedState.isAccessOnAllPipelines = false;
                    this._currentState.isAccessOnAllPipelines = false;
                }
            }
            else {
                //  If no authorized resource object, set isAccessOnAllPipelines as false
                this._savedState.isAccessOnAllPipelines = false;
                this._currentState.isAccessOnAllPipelines = false;
            }
        }
        this.emitChanged();
    }

    @autobind
    private _togglePolicyForAllPipelinesCheck(isEnabled: boolean): void {
        this._currentState.isAccessOnAllPipelines = !!isEnabled;
        this.emitChanged();
    }

    @autobind
    private _setError(err: string): void {
        this._currentState.error = err;
        this.emitChanged();
    }

    @autobind
    private _setLoadingError(err: string): void {
        this._currentState.loadingError = err;
        this.emitChanged();
    }

    private _savedState: IServiceEndpointPolicyState;
    private _currentState: IServiceEndpointPolicyState;
    private _actions: ServiceEndpointPolicyActions;
    private static StoreKey = "STORE_KEY_SERVICE_ENDPOINT_POLICY";
}