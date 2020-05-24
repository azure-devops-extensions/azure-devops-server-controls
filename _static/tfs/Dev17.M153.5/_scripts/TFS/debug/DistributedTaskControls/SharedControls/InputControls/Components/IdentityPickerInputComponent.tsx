import React = require("react");

import {
    IInputControlPropsBase,
    IInputControlStateBase,
    InputControlType
} from "DistributedTaskControls/SharedControls/InputControls/Common";
import { IdentityPickerComponent } from "DistributedTaskControls/SharedControls/InputControls/Components/IdentityPickerComponent";
import { InputBase } from "DistributedTaskControls/SharedControls/InputControls/Components/InputComponentBase";

import * as Diag from "VSS/Diag";
import * as IdentityPicker from "VSS/Identities/Picker/Controls";
import { IEntity } from "VSS/Identities/Picker/RestClient";
import { IOperationScope } from "VSS/Identities/Picker/Services";
import * as Utils_String from "VSS/Utils/String";

import { css } from "OfficeFabric/Utilities";

import "VSS/LoaderPlugins/Css!DistributedTaskControls/SharedControls/InputControls/Components/IdentityPickerInputComponent";

// TODO: Remove this interface and make it extend from the contract which is there in VSS i.e. IdentityPickerOptions
export interface IIdentitityPickerProps extends IInputControlPropsBase<string> {
    /**
     * Consumer id to be used by identity picker
     */
    consumerId: string;
    multiIdentitySearch: boolean;
    isInvalid: boolean;
    operationScope?: IOperationScope;
    placeholderText?: string;
    showMruTriangle?: boolean;
    showMru?: boolean;
    onSelectedIdentitiesChanged(identities: IEntity[]): void;
}

export class IdentityPickerInputComponent extends InputBase<string, IIdentitityPickerProps, IInputControlStateBase<string>> {

    public getType(): string {
        return InputControlType.INPUT_TYPE_IDENTITIES;
    }

    protected getControl(): JSX.Element {
        Diag.logVerbose("[IdentityPickerInputComponent.getControl]: Method called.");

        return (
            <IdentityPickerComponent
                shouldUpdate={true}
                cssClass={css("dtc-identity-picker-input-component ", this.props.isInvalid ? "invalid" : "valid")}
                onSelectedIdentitiesChanged={this.props.onSelectedIdentitiesChanged}
                disabled={this.props.disabled}                
                required={this.props.required}                
                options={this._getIdentityPickerOptions()}
                consumerId={this.props.consumerId || this.c_identityPickerConsumerId}>
            </IdentityPickerComponent>
        );
    }

    private _getIdentityPickerOptions(): IdentityPicker.IIdentityPickerSearchOptions {
        let options: IdentityPicker.IIdentityPickerSearchOptions;

        options = {
            multiIdentitySearch: this.props.multiIdentitySearch,
            items: this.state.value,
            operationScope: this.props.operationScope || { IMS: true },
            placeholderText: this.props.placeholderText || Utils_String.empty,
            showMruTriangle: this.props.showMruTriangle || false,
            showMru: this.props.showMru || false,
            consumerId: this.props.consumerId || this.c_identityPickerConsumerId,
            ariaDescribedby: this.props.ariaDescribedBy
        };

        return options;
    }

    private c_identityPickerConsumerId: string = "4E250E55-B57F-4B12-B248-EB2F9CF59429";
}