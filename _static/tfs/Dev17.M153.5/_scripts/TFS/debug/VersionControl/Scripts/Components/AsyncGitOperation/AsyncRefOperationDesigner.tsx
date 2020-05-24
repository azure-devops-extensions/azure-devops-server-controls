import * as React from "react";

import { GitRefDropdownSwitch } from "VersionControl/Scenarios/Shared/GitRefDropdownSwitch";
import { GitRepositoryContext } from "VersionControl/Scripts/GitRepositoryContext";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import * as VCSpecs from "VersionControl/Scripts/TFS.VersionControl.VersionSpecs";

import { DefaultButton, PrimaryButton } from "OfficeFabric/Button";
import { DialogFooter } from "OfficeFabric/Dialog";
import { Label } from "OfficeFabric/Label";
import { TextField } from "OfficeFabric/TextField";
import { autobind } from "OfficeFabric/Utilities";

/**
 * Properties for creating an async ref operation
 */
export interface IAsyncRefOperationDesignerProps {

    /**
     * A user-friendly description of the operation.
     */
    description: string;

    /**
     * Text for the ok button of the designer.
     */
    okText: string;

    /**
     * A callback for when the close button is clicked.
     */
    onClose(): void;

    /**
     * A callback to create the async ref operation.
     */
    onDoOperation(): void;

    /**
     * The current onto ref.
     */
    ontoRef: VCSpecs.IGitRefVersionSpec;

    /**
     * A callback for when the ontoRef is changed.
     */
    ontoRefChanged(ontoRef: VCSpecs.IGitRefVersionSpec): void;

    /**
     * The current generated ref.
     */
    generatedRef: VCSpecs.IGitRefVersionSpec;

    /**
     * A callback for when the ontoRef is changed.
     */
    generatedRefChanged(generatedRef: VCSpecs.GitBranchVersionSpec): void;

    /**
     * Error message about generated Ref (e.g. branch already exists)
     */
    generatedRefError: string;

    /**
     * Warning message about generated Ref (e.g. branch name was truncated)
     */
    generatedRefWarning: string;

    /**
     * The instance of application ContextStore.
     */
    repositoryContext: GitRepositoryContext;
    /**
     * In this mode no branch picker or generated ref input is provided
     */
    simplifiedMode?: boolean;
}

/**
 * Wrapper for the dialog to create an async ref operation.
 */
export class AsyncRefOperationDesigner extends React.Component<IAsyncRefOperationDesignerProps, null> {

    public render(): JSX.Element {

        return (
            <div>
                <Label>{this.props.description}</Label>
                {!this.props.simplifiedMode &&
                    <div>
                        <div className="form-section">
                            <Label required htmlFor="ontoRef">{VCResources.AsyncRef_Dialog_OntoRefText}</Label>
                            <GitRefDropdownSwitch
                                repositoryContext={this.props.repositoryContext}
                                versionSpec={this.props.ontoRef}
                                viewTagsPivot={false}
                                isDrodownFullWidth={true}
                                onSelectionChanged={this._updateOntoRef}
                            />
                        </div>
                        <fieldset >
                            <Label htmlFor="generatedRef" required={true}>{VCResources.AsyncRef_Dialog_GeneratedRefText}</Label>
                            <TextField
                                value={this.props.generatedRef ? this.props.generatedRef.toDisplayText() : ""}
                                id="generatedRef"
                                errorMessage={this.props.generatedRefError || this.props.generatedRefWarning}
                                onChanged={this._updateGeneratedRefName} />
                        </fieldset>
                    </div>
                }
                <DialogFooter>
                    <PrimaryButton
                        onClick={this.props.onDoOperation}
                        disabled={!this.props.ontoRef || !!this.props.generatedRefError}>
                        {this.props.okText}
                    </PrimaryButton>
                    <DefaultButton
                        className={"dialog-cancel-button"}
                        onClick={this.props.onClose}>{VCResources.AsyncRef_Dialog_Cancel}</DefaultButton>
                </DialogFooter>
            </div>
        );
    }

    @autobind
    private _updateOntoRef(versionSpec: VCSpecs.IGitRefVersionSpec) {
        this.props.ontoRefChanged(versionSpec);
    }

    @autobind
    private _updateGeneratedRefName(value: string) {
        const branchName = value;
        this.props.generatedRefChanged(new VCSpecs.GitBranchVersionSpec(branchName));
    }
}
