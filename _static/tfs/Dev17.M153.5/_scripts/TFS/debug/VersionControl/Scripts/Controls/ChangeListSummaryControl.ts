/// <amd-dependency path='VSS/LoaderPlugins/Css!VersionControlControls' />

import Controls = require("VSS/Controls");
import Diag = require("VSS/Diag");
import DiscussionOM = require("Presentation/Scripts/TFS/TFS.Discussion.OM");
import IdentityImage = require("Presentation/Scripts/TFS/TFS.IdentityImage");
import { IMenuItemSpec } from "VSS/Controls/Menus";
import Panels = require("VSS/Controls/Panels");
import VSS = require("VSS/VSS");
import Utils_UI = require("VSS/Utils/UI");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import Utils_Date = require("VSS/Utils/Date");

import VCAssociatedWorkItemsPanel = require("VersionControl/Scripts/Controls/AssociatedWorkItemsPanel");
import VCLegacyContracts = require("VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts");
import VCChangeModel = require("VersionControl/Scripts/ChangeModel");
import { ChangeExplorerGridDisplayMode } from "VersionControl/Scripts/Generated/TFS.VersionControl.WebAccess.Contracts";
import { GitRepositoryContext } from "VersionControl/Scripts/GitRepositoryContext";
import { RepositoryContext, RepositoryType } from "VersionControl/Scripts/RepositoryContext";
import * as VersionControlUrls from "VersionControl/Scripts/VersionControlUrls";
import * as GitRefUtility from "VersionControl/Scripts/GitRefUtility";
import VCResources = require("VersionControl/Scripts/Resources/TFS.Resources.VersionControl");
import VCSpecs = require("VersionControl/Scripts/TFS.VersionControl.VersionSpecs");
import VCChangeListSummaryHeaderBar = require("VersionControl/Scripts/Controls/ChangeListSummaryHeaderBar");
import VCChangeListSummaryFilesControl = require("VersionControl/Scripts/Controls/ChangeListSummaryFilesControl");
import { Filter, summaryFilterEquals } from "VersionControl/Scripts/Controls/ChangeListSummaryControlFilter";
import VCCommentParser = require("VersionControl/Scripts/CommentParser");
import VCContracts = require("TFS/VersionControl/Contracts");

import delegate = Utils_Core.delegate;
import domElem = Utils_UI.domElem;
import TfsContext = TFS_Host_TfsContext.TfsContext;

import Git_Client = require("TFS/VersionControl/GitRestClient");
import TFS_OM_Common = require("Presentation/Scripts/TFS/TFS.OM.Common");

export class ChangeListSummaryControl extends Controls.BaseControl {

    private static NUM_INITIAL_COMMENT_LINES = 3;
    private static NUM_CHAR_FULL_SENTENCE = 255;

    private _repositoryContext: RepositoryContext;
    // @TODO Merge the following two
    private _changeListModel: any;
    private _richChangeListModel: VCChangeModel.ChangeList;
    private _richOriginalChangeListModel: VCChangeModel.ChangeList;
    private _$commentContainer: JQuery;
    private _$commentMoreLink: JQuery;
    private _$tfvcStatusLine: JQuery;
    private _versionSpec: VCSpecs.VersionSpec;
    private _changeListFilesControl: VCChangeListSummaryFilesControl.FilesSummaryControl;
    private _associatedWorkItemsPanel: VCAssociatedWorkItemsPanel.Panel;
    private _discussionManager: DiscussionOM.DiscussionManager;
    private _activeState: boolean;
    private _currentFilter: Filter;
    private _needRedrawOnSetModel: boolean;
    private _currentAction: string;
    private _displayMode: ChangeExplorerGridDisplayMode;

    private _branchDataSet: boolean;
    private _branchName: string;
    private _branchUrl: string;

    private _$headerSection: JQuery;
    private _$workItemsSection: JQuery;
    private _$notesSection: JQuery;
    private _$policyWarningsSection: JQuery;

    private _gitRestClient: Git_Client.GitHttpClient;

    constructor(options?) {
        super($.extend({
            coreCssClass: "vc-change-summary"
        }, options));
    }

    public initialize() {
        super.initialize();

        this._activeState = true;
        this._gitRestClient = TFS_OM_Common.ProjectCollection.getDefaultConnection().getHttpClient<Git_Client.GitHttpClient>(Git_Client.GitHttpClient);
    }

    public _dispose() {
        super._dispose();
        if (this._changeListFilesControl) {
            this._changeListFilesControl._dispose();
        }
    }

    public setActiveState(active: boolean, skipUpdateView?: boolean) {
        if (active !== this._activeState) {
            this._activeState = active;

            if (active && skipUpdateView) {
                this._needRedrawOnSetModel = true;
            }

            if (this._changeListFilesControl) {
                this._changeListFilesControl.setActiveState(active, skipUpdateView);
            }
        }
    }

    public setDiscussionManager(discussionManager: DiscussionOM.DiscussionManager, redraw?: boolean) {
        if (this._discussionManager !== discussionManager && (discussionManager || this._discussionManager)) {
            this._discussionManager = discussionManager;
            if (redraw) {
                if (this._changeListFilesControl) {
                    this._changeListFilesControl.setDiscussionManager(this._discussionManager, this._needRedrawOnSetModel);
                    this._needRedrawOnSetModel = false;
                }
            }
        }
    }

    public setBranch(branchName: string, branchUrl: string) {
        this._branchName = branchName;
        this._branchUrl = branchUrl;
        this._branchDataSet = true;
    }

    /** 
     * Sets the model to summarize the change list.  Diffs against the previous version.  Use CommitDiffSummaryControl to diff against other versions.
     * @param {VCLegacyContracts.ChangeList} changeModel The ChangeList being diffed, or in the case of a merge commit it is either the merge commit or the parent being diffed against.
     * @param {VCLegacyContracts.ChangeList} originalChangeModel The ChangeList being diffed, including in the case of a merge commit.
     * @param {VCSpecs.VersionSpec} versionSpec The versionSpec for changeModel.
    */
    public setModel(
        repositoryContext: RepositoryContext,
        changeModel: VCLegacyContracts.ChangeList, 
        originalChangeModel: VCLegacyContracts.ChangeList, 
        versionSpec: VCSpecs.VersionSpec, 
        action: string, 
        filter?: Filter,
        displayMode?: ChangeExplorerGridDisplayMode) {

        if (this._repositoryContext === repositoryContext &&
            this._changeListModel === changeModel &&
            this._displayMode === displayMode &&
            (this._versionSpec ? this._versionSpec.toVersionString() : "") === (versionSpec ? versionSpec.toVersionString() : "")) {

            // No changes in model. Nothing to update.
            if (this._changeListFilesControl) {
                this._changeListFilesControl.setDiscussionManager(this._discussionManager, this._needRedrawOnSetModel);
                this._needRedrawOnSetModel = false;
            }

            return;
        }

        this._element.empty();

        this._repositoryContext = repositoryContext;
        this._changeListModel = changeModel;
        this._richChangeListModel = new VCChangeModel.ChangeList(changeModel, repositoryContext);
        this._richOriginalChangeListModel = new VCChangeModel.ChangeList(originalChangeModel, repositoryContext);
        this._versionSpec = versionSpec;
        this._currentFilter = filter;
        this._needRedrawOnSetModel = false;
        this._currentAction = action;
        this._displayMode = displayMode;

        if (!changeModel) {
            // No selected change list - don't draw anything
            return;
        }        

        this._$headerSection = $(domElem("div", "vc-change-summary-header")).appendTo(this._element);
        this._populateHeader(this._$headerSection, changeModel, originalChangeModel);

        if (!this._options.suppressAssociatedWorkItemPanel) {
            this._associatedWorkItemsPanel = <VCAssociatedWorkItemsPanel.Panel>VCAssociatedWorkItemsPanel.Panel.createIn<VCAssociatedWorkItemsPanel.Options>(VCAssociatedWorkItemsPanel.Panel, this._element, {
                repositoryContext: this._repositoryContext,
                versionSpec: this._versionSpec
            });
        }

        this._populateNotesAndPolicyWarnings();

        this._changeListFilesControl = <VCChangeListSummaryFilesControl.FilesSummaryControl>Controls.BaseControl.createIn(VCChangeListSummaryFilesControl.FilesSummaryControl, this._element, {
            customerIntelligenceData: this._options.customerIntelligenceData ? this._options.customerIntelligenceData.clone() : null,
            tfsContext: this._options.tfsContext,
            supportCommentStatus: this._options.supportCommentStatus,
            additionalMenuItems: this._options.additionalMenuItems,
            maxChangesCount: this._options.maxChangesCount,
        });
        this._changeListFilesControl.setActiveState(this._activeState, true);
        this._changeListFilesControl.setDiscussionManager(this._discussionManager, false);
        this._changeListFilesControl.setModel(repositoryContext, changeModel, this._getPreviousVersionString(), this._versionSpec.toVersionString(), filter, null, this._displayMode);
    }

    public setFilter(filter: Filter) {
        let showSections: boolean;

        if (summaryFilterEquals(filter, this._currentFilter)) {
            // no change
            return;
        }

        this._currentFilter = filter;

        showSections = filter ? false : true;
        
        // Hide all sections except for the files summary section and the header section when a path filter is applied
        if (this._$workItemsSection) {
            this._$workItemsSection.toggle(showSections);
        }
        if (this._$policyWarningsSection) {
            this._$policyWarningsSection.toggle(showSections);
        }
        if (this._$notesSection) {
            this._$notesSection.toggle(showSections);
        }

        // Set the filter on the files summary control
        if (this._changeListFilesControl) {
            this._changeListFilesControl.setFilter(filter);
        }

        // Scroll to the top of this control
        Utils_UI.Positioning.scrollIntoViewVertical(this._element, Utils_UI.Positioning.VerticalScrollBehavior.Top);
    }

    public hideMoreChangesSection(): void {
        this._changeListFilesControl.hideMoreChangesSection();
    }

    /*
     * updates the HideArtifactLevelDiscussion in changeListFilesControl
     */
    public updateHideArtifactLevelDiscussionState(newValue: boolean): void {
        this._changeListFilesControl.updateHideArtifactLevelDiscussionState(newValue);
    }

    public setAllowHideComments(allowHideComments: boolean): void {
        this._changeListFilesControl.setAllowHideComments(allowHideComments);
    }

    /*
     * updates the additionalMenuItems in changeListFilesControl
     */
    public updateAdditionalMenuItems(additionalMenuItems: IMenuItemSpec[]): void {
        this._changeListFilesControl.updateAdditionalMenuItems(additionalMenuItems);
    }

    private _getPreviousVersionString(): string {
        let oVersionSpec = "P" + this._versionSpec.toVersionString();

        if (this._repositoryContext.getRepositoryType() === RepositoryType.Git) {
            // we always show diff with first parent
            const firstParent: VCLegacyContracts.GitObjectReference = (<VCLegacyContracts.GitCommit>this._changeListModel).parents[0];
            if (firstParent) {
                oVersionSpec = new VCSpecs.GitCommitVersionSpec(firstParent.objectId.full).toVersionString();
            }
        }

        return oVersionSpec;
    }
    
    private _populateHeader($header, changeModel: VCLegacyContracts.ChangeList, originalChangeModel: VCLegacyContracts.ChangeList) {
        if (this._options.suppressHeader) {
            return;
        }

        if (this._richOriginalChangeListModel.isGitCommit()) {

            const commitId = (<VCSpecs.GitCommitVersionSpec>this._versionSpec).commitId;
            const gitRepoContext = <GitRepositoryContext>this._repositoryContext;
            const defaultBranchFullName = this._repositoryContext.getRepository().defaultBranch;

            const $headerBar = $(domElem("div"));
            const parentSummaryPanel = <VCChangeListSummaryHeaderBar.ChangeListSummaryHeaderBar>Controls.Enhancement.enhance(
                VCChangeListSummaryHeaderBar.ChangeListSummaryHeaderBar,
                $headerBar,
                <VCChangeListSummaryHeaderBar.Options>{
                    changeModel: originalChangeModel,
                    repositoryContext: this._repositoryContext,
                    tfsContext: this._options.tfsContext,
                    currentAction: this._currentAction
                }
            );
            $headerBar.appendTo($header);

            if (this._branchDataSet) {
                parentSummaryPanel.setBranch(this._branchName, this._branchUrl);
            }
            else {
                const defaultBranch = GitRefUtility.getRefFriendlyName(defaultBranchFullName);
                const searchCriteria = <VCContracts.GitQueryCommitsCriteria>{
                    $top: 1,
                    itemVersion: <VCContracts.GitVersionDescriptor>{
                        version: defaultBranch,
                        versionType: VCContracts.GitVersionType.Branch,
                        versionOptions: VCContracts.GitVersionOptions.None
                    },
                    compareVersion: <VCContracts.GitVersionDescriptor>{
                        version: commitId,
                        versionType: VCContracts.GitVersionType.Commit,
                        versionOptions: VCContracts.GitVersionOptions.None
                    }
                }

                gitRepoContext.getGitClient().beginGetCommits(this._repositoryContext, searchCriteria, (result) => {
                    const isInDefault = result.commits.length === 0;
                    if (isInDefault) {
                        const versionString = new VCSpecs.GitBranchVersionSpec(defaultBranch).toVersionString();
                        const branchUrl = VersionControlUrls.getExplorerUrl(this._repositoryContext, null, null, { version: versionString });
                        parentSummaryPanel.setBranch(defaultBranch, branchUrl);
                    }
                }, (error: any) => {
                    Diag.logError(Utils_String.format(VCResources.CommitDiffSummaryControlFailedToGetCommits, (error ? error.message || "" : "")));
                });
            }

            const search = <VCContracts.GitPullRequestQuery>{
                queries: [{
                    type: VCContracts.GitPullRequestQueryType.LastMergeCommit,
                    items: [commitId]
                }, {
                    type: VCContracts.GitPullRequestQueryType.Commit,
                    items: [commitId]
                }]
            }

            this._gitRestClient.getPullRequestQuery(search, this._repositoryContext.getRepositoryId()).then(queryResults => {
                //This commit could either be a merge commit (via squash) or a regular commit
                //If its a merge commit, then we want to display the pull request that created it
                //If its not a merge commit, then we want to display the first pull request to bring this commit into the default branch
                //If its not a merge commit, and no pull request has brought this commit to master, show the first pull request to merge this commit to somewhere
                const mergePrArray = (queryResults.results[0] || {})[commitId];
                const commitPrArray = (queryResults.results[1] || {})[commitId];
                if (mergePrArray && mergePrArray.length > 0) {
                    mergePrArray.sort((pr1, pr2) => {
                        return pr2.creationDate.valueOf() - pr1.creationDate.valueOf();
                    });
                    const pr = mergePrArray[0];
                    const prUrl = VersionControlUrls.getPullRequestUrl(gitRepoContext, pr.pullRequestId);
                    parentSummaryPanel.setPullRequest(pr.pullRequestId.toString(), pr.title, prUrl);
                } else if (commitPrArray && commitPrArray.length > 0) {
                    const targetsDefault = commitPrArray.filter(pr => {
                        return pr.targetRefName === defaultBranchFullName;
                    })

                    let prsToConsider = commitPrArray;
                    if (targetsDefault.length > 0) {
                        prsToConsider = targetsDefault;
                    }

                    prsToConsider.sort((pr1, pr2) => {
                        return pr2.creationDate.valueOf() - pr1.creationDate.valueOf();
                    });
                    const pr = prsToConsider[0];
                    const prUrl = VersionControlUrls.getPullRequestUrl(gitRepoContext, pr.pullRequestId);
                    parentSummaryPanel.setPullRequest(pr.pullRequestId.toString(), pr.title, prUrl);
                }
            }, (error) => {
                Diag.logError(Utils_String.format(VCResources.CommitDiffSummaryControlFailedToGetCommits, (error ? error.message || "" : "")));
            });
        }
        else {
            $header.addClass("tfvc");
            let $ownerInfo: JQuery,
                $authorNameElement: JQuery,
                $changeListLink: JQuery,
                parsedComment: VCCommentParser.ParseCommentResult;

            if (changeModel.comment) {
                parsedComment = VCCommentParser.Parser.parseComment(changeModel.comment, 0, ChangeListSummaryControl.NUM_INITIAL_COMMENT_LINES, ChangeListSummaryControl.NUM_CHAR_FULL_SENTENCE);

                if (parsedComment.text || parsedComment.remaining) {

                    const $commentContainer = $(domElem("div", "vc-change-summary-comment-container")).appendTo($header);

                    this._$commentContainer = $(domElem("div", "vc-change-summary-comment"))
                        .appendTo($commentContainer)
                        .text(parsedComment.text || "");

                    if (parsedComment.remaining) {
                        this._$commentMoreLink = $(domElem("a", "change-list-summary-comment-more"))
                            .appendTo($commentContainer)
                            .attr("title", VCResources.ShowMoreCommentTooltip)
                            .text(VCResources.ShowMoreComment)
                            .click(delegate(this, this._onShowHideCommentClick));
                    }
                }
            }

            const $picContainer = $(domElem("div", "picture-container")).appendTo($header);
            $(domElem('img', 'identity-picture small'))
                .attr('src', this._options.tfsContext.configuration.getResourcesFile('User.svg'))
                .css("position", "absolute")
                .appendTo($picContainer);
            IdentityImage.identityImageElement(TfsContext.getDefault(), changeModel.ownerId, {
                email: !changeModel.ownerId ? changeModel.ownerDisplayName : undefined
            }, "small")
                .css("position", "absolute")
                .appendTo($picContainer);

            const $headerDetails = $(domElem("div", "change-details")).appendTo($header);
            $ownerInfo = $(domElem("div", "owner-info")).appendTo($headerDetails);

            if ((<VCLegacyContracts.TfsChangeList>changeModel).changesetId) {
                const tfsChangeList = <VCLegacyContracts.TfsChangeList>changeModel;
    
                $authorNameElement = $(domElem("div")).append($(domElem("span", "author-name")).text(tfsChangeList.ownerDisplayName || tfsChangeList.owner || ""));
    
                $changeListLink = $(domElem("div")).append($(domElem("span", "changeset-id"))
                    .text("" + tfsChangeList.changesetId));
    
                $ownerInfo.html(Utils_String.format(VCResources.ChangesetAuthorDescriptionFormat, $authorNameElement.html(), $changeListLink.html()));
    
                this._$tfvcStatusLine = $(domElem("div", "status-info"))
                    .appendTo($headerDetails);
            }
            else if ((<VCLegacyContracts.TfsChangeList>changeModel).shelvesetName) {
                const tfsChangeList = <VCLegacyContracts.TfsChangeList>changeModel;
    
                $authorNameElement = $(domElem("span", "author-name")).text(tfsChangeList.ownerDisplayName || tfsChangeList.owner || "");
    
                $changeListLink = $(domElem("div")).append($(domElem("span", "shelveset-name"))
                    .text("" + tfsChangeList.shelvesetName));
    
                $ownerInfo.html(Utils_String.format(VCResources.ShelvesetAuthorDescriptionFormat, $authorNameElement.html(), $changeListLink.html()));
    
                this._$tfvcStatusLine = $(domElem("div", "status-info"))
                    .appendTo($headerDetails);
            }
                
            $(domElem("span", "status-date-info"))
                .text(Utils_Date.localeFormat(changeModel.creationDate, "f"))
                .attr("title", Utils_Date.localeFormat(changeModel.creationDate, "f"))
                .appendTo(this._$tfvcStatusLine);
        }
    }

    private _onShowHideCommentClick() {
        let commentText: string;

        if (this._$commentMoreLink.text() === VCResources.ShowMoreComment) {
            this._$commentMoreLink.text(VCResources.HideComment);
            this._$commentMoreLink.attr("title", "");
            commentText = $.trim(VCCommentParser.Parser.parseComment(this._changeListModel.comment, 0, 0, ChangeListSummaryControl.NUM_CHAR_FULL_SENTENCE).remaining);
        }
        else {
            this._$commentMoreLink.text(VCResources.ShowMoreComment);
            this._$commentMoreLink.attr("title", VCResources.ShowMoreCommentTooltip);
            commentText = VCCommentParser.Parser.parseComment(this._changeListModel.comment, 0, ChangeListSummaryControl.NUM_INITIAL_COMMENT_LINES, ChangeListSummaryControl.NUM_CHAR_FULL_SENTENCE).text;
        }

        this._$commentContainer.text(commentText);
    }

    private _populateNotesAndPolicyWarnings() {

        let panel: Panels.CollapsiblePanel,
            $policyFailuresContainer: JQuery,
            $checkinNotesContainer: JQuery,
            numPolicyFailures: number,
            numCheckinNotes = 0;

        this._$notesSection = null;
        this._$policyWarningsSection = null;

        if (this._changeListModel.policyOverride) {
            numPolicyFailures = this._changeListModel.policyOverride.policyFailures ? this._changeListModel.policyOverride.policyFailures.length : 0;
            if (this._changeListModel.policyOverride.comment || numPolicyFailures > 0) {

                // Generate policy warnings section
                this._$policyWarningsSection = $(domElem("div", "vc-policy-warning-section"));

                if (numPolicyFailures > 0) {

                    $(domElem("div", "policy-warnings-icon bowtie-icon bowtie-status-warning")).appendTo(this._$policyWarningsSection);
                    $(domElem("div", "policy-warnings-label")).text(VCResources.PolicyWarningsLabel).appendTo(this._$policyWarningsSection);

                    $policyFailuresContainer = $(domElem("ul", "policy-override-failures")).appendTo(this._$policyWarningsSection);
                    $.each(this._changeListModel.policyOverride.policyFailures, (i, policyFailure) => {
                        const $li = $(domElem("li")).appendTo($policyFailuresContainer);
                        $(domElem("span", "policy-name")).text(policyFailure.policyName + " - ").appendTo($li);
                        $(domElem("span", "policy-message")).text(policyFailure.message || "").appendTo($li);
                    });
                }

                if (this._changeListModel.policyOverride.comment) {
                    $(domElem("span", "policy-override-label")).text(VCResources.PolicyOverrideReasonLabel + ": ").appendTo(this._$policyWarningsSection);
                    $(domElem("span", "policy-override-comment")).text(this._changeListModel.policyOverride.comment || "").appendTo(this._$policyWarningsSection);
                }

                panel = <Panels.CollapsiblePanel>Controls.BaseControl.createIn(Panels.CollapsiblePanel, this._element, {
                    cssClass: "collapsible-section",
                    collapsed: true
                });
                panel.appendHeaderText(VCResources.PolicyWarningsHeader);
                panel.appendContent(this._$policyWarningsSection);
            }
        }

        if (this._changeListModel.notes) {

            $.each(this._changeListModel.notes, (i, note) => {
                if (note.value) {
                    numCheckinNotes++;
                }
            });

            if (numCheckinNotes > 0) {

                this._$notesSection = $(domElem("div", "vc-checkin-notes-section"));

                $checkinNotesContainer = $(domElem("ul", "checkin-notes-list")).appendTo(this._$notesSection);
                $.each(this._changeListModel.notes, (i, note) => {
                    let $li;
                    if (note.value) {
                        $li = $(domElem("li")).appendTo($checkinNotesContainer);
                        $(domElem("span", "note-name")).text(note.name + " - ").appendTo($li);
                        $(domElem("span", "note-value")).text(note.value || "").appendTo($li);
                    }
                });

                panel = <Panels.CollapsiblePanel>Controls.BaseControl.createIn(Panels.CollapsiblePanel, this._element, {
                    cssClass: "collapsible-section",
                    collapsed: true
                });
                panel.appendHeaderText(VCResources.CheckinNotesSectionHeader);
                panel.appendContent(this._$notesSection);
            }
        }
    }

    public refreshChangedFiles() {
        this._changeListFilesControl.refreshChangedFiles();
    }
}

VSS.classExtend(ChangeListSummaryControl, TfsContext.ControlExtensions);
