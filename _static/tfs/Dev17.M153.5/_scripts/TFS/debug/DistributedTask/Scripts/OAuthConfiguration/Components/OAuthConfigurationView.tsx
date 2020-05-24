/// <reference types="react-dom" />

import React = require("react");
import ReactDOM = require("react-dom");
import * as Component_Base from "VSS/Flux/Component";
import { Control } from "VSS/Controls";
import { IOAuthConfigurationState, OAuthConfigurationStore } from "DistributedTask/Scripts/OAuthConfiguration/Stores/OAuthConfigurationStore";
import { Hub } from "VSSUI/Hub";
import { IHubViewState, HubViewState } from "VSSUI/Utilities/HubViewState";
import { IHubBreadcrumbItem, HubHeader } from "VSSUI/HubHeader";
import { VssIconType } from "VSSUI/VssIcon";
import { showConfirmNavigationDialog } from "VSS/Controls/Dialogs";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { PivotBarItem, IPivotBarAction } from "VSSUI/PivotBar";
import Utils_Url = require("VSS/Utils/Url");
import * as Resources from "DistributedTask/Scripts/Resources/TFS.Resources.DistributedTask";
import { NavigationConstants } from "DistributedTask/Scripts/OAuthConfiguration/Common/OAuthConfigurationConstants";
import * as Navigation_Services from "VSS/Navigation/Services";
import * as Utils_String from "VSS/Utils/String";
import { TextField } from "OfficeFabric/TextField";
import { OAuthConfigurationActionCreator } from "DistributedTask/Scripts/OAuthConfiguration/Actions/OAuthConfigurationActionCreator";
import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import { Dropdown, IDropdownOption } from "OfficeFabric/Dropdown";
import { ServiceEndpointType } from "DistributedTasksCommon/ServiceEndpoints/ServiceEndpoint.Common";
import { PrimaryButton, IButtonProps } from "OfficeFabric/Button";
import * as Contracts from "TFS/ServiceEndpoint/Contracts";
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { OAuthConfigurationActions } from "DistributedTask/Scripts/OAuthConfiguration/Actions/OAuthConfigurationActions";
import { ErrorMessageBar } from "DistributedTask/Scripts/Components/ErrorMessageBar";
import { Dialogs } from "DistributedTask/Scripts/Components/Dialogs";
import { LibraryItemType } from "DistributedTask/Scripts/DT.Types";
import { getRunningDocumentsTable, RunningDocumentsTableEntry, RunningDocument } from "VSS/Events/Document";
import * as Events_Action  from "VSS/Events/Action";
import { UrlHelper } from "DistributedTask/Scripts/DT.Utils";
import { ExtensionArea } from "DistributedTask/Scripts/Constants";
import { OAuthConfigurationHubEvents } from "DistributedTask/Scripts/OAuthConfiguration/Common/OAuthConfigurationConstants";
import "VSS/LoaderPlugins/Css!RM:DistributedTask/Scripts/OAuthConfiguration/Components/OAuthConfigurationView";

export class OAuthConfigurationView extends Component_Base.Component<Component_Base.Props, IOAuthConfigurationState> implements RunningDocument {
    constructor(props?: Component_Base.Props) {
        super(props);
        this._hubViewState = new HubViewState();
        this._store = StoreManager.GetStore<OAuthConfigurationStore>(OAuthConfigurationStore);
        this._oauthConfigurationActionCreator = ActionCreatorManager.GetActionCreator<OAuthConfigurationActionCreator>(OAuthConfigurationActionCreator);
        this._oauthConfigurationActions = ActionsHubManager.GetActionsHub<OAuthConfigurationActions>(OAuthConfigurationActions);
    }

    public componentWillMount() {
        this._store.addChangedListener(this._onStoreChange);
        this._runningDocument = getRunningDocumentsTable().add(NavigationConstants.OAuthConfigurationView, this);
    }

    public componentWillUnmount() {
        this._store.removeChangedListener(this._onStoreChange);
        getRunningDocumentsTable().remove(this._runningDocument);
        super.componentWillUnmount();
    }

    public isDirty(): boolean {
        return this._store.isDirty();
    }

    public render(): JSX.Element {
        let state = this._store.getState();
        return (
                <div>
                    {this._getErrorMessageBar(state)}
                    {state.dataLoaded ? this._getHub(state) : null}
                </div>
        );
    }

    private _getHub(state: IOAuthConfigurationState): JSX.Element {
        return (
            <Hub
                className={"hub-view oauth-configuration-view" + (state.errorMessage && " has-error")}
                hubViewState={this._hubViewState}
                hideFullScreenToggle={true}
                commands={this._getCommandItems(state)} >
                <HubHeader title={this._getTitle(state)}  breadcrumbItems={this._getBreadCrumbItems()} />
                <PivotBarItem
                    name={Resources.OAuthConfigurationWindowTitle}
                    itemKey={NavigationConstants.OAuthConfigurationView}>
                    {this._getHubContent(state)}
                </PivotBarItem>
            </Hub>
        );
    }

    private _getCommandItems(state: IOAuthConfigurationState): IPivotBarAction[] { 
        return !state.oAuthConfiguration.id ? [] : [
            {
                key: "save",
                name: Resources.SaveText,
                important: true,
                iconProps: { iconName: "Save", iconType: VssIconType.fabric },
                onClick: this._onCreateOrUpdate,
                disabled: this._isCreateOrSaveButtonDisabled()
                
            },
            { 
                key: "security",
                name: Resources.Security,
                important: true,
                iconProps: { iconName: "bowtie-shield", iconType: VssIconType.bowtie },
                onClick: this._onSecurityCommandClick
            }
        ];
    }

    private _getTitle(state: IOAuthConfigurationState): string {
        let title = state.oAuthConfiguration.name || Utils_String.empty;
        let dirtyChar = this._store.isDirty() || !title ? "*" : Utils_String.empty;
        return Utils_String.format("{0}{1}", title, dirtyChar);
    }

    private _getBreadCrumbItems(): IHubBreadcrumbItem[] {
        return [{
            ariaLabel: Resources.OAuthConfigurationsHubTitle,
            key: NavigationConstants.OAuthConfigurationListView,
            text: Resources.OAuthConfigurationsHubTitle,
            onClick: this._onOAuthConfigurationsHubTitleClicked
        }];
    }

    private _getHubContent(state: IOAuthConfigurationState): JSX.Element {
        return (
            <div className={"oauth-view-hub-content"}>
                <TextField
                    className={"oauth-input"}
                    label={Resources.OAuthConfigurationsDetailsNameColumn}
                    value={state.oAuthConfiguration.name}
                    maxLength={512}
                    onChanged={this._onNameChanged} />
                <Dropdown
                    className={"oauth-input"}
                    label={Resources.SourceType}
                    selectedKey={state.oAuthConfiguration.endpointType}
                    options={this._convertToDropdownOptions(state.sourceTypes)}
                    onChanged={this._onSourceTypeChanged}
                    disabled={!this._isAddConfigurationView()} />
                {this._getSourceTypeRelatedContent(state)}
                { 
                    this._isAddConfigurationView() &&
                    <PrimaryButton
                        className={"oauth-create-button"}
                        onClick={this._onCreateOrUpdate}
                        disabled={this._isCreateOrSaveButtonDisabled()} >
                        {Resources.Create}
                    </PrimaryButton>
                }
            </div>
        );
    }

    private _getSourceTypeRelatedContent(state: IOAuthConfigurationState): JSX.Element {
                return (
                    <div>
                        <TextField
                            className={"oauth-input"}
                            label={this._getUrlLabel(state)}
                            value={state.oAuthConfiguration.url}
                            onChanged={this._onUrlChanged}
                            disabled={!this._isAddConfigurationView()} />
                        <TextField
                            className={"oauth-input"}
                            label={Resources.ClientId}
                            value={state.oAuthConfiguration.clientId}
                            maxLength={128}
                            onChanged={this._onClientIdChanged}
                            disabled={!this._isAddConfigurationView()} />
                        <TextField
                            className={"oauth-input"}
                            label={Resources.ClientSecret}
                            value={state.oAuthConfiguration.clientSecret}
                            maxLength={128}
                            onChanged={this._onClientSecretChanged}
                            type={"password"} 
                            placeholder={(state.oAuthConfiguration.id && !this._store.isSecretInvalid()) || !this._isAddConfigurationView() ? "********" : Utils_String.empty}
                            errorMessage={state.oAuthConfiguration.id && this._store.isSecretInvalid() && this._isAddConfigurationView() ? Resources.UpdateSecretRequiredText : Utils_String.empty}
                            disabled={!this._isAddConfigurationView()} />
                    </div>
                );
    }

    private _getErrorMessageBar(state: IOAuthConfigurationState): JSX.Element {
        return (<ErrorMessageBar errorMessage={state.errorMessage} />);
    }

    private _onOAuthConfigurationsHubTitleClicked = (e: React.MouseEvent<HTMLElement>): void => {
        if (e.ctrlKey) {
            return;
        } else if (!this._store.isDirty()) {
            e.preventDefault();
            Navigation_Services.getHistoryService().addHistoryPoint(undefined, { view: NavigationConstants.OAuthConfigurationListView }, undefined, false, false);
        } else {
            showConfirmNavigationDialog(Resources.ConfirmNavigation, Resources.UnsavedChanges)
                .then(() => {
                    Navigation_Services.getHistoryService().addHistoryPoint(undefined, { view: NavigationConstants.OAuthConfigurationListView }, undefined, false, false);
                });
        }
    }

    private _onNameChanged = (name: string): void => {
        this._oauthConfigurationActions.updateName.invoke(name);
    }

    private _onSourceTypeChanged = (sourceTypeOption: IDropdownOption): void => {
        this._oauthConfigurationActions.updateSourceType.invoke(sourceTypeOption.key.toString());
    }

    private _onUrlChanged = (url: string): void => {
        this._oauthConfigurationActions.updateUrl.invoke(url);
    }

    private _onClientIdChanged = (clientId: string): void => {
        this._oauthConfigurationActions.updateClientId.invoke(clientId);
    }

    private _onClientSecretChanged = (clientSecret: string): void => {
        this._oauthConfigurationActions.updateClientSecret.invoke(clientSecret);
    }

    private _onCreateOrUpdate = (): void => {
        if (this._isInputValid()) {
            this._oauthConfigurationActionCreator.createorUpdateOAuthConfiguration(this._store.getState().oAuthConfiguration);
        }
    }

    private _isCreateOrSaveButtonDisabled(): boolean {
        return !this._store.isValid() || !this._store.isDirty();
    }

    private _onSecurityCommandClick = (): void => {
        let state = this._store.getState();
        Dialogs.showSecurityDialog(LibraryItemType.OAuthConfiguration, state.oAuthConfiguration.id, state.oAuthConfiguration.name);
    }

    private _convertToDropdownOptions(sourceTypes: Contracts.ServiceEndpointType[]): IDropdownOption[] {
        return sourceTypes.map((sourceType: Contracts.ServiceEndpointType) => {
            return {
                key: sourceType.name,
                text: sourceType.displayName
            } as IDropdownOption;
        });
    }

    private _getUrlLabel(state: IOAuthConfigurationState): string {
        return Utils_String.localeFormat(Resources.ServerUrl, state.sourceTypes.find(sourceType => sourceType.name === state.oAuthConfiguration.endpointType).displayName);
    }

    private _onStoreChange = (): void => {
        this.setState(this._store.getState());
    }

    private _isInputValid(): boolean {
        try {
            let url = Utils_Url.Uri.parse(this._store.getState().oAuthConfiguration.url, { absoluteUriRequired : true});
            return true;
        } catch (err) {
            this._oauthConfigurationActionCreator.fireUpdateErrorMessageEvent(OAuthConfigurationHubEvents.UpdateErrorMessage, Resources.OAuthConfigurationInvalidUrl);
            return false;
        }
    }

    private _isAddConfigurationView(): boolean {
        return !this._store.getState().oAuthConfiguration.id;
    }

    private _oauthConfigurationActionCreator: OAuthConfigurationActionCreator;
    private _oauthConfigurationActions: OAuthConfigurationActions;
    private _store: OAuthConfigurationStore;
    private _hubViewState: IHubViewState;
    private _runningDocument: RunningDocumentsTableEntry;
}