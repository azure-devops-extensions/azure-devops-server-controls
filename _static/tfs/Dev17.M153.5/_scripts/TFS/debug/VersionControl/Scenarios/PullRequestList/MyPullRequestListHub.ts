import { PullRequestListHubBase } from "VersionControl/Scenarios/PullRequestList/PullRequestListHubBase";
import * as Controls from "VSS/Controls";
import { MyPullRequestListView } from "VersionControl/Scenarios/PullRequestList/MyPullRequestListView";
import * as SDK_Shim from "VSS/SDK/Shim";
import * as HeaderUtilities from "Presentation/Scripts/TFS/TFS.MyExperiences.HeaderHelper";

/** This Hub is an entry point of MyPullRequestList rendering */
class MyPullRequestListHub extends PullRequestListHubBase {

    protected validateRepository() {
        return true;
    }

    protected enhanceView() {
        Controls.Enhancement.enhance(MyPullRequestListView, this._element);
    }
}

SDK_Shim.VSS.register("myPullRequestsView.initialize", (context) => {
    HeaderUtilities.updateHeaderState();
    context.$container.addClass("contributable-pullrequests-hub my-pullrequests-view");
    return Controls.create(MyPullRequestListHub, context.$container, context.options);
});