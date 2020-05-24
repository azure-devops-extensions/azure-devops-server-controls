import { PullRequestListHubBase } from "VersionControl/Scenarios/PullRequestList/PullRequestListHubBase";
import { PullRequestListView } from "VersionControl/Scenarios/PullRequestList/PullRequestListView";
import * as Controls from "VSS/Controls";
import * as SDK_Shim from "VSS/SDK/Shim";

export class PullRequestListHub extends PullRequestListHubBase {

    protected enhanceView() {
        Controls.Enhancement.enhance(PullRequestListView, this._element);
    }
}

SDK_Shim.VSS.register("versionControl.pullRequestsHub", (context) => {
    return Controls.create(PullRequestListHub, context.$container, context.options);
});