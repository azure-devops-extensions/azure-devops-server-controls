/// <reference types="react" />

import * as React from "react";
import * as ReactDOM from "react-dom";

import { SecureFileActionsCreator } from "DistributedTaskControls/Actions/SecureFileActionsCreator";
import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import * as Base from "DistributedTaskControls/Common/Components/Base";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { ComboBox as EditableComboBox, ComboBoxType } from "DistributedTaskControls/Components/ComboBox";
import * as Resources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";
import { IInputControlPropsBase, IInputControlStateBase, InputControlType } from "DistributedTaskControls/SharedControls/InputControls/Common";
import { FileUploadDialog } from "DistributedTaskControls/SharedControls/InputControls/Components/FileUploadDialog";
import { InputBase } from "DistributedTaskControls/SharedControls/InputControls/Components/InputComponentBase";
import { Component as RequiredIndicator } from "DistributedTaskControls/SharedControls/InputControls/Components/RequiredIndicator";
import { SecureFilesStore } from "DistributedTaskControls/Stores/SecureFilesStore";

import { IconButton } from "OfficeFabric/Button";
import { autobind, css } from "OfficeFabric/Utilities";

import { SecureFile } from "TFS/DistributedTask/Contracts";

import * as Diag from "VSS/Diag";
import * as Utils_String from "VSS/Utils/String";

import { FileInputResult } from "VSSUI/FileInput";

import "VSS/LoaderPlugins/Css!fabric";
import "VSS/LoaderPlugins/Css!DistributedTaskControls/Styles/FabricStyleOverrides";
import "VSS/LoaderPlugins/Css!DistributedTaskControls/SharedControls/InputControls/Components/InputComponentBase";
import "VSS/LoaderPlugins/Css!DistributedTaskControls/SharedControls/InputControls/Components/SecureFileInputComponent";

export interface ISecureFileInputPropsBase extends IInputControlPropsBase<string> {
    secureFiles: SecureFile[];
    onOkClick: (file: FileInputResult) => void;
    onUpdate: () => void;
}

export interface ISecureFileInputStateBase extends IInputControlStateBase<string> {
    filesByName: IDictionaryStringTo<SecureFile>;
    filesById: IDictionaryStringTo<SecureFile>;
    filenames: string[];
}

export interface ISecureFileInputProps extends ISecureFileInputPropsBase {
}

export interface ISecureFileState extends IInputControlStateBase<string> {
    secureFiles?: SecureFile[];
}

/**
 * @brief Implements secure file input control
 */
export class SecureFileInputComponent extends InputBase<string, ISecureFileInputProps, ISecureFileState> {
    private _store: SecureFilesStore;

    public getType(): string {
        return InputControlType.INPUT_TYPE_SECURE_FILE;
    }

    public componentWillMount(): void {
        this._store = StoreManager.GetStore<SecureFilesStore>(SecureFilesStore);
        this.setState(this._getState());
    }

    public componentDidMount(): void {
        super.componentDidMount();
        this._store.addChangedListener(this._onStoreChanged);
    }

    public componentWillUnmount(): void {
        super.componentWillUnmount();
        this._store.removeChangedListener(this._onStoreChanged);
    }

    protected getControl(): JSX.Element {
        Diag.logVerbose("[SecureFileInputComponent.getControl]: Method called.");
        return (
            <SecureFileInputComponentBase
                value={this.state.value}
                disabled={this.props.disabled}
                onValueChanged={this.onValueChanged}
                onUpdate={this._onUpdate}
                onOkClick={this._onOkClick}
                secureFiles={this.state.secureFiles}
                getErrorMessage={this._getErrorMessage}
                onNotifyValidationResult={this.props.onNotifyValidationResult} />
        );
    }

    @autobind
    private _onStoreChanged(): void {
        this.setState(this._getState());
    }

    @autobind
    private _onOkClick(file: FileInputResult): void {
        let actionCreator = ActionCreatorManager.GetActionCreator<SecureFileActionsCreator>(SecureFileActionsCreator);
        actionCreator.uploadSecureFile(file, this.props.onValueChanged);
    }

    @autobind
    private _onUpdate(): void {
        let actionCreator = ActionCreatorManager.GetActionCreator<SecureFileActionsCreator>(SecureFileActionsCreator);
        actionCreator.getSecureFiles();
    }

    @autobind
    private _getErrorMessage(newValue: string): string | PromiseLike<string> {
        let storeErrorMessage = this._store.getErrorMessage();
        if (!!storeErrorMessage) {
            return storeErrorMessage;
        }

        return this.getErrorMessage(newValue);
    }

    private _getState(): ISecureFileState {
        return {
            secureFiles: this._store.getSecureFiles(),
            value: (this.state && this.state.value) ? this.state.value : this.props.value
        };
    }
}

export class SecureFileInputComponentBase extends Base.Component<ISecureFileInputPropsBase, ISecureFileInputStateBase> {
    private _uploadDialogContainer: HTMLElement;
    private _elementInstance: HTMLElement;
    private _currentText: string;

    constructor(props: ISecureFileInputPropsBase) {
        super(props);

        this.state = this._getState(props);
    }

    public componentWillReceiveProps(newProps: ISecureFileInputPropsBase): void {
        this.setState(this._getState(newProps));
    }

    public componentWillMount(): void {
        this._refreshIfRequired();
    }

    public render(): JSX.Element {
        let value = this._getSelectedOption();

        return (
            <div className="secure-file-input-container" ref={this._resolveContainer}>
                <div className="secure-file-dropdown">
                    <RequiredIndicator value={this.state.value} onGetErrorMessage={this._getErrorMessage} onNotifyValidationResult={this.props.onNotifyValidationResult} >
                        <div className="fabric-style-overrides task-input-dropdown secure-file-combobox">
                            <EditableComboBox
                                enabled={!this.props.disabled}
                                value={value}
                                comboBoxType={ComboBoxType.Editable}
                                source={this.state.filenames}
                                onChange={this._onChanged} />
                        </div>
                    </RequiredIndicator>
                </div>
                {
                    !this.props.disabled &&
                    <div className="input-control-buttons">
                        <IconButton
                            disabled={this.props.disabled}
                            onClick={this._onRefresh}
                            iconProps={{ iconName: "Refresh" }}
                            className={css("input-control-icon-button", "fabric-style-overrides", "icon-button-override")}
                            ariaLabel={Resources.Refresh}
                            aria-disabled={this.props.disabled} />
                        <IconButton
                            disabled={this.props.disabled}
                            onClick={this._onUploadClick}
                            iconProps={{ iconName: "Settings" }}
                            className={css("input-control-icon-button", "fabric-style-overrides", "icon-button-override")}
                            ariaLabel={Resources.Manage}
                            aria-disabled={this.props.disabled} />
                    </div>
                }
            </div>
        );
    }

    private _onChanged = (newOption: string) => {
        this._currentText = newOption;

        let secureFile = this.state.filesByName[newOption];
        let value = !!secureFile ? secureFile.id : Utils_String.empty;

        if (!!this.props.onValueChanged) {
            this.props.onValueChanged(value);
        }
    }

    private _getState(props: ISecureFileInputPropsBase): ISecureFileInputStateBase {
        let filesByName: IDictionaryStringTo<SecureFile> = {};
        let filesById: IDictionaryStringTo<SecureFile> = {};
        let filenames: string[] = props.secureFiles.map((secureFile: SecureFile) => {
            filesByName[secureFile.name] = secureFile;
            filesById[secureFile.id] = secureFile;
            return secureFile.name;
        }).sort(Utils_String.localeComparer);

        return {
            value: props.value || Utils_String.empty,
            filenames: filenames,
            filesByName: filesByName,
            filesById: filesById
        };
    }

    private _refreshIfRequired(): void {
        if (this.state && this.state.filenames.length === 0) {
            this._update();
        }
    }

    private _getSelectedOption(): string {
        let secureFile = this.state.filesById[this.state.value];
        return secureFile ? secureFile.name : Utils_String.empty;
    }

    private _update(): void {
        if (this.props.onUpdate) {
            this.props.onUpdate();
        }
    }

    @autobind
    private _resolveContainer(container: HTMLElement): void {
        this._elementInstance = container;
    }

    @autobind
    private _getErrorMessage(): string | PromiseLike<string> {
        if (this.state.value === Utils_String.empty && this._currentText) {
            return Resources.RequiredInputInValidMessage;
        }
        else if (!!this.props.getErrorMessage) {
            return this.props.getErrorMessage(this.state.value);
        }
    }

    @autobind
    private _onRefresh(event: React.MouseEvent<HTMLButtonElement>) {
        this._update();
    }

    @autobind
    private _onUploadClick(event: React.MouseEvent<HTMLButtonElement>) {
        if (!this._uploadDialogContainer) {
            this._uploadDialogContainer = document.createElement("div");
            this._elementInstance.appendChild(this._uploadDialogContainer);
        }

        ReactDOM.render(React.createElement(FileUploadDialog, {
            onDialogClose: this._onDialogClose,
            onOkClick: this._onOkClick
        }), this._uploadDialogContainer);
    }

    @autobind
    private _onDialogClose(): void {
        ReactDOM.unmountComponentAtNode(this._uploadDialogContainer);
    }

    @autobind
    private _onOkClick(file: FileInputResult): void {
        if (this.props.onOkClick && file) {
            this.props.onOkClick(file);
        }
    }
}