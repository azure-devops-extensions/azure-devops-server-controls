import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import Utils_UI = require("VSS/Utils/UI");
import domElem = Utils_UI.domElem;

export function loadTemplates() {
    $(domElem('script'))
        .attr('id', "vc-pullrequest-create-edit-pullRequest-control-ko")
        .attr('type', 'text/html')
        .html(pullRequestCreateEditControlTemplate)
        .appendTo($('body'));
}

const pullRequestCreateEditControlTemplate =
    `<div class="vc-pullrequest-create-panel bowtie" data-bind="visible: isVisible" style="display: block;">
        <fieldset class="vc-pullrequest-create-area">
            <div class="form-section">
                <input class="vc-pullrequest-title-input" data-bind="value: title, valueUpdate: 'afterkeydown', css: { 'vc-pullrequest-title-input-invalid': !hasTitle() }" type="text" autocomplete="off" maxlength="255" placeholder="${VCResources.PullRequest_TitlePlaceHolder}">
            </div>
            <div class="description form-section" data-bind="visible: isShowingDetailedView()">
                <label class="vc-pullrequest-create-input-label">
                    ${VCResources.PullRequest_Description}
                </label>
                <textarea class="vc-pullrequest-description-input" data-bind="value: description, hasfocus: descriptionHasFocus" maxlength="4000" placeholder="${VCResources.PullRequest_DescriptionPlaceHolder}"></textarea>
                <div class="vc-description-edit-markdownlabel">
                    <a href="http://go.microsoft.com/fwlink/?LinkId=823918" target="_blank" rel="noopener noreferrer">  ${VCResources.MarkdownInstructions} </a>
                    <span>&nbsp; ${VCResources.MentionInstructions} </span>
                </div>
                <div class="vc-pullrequest-description-markdown-preview"></div>
            </div>
            <div class="vc-pullrequest-create-reviewers-panel form-section" data-bind="visible: isShowingDetailedView()">
                <label class="vc-pullrequest-create-input-label">
                    ${VCResources.PullRequest_Reviewers}
                </label>
            </div>
            <div class="vc-pullrequest-create-workitems-panel form-section" data-bind="visible: isShowingDetailedView()">
                <label class="vc-pullrequest-create-input-label">
                    ${VCResources.PullRequest_RelatedArtifactsTitle}
                </label>
                <span class="vc-pullrequest-work-item-link-warning" data-bind="text: workItemsExceededText"></span>
            </div>
            <div class="vc-pullrequest-create-area2 form-section">
                <button data-bind="click: ok, enable: hasTitle() && !actionsButtonDisabled() && hasFetchedWorkItems(), text: buttonCaption" type="button" class="vc-pullrequests-add-panel-button cta"></button>
                <a data-bind="click: toggleDetailedCreateView, visible: !isShowingDetailedView()">${VCResources.PullRequest_MoreOptions}</a>
                <a data-bind="click: toggleDetailedCreateView, visible: isShowingDetailedView()">${VCResources.PullRequest_FewerOptions}</a>
            </div>
        </fieldset>

    </div>`;
