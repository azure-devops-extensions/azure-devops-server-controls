/// <reference types="react" />
/// <reference types="react-dom" />

import * as React from "react";
import * as ReactDOM from "react-dom";

import { ViewStateStore, getInstance as getViewStateStore } from "Build/Scenarios/Definitions/ViewState";
import { permissionsRetrieved } from "Build/Scripts/Actions/Actions";
import { AllDefinitionsSearchBox } from "Build/Scripts/Components/AllDefinitionsSearchBox";
import { ButtonWithBowtieIcon } from "Build/Scripts/Components/ButtonWithBowtieIcon";
import * as Build_FolderManageDialog_Component_NO_REQUIRE from "Build/Scripts/Components/FolderManageDialog";
import { LinkWithBowtieIcon } from "Build/Scripts/Components/LinkWithBowtieIcon";
import { TitleBar as TitleBarSection } from "Build/Scripts/Components/TitleBar";
import { BuildDefinitionRootPath, UserActions } from "Build/Scripts/Constants";
import * as ImportDefinitionDialog from "Build/Scripts/Controls.ImportDefinitionDialog";
import { DataProviderKeys } from "Build/Scripts/Generated/TFS.Build.Plugins";
import { BuildHelpLink } from "Build/Scripts/Linking";
import { QueryResult } from "Build/Scripts/QueryResult";
import { getDefinitionFolderSecurityToken, hasProjectPermission } from "Build/Scripts/Security";
import * as BuildResources from "Build/Scripts/Resources/TFS.Resources.Build";
import { IPermissionsStore, getPermissionsStore } from "Build/Scripts/Stores/Permissions";
import { Features, Sources, publishEvent } from "Build/Scripts/Telemetry";

import { BuildSecurity, BuildPermissions } from "Build.Common/Scripts/Generated/TFS.Build2.Common";

import * as TFS_Resources_Presentation from "Presentation/Scripts/TFS/Resources/TFS.Resources.Presentation";

import * as Dialogs from "VSS/Controls/Dialogs";
import { getService as getEventService } from "VSS/Events/Services";
import { getHistoryService, HistoryService } from "VSS/Navigation/Services";
import { PermissionEvaluationBatch } from "VSS/Security/Contracts";
import { getClient as getSecurityClient, SecurityHttpClient } from "VSS/Security/RestClient";
import * as Utils_String from "VSS/Utils/String";
import * as VSS from "VSS/VSS";

export interface Props {
    isMember: boolean;
}

export interface State {
    path: string;
    searchText: string;
    canCreateNewDefinition: boolean;
    canImportDefinition: boolean;
    canManageFolders: boolean;
}

export class TitleBar extends React.Component<Props, State> {
    private _viewState: ViewStateStore;
    private _permissionsStore: IPermissionsStore;
    private _searchText: string;
    private _historyService: HistoryService = null;

    constructor(props: Props) {
        super(props);

        this._historyService = getHistoryService();
        const urlState = this._historyService.getCurrentState();
        this._viewState = getViewStateStore(urlState);
        this._permissionsStore = getPermissionsStore();

        this.state = this._getState();

        this._searchText = this.state.searchText;
    }

    public render(): JSX.Element {
        const headingElement: JSX.Element = <div className="title-heading expand">
            <h1 className="ms-font-l">{BuildResources.BuildDefinitionsTitle}</h1>
        </div>;

        return <TitleBarSection>
            {headingElement}
            <div className="actions">
                <div className="search-container">
                    {
                        <AllDefinitionsSearchBox
                            className="alldefinitions-search"
                            title={BuildResources.SearchDefinitionsTitle}
                            placeholderText={BuildResources.SearchDefinitionsToolTip}
                            onChanged={this._onSearchDefinitionsChanged}
                            onClear={this._onSearchDefinitionsCleared}
                            initialValue={this.state.searchText} />
                    }
                </div>
                {
                    this.state.canCreateNewDefinition &&
                    <ButtonWithBowtieIcon
                        isCta={true}
                        onClick={this._onNewDefinitionClicked}
                        label={BuildResources.NewText}
                        iconClassName="bowtie-math-plus-light" />
                }
                {
                    this.state.canImportDefinition &&
                    <ButtonWithBowtieIcon
                        onClick={this._onImportDefinitionClicked}
                        label={BuildResources.ImportText}
                        iconClassName="bowtie-math-plus-light" />
                }
                {
                    this.state.canManageFolders &&
                    <ButtonWithBowtieIcon
                        onClick={this._onManageFoldersClicked}
                        label={BuildResources.ManageFolders}
                        iconClassName="bowtie-settings-wrench" />
                }
                {
                    this.props.isMember &&
                    <ButtonWithBowtieIcon
                        onClick={this._onSecurityClicked}
                        label={BuildResources.SecurityText}
                        iconClassName="bowtie-shield" />
                }
                <LinkWithBowtieIcon href={BuildHelpLink}
                    onClick={this._onHelpClicked}
                    iconClassName="bowtie-status-help-outline"
                    label={TFS_Resources_Presentation.HelpMenuText} />
            </div>
            <span ref="manageFolderDialogContainer" />
        </TitleBarSection>;
    }

    public componentDidMount() {
        this._viewState.addChangedListener(this._onStoresUpdated);
        this._permissionsStore.addChangedListener(this._onStoresUpdated);
    }

    public componentWillUnmount() {
        this._viewState.removeChangedListener(this._onStoresUpdated);
        this._permissionsStore.removeChangedListener(this._onStoresUpdated);

        // unmount the folder management dialog container
        ReactDOM.unmountComponentAtNode(this.refs["manageFolderDialogContainer"] as HTMLElement);
    }

    private _getState(): State {
        const path = this._viewState.getFolderPath() || "\\";
        const token = getDefinitionFolderSecurityToken(path);

        // if the folder has no definitions in it, we've never looked up the user's security for it
        if (!this._permissionsStore.hasToken(token)) {
            const permissionsBatch: PermissionEvaluationBatch = {
                alwaysAllowAdministrators: false,
                evaluations: [
                    {
                        securityNamespaceId: BuildSecurity.BuildNamespaceId,
                        token: token,
                        permissions: BuildPermissions.EditBuildDefinition,
                        value: false
                    },
                    {
                        securityNamespaceId: BuildSecurity.BuildNamespaceId,
                        token: token,
                        permissions: BuildPermissions.AdministerBuildPermissions,
                        value: false
                    }]
            };

            const client: SecurityHttpClient = getSecurityClient();
            client.hasPermissionsBatch(permissionsBatch)
                .then((evaluatedPermissions: PermissionEvaluationBatch) => {
                    permissionsRetrieved.invoke(evaluatedPermissions.evaluations);
                });
        }

        const hasEditPermission = hasProjectPermission(token, BuildPermissions.EditBuildDefinition);

        return {
            path: path,
            searchText: this._viewState.getSearchText(),
            canCreateNewDefinition: hasEditPermission,
            canImportDefinition: hasEditPermission,
            canManageFolders: hasEditPermission
        };
    }

    private _onStoresUpdated = () => {
        this.setState(this._getState());
    }

    private _onSearchDefinitionsChanged = (text: string): void => {
        if (this._searchText !== text) {
            this._searchText = text;
            getEventService().fire(UserActions.SearchDefinitions, this, this._searchText);
        }
    }

    private _onSearchDefinitionsCleared = (): void => {
        if (this._searchText) {
            // clear search
            this._searchText = "";
            getEventService().fire(UserActions.SearchDefinitions, this, this._searchText);
        }
    }

    private _onNewDefinitionClicked = () => {
        const path = this._viewState.getFolderPath() || BuildDefinitionRootPath;
        getEventService().fire(UserActions.NewDefinition, this, { source: Sources.AllDefinitions, folderPath: path });
    }

    private _onImportDefinitionClicked = () => {
        Dialogs.show(ImportDefinitionDialog.ImportDefinitionDialog);
    }

    private _onManageFoldersClicked = () => {
        VSS.using(["Build/Scripts/Components/FolderManageDialog"], (_Build_FolderManageDialog_Component: typeof Build_FolderManageDialog_Component_NO_REQUIRE) => {
            const folderManagementContainer = this.refs["manageFolderDialogContainer"] as HTMLElement;

            ReactDOM.render(
                <div>
                    <_Build_FolderManageDialog_Component.FolderManageDialog showDialogActions={true} title={BuildResources.ManageFoldersDialogTitle} showDialog={true} />
                </div>,
                folderManagementContainer);
        });
    }

    private _onSecurityClicked = () => {
        const path = this._viewState.getFolderPath() || "\\";
        getEventService().fire(UserActions.ViewFolderSecurity, this, path);
    }

    private _onHelpClicked = () => {
        publishEvent(Features.DefinitionsHelpClicked, Sources.AllDefinitions);
    }
}
