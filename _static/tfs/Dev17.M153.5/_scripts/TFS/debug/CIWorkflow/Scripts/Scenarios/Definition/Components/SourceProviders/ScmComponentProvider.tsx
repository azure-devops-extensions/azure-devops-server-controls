/// <reference types="react" />

import * as React from "react";

import { ErrorMessageParentKeyConstants } from "CIWorkflow/Scripts/Common/Constants";
import { ScmUtils } from "CIWorkflow/Scripts/Common/ScmUtils";
import * as Resources from "CIWorkflow/Scripts/Resources/TFS.Resources.CIWorkflow";
import { BuildQueueSourceSelectionEditor } from "CIWorkflow/Scripts/Scenarios/Definition/Components/BuildQueueSourceSelectionEditor";
import { IRepository } from "CIWorkflow/Scripts/Scenarios/Definition/Sources/VersionControlInterfaces";

import { MessageHandlerActionsCreator } from "DistributedTaskControls/Actions/MessageHandlerActionsCreator";
import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import { StringInputComponent } from "DistributedTaskControls/SharedControls/InputControls/Components/StringInputComponent";
import { ISelectedPathNode } from "DistributedTasksCommon/TFS.Tasks.Types";
import { IDialogInputs } from "DistributedTaskControls/Components/AddNewEndpoint";

import { BuildRepository } from "TFS/Build/Contracts";
import { ServiceEndpoint } from "TFS/DistributedTask/Contracts";

import * as Utils_String from "VSS/Utils/String";

// This is the base class for all SCM Component Providers.
// This class provides the most basic components that all SCM providers support.
// If a provider needs a special implementation, it should override this class and
// update the SourceProvider class to provide the new class instead.
export abstract class ScmComponentProvider {
    public getQueueBuildEditor(
        repository: BuildRepository,
        selectedBranch: string,
        onBranchChanged: IFunctionPR<string, void>,
        onSourceVersionChanged: IFunctionPR<string, void>): JSX.Element {
        // The default is just a text box (no drop down)
        const commitLabel: string = this.getCommitLabel();
        return <BuildQueueSourceSelectionEditor
            defaultBranch={this._getBranch(selectedBranch, repository.defaultBranch)}
            revisionOrCommitLabel={commitLabel}
            onBranchChanged={onBranchChanged}
            onSourceVersionChanged={onSourceVersionChanged} />;
    }

    protected getCommitLabel(): string {
        return Resources.Commit;
    }

    public getPathFilter(
        repository: BuildRepository,
        containerClassName: string,
        initialSelectedPath: string,
        onFilterChange: (value: string) => void,
        showPathDialog: (initialValue: string, callback: (selectedValue: ISelectedPathNode) => void) => void,
        rootFolder: string,
        disabled?: boolean): JSX.Element {
        // The default is just a text box (no drop down)
        return (<div className="filter-selector">
                    <StringInputComponent
                        value={initialSelectedPath}
                        onValueChanged={onFilterChange}
                        getErrorMessage={(value: string) => { return this._getErrorMessage(value); }}
                        ariaLabel={Resources.PathSpecificationText}
                        disabled={!!disabled} />
                </div>);
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
        // The default is just a text box (no drop down)
        return (<div className="fabric-style-overrides github-branch-list">
                    <StringInputComponent
                        value={branchFilter}
                        onValueChanged={onFilterChange}
                        getErrorMessage={(value: string) => { return this._getErrorMessage(value); }}
                        ariaLabel={Resources.BranchSpecificationText}
                        disabled={!!disabled} />
                </div>);
    }

    public abstract getTabItem(key: string, showAdvancedSettings: boolean, isReadOnly: boolean): JSX.Element;

    public canShowAddConnection(existingEndpoints: ServiceEndpoint[]): boolean {
        return true;
    }

    public abstract getAddConnectionSection(
        newConnectionName: string,
        endpointType: string,
        showClose: boolean,
        onAddNewConnectionClick: (event: React.MouseEvent<HTMLButtonElement>) => void,
        onDismiss: () => void);

    public abstract getConnectionDialog(
        newConnectionName: string,
        endpointType: string,
        showConnectionDialog: boolean,
        onAuthorizeConnectionClick: (inputs: IDialogInputs, data: IDictionaryStringTo<string>) => void,
        onCloseDialog: () => void,
        onDismissErrorMessage: () => void,
        getConnectionName: (currentName: string, defaultName: string) => string);

    public canShowPathDialog(): boolean {
        return false;
    }

    public showPathDialog(repository: IRepository, initialValue: string, callback: (selectedValue: ISelectedPathNode) => void): void {
        return;
    }

    protected _getBranch = (selectedBranch: string, defaultBranch: string): string => {
        let branch: string = selectedBranch;
        if (branch === null || branch === undefined) {
            branch = defaultBranch;
        }
        return branch;
    }

    protected _getErrorMessage = (value: string): string => {
        if (!value || !value.trim()) {
            return Resources.SettingsRequired;
        }
        return Utils_String.empty;
    }

    protected _onError = (errorString: string) => {
        const messageBarActionCreator: MessageHandlerActionsCreator =
            ActionCreatorManager.GetActionCreator<MessageHandlerActionsCreator>(MessageHandlerActionsCreator);
        messageBarActionCreator.addMessage(ErrorMessageParentKeyConstants.Main, errorString);
    }

    protected _branchFilterComparer = (branch: string, input: string): number => {
        return ScmUtils.branchFilterComparer(branch, input);
    }
}
