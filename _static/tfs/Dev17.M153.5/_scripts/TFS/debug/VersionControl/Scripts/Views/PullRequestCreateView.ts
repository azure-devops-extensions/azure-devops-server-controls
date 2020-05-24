/// <amd-dependency path='VSS/LoaderPlugins/Css!PullRequestsView' />

import ko = require("knockout");

import Controls = require("VSS/Controls");
import Navigation_Services = require("VSS/Navigation/Services");
import Performance = require("VSS/Performance");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import Utils_Core = require("VSS/Utils/Core");
import VCResources = require("VersionControl/Scripts/Resources/TFS.Resources.VersionControl");
import VCSpecs = require("VersionControl/Scripts/TFS.VersionControl.VersionSpecs");
import * as CustomerIntelligenceConstants from "VersionControl/Scripts/CustomerIntelligenceConstants";
import * as GitRefUtility from "VersionControl/Scripts/GitRefUtility";
import {GitRepositoryContext} from "VersionControl/Scripts/GitRepositoryContext";
import VCGitVersionSelectorMenu = require("VersionControl/Scripts/Controls/GitVersionSelectorMenu");
import VCPullRequestsControls = require("VersionControl/Scripts/Controls/PullRequest");
import VCPullRequestsCreateNewTab = require("VersionControl/Scripts/Views/Tabs/PullRequestsCreateNewTab");
import VCPullRequestCreateViewViewModel = require("VersionControl/Scripts/ViewModels/PullRequestCreateViewViewModel");
import VCPullRequestViewBase = require("VersionControl/Scripts/Views/PullRequestBaseView");
import VSS = require("VSS/VSS");
import { DiscussionRenderer } from "Discussion/Scripts/DiscussionRenderer";
import MentionAutocomplete = require("Mention/Scripts/TFS.Mention.Autocomplete");
import MentionAutocompleteControls = require("Mention/Scripts/TFS.Mention.Autocomplete.Controls");
import MentionWorkItems = require("Mention/Scripts/TFS.Mention.WorkItems");
import "Mention/Scripts/TFS.Mention.WorkItems.Registration";  // to register work-item mention parser and provider
import "Mention/Scripts/TFS.Mention.People.Registration"; // to register people mention parser and provider
import MentionPeople = require("Mention/Scripts/TFS.Mention.People");

import delegate = Utils_Core.delegate;
import TfsContext = TFS_Host_TfsContext.TfsContext;

export class PullRequestCreateView extends VCPullRequestViewBase.PullRequestViewBase {
    private _viewModel: VCPullRequestCreateViewViewModel.ViewViewModel;

    private _gitVersionMenuSource: VCGitVersionSelectorMenu.GitVersionSelectorMenu;
    private _gitVersionMenuTarget: VCGitVersionSelectorMenu.GitVersionSelectorMenu;

    private _defaultTargetBranch: VCSpecs.GitBranchVersionSpec;

    private _renderer: DiscussionRenderer;
    private _descriptionInput: JQuery;

    private _performance: Performance.IScenarioDescriptor = Performance.getScenarioManager().startScenarioFromNavigation(
        CustomerIntelligenceConstants.VERSION_CONTROL_AREA,
        CustomerIntelligenceConstants.PULL_REQUEST_CREATE_FEATURE, true);

    constructor(options?) {
        super($.extend({
            attachNavigate: true,
            titleElementSelector: ".vc-page-title",
        }, options));

        this._renderer = new DiscussionRenderer();
    }

    public initializeOptions(options?) {
        const tabs = {};
        tabs[VCPullRequestsControls.PullRequestsActions.CREATENEW] = VCPullRequestsCreateNewTab.CreateNewTab;

        super.initializeOptions($.extend({
            tabs: tabs,
            hubContentSelector: ".versioncontrol-pullrequests-content",
            pivotTabsSelector: ".vc-pullrequest-tabs",
            showPullRequestSuggestion: false,
        }, options));
    }

    public initialize(options?) {
        this._customerIntelligenceData.setView("PullRequestCreateView");
        if (this._performance) {
            this._performance.addSplitTiming("startedInitialization");
        }
        this._defaultTargetBranch = <VCSpecs.GitBranchVersionSpec>GitRefUtility.refNameToVersionSpec(this._repositoryContext.getRepository().defaultBranch);

        this._initializeViewModel(<GitRepositoryContext>this._repositoryContext, {
            projectGuid: this._options.projectGuid,
            vcUserPreferences: this._options.vcUserPreferences
        });

        if (!this._emptyRepository) {
            this._gitVersionMenuSource = <VCGitVersionSelectorMenu.GitVersionSelectorMenu>Controls.BaseControl.createIn(
                VCGitVersionSelectorMenu.GitVersionSelectorMenu, this._element.find(".vc-pullrequest-branches-container-source"), <VCGitVersionSelectorMenu.GitVersionSelectorMenuOptions>{
                    onItemChanged: delegate(this, this._onSourceBranchChanged),
                    disableTags: true,
                    waitOnFetchedItems: true,
                    customerIntelligenceData: this._customerIntelligenceData.clone()
                });
            this._gitVersionMenuSource.setRepository(<GitRepositoryContext>this._repositoryContext);

            this._gitVersionMenuTarget = <VCGitVersionSelectorMenu.GitVersionSelectorMenu>Controls.BaseControl.createIn(
                VCGitVersionSelectorMenu.GitVersionSelectorMenu, this._element.find(".vc-pullrequest-branches-container-target"), <VCGitVersionSelectorMenu.GitVersionSelectorMenuOptions>{
                    onItemChanged: delegate(this, this._onTargetBranchChanged),
                    disableTags: true,
                    waitOnFetchedItems: true,
                    customerIntelligenceData: this._customerIntelligenceData.clone()
                });
            this._gitVersionMenuTarget.setRepository(<GitRepositoryContext>this._repositoryContext);
        }

        super.initialize();

        this._bindViewModel();

        if (this._performance) {
            this._performance.addSplitTiming("initialized");
        }
    }

    public parseStateInfo(action: string, rawState: any, callback: IResultCallback) {
        const state: any = {};
        this.setState(state);

        state.viewModel = this._viewModel;
        state.repositoryContext = this._repositoryContext;

        if (rawState.sourceRef) {
            state.sourceRef = decodeURIComponent(rawState.sourceRef);
        }
        if (rawState.targetRef) {
            state.targetRef = decodeURIComponent(rawState.targetRef);
        }

        if (this._emptyRepository) {
            this._showEmptyRepositoryView();
            this.setHubPivotVisibility(false);
            return;
        }

        callback(VCPullRequestsControls.PullRequestsActions.CREATENEW, state);
    }

    public onNavigate(state: any) {

        if (this._emptyRepository) {
            // Mark that the initial update for an empty repository is complete.
            this._initialUpdateComplete('createNewPullRequestsTabComplete');
            return;
        }

        this.setWindowTitle(VCResources.PullRequest_CreatePullRequestTitle);
        this._updateViewToShowCreateNew(state.sourceRef, state.targetRef);
    }

    private _initializeViewModel(repositoryContext: GitRepositoryContext, options?) {
        this._viewModel = new VCPullRequestCreateViewViewModel.ViewViewModel(repositoryContext, options);
    }

    private _bindViewModel() {
        const titleElement = this._element.find('.vc-page-title-area');

        if (titleElement) {
            ko.applyBindings(this._viewModel, titleElement[0]);
        }

        this._viewModel.createNewPullRequestViewModel.sourceBranchName.subscribe((newValue) => {
            this._sourceBranchUpdated();
        });
        this._sourceBranchUpdated();

        this._viewModel.createNewPullRequestViewModel.targetBranchName.subscribe((newValue) => {
            this._targetBranchUpdated();
        });
        this._targetBranchUpdated();
    }

    private _initialUpdateComplete(scenarioName: string) {
        if (this._performance) {
            this._performance.addSplitTiming(scenarioName);
            this._performance.end();
            this._performance = null;
        }

        this._renderMarkdown();
    }

    private _updateViewToShowCreateNew(sourceRef?: any, targetRef?: any) {
        this.setHubPivotVisibility(false);

        // Set the source / target refs on the create pull request ViewModel
        let targetBranch, sourceBranch;

        // If the source ref was not specified and
        // we want to set it to the dataIslandSourceRef unless that doesn't exist in which case fall back to the default git branch
        if (!sourceRef) {
            if (this._viewModel.createNewPullRequestViewModel.dataIslandSourceRef) {
                sourceRef = this._viewModel.createNewPullRequestViewModel.dataIslandSourceRef
            }
            else if ((!this._defaultTargetBranch) || (this._defaultGitBranchName !== this._defaultTargetBranch.branchName)) {
                sourceRef = this._defaultGitBranchName;
            }
        }

        if (sourceRef) {
            sourceBranch = new VCSpecs.GitBranchVersionSpec(sourceRef);
        }
        else {
            sourceBranch = null;
        }

        // If the target ref was not specified, we want to use the ref in the data island
        // unless that also doesn't exist in which case fall back to the defaultTargetBranch
        if (!targetRef) {
            if (this._viewModel.createNewPullRequestViewModel.dataIslandTargetRef) {
                targetRef = this._viewModel.createNewPullRequestViewModel.dataIslandTargetRef;
            }
            else if (this._defaultTargetBranch) {
                targetRef = this._defaultTargetBranch.branchName;
            }
        }

        if (targetRef) {
            targetBranch = new VCSpecs.GitBranchVersionSpec(targetRef);
        }
        else {
            targetBranch = null;
        }

        $('.vc-pullrequest-create-titleArea').show();

        this._viewModel.createNewPullRequestViewModel.setBranchNamesWithPromise(
            sourceBranch ? sourceBranch.branchName : null,
            targetBranch ? targetBranch.branchName : null,
            true).done(() => this._initialUpdateComplete('createNewPullRequestsTabComplete'));

        this._descriptionInput = this._element.find(".vc-pullrequest-description-input");

        this._descriptionInput.on('change keyup paste', () => {
            this._renderMarkdown();
        });

        Controls.Enhancement.enhance(MentionAutocompleteControls.AutocompleteEnhancement, this._descriptionInput, this._getAutocompleteOptions());
    }

    private _onSourceBranchChanged(selectedVersion: any) {
        if (!this._shouldSwitchBranches()) {
            this._sourceBranchUpdated();
            return;
        }

        const sourceBranchName = selectedVersion ? selectedVersion.branchName : "";

        Navigation_Services.getHistoryService().addHistoryPoint(null, { sourceRef: encodeURIComponent(sourceBranchName) }, null, true);

        this._viewModel.createNewPullRequestViewModel.setSourceBranchName(sourceBranchName).done(() => { this._renderMarkdown(); });
    }

    private _onTargetBranchChanged(selectedVersion: any) {
        if (!this._shouldSwitchBranches()) {
            this._targetBranchUpdated();
            return;
        }

        const targetBranchName = selectedVersion ? selectedVersion.branchName : "";

        Navigation_Services.getHistoryService().addHistoryPoint(null, { targetRef: encodeURIComponent(targetBranchName) }, null, true);

        this._viewModel.createNewPullRequestViewModel.setTargetBranchName(targetBranchName).done(() => { this._renderMarkdown(); });
    }

    private _shouldSwitchBranches() {
        //return true if we want to allow the branch switch to take place
        const createPrTab: VCPullRequestsCreateNewTab.CreateNewTab = <VCPullRequestsCreateNewTab.CreateNewTab>this.getTab(VCPullRequestsControls.PullRequestsActions.CREATENEW);
        if (createPrTab.isDirty()) {
            return confirm(VCResources.CreatePullRequestModified);
        }

        return true;
    }

    private _sourceBranchUpdated() {

        // If _gitVersionMenuSource is not present, then there is nothing to do.
        // This control might not be present if it will never be displayed on this page
        // (for instance, in the case where this repository is empty and contains no branches).
        if (this._gitVersionMenuSource) {
            const sourceBranchName: string = this._viewModel.createNewPullRequestViewModel.sourceBranchName();
            const sourceBranchSpec: VCSpecs.GitBranchVersionSpec = sourceBranchName ? new VCSpecs.GitBranchVersionSpec(sourceBranchName) : null;

            this._gitVersionMenuSource.setSelectedVersion(sourceBranchSpec);
        }
    }

    private _targetBranchUpdated() {

        // If _gitVersionMenuTarget is not present, then there is nothing to do.
        // This control might not be present if it will never be displayed on this page
        // (for instance, in the case where this repository is empty and contains no branches).
        if (this._gitVersionMenuTarget) {
            const targetBranchName: string = this._viewModel.createNewPullRequestViewModel.targetBranchName();
            const targetBranchSpec: VCSpecs.GitBranchVersionSpec = targetBranchName ? new VCSpecs.GitBranchVersionSpec(targetBranchName) : null;

            this._gitVersionMenuTarget.setSelectedVersion(targetBranchSpec);
        }
    }

    private _renderMarkdown() {
        const description = this._descriptionInput.val();

        const $markdownPreviewContainer = this._element.find(".vc-pullrequest-description-markdown-preview");

        this._renderer.render(description).then((output: JQuery) => {
            $markdownPreviewContainer.empty();
            $markdownPreviewContainer.append(output);
        });
    }

    private _getAutocompleteOptions(): MentionAutocompleteControls.IAutocompleteOptions {
        return {
            select: (replacement: MentionAutocomplete.IAutocompleteReplacement) => {
                //selecting an item doesn't trigger descriptionInput.change() so manually set the view model's description and re-render the markdown
                this._viewModel.createNewPullRequestViewModel.createEditControlViewModel.description(this._descriptionInput.val());
                this._renderMarkdown();
            }
        };
    }
}

VSS.classExtend(PullRequestCreateView, TfsContext.ControlExtensions);

Controls.Enhancement.registerEnhancement(PullRequestCreateView, ".versioncontrol-pullrequest-create-view");
