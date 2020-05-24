import { initializeRouter } from "Presentation/Scripts/TFS/Router/ContributionHubViewStateRouter";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import * as PageEvents from "VSS/Events/Page";
import { getAsyncLoadedComponent } from "VSS/Flux/AsyncLoadedComponent";
import { getNavigationHistoryService } from "VSS/Navigation/NavigationHistoryService";
import * as SDK_Shim from "VSS/SDK/Shim";
import * as Utils_String from "VSS/Utils/String";
import * as VSS from "VSS/VSS";
import { ActionParameters, ActionUrl } from "WorkItemTracking/Scripts/ActionUrls";
import { WITPerformanceScenario } from "WorkItemTracking/Scripts/CustomerIntelligence";
import * as QueriesFolderViewAsync from "WorkItemTracking/Scripts/Queries/Components/QueriesFolderView";
import { QueriesHubContext } from "WorkItemTracking/Scripts/Queries/Components/QueriesHubContext";
import * as QueriesViewAsync from "WorkItemTracking/Scripts/Queries/Components/QueriesView";
import { TriageViewHubs } from "WorkItemTracking/Scripts/Queries/Components/TriagePivot/TriageViewHubs";
import * as WorkItemEditViewAsync from "WorkItemTracking/Scripts/Queries/Components/TriagePivot/WorkItemEditView";
import { IWorkItemEditViewProps } from "WorkItemTracking/Scripts/Queries/Components/TriagePivot/WorkItemEditViewProps";
import { QueriesHubConstants } from "WorkItemTracking/Scripts/Queries/Models/Constants";
import { QueriesHubRequestHandler } from "WorkItemTracking/Scripts/Queries/QueriesHubRequestHandler";
import { PerfScenarioManager } from "WorkItemTracking/Scripts/Utils/PerfScenarioManager";
import * as React from "react";
import * as ReactDOM from "react-dom";

const queriesViewModuleName = ["WorkItemTracking/Scripts/Queries/Components/QueriesView"];

SDK_Shim.registerContent("newqueries.hub", (context: SDK_Shim.InternalContentContextData) => {
    const queriesContext = QueriesHubContext.getInstance();
    const requestHandler = new QueriesHubRequestHandler(queriesContext.queryHubViewState, TfsContext.getDefault());
    initializeRouter(context.container, requestHandler, queriesContext.queryHubViewState);

    return {
        dispose: () => {
            ReactDOM.unmountComponentAtNode(context.container);
        }
    };
});

SDK_Shim.registerContent("newqueries.results", (context: SDK_Shim.InternalContentContextData): JSX.Element => {
    // if /edit or /new just go straight to work item.  this is the scenario of hitting
    // back from the browser when you left triage view
    if (isWorkItemView()) {
        const AsyncWorkItemsView = getAsyncLoadedComponent(
            ["WorkItemTracking/Scripts/Queries/Components/TriagePivot/WorkItemEditView"],
            (m: typeof WorkItemEditViewAsync) => m.WorkItemEditView);

        return <AsyncWorkItemsView {...getWorkItemEditViewProps()} />;
    } else {
        // Start scenario only when we land on results view
        if (isQueryResultsView()) {
            PerfScenarioManager.startScenario(WITPerformanceScenario.QUERIESHUB_TRIAGEVIEW_OPENQUERYRESULTS, true);
        }

        return <TriageViewHubs />;
    }
});

SDK_Shim.registerContent("newqueries.queries", (context: SDK_Shim.InternalContentContextData): JSX.Element => {
    const scenarioName = isAllPivotSelected() ? WITPerformanceScenario.QUERIESHUB_QUERIESVIEW_OPENALLQUERIESPIVOT : WITPerformanceScenario.QUERIESHUB_QUERIESVIEW_OPENFAVORITESPIVOT;
    PerfScenarioManager.startScenario(scenarioName, true);

    const AsyncQueriesView = getAsyncLoadedComponent(
        queriesViewModuleName,
        (m: typeof QueriesViewAsync) => m.QueriesView);

    return <AsyncQueriesView />;
});

SDK_Shim.registerContent("newqueries.folders", (context: SDK_Shim.InternalContentContextData): JSX.Element => {
    const AsyncQueriesFolderView = getAsyncLoadedComponent(
        ["WorkItemTracking/Scripts/Queries/Components/QueriesFolderView"],
        (m: typeof QueriesFolderViewAsync) => m.QueriesFolderView);

    return <AsyncQueriesFolderView />;
});

function isAllPivotSelected(): boolean {
    const queriesHubContext = QueriesHubContext.getInstance();
    return Utils_String.equals(queriesHubContext.queryHubViewState.selectedPivot.value, QueriesHubConstants.AllQueriesPageAction, true);
}

function isQueryResultsView(): boolean {
    const queriesHubContext = QueriesHubContext.getInstance();
    return Utils_String.equals(queriesHubContext.queryHubViewState.selectedPivot.value, ActionUrl.ACTION_QUERY, true);
}

function isWorkItemView(): boolean {
    const queriesHubContext = QueriesHubContext.getInstance();
    return Utils_String.equals(queriesHubContext.queryHubViewState.selectedPivot.value, ActionUrl.ACTION_EDIT, true) ||
        Utils_String.equals(queriesHubContext.queryHubViewState.selectedPivot.value, ActionUrl.ACTION_NEW, true);
}

function getWorkItemEditViewProps(): IWorkItemEditViewProps {
    const queriesHubContext = QueriesHubContext.getInstance();
    return {
        id: queriesHubContext.queryHubViewState.viewOptions.getViewOption(ActionParameters.ID),
        witd: queriesHubContext.queryHubViewState.viewOptions.getViewOption(ActionParameters.WITD),
        templateId: queriesHubContext.queryHubViewState.viewOptions.getViewOption(ActionParameters.TEMPLATEID),
        isNew: Utils_String.equals(queriesHubContext.queryHubViewState.selectedPivot.value, ActionUrl.ACTION_NEW, true),
        requestParams: getNavigationHistoryService().getState()
    };
}

PageEvents.getService().subscribe(PageEvents.CommonPageEvents.PageInteractive, (event: PageEvents.IPageEvent) => {
    // Ensure we load QueriesView module for fast switch post TTI
    VSS.requireModules(queriesViewModuleName);
});
