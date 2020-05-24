import { getService as getSettingsService, ISettingsService, SettingsUserScope } from "VSS/Settings/Services";
import { WorkItemsHubSettingsHelper } from "WorkItemsHub/Scripts/Generated/Constants";
import { WorkItemsHubSortOption, WorkItemsHubColumnSettings, WorkItemsHubColumnOption } from "WorkItemsHub/Scripts/Generated/Contracts";
import { format } from "VSS/Utils/String";

export function updateRecentTabId(projectId: string, tabId: string): void {
    _updateProjectScopedMeSettings(WorkItemsHubSettingsHelper.WorkItemsHubRecentTabIdKey, tabId, projectId);
}

export function updateColumnSettings(projectId: string, tabId: string, columnOptions: WorkItemsHubColumnOption[], sortOptions: WorkItemsHubSortOption[], version?: number): IPromise<void> {
    const columnSettings: WorkItemsHubColumnSettings = { columnOptions, sortOptions, version };

    return _updateProjectScopedMeSettings(
        format(WorkItemsHubSettingsHelper.WorkItemsHubColumnSettingsKeyTemplate, tabId),
        columnSettings,
        projectId);
}

export function updateShowCompletedForTab(projectId: string, tabId: string, showCompleted: boolean): void {
    _updateProjectScopedMeSettings(
        format(WorkItemsHubSettingsHelper.WorkItemsHubShowCompletedKeyTemplate, tabId),
        showCompleted,
        projectId);
}

function _updateProjectScopedMeSettings<TValue>(key: string, value: TValue, scopeValue: string): IPromise<void> {
    const settingsClient: ISettingsService = getSettingsService();
    const entries: IDictionaryStringTo<any> = { [key]: value };
    return settingsClient.setEntries(entries, SettingsUserScope.Me, "project", scopeValue);
}
