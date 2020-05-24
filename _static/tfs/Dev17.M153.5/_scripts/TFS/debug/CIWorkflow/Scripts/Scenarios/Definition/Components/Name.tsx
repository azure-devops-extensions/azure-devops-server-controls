/// <reference types="react" />

import * as React from "react";

import { DefinitionUtils } from "CIWorkflow/Scripts/Common/DefinitionUtils";

import * as Base from "DistributedTaskControls/Common/Components/Base";
import * as RegexConstants from "DistributedTaskControls/Common/RegexConstants";
import * as Resources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";

import { TextField } from "OfficeFabric/components/TextField/TextField";

import * as Utils_String from "VSS/Utils/String";

import "VSS/LoaderPlugins/Css!CIWorkflow/Scripts/Scenarios/Definition/Components/Name";

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
            <div className="ci-title">
                <div className="ci-title-text-input">
                    <TextField
                        label={this.props.label}
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
            this.props.onNameChange(Utils_String.empty);
            return Resources.RequiredInputErrorMessage;
        }
        else if (!DefinitionUtils.isDefinitionNameValid(value)) {
            this.props.onNameChange(value);
            return Resources.SpecialCharactersNotAllowedErrorMessage;
        }
        return Utils_String.empty;
    }
}
