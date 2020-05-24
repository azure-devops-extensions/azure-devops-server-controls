import React = require("react");

import Controls = require("VSS/Controls");
import IdentityPicker = require("VSS/Identities/Picker/Controls");
import Identities_RestClient = require("VSS/Identities/Picker/RestClient");
import Utils_Core = require("VSS/Utils/Core");

import Component_Platform = require("VSS/Flux/PlatformComponent");

import { INotificationIdentity } from "NotificationsUI/Scripts/UIContracts";
import * as SubscriptionStore from "NotificationsUI/Scripts/Stores/SubscriptionStore";
import * as SubscriptionActions from "NotificationsUI/Scripts/Actions/SubscriptionActions";

export interface Props extends Component_Platform.Props<IdentityPicker.IIdentityPickerDropdownOptions> {
    consumerId: string;
    defaultSubscriberId: string;
}

export interface State extends Component_Platform.State {
}

export class Component extends Component_Platform.Component<IdentityPicker.IdentityPickerSearchControl, Props, State> {

    constructor(props: Props) {
        super(props);
    }

    protected createControl(element: JQuery): IdentityPicker.IdentityPickerSearchControl {
        var control: IdentityPicker.IdentityPickerSearchControl = Controls.create<IdentityPicker.IdentityPickerSearchControl, IdentityPicker.IIdentityPickerDropdownOptions>(IdentityPicker.IdentityPickerSearchControl, $(element), {
            items: this.props.defaultSubscriberId,
            multiIdentitySearch: false,
            identityType: { User: true, Group: true },
            operationScope: { IMS: true },
            showMruTriangle: true,
            highlightResolved: true,
            consumerId: this.props.consumerId,
            size: IdentityPicker.IdentityPickerControlSize.Medium
        } as IdentityPicker.IIdentityPickerDropdownOptions);

        element.bind(IdentityPicker.IdentityPickerSearchControl.VALID_INPUT_EVENT, Utils_Core.delegate(this, this._onIdentitySelectionChange));
        element.bind(IdentityPicker.IdentityPickerSearchControl.INVALID_INPUT_EVENT, Utils_Core.delegate(this, this._onIdentitySelectionChange));

        return control;
    }

    public componentDidMount() {
        super.componentDidMount();

        // set focus on load
        this._control.getElement().find(".identity-picker-input").focus();
    }

    public componentWillUnmount(): void {
    }

    private _onIdentitySelectionChange(): void {

        const resolvedIdentities = this._control.getIdentitySearchResult().resolvedEntities;
        
        if (resolvedIdentities && resolvedIdentities.length > 0) {

            this._control.addIdentitiesToMru([resolvedIdentities[0]]);
            this._control._element.find(".identity-picker-input").focus();

            const identity = {
                id: resolvedIdentities[0].localId,
                email: resolvedIdentities[0].signInAddress,
                type: resolvedIdentities[0].entityType,
                displayName: resolvedIdentities[0].displayName
            } as INotificationIdentity;
            
            SubscriptionActions.Creator.identitySelected(identity);
        }
        else {
            SubscriptionActions.Creator.identitySelected(null);
        }
    }
}
