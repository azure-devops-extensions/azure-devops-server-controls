import * as Controls from "VSS/Controls";
import { PivotView, IPivotViewItem } from "VSS/Controls/Navigation";
import { VSS } from "VSS/SDK/Shim";

import { HubBase } from "VersionControl/Scenarios/Shared/HubBase";
import { ValidateRepository } from "VersionControl/Scenarios/Shared/ValidateRepository";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import { PullRequestReviewView } from "VersionControl/Scripts/Views/PullRequestReviewView";
import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";
import { FeatureAvailabilityFlags } from "Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants";

import "VSS/LoaderPlugins/Css!VersionControl";
import "VSS/LoaderPlugins/Css!VersionControlControls";
import "VSS/LoaderPlugins/Css!Discussion";

export interface IPageDataService {
    getPageData<T>(key: string, contractMetadata?: any);
}

export class PullRequestReviewHub extends HubBase {
    public initialize() {

        super.initialize();

        if (!ValidateRepository.repositoryForPageExists(this._element)) {
            return;
        }

        const hubTitle = ` \
        <div class="hub-title"> \
            <div class="vc-pullrequest-details-titleArea"></div> \
        </div> `;

        const hubContent = ` \
        <div class="hub-content"> \
            <div class="hub-pivot" role="navigation" aria-label="${VCResources.PullRequest_Views}"> \
                <div class="views"> \
                    <div class="vc-pullrequests-pivotArea"></div> \
                </div> \
            </div> \
            <div class="filters"></div> \
            <div class="vc-dialogs-container"></div> \
            <div class="hub-pivot-content"> \
                <div class="versioncontrol-pullrequests-content"></div> \
            </div> \
        </div> `;

        const hubView = ` \
        <div class="hub-view vc-pullrequest-review-view git-repositories-view"> \
            <div class="vc-pullrequest-short-title"></div> \
            ${hubTitle} \
            <div class="hub-progress pageProgressIndicator" style="visibility: hidden;"></div> \
            ${hubContent} \            
        </div> `;

        this._element.append($(hubView));

        // Build the pivot view
        const $pivotcontent = this._element.find(".vc-pullrequests-pivotArea");
        const pivots = <PivotView>Controls.BaseControl.create(PivotView, $pivotcontent, {
            items: this._getPivotViewItems(),
            cssClass: "enhance vc-pullrequest-tabs",
            contributionId: "ms.vss-code-web.pr-tabs"
        });

        pivots.refreshContributedItems();

        this._element.find(".vc-pullrequest-tabs").attr("data-contribution-id", "ms.vss-code-web.pr-tabs");

        // add PR sepcific selector to the page so top-level out-of-order DOM additions
        // (like office fabric dropdown container) can be specifically styled
        $("body").addClass("vc-pullrequest-review");

        // Draw the view
        <PullRequestReviewView>Controls.Enhancement.enhance(PullRequestReviewView, this._element);
    }

    private _getPivotViewItems(): IPivotViewItem[] {
        const items: IPivotViewItem[] = [];

        // The ids are referenced by the pr quickstart (see PullRequestQuickStart.ts)
        // If these ids change, the quick start will need to be updated
        items.push({
            text: VCResources.PullRequest_Pivot_Overview,
            id: "overview",
            link: "?#_a=Overview",
        });

        items.push({
            text: VCResources.PullRequest_Pivot_Files,
            id: "files",
            link: "?#_a=Files",
        });

        if (!FeatureAvailabilityService.isFeatureEnabled(FeatureAvailabilityFlags.WebAccessVersionControlPullRequestsCommitsTabReplaced)) {
            items.push({
                text: VCResources.PullRequest_Pivot_Updates,
                id: "updates",
                link: "?#_a=Updates",
            });
        }

        items.push({
            text: VCResources.PullRequest_Pivot_Commits,
            id: "commits",
            link: "?#_a=Commits",
        });

        return items;
    }

    protected _dispose(): void {
        super._dispose();

        // remove PR specific selector when we navigate to another page (because of the SPA navigation)
        $("body").removeClass("vc-pullrequest-review");
    }
}

VSS.register("versionControl.pullRequestReviewHub", (context) => {
    return <PullRequestReviewHub> Controls.create(PullRequestReviewHub, context.$container, context.options);
});
