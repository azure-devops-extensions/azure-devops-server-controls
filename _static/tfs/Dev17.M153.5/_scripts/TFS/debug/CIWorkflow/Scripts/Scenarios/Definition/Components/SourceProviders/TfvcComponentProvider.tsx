/// <reference types="react" />

import * as React from "react";

import * as Resources from "CIWorkflow/Scripts/Resources/TFS.Resources.CIWorkflow";
import { PathSelectorComponent } from "CIWorkflow/Scripts/Scenarios/Definition/Components/PathSelectorComponent";
import { ScmComponentProvider } from "CIWorkflow/Scripts/Scenarios/Definition/Components/SourceProviders/ScmComponentProvider";
import { TfvcBuildQueueEditor } from "CIWorkflow/Scripts/Scenarios/Definition/Components/TfvcBuildQueueEditor";
import * as TfvcTabItemAsync from "CIWorkflow/Scripts/Scenarios/Definition/ControllerViews/TfvcTabItem";

import { ISelectedPathNode } from "DistributedTasksCommon/TFS.Tasks.Types";
import { LoadingComponent } from "DistributedTaskControls/Components/LoadingComponent";
import { IDialogInputs } from "DistributedTaskControls/Components/AddNewEndpoint";

import { BuildRepository } from "TFS/Build/Contracts";

import { VersionSpec, ShelvesetVersionSpec } from "VersionControl/Scripts/TFS.VersionControl.VersionSpecs";

import { getAsyncLoadedComponent } from "VSS/Flux/AsyncLoadedComponent";

const AsyncTfvcTabItem = getAsyncLoadedComponent(
    ["CIWorkflow/Scripts/Scenarios/Definition/ControllerViews/TfvcTabItem"],
    (m: typeof TfvcTabItemAsync) => m.Component,
    () => <LoadingComponent label={Resources.Loading} />);

export class TfvcComponentProvider extends ScmComponentProvider {

    public getQueueBuildEditor(
        repository: BuildRepository,
        selectedBranch: string,
        onBranchChanged: IFunctionPR<string, void>,
        onSourceVersionChanged: IFunctionPR<string, void>): JSX.Element {
        let spec = null;
        try {
            spec = VersionSpec.parse(selectedBranch);
        }
        catch (err) {
            // ignore
        }
        return <TfvcBuildQueueEditor
            onShelvesetChanged={onBranchChanged}
            onSourceVersionChanged={onSourceVersionChanged}
            {...spec instanceof ShelvesetVersionSpec ? {
                shelvesetName: selectedBranch
            } : {}}
        />;
    }

    public getPathFilter(
        repository: BuildRepository,
        containerClassName: string,
        initialSelectedPath: string,
        onFilterChange: (value: string) => void,
        showPathDialog: (initialValue: string, callback: (selectedValue: ISelectedPathNode) => void) => void,
        rootFolder: string,
        disabled?: boolean): JSX.Element {
    return <div className="filter-selector">
                <PathSelectorComponent
                    containerCssClass={containerClassName}
                    initialSelectedPath={initialSelectedPath}
                    onSelectedPathChange={onFilterChange}
                    showPathDialog={showPathDialog}
                    rootFolder={rootFolder}
                    disabled={disabled} />
            </div>;
    }

    public getBranchFilter(
        repository: BuildRepository,
        branchFilter: string,
        onFilterChange: (value: string) => void,
        allowUnmatchedSelection: boolean,
        branches: string[]): JSX.Element {
        // TFVC doesn't support branch filters
        return null;
    }

    public getTabItem(key: string, showAdvancedSettings: boolean, isReadOnly: boolean): JSX.Element {
        return <AsyncTfvcTabItem
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
        throw new Error("No AddConnectionSection is available for TFVC.");
    }

    public getConnectionDialog(
        newConnectionName: string,
        endpointType: string,
        showConnectionDialog: boolean,
        onAuthorizeConnectionClick: (inputs: IDialogInputs, data: IDictionaryStringTo<string>) => void,
        onCloseDialog: () => void,
        onDismissErrorMessage: () => void,
        getConnectionName: (currentName: string, defaultName: string) => string) {
        throw new Error("No ConnectionDialog is available for TFVC.");
    }
}
