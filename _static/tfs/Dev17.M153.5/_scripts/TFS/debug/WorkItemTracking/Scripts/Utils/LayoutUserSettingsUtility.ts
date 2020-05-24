import { FormLayoutType } from "Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants";
import { IWorkItemTypeSettings, ILayoutUserSettings, IProcessSettings, IProjectSettings } from "WorkItemTracking/Scripts/Form/Models";
import { WorkItemType } from "WorkItemTracking/Scripts/TFS.WorkItemTracking";
import { findIndex, first } from "VSS/Utils/Array";
import { equals, ignoreCaseComparer, isGuid, isEmptyGuid } from "VSS/Utils/String";
import { Debug } from "VSS/Diag";

/**
 * Utility for managing the local copy of the WorkItemTypeSettings objects.  Does not update server state.
 */
export namespace LayoutUserSettingsUtility {
    export function getWorkItemTypeSettings(layoutUserSettings: ILayoutUserSettings, workItemType: WorkItemType): IWorkItemTypeSettings {
        Debug.assertIsNotNull(layoutUserSettings, "layoutUserSettings");
        Debug.assertIsNotNull(workItemType, "workItemType");

        let settings: IProcessSettings | IProjectSettings;
        const workItemTypeIdentifier = workItemType.name;

        if (workItemType.processId && !isEmptyGuid(workItemType.processId)) {
            settings = getProcessSettings(layoutUserSettings, workItemType.processId);
        } else if (workItemType.project && workItemType.project.guid) {
            settings = getProjectSettings(layoutUserSettings, workItemType.project.guid);
        }

        return (settings && workItemTypeIdentifier && _getWorkItemTypeSettings(settings, workItemTypeIdentifier)) || null;
    }

    function _getWorkItemTypeSettings(settings: IProjectSettings | IProcessSettings, workItemTypeIdentifier: string): IWorkItemTypeSettings {
        let workItemTypeSettings = first(settings.workItemTypeSettings, x => equals(x.refName, workItemTypeIdentifier, true));

        if (!workItemTypeSettings) {
            workItemTypeSettings = {
                refName: workItemTypeIdentifier,
                collapsedGroups: [],
                mobileCollapsedGroups: []
            };

            settings.workItemTypeSettings.push(workItemTypeSettings);
        }

        return workItemTypeSettings;
    }

    /**
     * Gets the settings for the process from the entire settings collection
     * @param layoutUserSettings The layout user settings object holding the user settings for the entire collection
     * @param processId The process id for which the settings are to be returned
     */
    export function getProcessSettings(layoutUserSettings: ILayoutUserSettings, processId: string): IProcessSettings {
        Debug.assertIsNotNull(layoutUserSettings, "layoutUserSettings");
        Debug.assert(isGuid(processId));

        if (layoutUserSettings) {
            for (const settings of layoutUserSettings.processSettings) {
                if (ignoreCaseComparer(settings.processId, processId) === 0) {
                    return settings;
                }
            }
        }

        const processSettings: IProcessSettings = {
            processId,
            workItemTypeSettings: []
        };

        layoutUserSettings.processSettings.push(processSettings);
        return processSettings;
    }

    /**
     * Gets the settings for the process from the entire settings collection.
     * @param layoutUserSettings The layout user settings object holding the user settings for the entire collection
     * @param projectId The project id for which the settings are to be returned
     */
    export function getProjectSettings(layoutUserSettings: ILayoutUserSettings, projectId: string): IProjectSettings {
        Debug.assertIsNotNull(layoutUserSettings, "layoutUserSettings");

        if (layoutUserSettings) {
            for (const settings of layoutUserSettings.projectSettings) {
                if (ignoreCaseComparer(settings.projectId, projectId) === 0) {
                    return settings;
                }
            }
        }

        const projectSettings: IProjectSettings = {
            projectId,
            workItemTypeSettings: []
        };

        layoutUserSettings.projectSettings.push(projectSettings);
        return projectSettings;
    }

    /**
     * Determines if the specified group is collapsed.
     * @param layoutUserSettings The layout user settings object holding the user settings for the entire collection
     * @param workItemType
     * @param groupId Id of the group to check
     * @param layoutType Type of form layout
     */
    export function isGroupCollapsed(layoutUserSettings: ILayoutUserSettings, workItemType: WorkItemType, groupId: string, layoutType: FormLayoutType = FormLayoutType.Desktop): boolean {
        Debug.assertIsNotNull(layoutUserSettings, "layoutUserSettings");

        const workItemTypeSettings = getWorkItemTypeSettings(layoutUserSettings, workItemType);

        return isGroupCollapsedForWorkItemType(workItemTypeSettings, groupId, layoutType);
    }

    /**
     * Determines if the specified group is collapsed for the given work item type settings
     * @param workItemTypeSettings
     * @param groupId Id of the group to check
     * @param layoutType Type of form layout
     */
    export function isGroupCollapsedForWorkItemType(workItemTypeSettings: IWorkItemTypeSettings, groupId: string, layoutType: FormLayoutType = FormLayoutType.Desktop): boolean {
        Debug.assertIsNotNull(workItemTypeSettings, "workItemTypeSettings");

        const collapsedGroups: string[] = layoutType === FormLayoutType.Desktop ? workItemTypeSettings.collapsedGroups : workItemTypeSettings.mobileCollapsedGroups;
        if (collapsedGroups) {
            return collapsedGroups
                .filter((collapsedGroupId) => equals(collapsedGroupId, groupId, true))
                .length > 0;
        }

        return false;
    }

    /**
     * Update the specified IWorkItemTypeSettings object with the collapsed/expanded state info for the specified group.
     * 
     * @param workItemTypeSettings 
     * @param groupId Id of the group to update the status of
     * @param isCollapsed
     * @param layoutType
     */
    export function setGroupExpansionState(
        layoutUserSettings: ILayoutUserSettings,
        workItemType: WorkItemType,
        groupId: string,
        isCollapsed: boolean,
        layoutType: FormLayoutType = FormLayoutType.Desktop): void {
        Debug.assertIsNotNull(layoutUserSettings, "layoutUserSettings");
        Debug.assertIsNotNull(workItemType, "workItemType");

        if (!layoutUserSettings) {
            throw new Error("Invalid parameter: layoutUserSettings");
        }

        if (!groupId) {
            throw new Error("Invalid parameter: groupId");
        }

        if (!workItemType) {
            throw new Error("Invalid parameter: workItemType");
        }

        const workItemTypeSettings = getWorkItemTypeSettings(layoutUserSettings, workItemType);

        // Make sure collections are initialized
        workItemTypeSettings.collapsedGroups = workItemTypeSettings.collapsedGroups || [];
        workItemTypeSettings.mobileCollapsedGroups = workItemTypeSettings.mobileCollapsedGroups || [];

        const collapsedGroups = layoutType === FormLayoutType.Desktop ?
            workItemTypeSettings.collapsedGroups :
            workItemTypeSettings.mobileCollapsedGroups;

        const index = findIndex(collapsedGroups, id => equals(id, groupId, true));
        if (isCollapsed && index === -1) {
            collapsedGroups.push(groupId);
        } else if (!isCollapsed && index !== -1) {
            collapsedGroups.splice(index, 1);
        }
    }
}
