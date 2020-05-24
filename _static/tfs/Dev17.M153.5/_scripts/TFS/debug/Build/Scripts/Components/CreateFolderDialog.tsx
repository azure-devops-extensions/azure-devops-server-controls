/// <reference types="react" />

import * as React from "react";

import { createFolderRequested, folderActionCompleted } from "Build/Scripts/Actions/FolderActions";
import { AbstractDialog } from "Build/Scripts/Components/AbstractDialog";
import { RecentlyUsedFolderPaths } from "Build/Scripts/Mru";
import { triggerEnterKeyHandler } from "Build/Scripts/ReactHandlers";
import * as BuildResources from "Build/Scripts/Resources/TFS.Resources.Build";
import { getPathInvalidErrorMessage } from "Build/Scripts/Validator";

import { isDefinitionFolderValid } from "Build.Common/Scripts/Validation";

import { MessageBarType } from "OfficeFabric/MessageBar";
import { TextField } from "OfficeFabric/TextField";

import { format } from "VSS/Utils/String";

import { Folder } from "TFS/Build/Contracts";

var RootPath = "\\";

export interface ICreateFolderDialogState {
    showDialog: boolean;
    okDisabled: boolean;
}

export interface ICreateFolderDialogProps {
    path: string;
    showDialog: boolean;
    okDisabled?: boolean;
    onDismissed?: () => void;
    errorCallBack?: (error: Error) => void;
}

export class CreateFolderDialog extends React.Component<ICreateFolderDialogProps, ICreateFolderDialogState>  {
    private _name: string = "";
    private _description: string = "";

    private _showDialog: boolean = false;
    private _okDisabled: boolean = true;

    private _textFieldToFocus: TextField = null;

    constructor(props: ICreateFolderDialogProps) {
        super(props);
        this._showDialog = props.showDialog;
        this.state = this._getState();
    }

    public render(): JSX.Element {
        return <AbstractDialog
            title={BuildResources.CreateNewFolderText}
            isOpen={this.state.showDialog}
            onDismissed={this.props.onDismissed}
            onDismiss={this._onDismiss}
            onOkClick={this._onOkClick}
            okDisabled={this.state.okDisabled}>
            <TextField
                onKeyDown={this._onKeyDown}
                label={BuildResources.BuildPathLabel}
                value={this.props.path}
                disabled />
            <TextField
                onKeyDown={this._onKeyDown}
                ref={(textField) => this._textFieldToFocus = textField}
                label={BuildResources.NameLabel}
                required
                onGetErrorMessage={getPathInvalidErrorMessage}
                onBeforeChange={this._onNameChanged}
                autoFocus />
            <TextField
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

    public componentDidUpdate() {
        if (this._textFieldToFocus) {
            this._textFieldToFocus.focus();
        }
    }

    private _onDescriptionChanged = (value: string) => {
        this._description = value;
    }

    private _onKeyDown = (e) => {
        triggerEnterKeyHandler(e, this._onOkClick);
    }

    public componentWillReceiveProps(newProps: ICreateFolderDialogProps) {
        this._showDialog = newProps.showDialog;
        if (newProps.okDisabled !== undefined) {
            this._okDisabled = newProps.okDisabled;
        }
        this.setState(this._getState());
    }

    public shouldComponentUpdate(nextProps: ICreateFolderDialogProps, nextState: ICreateFolderDialogState) {
        return this.props.showDialog != nextProps.showDialog
            || this.props.path != nextProps.path
            || this.state.showDialog != nextState.showDialog
            || this.state.okDisabled != nextState.okDisabled;
    }

    private _onDismiss = () => {
        this._showDialog = false;
        this.setState(this._getState());
    }

    private _onNameChanged = (value) => {
        this._name = value;
        if (isDefinitionFolderValid(value)) {
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

        let path = this.props.path + RootPath + this._name;
        let folder: Folder = {
            path: path,
            description: this._description,
            createdBy: undefined,
            createdOn: undefined,
            lastChangedBy: undefined,
            lastChangedDate: undefined,
            project: undefined
        };

        createFolderRequested.invoke({
            folder: folder,
            successCallBack: (path) => {
                folderActionCompleted.invoke({
                    message: {
                        type: MessageBarType.success,
                        content: format(BuildResources.FolderCreated, path)
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

        RecentlyUsedFolderPaths.appendMRUValue(path);

        this._onDismiss();
    };

    private _getState(): ICreateFolderDialogState {
        return {
            okDisabled: this._okDisabled,
            showDialog: this._showDialog
        };
    }
}