import * as React from "react";
import * as ReactDOM from "react-dom";
import * as Q from "q";

import * as SDK_Shim from "VSS/SDK/Shim";
import { getNavigationHistoryService, INavigationPopStateEvent } from "VSS/Navigation/NavigationHistoryService";
import { ContributionsHttpClient } from "VSS/Contributions/RestClient";
import { DataProviderQuery } from "VSS/Contributions/Contracts";
import * as VSS_Service from "VSS/Service";
import * as Contribution_Services from "VSS/Contributions/Services";
import { ServiceInstanceTypes } from "VSS/WebApi/Constants";
import * as Contributions_Contracts from "VSS/Contributions/Contracts";

import { HubViewOptionKeys } from 'VSSUI/Utilities/HubViewState';

import { VssHubViewState } from "VSSPreview/Utilities/VssHubViewState";
import { HistoryBehavior } from 'VSSPreview/Utilities/ViewStateNavigation';

import { Dashboard } from "TFS/Dashboards/Contracts";
import { DashboardsHubContext } from "Dashboards/Components/DashboardsHubContext";
import { ContentView } from "Dashboards/Components/Content/ContentView";
import { DirectoryView } from "Dashboards/Components/Directory/DirectoryView";
import { UrlConstants, ContributionIds } from "Dashboards/Components/Constants";
import { DashboardPageExtension } from "Dashboards/Scripts/Common";
import { DashboardPageContext } from "Dashboards/Scripts/DashboardPageContext";
import { DashboardProviderPropertyBagNames, DashboardPageDataProviderKeys } from "Dashboards/Scripts/Generated/Constants";

SDK_Shim.registerContent("dashboards.hub", (context: SDK_Shim.InternalContentContextData) => {
    DashboardPageContext.setPageContext(context.options._pageContext);
    const hubViewState = new VssHubViewState({
        filterNavigationParameters: [
            { key: "keyword", rawString: true }
        ],
        pivotNavigationParamName: UrlConstants.NameKey,
        viewOptionNavigationParameters: [
            { key: HubViewOptionKeys.showFilterBar, behavior: HistoryBehavior.none }
        ]
    });

    hubViewState.viewOptions.setViewOption(HubViewOptionKeys.showFilterBar, true);

    const container = context.$container[0];
    const dashboardContext = DashboardsHubContext.getInstance();

    const lazyGetDashboard = () => {
        const lazyDashboard = Q.defer<Dashboard>();
        const currentDashboard = DashboardPageExtension.getWidgetsFromDataIsland();
        if (!currentDashboard) {
            const webPageDataSvc = VSS_Service.getService(Contribution_Services.WebPageDataService);
            const contribution = {
                id: DashboardProviderPropertyBagNames.DashboardsContent,
                properties: {
                    "serviceInstanceType": ServiceInstanceTypes.TFS
                }
            } as Contributions_Contracts.Contribution;
            webPageDataSvc.ensureDataProvidersResolved(
                [contribution],
                true,
                {
                    "dashboardId": DashboardPageExtension.getDashboardIdFromRouteValues()
                }).then(() => {
                lazyDashboard.resolve(DashboardPageExtension.getWidgetsFromDataIsland());
            })
        }
        else {
            lazyDashboard.resolve(currentDashboard);
        }

        return lazyDashboard.promise;
    }

    const renderPivot = () => {
        let pivot = hubViewState.selectedPivot.value;
        if (pivot) {
            pivot = pivot.toLowerCase();
        }

        switch (pivot) {
            case UrlConstants.AllView:
            case UrlConstants.MineView:
            case UrlConstants.DirectoryView:
            const initialTeam = getNavigationHistoryService().getState()[UrlConstants.TeamIdRouteKey];
            ReactDOM.render(<DirectoryView context={dashboardContext} hubViewState={hubViewState} initialTeam={initialTeam} />, container);
                break;
            default:
                lazyGetDashboard().then((dashboard: Dashboard) => {
                    ReactDOM.render(<ContentView context={dashboardContext} hubViewState={hubViewState} currentDashboard={dashboard} />, container);
                });           
        }
    };

    const renderPivotEventHandler = (event: INavigationPopStateEvent) => {
        if (event.newState.navigationElementId !== ContributionIds.DashboardHubId) {
            return;
        }

        renderPivot();
    };

    renderPivot();
    getNavigationHistoryService().subscribe(renderPivotEventHandler);

    const disposable = {
        dispose: () => {
            hubViewState.dispose();
            ReactDOM.unmountComponentAtNode(context.container);
            getNavigationHistoryService().unsubscribe(renderPivotEventHandler);
        }
    };

    return disposable;
});