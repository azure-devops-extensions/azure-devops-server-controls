import * as React from "react";
import { TextField } from "OfficeFabric/TextField";
import { CopyButton } from "VSSPreview/Flux/Components/CopyButton";
import "VSS/LoaderPlugins/Css!VersionControl/TextFieldWithCopyButton";

export interface TextFieldWithCopyButtonProps {
    value: string;
    label: string;
    tooltipBeforeCopied: string;
    tooltipAfterCopied: string;
    className?: string;
    isEditable?: boolean;
    onChanged?(value: string): void;
    onBlur?(): void;
    errorMessage?: string;
    textFieldRef?(ref: any): void;
    autoFocusCopyButton?: boolean;
}

/**
* A control that has some text with a button that allows you to copy the value
* of the text to the user's clipboard.
*/
export const TextFieldWithCopyButton = (props: TextFieldWithCopyButtonProps): JSX.Element => {
    const containerCssClass = "text-field-with-copy-button";
    const textFieldCssClass = "text-field";
    return (
        <div className={props.className ? containerCssClass + " " + props.className : containerCssClass}>
            <TextField
                className={textFieldCssClass}
                ref={props.textFieldRef}
                value={props.value}
                onChanged={props.onChanged}
                onBlur={props.onBlur}
                label={props.label}
                errorMessage={props.errorMessage}
                disabled={!props.isEditable} />
            <CopyButton
                autoFocus={props.autoFocusCopyButton}
                copyTitle={props.tooltipBeforeCopied}
                copiedTitle={props.tooltipAfterCopied}
                copyText={props.value}
                copyAsHtml={false} />
        </div>
    );
}