/// <reference types="react" />

import * as React from "react";

import { deleteFolderRequested, folderActionCompleted } from "Build/Scripts/Actions/FolderActions";
import { AbstractDialog } from "Build/Scripts/Components/AbstractDialog";
import { triggerEnterKeyHandler } from "Build/Scripts/ReactHandlers";
import * as BuildResources from "Build/Scripts/Resources/TFS.Resources.Build";

import { MessageBarType } from "OfficeFabric/MessageBar";
import { Label } from "OfficeFabric/Label";
import { TextField } from "OfficeFabric/TextField";

import { format } from "VSS/Utils/String";

var RootPath = "\\";

export interface IDeleteFolderDialogState {
    showDialog: boolean;
    okDisabled: boolean;
}

export interface IDeleteFolderDialogProps {
    path: string;
    showDialog: boolean;
    okDisabled?: boolean;
    onDismissed?: () => void;
    errorCallBack?: (error: Error) => void;
}

export class DeleteFolderDialog extends React.Component<IDeleteFolderDialogProps, IDeleteFolderDialogState> {
    private _name: string = "";

    private _showDialog: boolean = false;
    private _okDisabled: boolean = true;

    private _textFieldToFocus: TextField = null;

    constructor(props: IDeleteFolderDialogProps) {
        super(props);
        this._showDialog = props.showDialog;
        this.state = this._getState();
    }

    public render(): JSX.Element {
        return <AbstractDialog
            title={format(BuildResources.DeleteFolderDialogTitle, this.props.path)}
            isOpen={this.state.showDialog}
            onDismissed={this.props.onDismissed}
            onDismiss={this._onDismiss}
            onOkClick={this._onOkClick}
            okDisabled={this.state.okDisabled}>
            <Label className="build-pre-wrap-text">{format(BuildResources.DeleteFolderDescription, this.props.path)}</Label>
            <TextField
                onKeyDown={this._onKeyDown}
                ref={(textField) => this._textFieldToFocus = textField}
                label={BuildResources.DeleteFolderConfirmationText}
                required
                onBeforeChange={this._onNameChanged} />
        </AbstractDialog>;
    }

    public componentDidMount() {
        // on initial rendering
        if (this._textFieldToFocus) {
            this._textFieldToFocus.focus();
        }
    }

    public componentDidUpdate() {
        // for subsequent updates
        if (this._textFieldToFocus) {
            this._textFieldToFocus.focus();
        }
    }

    public componentWillReceiveProps(newProps: IDeleteFolderDialogProps) {
        this._showDialog = newProps.showDialog;
        if (newProps.okDisabled !== undefined) {
            this._okDisabled = newProps.okDisabled;
        }
        this.setState(this._getState());
    }

    public shouldComponentUpdate(nextProps: IDeleteFolderDialogProps, nextState: IDeleteFolderDialogState) {
        return this.props.showDialog != nextProps.showDialog
            || this.props.path != nextProps.path
            || this.state.showDialog != nextState.showDialog
            || this.state.okDisabled != nextState.okDisabled;
    }

    private _onKeyDown = (e) => {
        triggerEnterKeyHandler(e, this._onOkClick);
    }

    private _onNameChanged = (value: string) => {
        if (value === this.props.path) {
            this._controlOkButton(false);
        }
        else {
            this._controlOkButton(true);
        }
    };

    private _controlOkButton(disable: boolean) {
        this._okDisabled = disable;
        this.setState(this._getState());
    }

    private _onDismiss = () => {
        this._showDialog = false;
        this.setState(this._getState());
    }

    private _onOkClick = () => {
        if (this._okDisabled) {
            return;
        }

        deleteFolderRequested.invoke({
            path: this.props.path,
            successCallBack: (path) => {
                folderActionCompleted.invoke({
                    message: {
                        type: MessageBarType.success,
                        content: format(BuildResources.FolderDeleted, path)
                    },
                    defaultPath: RootPath
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
    }

    private _getState(): IDeleteFolderDialogState {
        return {
            okDisabled: this._okDisabled,
            showDialog: this._showDialog
        };
    }
}