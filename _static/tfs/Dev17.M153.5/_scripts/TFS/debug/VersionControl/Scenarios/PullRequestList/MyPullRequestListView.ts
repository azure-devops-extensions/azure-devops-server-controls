import "VSS/LoaderPlugins/Css!VersionControl/MyPullRequestListView";
import * as CustomerIntelligenceConstants from "VersionControl/Scripts/CustomerIntelligenceConstants";
import * as Performance from "VSS/Performance";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import { PullRequestListViewBase, Flux } from "VersionControl/Scenarios/PullRequestList/PullRequestListViewBase";
import { MyPullRequestListTelemetry } from "VersionControl/Scenarios/PullRequestList/MyPullRequestListTelemetry";
import { ITabInfoActionCreator } from "VersionControl/Scenarios/PullRequestList/Actions/TabInfoActionCreator";
import { MyTabInfoActionCreator } from "VersionControl/Scenarios/PullRequestList/Actions/MyTabInfoActionCreator";
import { MyPullRequestListTopView } from "VersionControl/Scenarios/PullRequestList/MyPullRequestListTopView";

export class MyPullRequestListView extends PullRequestListViewBase {

    constructor() {
        super({ telemeteryFeatureArea: CustomerIntelligenceConstants.MY_PULL_REQUEST_VIEW_FEATURE });
    }

    public initializeOptions(options?: any) {
        super.initializeOptions(options);

        // we don't have a repository context in the MyPr page, set it to null
        this._repositoryContext = null;
        this._telemetry = new MyPullRequestListTelemetry();
        this.tabConributionsSelector = "ms.vss-tfs-web.collection-pullrequests-new-hub-tab-group";
    }

    protected getTabsInfoInitializer(): ITabInfoActionCreator {
        return new MyTabInfoActionCreator(Flux.instance.actionsHub, this._tfsContext,
            Flux.instance.sourcesHub.pullRequestListSource, this._telemetry);
    }

    protected attachTopView(container: HTMLElement) {
        MyPullRequestListTopView.attachView(container, {
            storesHub: Flux.instance.storesHub,
            pivotViewActions: Flux.instance.actionsHub.pivotViewActions
        });
    }
}