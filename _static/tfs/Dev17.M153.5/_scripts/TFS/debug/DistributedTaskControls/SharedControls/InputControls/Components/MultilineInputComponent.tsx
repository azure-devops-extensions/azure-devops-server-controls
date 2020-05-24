/// <reference types="react" />

import * as React from "react";

import { DtcUtils } from "DistributedTaskControls/Common/Utilities";
import { InputControlType, IInputControlPropsBase, IInputControlStateBase } from "DistributedTaskControls/SharedControls/InputControls/Common";
import { TextInputComponentBase } from "DistributedTaskControls/SharedControls/InputControls/Components/TextInputComponentBase";
import { ValidatableTextField } from "DistributedTaskControls/SharedControls/InputControls/Components/ValidatableTextField";
import * as Resources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";
import { ClipboardUtils } from "DistributedTaskControls/Common/ClipboardUtils";

import * as Diag from "VSS/Diag";
import { IShowMessageDialogOptions, showMessageDialog } from "VSS/Controls/Dialogs";
import { delay } from "VSS/Utils/Core";
import { localeFormat } from "VSS/Utils/String";

export interface IMultiLineInputProps extends IInputControlPropsBase<string> {
    properties?: IDictionaryStringTo<string>;
    isNotResizable?: boolean;
}

/**
 * @brief Implements Multi-line input control
 */
export class MultiLineInputComponent<P extends IMultiLineInputProps = IMultiLineInputProps, S extends IInputControlStateBase<string> = IInputControlStateBase<string>> extends TextInputComponentBase<P> {

    public getType(): string {
        return InputControlType.INPUT_TYPE_MULTI_LINE;
    }

    public componentDidMount(): void {
        super.componentDidMount();

        const container = super.getContainer();
        if (container) {
            // This assumes that multi-line control is implemented using text area internally.
            this._input = container.querySelector("textarea");
            if (this._input) {
                this._input.addEventListener("paste", this._handlePaste);
                this._input.setAttribute("aria-describedby", this.props.ariaDescribedBy || this.getInputFieldDescriptionElementId());
            }
        }
    }

    public componentWillUnmount(): void {
        if (this._input) {
            this._input.removeEventListener("paste", this._handlePaste);
        }

        super.componentWillUnmount();
    }

    protected getControl(displayValue?: string, isDisabled?: boolean): JSX.Element {
        Diag.logVerbose("[MultiLineInputComponent.getControl]: Method called.");

        let rowCount = this._defaultNumOfRows;
        let style: React.CSSProperties;
        let value: string = displayValue == null ? this.state.value : displayValue;
        let disabled: boolean = !!isDisabled || this.props.disabled;

        if (this.props.properties) {
            rowCount = parseInt(this.props.properties["rows"], 10);
            style = { resize: DtcUtils.getBoolValue(this.props.properties["resizable"]) ? "vertical" : "none", pointerEvents: "auto" };
            this._maxLength = parseInt(this.props.properties["maxLength"], 10);
        }

        return (
            <ValidatableTextField
                id={this.getInputFieldControlElementId()}
                aria-labelledby={this.props.ariaLabelledBy || this.getInputFieldLabelElementId()}
                aria-describedby={this.props.ariaDescribedBy || this.getInputFieldDescriptionElementId()}
                aria-required={this.props.required}
                multiline
                resizable={this.props.isNotResizable ? false : true}
                value={value}
                onChanged={this.onValueChanged}
                onGetErrorMessage={this.getErrorMessage}
                rows={(!isNaN(rowCount)) ? rowCount : this._defaultNumOfRows}
                maxLength={(!isNaN(this._maxLength)) ? this._maxLength : null}
                style={style}
                disabled={disabled}
                aria-disabled={disabled}
                onNotifyValidationResult={this.onNotifyValidationResult} />
        );
    }

    protected onNotifyValidationResult = (errorMessage: string, value: string) => {
        if (this.props.onNotifyValidationResult) {
            this.props.onNotifyValidationResult(errorMessage, value);
        }
    }

    private _handlePaste = (event: ClipboardEvent) => {
        const pastedText = ClipboardUtils.getPastedText(event);
        if (pastedText && this._maxLength && pastedText.length > this._maxLength) {
            this._showWarningMessage();
        }
    }

    private _showWarningMessage(): void {
        // Delay is needed to ensure that paste does happen and we show the warning message later.
        delay(this, 0, () => {
            let options: IShowMessageDialogOptions = {
                title: Resources.WarningText,
                buttons: [{
                    id: "ok-button",
                    text: Resources.OK
                }]
            };

            showMessageDialog(localeFormat(Resources.PastedContentClippedText, this._maxLength), options);
        });
    }

    private _defaultNumOfRows = 2;
    private _maxLength: number;
    private _input: HTMLTextAreaElement;
}
