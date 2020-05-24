/// <reference types="react" />

import * as React from "react";

import { ISelectedPathNode } from "DistributedTasksCommon/TFS.Tasks.Types";

import {
    IInputControlPropsBase,
    InputControlType
} from "DistributedTaskControls/SharedControls/InputControls/Common";
import { TextInputComponentBase } from "DistributedTaskControls/SharedControls/InputControls/Components/TextInputComponentBase";
import { Component as ExpandableTextbox } from "DistributedTaskControls/SharedControls/InputControls/Components/ExpandableTextbox";
import * as Resources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";

import { IconButton } from "OfficeFabric/Button";
import { css } from "OfficeFabric/Utilities";

import * as Diag from "VSS/Diag";
import * as Utils_String from "VSS/Utils/String";

export interface IFilePathInputComponentProps extends IInputControlPropsBase<string> {
    isFileSystemBrowsable?: () => boolean;
    filePathProviderDelegate?: (currentValue: string, callback: (node: ISelectedPathNode) => void) => void;
}

/**
 * @brief Implements File path input control
 */
export class FilePathInputComponent extends TextInputComponentBase<IFilePathInputComponentProps> {

    public getType(): string {
        return InputControlType.INPUT_TYPE_FILE_PATH;
    }

    protected getControl(): JSX.Element {
        Diag.logVerbose("[FilePathInputComponent.getControl]: Method called.");

        return (
            <div className={css("input-control-file-path", {
                "is-browsable": this.props.isFileSystemBrowsable && this.props.isFileSystemBrowsable() && !this.props.disabled
            })}>
                <div className="input-control-file-path-name" >
                    <ExpandableTextbox
                        required={this.props.required}
                        id={this.getInputFieldControlElementId()}
                        ariaLabelledBy={this.props.ariaLabelledBy || this.getInputFieldLabelElementId()}
                        ariaDescribedBy={this.props.ariaDescribedBy || this.getInputFieldDescriptionElementId()}
                        value={this.state.value}
                        onChanged={this.onValueChanged}
                        disabled={this.props.disabled}
                        onGetErrorMessage={this.getErrorMessage}
                        onNotifyValidationResult={this.props.onNotifyValidationResult} />
                </div>
                <div className="input-control-buttons">
                    {
                        this.props.isFileSystemBrowsable && this.props.isFileSystemBrowsable() && !this.props.disabled &&
                        <div className="input-container-file-path-browse-button-container">
                            <IconButton
                                className={css("input-control-file-path-browse-button", "input-control-icon-button", "fabric-style-overrides", "icon-button-override")}
                                iconProps={{ iconName: "More" }}
                                onClick={this._onClick}
                                ariaDescription = {Utils_String.localeFormat(Resources.BrowseInputComponentDescription, this.props.label)}
                                ariaLabel={Resources.Browse} >
                            </IconButton>
                        </div>
                    }
                </div>
            </div>
        );
    }

    private _onClick = (): void => {
        if (!!this.props.filePathProviderDelegate) {
            Diag.logInfo("[FilePathInputComponent._onClick]: Calling filePathProviderDelegate method to launch the file selection dialog.");

            this.props.filePathProviderDelegate(this.state.value, (node) => {
                this.onValueChanged(node.path);
            });

        } else {
            Diag.logInfo("[FilePathInputComponent._onClick]: Error: filePathProviderDelegate is not a function.");
        }
    }
}
