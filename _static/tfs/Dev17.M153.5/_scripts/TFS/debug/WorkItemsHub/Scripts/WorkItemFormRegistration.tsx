import * as React from "react";
import * as ReactDOM from "react-dom";
import * as VSS from "VSS/VSS";
import * as SDK_Shim from "VSS/SDK/Shim";
import * as NavigationServices from "VSS/Navigation/Services";
import { getPageContext } from "VSS/Context";
import { WorkItemFormWrapper } from "WorkItemsHub/Scripts/WorkItemFormWrapper";
import { navigateToWorkItemHub } from "WorkItemsHub/Scripts/Utils/WorkItemsXhrNavigationUtils";
import { getWorkItemsHubTriageData, setWorkItemsHubTriageData, IWorkItemsHubTriageData } from "WorkItemsHub/Scripts/WorkItemsViewRegistration";
import * as WorkItemsHubTriageView_NOREQUIRE from "WorkItemsHub/Scripts/Components/WorkItemsHubTriageView";
import { IVssPageContext } from "VSS/Platform/Context";

SDK_Shim.VSS.register("workitemform.view", (context: SDK_Shim.InternalContentContextData): IPromise<IDisposable> | IDisposable => {
    // entry point for _workitem/edit/{id}
    const tfsContext = getPageContext();
    const parameters = tfsContext.navigation.routeValues["id"];
    const id = parseInt(parameters, 10);

    if (!id) {
        navigateToWorkItemHub();
        return null;
    }

    const pageContext: IVssPageContext = context.options._pageContext;
    const requestParameters = getCurrentRequestParameters();
    const triageData = getWorkItemsHubTriageData();
    const hasTriageData = !!(triageData && triageData.workItemIds && triageData.workItemIds.length > 0);
    if (hasTriageData) {
        const startingIndex = triageData.workItemIds.indexOf(id);
        if (startingIndex >= 0){
            return VSS.requireModules(["WorkItemsHub/Scripts/Components/WorkItemsHubTriageView"])
            .spread((m: typeof WorkItemsHubTriageView_NOREQUIRE) => {
                ReactDOM.render(
                    <m.WorkItemsHubTriageView
                        tabId={triageData.tabId}
                        tabName={triageData.tabName}
                        startingIndex={startingIndex}
                        workItemIds={triageData.workItemIds}
                        ref={this._onTriageViewRef}
                        onNavigate={(lastTriagedWorkItemId: number) =>
                            setWorkItemsHubTriageData({ ...triageData, lastTriagedWorkItemId } as IWorkItemsHubTriageData)}
                        requestParameters={requestParameters}
                        pageContext={pageContext}
                    />,
                    context.container);

                return { dispose: () => ReactDOM.unmountComponentAtNode(context.container) } as IDisposable;
            });
        }
    }

    return WorkItemFormWrapper.createForView(pageContext, context.container, id, requestParameters);
});

SDK_Shim.VSS.register("workitemform.create", (context: SDK_Shim.InternalContentContextData): IDisposable => {
    // entry point for _workitem/create/{workitemtype}
    const pageContext = context.options._pageContext;
    const tfsContext = getPageContext();
    const workItemType = tfsContext.navigation.routeValues["parameters"];
    if (workItemType) {
        return WorkItemFormWrapper.createForNew(pageContext, context.container, workItemType, getCurrentRequestParameters());
    }

    navigateToWorkItemHub();
    return null;
});

function getCurrentRequestParameters(): IDictionaryStringTo<string> {
    const historyService = NavigationServices.getHistoryService();
    const fragment = historyService.getCurrentFragment();
    return NavigationServices.HistoryService.deserializeState(fragment);
}
