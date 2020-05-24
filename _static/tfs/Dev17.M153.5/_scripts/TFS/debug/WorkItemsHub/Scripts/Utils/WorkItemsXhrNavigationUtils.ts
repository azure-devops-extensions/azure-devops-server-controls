import * as Service from "VSS/Service";
import { HubsService } from "VSS/Navigation/HubsService";
import * as UrlUtils from "WorkItemsHub/Scripts/Utils/UrlUtils";
import { FastPageSwitch } from "VSS/Platform/FPS"
import { IVssPageContext } from "VSS/Platform/Context";
import { getWorkItemsHubId } from "WorkItemTracking/Scripts/Utils/WorkItemsHubIdHelper";

/**
 * Navigate to work item hub without page refresh.
 */
export function navigateToWorkItemHub(pageContext?: IVssPageContext): void {
    const wihUrl = UrlUtils.getWorkItemHubUrl();

    if (pageContext) {
        FastPageSwitch(pageContext, wihUrl, true);
    }
    else {
        Service.getLocalService(HubsService).navigateToHub(getWorkItemsHubId(), wihUrl);
    }
}

/**
 * Navigate to work item edit page without page refresh.
 */
export function navigateToEditWorkItemForm(workItemId: number): void {
    Service.getLocalService(HubsService).navigateToHub(
        getWorkItemsHubId(), UrlUtils.getEditWorkItemUrl(workItemId));
}

/**
 * Navigate to work item creation page without page refresh.
 */
export function navigateToNewWorkItemForm(workItemType: string): void {
    Service.getLocalService(HubsService).navigateToHub(
        getWorkItemsHubId(), UrlUtils.getCreateWorkItemUrl(workItemType));
}

/**
 * Gets the handler to edit page without page refresh; handler will take care of things like CTRL/SHIFT + click.
 */
export function getEditWorkItemFormNavigationHandler(workItemId: number): IFunctionPR<MouseEvent, boolean> {
    return Service.getLocalService(HubsService).getHubNavigateHandler(getWorkItemsHubId(), UrlUtils.getEditWorkItemUrl(workItemId));
}

/**
 * Replaces the current hub state with state for edit work item.
 */
export function replaceHubStateWithEditWorkItem(workItemId: number): void {
    Service.getLocalService(HubsService).replaceCurrentHubState(getWorkItemsHubId(), UrlUtils.getEditWorkItemUrl(workItemId));
}
