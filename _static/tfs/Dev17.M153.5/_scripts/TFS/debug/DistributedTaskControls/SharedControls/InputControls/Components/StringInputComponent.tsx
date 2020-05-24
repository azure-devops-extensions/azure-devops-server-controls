/// <reference types="react" />

import * as React from "react";

import { IInputControlPropsBase, InputControlType } from "DistributedTaskControls/SharedControls/InputControls/Common";
import { Component as ExpandableTextbox } from "DistributedTaskControls/SharedControls/InputControls/Components/ExpandableTextbox";
import { TextInputComponentBase } from "DistributedTaskControls/SharedControls/InputControls/Components/TextInputComponentBase";
import { ValidatableTextField } from "DistributedTaskControls/SharedControls/InputControls/Components/ValidatableTextField";
import { TooltipIfOverflow } from "DistributedTaskControls/Components/TooltipIfOverflow";

import { Async, css } from "OfficeFabric/Utilities";

import * as Diag from "VSS/Diag";
import * as VSS_Utils from "VSS/Utils/Core";

export interface IStringInputComponent extends IInputControlPropsBase<string> {
    //Pass this prop to get Expandable or simple text box
    isMultilineExpandable?: boolean;
    noAutoAdjustHeight?: boolean;
    isResizable?: boolean;
    rows?: number;
    type?: string;
    onBlur?: () => void;
    inputClassName?: string;
    errorMessage?: string;
    id?: string;
    borderless?: boolean;
}


/**
 * @brief Implements simple string input control
 */
export class StringInputComponent extends TextInputComponentBase<IStringInputComponent> {

    public getType(): string {
        return InputControlType.INPUT_TYPE_STRING;
    }

    public setFocus(): void {
        if (this._textField) {
            this._textField.focus();
        }
    }

    public componentDidMount() {
        super.componentDidMount();
        let deferredOnChangeTimeInMs = 0;
        if (this.props.deferredOnChangeTimeInMs === undefined) {
            deferredOnChangeTimeInMs = StringInputComponent.c_defaultDeferredOnChangeTime;
        }
        else {
            deferredOnChangeTimeInMs = this.props.deferredOnChangeTimeInMs;
        }

        if (deferredOnChangeTimeInMs > 0) {
            let async = new Async();
            this._delayedOnChange = async.debounce(this.onValueChanged, deferredOnChangeTimeInMs);
        }
    }

    public componentWillReceiveProps(nextProps) {
        super.componentWillReceiveProps(nextProps);
        this._forceUpdate = nextProps.forceUpdate || !VSS_Utils.equals(this.props, nextProps);
    }

    protected getControl(): JSX.Element {
        Diag.logVerbose("[StringInputComponent.getControl]: Method called.");

        // Use ExpandableTextBox for multiline input starting with just one row.
        // Use TextField for single line OR multline autoadjustable (initiall 3 rows)

        // TODO: fix TextField to support multiline input with min 1 row and then
        // remove usage of ExpandableTextBox
        return this.props.isMultilineExpandable && (this.props.rows === 1) ? this._renderExpandableTextBox() : this._renderSimpleTextBox();
    }

    private _renderExpandableTextBox(): JSX.Element {
        return (<ExpandableTextbox
            textFieldRef={(element) => { this._textField = element; }}
            id={this.props.id || this.getInputFieldControlElementId()}
            ariaLabelledBy={this.props.ariaLabelledBy || this.getInputFieldLabelElementId()}
            ariaDescribedBy={this.props.ariaDescribedBy || this.getInputFieldDescriptionElementId()}
            required={this.props.required}
            value={this.state.value}
            onChanged={this._onValueChanged}
            disabled={this.props.disabled}
            onGetErrorMessage={this.getErrorMessage}
            type={this.props.type}
            onBlur={this.props.onBlur}
            inputClassName={this.props.inputClassName}
            onNotifyValidationResult={this.props.onNotifyValidationResult} />
        );
    }

    private _renderSimpleTextBox(): JSX.Element {
        return (
            <TooltipIfOverflow
                tooltip={this.state.value}
                forceUpdate={this._forceUpdate}
                targetElementClassName="string-input-component-input"
                containerClassName="string-input-component-input-container">
                <div className="string-input-component-input-container">
                    <ValidatableTextField
                        borderless={this.props.borderless}
                        ref={(element) => { this._textField = element; }}
                        id={this.props.id || this.getInputFieldControlElementId()}
                        aria-labelledby={this.props.ariaLabelledBy || (!!this.props.label ? this.getInputFieldLabelElementId() : null)}
                        aria-describedby={this.props.ariaDescribedBy || this.getInputFieldDescriptionElementId()}
                        aria-required={this.props.required}
                        ariaLabel={this.props.ariaLabel}
                        aria-disabled={this.props.disabled}
                        value={this.state.value}
                        className={css("input-textfield", this.props.cssClass)}
                        onChanged={this._onValueChanged}
                        disabled={this.props.disabled}
                        deferredValidationTime={this.props.deferredValidationTime}
                        onGetErrorMessage={this.getErrorMessage}
                        readOnly={this.props.readOnly}
                        type={this.props.type}
                        multiline={this.props.isMultilineExpandable}
                        resizable={this.props.isResizable}
                        autoAdjustHeight={this.props.noAutoAdjustHeight ? !this.props.noAutoAdjustHeight : this.props.isMultilineExpandable}
                        rows={this.props.rows}
                        onBlur={this.props.onBlur}
                        inputClassName={css("string-input-component-input", this.props.inputClassName)}
                        errorMessage={this.props.errorMessage}
                        onNotifyValidationResult={this.props.onNotifyValidationResult} />
                </div>
            </TooltipIfOverflow>
        );
    }

    private _onValueChanged = (value: string) => {
        if (this._delayedOnChange) {
            this._delayedOnChange(value);
        }
        else {
            this.onValueChanged(value);
        }
    }

    private _textField: ValidatableTextField;
    private _delayedOnChange: (string) => void;
    private static readonly c_defaultDeferredOnChangeTime = 500;
    private _forceUpdate: boolean = false;
}

