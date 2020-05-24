import { Action } from "VSS/Flux/Action";
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { ActionsHubBase, ActionCreatorBase } from "DistributedTaskControls/Common/Actions/Base";
import { LoadableComponentActionsHub } from "DistributedTaskControls/SharedControls/LoadableComponent/LoadableComponentActionsHub";

import { ServiceEndpointPolicySource } from "Admin/Scripts/ServiceEndpoint/ServiceEndpointPolicySource";
import * as Build from "TFS/Build/Contracts";
import { VSS } from "VSS/SDK/Shim";

export interface IAuthorizedEndpointData {
    originalEndpointId: string;
    authorizedResources: Build.DefinitionResourceReference[];
}

export class ServiceEndpointPolicyActionCreator extends ActionCreatorBase {
    public initialize(instanceId?: string): void {
        this._actions = ActionsHubManager.GetActionsHub<ServiceEndpointPolicyActions>(ServiceEndpointPolicyActions, instanceId);
        this._loadableComponentActionsHub = ActionsHubManager.GetActionsHub<LoadableComponentActionsHub>(LoadableComponentActionsHub, instanceId);
    }

    public static getKey(): string {
        return ServiceEndpointPolicyActionCreator.ActionCreatorKey;
    }

    public loadServiceEndpointPolicyData(endpointId: string): void {
        this._actions.setLoadingError.invoke(null);
        this._actions.setError.invoke(null);
        this._loadableComponentActionsHub.showLoadingExperience.invoke({});
        //  Source call to get the state for the endpoint ID
        ServiceEndpointPolicySource.instance().getResourceAuthorization(endpointId).then((authorizedResources: Build.DefinitionResourceReference[]) => {
            this._actions.loadServiceEndpointPolicyData.invoke({
                originalEndpointId: endpointId,
                authorizedResources: authorizedResources
            });
            this._loadableComponentActionsHub.hideLoadingExperience.invoke({});
        }, (err: any) => {
            this._actions.setLoadingError.invoke(err.message || err);
            this._loadableComponentActionsHub.hideLoadingExperience.invoke({});
        });
    }

    public authorizeServiceEndpoint(endpointId: string, endpointName: string, shouldAuthorize: boolean): void {
        this._actions.setError.invoke(null);
        this._loadableComponentActionsHub.showLoadingExperience.invoke({});
        //  Source call to authorize/unauthorize the endpoint
        ServiceEndpointPolicySource.instance().authorizeResource(endpointId, endpointName, shouldAuthorize).then((authorizedResources: Build.DefinitionResourceReference[]) => {
            this._actions.loadServiceEndpointPolicyData.invoke({
                originalEndpointId: endpointId,
                authorizedResources: authorizedResources
            });
            this._loadableComponentActionsHub.hideLoadingExperience.invoke({});
        }, (err: any) => {
            this._actions.setError.invoke(err.message || err);
            this._loadableComponentActionsHub.hideLoadingExperience.invoke({});
        });
    }

    public togglePolicyForAllPipelinesCheck(isEnabled: boolean): void {
        this._actions.togglePolicyForAllPipelinesCheck.invoke(isEnabled);
    }

    private _actions: ServiceEndpointPolicyActions;
    private _loadableComponentActionsHub: LoadableComponentActionsHub;
    private static ActionCreatorKey = "ACTION_CREATOR_KEY_SERVICE_ENDPOINT_POLICY";
}

export class ServiceEndpointPolicyActions extends ActionsHubBase {
    public initialize(): void {
        this._loadServiceEndpointPolicyData = new Action<IAuthorizedEndpointData>();
        this._togglePolicyForAllPipelinesCheck = new Action<boolean>();
        this._setError = new Action<string>();
        this._setLoadingError = new Action<string>();
    }

    public static getKey(): string {
        return ServiceEndpointPolicyActions.ActionsKey;
    }

    public get loadServiceEndpointPolicyData(): Action<IAuthorizedEndpointData> {
        return this._loadServiceEndpointPolicyData;
    }

    public get togglePolicyForAllPipelinesCheck(): Action<boolean> {
        return this._togglePolicyForAllPipelinesCheck;
    }

    public get setError(): Action<string> {
        return this._setError;
    }

    public get setLoadingError(): Action<string> {
        return this._setLoadingError;
    }

    private _togglePolicyForAllPipelinesCheck: Action<boolean>;
    private _setError: Action<string>;
    private _setLoadingError: Action<string>;
    private _loadServiceEndpointPolicyData: Action<IAuthorizedEndpointData>;
    private static ActionsKey = "ACTIONS_KEY_SERVICE_ENDPOINT_POLICY";
}
