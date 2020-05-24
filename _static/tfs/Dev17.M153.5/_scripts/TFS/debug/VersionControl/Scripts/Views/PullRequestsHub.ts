
import * as Controls from "VSS/Controls";
import * as Contribution_Services from "VSS/Contributions/Services";
import { CustomerIntelligenceData } from "VersionControl/Scripts/CustomerIntelligenceData";
import { MyPullRequestsView } from "VersionControl/Scripts/Views/MyPullRequestsView";
import { PullRequestsView } from "VersionControl/Scripts/Views/PullRequestsView";
import * as Navigation from "VSS/Controls/Navigation";
import * as NotificationBar from "VersionControl/Scripts/Templates/NotificationBar";
import * as PullRequestSummaryDetails  from "VersionControl/Scripts/Templates/PullRequestSummaryDetails";
import * as PullRequestDetailsReviewers from "VersionControl/Scripts/Templates/PullRequestDetailsReviewers";
import * as PullRequestSearchAdapter from "VersionControl/Scripts/Controls/PullRequestSearchAdapter";
import * as SDK_Shim from "VSS/SDK/Shim";
import * as Service from "VSS/Service";
import * as Utils_UI from "VSS/Utils/UI";
import {ValidateRepository} from "VersionControl/Scenarios/Shared/ValidateRepository";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import * as VSS from "VSS/VSS";
import * as VCEmptyPRListExperience_NO_REQUIRE from "VersionControl/Scenarios/PullRequestList/EmptyListExperience";
import * as HeaderUtilities from "Presentation/Scripts/TFS/TFS.MyExperiences.HeaderHelper";

import domElem = Utils_UI.domElem;

import "VSS/LoaderPlugins/Css!VersionControl";

interface IPullRequestsHubOptions {
    isMyPullRequestsHub: boolean;
}

class PullRequestsHub extends Controls.Control<IPullRequestsHubOptions> {

    private _isMyPullRequestsHub: boolean;

    public initialize() {
        super.initialize();
        this._isMyPullRequestsHub = this._options.isMyPullRequestsHub;

        //The repository neednot be validated for the MyPR page
        if (!(this._isMyPullRequestsHub || ValidateRepository.repositoryForPageExists(this._element))) {
            return;
        }

        const data = Service.getService(Contribution_Services.WebPageDataService).getPageData<any>("ms.vss-code-web.pull-requests-list-data-provider");
        const key = "TFS.VersionControl.PullRequestsListProvider.isDayZeroExperience";
        const isDayZeroExperience = data.hasOwnProperty(key) && data[key];

        if (isDayZeroExperience && this._isMyPullRequestsHub) {
            this._element.addClass("zero-day-experience");
            this._showDayZeroPullRequestListExperience();
            return;
        }

        //load all the templates needed by the knockout controls onto the page
        NotificationBar.loadTemplates();
        PullRequestSummaryDetails.loadTemplates();
        PullRequestDetailsReviewers.loadTemplates();

        const hubView = `
                <div class="hub-view versioncontrol-pullrequests-view git-repositories-view">
                    <div class="hub-title">
                        <div class="vc-pullrequests-titleArea">
                            <div class="vc-page-title-area">
                                <table style="width: 100%">
                                    <tr>
                                        <td style="width: 100%">
                                            <div class="vc-page-title"></div>
                                            <div class="vc-right bowtie">
                                                <div class="vc-search-adapter-pull-requests search-box bowtie"></div>
                                            </div>
                                        </td>
                                    </tr>
                                </table>
                            </div>
                        </div>
                    </div>
                    <div class="hub-progress pageProgressIndicator" style="visibility: hidden;"></div>
                    <div class="hub-content">
                        <div class="hub-pivot">
                            <div class="views">
                                <div class="vc-pullrequests-pivotArea" style="display:none"></div>
                            </div>
                            <div class="filters">
                                <div class="vc-pullrequests-page-hubpivot-area" style="display: none" data-bind="visible: isShowingFilters()">
                                    <div class="vc-pullrequests-page-hubpivot-area-table-row">
                                        <div class="vc-pullrequest-filter-container" data-bind="visible: isShowingAllPullRequestResults()">
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="hub-pivot-content">
                            <div class="vc-pullrequests-titleArea-previewMessage"></div>
                            <div class="versioncontrol-pullrequests-content"></div>
                        </div>
                    </div>
                </div>`;

        this._element.append($(hubView));

        const $pivotcontent = this._element.find(".vc-pullrequests-pivotArea");

        const pivotItems: Navigation.IPivotViewItem[] = [];

        const mineTabText = this._isMyPullRequestsHub ? VCResources.PullRequest_Pivot_Active : VCResources.PullRequest_Pivot_AllMine;

        pivotItems.push({
            id: "mine",
            text: mineTabText
        });

        //we dont need active tab for MyPr hub
        if (!this._isMyPullRequestsHub) {
            pivotItems.push({
                id: "active",
                text: VCResources.PullRequest_Pivot_Active
            });
        }

        pivotItems.push({
            id: "completed",
            text: VCResources.PullRequest_Pivot_Completed
        });

        //we dont need abandoned tab for MyPr hub
        if (!this._isMyPullRequestsHub) {
            pivotItems.push({
                id: "abandoned",
                text: VCResources.PullRequest_Pivot_Abandoned
            });
        }

        <Navigation.PivotView>Controls.BaseControl.create(Navigation.PivotView, $pivotcontent, {
            items: pivotItems,
            cssClass: "enhance vc-pullrequest-tabs"
        });

        if (this._isMyPullRequestsHub) {
            Controls.Enhancement.enhance(MyPullRequestsView, this._element);
        }
        else {                   
            //Add create new pull request experience if the hub is not MyPr page
            const createNewPullRequestButton = `<button class="btn-cta" data-bind="click: newPullRequest, text: newPullRequestButtonText"></button>`;
            this._element.find(".vc-page-title-area .vc-right").prepend($(createNewPullRequestButton));

            Controls.Enhancement.enhance(PullRequestsView, this._element);
        }
    }

    private _showDayZeroPullRequestListExperience(): void {
        VSS.using(["VersionControl/Scenarios/PullRequestList/EmptyListExperience"],
            (VCEmptyPRListExperience: typeof VCEmptyPRListExperience_NO_REQUIRE) => {

                const props = {
                    customerIntelligenceData: new CustomerIntelligenceData()
                } as VCEmptyPRListExperience_NO_REQUIRE.IEmptyPRListExperienceProps;

                VCEmptyPRListExperience.createIn(this._element[0], props);

            });
    }
}

SDK_Shim.VSS.register("myPullRequestsView.initialize", (context) => {
    HeaderUtilities.updateHeaderState();
    context.$container.addClass("contributable-pullrequests-hub my-pullrequests-view");
    return Controls.create<PullRequestsHub, IPullRequestsHubOptions>(PullRequestsHub, context.$container, { isMyPullRequestsHub: true });
});

SDK_Shim.VSS.register("versionControl.pullRequestsHub", (context) => {
    return Controls.create<PullRequestsHub, IPullRequestsHubOptions>(PullRequestsHub, context.$container, { isMyPullRequestsHub: false });
});
