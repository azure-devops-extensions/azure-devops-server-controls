import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import Utils_UI = require("VSS/Utils/UI");
import domElem = Utils_UI.domElem;

export function loadTemplates() {
    $(domElem('script'))
        .attr('id', "vc-pullrequest-createNew-ko")
        .attr('type', 'text/html')
        .html(pullRequestCreateNewControlTemplate)
        .appendTo($('body'));
}

const pullRequestCreateNewControlTemplate =
    `<div class="vc-pullrequest-query-server">
        <span data-bind="visible: hasSourceAndTargetBranches() && !serverValidationComplete()">${VCResources.PullRequest_QueryingServer}</span>
    </div>

    <div data-bind="template: { name: 'vc-pullrequest-create-edit-pullRequest-control-ko', data: createEditControlViewModel }"></div>`;
