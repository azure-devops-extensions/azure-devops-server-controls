import * as ActionsBase from "DistributedTaskControls/Common/Actions/Base";
import { IAddServiceConnectionDetails } from "DistributedTaskControls/SharedControls/InputControls/Components/ConnectedServiceComponentUtility";
import { ActionsKeys } from "DistributedTaskControls/Common/Common";

import { Action } from "VSS/Flux/Action";

export class ConnectedServiceInputActions extends ActionsBase.ActionsHubBase {

    public initialize(): void {
        this._updateAddServiceEndpointLink = new Action<IAddServiceConnectionDetails>();
    }

    public static getKey(): string {
        return ActionsKeys.ConnectedServiceInputActions;
    }

    public get updateAddServiceEndpointLink(): Action<IAddServiceConnectionDetails> {
        return this._updateAddServiceEndpointLink;
    }

    private _updateAddServiceEndpointLink: Action<IAddServiceConnectionDetails>;
}