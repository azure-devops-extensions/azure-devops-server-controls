/**
 * @file Contains interfaces shared across backlog levels controls
 */
import * as Utils_Array from "VSS/Utils/Array";
import * as Utils_String from "VSS/Utils/String";
import * as Diag from "VSS/Diag";
import * as Interfaces from "Admin/Scripts/BacklogLevels/Interfaces";
import AdminResources = require("Admin/Scripts/Resources/TFS.Resources.Admin");

export module BacklogLevelUtils {
    // Matches any of these characters '.,;~:/\*|?"&%$!+=()[]{}<>- or numbers only
    const INVALID_NAME_REGEX: RegExp = /(^\d+$)|[\'\.,;~:\/\\\*|\?\"&%$!+=\(\)\[\]\{\}<>\-]/;

    export const MAX_PORTFOLIO_LEVELS = 5;

    export function isNameWhitespace(name: string): boolean {
        if (!name || !name.trim()) {
            return true;
        }
        return false;
    }

    export function isNameValid(name: string): boolean {
        if (INVALID_NAME_REGEX.test(name)) {
            return false;
        }
        return true;
    }

    export function getAddBacklogLevelPermission(
        canEdit: boolean,
        isInherited: boolean,
        numberOfBacklogLevels: number): Interfaces.IPermission {

        let value = canEdit &&
            isInherited &&
            numberOfBacklogLevels < MAX_PORTFOLIO_LEVELS;

        //  We'll only provide a reason of why permission is denied when the maximum number of
        //  levels has been reached and the user has edit permissions.
        let reason = (
            value === false &&
            numberOfBacklogLevels >= MAX_PORTFOLIO_LEVELS &&
            canEdit === true) ? AdminResources.BacklogLevels_MaxNumberOfLevelsReached : null;

        return {
            value: value,
            reason: reason,
        };
    }

    export function getPortfolioGroup(hierarchy: Interfaces.IBacklogLevelHierarchy): Interfaces.IBacklogLevelGroup {
        return Utils_Array.first(hierarchy.groups, (group) => group.type === Interfaces.BacklogLevelGroupType.Portfolio);
    }

    export function getBacklogLevel(hierarchy: Interfaces.IBacklogLevelHierarchy, backlogLevelId: string): Interfaces.IBacklogLevel {
        for (let group of hierarchy.groups) {
            for (let level of group.backlogLevels) {
                if (Utils_String.equals(backlogLevelId, level.id, true)) {
                    return level;
                }
            }
        }
        Diag.Debug.fail("Could not find level by id " + backlogLevelId);
        return null;
    }

    export function getWorkItemType(hierarchy: Interfaces.IBacklogLevelHierarchy, witRefName: string): Interfaces.IWorkItemType {
        let witInfo: Interfaces.IWorkItemType = null;
        for (let group of hierarchy.groups) {
            for (let level of group.backlogLevels) {
                witInfo = Utils_Array.first(level.workItemTypes, (wit) => Utils_String.equals(wit.id, witRefName, true));
                if (witInfo) {
                    return witInfo;
                }
            }
        }
        witInfo = Utils_Array.first(hierarchy.unmappedWorkItemTypes, (wit) => Utils_String.equals(wit.id, witRefName, true));
        Diag.Debug.assert(!!witInfo, "Could not find work item  by ref name" + witRefName);
        return witInfo;
    }

    export function getAllBacklogLevels(hierarchy: Interfaces.IBacklogLevelHierarchy): Interfaces.IBacklogLevel[] {
        let levels: Interfaces.IBacklogLevel[] = [];
        for (let group of hierarchy.groups) {
            for (let level of group.backlogLevels) {
                levels.push(level);
            }
        }
        return levels;
    }

    export function forEachBacklogLevel(hierarchy: Interfaces.IBacklogLevelHierarchy,
        callback: (level: Interfaces.IBacklogLevel) => boolean) {
        for (let group of hierarchy.groups) {
            for (let level of group.backlogLevels) {
                if (!callback(level)) {
                    return;
                }
            }
        }
    }

    export function getUnmappedWorkItemsGroup(hierarchy: Interfaces.IBacklogLevelHierarchy): Interfaces.IBacklogLevelGroup {
        return Utils_Array.first(hierarchy.groups, (group) => group.type === Interfaces.BacklogLevelGroupType.Unmapped);
    }

    export function getAssociatedBehavior(hierarchy: Interfaces.IBacklogLevelHierarchy, witRefName: string): Interfaces.IBacklogLevel {
        let levels: Interfaces.IBacklogLevel[] = [];
        for (let group of hierarchy.groups) {
            if (group.type !== Interfaces.BacklogLevelGroupType.Unmapped) {
                for (let level of group.backlogLevels) {
                    if (level.workItemTypes.some((wit) => Utils_String.equals(wit.id, witRefName, true))) {
                        return level;
                    }
                }
            }
        }
        return null;
    }
}