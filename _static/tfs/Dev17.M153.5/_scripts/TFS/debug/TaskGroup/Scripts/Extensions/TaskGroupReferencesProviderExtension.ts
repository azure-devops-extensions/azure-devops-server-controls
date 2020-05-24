import SDK_Shim = require("VSS/SDK/Shim");
import { localeIgnoreCaseComparer } from "VSS/Utils/String";

import * as DTContracts from "TFS/DistributedTask/Contracts";
import {
    ITaskGroupReferencesProvider,
    ITaskGroupReference,
    ITaskGroupReferenceGroup
} from "DistributedTask/TaskGroups/ExtensionContracts";

import { getMajorVersionSpec } from "DistributedTasksCommon/TFS.Tasks.Utils";

import { TaskGroupSource } from "TaskGroup/Scripts/Common/Sources/TaskGroupSource";
import { getTaskGroupEditorUrl } from "TaskGroup/Scripts/Utils/TaskGroupUrlUtils";
import { getLatestVersion } from "TaskGroup/Scripts/Utils/TaskVersionUtils";
import * as Resources from "TaskGroup/Scripts/Resources/TFS.Resources.TaskGroup";

export class TaskGroupReferenceProvider {
    public fetchTaskGroupReferences(taskGroupId: string): IPromise<ITaskGroupReferenceGroup> {
        return TaskGroupSource.instance().getParentTaskGroupReferences(taskGroupId).then((taskGroups: DTContracts.TaskGroup[]) => {

            let tgIdToTaskGroupsMap: { [id: string]: DTContracts.TaskGroup[] } = {};
            taskGroups.map((taskGroup: DTContracts.TaskGroup) => {
                if (!tgIdToTaskGroupsMap.hasOwnProperty(taskGroup.id)) {
                    tgIdToTaskGroupsMap[taskGroup.id] = [];
                }

                tgIdToTaskGroupsMap[taskGroup.id].push(taskGroup);
            });

            const references: ITaskGroupReference[] = [];
            Object.keys(tgIdToTaskGroupsMap).forEach((id: string) => {
                if (tgIdToTaskGroupsMap.hasOwnProperty(id)) {
                    const childTaskGroups = tgIdToTaskGroupsMap[id];

                    // Get the versions of the task groups as child references
                    const childReferences: ITaskGroupReference[] = childTaskGroups.map((childTaskGroup) => {
                        return {
                            displayName: getMajorVersionSpec(childTaskGroup.version),
                        } as ITaskGroupReference;
                    });

                    const sortedChildReferences = childReferences.sort((a, b) => localeIgnoreCaseComparer(a.displayName, b.displayName));
                    const latestVersion = getLatestVersion(childTaskGroups) as DTContracts.TaskGroup;

                    references.push({
                        displayName: latestVersion.name,
                        url: getTaskGroupEditorUrl(id),
                        childReferences: sortedChildReferences,
                        childReferenceTypeDisplayName: Resources.TaskVersionText
                    } as ITaskGroupReference);
                }
            });

            const sortedReferences = references.sort((a, b) => localeIgnoreCaseComparer(a.displayName, b.displayName));

            return {
                referenceIcon: "bowtie-task-group",
                references: references,
                displayName: Resources.TaskGroupsReferencesType
            } as ITaskGroupReferenceGroup;
        });
    }
}


SDK_Shim.registerContent("dt.taskGroupReferences", (context) => {
    return new TaskGroupReferenceProvider();
});
