import ko = require("knockout");

import { RepositoryContext } from "VersionControl/Scripts/RepositoryContext";

import IdentityImage = require("Presentation/Scripts/TFS/TFS.IdentityImage");
import Controls = require("VSS/Controls");
import PopupContent = require("VSS/Controls/PopupContent");
import Utils_UI = require("VSS/Utils/UI");

import VCContracts = require("TFS/VersionControl/Contracts");
import VCPullRequestViewModel = require("VersionControl/Scripts/ViewModels/PullRequestViewModel");
import VCPullRequestReviewerViewModel = require("VersionControl/Scripts/ViewModels/PullRequestReviewerViewModel");
import VersionControlViewModel = require("VersionControl/Scripts/TFS.VersionControl.ViewModel");
import {PullRequestVoteStatus} from "VersionControl/Scripts/PullRequestTypes";
import {ReviewerUtils} from "VersionControl/Scripts/Utils/ReviewerUtils";

export class reviewerControl extends Controls.BaseControl {
    private static _maxReviewersDisplayed: number = 4;
    private static _maxExtendedReviewersDisplayed: number = reviewerControl._maxReviewersDisplayed - 1; //one of the reviewers gets replaced with +n or ellipsis
    private static _tooltipTimeoutLength = 250;
    private static _maxAdditionalReviewerDisplay = 99; //This is because 3 digit numbers don't fit in the box so we display ellipsis instead
    private _pullRequestViewModel: VCPullRequestViewModel.ViewModel;
    private _reviewers: VCContracts.IdentityRefWithVote[];
    
    constructor(options?) {
        super(options);
        
        this._pullRequestViewModel = options.data;
        this._reviewers = this._pullRequestViewModel.getCurrentReviewers();
        this._reviewers = this._reviewers ? this._reviewers : [];
    }
    
    public initialize() {
        super.initialize();
        
        let topReviewers: VCContracts.IdentityRefWithVote[] = this._getTopReviewers();
        let $reviewerToolTipPopup: JQuery;
         
        $.each(topReviewers, (index, reviewer : VCContracts.IdentityRefWithVote) => {
            let reviewerPreview = this._createReviewerPreview(reviewer);

            reviewerPreview.appendTo(this._element);
        });
        
        if (this._reviewers.length > reviewerControl._maxReviewersDisplayed) {
            let additionalReviewers = this._reviewers.length - reviewerControl._maxExtendedReviewersDisplayed;
            let additionalReviewerText = additionalReviewers <= reviewerControl._maxAdditionalReviewerDisplay ? "+" + additionalReviewers : "...";
            $reviewerToolTipPopup = $(Utils_UI.domElem("span", "vc-pr-reviewer-ellipses")).text(additionalReviewerText).appendTo(this._element);

            this._generateTooltipOnHover($reviewerToolTipPopup, this._reviewers.slice(reviewerControl._maxExtendedReviewersDisplayed));
        }
    }

    private _getNumberTopReviewersShown(): number {
        let numReviewers: number = this._reviewers.length;
        return (numReviewers > reviewerControl._maxReviewersDisplayed) ? reviewerControl._maxExtendedReviewersDisplayed : reviewerControl._maxReviewersDisplayed;
    }

    private _getTopReviewers() : VCContracts.IdentityRefWithVote[] {
        let currentUserId = this._pullRequestViewModel.repositoryContext.getTfsContext().currentIdentity.id;        
        return this._reviewers
            .sort((a: VCContracts.IdentityRefWithVote, b: VCContracts.IdentityRefWithVote) => this._reviewersComparer(a, b, currentUserId))
            .slice(0, this._getNumberTopReviewersShown());
    }

    private _reviewersComparer(a: VCContracts.IdentityRefWithVote, b: VCContracts.IdentityRefWithVote, currentUserId: string): number {
        // current user should be first
        if (a.id == currentUserId && b.id != currentUserId) return -1;
        if (b.id == currentUserId && a.id != currentUserId) return 1;

        // using common reviewers comparer
        return ReviewerUtils.identityRefWithVoteUIComparer(a, b);
    }

    private _createReviewerPreview(reviewer: VCContracts.IdentityRefWithVote): JQuery {
        let reviewerElem : JQuery = $(Utils_UI.domElem("span", "vc-pr-reviewer-preview-container"));
        
        let reviewerImage = IdentityImage.identityImageElement(this._pullRequestViewModel.repositoryContext.getTfsContext(), reviewer.id, null, 'vc-pr-reviewer-image')
            .attr("alt", reviewer.displayName)
            .appendTo(reviewerElem);
        
        if (reviewer.vote != PullRequestVoteStatus.NONE) {
            reviewerImage.addClass("reviewer-with-vote");
            switch (reviewer.vote) {
                case PullRequestVoteStatus.APPROVE:  case PullRequestVoteStatus.APPROVE_WITH_COMMENT:
                    $(Utils_UI.domElem("span","bowtie-icon bowtie-status-success vote-overlay")).appendTo(reviewerElem);
                    break;
                case PullRequestVoteStatus.NOT_READY:
                    $(Utils_UI.domElem("span","bowtie-icon bowtie-status-waiting-fill vote-overlay")).appendTo(reviewerElem);
                    break;
                case PullRequestVoteStatus.REJECT:
                    $(Utils_UI.domElem("span","bowtie-icon bowtie-status-failure vote-overlay")).appendTo(reviewerElem);
                    break;
            }
        }

        this._generateTooltipOnHover(reviewerElem, [reviewer]);

        return reviewerElem;
    }

    private _generateTooltipOnHover($element: JQuery, reviewers: VCContracts.IdentityRefWithVote[]) {
        let generateTooltipTimeout;

        $element.mouseenter(() => {
            //generating potentially 1200 tooltips can be expensive so don't actually generate them until they are needed
            generateTooltipTimeout = setTimeout(() => {
                $element.unbind('mouseenter mouseleave');

                let $tooltipContent = $(Utils_UI.domElem('div'))
                    .attr("data-bind", "template: { name: 'vc-pullrequest-action-reviewers-ko' }");

                let tooltip: PopupContent.RichContentTooltip = <PopupContent.RichContentTooltip>Controls.Enhancement.enhance<PopupContent.IRichContentTooltipOptions>(PopupContent.RichContentTooltip, $element, {
                    cssClass: "delegate-rich-content-tooltip",
                    html: $tooltipContent,
                    openCloseOnHover: true,
                });

                let data = new VCPullRequestReviewerViewModel.ReviewerList(this._pullRequestViewModel.repositoryContext, this._pullRequestViewModel, reviewers);

                ko.applyBindings(data, $tooltipContent[0]);
                tooltip.show();
            }, reviewerControl._tooltipTimeoutLength);
        });
        $element.mouseout(() => {
            clearTimeout(generateTooltipTimeout);
        });
    }
}