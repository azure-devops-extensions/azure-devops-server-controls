/// <reference types="react" />

import * as React from "react";

import * as Resources from "CIWorkflow/Scripts/Resources/TFS.Resources.CIWorkflow";
import { ScmComponentProvider } from "CIWorkflow/Scripts/Scenarios/Definition/Components/SourceProviders/ScmComponentProvider";
import * as ExternalGitTabItemAsync from "CIWorkflow/Scripts/Scenarios/Definition/ControllerViews/ExternalGitTabItem";

import { Component as AddNewEndpoint, IDialogInputs } from "DistributedTaskControls/Components/AddNewEndpoint";
import { ExternalGitConnectionDialog } from "DistributedTaskControls/Components/ExternalGitConnectionDialog";

import { ServiceEndpoint } from "TFS/DistributedTask/Contracts";

import { getAsyncLoadedComponent } from "VSS/Flux/AsyncLoadedComponent";

const AsyncExternalGitTabItem = getAsyncLoadedComponent(
    ["CIWorkflow/Scripts/Scenarios/Definition/ControllerViews/ExternalGitTabItem"],
    (m: typeof ExternalGitTabItemAsync) => m.Component,
    () => <div>{Resources.Loading}</div>);

export class ExternalGitComponentProvider extends ScmComponentProvider {

    public getTabItem(key: string, showAdvancedSettings: boolean, isReadOnly: boolean): JSX.Element {
        return <AsyncExternalGitTabItem
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
            addNewEndpointMessage={Resources.AddExternalGitConnection}
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
        return (<ExternalGitConnectionDialog
            showDialog={showConnectionDialog}
            onAuthorized={(inputs: IDialogInputs) => {
                onAuthorizeConnectionClick(inputs, null);
            }}
            defaultConnectionName={newConnectionName}
            onCloseDialog={onCloseDialog}
            getConnectionName={getConnectionName}
            errorMessage={null}
            onDismissErrorMessage={onDismissErrorMessage}
            connectionType={endpointType} />);
    }
}
