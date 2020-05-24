/// <reference types="react" />

import * as React from "react";

import { folderUpdateRequested, folderActionCompleted } from "Build/Scripts/Actions/FolderActions";
import { AbstractDialog } from "Build/Scripts/Components/AbstractDialog";
import { triggerEnterKeyHandler } from "Build/Scripts/ReactHandlers";
import * as BuildResources from "Build/Scripts/Resources/TFS.Resources.Build";
import { getPathInvalidErrorMessage } from "Build/Scripts/Validator";

import { isDefinitionFolderValid } from "Build.Common/Scripts/Validation";

import { MessageBarType } from "OfficeFabric/MessageBar";
import { TextField } from "OfficeFabric/TextField";

import { format, empty } from "VSS/Utils/String";

import { Folder } from "TFS/Build/Contracts";

import { logError } from "VSS/Diag";

var RootPath = "\\";

export interface IRenameFolderDialogState {
    showDialog: boolean;
    okDisabled: boolean;
}

export interface IRenameFolderDialogProps {
    path: string;
    showDialog: boolean;
    description?: string;
    okDisabled?: boolean;
    onDismissed?: () => void;
    errorCallBack?: (error: Error) => void;
}

export class RenameFolderDialog extends React.Component<IRenameFolderDialogProps, IRenameFolderDialogState> {
    private _name: string = empty;
    private _description: string = empty;

    private _originalDescription: string = empty;
    private _originalName: string = empty;

    private _showDialog: boolean = false;
    private _okDisabled: boolean = true;

    private _textFieldToFocus: TextField = null;

    constructor(props: IRenameFolderDialogProps) {
        super(props);
        this._showDialog = props.showDialog;

        this._originalName = getNameFromPath(props.path);
        this._name = this._originalName;

        this._originalDescription = props.description || empty;
        this._description = this._originalDescription;

        this.state = this._getState();
    }

    public render(): JSX.Element {
        return <AbstractDialog
            title={format(BuildResources.RenameFolderDialogTitle, this.props.path)}
            isOpen={this.state.showDialog}
            onDismiss={this._onDismiss}
            onDismissed={this.props.onDismissed}
            onOkClick={this._onOkClick}
            okDisabled={this.state.okDisabled}>
            <TextField
                onKeyDown={this._onKeyDown}
                value={this._name}
                ref={(textField) => this._textFieldToFocus = textField}
                label={BuildResources.NameLabel}
                required
                onGetErrorMessage={this._getPathInvalidErrorMessage}
                onBeforeChange={this._onNameChanged}
                autoFocus />
            <TextField
                value={this._description}
                label={BuildResources.DescriptionLabel}
                multiline
                resizable={false}
                onChanged={this._onDescriptionChanged} />
        </AbstractDialog>;
    }

    public componentDidMount() {
        if (this._textFieldToFocus) {
            this._textFieldToFocus.focus();
        }
    }

    public componentWillReceiveProps(newProps: IRenameFolderDialogProps) {
        this._showDialog = newProps.showDialog;

        this._name = getNameFromPath(newProps.path);
        this._originalName = this._name;

        this._description = newProps.description;
        this._originalDescription = this._description;

        if (newProps.okDisabled !== undefined) {
            this._okDisabled = newProps.okDisabled;
        }
        this.setState(this._getState());
    }

    public shouldComponentUpdate(nextProps: IRenameFolderDialogProps, nextState: IRenameFolderDialogState) {
        return this.props.showDialog != nextProps.showDialog
            || this.props.path != nextProps.path
            || this.state.showDialog != nextState.showDialog
            || this.state.okDisabled != nextState.okDisabled;
    }

    private _onDescriptionChanged = (value: string) => {
        this._description = value;
        if (this._originalDescription !== value) {
            this._controlOkButton(false);
        }
        else {
            this._controlOkButton(true);
        }
    }

    private _onDismiss = () => {
        this._showDialog = false;
        this.setState(this._getState());
    }

    private _onKeyDown = (e) => {
        triggerEnterKeyHandler(e, this._onOkClick);
    }

    private _getPathInvalidErrorMessage = (value: string) => {
        let message = getPathInvalidErrorMessage(value);
        if (!message) {
            // while renaming, let's not allow "\" which might lead to creating folders in others path
            if (!isDefinitionFolderValid(value, [RootPath])) {
                message = BuildResources.BuildFolderNameInvalidRootCharacter;
            }
        }
        return message;
    }

    private _onNameChanged = (value) => {
        this._name = value;
        let cleanName = this._name.replace(/\s+$/, '');
        // while renaming, let's not allow "\" which might lead to creating folders in others path
        if (isDefinitionFolderValid(cleanName, [RootPath]) && this._originalName !== cleanName) {
            this._controlOkButton(false);
        }
        else {
            this._controlOkButton(true);
        }
    }

    private _controlOkButton(disable: boolean) {
        this._okDisabled = disable;
        this.setState(this._getState());
    }

    private _onOkClick = () => {
        if (this._okDisabled) {
            return;
        }

        let pathSlices = this.props.path.split(RootPath);
        let parentPath = pathSlices.slice(0, pathSlices.length - 1).join(RootPath);
        let cleanName = this._name.replace(/\s+$/, '');
        let folder: Folder = {
            path: parentPath + RootPath + cleanName,
            description: this._description,
            createdBy: undefined,
            createdOn: undefined,
            lastChangedBy: undefined,
            lastChangedDate: undefined,
            project: undefined
        };

        folderUpdateRequested.invoke({
            folder: folder,
            path: this.props.path,
            successCallBack: (path) => {
                folderActionCompleted.invoke({
                    message: {
                        type: MessageBarType.success,
                        content: format(BuildResources.FolderRenamed, this.props.path, path)
                    },
                    defaultPath: path
                });
            },
            errorCallBack: (error) => {
                if (this.props.errorCallBack) {
                    this.props.errorCallBack(error);
                }
                else {
                    folderActionCompleted.invoke({
                        message: {
                            type: MessageBarType.error,
                            content: error.message
                        }

                    });
                }
            }
        });

        this._onDismiss();
    };

    private _getState(): IRenameFolderDialogState {
        return {
            okDisabled: this._okDisabled,
            showDialog: this._showDialog
        };
    }
}

function getNameFromPath(path: string) {
    let pathSplit = path.split(RootPath);
    if (pathSplit.length > 0) {
        return pathSplit[pathSplit.length - 1];
    }
    else {
        logError("Path:`" + path + "` is not valid, this shouldn't happen.");
    }
}