import React = require("react");
import ReactDOM = require("react-dom");

import Diag = require("VSS/Diag");
import Controls = require("VSS/Controls");
import Dialogs = require("VSS/Controls/Dialogs");
import Utils_Array = require("VSS/Utils/Array");
import Utils_Core = require("VSS/Utils/Core");
import Utils_UI = require("VSS/Utils/UI");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import Telemetry = require("VSS/Telemetry/Services");
import * as CustomerIntelligenceConstants from "VersionControl/Scripts/CustomerIntelligenceConstants";
import VCContracts = require("TFS/VersionControl/Contracts");
import {GitRepositoryContext} from "VersionControl/Scripts/GitRepositoryContext";
import * as GitRefUtility from "VersionControl/Scripts/GitRefUtility";
import {GitRefArtifact} from "VersionControl/Scripts/GitRefArtifact";
import VCResources = require("VersionControl/Scripts/Resources/TFS.Resources.VersionControl");
import VCSpecs = require("VersionControl/Scripts/TFS.VersionControl.VersionSpecs");
import VCModalDialog = require("VersionControl/Scripts/Controls/VersionControlModalDialog");
import GitRefService = require("VersionControl/Scripts/Services/GitRefService");

import VCAddWorkItemsControl = require("VersionControl/Scripts/Controls/AddRelatedWorkItemsControl");
import { addWorkItemsBatchAsync, mapWorkItemIdToLinkedArtifact } from "VersionControl/Scripts/Utils/WorkItemLinkUtils";
import { LinkedArtifactsControl, ILinkedArtifactControlOptions } from "Presentation/Scripts/TFS/Controls/LinkedArtifacts/Control";
import { ViewMode, ZeroDataExperienceViewMode } from "Presentation/Scripts/TFS/Controls/LinkedArtifacts/Contracts";

import { GitRefDropdownSwitch } from "VersionControl/Scenarios/Shared/GitRefDropdownSwitch";
import { RepositoryDropdownSwitch } from "VersionControl/Scenarios/Shared/RepositoryDropdownSwitch";
import VCControlsCommon = require("VersionControl/Scripts/Controls/ControlsCommon");
import Context = require("VSS/Context");
import {BranchNameValidator} from "VersionControl/Scripts/RefNameValidator";

import delegate = Utils_Core.delegate;
import domElem = Utils_UI.domElem;
import TfsContext = TFS_Host_TfsContext.TfsContext;

export interface CreateBranchDialogBaseOptions extends Dialogs.IModalDialogOptions {
    repositoryContext?: GitRepositoryContext;
    itemPath?: string;
    itemVersion?: string;
    sourceVersionSpec?: VCSpecs.VersionSpec;
    branchName?: string;
    commitItemCallback?: any;
    enableWorkItemLinking?: boolean;
    workItemIdsToShow?: number[];
    projectName?: string;
    projectId?: string;
}

/**
* Dialog for handling branch creation
*/
export class CreateBranchDialogBase extends VCModalDialog.VersionControlModalDialog<CreateBranchDialogBaseOptions> {
    private static CONTEXT_ID = "createBranchContext";

    public _repositoryContext: GitRepositoryContext;

    protected _workItemIdsToShow: number[];

    private static _BRANCH_NAME_VALIDATION_DELAYMS = 500;
    private _createFromOtherArea: boolean;
    private _repositoryPickerDiv: HTMLElement;
    private _refPickerDiv: HTMLElement;
    private _basedOnLabelId: string;
    private _selectedVersionSpec: VCSpecs.VersionSpec;

    private _linkedArtifactsControl: LinkedArtifactsControl;
    private _$linkedArtifactsContainer: JQuery;

    private _branchNameValidator: BranchNameValidator;

    private _$errorMessage: JQuery;
    private _$branchNameInput: JQuery;
    private _$createPullRequestCheckbox: JQuery;
    private _enableWorkItemLinking: boolean;
    private _validationThrottledDelegate: IArgsFunctionR<any>;
    private _isBranchNameDirty: boolean = false;

    public initializeOptions(options?: CreateBranchDialogBaseOptions) {
        super.initializeOptions($.extend({
            enableWorkItemLinking: true,
        }, options));
    }

    public initialize() {
        super.initialize();
        this._applyDialogStyles();
        this._repositoryContext = this._options.repositoryContext;
        this._createFromOtherArea = (this._repositoryContext === null);
        this._workItemIdsToShow = this._options.workItemIdsToShow || [];
        this._enableWorkItemLinking = this._options.enableWorkItemLinking;
        this._branchNameValidator = new BranchNameValidator([]);
        if (this._options.repositoryContext != null) {
            GitRefService.getGitRefService(this._options.repositoryContext).getBranchNames().then(branchNames => {
                this._branchNameValidator = new BranchNameValidator(branchNames);
            });
        }
        const $container = this._element;

        // Add New Branch Name
        const $branchNameDiv = $(domElem("div", "form-section")).appendTo($container);
        const inputId = "branchName" + Controls.getId();
        const errorDescriptionId = "input-error-tip-" + Controls.getId();

        $(domElem("label"))
            .attr("for", inputId)
            .text(VCResources.CreateBranchDialogNewBranchLabel)
            .appendTo($branchNameDiv);

        // Add input for branch name
        this._$branchNameInput = $(domElem("input"))
            .attr("type", "text")
            .attr("id", inputId)
            .attr("aria-describedby", errorDescriptionId)
            .attr("aria-required", "true")
            .attr("aria-invalid", "false")
            .attr('placeholder', VCResources.CreateBranchDialogWatermark)
            .appendTo($branchNameDiv);

        // perform throttled validation
        this._validationThrottledDelegate = Utils_Core.throttledDelegate(
            this,
            CreateBranchDialogBase._BRANCH_NAME_VALIDATION_DELAYMS,
            this._validateInputs);

        this._bind(this._$branchNameInput, "keyup", (e: JQueryKeyEventObject) => {
            const key = e.which || 0;
            if (key !== Utils_UI.KeyCode.ENTER) {
                // clear errors
                this._setErrorMessage("");
                this._isBranchNameDirty = true;
                this._validationThrottledDelegate();
            }
        });
        // Show error-tip if focus is in the input and there's an error
        this._bind(this._$branchNameInput, "focusin", (e: JQueryMouseEventObject) => {
            if (this._$branchNameInput.hasClass("invalid") === true) {
                this._$errorMessage.show()
            }
        });
        // Hide the error-tip if focus leaves the input
        this._bind(this._$branchNameInput, "focusout", (e: JQueryMouseEventObject) => {
            this._$errorMessage.hide()
        });

        // Add error for invalid input
        this._$errorMessage = $(domElem("div", "input-error-tip"))
            .attr("id", errorDescriptionId)
            .attr("role", "alert")
            .hide()
            .text("")
            .appendTo($branchNameDiv);

        // Add Source Ref (could be a branch, commit or tag)
        const $sourceRefContainer = $(domElem("div", "form-section")).appendTo($container);

        this._basedOnLabelId = "basedOnLabel" + Controls.getId();
        const $basedOnLabel = $(domElem("label"))
            .attr("id", this._basedOnLabelId)
            .text(VCResources.CreateBranchDialogFromGitRefLabel)
            .appendTo($sourceRefContainer);

        // If creating the branch from area other than version control, add a repo selector and fetch available repos
        if (this._createFromOtherArea) {
            this._repositoryPickerDiv = $(domElem("div")).appendTo($sourceRefContainer)[0];

            this.renderRepositoryPicker();
        }

        this._refPickerDiv = $(domElem("div")).appendTo($sourceRefContainer)[0];
    
        if (!this._createFromOtherArea) {
            this._updateBranchesFromRepo();
        }

        if (this._enableWorkItemLinking) {
            // Add container and label for the incoming work item links
            const $workItemArtifactsDiv = $(domElem("div", "vc-create-branch-work-item-artifacts form-section")).appendTo($container);
            const artifactsLabelId = "workItemArtifactsLabel" + Controls.getId();

            $(domElem("label"))
                .attr("id", artifactsLabelId)
                .text(VCResources.CreateBranchDialogWorkItemsLabel)
                .appendTo($workItemArtifactsDiv);

            Controls.BaseControl.createIn(
                VCAddWorkItemsControl.AddRelatedWorkItemsControl, $workItemArtifactsDiv, {
                    hostArtifactId: null,
                    contextId: CreateBranchDialogBase.CONTEXT_ID,
                    onWorkItemAdd: this._onAddWorkItem.bind(this),
                    checkWorkItemExists: (workItemId) => Utils_Array.contains(this._workItemIdsToShow, workItemId),
                    dropIconCss: "bowtie-chevron-down-light",
                    ariaLabelledBy: artifactsLabelId
                } as VCAddWorkItemsControl.IAddRelatedWorkItemsControlOptions);

            this._$linkedArtifactsContainer = $(domElem("div")).appendTo($container);

            ReactDOM.render(
                React.createElement<ILinkedArtifactControlOptions>(
                    LinkedArtifactsControl,
                    $.extend({}, {
                        tfsContext: TfsContext.getDefault(),
                        onRemoveLinkedArtifact: (removedArtifact) => this._onRemoveWorkItem(Number(removedArtifact.id)),
                        viewOptions: {
                            viewMode: ViewMode.List
                        },
                        zeroDataOptions: {
                            zeroDataExperienceViewMode: ZeroDataExperienceViewMode.Hidden
                        },
                        linkTypeRefNames: null, // Do not filter, show everything
                        linkedArtifacts: this._workItemIdsToShow.map(mapWorkItemIdToLinkedArtifact)
                    } as ILinkedArtifactControlOptions, { ref: ctrl => this._linkedArtifactsControl = ctrl })),
                this._$linkedArtifactsContainer[0]);
        }

        this._$branchNameInput.focus();
        this._validateInputs();
    }

    public dispose() {
        super.dispose();

        if (this._linkedArtifactsControl) {
            ReactDOM.unmountComponentAtNode(this._$linkedArtifactsContainer[0]);
            this._linkedArtifactsControl = null;
        }
    }

    private renderRepositoryPicker(): any {
        const tfsContext = TfsContext.getDefault();
        const projectId = this._options.projectId ||
            tfsContext.contextData.project && tfsContext.contextData.project.id;

        const repository = this._repositoryContext && this._repositoryContext.getRepository()
            || { project: { id: projectId, name: this._options.projectName } } as VCContracts.GitRepository;

        ReactDOM.render(
            React.createElement(RepositoryDropdownSwitch, {
                ariaLabelledby: this._basedOnLabelId,
                isDrodownFullWidth: true,
                currentRepository: repository,
                onRepositoryChange: this._onSourceRepoChanged,
            }),
            this._repositoryPickerDiv);
    }

    private renderVersionPicker(): any {
        ReactDOM.render(
            this._repositoryContext &&
            React.createElement(GitRefDropdownSwitch, {
                repositoryContext: this._repositoryContext,
                versionSpec: this._selectedVersionSpec,
                onSelectionChanged: delegate(this, this._onSourceRefVersionChanged),
                ariaLabelledBy: this._basedOnLabelId,
                viewCommitsPivot: true,
                isDrodownFullWidth: true,
            }),
            this._refPickerDiv);
    }

    private _updateBranchesFromRepo() {
        this.renderVersionPicker();

        GitRefService.getGitRefService(this._repositoryContext).getBranchNames()
            .then((branches: string[]) => {
                this._branchNameValidator = new BranchNameValidator(branches);
                this._validateInputs();
            });
    }

    // There's a styling quirk in Chrome (not IE) that causes the source ref popup to be cut off when the dialog is opened with the Monaco editor also showing.
    // This if fixed by turning off the overflow:hidden of the dialog (which then requires adjusting the position of the close x button).
    private _applyDialogStyles() {
        const $dialog: JQuery = this._element.closest(".ui-dialog").addClass("vc-create-branch-dialog-fix");
        $dialog.find("button.ui-dialog-titlebar-close").addClass("vc-create-branch-dialog-fix");
    }

    public _addCreatePullRequestCheckbox($container: JQuery, checked: boolean = true) {
        const $checkboxDiv = $(domElem("div", "checkbox form-section"));
        const checkboxId = "createPullRequest" + Controls.getId();
        const $squashMergeCheckboxPair = $(domElem("div", "checkbox-pair")).appendTo($checkboxDiv);
        this._$createPullRequestCheckbox = $(domElem("input", "checkbox-input"))
            .attr("type", "checkbox")
            .attr("id", checkboxId)
            .attr("name", checkboxId)
            .appendTo($squashMergeCheckboxPair);
        this._createPullRequestChecked(checked);

        $(domElem("label", "checkbox-label"))
            .attr("for", checkboxId)
            .text(VCResources.CreatePullRequestLabel)
            .appendTo($squashMergeCheckboxPair);

        $checkboxDiv.appendTo($container);
    }

    public _branchNameInput(value?: string): string {
        if (value !== undefined) {
            value = value || "";
            this._$branchNameInput.val(value);
            this._$branchNameInput.keyup();
        }
        return $.trim(this._$branchNameInput.val());
    }

    public _selectBranchNameInput() {
        if (this._$branchNameInput.val()) {
            this._$branchNameInput.select();
        }
    }

    public _sourceRefVersion(value?: VCSpecs.VersionSpec): VCSpecs.VersionSpec {
        if (value !== undefined) {
            this._selectedVersionSpec = value;
            this.renderVersionPicker();
        }
        return this._selectedVersionSpec;
    }

    public _onSourceRepoChanged = (selectedRepo: VCContracts.GitRepository) => {
        this._repositoryContext = new GitRepositoryContext(TfsContext.getDefault(), selectedRepo);
        this.renderRepositoryPicker();

        this._updateBranchesFromRepo();

        // If repo changes and branches have updated, preselect the default branch
        if (!this._selectedVersionSpec && this._repositoryContext.getRepository() && this._repositoryContext.getRepository().defaultBranch) {
            const defaultBranch: string = GitRefUtility.getRefFriendlyName(this._repositoryContext.getRepository().defaultBranch);
            this._sourceRefVersion(new VCSpecs.GitBranchVersionSpec(defaultBranch));
        }
    }

    public _onSourceRefVersionChanged(newVersionSpec: VCSpecs.VersionSpec) {
        this._sourceRefVersion(newVersionSpec);
        this._validateInputs();
    }

    public _createPullRequestChecked(value?: boolean): boolean {
        if (value !== undefined) {
            if (value) {
                this._$createPullRequestCheckbox.prop("checked", true);
            }
            else {
                this._$createPullRequestCheckbox.prop("checked", false);
            }
        }
        return this._$createPullRequestCheckbox.is(":checked");
    }

    public onOkClick(e?: JQueryEventObject): any {
        const createBranchResult = <VCControlsCommon.CreateBranchParameters>this.getDialogResult();

        if (this._linkedArtifactsControl && this._workItemIdsToShow.length > 0 && createBranchResult) {
            const pageContext = Context.getPageContext();
            const newBranchSpec = new VCSpecs.GitBranchVersionSpec(createBranchResult.branchName);
            const branchArtifact = new GitRefArtifact({
                projectGuid: pageContext.webContext.project.id,
                repositoryId: this._repositoryContext.getRepositoryId(),
                refName: newBranchSpec.toVersionString()
            });

            addWorkItemsBatchAsync(branchArtifact.getUri(), "Branch", this._workItemIdsToShow).then(
                (result) => { },
                (error) => {
                    this.setDialogResult($.extend(createBranchResult, { error: error }));
                })
                .then(() => {
                    super.onOkClick(e);
                });
        }
        else {
            super.onOkClick(e);
        }
    }

    private _validateInputs(): boolean {
        const branchName: string = this._$branchNameInput.val() || "";
        const validationResult = this._branchNameValidator.validate(branchName);

        if (this._isBranchNameDirty) {
            this._setErrorMessage(validationResult.error);
        }

        let inputsComplete = validationResult.allValid && !!branchName;

        // Disable OK button if there is no selected version.
        const selectedVersion = this._selectedVersionSpec;
        if (!selectedVersion) {
            inputsComplete = false;
        }

        this.updateOkButton(inputsComplete);

        return inputsComplete;
    }

    public _setErrorMessage(error: string) {
        this._$errorMessage.text(error);
        this._$errorMessage.toggle(!!error);
        this._$branchNameInput.toggleClass("invalid", !!error);
        this._$branchNameInput.attr("aria-invalid", !!error + "");
    }

    public handleError(error: string): void {
        Diag.Debug.assert(false, error);
        Diag.logError(error);
    }

    private _onRemoveWorkItem(workItemId: number): void {
        const index = this._workItemIdsToShow.indexOf(workItemId);
        if (index > -1) {
            this._workItemIdsToShow.splice(index, 1);

            Telemetry.publishEvent(new Telemetry.TelemetryEventData(
                CustomerIntelligenceConstants.VERSION_CONTROL_AREA,
                CustomerIntelligenceConstants.RELATED_WORK_ITEMS_DELETE, {
                    "hostArtifactId": null,
                    "contextId": CreateBranchDialogBase.CONTEXT_ID,
                    "workItemId": workItemId
                }));

            this._updateLinkedArtifacts();
        }
    }

    private _onAddWorkItem(workItemId: number): void {
        if (!Utils_Array.contains(this._workItemIdsToShow, workItemId)) {
            this._workItemIdsToShow.push(workItemId);

            this._updateLinkedArtifacts();
        }
    }

    private _updateLinkedArtifacts(): void {
        this._linkedArtifactsControl.setLinkedArtifacts(this._workItemIdsToShow.map(mapWorkItemIdToLinkedArtifact));
    }
}
