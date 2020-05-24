
// VSS
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import * as Controls from "VSS/Controls";
import * as Navigation from "VSS/Controls/Navigation";
import * as NotificationBar from "VersionControl/Scripts/Templates/NotificationBar";
import * as PullRequestCreate from "VersionControl/Scripts/Views/PullRequestCreateView";
import * as PullRequestCreateEditControl from "VersionControl/Scripts/Templates/PullRequestCreateEditControl";
import * as PullRequestCreateNewControl from "VersionControl/Scripts/Templates/PullRequestCreateNewControl";
import * as PullRequestDetailsReviewers from "VersionControl/Scripts/Templates/PullRequestDetailsReviewers";
import * as PullRequestSummaryDetails  from "VersionControl/Scripts/Templates/PullRequestSummaryDetails";
import {ValidateRepository} from "VersionControl/Scenarios/Shared/ValidateRepository";
import * as SDK_Shim from "VSS/SDK/Shim";
import * as Utils_UI from "VSS/Utils/UI";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";

import domElem = Utils_UI.domElem;

import "VSS/LoaderPlugins/Css!VersionControl";
import "VSS/LoaderPlugins/Css!Site";

export class PullRequestCreateHub extends Controls.Control<any> {

    public initialize() {

        super.initialize();

        if (!ValidateRepository.repositoryForPageExists(this._element)) {
            return;
        }

        //load all the templates needed by the knockout controls onto the page
        NotificationBar.loadTemplates();
        PullRequestSummaryDetails.loadTemplates();
        PullRequestDetailsReviewers.loadTemplates();
        PullRequestCreateEditControl.loadTemplates();
        PullRequestCreateNewControl.loadTemplates();

        const hubTitle = ` \
        <div class="hub-title"> \
            <div class="vc-pullrequest-create-titleArea" style="display:none"> \
                <div class="vc-page-title-area"> \
                    <table"> \
                        <tr> \
                            <td> \
                                <div class="vc-page-title-create"> \
                                    ${VCResources.PullRequest_CreateNewFrom1} \
                                </div> \
                                <div class="vc-pullrequest-branches-container-source invalid-selection"></div> \
                                <div class="vc-page-title-create"> \
                                    ${VCResources.PullRequest_CreateNewFrom2} \
                                </div> \
                                <div class="vc-pullrequest-branches-container-target invalid-selection" ></div> \
                                <div class="vc-pullrequest-switch-branch-button"> \
                                    <a class="bowtie-icon bowtie-switch" href="#" title="${VCResources.SwitchBaseTargetBranches}" data-bind="click: createNewPullRequestViewModel.switchBranch"></a> \
                                </div> \
                            </td> \
                        </tr> \
                    </table> \
                </div> \
            </div> \
        </div> `;

        const hubContent = ` \
        <div class="hub-content"> \
            <div class="hub-pivot hidden"> \
                <div class="views"> \
                    <div class="vc-pullrequests-pivotArea" style="display:none"></div> \
                </div> \
            </div> \
            <div class="filters"></div> \
            <div class="hub-pivot-content"> \
                <div class="vc-pullrequest-create-titleArea-previewMessage"></div> \
                <div class="versioncontrol-pullrequests-content"></div> \
            </div> \
        </div> `;

        const hubView = ` \
        <div class="hub-view versioncontrol-pullrequest-create-view"> \
            ${hubTitle} \
            <div class="hub-progress pageProgressIndicator" style="visibility: hidden;"></div> \
            ${hubContent} \
        </div> `;

        this._element.append($(hubView));

        // Draw the pivot view
        const $pivotcontent = this._element.find(".vc-pullrequests-pivotArea");
        const pivotItems: Navigation.IPivotViewItem[] = [];
        Controls.BaseControl.create(Navigation.PivotView, $pivotcontent, {
            items: pivotItems,
            cssClass: "empty enhance vc-pullrequest-tabs"
        });

        //Draw the view
        Controls.Enhancement.enhance(PullRequestCreate.PullRequestCreateView, this._element);
    }
}

SDK_Shim.VSS.register("versionControl.pullRequestCreateHub", (context) => {
    return Controls.create(PullRequestCreateHub, context.$container, context.options);
});
