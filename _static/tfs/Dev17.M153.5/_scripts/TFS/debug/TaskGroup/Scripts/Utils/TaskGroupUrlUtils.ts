import { getPageContext } from "VSS/Context";
import { NavigationContextLevels } from "VSS/Common/Contracts/Platform";
import { HubsService } from "VSS/Navigation/HubsService";
import { getHistoryService } from "VSS/Navigation/Services";
import { getLocalService } from "VSS/Service";
import { Uri } from "VSS/Utils/Url";
import { empty as emptyString } from "VSS/Utils/String";

import { PresentationUtils } from "DistributedTasksCommon/TFS.Tasks.Utils";

import { ContributionIds } from "TaskGroup/Scripts/Common/Constants";


export function getHubUrl(contrinutionId: string): string {
    const hubService = new HubsService();
    const hub = hubService.getHubById(contrinutionId);
    if (hub) {
        let uri = Uri.parse(hub.uri);
        return uri.absoluteUri;
    }

    return emptyString;
}

export function getTaskGroupIdFromWindowUrl(): string {
    const windowUrl = window.location.href;

    //TODO: Check if the routes can be found from hubservice
    const guidRegex = /_taskgroup\/([a-fA-F0-9]{8}-([a-fA-F0-9]{4}-){3}[a-fA-F0-9]{12})/i;
    const guidMatch = windowUrl.match(guidRegex);

    if (guidMatch && guidMatch.length === 3) {
        return windowUrl.match(guidRegex)[1];
    }

    return null;
}

export function isTaskGroupImportInProgress(): boolean {
    const windowUrl = window.location.href;

    //TODO: Check if the routes can be found from hubservice
    const importRegex = /_taskgroup\/_import/i;
    const importMatch = windowUrl.match(importRegex);

    if (importMatch && importMatch.length === 1) {
        return true;
    }

    return false;
}

export function navigateToHubWithoutPageReload(event: React.MouseEvent<any>, contributionId: string, url: string): void {
    const hubsService = getLocalService(HubsService);

    // Prevent the native event from double-triggering a navigation, one correctly with ?_xhr=true and another without.
    // Copying this code from Tfs/Service/WebAccess/VersionControl/Scripts/Utils/XhrNavigationUtils.ts
    const result = hubsService.getHubNavigateHandler(contributionId, url)(event.nativeEvent);
    if (!result) {
        event.stopPropagation();
        event.preventDefault();
    }
}

export function getTaskGroupEditorUrl(taskGroupId: string, viewName?: string): string {
    const viewFragment = (!!viewName && "?view=" + viewName) || emptyString;
    return PresentationUtils.getTeamUrl() + "/_taskgroup/" + taskGroupId + viewFragment;
}

export function getTaskGroupImportUrl(): string {
    return PresentationUtils.getTeamUrl() + "/_taskgroup/_import";
}

export function navigateToTaskGroupsHub(): void {
    const hubsService = getLocalService(HubsService);
    hubsService.navigateToHub(ContributionIds.TaskGroupHub);
}

export function navigateToTaskGroupEditor(taskGroupId: string): void {
    const hubsService = getLocalService(HubsService);
    hubsService.navigateToHub(ContributionIds.TaskGroupHub, getTaskGroupEditorUrl(taskGroupId));
}

export function navigateToImportTaskGroup(): void {
    const hubsService = getLocalService(HubsService);
    hubsService.navigateToHub(ContributionIds.TaskGroupHub, getTaskGroupImportUrl());
}

export function checkIfUrlHasTaskGroupIdAndNavigate(): void {
    const urlState = getHistoryService().getCurrentState();
    if (!!urlState.taskGroupId) {
        navigateToTaskGroupEditor(urlState.taskGroupId);
    }
}