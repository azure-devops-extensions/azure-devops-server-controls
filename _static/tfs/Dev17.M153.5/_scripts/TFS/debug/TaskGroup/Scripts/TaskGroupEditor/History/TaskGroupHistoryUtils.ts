import { defaultComparer as defaultDateComparer, localeFormat as localeDateFormat } from "VSS/Utils/Date";
import { empty as emptyString } from "VSS/Utils/String";

import * as DTContracts from "TFS/DistributedTask/Contracts";

import { getMajorVersionSpec } from "DistributedTasksCommon/TFS.Tasks.Utils";

import { IRevisionsData } from "DistributedTaskControls/SharedViews/ContainerTabs/HistoryTab/HistoryStore";

import * as Resources from "TaskGroup/Scripts/Resources/TFS.Resources.TaskGroup";

export interface ITaskGroupRevisionData extends IRevisionsData {
    version: string;
}

export function getRevisionDataFromTaskGroupRevision(revision: DTContracts.TaskGroupRevision): IRevisionsData {
    // TODO - L0 for this

    let changeType: string = emptyString;
    switch (revision.changeType) {
        case DTContracts.AuditAction.Add:
            changeType = Resources.HistoryAddAuditActionName;
            break;
        case DTContracts.AuditAction.Update:
            changeType = Resources.HistoryUpdateAuditActionName;
            break;
        case DTContracts.AuditAction.Delete:
            changeType = Resources.HistoryDeleteAuditActionName;
            break;
        case DTContracts.AuditAction.Undelete:
            changeType = Resources.HistoryUndeleteAuditActionName;
            break;
    }

    let revisionData = {
        changedBy: (!!revision.changedBy && revision.changedBy.displayName) || emptyString,
        changeType: changeType,
        changedDate: localeDateFormat(revision.changedDate, "g"),
        comment: revision.comment || emptyString,
        revisionNumber: revision.revision,
        ellipsis: null
    };

    return revisionData;
}

export function sortRevisionsByChangedDate(revisions: DTContracts.TaskGroupRevision[]): DTContracts.TaskGroupRevision[] {
    // TODO - L0 for this

    const sortedRevisions = revisions.sort((revision1: DTContracts.TaskGroupRevision, revision2: DTContracts.TaskGroupRevision) => {
        return defaultDateComparer(revision2.changedDate, revision1.changedDate);
    });

    return sortedRevisions;
}

export function getRevisionNumberToVersionSpecMapping(taskGroups: DTContracts.TaskGroup[], maxRevisionNumber: number): IDictionaryNumberTo<string> {
    let revisionNumberToVersionSpecMapping: IDictionaryNumberTo<string> = {};
    if (taskGroups && taskGroups.length > 0) {
        const sortedTaskGroups = taskGroups.sort((a: DTContracts.TaskGroup, b: DTContracts.TaskGroup) => a.version.major - b.version.major);

        let versionIndex = 0;
        for (let revisionNumber: number = 1; revisionNumber <= maxRevisionNumber; revisionNumber++) {
            if (versionIndex < sortedTaskGroups.length && sortedTaskGroups[versionIndex].revision < revisionNumber) {
                versionIndex++;
            }

            revisionNumberToVersionSpecMapping[revisionNumber] = getMajorVersionSpec(sortedTaskGroups[versionIndex].version);
        }
    }

    return revisionNumberToVersionSpecMapping;
}
