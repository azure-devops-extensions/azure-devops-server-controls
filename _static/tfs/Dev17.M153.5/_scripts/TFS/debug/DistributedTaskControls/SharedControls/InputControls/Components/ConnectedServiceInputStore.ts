import * as Store from "DistributedTaskControls/Common/Stores/Base";
import { ActionsHubManager} from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { StoreKeys } from "DistributedTaskControls/Common/Common";

import { ConnectedServiceInputActions } from "DistributedTaskControls/SharedControls/InputControls/Components/ConnectedServiceInputActions";
import { IAddServiceConnectionDetails } from "DistributedTaskControls/SharedControls/InputControls/Components/ConnectedServiceComponentUtility";

/**
 * Store to maintain the state for the connectedservice input component to avoid
 * multiple service calls to get details like showAddServiceEndpointLink on mount/unmount
 * 
 * @export
 * @class ConnectedServiceInputStore
 * @extends {Store.StoreBase}
 */
export class ConnectedServiceInputStore extends Store.StoreBase {

    constructor() {
        super();

        // explicitly made showAddServiceEndpointLink null to know whether it has been set(true/false) or not
        this._state = {
            showAddServiceEndpointLink: null,
            endpointType: null
        };
    }

    public getState(): IAddServiceConnectionDetails {
        return this._state;
    }

    public static getKey(): string {
        return StoreKeys.ConnectedServiceInputStore;
    }

    public initialize(instanceId: string): void {

        this._actions = ActionsHubManager.GetActionsHub<ConnectedServiceInputActions>(ConnectedServiceInputActions, instanceId);
        this._actions.updateAddServiceEndpointLink.addListener(this._updateAddServiceEndpointLink);
    }

    protected disposeInternal(): void {
        this._actions.updateAddServiceEndpointLink.removeListener(this._updateAddServiceEndpointLink);
    }

    private _updateAddServiceEndpointLink = (addServiceEndpointLink: IAddServiceConnectionDetails) => {
        this._state = addServiceEndpointLink;
        this.emitChanged();
    }

    private _actions: ConnectedServiceInputActions;
    private _state: IAddServiceConnectionDetails;
}