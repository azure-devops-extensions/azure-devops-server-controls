/// <reference types="react" />

import * as React from "react";
import * as Base from "DistributedTaskControls/Common/Components/Base";
import * as Resources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";

import { TextField } from "OfficeFabric/TextField";

import * as Utils_String from "VSS/Utils/String";

import "VSS/LoaderPlugins/Css!DistributedTaskControls/SharedControls/Name/Name";

export interface INameProps extends Base.IProps {
    label: string;
    disabled: boolean;
    value?: string;
    placeHolder?: string;
    onNameChange?: (name: string) => void;
}

export class Name extends Base.Component<INameProps, Base.IStateless> {

    public render(): JSX.Element {

        let value = this.props.value || Utils_String.empty;

        return (
            <div className="pipeline-workflow-title">

                <div className="pipeline-workflow-title-label">
                    {this.props.label}
                </div>

                <div className="pipeline-workflow-title-text-input">
                    <TextField
                        value={value}
                        onChanged={this._handleChange}
                        required={true}
                        onGetErrorMessage={this._onGetErrorMessage}
                        deferredValidationTime={500}
                        disabled={this.props.disabled}
                        aria-disabled={this.props.disabled} />
                </div>

            </div>
        );
    }

    private _handleChange = (newValue: string) => {
        this.props.onNameChange(newValue);
    }

    private _onGetErrorMessage = (value: string): string => {
        if (!value) {
            this.props.onNameChange(value);
            return Resources.RequiredInputErrorMessage;
        }
    }
}
