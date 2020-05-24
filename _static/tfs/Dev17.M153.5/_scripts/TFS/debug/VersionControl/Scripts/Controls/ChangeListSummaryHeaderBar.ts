/// <amd-dependency path='VSS/LoaderPlugins/Css!VersionControlControls' />

import Controls = require("VSS/Controls");
import IdentityImage = require("Presentation/Scripts/TFS/TFS.IdentityImage");
import Navigation_Services = require("VSS/Navigation/Services");
import ServerConstants = require("Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants");
import Utils_UI = require("VSS/Utils/UI");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import Utils_String = require("VSS/Utils/String");
import Utils_Date = require("VSS/Utils/Date");
import FeatureAvailability_Services = require("VSS/FeatureAvailability/Services");
import PopupContent = require("VSS/Controls/PopupContent");
import VSS_Telemetry = require("VSS/Telemetry/Services");

import VCLegacyContracts = require("VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts");
import VCChangeModel = require("VersionControl/Scripts/ChangeModel");
import {GitRepositoryContext} from "VersionControl/Scripts/GitRepositoryContext";
import {RepositoryContext} from "VersionControl/Scripts/RepositoryContext";
import * as CustomerIntelligenceConstants from "VersionControl/Scripts/CustomerIntelligenceConstants";
import * as ChangeListIdentityHelper from "VersionControl/Scripts/ChangeListIdentityHelper";
import * as VersionControlUrls from "VersionControl/Scripts/VersionControlUrls";
import VCControlsCommon = require("VersionControl/Scripts/Controls/ControlsCommon");
import VCToggleArrow = require("VersionControl/Scripts/Controls/ToggleArrow");
import VCResources = require("VersionControl/Scripts/Resources/TFS.Resources.VersionControl");
import VCSpecs = require("VersionControl/Scripts/TFS.VersionControl.VersionSpecs");
import VCPromisedPanelControl = require("VersionControl/Scripts/Controls/PromisedPanelControl");
import VCChangeModelParents = require("VersionControl/Scripts/Controls/ChangeModelParents");
import VCCommentParser = require("VersionControl/Scripts/CommentParser");

import domElem = Utils_UI.domElem;
import TfsContext = TFS_Host_TfsContext.TfsContext;

export interface Options {
    changeModel: VCLegacyContracts.ChangeList;
    repositoryContext: RepositoryContext;
    tfsContext: TFS_Host_TfsContext.TfsContext;
    currentAction: string;
    compareToVersionSpec?: VCSpecs.GitCommitVersionSpec;
    parentsPopupOptions?: any;
}

export class ChangeListSummaryHeaderBar extends Controls.BaseControl {
    private _changeModel: VCChangeModel.ChangeList;
    private _repositoryContext: RepositoryContext;
    private _parentsMenu: PopupContent.PopupContentControl;
    private _currentAction: string;
    private _compareToVersionSpec: VCSpecs.GitCommitVersionSpec;
    private _$statusLine: JQuery;
    private _$branchIndicator: JQuery;
    private _$branchName: JQuery;
    private _$prIndicator: JQuery;
    private _$prLink: JQuery;
    
    public _options: Options;
    
    constructor(options?) {
        super($.extend({
            coreCssClass: "vc-change-summary-header-bar"
        }, options));
    }
    
    public get statusLine() {
        return this._$statusLine;
    }
    
    /** Returns the URL to view the summary page of the Git merge commit diffed with the specified parent index */
    private _getDiffParentUrl(index: number): string {
        const currentState = Navigation_Services.getHistoryService().getCurrentState() || {};
        
        const stateParams = {action: null, fullScreen: undefined};

        if (index === 0) {
            stateParams.action = VCControlsCommon.VersionControlActionIds.Summary;
        }
        else {
            stateParams.action = VCControlsCommon.VersionControlActionIds.DiffParent + index
        }

        if (currentState.fullScreen) {
            stateParams.fullScreen = currentState.fullScreen;
        }
        
        return VersionControlUrls.getChangeListUrl(this._repositoryContext, this._changeModel, true, null, stateParams);
    }

    private _getCommitPicture(changeModel: VCLegacyContracts.ChangeList) {
        const $picContainer = $(domElem("div", "picture-container"));
        $(domElem('img', 'identity-picture small'))
            .attr('src', this._options.tfsContext.configuration.getResourcesFile('User.svg'))
            .css("position", "absolute")
            .appendTo($picContainer);
        IdentityImage.identityImageElement(TfsContext.getDefault(), changeModel.ownerId, {
            email: !changeModel.ownerId ? changeModel.ownerDisplayName : undefined
        }, "small")
            .css("position", "absolute")
            .appendTo($picContainer);

        return $picContainer;
    }
    
    private _getParentSummariesElementFromGitCommits(gitCommits: VCLegacyContracts.GitCommit[]) {
        const $parentSummariesFragment = $(document.createDocumentFragment());
        
        const appendSummary = (gitCommit, index) => {
            const $parentSummary = $(domElem("div", "vc-parent-summary"));
                
            if (this._changeModel.isGitMergeCommit()) {
                $parentSummary.css("cursor", "pointer");                    
                $parentSummary.click(() => {
                    window.location.href = this._getDiffParentUrl(index+1);
                });
            }
                
            $parentSummary.append(this._getCommitPicture(gitCommit));

            const isGitMergeCommit = index === -1;
            const annotationText = isGitMergeCommit ?
                VCResources.MergeCommitAnnotation : 
                Utils_String.format(VCResources.ParentCommitAnnotationFormat, index + 1);
            
            const authorInfoHtml = Utils_String.format(VCResources.XAuthoredYWithAnnotationHtml, Utils_String.htmlEncode(gitCommit.author.displayName), Utils_String.htmlEncode(gitCommit.commitId.short), annotationText);
            const authorInfoText = Utils_String.format(VCResources.XAuthoredYWithAnnotationText, Utils_String.htmlEncode(gitCommit.author.displayName), Utils_String.htmlEncode(gitCommit.commitId.short), annotationText);
            const $authorInfo = $(domElem("span", "author-info"))
                .addClass("one-line")
                .html(authorInfoHtml)
                .prop("title", authorInfoText)
                .appendTo($parentSummary);

            $(domElem("div", "status-info"))
                .text(VCCommentParser.Parser.getChangeListDescription(gitCommit, true))
                .appendTo($parentSummary);
                
            $parentSummary.appendTo($parentSummariesFragment);
        };
        
        gitCommits.forEach(appendSummary);
        
        // @TODO Fix the name of this function to reflect that it's not just parents
        // append the merge commit as well
        if (this._changeModel.isGitMergeCommit()) {
            appendSummary(this._changeModel, -1);
        }
        
        return $parentSummariesFragment;
   }
    
    private _getParentSummariesControl() {
        const $container = $(domElem("div"));
        
        const parentSummaryContents: Q.Promise<JQuery> = this._changeModel.getParentsAsGitCommits()
                                            .then(gitCommits => this._getParentSummariesElementFromGitCommits(gitCommits));
        
        return <VCPromisedPanelControl.PromisedPanel>Controls.Enhancement.enhance(
            VCPromisedPanelControl.PromisedPanel, 
            $container,
            <VCPromisedPanelControl.PromisedPanelOptions>{
                contents: parentSummaryContents
            }
        );
    }
    
    private _isSummaryAction(): boolean {
        return Utils_String.localeIgnoreCaseComparer(this._currentAction, VCControlsCommon.VersionControlActionIds.Summary) === 0;
    }
    
    /** Returns the 1-based index of the parent commit, or 0 if not found */
    private _getParentIndexFromCommitId(commit: VCLegacyContracts.GitCommit, parentCommitId: string): number {
        return commit.parents
            .map(parentCommit => parentCommit.objectId.full)
            .indexOf(parentCommitId) + 1;
    }

    public initialize() {
        super.initialize();
        
        const options = <Options>this._options;
        this._repositoryContext = options.repositoryContext;
        this._changeModel = new VCChangeModel.ChangeList(options.changeModel, this._repositoryContext);
        this._currentAction = options.currentAction;
        this._compareToVersionSpec = options.compareToVersionSpec;

        // The header bar contains the remaining text from the commit message that didn't fit in the title.  One line overflows into a single div.  More than one line flows into a single div with an ellipsis that expands to the full commit message.
        if (this._changeModel.comment) {

            const comment = VCCommentParser.Parser.parseComment(this._changeModel.comment, 0, 1);
            const commentInTitle = comment.text;
            let overflow = this._changeModel.comment.substr(commentInTitle.length);
            overflow = overflow.replace(/^\s*/m, ""); // Trim any leading whitespace/newlines

            const match = overflow.match(/[\s\S]{0,300}\b/m); // greedily match up to 300 chars, but must end at a word boundary. We use '\s\S' instead of '.' to match newlines
            let overflowPreview = match ? match[0] : overflow;

            // If the first 3 lines of text is shorter than the first 300 characters, use that as the overflow preview instead
            const firstThreeLines = VCCommentParser.Parser.getUpToThreeLines(overflow);
            if (firstThreeLines.length < overflowPreview.length) {
                overflowPreview = firstThreeLines;
            }

            // Don't elide too few characters: clicking "more ..." and having only a period or a short word appear is silly.
            const lengthOfOverflowAfterMore = overflow.length - overflowPreview.length;
            if (lengthOfOverflowAfterMore < 10) {
                overflowPreview = overflow;
            }
            
            const overflowEnd = overflow.substr(overflowPreview.length);

            // Add ellipsis to start if necessary
            if (comment.isTextTruncatedBeforeNewline) {
                overflowPreview = Utils_String.format(VCResources.ElidedTextAtStart, overflowPreview);
            }

            if (overflowPreview) {
                const $commentOverflowContainer = $(domElem("div", "vc-change-summary-comment-overflow")).appendTo(this.getElement());
                const $commentOverflowFirstLine = $(domElem("span", "vc-change-summary-comment"))
                    .text(overflowPreview)
                    .appendTo($commentOverflowContainer);

                if (overflowEnd) {
                    const $commentOverflowRest = $(domElem("span", "vc-change-summary-comment"))
                        .text(overflowEnd)
                        .hide()
                        .appendTo($commentOverflowContainer);

                    let shown = true;

                    const show = () => {
                        $commentOverflowRest.show();
                        $moreLink.attr("title", "").text(VCResources.HideComment);
                        shown = true;
                    };
                    const hide = () => {
                        $commentOverflowRest.hide();
                        $moreLink.attr("title", VCResources.ShowMoreCommentTooltip).text(VCResources.ShowMoreComment);
                        shown = false;
                    };

                    const $moreLink = $(domElem("a", "change-list-summary-comment-more"))
                        .appendTo($commentOverflowContainer)
                        .click(() => {
                            shown ? hide() : show();
                        });

                    hide();
                }
            }
        }

        const $headerRow = $(domElem("div", "header-horizontal-row")).appendTo(this.getElement());
        const $picContainer = this._getCommitPicture(this._changeModel).appendTo($headerRow);

        const $headerDetails = $(domElem("div", "change-details"))
                            .addClass("commit")
                            .appendTo($headerRow);

        const $ownerInfo = $(domElem("div", "owner-info"));
        
        const gitCommit = this._changeModel.getAsGitCommit();

        const $headerContent = $(document.createDocumentFragment());

        const $elidedCommitId = $(domElem("span"))
            .text(gitCommit.commitId.full)
            .prop("title", gitCommit.commitId.full)
            .addClass("vc-elided-commit-id");

        $(domElem("span", "author-info"))
            .html(Utils_String.format(VCResources.XAuthoredY, Utils_String.htmlEncode(gitCommit.author.displayName), $elidedCommitId[0].outerHTML))
            .appendTo($headerContent);

        <VCToggleArrow.ToggleArrow>Controls.BaseControl.createIn(VCToggleArrow.ToggleArrow, $headerContent, {
            elementToToggle: $ownerInfo
        });

        this._$statusLine = $(domElem("div", "status-info"))
            .appendTo($headerContent);

        $headerContent.appendTo($headerDetails);
        $ownerInfo.appendTo($headerDetails);
                
        $(domElem("span", "status-date-info"))
            .text(Utils_Date.localeFormat(this._changeModel.creationDate, "f"))
            .attr("title", Utils_Date.localeFormat(this._changeModel.creationDate, "f"))
            .appendTo(this._$statusLine);

        const $commitDetails = $(domElem("div", "commit-details")).appendTo($headerRow);

        const changeModelParents = new VCChangeModelParents.ChangeModelParents(this._changeModel, <GitRepositoryContext>this._repositoryContext);
        const $commitDetailsLine1 = $(domElem("span"))
            .append(changeModelParents.getElement())
            .appendTo($commitDetails);

        if (this._changeModel.hasParents()) {
            if (gitCommit.parents.length > 0) {
                const parentCommit = gitCommit.parents[0];
                const $parentsMenuPopupContainer = $(domElem("ul")).appendTo($commitDetails);
                const $parentCommitHashDropdown = $(domElem("span", "showing-diff-to-menu-container"));
                this._bind("popup-opened", () => {
                    VSS_Telemetry.publishEvent(new VSS_Telemetry.TelemetryEventData(CustomerIntelligenceConstants.VERSION_CONTROL_AREA, CustomerIntelligenceConstants.CHANGELISTSUMMARYHEADER_DIFF_PULLUP_OPENED, {}));
                })

                if (this._changeModel.isGitMergeCommit() && this._isSummaryAction()) {
                    $parentCommitHashDropdown.html(Utils_String.format(VCResources.MergeCommitTitleAlternate, Utils_String.htmlEncode(gitCommit.commitId.short)))
                }
                else {
                    let compareToCommitId;
                    let compareToParentIndex = 1;
                    if (this._compareToVersionSpec) {
                        compareToCommitId = this._compareToVersionSpec.getShortCommitId();
                        compareToParentIndex = this._getParentIndexFromCommitId(gitCommit, this._compareToVersionSpec.commitId);
                    }
                    else {
                        compareToCommitId = parentCommit.objectId.short;
                    }
                    
                    const annotationText = Utils_String.format(VCResources.ParentCommitAnnotationFormat, compareToParentIndex);
                    
                    $parentCommitHashDropdown
                        .html(Utils_String.format(VCResources.DiffCommitTitleAlternateOneParentFormat, Utils_String.htmlEncode(compareToCommitId), Utils_String.htmlEncode(annotationText)));
                }
            
                $parentCommitHashDropdown
                    .addClass("filtered-list-dropdown-menu list-dropdown-menu") // temporarily re-use this class to get the drop-icon to work
                    .appendTo($commitDetails);

                $(domElem("span", "drop-icon bowtie-icon bowtie-triangle-down")).appendTo($parentCommitHashDropdown);

                const parentSummaryPanel = this._getParentSummariesControl();

                this._parentsMenu = <PopupContent.PopupContentControl>Controls.Enhancement.enhance(PopupContent.PopupContentControl, $parentCommitHashDropdown, $.extend({
                    cssClass: "ui-dialog bowtie flexwidth-medium",
                    elementAlign: "right-top",
                    baseAlign: "right-bottom",
                    supportScroll: true,
                    content: () => {
                        const $container = parentSummaryPanel.getElement();

                        $container.addClass("vc-popup-content-control");

                        return $container;
                    },
                    menuContainer: $parentCommitHashDropdown.parent()
                }, this._options.parentsPopupOptions));

                this._parentsMenu.getElement().css("overflowY", "auto"); // should really be set on .ui-dialog or at least .ui-dialog.bowtie-dialog but I don't want to make that change close to release without more testing.

                // reposition the menu when the panel contents resolve
                parentSummaryPanel.contents().then(() => {
                    this._parentsMenu._setPosition()
                });
            }
        }
        else {
            // Show nothing?
        }

        const committerDisplayName = ChangeListIdentityHelper.getUserNameWithoutEmail(gitCommit.committer.id);
        const committer = $(domElem("div"))
            .html(Utils_String.format(VCResources.CommittedByAlternateFormat, Utils_String.htmlEncode(committerDisplayName), $elidedCommitId[0].outerHTML))
            .appendTo($ownerInfo);
        $(domElem("div", "status-info committer"))
            .text(Utils_Date.localeFormat(gitCommit.committer.date, "f"))
            .attr("title", Utils_Date.localeFormat(gitCommit.committer.date, "f"))
            .appendTo(committer);

        const pusher = $(domElem("div")).appendTo($ownerInfo);
        const pusherDisplayName = ChangeListIdentityHelper.getUserNameWithoutEmail(gitCommit.pusher);
        if (gitCommit.pushId ) {
            $(domElem("a"))
                .attr("href", VersionControlUrls.getPushUrl(<GitRepositoryContext>this._repositoryContext, gitCommit.pushId))
                .html(Utils_String.format(VCResources.PushedByAlternateFormat, Utils_String.htmlEncode(pusherDisplayName), $elidedCommitId[0].outerHTML))
                .appendTo(pusher);
        }
        else {
            pusher.text(Utils_String.format(VCResources.PushedByAlternateFormat, pusherDisplayName));
        }

        $(domElem("div", "status-info pusher"))
            .text(Utils_Date.localeFormat(gitCommit.pushTime, "f"))
            .attr("title", Utils_Date.localeFormat(gitCommit.pushTime, "f"))
            .appendTo(pusher);

        const $indicatorSection = $(domElem("div", "vc-commit-details-indicator-area"));

        this._$branchIndicator = $(domElem("span", "status-info vc-commit-branch-indicator"));
        $(domElem("span", "bowtie-icon bowtie-tfvc-branch")).appendTo(this._$branchIndicator);
        this._$branchName = $(domElem("a", "status-info vc-commit-branch-name"));
        this._$branchName.appendTo(this._$branchIndicator);
        this._$branchIndicator.appendTo($indicatorSection);

        this._$prIndicator = $(domElem("span", "status-info vc-commit-pullrequest-indicator"));
        $(domElem("span", "bowtie-icon bowtie-tfvc-pull-request")).appendTo(this._$prIndicator);
        this._$prLink = $(domElem("a", "status-info vc-commit-pullrequest-link"));
        this._$prLink.appendTo(this._$prIndicator);
        this._$prIndicator.appendTo($indicatorSection);

        $indicatorSection.appendTo(this.getElement());
    }

    public setBranch(branchName: string, branchUrl: string) {
        if (branchName && branchUrl) {
            this._$branchName.text(branchName);
            this._$branchName.attr('href', branchUrl);
            this._$branchName.click(eventObject => {
                const executedEvent = new VSS_Telemetry.TelemetryEventData(
                    CustomerIntelligenceConstants.VERSION_CONTROL_AREA,
                    CustomerIntelligenceConstants.VIEW_BRANCH_FROM_COMMIT, {
                        "commitId": this._changeModel.isGitCommit() ? this._changeModel.getAsGitCommit().commitId.full : null,
                        "isMergeCommit": this._changeModel.isGitCommit() ? this._changeModel.isGitMergeCommit() : null,
                        "branchName": branchName
                    });
                VSS_Telemetry.publishEvent(executedEvent);
            });

            this._$branchIndicator.attr('title', Utils_String.format(VCResources.CommitDetails_BranchIndicator_Tooltip, branchName));
            this._$branchIndicator.show();
        }
        else {
            this._$branchIndicator.hide();
        }
    }

    public setPullRequest(id: string, title: string, url: string) {
        if (id && title && url) {
            this._$prLink.text(id);
            this._$prLink.attr('href', url);
            this._$prLink.click(eventObject => {
                const executedEvent = new VSS_Telemetry.TelemetryEventData(
                    CustomerIntelligenceConstants.VERSION_CONTROL_AREA,
                    CustomerIntelligenceConstants.VIEW_PR_FROM_COMMIT, {
                        "commitId": this._changeModel.isGitCommit() ? this._changeModel.getAsGitCommit().commitId.full : null,
                        "isMergeCommit": this._changeModel.isGitCommit() ? this._changeModel.isGitMergeCommit() : null,
                        "pullRequestId": id
                    });
                VSS_Telemetry.publishEvent(executedEvent);
            });

            this._$prIndicator.attr('title', Utils_String.format(VCResources.PullRequest_PullRequestDetailsTitle, id, title));
            this._$prIndicator.show();
        }
        else {
            this._$prIndicator.hide();
        }
    }
}