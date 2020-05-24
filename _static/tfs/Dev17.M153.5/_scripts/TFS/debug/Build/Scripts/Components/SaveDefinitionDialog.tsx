/// <reference types="react" />
import * as React from "react";
import * as ReactDOM from "react-dom";

import { getDefinition } from "Build/Scripts/Actions/DefinitionsActionCreator";
import * as FolderManageDialog_Component_NO_REQUIRE from "Build/Scripts/Components/FolderManageDialog";
import { renderLazyComponentIntoDom } from "Build/Scripts/Components/LazyRenderedDomComponent";
import { triggerEnterKeyHandler } from "Build/Scripts/ReactHandlers";
import * as BuildResources from "Build/Scripts/Resources/TFS.Resources.Build";
import { SaveDefinitionDialogStore, getSaveDefinitionDialogStore, IFolderItems } from "Build/Scripts/Stores/SaveDefinitionDialog";
import { DefinitionSource } from "Build/Scripts/Sources/Definitions";
import { TemplatesSource } from "Build/Scripts/Sources/Templates";
import { getDefinitionNameInvalidErrorMessage, getPathInvalidErrorMessage } from "Build/Scripts/Validator";

import { isDefinitionNameValid, isDefinitionFolderValid } from "Build.Common/Scripts/Validation";

import { DefaultButton } from "OfficeFabric/components/Button/DefaultButton/DefaultButton";
import { PrimaryButton } from "OfficeFabric/components/Button/PrimaryButton/PrimaryButton";
import { Dialog, DialogFooter, DialogType } from "OfficeFabric/Dialog";
import { TextField } from "OfficeFabric/TextField";

import { DefinitionReference, DefinitionQuality, Folder, BuildDefinition, BuildDefinitionTemplate } from "TFS/Build/Contracts";

import { logError } from "VSS/Diag";
import * as VSS_Resources_Platform from "VSS/Resources/VSS.Resources.Platform";
import { getCollectionService } from "VSS/Service";
import { arrayEquals } from "VSS/Utils/Array";

import "VSS/LoaderPlugins/Css!Build/SaveDefinitionDialog";

export interface IDefinitionUpdatedPayload {
    name: string;
    description: string;
    path: string;
}

export interface ISaveDefinitionDialogProps {
    showDialog: boolean;
    path?: string;
    definitionId?: number;
    onOkClick?: (payload: IDefinitionUpdatedPayload) => void;
    hideFolderPicker?: boolean;
    disableNameEditing?: boolean;
    name?: string;
    title?: string;
}

export interface ISaveState {
    initialized: boolean;
    definition: BuildDefinition;
}

export class SaveDefinitionDialog extends React.Component<ISaveDefinitionDialogProps, ISaveState>{
    private _definitionSource: DefinitionSource;

    constructor(props: ISaveDefinitionDialogProps) {
        super(props);
        this.state = {
            initialized: false,
            definition: null
        };

        this._definitionSource = getCollectionService(DefinitionSource);
    }

    public render(): JSX.Element {
        let path = this.props.path || (this.state.definition ? this.state.definition.path : "\\");
        return this.state.initialized && <DefinitionDialog title={this._getTitle()} definition={this.state.definition} path={path} onOkClick={this._onOkClick} {...this.props} />;
    }

    public componentDidMount() {
        if (this.props.definitionId && this.props.definitionId > 0) {
            getDefinition(this._definitionSource, this.props.definitionId).then((definition) => {
                this.setState({
                    initialized: true,
                    definition: definition
                });
            });
        }
        else {
            this.setState({
                initialized: true,
                definition: null
            });
        }
    }

    private _getTitle() {
        if (this.props.title) {
            return this.props.title;
        }

        if (this.state.definition && this.state.definition.quality === DefinitionQuality.Draft) {
            return BuildResources.SaveDraftLabel;
        }

        return BuildResources.SaveDefinitionLabel;
    }

    private _onOkClick = (payload: IDefinitionUpdatedPayload) => {
        if (this.props.onOkClick) {
            this.props.onOkClick(payload);
        }
        else {
            let definitionToUpdate = { ...this.state.definition };
            definitionToUpdate.quality = DefinitionQuality.Definition;
            definitionToUpdate.name = payload.name;
            definitionToUpdate.comment = payload.description;
            definitionToUpdate.path = payload.path;
            this._definitionSource.updateDefinition(definitionToUpdate);
        }
    };
}

export class SaveAsTemplateDefinitionDialog extends React.Component<ISaveDefinitionDialogProps, ISaveState>{
    private _definitionSource: DefinitionSource;
    private _templateSource: TemplatesSource;

    constructor(props: ISaveDefinitionDialogProps) {
        super(props);
        this.state = {
            initialized: false,
            definition: null
        };

        this._definitionSource = getCollectionService(DefinitionSource);
        this._templateSource = getCollectionService(TemplatesSource);
    }

    public render(): JSX.Element {
        return this.state.initialized && <DefinitionDialog title={BuildResources.SaveTemplateDefinitionLabel} definition={this.state.definition} onOkClick={this._onOkClick} hideFolderPicker={true} {...this.props} />;
    }

    public componentDidMount() {
        if (this.props.definitionId && this.props.definitionId > 0) {
            getDefinition(this._definitionSource, this.props.definitionId).then((definition) => {
                this.setState({
                    initialized: true,
                    definition: definition
                });
            });
        }
        else {
            this.setState({
                initialized: true,
                definition: null
            });
        }
    }

    private _onOkClick = (payload: IDefinitionUpdatedPayload) => {
        if (this.props.onOkClick) {
            this.props.onOkClick(payload);
        }
        else {
            let definitionToUpdate = this.state.definition;
            definitionToUpdate.quality = DefinitionQuality.Definition;

            let template = {
                name: payload.name,
                description: payload.description,
                template: definitionToUpdate
            } as BuildDefinitionTemplate;
            this._templateSource.createTemplate(template);
        }
    };
}

interface IDefinitionDialogProps {
    showDialog: boolean;
    title: string;
    onOkClick: (payloadtype: IDefinitionUpdatedPayload) => void;
    path?: string;
    hideFolderPicker?: boolean;
    definition?: BuildDefinition;
    disableNameEditing?: boolean;
    name?: string;
}

interface IDefinitionDialogState {
    showDialog: boolean;
    okDisabled: boolean;
    folders: IFolderItems[];
    path: string;
}

class DefinitionDialog extends React.Component<IDefinitionDialogProps, IDefinitionDialogState> {
    private _store: SaveDefinitionDialogStore = null;

    private _name: string;
    private _description: string = "";
    private _path: string = "";
    private _okDisabled: boolean = true;
    private _showDialog: boolean = false;

    private _dialogElement: HTMLElement = null;
    private _textFieldToFocus: TextField = null;

    constructor(props: IDefinitionDialogProps) {
        super(props);
        this._showDialog = props.showDialog;
        this._store = getSaveDefinitionDialogStore();
        this._name = this.props.name ? this.props.name : (this.props.definition ? this.props.definition.name.trim() : "");
        this._path = this.props.path;

        this.state = this._getState();
    }

    public componentDidMount() {
        this._store.addChangedListener(this._updateState);
        if (this._textFieldToFocus) {
            this._textFieldToFocus.focus();
        }

        this._checkInputsValidity();
    }

    public componentWillUnmount() {
        if (this._dialogElement) {
            ReactDOM.unmountComponentAtNode(this._dialogElement);
        }

        this._store.removeChangedListener(this._updateState);
    }

    public componentWillReceiveProps(newProps: ISaveDefinitionDialogProps) {
        this._showDialog = newProps.showDialog;
        this._updateState();
    }

    public shouldComponentUpdate(nextProps: ISaveDefinitionDialogProps, nextState: IDefinitionDialogState) {
        return this.props.showDialog != nextProps.showDialog
            || this.state.showDialog != nextState.showDialog
            || this.state.okDisabled != nextState.okDisabled
            || this.state.path != nextState.path
            || !arrayEquals(this.state.folders, nextState.folders, (a, b) => { return a.key === b.key });;
    }


    public render(): JSX.Element {
        return <Dialog
            hidden={!this.state.showDialog}
            onDismiss={this._onDismiss}
            closeButtonAriaLabel={BuildResources.CloseButtonText}
            dialogContentProps={{
                type: DialogType.close,
                title: this.props.title
            }}
            modalProps={{
                className: "save-build-definition-dialog bowtie-fabric"
            }}>
            <span ref={(element) => this._dialogElement = element} />
            <TextField onKeyDown={this._onKeyDown} ref={(textField) => !this.props.disableNameEditing ? this._textFieldToFocus = textField : null} label={BuildResources.NameLabel} required disabled={this.props.disableNameEditing} onGetErrorMessage={getDefinitionNameInvalidErrorMessage} value={this._name} onBeforeChange={this._onNameChanged} />
            <TextField ref={(textField) => this.props.disableNameEditing ? this._textFieldToFocus = textField : null} label={BuildResources.DescriptionLabel} placeholder={BuildResources.DescriptionPlaceHolder} multiline resizable={false} value={this._description} onChanged={this._onDescriptionChanged} />
            {
                !this.props.hideFolderPicker && (<div className="picker-container">
                    <TextField onKeyDown={this._onKeyDown} className="folder-path" required label={BuildResources.BuildSelectFolderLabel} onGetErrorMessage={getPathInvalidErrorMessage} value={this.state.path} onBeforeChange={this._onPathChanged} />
                    <DefaultButton className="picker" ariaLabel={BuildResources.BuildSelectFolderLabel} ariaDescription={BuildResources.BuildSelectFolderDescription} onClick={this._onFolderPickerClick}>...</DefaultButton>
                </div>)
            }
            <DialogFooter>
                <PrimaryButton disabled={this.state.okDisabled} onClick={this._onOkClick}>{VSS_Resources_Platform.ModalDialogOkButton}</PrimaryButton>
                <DefaultButton onClick={this._onDismiss}>{VSS_Resources_Platform.CloseButtonLabelText}</DefaultButton>
            </DialogFooter>
        </Dialog>;
    }

    private _updateState = () => {
        this.setState(this._getState());
    };

    private _getState(): IDefinitionDialogState {
        return {
            showDialog: this._showDialog,
            okDisabled: this._okDisabled,
            folders: this._store.getFolders(),
            path: this._path
        };
    }

    private _controlOkButton(disable: boolean) {
        this._okDisabled = disable;
        this.setState(this._getState());
    }

    private _onDismiss = () => {
        this._showDialog = false;
        this.setState(this._getState());
    }

    private _onDescriptionChanged = (value) => {
        this._description = value;
    }

    private _onKeyDown = (e) => {
        triggerEnterKeyHandler(e, this._onOkClick);
    }

    private _onFolderPickerClick = () => {
        let props: FolderManageDialog_Component_NO_REQUIRE.IFolderManageDialogProps = {
            title: BuildResources.BuildSelectFolderLabel,
            showDialogActions: true,
            okManageDialogCallBack: (result) => {
                this._path = result.path;
                this._updateState();
            },
            showDialog: true,
            defaultPath: this._path
        };

        renderLazyComponentIntoDom(
            this._dialogElement,
            ["Build/Scripts/Components/FolderManageDialog"],
            props,
            (m: typeof FolderManageDialog_Component_NO_REQUIRE) => m.FolderManageDialog,
            null,
            false);
    }

    private _onOkClick = () => {
        if (this._okDisabled) {
            return;
        }

        let payload: IDefinitionUpdatedPayload = {
            name: this._name,
            description: this._description,
            path: this._path
        };

        this.props.onOkClick(payload);
        this._onDismiss();
    }

    private _onNameChanged = (value) => {
        this._name = value;
        this._checkInputsValidity();
    }

    private _onPathChanged = (value) => {
        this._path = value;
        this._checkInputsValidity();
    }

    private _checkInputsValidity() {
        // check path only when the textbox is visible so that, since user would have to know why button is being disabled
        if (isDefinitionNameValid(this._name) && (this.props.hideFolderPicker || isDefinitionFolderValid(this._path))) {
            this._controlOkButton(false);
        }
        else {
            this._controlOkButton(true);
        }
    }
}
