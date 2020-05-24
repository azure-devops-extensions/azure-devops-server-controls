import React = require("react");

import Controls = require("VSS/Controls");
import IdentityPickerControls = require("VSS/Identities/Picker/Controls");
import Component_Platform = require("VSS/Flux/PlatformComponent");
import { registerLWPComponent } from "VSS/LWP";

export interface IProps extends Component_Platform.Props</*IdentityPickerControls.IIdentityDisplayOptions*/any> {
    /**
     * Uniquefied Identity name/id (ie identity uid)
     */
    userId: string;

    /**
     * Consumer id to be used by identity picker
     */
    consumerId: string;
}

/**
 * Component for Identity display
 */
export class IdentityDisplayComponent extends Component_Platform.Component<IdentityPickerControls.IdentityDisplayControl, IProps, Component_Platform.State> {
    public static componentType = "dtIdentityDisplay";

    /**
     * Method to create Identity display control.
     */
    protected createControl(element: JQuery): IdentityPickerControls.IdentityDisplayControl {
        if (!this._control) {
            this._control = Controls.create<IdentityPickerControls.IdentityDisplayControl, IdentityPickerControls.IIdentityDisplayOptions>(
                IdentityPickerControls.IdentityDisplayControl,
                $(element),
                this._getDefaultOptions());
        }
        return this._control;
    }

    /**
     * Returns the default identity display options
     */
    private _getDefaultOptions(): IdentityPickerControls.IIdentityDisplayOptions {
        let options: IdentityPickerControls.IIdentityDisplayOptions;
        options = {
            identityType: { User: true, Group: true },
            operationScope: { IMS: true, Source: true },
            consumerId: this.props.consumerId,
            item: this.props.userId
        };
        return options;
    }
}

registerLWPComponent(IdentityDisplayComponent.componentType, IdentityDisplayComponent);