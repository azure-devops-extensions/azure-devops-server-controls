/// <reference types="react" />

import React = require("react");

import {Events} from "Build/Scripts/Constants";

import {TfsComponent, ITfsComponentProps, ITfsComponentState} from "Presentation/Scripts/TFS/TFS.React";

import {Combo, IComboOptions as IComboControlOptions} from "VSS/Controls/Combos";
import {create} from "VSS/Controls";
import {getService as getEventService} from "VSS/Events/Services";

export interface IComboOptions extends IComboControlOptions {
    // IComboOptions has change as change?: () => any;, but it does send combo as it's param
    change?: any;
}

export interface ComboProps extends ITfsComponentProps {
    options: IComboOptions;
}

export class Component extends TfsComponent<ComboProps, ITfsComponentState> {
    private _control: Combo;

    constructor(props: ComboProps) {
        super(props);
    }

    protected onRender(element: HTMLElement) {

        if (!this._control) {
            this._control = create(Combo, $(element), this.props.options);

            getEventService().attachEvent(Events.ClearComboControlInput, () => {
                this._control.setInputText("", false);
            });
        }

        if (this._control) {
            let source = this.props.options ? (this.props.options.source || []) : [];
            this._control.setSource(source);
            this._control.setEnabled(this.props.options.enabled);
        }
    }
}
