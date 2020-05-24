/// <reference types="react" />

import * as React from "react";

import { RepositoryTypes } from "Build.Common/Scripts/Generated/TFS.Build2.Common";

import { ScmUtils } from "CIWorkflow/Scripts/Common/ScmUtils";
import * as Resources from "CIWorkflow/Scripts/Resources/TFS.Resources.CIWorkflow";
import { SourcesSelectionActionsCreator } from "CIWorkflow/Scripts/Scenarios/Definition/Actions/SourcesSelectionActionsCreator";
import { VersionControlActionsCreator } from "CIWorkflow/Scripts/Scenarios/Definition/Actions/VersionControlActionsCreator";
import { StoreChangedEvents } from "CIWorkflow/Scripts/Scenarios/Definition/Common";
import { SourceProvider, SourceProviderUtils } from "CIWorkflow/Scripts/Scenarios/Definition/SourceProvider";
import { ISourceTabItemProps } from "CIWorkflow/Scripts/Scenarios/Definition/ControllerViews/GetSourcesControllerView";
import { VersionControlProperties } from "CIWorkflow/Scripts/Scenarios/Definition/Sources/VersionControlInterfaces";
import { ExternalVersionControlStoreBase, IExternalVersionControlBaseState } from "CIWorkflow/Scripts/Scenarios/Definition/Stores/ExternalVersionControlStoreBase";
import { SourceProvidersStore } from "CIWorkflow/Scripts/Scenarios/Definition/Stores/SourceProvidersStore";
import { IVersionControlState, VersionControlStore } from "CIWorkflow/Scripts/Scenarios/Definition/Stores/VersionControlStore";
import { VersionControlStoreBase } from "CIWorkflow/Scripts/Scenarios/Definition/Stores/VersionControlStoreBase";

import { INewConnectionStatus } from "DistributedTaskControls/Actions/ConnectedServiceEndpointActions";
import { ConnectedServiceActionsCreator } from "DistributedTaskControls/Actions/ConnectedServiceEndpointActionsCreator";
import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import { EndpointAuthorizationSchemes } from "DistributedTaskControls/Common/Common";
import * as Base from "DistributedTaskControls/Common/Components/Base";
import { Boolean } from "DistributedTaskControls/Common/Primitives";
import { IDialogInputs } from "DistributedTaskControls/Components/AddNewEndpoint";
import { Component as DropdownButton } from "DistributedTaskControls/Components/DropdownButton";
import { SafeLink } from "DistributedTaskControls/Components/SafeLink";
import { ConnectedServiceStore } from "DistributedTaskControls/Stores/ConnectedServiceStore";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";

import { IContextualMenuItem } from "OfficeFabric/components/ContextualMenu/ContextualMenu.types";

import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";

import { ServiceEndpoint } from "TFS/ServiceEndpoint/Contracts";

import * as Utils_Core from "VSS/Utils/Core";
import * as Utils_String from "VSS/Utils/String";

// Import common styles
import "VSS/LoaderPlugins/Css!CIWorkflow/Scripts/Scenarios/Definition/ControllerViews/GitServiceTabItem";

export class Component extends Base.Component<ISourceTabItemProps, IExternalVersionControlBaseState> {
    private _sourcesActionCreator: SourcesSelectionActionsCreator;
    private _connectedServiceEndpointActionsCreator: ConnectedServiceActionsCreator;
    private _versionControlActionsCreator: VersionControlActionsCreator;
    private _store: ExternalVersionControlStoreBase;
    private _sourceProvidersStore: SourceProvidersStore;
    private _versionControlStore: VersionControlStore;
    private static _newConnectionDropdownId: string = "new-connection";

    constructor(props: ISourceTabItemProps) {
        super(props);

        this._connectedServiceEndpointActionsCreator = ActionCreatorManager.GetActionCreator<ConnectedServiceActionsCreator>(ConnectedServiceActionsCreator);
        this._sourcesActionCreator = ActionCreatorManager.GetActionCreator<SourcesSelectionActionsCreator>(SourcesSelectionActionsCreator);
        this._versionControlActionsCreator = ActionCreatorManager.GetActionCreator<VersionControlActionsCreator>(VersionControlActionsCreator);
    }

    // This exists to allow tests to update the state when needed
    public forceUpdateState() {
        this._updateState();
    }

    public render(): JSX.Element {
        return (
            <div className="ci-github-tab-item">
                {
                    this._createAddConnectionSection()
                }
                {
                    < div className="ci-versioncontrol-connection-dialog">
                        {this._createConnectionDialog()}
                    </div>
                }
                {
                    (this.state.connections && this.state.connections.length > 0) ?
                        <div className="connection-details">
                            <i className="connection-available-icon bowtie-icon bowtie-check-light" />
                            {this._getAuthorizedStatusElement()}
                            {this.state.hideConnectionDropdown || this._getServiceEndPointsDropdown()}
                        </div>
                        : null
                }

            </div>
        );
    }

    public componentWillMount(): void {
        this._sourceProvidersStore = StoreManager.GetStore<SourceProvidersStore>(SourceProvidersStore);
        this._store = this._getStore();
        this._versionControlStore = StoreManager.GetStore<VersionControlStore>(VersionControlStore);

        // When we switch tabs, the component is mounted again. In that case,
        // we should be using the state saved in the store. Otherwise, we
        // should just let the UI initialize based on the current project.
        const state: IExternalVersionControlBaseState = this._getStateFromStore();
        this.setState(state);
        // Initialize the ConnectedServiceStore for our endpoint type
        StoreManager.GetStore<ConnectedServiceStore>(ConnectedServiceStore, state.endpointType);

        if (this._store) {
            // TFVC, TFGit, ExternalGit, and Subversion have their own stores
            this._store.addChangedListener(this._onChange);
            this._store.addListener(StoreChangedEvents.RemoteVersionControlDataUpdatedEvent, this._onRemoteDataUpdated);
            this._store.addListener(StoreChangedEvents.VersionControlServerErrorEvent, this._onErrorHandler);
        }
        else {
            // GitHub, GHE, Bitbucket use the VCStore
            this._versionControlStore.addChangedListener(this._onChange);
        }
    }

    public componentWillUnmount(): void {
        if (this._store) {
            // TFVC, TFGit, ExternalGit, and Subversion have their own stores
            this._store.removeChangedListener(this._onChange);
            this._store.removeListener(StoreChangedEvents.RemoteVersionControlDataUpdatedEvent, this._onRemoteDataUpdated);
            this._store.removeListener(StoreChangedEvents.VersionControlServerErrorEvent, this._onErrorHandler);
        }
        else {
            // GitHub, GHE, Bitbucket use the VCStore
            this._versionControlStore.removeChangedListener(this._onChange);
        }
    }

    private _getStore(): ExternalVersionControlStoreBase {
        const provider: SourceProvider = this._sourceProvidersStore.getProvider(this.props.id);
        const store: VersionControlStoreBase = provider && provider.getStore();
        if (store instanceof ExternalVersionControlStoreBase) {
            return store as ExternalVersionControlStoreBase;
        }
        return null;
    }

    private _createAddConnectionSection(): JSX.Element {
        if (!this.state.showAddConnection) {
            return null;
        }

        const provider = SourceProviderUtils.getComponentProvider(this.props.id);
        const element: JSX.Element = provider.getAddConnectionSection(
            this.state.newConnectionName,
            this.state.endpointType,
            this.state.connections && !!this.state.connections.length,
            this._onAddNewConnectionClick,
            this._onDismissAddConnectionSection);
        return element;
    }

    private _createConnectionDialog(): JSX.Element {
        const provider = SourceProviderUtils.getComponentProvider(this.props.id);
        const element: JSX.Element = provider.getConnectionDialog(
            this.state.newConnectionName,
            this.state.endpointType,
            this.state.showConnectionDialog,
            this._onAuthorizeConnectionClick,
            this._onCloseDialog,
            this._onDismissErrorMessage,
            this._getConnectionName);
        return element;
    }

    private _getConnectionName = (currentName: string, defaultName: string): string => {
        if (currentName || currentName === Utils_String.empty) {
            return currentName;
        }
        else {
            return defaultName;
        }
    }

    private _onAuthorizeConnectionClick = (inputs: IDialogInputs, data: IDictionaryStringTo<string>): void => {
        this._connectedServiceEndpointActionsCreator.updateNewConnectionStatusAndCreateEndpoint({
            connectionName: inputs.connectionName,
            loginUser: inputs.userName,
            serverUrl: inputs.serverUrl,
            accessToken: inputs.accessToken,
            type: this.state.endpointType,
            scheme: EndpointAuthorizationSchemes.UsernamePassword,
            data: data
        } as INewConnectionStatus, this.state.endpointType);
    }

    private _onCloseDialog = () => {
        this._updateState(Utils_String.empty, false);
    }

    private _onAddNewConnectionClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        this._updateState(undefined, true);
    }

    private _onDismissAddConnectionSection = (): void => {
        switch (ScmUtils.convertRepoTypeToWellKnownRepoType(this.props.id)) {
            case RepositoryTypes.Svn:
                this._sourcesActionCreator.changeSvnSource({
                    type: this.props.id,
                    showAddConnection: false
                });
                break;
        }
        this._versionControlActionsCreator.updateProperty(VersionControlProperties.showAddConnection, Boolean.toString(false));
    }

    private _getAuthorizedStatusElement(): JSX.Element {
        let selectedConnection: string = Utils_String.empty;
        const connections = this.state.connections || [];

        connections.forEach((connection: ServiceEndpoint) => {
            if (connection && this.state.selectedConnectionId === connection.id) {
                selectedConnection = connection.name;
                return;
            }
        });

        const selectedConnectionElement: JSX.Element = (
            <SafeLink
                href={ScmUtils.getWebAccessConnectionUrl(TfsContext.getDefault(), this.state.selectedConnectionId)}
                target="_blank"
                className="link-status-element">
                {selectedConnection}
            </SafeLink>
        );

        return (
            <span>
                {Resources.AuthorizedConnectionText}
                {selectedConnectionElement}
            </span>
        );
    }

    private _getServiceEndPointsDropdown(): JSX.Element {
        const connectionsDropdownOptions: IContextualMenuItem[] = [];

        const connections = this.state.connections || [];

        // component will use item name attribute for aria label as well

        connections.forEach((connection: ServiceEndpoint) => {
            if (connection) {
                connectionsDropdownOptions.push({
                    key: connection.id,
                    name: connection.name,
                    onClick: this._onConnectionClick
                } as IContextualMenuItem);
            }
        });

        connectionsDropdownOptions.push({
            key: Component._newConnectionDropdownId,
            name: Resources.NewServiceConnection,
            onClick: this._onAddConnectionClick
        } as IContextualMenuItem);

        return (
            <div className="connection-dropdown">
                <DropdownButton
                    label={Resources.Change}
                    dropdownOptions={connectionsDropdownOptions}
                    linkClassName="link-status-element" />
            </div>
        );
    }

    private _onConnectionClick = (ev?: React.MouseEvent<HTMLElement>, item?: IContextualMenuItem): void => {
        switch (ScmUtils.convertRepoTypeToWellKnownRepoType(this.props.id)) {
            case RepositoryTypes.Svn:
                this._sourcesActionCreator.changeSvnSource({
                    type: this.props.id,
                    connectionId: item.key as string
                });
                break;
        }
        this._sourcesActionCreator.sourceSelectionChanged();
        this._versionControlActionsCreator.updateSelectedConnection(item.key as string);
    }

    private _onAddConnectionClick = (): void => {
        switch (ScmUtils.convertRepoTypeToWellKnownRepoType(this.props.id)) {
            case RepositoryTypes.Svn:
                this._sourcesActionCreator.changeSvnSource({
                    type: this.props.id
                });
                break;
        }
        const showAddConnection = this._canShowAddConnectionSection(this._getStateFromStore());
        this._versionControlActionsCreator.updateProperty(VersionControlProperties.showAddConnection, Boolean.toString(showAddConnection));

        // Set show connection dialog state to true to make connection dialog visible in case click on
        // "Add Connection" button or "New Service Connection" from drop down
        this.setState({
            showConnectionDialog: true
        } as IExternalVersionControlBaseState);
    }

    private _onChange = (): void => {
        this._updateState();
    }

    private _onRemoteDataUpdated = (): void => {
        this._updateState(Utils_String.empty, false, true);

        Utils_Core.delay(this, 10, () => {
            this._sourcesActionCreator.sourceSelectionChanged();
        });
    }

    // This get called when any server error message comes while creating new service endpoint or
    // updating service point. Set the error message and showConnectionDialog so that dialog should
    // not get close and error message can be seen on dialog itself
    private _onErrorHandler = (sender: ExternalVersionControlStoreBase, errorMessage: string): void => {
        this._updateState(errorMessage, true);
    }

    // Called when error message shown in the dialog getting dimiss.
    private _onDismissErrorMessage = () => {
        this._updateState(Utils_String.empty);
    }

    private _updateState(errorMessage?: string, showConnectionDialog?: boolean, updateShowAddConnection?: boolean) {
        const state: IExternalVersionControlBaseState = this._getStateFromStore();

        if (errorMessage) {
            state.errorMessage = errorMessage;
        }

        if (showConnectionDialog !== undefined) {
            state.showConnectionDialog = showConnectionDialog;
        }

        if (updateShowAddConnection) {
            state.showAddConnection = this._canShowAddConnectionSection(state);
        }

        this.setState(state);
    }

    private _getStateFromStore = (): IExternalVersionControlBaseState => {
        if (this._store) {
            return this._store.getState();
        }
        else {
            const vcState: IVersionControlState = this._versionControlStore.getState();
            return {
                newConnectionName: vcState.newConnectionName,
                selectedConnectionId: vcState.selectedConnectionId,
                connections: vcState.connections,
                showAddConnection: !this.props.isReadOnly && vcState.showAddConnection,
                errorMessage: vcState.errorMessage,
                endpointType: vcState.endpointType,
                showConnectionDialog: vcState.showConnectionDialog,
                cleanRepository: vcState.cleanRepository.toString(),
                isCleanRepositoryEnabled: (vcState.cleanRepository === true),
                hideConnectionDropdown: !!this.props.isReadOnly || vcState.isManagedExternally
            };
        }
    }

    private _canShowAddConnectionSection(state: IExternalVersionControlBaseState): boolean {
        const repoType: string = ScmUtils.convertEndpointTypeToRepoType(state.endpointType);
        const componentProvider = SourceProviderUtils.getComponentProvider(repoType);
        if (!componentProvider) {
            return false;
        }
        return !this.props.isReadOnly && componentProvider.canShowAddConnection(state.connections);
    }
}
