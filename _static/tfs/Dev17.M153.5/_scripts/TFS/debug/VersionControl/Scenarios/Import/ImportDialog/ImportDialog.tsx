import * as React from "react";
import * as ReactDom from "react-dom";

import { Overlay } from "OfficeFabric/Overlay";
import { Dialog, DialogType, DialogFooter } from "OfficeFabric/Dialog";
import { Dropdown, IDropdownOption, IDropdownState } from "OfficeFabric/Dropdown";
import { DefaultButton, PrimaryButton } from "OfficeFabric/Button";
import { TextField } from "OfficeFabric/TextField";
import { Checkbox } from "OfficeFabric/Checkbox";
import { Slider } from "OfficeFabric/Slider";
import { MessageBar, MessageBarType } from "OfficeFabric/MessageBar";

import * as Utils_String from "VSS/Utils/String";
import * as Telemetry from "VSS/Telemetry/Services";
import { TeamProjectReference } from "TFS/Core/Contracts"

import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";

import * as InjectDependency from "VersionControl/Scenarios/Shared/InjectDependency";
import * as CustomerIntelligenceConstants from "VersionControl/Scripts/CustomerIntelligenceConstants";
import { ActionsHub } from "VersionControl/Scenarios/Import/ImportDialog/ActionsHub";
import { State, Store, ImportSourceType, RepositoryPickerCiDataLabel, EmptyRepositoryPageCiDataLabel, TfvcImportHistoryDurationInDaysInitialPoint } from "VersionControl/Scenarios/Import/ImportDialog/Store";
import { ActionsCreator } from "VersionControl/Scenarios/Import/ImportDialog/ActionsCreator"

import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import * as ImportResources from "VersionControl/Scripts/Resources/TFS.Resources.ImportDialog";

import "VSS/LoaderPlugins/Css!VersionControl/Import/ImportDialog/ImportDialog";
import "VSS/LoaderPlugins/Css!fabric";

export interface ImportDialogOptions {
    projectInfo: TeamProjectReference;
    tfsContext: TfsContext;
    repositoryName?: string;
    onClose?: () => void;
}

export class ImportDialog {
    private static importDialogNode: HTMLElement;

    public static show(options: ImportDialogOptions) {
        ImportDialog.importDialogNode = document.createElement("div");
        ReactDom.render(<ImportDialogInternal {...options} />, ImportDialog.importDialogNode);
    }

    public static close() {
        ReactDom.unmountComponentAtNode(ImportDialog.importDialogNode);

        // not supported in IE - this will result in empty div remaining
        if (ImportDialog.importDialogNode.remove) {
            ImportDialog.importDialogNode.remove();
        }
    }
}

export class ImportDialogInternal extends React.Component<ImportDialogOptions, State>{
    private _actionsCreator: ActionsCreator;
    private _store: Store;

    private _sourceSelectionDropdown: Dropdown;
    private _cloneUrlSection: TextField;

    constructor(props: ImportDialogOptions, context?: any) {
        super(props, context);

        const actionsHub = new ActionsHub();
        this._store = new Store(actionsHub, this.props.repositoryName);
        this._actionsCreator = new ActionsCreator(
            actionsHub,
            () => this._store.getState(),
            this.props.projectInfo);
        this.state = this._store.getState();
        Telemetry.publishEvent(
            new Telemetry.TelemetryEventData(
                CustomerIntelligenceConstants.VERSION_CONTROL_AREA,
                CustomerIntelligenceConstants.IMPORTDIALOG_OPENED,
                this.state.EntryPointCiData
            )
        );
    }

    public componentDidMount(): void {
        this._store.addChangedListener(this._onStoreChanged);
    }

    public componentWillUnmount(): void {
        this._store.removeChangedListener(this._onStoreChanged);
    }

    private _onStoreChanged = (): void => {
        this.setState(this._store.getState());
    }

    public render() {
        return (
            <Dialog
                hidden={false}
                dialogContentProps={{ type: DialogType.close }}
                onDismiss={this._close}
                closeButtonAriaLabel={ImportResources.CloseLabel}
                title={this.state.DialogTitle}
                modalProps={{ containerClassName: "import-repository-dialog", isBlocking: true }}>
                {this.state.ImportRequestCreationInProgress && <Overlay />}
                <div>
                    {this.state.ImportRequestCreationError && this._renderImportRequestCreationError()}
                    {this.state.ValidationFailed && this._renderValidationFailedMessage()}
                    < ImportDialogTruckImage />
                    {this._renderSourceDropdown()}
                    {this.state.ImportSourceType === ImportSourceType.Git && this._renderGitSourceSection()}
                    {this.state.ImportSourceType === ImportSourceType.Tfvc && this._renderTfvcSourceSection()}
                    {this.state.RepositoryNameRequired && this._renderRepositoryInputSection()}
                    <DialogFooter>
                        <PrimaryButton
                            onClick={() => { this._actionsCreator.startImportProcess(); } }
                            disabled={!this._store.isImportRequestCreatable() || this.state.ImportRequestCreationInProgress}>
                            {ImportResources.ImportOkButtonLabel}
                        </PrimaryButton>
                        <DefaultButton
                            onClick={this._close}>
                            {ImportResources.CloseLabel}
                        </DefaultButton>
                    </DialogFooter>
                </div>
            </Dialog >
        );
    }

    private _close = (): void => {
        ImportDialog.close();
        if (this.props.onClose) {
            this.props.onClose();
        }
    }

    private _captureSourceSelectionDropdown = (ref: Dropdown) => {
        this._sourceSelectionDropdown = ref;
        if (ref) {
            this.setInitialFocus();
        }
    }

    private _captureCloneUrlSection = (ref: TextField) => {
        this._cloneUrlSection = ref;
        if (ref) {
            this.setInitialFocus();
        }
    }

    private setInitialFocus = () => {
        if (this._sourceSelectionDropdown) {
            this._sourceSelectionDropdown.focus();
        }
        else {
            // if TFVC to Git Import feature flag is not enabled then source selection will not be visible
            // so we will set focus on the clone Url input
            this._cloneUrlSection.focus();
        }
    }

    private _renderImportRequestCreationError = (): JSX.Element => {
        return (
            <MessageBar
                messageBarType={MessageBarType.error}
                onDismiss={() => { this._actionsCreator.clearAllError(); } }>
                {this.state.ImportRequestCreationError}
            </MessageBar>);
    }

    private _renderValidationFailedMessage = (): JSX.Element => {
        return (
            <MessageBar
                messageBarType={MessageBarType.error}
                onDismiss={() => { this._actionsCreator.clearAllError(); } }>
                    {ImportResources.ValidationError_Header}
                    {this.state.ImportSourceType === ImportSourceType.Git && this._renderGitToGitValidationFailedMessage()}
                    {this.state.ImportSourceType === ImportSourceType.Tfvc && this._renderTfvcToGitValidationFailedMessage()}
            </MessageBar>
        );
    }

    private _renderGitToGitValidationFailedMessage = (): JSX.Element => {
        return (
            <ul>
                <li>{ImportResources.ValidationError_UnreachableUrl}</li>
                {!this.state.IsAuthenticationRequired && <li> {ImportResources.ValidationError_Auth_Public}</li>}
                {this.state.IsAuthenticationRequired && <li> {ImportResources.ValidationError_Auth_Private}</li>}
                <li>{ImportResources.ValidationError_EmptySource}</li>
                <a
                    href={VCResources.ImportRepositoryLearnMoreHyperlink}
                    target="_blank"
                    rel="noopener noreferrer">
                    {VCResources.ImportRepositoryLearnMoreAboutErrorLabel}
                </a>
            </ul>
        );
    }

    private _renderTfvcToGitValidationFailedMessage = (): JSX.Element => {
        return (
            <ul>
                <li>{ImportResources.ValidationError_Tfvc_NoItem}</li>
                <a
                    href={VCResources.ImportRepositoryTFVCLearnMoreHyperlink}
                    target="_blank"
                    rel="noopener noreferrer">
                    {VCResources.ImportRepositoryLearnMoreAboutErrorLabel}
                </a>
            </ul>
        );
    }

    private _renderSourceDropdown = (): JSX.Element => {
        return (
            <div className="import-source-dropdown">
                <Dropdown
                    ref={this._captureSourceSelectionDropdown}
                    label= {ImportResources.SourceTypeLabel}
                    defaultSelectedKey="0"
                    options={[
                        { key: "0", text: ImportResources.SourceLabel_Git },
                        { key: "1", text: ImportResources.SourceLabel_Tfvc }
                    ]}
                    onChanged={this._SourceDropdownChange}
                    disabled={this.state.ImportRequestCreationInProgress}
                    />
            </div>
        );
    }

    private _SourceDropdownChange = (item: IDropdownOption): void => {
        switch (item.key) {
            case ("0"):
                this._actionsCreator.importSourceChanged(ImportSourceType.Git);
                break;
            case ("1"):
                this._actionsCreator.importSourceChanged(ImportSourceType.Tfvc);
                break;
        }

        // this is to make sure the dropdown closes
        this._sourceSelectionDropdown.setState(
            (prevState: IDropdownState) => {
                prevState.isOpen = false;
                return prevState;
            });
    }

    private _renderGitSourceSection = (): JSX.Element => {
        return (
            <div>
                <TextField
                    ref={this._captureCloneUrlSection}
                    required={true}
                    label={ImportResources.CloneUrlLabel}
                    placeholder={ImportResources.CloneUrlPlaceHolder}
                    onChanged={(value) => { this._actionsCreator.gitSourceUrlChanged(value); } }
                    />
                {this._renderRequiresAuthSection()}
                {this.state.IsAuthenticationRequired && this._renderUsernamePasswordSection()}
            </div>
        );
    }

    private _renderRequiresAuthSection = (): JSX.Element => {
        return (
            <Checkbox
                label={ImportResources.RequiresAuthLabel}
                defaultChecked={false}
                disabled={this.state.ImportRequestCreationInProgress}
                onChange={(ev, isChecked) => { this._actionsCreator.isAuthenticationRequiredChanged(isChecked); } }
                />
        );
    }

    private _renderUsernamePasswordSection = (): JSX.Element => {
        return (
            <div>
                <div
                    title={ImportResources.UsernameToolTip}>
                    <TextField
                        required={false}
                        label={ImportResources.Username}
                        onChanged={(value) => { this._actionsCreator.usernameChanged(value); } }
                        />
                </div>
                <div
                    title={ImportResources.PasswordToolTip}>
                    <TextField
                        required={true}
                        label={ImportResources.Password}
                        onChanged={(value) => { this._actionsCreator.passwordChanged(value); } }
                        type="password"
                        />
                </div>
            </div >
        );
    }

    private _renderTfvcSourceSection = (): JSX.Element => {
        const tfvcWarningMessage = { __html: ImportResources.Tfvc_WarningMessage };

        return (
            <div>
                <MessageBar
                    messageBarType={MessageBarType.info}>
                    <div
                        className="tfvc-import-warning"
                        dangerouslySetInnerHTML={tfvcWarningMessage} />
                </MessageBar>
                <TextField
                    required={true}
                    label={ImportResources.PathLabel}
                    placeholder={ImportResources.PathPlaceholderText}
                    onChanged={(value) => { this._actionsCreator.tfvcPathChanged(value); }}
                />
                <Checkbox
                    label={ImportResources.MigratehistoryLabel}
                    defaultChecked={false}
                    disabled={this.state.ImportRequestCreationInProgress}
                    onChange={(ev, isChecked) => { this._actionsCreator.tfvcImportHistoryChanged(isChecked); }}
                />
                <div className="import-tfvc-history-slider">
                    {this.state.TfvcSource.importHistory &&
                        <Slider
                            label={Utils_String.format(ImportResources.ImportHistoryDaysLabel, this.state.TfvcSource.importHistoryDurationInDays)}
                            min={1}
                            max={180}
                            step={1}
                            defaultValue={TfvcImportHistoryDurationInDaysInitialPoint}
                            showValue={false}
                            onChange={(value) => this._actionsCreator.tfvcImportHistoryDurationChanged(value)}
                        />}
                </div>
            </div>
        );
    }

    private _renderRepositoryInputSection = (): JSX.Element => {
        return (
            <TextField
                required={true}
                label={ImportResources.RepoLabel}
                placeholder={ImportResources.NamePlaceHolder}
                onChanged={(value) => { this._actionsCreator.repositoryNameChanged(value); } }
                value={this.state.RepositoryName}
                />
        );
    }
}

const ImportDialogTruckImage = InjectDependency.useTfsContext((tfsContext) =>
    (<div className="import-repository-dialog-image-container">
        <img alt="" className="import-repository-dialog-image" src={tfsContext.configuration.getResourcesFile("repoImportTruck.png")} />
    </div>));