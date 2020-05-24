/// <reference types="react" />

import * as React from "react";

import {
    IInputControlPropsBase,
    IInputControlStateBase,
    InputControlType
} from "DistributedTaskControls/SharedControls/InputControls/Common";
import { InputBase } from "DistributedTaskControls/SharedControls/InputControls/Components/InputComponentBase";

import { ChoiceGroup, IChoiceGroupOption } from "OfficeFabric/ChoiceGroup";
import { css } from "OfficeFabric/Utilities";

import * as Diag from "VSS/Diag";
import { JQueryWrapper } from "DistributedTaskControls/Common/JQueryWrapper";

export interface IRadioInputControlProp extends IInputControlPropsBase<IChoiceGroupOption> {
    options: IChoiceGroupOption[];
    showOptionsVertically?: boolean;
    noCustomFabricOverrides?: boolean;
}

/**
 * @brief Implements Radio input control
 */
export class RadioInputComponent extends InputBase<IChoiceGroupOption, IRadioInputControlProp, IInputControlStateBase<IChoiceGroupOption>> {

    public getType(): string {
        return InputControlType.INPUT_TYPE_RADIO;
    }

    protected getControl(): JSX.Element {
        Diag.logVerbose("[RadioInputComponent.getControl]: Method called.");
        return (
            <div className={css({
                "show-options-horizontally": !this.props.showOptionsVertically,
                "fabric-style-overrides": !this.props.noCustomFabricOverrides
            })}>
                <ChoiceGroup
                    ref={this._resolveRef("_choiceGroup")}
                    id={this.getInputFieldControlElementId()}
                    aria-labelledby={this.props.ariaLabelledBy || this.getInputFieldLabelElementId()}
                    required={this.props.required}
                    className="input-control-radio-button"
                    options={this._getOptions()}
                    onChange={this._onChange}
                    aria-disabled={this.props.disabled}
                    disabled={this.props.disabled}
                />
            </div>
        );
    }

    //  Setting aria description for options in radio control.
    private _getOptions(): IChoiceGroupOption[] {
        let options: IChoiceGroupOption[] = [];
        if (this.props.options) {
            this.props.options.forEach((option: IChoiceGroupOption) => {
                options.push(JQueryWrapper.extend(option, {
                    "aria-describedby": this.props.ariaDescribedBy || this.getInputFieldDescriptionElementId()
                }));
            }, this);
        }
        return options;
    }

    private _onChange = (event?: React.SyntheticEvent<HTMLInputElement>, newOption?: IChoiceGroupOption) => {
        this.onValueChanged(newOption);
    }

    public setFocus(): void {
        if (this._choiceGroup) {
            this._choiceGroup.focus();
        }
    }

    protected _choiceGroup: ChoiceGroup;
}
