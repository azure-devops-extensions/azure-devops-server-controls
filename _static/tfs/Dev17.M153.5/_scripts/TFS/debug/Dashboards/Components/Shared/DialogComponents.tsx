import * as React from "react";
import * as ReactDOM from "react-dom";

import { MessageBar, MessageBarType } from "OfficeFabric/MessageBar";
import { DefaultButton, PrimaryButton } from "OfficeFabric/Button";
import { Checkbox } from "OfficeFabric/Checkbox";
import { TextField } from "OfficeFabric/TextField";
import { Label } from "OfficeFabric/Label";
import { Link } from "OfficeFabric/Link";
import { IDropdownOption } from "OfficeFabric/Dropdown";

import { Spinner, SpinnerSize } from "OfficeFabric/Spinner";

import * as Utils_String from "VSS/Utils/String";

import { DashboardWidgetLimits } from "Dashboards/Scripts/Generated/Constants";

import * as Resources from "Dashboards/Scripts/Resources/TFS.Resources.Dashboards";

export class DashboardDialogConstants {
    public static maxNameLength = DashboardWidgetLimits.MaxDashboardNameLength;

    // needs to come through from the server once the description field is supported.  
    public static maxDescriptionLength = DashboardWidgetLimits.MaxDashboardDescriptionLength;

    // this needs to come from the registry (if it has been overriden for the account), defaulting to 5 mins from the server. 
    public static autoRefreshIntervalInMins = 5;
}

export class DashboardDialogMessageBarProps {
    // Message string to display on the component.
    message?: string;

    // Callback to be handled when message is dismissed
    onDismiss: () => void;
}

export const DashboardDialogMessageBar: React.StatelessComponent<DashboardDialogMessageBarProps> = (props: DashboardDialogMessageBarProps) => {
    return props.message ?
        <MessageBar
            onDismiss={props.onDismiss}
            isMultiline={true}
            messageBarType={MessageBarType.warning}>
            {props.message}
        </MessageBar> : null;
}

export class DashboardAutoRefreshCheckboxProps {
    // Callback to invoke when the checkbox is checked or unchecked
    onChange: (ev?: React.FormEvent<HTMLInputElement>, isChecked?: boolean) => void;

    // Initial state of the checkbox
    isChecked?: boolean;

    // Boolean flag to disable checkbox;
    disabled?: boolean;
}

export const DashboardAutoRefreshCheckbox: React.StatelessComponent<DashboardAutoRefreshCheckboxProps> = (props: DashboardAutoRefreshCheckboxProps) => {
    return <Checkbox
        checked={props.isChecked ? true : false}
        disabled={props.disabled}
        label={Utils_String.format(Resources.AutoRefreshSelected, DashboardDialogConstants.autoRefreshIntervalInMins)}
        onChange={props.onChange}
    />;
}

/**
 * Buttons for Dashboard dialogs.
 */

export class DashboardDialogButtonProps {
    // Text to be displayed on the button.
    buttonText: string;

    // Boolean flag to disable button.
    disabled?: boolean;

    // Callback to be handled when button is clicked
    onClick: () => void;

    isSaving?: boolean;
}

export const DashboardDialogOkButton: React.StatelessComponent<DashboardDialogButtonProps> = (props: DashboardDialogButtonProps) => {
    return <PrimaryButton
        onClick={props.onClick}
        disabled={props.disabled}>
        {
            props.isSaving ?
                <Spinner
                    key={"save-spinner"}
                    className={"spinner"}
                    size={SpinnerSize.small} /> : props.buttonText
        }
    </PrimaryButton>;
}

export const DashboardDialogCancelButton: React.StatelessComponent<DashboardDialogButtonProps> = (props: DashboardDialogButtonProps) => {
    return <DefaultButton
        onClick={props.onClick}
        disabled={props.disabled}>
        {props.buttonText}
    </DefaultButton>;
}

/**
 * Input fields for Dashboard dialogs.
 */

export class DashboardInputFieldProps {

    // Message to display when the field's user-entered input is invalid.
    errorMessage: string;

    // Change callback to invoke when the name field is modified.
    onChanged: (newValue: string) => void;

    // Callback to invoke once user input has been validated.
    onNotifyValidationResult: (errorMessage: string, value: string) => void;

    // Initial value to populate the field with, if any.
    initialValue?: string;

    // Boolean flag to disable input fields.
    disabled?: boolean;
}

export const DashboardNameField: React.StatelessComponent<DashboardInputFieldProps> = (props: DashboardInputFieldProps) => {
    return <TextField
        value={props.initialValue}
        inputClassName={"dashboard-dialog-name-field"}
        multiline={false}
        resizable={false}
        validateOnLoad={false}
        required={true}
        errorMessage={props.errorMessage}
        disabled={props.disabled}
        label={Resources.DashboardDialogNameField}
        placeholder={Resources.DashboardDialogNameFieldDescription}
        onGetErrorMessage={(value: string) => {
            if (value.trim().length >= DashboardDialogConstants.maxNameLength) {
                return Resources.DashboardDialogNameFieldErrorMessage;
            }
            else {
                return Utils_String.empty;
            }
        }}
        onChanged={props.onChanged}
        onNotifyValidationResult={props.onNotifyValidationResult}
    />;
}

export const DashboardDescriptionField: React.StatelessComponent<DashboardInputFieldProps> = (props: DashboardInputFieldProps) => {
    return <TextField
        value={props.initialValue}
        multiline={true}
        rows={10}
        resizable={false}
        validateOnLoad={false}
        errorMessage={props.errorMessage}
        disabled={props.disabled}
        label={Resources.DashboardDialogDescriptionField}
        placeholder={Resources.DashboardDialogDescriptionFieldDescription}
        onGetErrorMessage={(value: string) => {
            if (value.trim().length >= DashboardDialogConstants.maxDescriptionLength) {
                return Resources.DashboardDialogDescriptionFieldErrorMessage;
            }
            else {
                return Utils_String.empty;
            }
        }}
        onChanged={props.onChanged}
        onNotifyValidationResult={props.onNotifyValidationResult}
    />;
}