/// <reference types="react" />

import * as React from "react";

import * as Resources from "CIWorkflow/Scripts/Resources/TFS.Resources.CIWorkflow";
import { ScmComponentProvider } from "CIWorkflow/Scripts/Scenarios/Definition/Components/SourceProviders/ScmComponentProvider";
import * as SvnTabItemAsync from "CIWorkflow/Scripts/Scenarios/Definition/ControllerViews/SubversionTabItem";

import { Boolean } from "DistributedTaskControls/Common/Primitives";
import { Component as AddNewEndpoint, IDialogInputs } from "DistributedTaskControls/Components/AddNewEndpoint";
import { ISubversionDialogInputs, SubversionConnectionDialog } from "DistributedTaskControls/Components/SubversionConnectionDialog";

import { BuildRepository } from "TFS/Build/Contracts";
import { ServiceEndpoint } from "TFS/DistributedTask/Contracts";

import { getAsyncLoadedComponent } from "VSS/Flux/AsyncLoadedComponent";
import * as Utils_String from "VSS/Utils/String";

const AsyncSvnTabItem = getAsyncLoadedComponent(
    ["CIWorkflow/Scripts/Scenarios/Definition/ControllerViews/SubversionTabItem"],
    (m: typeof SvnTabItemAsync) => m.Component,
    () => <div>{Resources.Loading}</div>);

export class SvnComponentProvider extends ScmComponentProvider {

    private static _realmName: string = "realmName";
    private static _acceptUntrustedCerts: string = "acceptUntrustedCerts";

    protected getCommitLabel(): string {
        return Resources.SourceVersionText;
    }

    public getBranchFilter(
        repository: BuildRepository,
        branchFilter: string,
        onFilterChange: (value: string) => void,
        allowUnmatchedSelection: boolean,
        branches: string[]): JSX.Element {
        // Subversion doesn't support branch filters
        return null;
    }

    public getTabItem(key: string, showAdvancedSettings: boolean, isReadOnly: boolean): JSX.Element {
        return <AsyncSvnTabItem
            key={key}
            id={key}
            showAdvancedSettings={showAdvancedSettings}
            isReadOnly={isReadOnly} />;
    }

    public canShowAddConnection(existingEndpoints: ServiceEndpoint[]): boolean {
        // We don't want to show the Add connection button when one connection is already present
        // because the user will initiate adding a connection via the service selection UI and
        // that will bring up a dialog.
        return (existingEndpoints && existingEndpoints.length) ? false : true;
    }

    public getAddConnectionSection(
        newConnectionName: string,
        endpointType: string,
        showClose: boolean,
        onAddNewConnectionClick: (event: React.MouseEvent<HTMLButtonElement>) => void,
        onDismiss: () => void) {
        return <AddNewEndpoint
                        id={endpointType}
                        isEnabled={true}
                        onAddConnectionClick={onAddNewConnectionClick}
                        addNewEndpointMessage={Resources.AddSubversionConnection}
                        showClose={showClose}
                        onDismiss={onDismiss}
                        connectionType={endpointType} >
                    </AddNewEndpoint>;
    }

    public getConnectionDialog(
        newConnectionName: string,
        endpointType: string,
        showConnectionDialog: boolean,
        onAuthorizeConnectionClick: (inputs: IDialogInputs, data: IDictionaryStringTo<string>) => void,
        onCloseDialog: () => void,
        onDismissErrorMessage: () => void,
        getConnectionName: (currentName: string, defaultName: string) => string) {
        // The subversion dialog adds 2 data members to the structure, so we have to handle that here
        return <SubversionConnectionDialog
            showDialog={showConnectionDialog}
            onAuthorized={(inputs: ISubversionDialogInputs) => {
                const dialogInputs: IDialogInputs = {
                    connectionName: inputs.connectionName,
                    userName: inputs.userName,
                    serverUrl: inputs.serverUrl,
                    accessToken: inputs.accessToken
                };

                const data: IDictionaryStringTo<string> = {};
                data[SvnComponentProvider._realmName] = inputs.realmName || Utils_String.empty;
                data[SvnComponentProvider._acceptUntrustedCerts] = Boolean.toString(inputs.acceptUntrustedCerts);
                onAuthorizeConnectionClick(dialogInputs, data);
            }}
            defaultConnectionName={newConnectionName}
            onCloseDialog={onCloseDialog}
            getConnectionName={getConnectionName}
            errorMessage={null}
            onDismissErrorMessage={onDismissErrorMessage}
            connectionType={endpointType} />;
    }
}
