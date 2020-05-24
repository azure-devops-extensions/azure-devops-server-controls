import Utils_UI = require("VSS/Utils/UI");
import domElem = Utils_UI.domElem;

export function loadTemplates() {
    $(domElem('script'))
        .attr('id', "vc-pullrequests-results-comments-annotation")
        .attr('type', 'text/html')
        .html(pullRequestsResultsCommentsAnnotationTemplate)
        .appendTo($('body'));

    $(domElem('script'))
        .attr('id', "vc-pullrequest-summary-table-ko")
        .attr('type', 'text/html')
        .html(pullRequestsResultsetContainerTemplate)
        .appendTo($('body'));
}

const pullRequestsResultsCommentsAnnotationTemplate = `
    <span class="bowtie-icon bowtie-comment-discussion vc-pullrequest-comment-icon"></span>
    <span class="vc-pullrequest-results-comments-number" data-bind="text: numberOfCommentsText"></span>`;

const pullRequestsResultsetContainerTemplate = `
    <div class="vc-pullrequests-resultset-container">
        <table class="vc-pullrequest-results-table" data-bind="visible: isVisible()">
            <thead data-bind="visible: title()">
                <tr>
                    <td class="vc-pullrequest-entry-colhead vc-pullrequest-entry-col-primary">
                        <span data-bind="text: title()"></span>
                    </td>
                    <td class="vc-pullrequest-entry-colhead vc-pullrequest-entry-col-updates"></td>
                    <td class="vc-pullrequest-entry-colhead vc-pullrequest-entry-col-reviewers"></td>
                    <td class="vc-pullrequest-entry-colhead vc-pullrequest-entry-col-commentcount"></td>
                </tr>
            </thead>

            <tbody data-bind="foreach: { data: pullRequests, afterRender: _onPullRequestAfterRender }">
                <tr class="vc-pullrequest-results-row" data-bind="css: { isNew: isNew() }">

                    <td class="vc-pullrequest-entry-col-primary">
                        <div class="vc-pullrequest-entry-user-image"></div>
                        
                        <div class="ellide-overflow">
                            <div class="vc-pullrequest-summary-title-status-wrapper">
                                <span class="vc-pullrequest-summary-links">
                                    <a class="primary-text" data-bind="attr: { href: pullRequestHref, title: title }, click: handleXhrNavigate">
                                        <span data-bind="text: title"></span></a>
                                </span>
                                <span class="vc-pullrequest-rollupstatus" data-bind="visible: rollupStatusIconCssClass() !== null">
                                    <span class="vc-pullrequest-rollupstatus-icon" data-bind="visible: rollupStatusIconCssClass() !== null, css: rollupStatusIconCssClass, event: { mouseenter: $root._handleMouseEnter, mouseleave: $root._handleMouseLeave }"></span>
                                </span>
                            </div>
                        </div>

                        <div class="secondary-text ellide-overflow">
                            <span data-bind="html: subInfoHtml()"></span>
                        </div>
                    </td>

                    <td class="vc-pullrequest-entry-col-updates">
                        <div class="dot" data-bind="visible: isNew()"></div>
                        <div class="ellide-overflow">
                            <span class="last-updated" data-bind="text: lastUpdatedDateString"></span>
                        </div>
                        <div class="ellide-overflow" data-bind="visible: isNew() && numberOfUpdatesText()">
                            <span class="num-updates" data-bind="text: numberOfUpdatesText"></span>
                        </div>
                    </td>

                    <td class="vc-pullrequest-entry-col-reviewers">
                        <div class="vc-pullrequest-entry-reviewers"></div>
                    </td>

                    <td class="vc-pullrequest-entry-col-commentcount ellide-overflow">
                        <!-- ko if: numberOfComments() > 0 -->
                        <a class="vc-pullrequest-results-comments-link" data-bind="attr: { href: pullRequestHref }">
                            <div data-bind="template: { name: 'vc-pullrequests-results-comments-annotation' }, attr: { title: commentsTooltip() }"></div>
                        </a>
                        <!-- /ko -->
                        <!-- ko ifnot: numberOfComments() > 0 -->
                        <div data-bind="css: 'vc-pullrequest-entry-col-commentcount-zero', template: { name: 'vc-pullrequests-results-comments-annotation' }, attr: { title: commentsTooltip() }"></div>
                        <!-- /ko -->
                    </td>
                </tr>
            </tbody>
        </table>
        <div>
            <a class="vc-pullrequest-showmore-link" data-bind="click: getNextPage, visible: showMoreLinkVisibility(), text: showMoreText"></a>
        </div>
    </div>`;
