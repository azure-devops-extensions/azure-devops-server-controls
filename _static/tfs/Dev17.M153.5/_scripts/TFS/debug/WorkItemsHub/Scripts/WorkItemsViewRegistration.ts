import * as Q from "q";
import { getHistoryService, HistoryService } from "VSS/Navigation/Services";
import * as SDK_Shim from "VSS/SDK/Shim";
import * as Utils_Array from "VSS/Utils/Array";
import * as Utils_String from "VSS/Utils/String";
import * as VSS from "VSS/VSS";
import * as UrlUtils from "WorkItemsHub/Scripts/Utils/UrlUtils";
import * as WorkItemFormWrapper_NOREQUIRE from "WorkItemsHub/Scripts/WorkItemFormWrapper";
import * as WorkItemsHubViewProvider_NOREQUIRE from "WorkItemsHub/Scripts/WorkItemsHubViewProvider";
import { ActionParameters, ActionUrl } from "WorkItemTracking/Scripts/ActionUrls";
import { getTabContributionInfoAsync, ITabContributionInfo } from "WorkItemsHub/Scripts/Utils/WorkItemsHubTabUtils";
import { EventService } from "VSS/Events/Services";
import * as Service from "VSS/Service";
import { HubEventNames, IHubEventArgs } from "VSS/Navigation/HubsService";
import { IVssPageContext } from "VSS/Platform/Context";

export interface IWorkItemsHubTriageData {
    tabId: string;
    tabName: string;
    workItemIds: number[];
    lastTriagedWorkItemId?: number;
    /**
     * Selected item's index in visible list (filtered). We can't necessarily get this from workItemIds
     * in all conditions.
     */
    selectedItemIndexInVisibleList: number;
    /**
     * Scroll top value of the scrollable container (containing tab content) when a work item is
     * opened and we navigate away from WIH in triage view mode.
     */
    selectedIndexScrollTopValue: number;
}

let _cleanupHandlerRegistered = false;
let _hubViewTriageData = null;

SDK_Shim.VSS.register("workitems.view", (context: SDK_Shim.InternalContentContextData): IPromise<IDisposable> => {
    const formWrapperModulePath = "WorkItemsHub/Scripts/WorkItemFormWrapper";
    const pageContext : IVssPageContext = context.options._pageContext;
    
    let path = window.location.pathname;
    if (Utils_String.endsWith(path, "/")) {
        // support urls like "/_queries/edit/1/" - ending with slash character. We can get to this url from NQE with the new hub view state changes
        path = path.substring(0, path.length - 1);
    }

    const historyService = getHistoryService();
    const fragment = historyService.getCurrentFragment();
    const state = HistoryService.deserializeState(fragment); // tip: this will always at least an empty object

    // handle /edit/id
    if (Utils_String.caseInsensitiveContains(path, "/" + ActionUrl.ACTION_EDIT + "/")) {
        const routes = path.split("/");
        const id = routes[routes.length - 1];
        const workItemId = id && +id;
        return VSS.requireModules([formWrapperModulePath]).spread((m: typeof WorkItemFormWrapper_NOREQUIRE) => {
            return m.WorkItemFormWrapper.createForView(pageContext, context.container, workItemId, state);
        });
    }

    // handle /create/type
    if (Utils_String.caseInsensitiveContains(path, "/" + ActionUrl.ACTION_CREATE + "/")) {
        const routes = path.split("/");
        const workitemType = decodeURI(routes[routes.length - 1]);

        return VSS.requireModules([formWrapperModulePath]).spread((m: typeof WorkItemFormWrapper_NOREQUIRE) => {
            return m.WorkItemFormWrapper.createForNew(pageContext, context.container, workitemType, state);
        });
    }

    const id = state[ActionParameters.ID];
    const action = state[ActionUrl.ACTION];

    // handle #_a=edit&id=number
    if (id && action && Utils_String.equals(action, ActionUrl.ACTION_EDIT, true)) {
        // update URL to /edit/number
        const newUrl = UrlUtils.getEditWorkItemUrl(id);
        historyService.replaceState(newUrl);

        return VSS.requireModules([formWrapperModulePath]).spread((m: typeof WorkItemFormWrapper_NOREQUIRE) => {
            return m.WorkItemFormWrapper.createForView(pageContext, context.container, id, state);
        });
    }

    // handle back-compat query urls with hash fragment - #_a=query&id=<guid> or #_a=query&path=<path> or #_a=query&wiql=<path>&name=<name>
    // back-compat URLs that have query parameters and navigation paths are handled on the server-side by request handlers
    if (action && Utils_String.equals(action, ActionUrl.ACTION_QUERY, true)) {
        // redirect to queries page with query parameters
        window.location.href = UrlUtils.getQueriesHubUrl(fragment);
        return Q(null);
    }

    // otherwise load work items hub view
    return VSS.requireModules(["WorkItemsHub/Scripts/WorkItemsHubViewProvider"])
        .spread((m: typeof WorkItemsHubViewProvider_NOREQUIRE) => {
            _cleanHistoryState(action, state, m.InitalizationStateKeys, historyService);
            _registerXHRNavigationHandlerForAdditionalCleanup();

            return getTabContributionInfoAsync().then((tabContributionInfo: ITabContributionInfo[]) =>
                new m.WorkItemsHubViewProvider(context, state, tabContributionInfo));
        });
});

export function setWorkItemsHubTriageData(data: IWorkItemsHubTriageData): void {
    _hubViewTriageData = data;
}

export function getWorkItemsHubTriageData(): IWorkItemsHubTriageData {
    return _hubViewTriageData;
}

function _cleanHistoryState(action: string, state: IDictionaryStringTo<any>, initalizationStateKeys: string[], historyService: HistoryService): void {
    // Clear the initalization states from the URL (e.g. if we get ?filterText=test when opened from VS extension client, we don't
    // want to keep that around in the address bar because when user hit F5, the filter search will be reset to test and persisted)
    const stateKeys: string[] = Object.keys(state);
    const newStateKeys = Utils_Array.subtract(stateKeys, initalizationStateKeys);
    if (stateKeys.length != newStateKeys.length) {
        const newState = {};
        newStateKeys.forEach((key: string) => newState[key] = state[key]);
        historyService.replaceHistoryPoint(action, newState);
    }
}

function _registerXHRNavigationHandlerForAdditionalCleanup(): void {
    if (!_cleanupHandlerRegistered) {
        _cleanupHandlerRegistered = true;
        Service.getLocalService(EventService).attachEvent(HubEventNames.PreXHRNavigate, _preXHRNavigationHandler);
    }
}

const _preXHRNavigationHandler = (sender: any, args: IHubEventArgs): void => {
    // remove triage data and detach cleanup handler if moving away from WIH
    if (args.hubId !== "ms.vss-work-web.work-items-hub") {
        setWorkItemsHubTriageData(null);

        Service.getLocalService(EventService).detachEvent(HubEventNames.PreXHRNavigate, _preXHRNavigationHandler);
        _cleanupHandlerRegistered = false;
    }
};
