/// <amd-dependency path='VSS/LoaderPlugins/Css!VersionControlControls' />

import Controls = require("VSS/Controls");
import Diag = require("VSS/Diag");
import { IMenuItemSpec } from "VSS/Controls/Menus";
import Utils_UI = require("VSS/Utils/UI");
import Utils_String = require("VSS/Utils/String");

import VCAssociatedWorkItemsPanel = require("VersionControl/Scripts/Controls/AssociatedWorkItemsPanel");
import VCContracts = require("TFS/VersionControl/Contracts");
import VCLegacyContracts = require("VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts");
import { ChangeExplorerGridDisplayMode } from "VersionControl/Scripts/Generated/TFS.VersionControl.WebAccess.Contracts";
import { GitRepositoryContext } from "VersionControl/Scripts/GitRepositoryContext";
import { RepositoryContext } from "VersionControl/Scripts/RepositoryContext";
import * as VersionControlUrls from "VersionControl/Scripts/VersionControlUrls";
import * as GitRefUtility from "VersionControl/Scripts/GitRefUtility";
import VCResources = require("VersionControl/Scripts/Resources/TFS.Resources.VersionControl");
import VCSpecs = require("VersionControl/Scripts/TFS.VersionControl.VersionSpecs");
import { Filter, summaryFilterEquals } from "VersionControl/Scripts/Controls/ChangeListSummaryControlFilter";
import VCChangeListSummaryHeaderBar = require("VersionControl/Scripts/Controls/ChangeListSummaryHeaderBar");
import VCChangeListSummaryFilesControl = require("VersionControl/Scripts/Controls/ChangeListSummaryFilesControl");
import VCCommentParser = require("VersionControl/Scripts/CommentParser");

import domElem = Utils_UI.domElem;

import Git_Client = require("TFS/VersionControl/GitRestClient");
import TFS_OM_Common = require("Presentation/Scripts/TFS/TFS.OM.Common");

/**
 * Provides Git diff features to show the files changed between two commits.
 * As of May 2015, this is only used for showing the diff with each parent for a Git merge commit,
 * and we suppressHeader since we use a single MergeCommitVisualizationControl for all parent diff views.
 * However, the code to render a header in the form of [commit1 info ]<->[commit2 info] has been preserved 
 * to potentially support viewing of file diffs for any arbitary commits in the future.
 */
export class CommitDiffSummaryControl extends Controls.BaseControl {

    private static NUM_INITIAL_COMMENT_LINES = 1;
    private static NUM_CHAR_FULL_SENTENCE = 100;

    private _changeListFilesControl: VCChangeListSummaryFilesControl.FilesSummaryControl;

    private _repositoryContext: GitRepositoryContext;
    private _changeListModel: VCLegacyContracts.GitCommit;
    private _originalChangeModel: VCLegacyContracts.GitCommit;
    private _versionSpec: VCSpecs.VersionSpec;
    private _compareToVersionSpec: VCSpecs.VersionSpec;
    private _currentFilter: Filter;
    private _currentAction: string;
    private _associatedWorkItemsPanel: VCAssociatedWorkItemsPanel.Panel;
    private _displayMode: ChangeExplorerGridDisplayMode;

    private _$headerSection: JQuery;

    // Hold commits and related dynamic JQuery elements keyed by full commit Id.
    private _commits: { [commitId: string]: VCContracts.GitCommitRef };
    private _$commentContainers: { [commitId: string]: JQuery };
    private _$commentMoreLinks: { [commitId: string]: JQuery };

    private _gitRestClient: Git_Client.GitHttpClient;

    constructor(options?) {
        super($.extend({
            coreCssClass: "vc-change-summary"
        }, options));
    }

    public initialize() {
        super.initialize();

        this._gitRestClient = TFS_OM_Common.ProjectCollection.getDefaultConnection().getHttpClient<Git_Client.GitHttpClient>(Git_Client.GitHttpClient);
    }

    public _dispose() {
        super._dispose();
        if (this._changeListFilesControl) {
            this._changeListFilesControl._dispose();
        }
    }

    /**
     * Sets the model to summarize the commit diff.  Diffs against the the compareToVersionSpec, which would typically be one of the parent commits.
     * @param {VCLegacyContracts.ChangeList} changeModel a legacy GitCommit model containing the diff changes with the (parent) commit inserted as changeModel.parents[0].
     * @param {VCLegacyContracts.ChangeList} originalChangeModel The ChangeList being diffed, including in the case of a merge commit.
     * @param {VCSpecs.VersionSpec} versionSpec The versionSpec for changeModel.
    */
    public setModel(
        repositoryContext: RepositoryContext,
        changeModel: VCLegacyContracts.GitCommit, 
        originalChangeModel: VCLegacyContracts.ChangeList, 
        versionSpec: VCSpecs.VersionSpec, 
        compareToVersionSpec: VCSpecs.VersionSpec, 
        action: string,
        displayMode?: ChangeExplorerGridDisplayMode) {

        if (this._repositoryContext === repositoryContext &&
            this._changeListModel === changeModel &&
            this._displayMode === displayMode &&
            (this._versionSpec ? this._versionSpec.toVersionString() : "") === (versionSpec ? versionSpec.toVersionString() : "") &&
            (this._compareToVersionSpec ? this._compareToVersionSpec.toVersionString() : "") === (compareToVersionSpec ? compareToVersionSpec.toVersionString() : "")) {

            return;
        }

        this._element.empty();

        this._repositoryContext = <GitRepositoryContext>repositoryContext;
        this._changeListModel = <VCLegacyContracts.GitCommit>changeModel;
        this._originalChangeModel = <VCLegacyContracts.GitCommit>originalChangeModel;
        this._versionSpec = versionSpec;
        this._compareToVersionSpec = compareToVersionSpec;
        this._currentAction = action;
        this._displayMode = displayMode;
        this._currentFilter = null;

        if (!changeModel) {
            // No selected change list - don't draw anything
            return;
        }

        this._$headerSection = $(domElem("div", "vc-change-summary-header diff-commits")).appendTo(this._element);

        if (!this._options.suppressAssociatedWorkItemPanel) {
            this._associatedWorkItemsPanel = <VCAssociatedWorkItemsPanel.Panel>VCAssociatedWorkItemsPanel.Panel.createIn<VCAssociatedWorkItemsPanel.Options>(VCAssociatedWorkItemsPanel.Panel, this._element, {
                repositoryContext: this._repositoryContext,
                versionSpec: this._versionSpec
            });
        }

        this._beginPopulateHeader();

        this._changeListFilesControl = <VCChangeListSummaryFilesControl.FilesSummaryControl>Controls.BaseControl.createIn(VCChangeListSummaryFilesControl.FilesSummaryControl, this._element, {
            customerIntelligenceData: this._options.customerIntelligenceData ? this._options.customerIntelligenceData.clone() : null,
            tfsContext: this._options.tfsContext,
            supportCommentStatus: this._options.supportCommentStatus,
            additionalMenuItems: this._options.additionalMenuItems,
            maxChangesCount: this._options.maxChangesCount,
        });

        this._changeListFilesControl.setModel(repositoryContext, changeModel, this._compareToVersionSpec.toVersionString(), this._versionSpec.toVersionString(), null, null, this._displayMode);
    }

    /** Filters on file paths and also hides summary information. */
    public setFilter(filter: Filter) {
        let showSections: boolean;

        if (summaryFilterEquals(filter, this._currentFilter)) {
            // no change
            return;
        }

        this._currentFilter = filter;

        showSections = filter ? false : true;
        
        // Hide all sections except for the files summary section when a path filter is applied
        if (this._$headerSection) {
            this._$headerSection.toggle(showSections);
        }

        // Set the filter on the files summary control
        if (this._changeListFilesControl) {
            this._changeListFilesControl.setFilter(filter);
        }

        // Scroll to the top of this control
        Utils_UI.Positioning.scrollIntoViewVertical(this._element, Utils_UI.Positioning.VerticalScrollBehavior.Top);
    }

    /** Forces a refresh of the summary of file diffs. */
    public refreshChangedFiles() {
        this._changeListFilesControl.refreshChangedFiles();
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

    /*
     * updates the additionalMenuItems in changeListFilesControl
     */
    public updateAdditionalMenuItems(additionalMenuItems: IMenuItemSpec[]): void {
        this._changeListFilesControl.updateAdditionalMenuItems(additionalMenuItems);
    }

    /** Fetch commit information then render the header. */
    private _beginPopulateHeader() {
        this._commits = {};
        this._$commentContainers = {};
        this._$commentMoreLinks = {};

        if (this._options.suppressHeader) {
            return;
        }

        const commitIds: string[] = [
            (<VCSpecs.GitCommitVersionSpec>this._versionSpec).commitId,
            (<VCSpecs.GitCommitVersionSpec>this._compareToVersionSpec).commitId
        ];

        if (commitIds[0] && commitIds[1]) {
            this._repositoryContext.getGitClient().beginGetCommitsById(this._repositoryContext, commitIds, (commits: VCContracts.GitCommitRef[]) => {
                if (commits.length === 2) {
                    this._populateHeader(this._$headerSection, commits[0], commits[1]);
                    this._commits[commits[0].commitId] = commits[0];
                    this._commits[commits[1].commitId] = commits[1];
                }
            }, (error: any) => {
                Diag.logError(Utils_String.format(VCResources.CommitDiffSummaryControlFailedToGetCommits, (error ? error.message || "" : "")));
            });
        }
    }

    /** Render the header which includes information about the two commits being diffed. */
    private _populateHeader($header: JQuery, commit: VCContracts.GitCommitRef, compareToCommit: VCContracts.GitCommitRef) {
        const $headerBar = $(domElem("div"));
        const parentSummaryPanel = <VCChangeListSummaryHeaderBar.ChangeListSummaryHeaderBar>Controls.Enhancement.enhance(
            VCChangeListSummaryHeaderBar.ChangeListSummaryHeaderBar, 
            $headerBar,
            <VCChangeListSummaryHeaderBar.Options>{
                changeModel: this._originalChangeModel,
                repositoryContext: this._repositoryContext,
                compareToVersionSpec: <VCSpecs.GitCommitVersionSpec>this._compareToVersionSpec,
                tfsContext: this._options.tfsContext,
                currentAction: this._currentAction
            }
        );
        $headerBar.appendTo($header);

        const defaultBranch = GitRefUtility.getRefFriendlyName(this._repositoryContext.getRepository().defaultBranch);

        const searchCriteria = <VCContracts.GitQueryCommitsCriteria>{
            $top: 1,
            itemVersion: <VCContracts.GitVersionDescriptor>{
                version: defaultBranch,
                versionType: VCContracts.GitVersionType.Branch,
                versionOptions: VCContracts.GitVersionOptions.None
            },
            compareVersion: <VCContracts.GitVersionDescriptor>{
                version: commit.commitId,
                versionType: VCContracts.GitVersionType.Commit,
                versionOptions: VCContracts.GitVersionOptions.None
            }
        }

        this._repositoryContext.getGitClient().beginGetCommits(this._repositoryContext, searchCriteria, (result) => {
            const isInDefault = result.commits.length === 0;
            if (isInDefault) {
                const versionString = new VCSpecs.GitBranchVersionSpec(defaultBranch).toVersionString();
                const branchUrl = VersionControlUrls.getExplorerUrl(this._repositoryContext, null, null, { version: versionString });
                parentSummaryPanel.setBranch(defaultBranch, branchUrl);

            }
        }, (error: any) => {
            Diag.logError(Utils_String.format(VCResources.CommitDiffSummaryControlFailedToGetCommits, (error ? error.message || "" : "")));
        });

        const search = <VCContracts.GitPullRequestQuery>{
            queries: [{
                type: VCContracts.GitPullRequestQueryType.LastMergeCommit,
                items: [commit.commitId]
            }]
        }

        this._gitRestClient.getPullRequestQuery(search, this._repositoryContext.getRepositoryId()).then(queryResults => {
            const prArray = (queryResults.results[0] || {})[commit.commitId];
            if (prArray && prArray.length > 0) {
                prArray.sort((pr1, pr2) => {
                    return pr2.creationDate.valueOf() - pr1.creationDate.valueOf();
                });
                const pr = prArray[0];
                const prUrl = VersionControlUrls.getPullRequestUrl(this._repositoryContext, pr.pullRequestId);
                parentSummaryPanel.setPullRequest(pr.pullRequestId.toString(), pr.title, prUrl);
            }
        }, (error) => {
            Diag.logError(Utils_String.format(VCResources.CommitDiffSummaryControlFailedToGetCommits, (error ? error.message || "" : "")));
        });
    }

    /** Comments can show more/less if they exceed the initial truncated length. */
    private _onShowHideCommentClick(commitId: string) {
        let commentText: string;
        const commit = this._commits[commitId];

        if (commit && commit.commitId) {
            const $commentMoreLink = this._$commentMoreLinks[commitId];

            if ($commentMoreLink.text() === VCResources.ShowMoreComment) {
                $commentMoreLink.text(VCResources.HideComment);
                $commentMoreLink.attr("title", "");
                commentText = $.trim(VCCommentParser.Parser.parseComment(commit.comment, 0, 0, CommitDiffSummaryControl.NUM_CHAR_FULL_SENTENCE).remaining);
            }
            else {
                $commentMoreLink.text(VCResources.ShowMoreComment);
                $commentMoreLink.attr("title", VCResources.ShowMoreCommentTooltip);
                commentText = VCCommentParser.Parser.parseComment(commit.comment, 0, CommitDiffSummaryControl.NUM_INITIAL_COMMENT_LINES, CommitDiffSummaryControl.NUM_CHAR_FULL_SENTENCE).text;
            }

            this._$commentContainers[commitId].text(commentText);
        }
    }
}
