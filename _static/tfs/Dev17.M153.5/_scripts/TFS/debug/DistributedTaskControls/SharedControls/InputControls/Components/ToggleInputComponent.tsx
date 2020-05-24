/// <reference types="react" />

import * as React from "react";

import { IInputControlPropsBase, IInputControlStateBase, InputControlType } from "DistributedTaskControls/SharedControls/InputControls/Common";
import { InputBase } from "DistributedTaskControls/SharedControls/InputControls/Components/InputComponentBase";

import { IToggleProps, Toggle } from "OfficeFabric/Toggle";

import * as Diag from "VSS/Diag";

export interface IToggleInputComponentProps extends IInputControlPropsBase<boolean>, IToggleProps {
    onText?: string;
    offText?: string;
}

/**
 * @brief Implements Toggle input control
 */
export class ToggleInputComponent extends InputBase<boolean, IToggleInputComponentProps, IInputControlStateBase<boolean>> {

    public getType(): string {
        return InputControlType.INPUT_TYPE_TOGGLE;
    }

    protected getControl(): JSX.Element {
        Diag.logVerbose("[BooleanInputComponent.getControl]: Method called.");

        return (
            <Toggle {...this.props}
                id={this.getInputFieldControlElementId()}
                className={`input-control-toggle ${this.props.cssClass}`}
                label={this.props.label}
                checked={this.state.value}
                onChanged={this._onChanged}
                disabled={this.props.disabled}
                onText={this.props.onText}
                offText={this.props.offText}
                styles={this.props.styles}
                aria-required={this.props.required}
                aria-disabled={this.props.disabled}
                aria-labelledby={this.props.ariaLabelledBy}
                aria-describedby={this.props.ariaDescribedBy || this.getInputFieldDescriptionElementId()} />
        );
    }

    protected hasLabel(): boolean {
        return false;
    }

    protected addLabelControl(): boolean {
        return false;
    }

    private _onChanged = (newValue: boolean) => {
        this.onValueChanged(newValue);
        Diag.logVerbose("[ToggleInputComponent._onChanged]: new value" + newValue);
    }
}


