/// <reference types="jquery" />
/// <amd-dependency path='VSS/LoaderPlugins/Css!VersionControlControls' />

import ko = require("knockout");
import Q = require("q");

import Controls = require("VSS/Controls");
import Events_Document = require("VSS/Events/Document");
import FeatureAvailability_Services = require("VSS/FeatureAvailability/Services");
import IdentityPickerControls = require("VSS/Identities/Picker/Controls");
import IdentityPickerRestClient = require("VSS/Identities/Picker/RestClient");
import IdentityPickerServices = require("VSS/Identities/Picker/Services");
import { IdentityRef } from "VSS/WebApi/Contracts";
import Navigation = require("VSS/Controls/Navigation");
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import Utils_UI = require("VSS/Utils/UI");

import ServerConstants = require("Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import TFS_OM_Common = require("Presentation/Scripts/TFS/TFS.OM.Common");

import { CustomerIntelligenceData } from "VersionControl/Scripts/CustomerIntelligenceData";
import { GitRepositoryContext } from "VersionControl/Scripts/GitRepositoryContext";
import { IdentityHelper } from "VersionControl/Scenarios/PullRequestCreate/Helpers";
import VCBranchesDiffChangeListControl = require("VersionControl/Scripts/Controls/BranchesDiffChangeListControl");
import VCPullRequestCreateViewViewModel = require("VersionControl/Scripts/ViewModels/PullRequestCreateViewViewModel");
import VCPullRequestsControls = require("VersionControl/Scripts/Controls/PullRequest");
import VCPullRequestsCreateViewModel = require("VersionControl/Scripts/ViewModels/PullRequestsCreateViewModel");
import VCRelatedWorkItemsControl = require("VersionControl/Scripts/Controls/RelatedWorkItemsControl");
import VCResources = require("VersionControl/Scripts/Resources/TFS.Resources.VersionControl");
import VCSpecs = require("VersionControl/Scripts/TFS.VersionControl.VersionSpecs");
import VCWebAccessContracts = require("VersionControl/Scripts/Generated/TFS.VersionControl.WebAccess.Contracts");

import delegate = Utils_Core.delegate;
import domElem = Utils_UI.domElem;
import TfsContext = TFS_Host_TfsContext.TfsContext;

export class CreateNewTab extends Navigation.NavigationViewTab implements VCRelatedWorkItemsControl.IRelatedWorkItemsControlHost {
    private _createNewPullRequestDiv: any;
    private _pivotView: Navigation.PivotView;
    private _summaryControl: VCBranchesDiffChangeListControl.DiffChangeListControl;
    private _commitsTitle: any;
    private _filesTitle: any;
    private _filesTitleContainer: any;

    // these control whether or not we use the common identity picker or the legacy
    // identity picker
    private _reviewersPickerControl: IdentityPickerControls.IdentityPickerSearchControl;
    private _relatedArtifactsControl: VCRelatedWorkItemsControl.RelatedWorkItemsControl;

    private _viewModel: VCPullRequestCreateViewViewModel.ViewViewModel;
    private _repositoryContext: GitRepositoryContext;
    private _viewModelBound = false;

    private _commitCount: number = 0;
    private _fileCount: number = 0;
    private _fileCountServerValidationReady: boolean = false;

    private static REVIEWER_PICKER_CONSUMER_ID = "6a427cd8-356a-4fd7-a1f8-9ff88bc2dbe4"; //this is a randomly generated guid which is used for telemetry by the common identity picker
    private static COMMIT_PIVOT_ID: string = "commits-pivot-id";
    private static FILES_PIVOT_ID: string = "files-pivot-id";

    public static _MAX_NUMBER_OF_COMMITS_TO_SHOW: number = 5;

    public hasAnyCreatePRDetailsModified: KnockoutObservable<boolean>;

    private _documentsEntryForDirtyCheck: Events_Document.RunningDocumentsTableEntry;

    private _versionList = null;

    constructor(options?) {
        super($.extend({
            coreCssClass: "vc-change-summary"
        }, options));

        this.hasAnyCreatePRDetailsModified = ko.observable(false);
    }

    public initialize(): void {
        super.initialize();

        this._createNewPullRequestDiv = $(domElem('div', 'vc-pullrequest-createnewpullrequest-control')).appendTo(this._element);
        this._relatedArtifactsControl = null;

        this._pivotView = <Navigation.PivotView>Controls.BaseControl.createIn(Navigation.PivotView, $(domElem('div')).appendTo(this._element), {
            items: [
                {
                    id: CreateNewTab.FILES_PIVOT_ID,
                    text: VCResources.PullRequest_Pivot_Files
                },
                {
                    id: CreateNewTab.COMMIT_PIVOT_ID,
                    text: VCResources.PullRequest_Pivot_Commits
                }
            ],
        });

        this._pivotView._bind("changed", delegate(this, this._onPivotChanged));

        this._documentsEntryForDirtyCheck = Events_Document.getRunningDocumentsTable().add("PullRequestsCreateViewModel", this);
    }

    public isDirty(): boolean {
        return (this.hasAnyCreatePRDetailsModified() &&
            this._viewModel.createNewPullRequestViewModel.canCreatePullRequest &&
            !this._viewModel.createNewPullRequestViewModel.pullRequestCreationCompleted());
    }

    public dispose(): void {
        super.dispose();

        if (this._documentsEntryForDirtyCheck) {
            Events_Document.getRunningDocumentsTable().remove(this._documentsEntryForDirtyCheck);
            this._documentsEntryForDirtyCheck = null;
        }
    }

    public onNavigate(rawState: any, parsedState: any): void {
        CustomerIntelligenceData.publishFirstTabView("PullRequestsCreateNewTab", parsedState, this._options);

        if (!this._viewModelBound) {
            this._viewModel = <VCPullRequestCreateViewViewModel.ViewViewModel>parsedState.viewModel;
            this._repositoryContext = <GitRepositoryContext>parsedState.repositoryContext;
            this._applyBinding();

            this._relatedArtifactsControl = <VCRelatedWorkItemsControl.RelatedWorkItemsControl>Controls.BaseControl.createIn(VCRelatedWorkItemsControl.RelatedWorkItemsControl, $('.vc-pullrequest-create-workitems-panel'), {
                repositoryContext: this._repositoryContext,
                host: this
            });

            this._commitsTitle = $(domElem('span', 'vc-pullrequest-create-commits-title')).appendTo($(domElem('div', 'vc-pullrequest-create-commits-title-div')).appendTo(this._element));

            this._filesTitleContainer = $(domElem('div', 'vc-pullrequest-create-files-container')).appendTo(this._element);
            this._filesTitle = $(domElem('span', 'vc-pullrequest-create-files-title')).appendTo(this._filesTitleContainer);

            this._summaryControl = <VCBranchesDiffChangeListControl.DiffChangeListControl>Controls.BaseControl.createIn(VCBranchesDiffChangeListControl.DiffChangeListControl, this._element, {
                tfsContext: TfsContext.getDefault(),
                title: this._repositoryContext.getRepository().name,
                noChangesMessage: VCResources.NoChangesMessage
            });

            this._hideSummaryControls();

            this._viewModelBound = true;
        }
    }

    public getHostControlContextId(): string {
        return "pullRequestCreationContext";
    }

    public getWorkItemsAsync(): IPromise<number[]> {
        const workItemIdsDeferred = Q.defer<number[]>();
        if (this._versionList && this._versionList.length > 0 && (this._versionList[0] instanceof VCSpecs.GitBranchVersionSpec)) {
            this._versionList[0].branchName = Utils_UI.htmlEncode(this._versionList[0].branchName);
        }
        this._repositoryContext.getClient().beginGetAssociatedWorkItems(this._repositoryContext, this._versionList.map(x => x.toVersionString()),
            (workItems) => {
                const workItemIds = workItems.map(workItem => workItem.id);
                this._viewModel.setWorkItemIds(workItemIds);
                workItemIdsDeferred.resolve(workItemIds);
            });

        return workItemIdsDeferred.promise;
    }

    public onRemoveWorkItem(workItemId: number): void {
        this._viewModel.onRemoveWorkItem(workItemId);
        this.hasAnyCreatePRDetailsModified(true);
    }

    public onAddWorkItem(workItemId: number): void {
        this._viewModel.onAddWorkItem(workItemId);
        this.hasAnyCreatePRDetailsModified(true);
    }

    public handleError(error: string): void {
        this._viewModel.handleError(error);
    }

    private _applyBinding(): void {
        const notificationElement = $(domElem('div'))
            .attr("data-bind", "template: { name: 'vc-pullrequest-notification-ko' }")
            .appendTo(this._createNewPullRequestDiv);

        ko.applyBindings(this._viewModel.createNewPullRequestViewModel, notificationElement[0]);

        const createNewForm = $(domElem('div'))
            .attr("data-bind", "template: { name: 'vc-pullrequest-createNew-ko', data: createNewPullRequestViewModel }")
            .appendTo(this._createNewPullRequestDiv);

        ko.applyBindings(this._viewModel, createNewForm[0]);

        this._viewModel.createNewPullRequestViewModel.sourceBranchName.subscribe((newValue) => {
            this.hasAnyCreatePRDetailsModified(false);
            this._sourceOrTargetBranchUpdated();
        });

        this._viewModel.createNewPullRequestViewModel.targetBranchName.subscribe((newValue) => {
            this.hasAnyCreatePRDetailsModified(false);
            this._sourceOrTargetBranchUpdated();
        });

        this._viewModel.createNewPullRequestViewModel.serverValidationComplete.subscribe((newValue) => {
            this._serverValidationUpdated();
        });

        this._viewModel.createNewPullRequestViewModel.changeModelAvailable.subscribe((newValue) => {
            this._changeModelAvailableUpdated();
        });

        this._viewModel.createNewPullRequestViewModel.createEditControlViewModel.createMode.subscribe((mode) => {
            this._resetIdentityControl(true);
        });

        this._viewModel.createNewPullRequestViewModel.createEditControlViewModel.description.subscribe((newValue) => {
            if (newValue != this._viewModel.createNewPullRequestViewModel.defaultDescription) {
                this.hasAnyCreatePRDetailsModified(true);
            }
        });

        this._viewModel.createNewPullRequestViewModel.createEditControlViewModel.title.subscribe((newValue) => {
            if (newValue != this._viewModel.createNewPullRequestViewModel.defaultTitle) {
                this.hasAnyCreatePRDetailsModified(true);
            }
        });

        this._sourceOrTargetBranchUpdated();
    }

    private _onPivotChanged(event, view): void {
        this._updatePivotView(!this._viewModel.createNewPullRequestViewModel.canCreatePullRequest);
    }

    /**
     * Creates an identity picker element, unless one already exists or we are in "basic" mode, where none is shown.
     * @returns A promise representing whether or not the picker was actually created (if it already exist it, this will return false).
     */
    private _createIdentityPicker(): boolean {
        if (this._reviewersPickerControl != null) {
            return false; // we already have a picker
        }

        if (this._viewModel.createNewPullRequestViewModel.createEditControlViewModel.createMode() === VCWebAccessContracts.CodeReviewCreateMode.Basic) {
            return false; // we don't need to display the control
        }

        const $reviewersContainer = $(domElem('div', 'vc-pullrequest-create-reviewers-container')).appendTo($('.vc-pullrequest-create-reviewers-panel'));

        const tfsContext: TfsContext = TfsContext.getDefault();
        const operationScope: IdentityPickerServices.IOperationScope = {
                    IMS: true,
                    Source: true,
                };
        const identityType: IdentityPickerServices.IEntityType = {
                    User: true,
                    Group: true
                };
        this._reviewersPickerControl = Controls.create(IdentityPickerControls.IdentityPickerSearchControl, $reviewersContainer, {
                    operationScope: operationScope,
                    identityType: identityType,
                    multiIdentitySearch: true,
                    showMruTriangle: true,
                    showMru: true,
                    showContactCard: true,
                    callbacks: {
                onItemSelect: (item: IdentityPickerRestClient.IEntity) => {
                            this._reviewersPickerControl.addIdentitiesToMru([item]);
                        }
                    },
                    consumerId: CreateNewTab.REVIEWER_PICKER_CONSUMER_ID
                });

                this._viewModel.createNewPullRequestViewModel.options = $.extend({
                    ok: () => {
                        this._onIdentitiesChanged();
                    }
                }, this._viewModel.createNewPullRequestViewModel.options);

        return true;
    }

    /**
     * When a user selects a new identity in the picker, update the model.
     */
    private _onIdentitiesChanged(): void {
        // note that we don't need a check for the picker here
        // because identities will only change when the picker changes

        this._viewModel.createNewPullRequestViewModel.createEditControlViewModel.updateReviewers(
            $.map(this._reviewersPickerControl.getIdentitySearchResult().resolvedEntities, IdentityHelper.transformIEntityToIdentityRef));
        }

    /**
     * Encapsulates the default set of reviewers on create.
     */
    private _defaultReviewers(): IdentityRef[] {
        const identity: TFS_Host_TfsContext.IContextIdentity = this._repositoryContext.getTfsContext().currentTeam.identity;
        return [{
            id: identity.id,
            isAadIdentity: false,
            displayName: identity.displayName
        } as IdentityRef];
    }

    /**
     * Reset the state of the identity picker (typically on first load, if it is displayed).
     */
    private _resetIdentityControl(onlyResetOnCreate: boolean): void {
        if (this._viewModel.createNewPullRequestViewModel.createEditControlViewModel.createMode() === VCWebAccessContracts.CodeReviewCreateMode.Basic) {
            return; // we don't need to display the control
        }

        // make sure the identity picker is created before we do anything
        const result = this._createIdentityPicker();
            if (onlyResetOnCreate && !result) {
                return; // identity picker was already around, so don't reset it
            }

            this._reviewersPickerControl.clear();
            this._reviewersPickerControl.setEntities([], this._defaultReviewers().map(x => x.id));
    }

    private _sourceOrTargetBranchUpdated(): void {
        let sourceBranchContainer: JQuery,
            targetBranchContainer: JQuery;

        const invalidSelection: string = 'invalid-selection';

        sourceBranchContainer = $('.vc-pullrequest-branches-container-source');
        if (sourceBranchContainer) {

            // If there is a source branch: remove the invalid-selection class if it is applied
            // Otherwise, there is no source branch: add the invalid-selection class if it is not already applied
            if (this._viewModel.createNewPullRequestViewModel.sourceBranchName()) {

                // There is a source branch, if there is an invalid-selection class applied, remove it.
                if (sourceBranchContainer.hasClass(invalidSelection)) {
                    sourceBranchContainer.removeClass(invalidSelection);
                }
            }
            else if (!sourceBranchContainer.hasClass(invalidSelection)) {
                sourceBranchContainer.addClass(invalidSelection);
            }
        }

        targetBranchContainer = $('.vc-pullrequest-branches-container-target');
        if (targetBranchContainer) {

            // If there is a target branch: remove the invalid-selection class if it is applied
            // Otherwise, there is no target branch: add the invalid-selection class if it is not already applied
            if (this._viewModel.createNewPullRequestViewModel.targetBranchName()) {
                if (targetBranchContainer.hasClass(invalidSelection)) {
                    targetBranchContainer.removeClass(invalidSelection);
                }
            }
            else if (!targetBranchContainer.hasClass(invalidSelection)) {
                targetBranchContainer.addClass(invalidSelection);
            }
        }

        this._resetPivotView();
    }

    private _serverValidationUpdated(): void {
        // we need to set a default state for the set of reviewers
        // if the identity picker is hidden because of basic mode
        if (!this._reviewersPickerControl && this._viewModel.createNewPullRequestViewModel.createEditControlViewModel.createMode() === VCWebAccessContracts.CodeReviewCreateMode.Basic) {
            this._viewModel.createNewPullRequestViewModel.createEditControlViewModel.updateReviewers(this._defaultReviewers());
        }
        
        if (this._viewModel.createNewPullRequestViewModel.serverValidationComplete() && this._viewModel.createNewPullRequestViewModel.canCreatePullRequest) {
            this._canCreatePullRequest();
        }
        else {
            this._cannotCreatePullRequest();
        }
    }

    private _canCreatePullRequest(): void {
        const targetBranchVersionString = new VCSpecs.GitBranchVersionSpec(this._viewModel.createNewPullRequestViewModel.targetBranchName()).toVersionString(),
            sourceBranchVersionString = new VCSpecs.GitBranchVersionSpec(this._viewModel.createNewPullRequestViewModel.sourceBranchName()).toVersionString();

        const history: any = this._viewModel.createNewPullRequestViewModel.historyList;

        this._commitCount = history.results.length;
        this._resetPivotView();

        const versionList = history.results.map(x => new VCSpecs.GitCommitVersionSpec(x.changeList.commitId.full));
        versionList.unshift(new VCSpecs.GitBranchVersionSpec(this._viewModel.createNewPullRequestViewModel.sourceBranchName()));
        this._versionList = versionList;
        // clear existing artifacts and cache so a different set of work items
        // is displayed each time the source branch is changed and new commits are found
        this._relatedArtifactsControl.bind(null);

        this._viewModel.createNewPullRequestViewModel.createEditControlViewModel.show();
        this._resetIdentityControl(false);
    }

    private _cannotCreatePullRequest(): void {
        this._resetPivotView();
        this._resetIdentityControl(false);
        this._hideAllComponents(true);
    }

    private _changeModelAvailableUpdated(): void {
        let oversion: string;

        if (this._viewModel.createNewPullRequestViewModel.changeModelAvailable()) {
            if (this._viewModel.createNewPullRequestViewModel.changeListModel.commitId) {
                oversion = new VCSpecs.GitCommitVersionSpec(this._viewModel.createNewPullRequestViewModel.changeListModel.commitId.full).toVersionString();
            }

            this._summaryControl.setModel(this._repositoryContext, this._viewModel.createNewPullRequestViewModel.changeListModel,
                oversion,
                this._viewModel.createNewPullRequestViewModel.changeListModel.version);

            this._fileCount = this._summaryControl.getTotalFileCount();
            this._fileCountServerValidationReady = true;
            this._updateCommitsAndFilePivotTitle();
        }
    }

    private _resetPivotView(): void {
        this._pivotView.setSelectedView(this._pivotView.getView(CreateNewTab.FILES_PIVOT_ID));
        this._updatePivotView(!this._viewModel.createNewPullRequestViewModel.canCreatePullRequest);
    }

    private _updatePivotView(hideCreateControl: boolean): void {
        this._hideAllComponents(hideCreateControl);

        if (this._viewModel.createNewPullRequestViewModel.canCreatePullRequest) {
            if (this._commitCount < CreateNewTab._MAX_NUMBER_OF_COMMITS_TO_SHOW) {

                this._pivotView.hideElement();

                if (this._commitsTitle) {
                    if (this._commitCount >= VCPullRequestsControls.MAX_CHANGES_TO_FETCH) {
                        this._commitsTitle.text(VCResources.PullRequest_CommitsSectionTitleAboveMax);
                    }
                    else {
                        this._commitsTitle.text(Utils_String.format(VCResources.PullRequest_CommitsSectionTitle, this._commitCount));
                    }
                    this._commitsTitle.show();
                }

                if (this._filesTitleContainer) {
                    if (this._fileCount + 1 >= VCPullRequestsControls.MAX_CHANGES_TO_FETCH) {
                        this._filesTitle.text(VCResources.PullRequest_FilesSectionTitleAboveMax);
                    }
                    else {
                        this._filesTitle.text(Utils_String.format(VCResources.PullRequest_FilesSectionTitle, this._fileCount));
                    }
                    this._filesTitleContainer.show();
                }
                this._showSummaryControls();
            }
            else {
                this._pivotView.showElement();

                this._updateCommitsAndFilePivotTitle();

                if (this._commitsTitle) {
                    this._commitsTitle.hide();
                }

                if (this._filesTitleContainer) {
                    this._filesTitleContainer.hide();
                }

                if (this._pivotView.getSelectedView().id === CreateNewTab.COMMIT_PIVOT_ID) {
                    this._hideSummaryControls();
                }
                else {
                    this._showSummaryControls();
                }
            }
        }
    }

    private _updateCommitsAndFilePivotTitle(): void {
        let commitsViewTitle = Utils_String.format(VCResources.PullRequest_CommitsSectionTitle, this._commitCount);
        if (this._commitCount >= VCPullRequestsControls.MAX_CHANGES_TO_FETCH) {
            commitsViewTitle = VCResources.PullRequest_CommitsSectionTitleAboveMax;
        }
        this._pivotView.getView(CreateNewTab.COMMIT_PIVOT_ID).text = commitsViewTitle;

        if (this._fileCountServerValidationReady) {
            let filesViewTitle = Utils_String.format(VCResources.PullRequest_FilesSectionTitle, this._fileCount);
            if (this._fileCount + 1 >= VCPullRequestsControls.MAX_CHANGES_TO_FETCH) {
                filesViewTitle = VCResources.PullRequest_FilesSectionTitleAboveMax;
            }
            this._filesTitle.text(filesViewTitle);
            this._pivotView.getView(CreateNewTab.FILES_PIVOT_ID).text = filesViewTitle;
        }

        this._pivotView.updateItems();
    }

    private _hideAllComponents(hideCreateControl: boolean): void {
        if (hideCreateControl) {
            this._viewModel.createNewPullRequestViewModel.createEditControlViewModel.hide();
        }

        this._pivotView.hideElement();

        if (this._commitsTitle) {
            this._commitsTitle.hide();
        }

        if (this._filesTitleContainer) {
            this._filesTitleContainer.hide();
        }

        this._hideSummaryControls();
    }

    private _hideSummaryControls(): void {
        if (this._summaryControl) {
            this._summaryControl.hideElement();
        }
    }

    private _showSummaryControls(): void {
        if (this._summaryControl) {
            this._summaryControl.showElement();
        }
    }
}
