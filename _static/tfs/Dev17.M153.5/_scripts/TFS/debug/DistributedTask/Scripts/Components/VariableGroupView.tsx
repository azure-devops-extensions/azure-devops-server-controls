/// <reference types="react-dom" />

import React = require("react");
import ReactDOM = require("react-dom");
import Component_Base = require("VSS/Flux/Component");
import Components_HubPivotView = require("VSSPreview/Flux/Components/HubPivotView");
import Preview_Button = require("VSSPreview/Flux/Components/Button");

import VSS = require("VSS/VSS");
import * as Async_Dialogs from "VSS/Controls/Dialogs";
import Events_Document = require("VSS/Events/Document");
import Navigation_Services = require("VSS/Navigation/Services");
import Utils_String = require("VSS/Utils/String");
import Utils_Array = require("VSS/Utils/Array");
import Utils_Date = require("VSS/Utils/Date");
import Events_Action = require("VSS/Events/Action");
import Events_Services = require("VSS/Events/Services");
import Utils_UI = require("VSS/Utils/UI");
import Utils_Core = require("VSS/Utils/Core");

import Constants = require("DistributedTask/Scripts/Constants");
import Dialogs = require("DistributedTask/Scripts/Components/Dialogs");
import DTUtils = require("DistributedTask/Scripts/DT.Utils");
import Resources = require("DistributedTask/Scripts/Resources/TFS.Resources.DistributedTask");
import LibraryActionCreator = require("DistributedTask/Scripts/Actions/LibraryActionCreator");

import { LibraryItemType } from "DistributedTask/Scripts/DT.Types";
import { Breadcrumb, IBreadcrumbItem } from "OfficeFabric/Breadcrumb";
import { CommandButton } from "OfficeFabric/components/Button/CommandButton/CommandButton";
import { ErrorMessageBar } from "DistributedTask/Scripts/Components/ErrorMessageBar";
import { Fabric } from "OfficeFabric/Fabric";
import { TextField } from "OfficeFabric/TextField";
import { Toggle } from "OfficeFabric/Toggle";
import { IContextualMenuItem } from "OfficeFabric/ContextualMenu";
import { Component as InfoButton } from "DistributedTaskControls/Components/InfoButton";
import { ICalloutContentProps } from "DistributedTaskControls/Components/CalloutComponent";
import { TitleBar, Props as TitleBarProps } from "DistributedTask/Scripts/Components/TitleBar";
import { KeyVaultVariableGroupView } from "DistributedTask/Scripts/Components/KeyVaultVariableGroupView";
import { VariableGroupStore, IVariableGroupDetails } from "DistributedTask/Scripts/Stores/VariableGroupStore";
import { KeyboardHelper } from "DistributedTask/Scripts/DT.Utils";
import { VariableGroup, Variable, VariableGroupType } from "DistributedTask/Scripts/DT.VariableGroup.Model";
import { AzureKeyVaultVariableGroupProviderData } from "TFS/DistributedTask/Contracts"
import { KeyVaultVariableGroupStore } from "DistributedTask/Scripts/Stores/KeyVaultVariableGroupStore";
import { KeyCode } from "VSS/Utils/UI";

import { ProcessVariablesV2ControllerView } from "DistributedTaskControls/Variables/ProcessVariablesV2/ControllerView";
import { IProcessVariablesOptions } from "DistributedTaskControls/Variables/Common/Types";
import { FeatureFlag_ResourceAuthForVGEndpoint } from "DistributedTaskControls/Common/Common";
import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";

import { ProcessVariablesV2Store } from "DistributedTaskControls/Variables/ProcessVariablesV2/DataStore";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";

import { Hub, IHub } from "VSSUI/Hub";
import { IHubBreadcrumbItem, HubHeader } from "VSSUI/HubHeader";
import { PivotBarItem, IPivotBarAction } from "VSSUI/PivotBar";
import { IHubViewState, HubViewState } from "VSSUI/Utilities/HubViewState";
import { VssIconType, VssIcon, IVssIconProps } from "VSSUI/VssIcon";
import { PerfTelemetryManager, TelemetryScenarios } from "DistributedTask/Scripts/Utils/TelemetryUtils";
import { MessageBar, MessageBarType } from "OfficeFabric/MessageBar";
import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";

import { VariableGroupPolicyView } from "DistributedTask/Scripts/Components/VariableGroupPolicyView";
import { VariableGroupPolicyStore } from "DistributedTask/Scripts/Stores/VariableGroupPolicyStore";
import { VariableGroupPolicyActionCreator, IAuthorizedVariableGroupData } from "DistributedTask/Scripts/Actions/VariableGroupPolicyActions";

export interface State extends Component_Base.State {
    data: IVariableGroupDetails;
    variableGroupId: number;
    errorMessage: string;
}

export class VariableGroupView extends Component_Base.Component<Component_Base.Props, State> implements Events_Document.RunningDocument {
    constructor(props: Component_Base.Props) {
        super(props);

        PerfTelemetryManager.initialize();
        PerfTelemetryManager.instance.startTTIScenarioOrNormalScenario(TelemetryScenarios.VariableGroupEditorLanding);
        this._isResourceAuthorizationFeatureEnabled = FeatureAvailabilityService.isFeatureEnabled(FeatureFlag_ResourceAuthForVGEndpoint);

        this._hubViewState = new HubViewState();
        this._store = StoreManager.GetStore<VariableGroupStore>(VariableGroupStore);
        this._variableListStore = this._store.getVariableListStore();
        this._keyVaultVariableListStore = this._store.getKeyVaultVariableGroupStore();
        if (this._isResourceAuthorizationFeatureEnabled) {
            this._variableGroupPolicyStore = this._store.getVariableGroupPolicyStore();
            this._actionCreator = ActionCreatorManager.GetActionCreator<VariableGroupPolicyActionCreator>(VariableGroupPolicyActionCreator);
        }
        this._libraryActionCreator = LibraryActionCreator.LibraryActionCreator.getInstance();
        this._actionCreator = ActionCreatorManager.GetActionCreator<VariableGroupPolicyActionCreator>(VariableGroupPolicyActionCreator);
        this.state = this.getState();

        let urlState = Navigation_Services.getHistoryService().getCurrentState();
        (this.state as State).variableGroupId = Number(urlState.variableGroupId);
        (this.state as State).data = this.getVariableGroupDetailsClone();
        this._eventManager = Events_Services.getService();
    }

    public render(): JSX.Element {
        return (
            <Fabric>
                {this._getErrorMessageBar()}
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
                    <PivotBarItem name={Resources.VariableGroupText} itemKey={this._variableGroupKey} ariaLabel={Resources.VariableGroupText} iconProps={this._getPivotIcon()}>
                        {this.getHubContent()}
                    </PivotBarItem>
                </Hub>
            </Fabric>);
    }

    public componentWillMount() {
        let state = this.getState();
        state.data = this.getVariableGroupDetailsClone();
        if (state.variableGroupId !== 0) {
            // in case variable group view is loaded directly then till the time we fetch variable group data, adding a empty variable group so that UI can get loaded
            state.data = { id: 0, description: "", name: " ", isKeyVaultVariableGroup: false };

            this._libraryActionCreator.getVariableGroup(state.variableGroupId);
        }

        this._store.addChangedListener(this.onStoreChange);
        this._variableListStore.addChangedListener(this.onVariableListStoreChange);
        if (this._isResourceAuthorizationFeatureEnabled) {
            this._variableGroupPolicyStore.addChangedListener(this.onVariableGroupPolicyStoreChange);
        }
        this._keyVaultVariableListStore.addChangedListener(this.onVariableListStoreChange);
        this._documentsEntryForDirtyCheck = Events_Document.getRunningDocumentsTable().add("VariableGroupView", this);
        this.updateUrl();
        Navigation_Services.getHistoryService().attachNavigate(this.onUrlChange);
        this._eventManager.attachEvent(Constants.LibraryActions.UpdateErrorMessage, this.updateErrorMessage);
        this._eventManager.attachEvent(Constants.LibraryActions.ClearErrorMessage, this.clearErrorMessage);
        this._addSaveShortcutEvent();
        this.setState(state);
    }

    public componentDidMount() {
        if (this.refs && this.refs[this._vgNameRef]) {
            (this.refs[this._vgNameRef] as any).focus();
        }
        if (this._isResourceAuthorizationFeatureEnabled && this.state.variableGroupId !== 0) {
            this._actionCreator.loadVariableGroupPolicyData(this.state.variableGroupId.toString());
        }
        PerfTelemetryManager.instance.endScenario(TelemetryScenarios.VariableGroupEditorLanding);
    }

    public componentWillUnmount() {
        this._store.removeChangedListener(this.onStoreChange);
        if (this._isResourceAuthorizationFeatureEnabled) {
            this._variableGroupPolicyStore.removeChangedListener(this.onVariableGroupPolicyStoreChange);
        }
        this._variableListStore.removeChangedListener(this.onVariableListStoreChange);
        this._keyVaultVariableListStore.removeChangedListener(this.onVariableListStoreChange);
        Navigation_Services.getHistoryService().detachNavigate(this.onUrlChange);
        Events_Document.getRunningDocumentsTable().remove(this._documentsEntryForDirtyCheck);
        this._eventManager.detachEvent(Constants.LibraryActions.UpdateErrorMessage, this.updateErrorMessage);
        this._eventManager.detachEvent(Constants.LibraryActions.ClearErrorMessage, this.clearErrorMessage);

        StoreManager.DeleteStore<VariableGroupStore>(VariableGroupStore);
    }

    public computeDirty(): boolean {
        if (this.isVariableGroupFetchPending()) {
            return false;
        }

        let originalData: IVariableGroupDetails = this._store.getVariableGroupDetails();
        let currentData: IVariableGroupDetails = this.state.data;

        if (originalData == null || currentData == null) {
            return false;
        }

        if (Utils_String.localeComparer(originalData.name, currentData.name)) {
            return true;
        }

        if (Utils_String.localeComparer(originalData.description, currentData.description)) {
            return true;
        }

        if (this.isVariableGroupTypeChanged()) {
            return true;
        }

        if (this.isKeyVaultVariableGroupSelected()) {
            if (this._store.isKeyVaultVariableGroupDirty()) {
                return true;
            }
        } else {
            if (this._store.isVariableListDirty()) {
                return true;
            }
        }

        return false;
    }

    public isVariableGroupValid(): boolean {
        if (VariableGroupView.validateVariableGroupName(this.state.data.name).length > 0) {
            return false;
        }

        if (this.isKeyVaultVariableGroupSelected()) {
            if (!this._store.isKeyVaultVariableGroupValid()) {
                return false;
            }
        }
        else {
            if (!this._store.isVariableListValid()) {
                return false;
            }
        }

        return true;
    }

    public isDirty(): boolean {
        return this.computeDirty();
    }

    protected getState(): State {
        if (this.state == null) {
            return { data: {id: 0, name:"", description: "", isKeyVaultVariableGroup: false } , variableGroupId: 0, path: "", errorMessage: "" };
        }

        return this.state;
    }

    protected onUrlChange = () => {
        let urlState = Navigation_Services.getHistoryService().getCurrentState();
        let state = this.getState();
        state.variableGroupId = Number(urlState.variableGroupId);
        this.setState(state);
    }

    private getTitleBarProps(): TitleBarProps {
        let isSaveEnabled = this._isSaveEnabled();
        let titleBarProps = {
            searchBox: null,
            errorMessage: this.state.errorMessage,
            itemText: this.getState().data.name,
            isItemDirty: isSaveEnabled,
            buttons: [
                {
                    template: () => {
                        let buttonProps = {
                            onClick: () => {
                                this._saveVariableGroup();
                            },
                            className: "btn-cta"
                        }

                        let saveButtonIconCssClass = "bowtie-icon bowtie-save";
                        let iconCssClass = isSaveEnabled ? saveButtonIconCssClass : saveButtonIconCssClass + " disabled";

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
                        let buttonProps = {
                            className: "lib-button",
                            onClick: () => {
                                Dialogs.Dialogs.showSecurityDialog(LibraryItemType.VariableGroup, this.state.variableGroupId.toString(), this.state.data.name);
                            }
                        }

                        let buttonDisabled = this.isVariableGroupFetchPending();

                        return (
                            <button { ...buttonProps } disabled={buttonDisabled} aria-disabled={buttonDisabled}>
                                <i key={"btn-icon"} className={"bowtie-icon bowtie-shield"}></i>
                                <span key={"btn-text"} className="text">{Resources.Security}</span>
                            </button>);
                    }
                },
                {
                    template: () => {
                        let buttonProps = {
                            className: "lib-button",
                            onClick: () => {
                                window.open(Constants.Links.VariableGroupHelpLink, "_blank");
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

    private _onLibraryTitleClicked = (ev: React.MouseEvent<HTMLElement>): void => {
        let queryParams = {};
        this._navigateToGivenPathInLibraryHub("", queryParams);
    }

    private _navigateToGivenPathInLibraryHub(action: string, queryParams: any): void {
        let contributionId: string = Constants.ExtensionArea.LibraryHub;

        Events_Action.getService().performAction(Events_Action.CommonActions.ACTION_WINDOW_NAVIGATE, {
            url: DTUtils.UrlHelper.getUrlForExtension(contributionId, action, queryParams)
        });
    }

    private _getErrorMessageBar(): JSX.Element {
        let errorMessageBar = null;

        if (!!this.state.errorMessage) {
            /* tslint:disable:react-no-dangerous-html */
            errorMessageBar = (<div className="lib-title-error">
                <MessageBar messageBarType={MessageBarType.error} isMultiline={false} truncated={true} onDismiss={() => { Events_Services.getService().fire(Constants.LibraryActions.ClearErrorMessage); }}>
                    <span dangerouslySetInnerHTML={this._renderHtml(this.state.errorMessage)} />
                </MessageBar>
            </div>);
            /* tslint:enable:react-no-dangerous-html */
        }

        return errorMessageBar;
    }

    private _renderHtml(html: string) {
        return {
            __html: html
        };
    }

    private _getHeaderItems(): IHubBreadcrumbItem[] {
        let isSaveEnabled = this._isSaveEnabled();
        let variableGroup = this.getState().data;
        let itemText = variableGroup.name;
        let isItemDirty = isSaveEnabled;

        let items: IHubBreadcrumbItem[] = [{
            ariaLabel: Resources.LibraryHubTitle,
            text: Resources.LibraryHubTitle,
            key: Constants.LibraryConstants.BreadCrumbLibraryKey,
            onClick: this._onLibraryTitleClicked
        }];

        if (itemText != null) {
            let variableGroupIconName = this.isKeyVaultVariableGroupSelected() ? "bowtie-azure-key-vault" : "bowtie-variable-group";
            let headerItemText = isItemDirty != null && isItemDirty && itemText != null ? Utils_String.format("{0}{1}", itemText, "*") : itemText;
            items.push({
                ariaLabel: headerItemText,
                text: headerItemText,
                key: itemText,
                leftIconProps: {
                    iconType: VssIconType.bowtie,
                    iconName: variableGroupIconName
                }
            });
        }

        return items;
    }

    private _getCommandBarItems(): IPivotBarAction[] {
        let isSaveEnabled = this._isSaveEnabled();
        let items: IPivotBarAction[] = [];

        items.push({
            key: this._saveKey,
            name: Resources.SaveText,
            important: true,
            iconProps: { iconName: "Save", iconType: VssIconType.fabric },
            onClick: this._onSaveClick,
            disabled: !isSaveEnabled
        });

        items.push({
            key: this._cloneKey,
            name: Resources.CloneText,
            important: true,
            iconProps: { iconName: "bowtie-edit-copy", iconType: VssIconType.bowtie },
            onClick: this._onCloneClick,
            disabled: this.isCloneDisabled()
        });

        items.push({
            key: this._securityKey,
            name: Resources.Security,
            important: true,
            iconProps: { iconName: "bowtie-shield", iconType: VssIconType.fabric },
            onClick: this._onSecurityClick
        });

        items.push({
            key: this._helpKey,
            name: Resources.HelpText,
            important: true,
            iconProps: { iconName: "Unknown", iconType: VssIconType.fabric },
            onClick: this._onHelpClick
        });

        return items;
    }

    private _onSaveClick = (ev: React.MouseEvent<HTMLElement>): void => {
        this._saveVariableGroup();
    }

    private _onCloneClick = (ev: React.MouseEvent<HTMLElement>): void => {
        this._libraryActionCreator.cloneVariableGroup(this.state.variableGroupId);
    }

    private _onSecurityClick = (ev: React.MouseEvent<HTMLElement>): void => {
        Dialogs.Dialogs.showSecurityDialog(LibraryItemType.VariableGroup, this.state.variableGroupId.toString(), this.state.data.name);
    }

    private _onHelpClick = (ev: React.MouseEvent<HTMLElement>): void => {
        window.open(Constants.Links.VariableGroupHelpLink, "_blank");
    }

    private isCloneDisabled(): boolean {
        return (this.state.variableGroupId === 0 || this.isDirty() || (this._isResourceAuthorizationFeatureEnabled && this._store.isVariableGroupPolicyStoreDirty()));
    }

    private _getPivotIcon(): IVssIconProps {
        let isInErrorState = !this.isVariableGroupFetchPending() && !this.isVariableGroupValid();
        let icon: IVssIconProps = isInErrorState ? {
            iconType: VssIconType.bowtie,
            iconName: "bowtie-status-error-outline"
        } : undefined;

        return icon;
    }

    private getHubContent(): JSX.Element {
        var variableGroupData = this.state.data;

        // if there is delay/error while fetching variable group
        if (this.isVariableGroupFetchPending()) {
            return;
        };

        return (
            <div className={"lib-item-view"}>
                <div role="region" aria-labelledby="lib-vg-header-properties">
                    <h2 id="lib-vg-header-properties" className={"lib-item-header"}>{Resources.PropertiesTabTitle}</h2>

                    <TextField
                        className={"lib-item-name"}
                        ref={this._vgNameRef}
                        label={Resources.VariableGroupNameText}
                        value={variableGroupData.name}
                        onChanged={this.handleNameChange}
                        onGetErrorMessage={VariableGroupView.validateVariableGroupName} />

                    <TextField
                        className={"lib-item-desc"}
                        label={Resources.DescriptionText}
                        multiline
                        resizable={true}
                        value={variableGroupData.description}
                        onChanged={this.handleDescriptionChange} />
                </div>
                <br />
                {this.getVariablesViewControl()}
            </div>
        );
    }

    private getVariablesViewControl(): JSX.Element {
        let options: IProcessVariablesOptions = { settableAtQueueTime: false, supportScopes: false, supportGridView: false };

        return (
            <div>
                <div role="region" className={"lib-vg-settings"}>
                    {this.getVariablesPolicyViewControl()}
                    <div className={"lib-vg-toggleicon"}>
                        <Toggle className="lib-vg-toggle"
                            onChanged={this.onAdvancedSettingsOptionChanged}
                            checked={this.isKeyVaultVariableGroupSelected()}
                            onAriaLabel={Resources.LinkSecretsUsingAzureKeyVaultLabelText}
                            onText={Resources.LinkSecretsUsingAzureKeyVaultLabelText}
                            offText={Resources.LinkSecretsUsingAzureKeyVaultLabelText} />
                        <InfoButton
                            cssClass="lib-vg-azkv-help"
                            iconStyle="lib-vg-azkv-help-icon"
                            isIconFocusable={true}
                            calloutContent={{
                                calloutDescription: Resources.AzureKeyVaultInfoText,
                                calloutLink: Constants.Links.VariableGroupHelpLink,
                                calloutLinkText: Resources.LearnMoreText
                            } as ICalloutContentProps} />
                    </div>
                </div>
                <div role="region" aria-labelledby="lib-vg-header-variables">
                    {this.getVariablesControl()}
                </div>
            </div>
        );
    }

    private getVariablesPolicyViewControl(): JSX.Element {
        if (this._isResourceAuthorizationFeatureEnabled) {
            return (<VariableGroupPolicyView
                variableGroupId={this.state.variableGroupId.toString()}
            />);
        }
        else
            return null;
    }

    private getVariablesControl(): JSX.Element {
        let options: IProcessVariablesOptions = { settableAtQueueTime: false, supportScopes: false, supportGridView: false };

        if (this.isKeyVaultVariableGroupSelected()) {
            return (<KeyVaultVariableGroupView />);
        }
        else {
            return (
                <div>
                    <h2 id="lib-vg-header-variables" className={"lib-vg-header"}>{Resources.VariablesText}</h2>
                    <div className="lib-vg-vars-view">
                        <ProcessVariablesV2ControllerView options={options} />
                    </div>
                </div>
            );
        }
    }

    private isKeyVaultVariableGroupSelected(): boolean {
        if (!!this._selectedVariableGroupTypeKey) {
            return Utils_String.equals(this._selectedVariableGroupTypeKey, this.keyVaultVariablesKey, true);
        }

        return this.state.data.isKeyVaultVariableGroup;
    }

    private static validateVariableGroupName = (value: string): string => {
        return (value === null || value === undefined || value.trim().length === 0) ? Resources.InvalidVariableGroupName : '';
    }

    private getVariableGroupDetailsClone(): IVariableGroupDetails {
        let variableGroupDetails = this._store.getVariableGroupDetails();
        return { ...variableGroupDetails };
    }

    private onStoreChange = () => {
        let state: State = this.getState();
        state.data = this.getVariableGroupDetailsClone();
        state.variableGroupId = state.data.id;
        state.errorMessage = "";
        this.setState(state);
        this.updateUrl();
    }

    private onVariableListStoreChange = () => {
        this.setState(this.getState());
    }

    private onVariableGroupPolicyStoreChange = () => {
        this.setState(this.getState());
    }

    private onAdvancedSettingsOptionChanged = (isKeyVaultVariableGroupType: boolean): void => {
        if (isKeyVaultVariableGroupType) {
            if (this._variableListStore.getVariableList().length > 0) {
                this.showVariableGroupTypeChangeConfirmationDialog(this.keyVaultVariablesKey);
            }
            else {
                this.updateVariableGroupType(this.keyVaultVariablesKey);
            }
        }
        else {
            if (this._keyVaultVariableListStore.hasData()) {
                this.showVariableGroupTypeChangeConfirmationDialog(this.customVariablesKey);
            }
            else {
                this.updateVariableGroupType(this.customVariablesKey);
            }
        }
    }

    private updateVariableGroupType(selectedVariableGroupTypeKey: string): void {
        this._selectedVariableGroupTypeKey = selectedVariableGroupTypeKey;

        let state: State = this.getState();
        this.setState(state);
    }

    private showVariableGroupTypeChangeConfirmationDialog(selectedVariableGroupTypeKey: string): void {
        var message = Resources.ChangingVariableGroupToKeyVaultMessage;
        var height = "150px";
        if (this.isKeyVaultVariableGroupSelected()) {
            message = Resources.ChangingVariableGroupToCustomMessage;
            height = "180px";
        }

        VSS.using(["VSS/Controls/Dialogs"], (Dialogs: typeof Async_Dialogs) => {
            Dialogs.Dialog.show(Dialogs.ConfirmationDialog, {
                title: Resources.ChangingVariableGroupTypeTitle,
                contentText: message,
                resizeable: false,
                height: height,
                okText: Resources.ConfirmText,
                okCallback: () => {
                    this.updateVariableGroupType(selectedVariableGroupTypeKey);
                },
                cancelCallback: () => {
                    this.updateVariableGroupType(this._selectedVariableGroupTypeKey);
                }
            }).setDialogResult(true);
        });
    }

    private handleNameChange = (newName: string) => {
        let state: State = this.getState();
        state.data.name = newName;
        this.setState(state);
    }

    private handleDescriptionChange = (newDescription: string) => {
        let state: State = this.getState();
        state.data.description = newDescription;
        this.setState(state);
    }

    private updateUrl() {
        let urlState = Navigation_Services.getHistoryService().getCurrentState();
        if (this.state.data != null && (Number(urlState.variableGroupId) !== this.state.variableGroupId || urlState.path !== this.state.data.name)) {
            urlState.variableGroupId = this.state.variableGroupId;
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

    private getVariableGroup(): VariableGroup {
        var vg = new VariableGroup();
        vg.id = this.state.data.id;
        vg.name = this.state.data.name;
        vg.description = this.state.data.description;

        if (this.isKeyVaultVariableGroupSelected()) {
            vg.type = VariableGroupType.AzureKeyVault;

            var keyVaultVariableGroupDetails = this._store.getKeyVaultVariableGroupDetails();
            var keyVaultVariables = [];

            if (!!keyVaultVariableGroupDetails
                && !!keyVaultVariableGroupDetails.serviceEndpointId
                && !!keyVaultVariableGroupDetails.vault
                && !!keyVaultVariableGroupDetails.lastRefreshedOn) {

                var keyVaultProviderData: AzureKeyVaultVariableGroupProviderData = {
                    serviceEndpointId: keyVaultVariableGroupDetails.serviceEndpointId,
                    vault: keyVaultVariableGroupDetails.vault,
                    lastRefreshedOn: keyVaultVariableGroupDetails.lastRefreshedOn
                };

                vg.providerData = keyVaultProviderData;
                vg.variables = Utils_Array.clone(keyVaultVariableGroupDetails.secrets);
            }
            else {
                vg.providerData = null;
                vg.variables = [];
            }
        } else {
            vg.type = VariableGroupType.Vsts;
            vg.providerData = null;
            vg.variables = this._store.getVariableList();
        }

        return vg;
    }

    private _addSaveShortcutEvent() {
        KeyboardHelper.onWindowCtrlShortcut(Utils_UI.KeyCode.S, Utils_Core.delegate(this, this._saveVariableGroup));
    }

    private _isSaveVariableGroupEnabled(): boolean {

        if (this.isVariableGroupFetchPending()) {
            return false;
        }

        let isDirty = this.computeDirty();
        let isValid = this.isVariableGroupValid();
        let _isSaveVariableGroupEnabled = isValid && isDirty;
        //enable save button on new variable group creation 
        if (this.state.data.id === 0 && !isDirty && isValid) {
            _isSaveVariableGroupEnabled = true;
        }
        return _isSaveVariableGroupEnabled;
    }

    private _saveVariableGroup(): void {
        if (this._isSaveEnabled()) {
            let addAuthorization: boolean = false;
            if (this._isResourceAuthorizationFeatureEnabled) {
                // Pass the value of the toggle  i.e checked or unchecked during creation for default authorization. If the value is checked the VariableGropPolicystore will not be dirty and id will be 0 at this point
                addAuthorization = (this.state.data.id == 0) && (this._variableGroupPolicyStore.getState().isAccessOnAllPipelines);
            }
            if (this._isSaveVariableGroupEnabled()) {
                this._libraryActionCreator.createOrUpdateVariableGroup(this.getVariableGroup(), addAuthorization);
            }
            if (this._isResourceAuthorizationFeatureEnabled && this._store.isVariableGroupPolicyStoreDirty() && !(this.state.data.id == 0)) {
                this._actionCreator.authorizeVariableGroup(this.state.variableGroupId.toString(), this.state.data.name, this._variableGroupPolicyStore.getState().isAccessOnAllPipelines);
            }
        }
    }

    private _isSaveEnabled(): boolean {

        let isSaveEnabled = this._isSaveVariableGroupEnabled();
        if (this._isResourceAuthorizationFeatureEnabled) {
            isSaveEnabled = isSaveEnabled || this._store.isVariableGroupPolicyStoreDirty();
        }
        return isSaveEnabled;
    }

    private isVariableGroupFetchPending() {
        return this.state.variableGroupId != this.state.data.id;
    }

    private isVariableGroupTypeChanged(): boolean {
        if (!this._selectedVariableGroupTypeKey) {
            return false;
        }

        let originalTypeKey = this.state.data.isKeyVaultVariableGroup ? this.keyVaultVariablesKey : this.customVariablesKey;
        return !Utils_String.equals(this._selectedVariableGroupTypeKey, originalTypeKey, true);
    }

    private _vgNameRef: string = "vg_name_ref";
    private customVariablesKey = "customVariables";
    private keyVaultVariablesKey = "keyVaultVariables";
    private _selectedVariableGroupTypeKey: string;
    private _store: VariableGroupStore;
    private _variableListStore: ProcessVariablesV2Store;
    private _keyVaultVariableListStore: KeyVaultVariableGroupStore;
    private _variableGroupPolicyStore: VariableGroupPolicyStore;
    private _libraryActionCreator: LibraryActionCreator.LibraryActionCreator;
    private _actionCreator: VariableGroupPolicyActionCreator;
    private _documentsEntryForDirtyCheck: Events_Document.RunningDocumentsTableEntry;
    private _eventManager: Events_Services.EventService;
    private _hubViewState: IHubViewState;
    private _hub: IHub;

    private readonly _helpKey = "helpKey";
    private readonly _securityKey = "securityKey";
    private readonly _saveKey = "saveKey";
    private readonly _cloneKey = "cloneKey";
    private readonly _variableGroupKey = "variableGroupKey";
    private _isResourceAuthorizationFeatureEnabled: boolean;
}
