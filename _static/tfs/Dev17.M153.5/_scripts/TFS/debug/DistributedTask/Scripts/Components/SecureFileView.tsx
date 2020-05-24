/// <reference types="react-dom" />

import React = require("react");
import ReactDOM = require("react-dom");

import Library_Actions = require("DistributedTask/Scripts/Actions/LibraryActions");
import LibraryActionCreator = require("DistributedTask/Scripts/Actions/LibraryActionCreator");
import Dialogs = require("DistributedTask/Scripts/Components/Dialogs");
import Constants = require("DistributedTask/Scripts/Constants");
import { SecureFile } from "DistributedTask/Scripts/DT.SecureFile.Model";
import { LibraryItemType } from "DistributedTask/Scripts/DT.Types";
import { KeyboardHelper } from "DistributedTask/Scripts/DT.Utils";
import DTUtils = require("DistributedTask/Scripts/DT.Utils");
import Resources = require("DistributedTask/Scripts/Resources/TFS.Resources.DistributedTask");
import { SecureFilePropertiesView } from "DistributedTask/Scripts/Components/SecureFilePropertiesView";
import { TitleBar, Props as TitleBarProps } from "DistributedTask/Scripts/Components/TitleBar";
import { SecureFilePropertiesStore } from "DistributedTask/Scripts/Stores/SecureFilePropertiesStore";
import { SecureFileStore, ISecureFileDetails } from "DistributedTask/Scripts/Stores/SecureFileStore";
import { ErrorMessageBar } from "DistributedTask/Scripts/Components/ErrorMessageBar";
import { PerfTelemetryManager, TelemetryScenarios } from "DistributedTask/Scripts/Utils/TelemetryUtils";

import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";

import { IContextualMenuItem } from "OfficeFabric/ContextualMenu";
import { Fabric } from "OfficeFabric/Fabric";
import { TextField } from "OfficeFabric/TextField";
import Events_Document = require("VSS/Events/Document");
import Events_Services = require("VSS/Events/Services");
import Component_Base = require("VSS/Flux/Component");
import Navigation_Services = require("VSS/Navigation/Services");
import Preview_Button = require("VSSPreview/Flux/Components/Button");
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import Utils_UI = require("VSS/Utils/UI");
import VSS = require("VSS/VSS");
import Events_Action = require("VSS/Events/Action");


import { Hub, IHub } from "VSSUI/Hub";
import { IHubBreadcrumbItem, HubHeader } from "VSSUI/HubHeader";
import { PivotBarItem, IPivotBarAction } from "VSSUI/PivotBar";
import { IHubViewState, HubViewState } from "VSSUI/Utilities/HubViewState";
import { VssIconType, VssIcon } from "VSSUI/VssIcon";

export interface State extends Component_Base.State {
	data: ISecureFileDetails;
    secureFileId: string;
    errorMessage: string;
}

export class SecureFileView extends Component_Base.Component<Component_Base.Props, State> implements Events_Document.RunningDocument {
    constructor(props: Component_Base.Props) {
        super(props);

        PerfTelemetryManager.initialize();
        PerfTelemetryManager.instance.startTTIScenarioOrNormalScenario(TelemetryScenarios.SecureFilesEditorLanding);

        this._hubViewState = new HubViewState();
        this._store = StoreManager.GetStore<SecureFileStore>(SecureFileStore);
        this._propertiesStore = StoreManager.GetStore<SecureFilePropertiesStore>(SecureFilePropertiesStore);
        this._libraryActionCreator = LibraryActionCreator.LibraryActionCreator.getInstance();
        this.state = this.getState();
        const urlState = Navigation_Services.getHistoryService().getCurrentState();
        (this.state as State).secureFileId = urlState.secureFileId;
        (this.state as State).data = this.getSecureFileDetailsClone();
        this._eventManager = Events_Services.getService();
    }

    public render(): JSX.Element {
        return (
            <Fabric>
                <ErrorMessageBar
                    errorMessage={this.state.errorMessage}
                />
                <Hub
                    className={this.state.errorMessage ? "hub-view vg-view has-error" : "hub-view vg-view"}
                    componentRef={(hub => { this._hub = hub; })}
                    hubViewState={this._hubViewState}
                    hideFullScreenToggle={true}
                    commands={this._getCommandBarItems()}
                    showPivots={true}>
                    <HubHeader
                        breadcrumbItems={this._getHeaderItems()}
                    />
                    <PivotBarItem name={Resources.SecureFileText} itemKey={this._secureFileKey} ariaLabel={Resources.SecureFileText}>
                        {this.getHubContent()}
                    </PivotBarItem>
                </Hub>
            </Fabric>);
    }

    private _getCommandBarItems(): IPivotBarAction[] {
        const isSaveEnabled = this._isSaveEnabled();
        const items: IPivotBarAction[] = [];

        items.push({
            key: this._saveKey,
            name: Resources.SaveText,
            important: true,
            iconProps: { iconName: "Save", iconType: VssIconType.fabric },
            onClick: this._onCommandClick,
            disabled: !isSaveEnabled
        });

        items.push({
            key: this._securityKey,
            name: Resources.Security,
            important: true,
            iconProps: { iconName: "bowtie-shield", iconType: VssIconType.fabric },
            onClick: this._onCommandClick
        });

        items.push({
            key: this._helpKey,
            name: Resources.HelpText,
            important: true,
            iconProps: { iconName: "Unknown", iconType: VssIconType.fabric },
            onClick: this._onCommandClick
        });

        return items;
    }

    private _onCommandClick = (ev: React.MouseEvent<HTMLElement>, item: IContextualMenuItem): void => {
        switch (item.key) {
            case this._saveKey:
                this._saveSecureFile();
                break;

            case this._securityKey:
                Dialogs.Dialogs.showSecurityDialog(LibraryItemType.SecureFile, this.state.secureFileId.toString(), this.state.data.name);
                break;

            case this._helpKey:
                window.open(Constants.Links.SecureFileHelpLink, "_blank");
                break;

            default:
                break;
        }
    }

    private _onLibraryTitleClicked = (ev: React.MouseEvent<HTMLElement>): void => {
        const queryParams = {};
        this._navigateToGivenPathInLibraryHub("", queryParams);
    }

    private _navigateToGivenPathInLibraryHub(action: string, queryParams: any): void {
        const contributionId: string = Constants.ExtensionArea.LibraryHub;

        Events_Action.getService().performAction(Events_Action.CommonActions.ACTION_WINDOW_NAVIGATE, {
            url: DTUtils.UrlHelper.getUrlForExtension(contributionId, action, queryParams)
        });
    }

    private _getHeaderItems(): IHubBreadcrumbItem[] {
        const isSaveEnabled = this._isSaveEnabled();
        const secureFile = this.getState().data;
        const itemText = secureFile.name;
        const isItemDirty = isSaveEnabled;

        const items: IHubBreadcrumbItem[] = [{
            ariaLabel: Resources.LibraryHubTitle,
            text: Resources.LibraryHubTitle,
            key: Constants.LibraryConstants.BreadCrumbLibraryKey,
            onClick: this._onLibraryTitleClicked
        }];

        if (itemText != null) {
            const headerItemText = !!isItemDirty ? Utils_String.format("{0}{1}", itemText, "*") : itemText;
            items.push({
                ariaLabel: headerItemText,
                text: headerItemText,
                key: itemText
            });
        }

        return items;
    }

    public componentDidMount() {
        const state = this.getState();
        state.data = this.getSecureFileDetailsClone();
        state.data = { id: "", description: "", name: " " };
        this._libraryActionCreator.getSecureFile(state.secureFileId);


        this._store.addChangedListener(this.onStoreChange);
        this._propertiesStore.addChangedListener(this.onPropertiesStoreChange);
        this._documentsEntryForDirtyCheck = Events_Document.getRunningDocumentsTable().add("SecureFileView", this);
        this.updateUrl();
        Navigation_Services.getHistoryService().attachNavigate(this.onUrlChange);
        this._eventManager.attachEvent(Constants.LibraryActions.UpdateErrorMessage, this.updateErrorMessage);
        this._eventManager.attachEvent(Constants.LibraryActions.ClearErrorMessage, this.clearErrorMessage);
        this._addSaveShortcutEvent();
        this.setState(state);
        PerfTelemetryManager.instance.endScenario(TelemetryScenarios.SecureFilesEditorLanding);
    }

    public componentWillUnmount() {
        this._store.removeChangedListener(this.onStoreChange);
        this._propertiesStore.removeChangedListener(this.onPropertiesStoreChange);
        Navigation_Services.getHistoryService().detachNavigate(this.onUrlChange);
        Events_Document.getRunningDocumentsTable().remove(this._documentsEntryForDirtyCheck);
        this._eventManager.detachEvent(Constants.LibraryActions.UpdateErrorMessage, this.updateErrorMessage);
        this._eventManager.detachEvent(Constants.LibraryActions.ClearErrorMessage, this.clearErrorMessage);

        StoreManager.DeleteStore<SecureFilePropertiesStore>(SecureFilePropertiesStore);
        StoreManager.DeleteStore<SecureFileStore>(SecureFileStore);
    }

    public computeDirty(): boolean {
        if (this.isSecureFileFetchPending()) {
            return false;
        }

        const originalData: ISecureFileDetails = this._store.getSecureFileDetails();
        const currentData: ISecureFileDetails = this.state.data;

        if (originalData == null || currentData == null) {
            return false;
        }

        if (Utils_String.localeComparer(originalData.name, currentData.name)) {
            return true;
        }

        if (Utils_String.localeComparer(originalData.description, currentData.description)) {
            return true;
        }

        if (this._propertiesStore.isPropertiesListDirty()) {
            return true;
        }

        return false;
    }

    public isSecureFileValid(): boolean {
        if (SecureFileView.validateSecureFileName(this.state.data.name).length > 0) {
            return false;
        }

        if (!this._propertiesStore.isPropertiesListValid()) {
            return false;
        }

        return true;
    }

    public isDirty(): boolean {
        return this.computeDirty();
    }

    protected getState(): State {
        if (this.state == null) {
            return { data: { id: "", name: "", description: "" }, secureFileId: "", path: "", errorMessage: "" };
        }

        return this.state;
    }

    protected onUrlChange = () => {
        const urlState = Navigation_Services.getHistoryService().getCurrentState();
        const state = this.getState();
        state.secureFileId = urlState.secureFileId;
        this.setState(state);
    }

    private getTitleBarProps(): TitleBarProps {
        const isSaveEnabled = this._isSaveEnabled();
        const titleBarProps = {
            itemType: Constants.LibraryConstants.LibraryItemsView_SecureFiles,
            searchBox: null,
            errorMessage: this.state.errorMessage,
            itemText: this.getState().data.name,
            isItemDirty: isSaveEnabled,
            buttons: [
                {
                    template: () => {
                        const buttonProps = {
                            onClick: () => {
                                this._saveSecureFile();
                            },
                            className: "btn-cta"
                        }

                        const saveButtonIconCssClass = "bowtie-icon bowtie-save";
                        const iconCssClass = isSaveEnabled ? saveButtonIconCssClass : saveButtonIconCssClass + " disabled";

                        return <div className={"bowtie"}>
                            <button {...buttonProps} disabled={!isSaveEnabled} aria-disabled={!isSaveEnabled}>
                                <i key={"btn-icon"} className={iconCssClass}></i>
                                <span key={"btn-text"} className="text">{Resources.SaveText}</span>
                            </button>
                        </div>
                    }
                },
                {
                    template: () => {
                        const buttonProps = {
                            className: "lib-button",
                            onClick: () => {
                                Dialogs.Dialogs.showSecurityDialog(LibraryItemType.SecureFile, this.state.secureFileId, this.state.data.name);
                            }
                        }

                        const buttonDisabled = this.isSecureFileFetchPending();

                        return (
                            <button { ...buttonProps } disabled={buttonDisabled} aria-disabled={buttonDisabled}>
                                <i key={"btn-icon"} className={"bowtie-icon bowtie-shield"}></i>
                                <span key={"btn-text"} className="text">{Resources.Security}</span>
                            </button>);
                    }
                },
                {
                    template: () => {
                        const buttonProps = {
                            className: "lib-button",
                            onClick: () => {
                                window.open(Constants.Links.SecureFileHelpLink, "_blank");
                            }
                        }

                        return (
                            <button  { ...buttonProps }>
                                <i key={"btn-icon"} className={"bowtie-icon bowtie-status-help-outline"}></i>
                                <span key={"btn-text"} className="text">{Resources.HelpText}</span>
                            </button>);
                    }
                }
            ] as Preview_Button.Props[]
        };

        return titleBarProps;
    }

    private getHubContent(): JSX.Element {
        var secureFileData = this.state.data;

        // if there is delay/error while fetching secure file
        if (this.isSecureFileFetchPending()) {
            return;
        };

        // edit existing secure file
        return (
            <div className={"lib-item-view"}>
                <div role="region" aria-labelledby="lib-sf-header-details">
                    <h2 id="lib-sf-header-details" className={"lib-item-header"}>{Resources.SecureFileText}</h2>
                    <TextField
                        className={"lib-item-name"}
                        label={Resources.SecureFileNameText}
                        value={secureFileData.name}
                        onChanged={this.handleNameChange}
                        onGetErrorMessage={SecureFileView.validateSecureFileName} />
                </div>
                <br />
                <div role="region" aria-labelledby="lib-sf-header-properties">
                    <div id="lib-sf-header-properties" className={"lib-item-header"}>{Resources.PropertiesTabTitle}</div>
                    <div className={"lib-sf-props-help-text"}>{Resources.SecureFilePropertiesHelpText}</div>
                    <div className="lib-sf-props-view">
                        <SecureFilePropertiesView />
                    </div>
                </div>
            </div>
        );
    }

    private static validateSecureFileName = (value: string): string => {
        return (value === null || value === undefined || value.trim().length === 0) ? Resources.InvalidSecureFileName : '';
    }

    private getSecureFileDetailsClone(): ISecureFileDetails {
        const secureFileDetails = this._store.getSecureFileDetails();
        return { ...secureFileDetails };
    }

    private onStoreChange = () => {
        const state: State = this.getState();
        state.data = this.getSecureFileDetailsClone();
        state.secureFileId = state.data.id;
        state.errorMessage = "";
        this.setState(state);
        this.updateUrl();
    }

    private onPropertiesStoreChange = () => {
        this.setState(this.getState());
    }

    private handleNameChange = (newName: string) => {
        const state: State = this.getState();
        state.data.name = newName;
        this.setState(state);
    }

    private updateUrl() {
        const urlState = Navigation_Services.getHistoryService().getCurrentState();
        if (this.state.data != null && (urlState.secureFileId !== this.state.secureFileId || urlState.path !== this.state.data.name)) {
            urlState.secureFileId = this.state.secureFileId;
            urlState.path = this.state.data.name;
            Navigation_Services.getHistoryService().replaceHistoryPoint(undefined, urlState);
        }
    }

    private updateErrorMessage = (sender: any, error: any) => {
        var state = this.state;
        this.setState({ errorMessage: VSS.getErrorMessage(error) });
    }

    private clearErrorMessage = () => {
        var state = this.state;
        this.setState({ errorMessage: "" });
    }

    private getSecureFile(): SecureFile {
        var sf = new SecureFile();
        sf.id = this.state.data.id;
        sf.name = this.state.data.name;
        sf.properties = this._propertiesStore.getCurrentPropertiesWithAuth();
        return sf;
    }

    private _addSaveShortcutEvent() {
        KeyboardHelper.onWindowCtrlShortcut(Utils_UI.KeyCode.S, Utils_Core.delegate(this, this._saveSecureFile));
    }

    private _saveSecureFile(): void {
        if (this._isSaveEnabled()) {
            var sf = this.getSecureFile();
            this._libraryActionCreator.updateSecureFile(sf);
        }
    }

    private _isSaveEnabled(): boolean {

        if (this.isSecureFileFetchPending()) {
            return false;
        }

        const isDirty = this.computeDirty();
        let isSaveEnabled = this.isSecureFileValid() && isDirty;

        //enable save button on new secure file creation
        if (this.state.data.id === '' && !isDirty) {
            isSaveEnabled = true;
        }

        return isSaveEnabled;
    }

    private isSecureFileFetchPending() {
        return this.state.secureFileId !== this.state.data.id;
    }

    private _store: SecureFileStore;
    private _propertiesStore: SecureFilePropertiesStore;
    private _libraryActionCreator: LibraryActionCreator.LibraryActionCreator;
    private _documentsEntryForDirtyCheck: Events_Document.RunningDocumentsTableEntry;
    private _eventManager: Events_Services.EventService;
    private _hubViewState: IHubViewState;
    private _hub: IHub;

    private readonly _helpKey = "helpKey";
    private readonly _securityKey = "securityKey";
    private readonly _saveKey = "saveKey";
    private readonly _secureFileKey = "variableGroupKey";
}
