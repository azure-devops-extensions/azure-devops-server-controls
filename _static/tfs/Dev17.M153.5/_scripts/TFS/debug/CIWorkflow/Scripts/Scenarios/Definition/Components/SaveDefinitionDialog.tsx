import * as React from "react";

import { isDefinitionFolderValid } from "Build.Common/Scripts/Validation";

import { DefaultPath } from "CIWorkflow/Scripts/Common/PathUtils";
import * as Resources from "CIWorkflow/Scripts/Resources/TFS.Resources.CIWorkflow";
import { FoldersActionCreator } from "CIWorkflow/Scripts/Scenarios/Definition/Actions/FoldersActionCreator";
import { FolderManageDialog } from "CIWorkflow/Scripts/Scenarios/Definition/Components/FolderManageDialog";

import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import * as Base from "DistributedTaskControls/Common/Components/Base";
import { DialogWithMultiLineTextInput } from "DistributedTaskControls/Components/DialogWithMultiLineTextInput";
import * as DTCResources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";
import { MultiLineInputComponent } from "DistributedTaskControls/SharedControls/InputControls/Components/MultilineInputComponent";
import { StringInputComponent } from "DistributedTaskControls/SharedControls/InputControls/Components/StringInputComponent";

import { PrimaryButton, DefaultButton, IconButton } from "OfficeFabric/Button";
import { Dialog, DialogType, DialogFooter } from "OfficeFabric/Dialog";

import * as Utils_String from "VSS/Utils/String";

import "VSS/LoaderPlugins/Css!CIWorkflow/Scripts/Scenarios/Definition/Components/SaveDefinitionDialog";
import "VSS/LoaderPlugins/Css!DistributedTaskControls/Styles/FabricStyleOverrides";

export interface IProps extends Base.IProps {
    onCloseDialog?: () => void;
    onSave: (accessToken: string, path: string) => void;
    showDialog: boolean;
    hideFolderPicker: boolean;
    path?: string;
    titleText?: string;
    okButtonText?: string;
}

// [TODO]: For Save as Draft scenario we need to make showFolderPickerDialog state as true
export interface ISaveDefinitionDialogState extends Base.IState {
    okDisabled: boolean;
    path: string;
    /**
     * showFolderPickerDialog
     * False: When existing definition
     * True: When new defintion
     */
    showFolderPickerDialog: boolean;
}

export class Component extends Base.Component<IProps, ISaveDefinitionDialogState> {
    private _okDisabled: boolean = false;
    private _maximumPathLength: number = 400;
    private _path: string;
    private _showFolderPickerDialog: boolean = false;

    public componentWillReceiveProps(newProps: IProps) {
        this._path = newProps.path ? newProps.path : DefaultPath;
        this._updateState();
    }

    public render(): JSX.Element {
        let saveButtonClass: string = "ci-save-dialog-button";
        return ( this.props.showDialog ?
            <DialogWithMultiLineTextInput
                additionalCssClass={"ci-save-dialog-container"}
                titleText={this.props.titleText ? this.props.titleText : Resources.BuildDefinitionSaveDialogTitle}
                okButtonText={DTCResources.SaveButtonText}
                okButtonAriaLabel={DTCResources.SaveButtonText}
                onOkButtonClick={this._onSaveClick}
                showDialog={this.props.showDialog}
                onCancelButtonClick={this._onCloseDialog}
                multiLineInputLabel={Resources.SaveDefinitionCommentLabel}
                okDisabled={this.state.okDisabled}
            >
                {
                    !this.props.hideFolderPicker && (
                        <div className="folder-picker-container">
                            <StringInputComponent
                                cssClass="folder-path"
                                required={true}
                                label={Resources.BuildSelectFolderLabel}
                                getErrorMessage={this._getPathInvalidErrorMessage}
                                value={this.state.path}
                                onValueChanged={this._onPathChanged}
                                />

                            <IconButton className="folder-picker" title={Resources.BuildPickFolderLabel}
                                ariaLabel={Resources.BuildPickFolderLabel} ariaDescription={Resources.BuildSelectFolderDescription}
                                iconProps={{ iconName: "More" }}
                                onClick={this._onFolderPickerClick}>
                            </IconButton>
                        </div>)
                }
                <FolderManageDialog
                    title={Resources.BuildSelectFolderLabel}
                    showDialogActions={false}
                    okManageDialogCallBack={this._pickerDialogOkCallback}
                    onManageDialogDissmiss={this._pickerDialogCancelCallback}
                    showDialog={this.state.showFolderPickerDialog}
                    defaultPath={this._path}>
                </FolderManageDialog>
            </DialogWithMultiLineTextInput>
            : null
        );
    }

    private _updateState = () => {
        this.setState(this._getState());
    }

    private _getState(): ISaveDefinitionDialogState {
        return {
            okDisabled: this._okDisabled,
            path: this._path,
            showFolderPickerDialog: this._showFolderPickerDialog
        };
    }

    private _onSaveClick = (comment: string) => {
        if (this.props.onSave) {
            this.props.onSave(comment, this._path);
        }
    }

    private _onCloseDialog = () => {
        this.props.onCloseDialog();
    }

    private _onFolderPickerClick = () => {
        this._showFolderPickerDialog = true;
        ActionCreatorManager.GetActionCreator<FoldersActionCreator>(FoldersActionCreator).getFolders();
        this._updateState();
    }

    private _pickerDialogCancelCallback = () => {
        this._showFolderPickerDialog = false;
        this._updateState();
    }

    private _pickerDialogOkCallback = (value) => {
        if (value) {
            this._onPathChanged(value.path);
        }
        this._showFolderPickerDialog = false;
        this._updateState();
    }

    private _onPathChanged = (value) => {
        this._path = value;
        this._checkInputsValidity();
    }

    private _getPathInvalidErrorMessage = (path): string => {
        if (!path || path === Utils_String.empty) {
            return Resources.CannotBeEmptyText;
        }

        if (path.length > this._maximumPathLength) {
            return Resources.LongBuildNameErrorMessage;
        }

        return isDefinitionFolderValid(path) ? Utils_String.empty : Resources.BuildFolderNameInvalid;
    }

    private _controlOkButton(disable: boolean) {
        this._okDisabled = disable;
        this._updateState();
    }

    private _checkInputsValidity() {
        if (isDefinitionFolderValid(this._path)) {
            this._controlOkButton(false);
        }
        else {
            this._controlOkButton(true);
        }

    }
}
