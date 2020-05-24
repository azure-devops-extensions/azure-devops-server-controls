/// <reference types="react" />

import * as React from "react";

import * as Resources from "CIWorkflow/Scripts/Resources/TFS.Resources.CIWorkflow";
import { GitBranchFilter } from "CIWorkflow/Scripts/Scenarios/Definition/Components/GitBranchFilter";
import { ScmComponentProvider } from "CIWorkflow/Scripts/Scenarios/Definition/Components/SourceProviders/ScmComponentProvider";
import * as GitServiceTabItemAsync from "CIWorkflow/Scripts/Scenarios/Definition/ControllerViews/GitServiceTabItem";
import * as GitHubRepositoryContext_NO_REQUIRE from "CIWorkflow/Scripts/Scenarios/Definition/Sources/GitHubRepositoryContext";
import * as GitHubRepository_NO_REQUIRE from "CIWorkflow/Scripts/Scenarios/Definition/Sources/GitServiceRepository";
import * as GitHubHelper_NO_REQUIRE from "CIWorkflow/Scripts/Scenarios/Definition/Sources/SourceProviderClientService";
import { IRepository } from "CIWorkflow/Scripts/Scenarios/Definition/Sources/VersionControlInterfaces";

import { ServiceEndpointConstants, ServiceEndpointType } from "DistributedTaskControls/Common/Common";
import { IDialogInputs } from "DistributedTaskControls/Components/AddNewEndpoint";
import { Component as AddNewServiceEndpoint } from "DistributedTaskControls/Components/AddNewServiceEndpoint";
import { ISelectedPathNode } from "DistributedTasksCommon/TFS.Tasks.Types";

import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";

import { BuildRepository } from "TFS/Build/Contracts";

import * as AddPathDialog_NO_REQUIRE from "VersionControl/Scripts/Controls/AddPathDialog";
import { RepositoryContext } from "VersionControl/Scripts/RepositoryContext";

import { InputValue } from "VSS/Common/Contracts/FormInput";
import * as Dialogs from "VSS/Controls/Dialogs";
import * as Diag from "VSS/Diag";
import { getAsyncLoadedComponent } from "VSS/Flux/AsyncLoadedComponent";
import * as VSS from "VSS/VSS";

const AsyncGitServiceTabItem = getAsyncLoadedComponent(
    ["CIWorkflow/Scripts/Scenarios/Definition/ControllerViews/GitServiceTabItem"],
    (m: typeof GitServiceTabItemAsync) => m.Component,
    () => <div>{Resources.Loading}</div>);

export class GitHubComponentProvider extends ScmComponentProvider {

    public getBranchFilter(
        repository: BuildRepository,
        branchFilter: string,
        onFilterChange: (value: string) => void,
        allowUnmatchedSelection: boolean,
        branches: string[],
        ariaLabelledBy?: string,
        disabled?: boolean): JSX.Element {
        // We should have a list of branches, so use the GitBranchFilter dropdown
        return <GitBranchFilter
            branchFilter={branchFilter}
            onFilterChange={onFilterChange}
            gitBranches={branches}
            branchFilterComparer={this._branchFilterComparer}
            disabled={disabled} />;
    }

    public getTabItem(key: string, showAdvancedSettings: boolean, isReadOnly: boolean): JSX.Element {
        return <AsyncGitServiceTabItem
            key={key}
            id={key}
            showAdvancedSettings={showAdvancedSettings}
            isReadOnly={isReadOnly} />;
    }

    public getAddConnectionSection(
        newConnectionName: string,
        endpointType: string,
        showClose: boolean,
        onAddNewConnectionClick: (event: React.MouseEvent<HTMLButtonElement>) => void,
        onDismiss: () => void) {
        return <AddNewServiceEndpoint
            newConnectionName={newConnectionName}
            id={endpointType}
            isEnabled={true}
            connectionType={ServiceEndpointType.GitHub}
            serverUrl={ServiceEndpointConstants.GitHubServerUrl}
            allowOauth={true}
            allowPAT={true}
            allowBasic={false}
            allowSetServerUrl={false}
            showClose={showClose}
            onDismiss={onDismiss} />;
    }

    public getConnectionDialog(
        newConnectionName: string,
        endpointType: string,
        showConnectionDialog: boolean,
        onAuthorizeConnectionClick: (inputs: IDialogInputs, data: IDictionaryStringTo<string>) => void,
        onCloseDialog: () => void, onDismissErrorMessage: () => void,
        getConnectionName: (currentName: string, defaultName: string) => string) {
        // We don't need a connection dialog here, since the new connection info is embedded
        return null;
    }

    public canShowPathDialog(): boolean {
        return true;
    }

    public showPathDialog(repository: IRepository, initialValue: string, callback: (selectedValue: ISelectedPathNode) => void) {
        VSS.using(["VersionControl/Scripts/Controls/AddPathDialog", "CIWorkflow/Scripts/Scenarios/Definition/Sources/SourceProviderClientService",
            "CIWorkflow/Scripts/Scenarios/Definition/Sources/GitServiceRepository", "CIWorkflow/Scripts/Scenarios/Definition/Sources/GitHubRepositoryContext"],
                  (AddPathDialog: typeof AddPathDialog_NO_REQUIRE, GitHubHelper: typeof GitHubHelper_NO_REQUIRE,
                   GitHubRepositoryHelper: typeof GitHubRepository_NO_REQUIRE, GitHubRepositoryContextHelper: typeof GitHubRepositoryContext_NO_REQUIRE) => {

                const tfsContext = TfsContext.getDefault();
                const inputValueData: InputValue = {
                    data: repository.data,
                    displayValue: repository.name,
                    value: repository.url
                };
                const gitHubRepository = new GitHubRepositoryHelper.GitServiceRepository(inputValueData);
                const dialogModel = new AddPathDialog.AddPathDialogModel();
                dialogModel.initialPath = "/";
                dialogModel.inputModel = new AddPathDialog.InputModel();
                dialogModel.inputModel.path(initialValue);
                dialogModel.repositoryContext = this.getRepositoryContext(tfsContext, gitHubRepository);
                dialogModel.okCallback = callback;
                Dialogs.show(AddPathDialog.AddPathDialog, dialogModel);
            }, (error) => {
                const errorMessage = error.message || error;
                Diag.logError(errorMessage);
            });
    }

    protected getRepositoryContext(tfsContext: TfsContext, gitHubRepository: GitHubRepository_NO_REQUIRE.GitServiceRepository): RepositoryContext {
        return GitHubRepositoryContext_NO_REQUIRE.GitHubRepositoryContext.create(gitHubRepository, tfsContext);
    }
}
