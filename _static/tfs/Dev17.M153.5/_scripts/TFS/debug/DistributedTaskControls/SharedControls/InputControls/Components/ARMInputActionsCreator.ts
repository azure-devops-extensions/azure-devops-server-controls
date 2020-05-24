import * as Q from "q";

import { ActionCreatorBase } from "DistributedTaskControls/Common/Actions/Base";
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { ActionCreatorKeys } from "DistributedTaskControls/Common/Common";
import { ARMInputActions, IAuthorizationState } from "DistributedTaskControls/SharedControls/InputControls/Components/ARMInputActions";
import { AzureResourceManagerComponentUtility, IAzureResourceManagerComponentOptions } from "DistributedTaskControls/SharedControls/InputControls/Components/AzureResourceManagerComponentUtility";
import { AzureSubscription, ServiceEndpoint } from "TFS/DistributedTask/Contracts";

import * as Utils_String from "VSS/Utils/String";

export class ARMInputActionsCreator extends ActionCreatorBase {

    public static getKey(): string {
        return ActionCreatorKeys.ARMInputActionsCreator;
    }

    public initialize(instanceId: string) {
        this._actions = ActionsHubManager.GetActionsHub<ARMInputActions>(ARMInputActions, instanceId);
    }

    public updateEndpointAuthorizationScope = (endpointId: string, endpointAuthorizationScope?: string): IPromise<string> => {

        let getEndpointAuthorizationScopePromise = this._currentGetEndpointAuthorizationScopePromise = AzureResourceManagerComponentUtility.getEndpointAuthorizationScope(endpointId, endpointAuthorizationScope);
        return getEndpointAuthorizationScopePromise.then((scope: string) => {
            if (this._currentGetEndpointAuthorizationScopePromise === getEndpointAuthorizationScopePromise) {
                this._actions.UpdateEndpointAuthorizationScope.invoke(scope);
            }

            return Q.resolve(scope);
        });
    }

    public updateText(text: string): void {
        this._actions.UpdateText.invoke(text);
    }

    public updateSubscription(subscription: AzureSubscription): void {
        this._actions.UpdateSubscription.invoke(subscription);
    }

    public updateEndpoints(endpoints: IDictionaryStringTo<ServiceEndpoint>): void {
        this._actions.UpdateEndpoints.invoke(endpoints);
    }

    public updateAuthorizationState(authorizationState: IAuthorizationState): void {
        this._actions.UpdateAuthorizationState.invoke(authorizationState);
    }

    public showAddServiceEndpointLink(showLink: boolean): void {
        this._actions.ShowAddServiceEndpointLink.invoke(showLink);
    }

    private _actions: ARMInputActions;
    private _currentGetEndpointAuthorizationScopePromise: IPromise<string>;
}