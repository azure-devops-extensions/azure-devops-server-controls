/// <amd-dependency path='VSS/LoaderPlugins/Css!MyPullRequestsView' />

import CustomerIntelligenceConstants = require("VersionControl/Scripts/CustomerIntelligenceConstants");
import Performance = require("VSS/Performance");
import VCResources = require("VersionControl/Scripts/Resources/TFS.Resources.VersionControl");
import VCPullRequestsView = require("VersionControl/Scripts/Views/PullRequestsView");

export class MyPullRequestsView extends VCPullRequestsView.PullRequestsView {

    constructor() {
        super({ telemeteryFeatureArea: CustomerIntelligenceConstants.MY_PULL_REQUEST_VIEW_FEATURE });
    }

    public initializeOptions(options?: any) {
        super.initializeOptions($.extend({
            viewTitle: VCResources.MyPullRequestsViewTitle,
            excludeAllPullRequestsFilter: true
        }, options));
        // we don't have a repository context in the MyPr page, set it to null
        this._repositoryContext = null;
    }
}