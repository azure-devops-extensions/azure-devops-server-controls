// libs
import * as React from "react";
import { localeFormat } from "VSS/Utils/String";
// controls
import { TextField, ITextFieldProps } from "OfficeFabric/TextField";
// scenario
import * as Resources from "Policy/Scripts/Resources/TFS.Resources.Policy";

export interface NumberTextFieldProps extends ITextFieldProps {
    // User must provide an integer value
    integer?: boolean;

    // Minimum allowed value
    minValue?: number;

    // Maximum allowed value
    maxValue?: number;

    // Adds numericValue to the onNotifyValidationResult signature so that the user doesn't have to parse
    // the number. numericValue will be undefined if the input is not valid for any reason
    // (decimal input and integer === true, out of min/max bounds, not a number, etc)
    onNotifyValidationResult?: (errorMessage: string, stringValue: string, numericValue?: number) => void;
}

export const NumberTextField: React.StatelessComponent<NumberTextFieldProps> =
    (props: NumberTextFieldProps): JSX.Element => {

        // destructure props object
        const {
            integer,
            minValue,
            maxValue,
            onNotifyValidationResult,
            onGetErrorMessage,
            ...textFieldProps
        } = props;

        return (
            <TextField
                onNotifyValidationResult={(errorMessage: string, value: string) =>
                    notifyValidationResult(errorMessage, value, onNotifyValidationResult)
                }
                onGetErrorMessage={(value: string) =>
                    getErrorMessage(value, integer, minValue, maxValue, onGetErrorMessage)
                }
                {...textFieldProps as (ITextFieldProps & React.HTMLProps<TextField>) }
            />
        );
    }

const getErrorMessage = (
    stringValue: string,
    integer: boolean,
    minValue: number,
    maxValue: number,
    ownerOnGetErrorMessage: (v: string) => string | PromiseLike<string>
): string | PromiseLike<string> => {

    stringValue = stringValue.trim();

    if (stringValue !== "") {
        const numericValue = Number(stringValue);

        if (!isFinite(numericValue)) {
            return Resources.NumberTextFieldNaN;
        }

        if (integer && numericValue !== (numericValue | 0)) {
            return Resources.NumberTextFieldNotInteger;
        }

        if (minValue != null && numericValue < minValue) {
            return localeFormat(Resources.NumberTextFieldTooLow, minValue);
        }

        if (maxValue != null && numericValue > maxValue) {
            return localeFormat(Resources.NumberTextFieldTooHigh, maxValue);
        }
    }

    if (typeof ownerOnGetErrorMessage === "function") {
        // Creator of this control has more validation checks to perform
        return ownerOnGetErrorMessage(stringValue);
    }
    else {
        return "";
    }
}

const notifyValidationResult = (
    errorMessage: string,
    stringValue: string,
    ownerOnNotifyValidationResult?: (errorMessage: string, stringValue: string, numericValue?: number) => void
): void => {

    if (typeof ownerOnNotifyValidationResult !== "function") {
        return;
    }

    stringValue = stringValue.trim();

    if (errorMessage === "" && stringValue !== "") {
        const numericValue = Number(stringValue);

        ownerOnNotifyValidationResult("", stringValue, numericValue);
    }
    else {
        ownerOnNotifyValidationResult(errorMessage, stringValue)
    }
}
