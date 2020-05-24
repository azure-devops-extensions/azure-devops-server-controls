import * as React from "react";

import * as Navigation from "VSS/Controls/Navigation";
import * as Navigation_Services from "VSS/Navigation/Services";
import * as SDK_Shim from "VSS/SDK/Shim";

import * as CustomerIntelligenceConstants from "VersionControl/Scripts/CustomerIntelligenceConstants";
import { CustomerIntelligenceData } from "VersionControl/Scripts/CustomerIntelligenceData";

import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { PullRequestListTabControllerView } from "VersionControl/Scenarios/PullRequestList/PullRequestListTabControllerView";
import { Flux } from "VersionControl/Scenarios/PullRequestList/PullRequestListViewBase";
import { PagePerformance } from "VersionControl/Scenarios/Shared/PagePerformance";

SDK_Shim.registerContent("pullRequestList.tab", (context) => {
    return PullRequestListTabUtils.renderTab(context, {
        myAccountPage: false
    });
});

SDK_Shim.registerContent("myPullRequestList.tab", (context) => {
    return PullRequestListTabUtils.renderTab(context, {
        myAccountPage: true
    });
});

export interface TabProps {
    myAccountPage: boolean;
}

export namespace PullRequestListTabUtils {

    export function renderTab(context: any, tabProps: TabProps): JSX.Element {
        // if a page initialized this will create a new scenario to measure navigation to this tab
        if (PagePerformance.isInitialized) {
            PagePerformance.startScenario(CustomerIntelligenceConstants.VERSION_CONTROL_AREA, "PullRequestsListTabNavigation");
        }
        PagePerformance.scenario.addSplitTiming("tab-initialization-started");

        const contributionTabKey = context && context.options && context.options.tabKey;

        Flux.instance.actionCreator.navigateToTab(contributionTabKey, PagePerformance.isInitialized);

        const props = {
            tabId: contributionTabKey,
            storesHub: Flux.instance.storesHub,
            actionCreator: Flux.instance.actionCreator,
            tfsContext: Flux.instance.tfsContext,
            scenario: PagePerformance.scenario,
            isMyAccountPage: tabProps.myAccountPage,
            collapsible: tabProps.myAccountPage,
            showRepositoryDetails: tabProps.myAccountPage
        };

        // mark page as initialized
        if (!PagePerformance.isInitialized) {
            PagePerformance.pageInitialized("tab-initialized");
        }

        return <PullRequestListTabControllerView {...props} />;
    }
}
