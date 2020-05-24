/// <reference types="react" />

import * as React from "react";

import * as Common from "DistributedTaskControls/Common/Common";
import { DtcUtils } from "DistributedTaskControls/Common/Utilities";
import {
    IInputControlPropsBase,
    IInputControlStateBase,
    InputControlType
} from "DistributedTaskControls/SharedControls/InputControls/Common";
import { InputBase } from "DistributedTaskControls/SharedControls/InputControls/Components/InputComponentBase";
import { Component as ExpandableTextbox } from "DistributedTaskControls/SharedControls/InputControls/Components/ExpandableTextbox";

import * as Diag from "VSS/Diag";
import * as Utils_String from "VSS/Utils/String";

export interface IInputState extends IInputControlStateBase<string> {
    inputValueDelimitedString: string;
}

export interface IStringListInputComponentProps extends IInputControlPropsBase<string> {
    disallowResetDelimitedString?: () => boolean;
}

/**
 * @brief Implements String list input control
 */
export class StringListInputComponent extends InputBase<string, IStringListInputComponentProps, IInputState> {

    /**
     * Mount the component, setting state in this method will not trigger a re-rendering
     * Using setState() that accepts a function rather than an object as the this.state get updated asynchronously
     */
    public componentWillMount(): void {
        super.componentWillMount();

         this.setState((prevState, props) => {
            const newState = { ...prevState };
            newState.inputValueDelimitedString = this._getDelimitedStringList(prevState.value);
            return newState;
        });
    }

    public getType(): string {
        return InputControlType.INPUT_TYPE_STRING_LIST;
    }

    protected getControl(): JSX.Element {
        Diag.logVerbose("[StringListInputComponent.getControl]: Method called.");

        // this is to handle the case of revert and save where display string has some not formatted value
        if (this.props.disallowResetDelimitedString && !this.props.disallowResetDelimitedString()) {
            if (this._stringify(this.state.inputValueDelimitedString) !== this.state.value) {
                // @TODO: don't mutate this.state.
                (this.state as IInputState).inputValueDelimitedString = this._getDelimitedStringList(this.state.value);
            }
        }

        return (
            <ExpandableTextbox
                id={this.getInputFieldControlElementId()}
                ariaLabelledBy={this.props.ariaLabelledBy || this.getInputFieldLabelElementId()}
                ariaDescribedBy={this.props.ariaDescribedBy || this.getInputFieldDescriptionElementId()}
                value={this.state.inputValueDelimitedString}
                onChanged={this._onChanged}
                disabled={this.props.disabled}
                onGetErrorMessage={this.getErrorMessage}
                onNotifyValidationResult={this.props.onNotifyValidationResult} />
        );
    }

    private _getDelimitedStringList(value: string): string {
        let delimitedStringList: string = Utils_String.empty;
        if (value) {
            let parsedStringArray = this._parseValue(value);
            delimitedStringList = this._convertValue(parsedStringArray);
        }

        Diag.logVerbose("[StringListInputComponent._getDelimitedStringList]: delimitedStringList " + delimitedStringList);

        return delimitedStringList;
    }

    private _convertValue(value: string[]): string {
        return (value || []).join(Common.CommaSeparator);
    }

    private _parseValue(value: string): string[] {
        let parsedJsonString: string[] = [];
        try {
            parsedJsonString = (!!value) ? JSON.parse(value) : [];
        }
        catch (e) {
            Diag.logError("[StringListInputComponent._parseValue]: Json parsing Error " + e);
        }

        return DtcUtils.fixEmptyAndRecurringStringValuesInArray(value ? parsedJsonString : []);
    }

    private _onChanged = (newValue: string) => {
        Diag.logVerbose("[StringListInputComponent._onChanged]: new value " + newValue);
        let updatedValue = this._stringify(newValue);

        this.setState({
            value: updatedValue,
            inputValueDelimitedString: newValue
        });

        this.props.onValueChanged(updatedValue);
        Diag.logVerbose("[StringListInputComponent._onChanged]: updatedValue " + updatedValue);
    }

    private _stringify(value: string): string {
        return JSON.stringify(this._getValues(value));
    }

    private _getValues(value: string): string[] {
        let trimmedValue = value.trim();
        return trimmedValue ? trimmedValue.split(Common.CommaSeparator) : [];
    }
}
