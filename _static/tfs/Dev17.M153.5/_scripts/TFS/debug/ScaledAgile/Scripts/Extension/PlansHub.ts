import * as VSS from "VSS/VSS";
import ReactDOM = require("react-dom");
import SDK_Shim = require("VSS/SDK/Shim");
import * as Service from "VSS/Service";
import { delay } from "VSS/Utils/Core";

import { HubsService } from "VSS/Navigation/HubsService";
import { getNavigationHistoryService, INavigationPopStateEvent, INavigationHistoryService } from "VSS/Navigation/NavigationHistoryService";
import { FeatureEnablement } from "ScaledAgile/Scripts/Shared/Utils/FeatureEnablement";
import { WebPageDataHelper } from "ScaledAgile/Scripts/Shared/Utils/WebPageDataHelper";

import { Constants } from "ScaledAgile/Scripts/Generated/TFS.ScaledAgile.Constants";
import * as XhrNavUtils from "ScaledAgile/Scripts/Shared/Utils/PlanXhrNavigationUtils";

import * as Async_PlanPage from "ScaledAgile/Scripts/PlanPage";
import * as Async_PlanListPage from "ScaledAgile/Scripts/PlanListPage";
import * as Async_NewPlanPage from "ScaledAgile/Scripts/NewPlanPage";

SDK_Shim.registerContent("plans.plansHub", (context: SDK_Shim.InternalContentContextData) => {
    const historyService = getNavigationHistoryService();
    renderPageBasedOnState(context, historyService);
    return {
        dispose: () => {
            // When navigating to another hub, this cleanup code might be called as a result of a React event handler. If
            // we dispose while the item is still being processed, we will run into React errors, so cleanup on the next tick.
            delay(null, 0, () => {
                ReactDOM.unmountComponentAtNode(context.container);
            });
        }
    };
});

function renderPageBasedOnState(context: SDK_Shim.InternalContentContextData, historyService: INavigationHistoryService) {
    let state = historyService.getState() || {};
    // Replace action "_a" in state if exists and drop the parameters mru in state coming from project switch since plan is project scoped.
    if (XhrNavUtils.shouldReplaceState(state)) {
        historyService.replaceState(state);
    }

    const stateParam = state[Constants.PlansRouteParameterKey];

    // New Page
    if (XhrNavUtils.isNewPlanPage(stateParam)) {
        showNewPlan(context.container);
        return;
    }

    // Directory Page
    if (XhrNavUtils.isDirectoryPage(stateParam)) {
        showPlanList(context.container, stateParam);
        return;
    }

    // Plan Content Page
    if (stateParam) {
        showPlan(context.container, stateParam);
        return;
    }

    // Use MRU logic
    const mruPlan = WebPageDataHelper.getPlanId();
    if (mruPlan) {
        // If plan ID was specified in data provider, go to the plan content page.
        XhrNavUtils.updateLocationState(historyService, mruPlan);
        showPlan(context.container, mruPlan);
    }
    else {
        // Otherwise, fall back to the directory page with mru pivot or default pivot.
        const mruTab = XhrNavUtils.getLastVisitedPlansDirectoryPivot();
        XhrNavUtils.updateLocationState(historyService, mruTab);
        showPlanList(context.container, mruTab);
    }
}


function showPlanList(container: HTMLElement, pivotKey: string) {
    VSS.using(["ScaledAgile/Scripts/PlanListPage"], (PlanListPage: typeof Async_PlanListPage) => {
        PlanListPage.initPlanListPage(container, pivotKey);
    });
}

function showPlan(container: HTMLElement, planId: string) {
    VSS.using(["ScaledAgile/Scripts/PlanPage"], (PlanPage: typeof Async_PlanPage) => {
        PlanPage.initPlanPage(container, planId);
    });
}

function showNewPlan(container: HTMLElement) {
    VSS.using(["ScaledAgile/Scripts/NewPlanPage"], (NewPlanPage: typeof Async_NewPlanPage) => {
        container.className = `${container.className} new-plan-page`;
        NewPlanPage.initNewPlanPage(container);
    });
}
