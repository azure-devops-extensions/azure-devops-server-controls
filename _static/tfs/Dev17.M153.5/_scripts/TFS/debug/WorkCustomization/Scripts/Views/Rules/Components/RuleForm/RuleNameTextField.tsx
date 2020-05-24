/// <reference types="react" />

import * as React from "react";
import Resources = require("WorkCustomization/Scripts/Resources/TFS.Resources.WorkCustomization");
import StringUtils = require("VSS/Utils/String");
import { autobind, css } from "OfficeFabric/Utilities";
import { TextField } from "OfficeFabric/TextField";
import { RuleUtils } from "WorkCustomization/Scripts/Utils/RuleUtils";
import { RuleValidationConstants } from "WorkCustomization/Scripts/Constants";

export interface IRuleNameTextFieldProps {
    isDirty: boolean;
    isNewRule: boolean;
    name: string;
    onChange: (newValue: string) => void;
    focusOnUpdate?: boolean;
    isDisabled?: boolean;
}

export class RuleNameTextField extends React.Component<IRuleNameTextFieldProps, {}>{
    private _textFieldToFocus: TextField = null;
    private _errorMessage: string;

    public render(): JSX.Element {
      
        return <div className={"rule-name-container"}>
            <label className="rule-name-input-label">{Resources.NameTextFieldLabel}</label>
            <div className={"rule-name-input"} >
                <TextField required={true}
                    value={this.props.name}
                    onChanged={this._onChanged}
                    ariaLabel={Resources.RuleNameTextFieldAriaLabel}
                    disabled={this.props.isDisabled}
                    className={"name-text-field"}
                    onBlur={this._validate}
                    ref={this._onRef} />
                <div aria-live="assertive" className="input-error-tip" hidden={!this._errorMessage}>{this._errorMessage}</div>
            </div>
        </div>;
    }

    @autobind
    private _onChanged(newValue: string): void {
        this._errorMessage = "";
        if (this.props.onChange) {
            this.props.onChange(newValue);
        }
    }

    @autobind
    private _onRef(instance: TextField | HTMLTextAreaElement | HTMLInputElement): void {
        this._textFieldToFocus = instance as TextField;
    }

    @autobind
    private _validate() {
        this._errorMessage = getErrorMessage(this.props.name);
        this.forceUpdate();
    }

    public componentWillMount() {
        let validateOnLoad = !this.props.isNewRule ? this.props.isDirty : !!this.props.name;
        if (validateOnLoad) {
            this._errorMessage = getErrorMessage(this.props.name);
        }
    }

    public componentDidMount() {
        if (this._textFieldToFocus && this.props.focusOnUpdate) {
            this._textFieldToFocus.focus();
        }
    }
}

export const getErrorMessage = (value: string): string => {
    if (!value || value.length === 0) {
        return Resources.RuleNameRequiredError;
    }
    else if (value.trim().length === 0) {
        return Resources.RuleNameWhitespaceError;
    }
    else if (value.length > RuleValidationConstants.MaxFriendlyNameLength) {
        return StringUtils.format(Resources.RuleValidationMessage_TooLong, RuleValidationConstants.MaxFriendlyNameLength.toString());
    }
    else if (RuleUtils.ruleValueContainsInvalidCharacters(value)) {
        return Resources.RuleNameContainsInvalidCharacters;
    }

    return "";
}