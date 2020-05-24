/// <reference types="react" />

import * as React from "react";

import { IInputControlPropsBase, IInputControlStateBase, InputControlType } from "DistributedTaskControls/SharedControls/InputControls/Common";
import { InputBase } from "DistributedTaskControls/SharedControls/InputControls/Components/InputComponentBase";

import { Checkbox, ICheckbox } from "OfficeFabric/Checkbox";
import { css } from "OfficeFabric/Utilities";

import * as Diag from "VSS/Diag";

/**
 * @brief Implements simple string input control
 */
export class BooleanInputComponent extends InputBase<boolean, IInputControlPropsBase<boolean>, IInputControlStateBase<boolean>> {

    public getType(): string {
        return InputControlType.INPUT_TYPE_BOOLEAN;
    }

    public setFocus(): void {
        if (this._checkbox) {
            this._checkbox.focus();
        }
    }

    protected getControl(): JSX.Element {
        Diag.logVerbose("[BooleanInputComponent.getControl]: Method called.");

        return (
            <Checkbox
                componentRef={(element) => { this._checkbox = element; }}
                id={this.getInputFieldControlElementId()}
                className={css("input-control-checkbox", this.props.cssClass)}
                label={this.props.label}
                checked={this.state.value}
                onChange={this._onChanged}
                disabled={this.props.disabled}
                ariaLabel={this.props.ariaLabel}
                ariaLabelledBy={this.props.ariaLabelledBy}
                ariaDescribedBy={(this.props.ariaDescribedBy || this.getInputFieldDescriptionElementId())} />
        );
    }

    protected getInputClassName(): string {
        return css(super.getInputClassName(), "bowtie-fabric");
    }
    protected hasLabel(): boolean {
        return false;
    }

    protected addLabelControl(): boolean {
        return false;
    }

    private _onChanged = (ev: React.FormEvent<HTMLElement>, newValue: boolean) => {
        this.onValueChanged(newValue);
        Diag.logVerbose("[BooleanInputComponent._onChanged]: new value" + newValue);
    }

    private _checkbox: ICheckbox;
}

