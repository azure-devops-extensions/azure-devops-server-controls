
import { ActionCreatorBase } from "DistributedTaskControls/Common/Actions/Base";
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { ActionCreatorKeys } from "DistributedTaskControls/Common/Common";
import { ConnectedServiceInputActions } from "DistributedTaskControls/SharedControls/InputControls/Components/ConnectedServiceInputActions";
import { ConnectedServiceComponentUtility, IAddServiceConnectionDetails } from "DistributedTaskControls/SharedControls/InputControls/Components/ConnectedServiceComponentUtility";

export class ConnectedServiceInputActionsCreator extends ActionCreatorBase {

    public static getKey(): string {
        return ActionCreatorKeys.ConnectedServiceInputActionsCreator;
    }

    public initialize(instanceId: string) {
        this._actions = ActionsHubManager.GetActionsHub<ConnectedServiceInputActions>(ConnectedServiceInputActions, instanceId);
    }

    public updateAddServiceEndpointLink(connectedServiceType: string, authSchemes: string) {
        ConnectedServiceComponentUtility.showAddServiceEndpointLink(connectedServiceType, authSchemes).then((details: IAddServiceConnectionDetails) => {
            this._actions.updateAddServiceEndpointLink.invoke(details);
        });
    }

    private _actions: ConnectedServiceInputActions;
}