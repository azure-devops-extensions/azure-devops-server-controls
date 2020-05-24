/// <reference types="react" />

import * as React from "react";

import { ScmUtils } from "CIWorkflow/Scripts/Common/ScmUtils";
import * as Resources from "CIWorkflow/Scripts/Resources/TFS.Resources.CIWorkflow";
import { ScmComponentProvider } from "CIWorkflow/Scripts/Scenarios/Definition/Components/SourceProviders/ScmComponentProvider";
import { TfGitBuildQueueEditor } from "CIWorkflow/Scripts/Scenarios/Definition/Components/TfGitBuildQueueEditor";
import * as TfGitTabItemAsync from "CIWorkflow/Scripts/Scenarios/Definition/ControllerViews/TfGitTabItem";
import { ErrorComponent } from "DistributedTaskControls/SharedControls/ErrorComponent/ErrorComponent";

import { IDialogInputs } from "DistributedTaskControls/Components/AddNewEndpoint";
import { BranchFilterComponent } from "DistributedTaskControls/Components/BranchFilterComponent";

import { BuildRepository } from "TFS/Build/Contracts";

import { getAsyncLoadedComponent } from "VSS/Flux/AsyncLoadedComponent";

const AsyncTfGitTabItem = getAsyncLoadedComponent(
    ["CIWorkflow/Scripts/Scenarios/Definition/ControllerViews/TfGitTabItem"],
    (m: typeof TfGitTabItemAsync) => m.Component,
    () => <div>{Resources.Loading}</div>);

export class TfGitComponentProvider extends ScmComponentProvider {
    public getQueueBuildEditor(
        repository: BuildRepository,
        selectedBranch: string,
        onBranchChanged: IFunctionPR<string, void>,
        onSourceVersionChanged: IFunctionPR<string, void>): JSX.Element {
        return (<TfGitBuildQueueEditor
                    repository={ScmUtils.getGitRepository(repository)}
                    defaultBranch={this._getBranch(selectedBranch, repository.defaultBranch)}
                    onBranchChanged={onBranchChanged}
                    onSourceVersionChanged={onSourceVersionChanged} />);
    }

    public getBranchFilter(
        repository: BuildRepository,
        branchFilter: string,
        onFilterChange: (value: string) => void,
        allowUnmatchedSelection: boolean,
        branches: string[],
        ariaLabelledBy?: string,
        disabled?: boolean
    ): JSX.Element {
        let errorMessage = this._getErrorMessage(branchFilter);

        // This editor allows picking any kind of ref
        // TODO - eventually, we should be using this for GitHub, Bitbucket, etc
        return (<div className="filter-selector">
                <BranchFilterComponent
                    ariaLabelledBy={ariaLabelledBy}
                    repositoryId={repository.id}
                    branchFilter={branchFilter}
                    onBranchFilterChange={(selectedBranch: string) => { onFilterChange(selectedBranch); }}
                    allowUnmatchedSelection={allowUnmatchedSelection}
                    onError={this._onError}
                    disabled={!!disabled} />
                {errorMessage && <ErrorComponent errorMessage={errorMessage} />}
            </div>);
    }

    public getTabItem(key: string, showAdvancedSettings: boolean, isReadOnly: boolean): JSX.Element {
        return <AsyncTfGitTabItem
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
        throw new Error("No AddConnectionSection is available for TfGit.");
    }

    public getConnectionDialog(
        newConnectionName: string,
        endpointType: string,
        showConnectionDialog: boolean,
        onAuthorizeConnectionClick: (inputs: IDialogInputs, data: IDictionaryStringTo<string>) => void,
        onCloseDialog: () => void,
        onDismissErrorMessage: () => void,
        getConnectionName: (currentName: string, defaultName: string) => string) {
        throw new Error("No ConnectionDialog is available for TfGit.");
    }
}
