import Utils_UI = require("VSS/Utils/UI");
import domElem = Utils_UI.domElem;

export function loadTemplates() {
    $(domElem('script'))
        .attr('id', "vc-pullrequest-details-action-reviewers-ko")
        .attr('type', 'text/html')
        .html(pullrequestDetailsActionReviewersTemplate)
        .appendTo($('body'));

    $(domElem('script'))
        .attr('id', "vc-pullrequest-action-reviewers-ko")
        .attr('type', 'text/html')
        .html(pullrequestActionReviewersTemplate)
        .appendTo($('body'));

    $(domElem('script'))
        .attr('id', "vc-pullrequest-details-action-reviewers-template")
        .attr('type', 'text/html')
        .html(vcPullrequestDetailsActionReviewersTemplate)
        .appendTo($('body'));
}

const pullrequestDetailsActionReviewersTemplate = `
    <div class="vc-pullrequest-view-details-reviewer" data-bind="foreach: { data: reviewers, afterRender: onAfterRenderReviewer }">
        <div data-bind="template: { name: 'vc-pullrequest-details-action-reviewers-template' } " />
    </div>`;

const pullrequestActionReviewersTemplate = `
    <div class="vc-pullrequest-view-details-reviewer" data-bind="foreach: { data: reviewers, afterRender: afterRender }">
        <div data-bind="template: { name: 'vc-pullrequest-details-action-reviewers-template' } " />
    </div>`;

const vcPullrequestDetailsActionReviewersTemplate = 
    `<div class="vc-pullrequest-view-reviewer-display"  data-bind="css: { 'vc-pullrequest-view-current-user-display': $index() > 0 && isCurrentUser && !isDelegateReviewer && parent.isActive() }">
        <table class="vc-pullrequest-view-details-reviewers-table">
            <tr>
                <td class="vc-pullrequest-entry-user-image-cell">
                    <div class="vc-pullrequest-reviewer-entry-user-image"></div>
                </td>
                <td>
                    <table class="vc-pullrequest-reviewer-entry-details">
                        <tr>
                            <td>
                                <table class="vc-pullrequest-reviewer-displayname">
                                    <tbody>
                                        <tr>
                                            <td>
                                                <span data-bind="visible: isRequiredReviewer, text: requiredReviewerText" class="vc-pullrequest-reviewer-displayname-requiredlabel"></span>
                                                <span data-bind="visible: isRequiredReviewer"> - </span>
                                                <span data-bind="text: displayName, attr: { title: displayName }"></span>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </td>
                        </tr>
                        <tr data-bind="visible: !reviewer.isContainer && (!isCurrentUser || isDelegateReviewer)">
                            <td>
                                <span data-bind="visible: isAwaitingResponse" class="bowtie-icon bowtie-status-waiting bowtie-icon bowtie-status-waiting-response"></span>
                                <span data-bind="visible: isApproved" class="bowtie-icon bowtie-status-success"></span>
                                <span data-bind="visible: isApproveWithComment" class="bowtie-icon bowtie-status-success"></span>
                                <span data-bind="visible: isNotReady" class="bowtie-icon bowtie-status-waiting-fill"></span>
                                <span data-bind="visible: isRejected" class="bowtie-icon bowtie-status-failure"></span>
                                <span class= "vc-pullrequest-view-details-action-text" data-bind="visible: isApproved, text: pullRequestApproveText"></span>
                                <span class= "vc-pullrequest-view-details-action-text" data-bind="visible: isApproveWithComment, text: pullRequestApproveWithCommentText"></span>
                                <span class= "vc-pullrequest-view-details-action-text" data-bind="visible: isNotReady, text: pullRequestNotReadyText"></span>
                                <span class= "vc-pullrequest-view-details-action-text" data-bind="visible: isRejected, text: pullRequestRejectText"></span>
                                <span class= "vc-pullrequest-view-details-action-text" data-bind="visible: isAwaitingResponse && parent.isActive(), text: pullRequestReviewerFeedbackAwaitingResponseText"></span>
                                <span class= "vc-pullrequest-view-details-action-text" data-bind="visible: isAwaitingResponse && !parent.isActive(), text: pullRequestReviewerFeedbackNoResponseText"></span>
                            </td>
                        </tr>
                        <tr data-bind="visible: !reviewer.isContainer && isCurrentUser && !isDelegateReviewer">
                            <td>
                                <div class="vc-pullrequest-vote-dropdown" data-bind="visible: parent.isActive(), attr: { id: reviewer.id }"></div>
                                <span data-bind="visible: isAwaitingResponse && !parent.isActive()" class="bowtie-icon bowtie-status-waiting bowtie-icon bowtie-status-waiting-response"></span>
                                <span data-bind="visible: isApproved && !parent.isActive()" class="bowtie-icon bowtie-status-success"></span>
                                <span data-bind="visible: isApproveWithComment && !parent.isActive()" class="bowtie-icon bowtie-status-success"></span>
                                <span data-bind="visible: isNotReady && !parent.isActive()" class="bowtie-icon bowtie-status-waiting-fill"></span>
                                <span data-bind="visible: isRejected && !parent.isActive()" class="bowtie-icon bowtie-status-failure"></span>
                                <span class= "vc-pullrequest-view-details-action-text" data-bind="visible: isApproved && !parent.isActive(), text: pullRequestApproveText"></span>
                                <span class= "vc-pullrequest-view-details-action-text" data-bind="visible: isApproveWithComment && !parent.isActive(), text: pullRequestApproveWithCommentText"></span>
                                <span class= "vc-pullrequest-view-details-action-text" data-bind="visible: isNotReady && !parent.isActive(), text: pullRequestNotReadyText"></span>
                                <span class= "vc-pullrequest-view-details-action-text" data-bind="visible: isRejected && !parent.isActive(), text: pullRequestRejectText"></span>
                                <span class= "vc-pullrequest-view-details-action-text" data-bind="visible: isAwaitingResponse && !parent.isActive(), text: pullRequestReviewerFeedbackNoResponseText"></span>
                            </td>
                        </tr>
                        <tr data-bind="visible: reviewer.isContainer ">
                            <td>
                                <span data-bind="visible: isApproved" class="bowtie-icon bowtie-status-success"></span>
                                <span data-bind="visible: isApproveWithComment" class="bowtie-icon bowtie-status-success"></span>
                                <span data-bind="visible: isNotReady" class="bowtie-icon bowtie-status-waiting-fill"></span>
                                <span data-bind="visible: isRejected" class="bowtie-icon bowtie-status-failure"></span>
                                <span class="vc-pullrequest-view-details-action-text" data-bind="visible: !isAwaitingResponse && hasDelegateReviewers, text: pullRequestDelegateReviewerViaText"></span>
                                <a class="vc-pullrequest-view-details-action-text vc-pullrequest-view-delegatereviewer-popup" data-bind="visible: !isAwaitingResponse && hasDelegateReviewers, text: delegateReviewersDisplayName"></a>

                                <span class= "vc-pullrequest-view-details-action-text" data-bind="visible: !isAwaitingResponse && !hasDelegateReviewers, text: voteText"></span>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
        <div data-bind="if: $.isFunction(parent.removeReviewer) && !isImplicitReviewer && !isDelegateReviewer" class="vc-pullrequest-delete-reviewer-button">
            <a data-bind="click: parent.removeReviewer.bind(parent, reviewer), clickBubble: false" href="#">
                <span class="icon default icon-delete-grey-f1-background"></span>
                <span class="icon highlight icon-delete-f1-background"></span>
            </a>
        </div>
    </div>`;
