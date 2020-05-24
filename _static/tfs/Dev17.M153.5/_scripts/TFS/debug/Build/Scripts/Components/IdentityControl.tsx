/// <reference types="react" />

import React = require("react");

import {Events} from "Build/Scripts/Constants";

import {TfsComponent, ITfsComponentProps, ITfsComponentState} from "Presentation/Scripts/TFS/TFS.React";

import {IdentityPickerSearchControl, IIdentityPickerSearchOptions} from "VSS/Identities/Picker/Controls";
import {create} from "VSS/Controls";
import {getService as getEventService} from "VSS/Events/Services";

export interface IdentitySearchOptions extends IIdentityPickerSearchOptions {
    invalidInputCallBack?: () => void;
}

export interface IdentityProps {
    options: IdentitySearchOptions;
    containerCssClass?: string;
}

export class Component extends TfsComponent<IdentityProps, ITfsComponentState> {
    private _control: IdentityPickerSearchControl;

    constructor(props: IdentityProps) {
        super(props);
    }

    protected onRender(element: HTMLElement) {

        if (!this._control) {
            this._control = create(IdentityPickerSearchControl, $(element), this.props.options);

            getEventService().attachEvent(Events.ClearComboControlInput, () => {
                this._control.clear();
            });

            if (this.props.options.invalidInputCallBack) {
                this._control._bind(IdentityPickerSearchControl.INVALID_INPUT_EVENT, () => {
                    this.props.options.invalidInputCallBack();
                });
            }
        }
    }
}
