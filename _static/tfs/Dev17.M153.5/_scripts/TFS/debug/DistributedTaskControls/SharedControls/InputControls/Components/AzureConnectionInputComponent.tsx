/// <reference types="react" />

import * as React from "react";

import { InputBase } from "DistributedTaskControls/SharedControls/InputControls/Components/InputComponentBase";
import {
    IInputControlPropsBase,
    IInputControlStateBase,
    InputControlType
} from "DistributedTaskControls/SharedControls/InputControls/Common";
import { ConnectedServiceInputComponentBase, IConnectedServiceInputPropsBase } from "DistributedTaskControls/SharedControls/InputControls/Components/ConnectedServiceInputComponent";

import * as Diag from "VSS/Diag";

export interface IAzureConnectionInputControlProps extends IInputControlPropsBase<string> {
    options: IDictionaryStringTo<string>;
    onOptionsChanged: (options: IDictionaryStringTo<string>) => void;
}

/**
 * @brief Implements simple Azure connection input control
 */
export class AzureConnectionInputComponent extends InputBase<string, IAzureConnectionInputControlProps, IInputControlStateBase<string>> {

    public getType(): string {
        return InputControlType.INPUT_TYPE_AZURE_CONNECTION;
    }

    protected getControl(): JSX.Element {
        Diag.logVerbose("[AzureConnectionInputComponent.getControl]: Method called.");
        return (
            <ConnectedServiceInputComponentBase
                disabled={this.props.disabled}
                value={this.state.value}
                onValueChanged={this.onValueChanged}
                onOptionsChanged={this.props.onOptionsChanged}
                options={this.props.options}
                getErrorMessage={this._getErrorMessage}
                useConnectedService={false}
                connectedServiceType="azure"
                instanceId={this.props.instanceId}
                properties={undefined}
                onNotifyValidationResult={this.props.onNotifyValidationResult} />
        );
    }

    private _getErrorMessage = () => {
        return this.getErrorMessage(this.getInputValue());
    }
}

