import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";
import { DateTimeUtils } from "PipelineWorkflow/Scripts/Shared/Utils/DateTimeUtils";

import { ChangeType, IRevisionsData } from "DistributedTaskControls/SharedViews/ContainerTabs/HistoryTab/HistoryStore";
import { ReleaseRevision } from "ReleaseManagement/Core/Contracts";

import * as Utils_Date from "VSS/Utils/Date";
import * as Utils_String from "VSS/Utils/String";

enum ReleaseChangeType {
    Undefined = 0,
    Create = 1,
    Start = 2,
    Update = 4,
    Deploy = 8,
    Approve = 16,
    Abandon = 32,
    Delete = 64,
    Undelete = 128
}

/**
 * @brief Helper for History
 */
export class HistoryUtils {

    public static convertReleaseRevisionToColumn(revisions: ReleaseRevision[]): IRevisionsData[] {
        let revisionColumns: IRevisionsData[] = [];

        revisions.sort((revision1: ReleaseRevision, revision2: ReleaseRevision) => {
            // order revisions by desc
            return Utils_Date.defaultComparer(revision2.changedDate, revision1.changedDate);
        });
        revisions.forEach((revision, index) => {
            let changeType: string = Utils_String.empty;
            switch (revision.changeType.toLowerCase()) {
                case ReleaseChangeType[ReleaseChangeType.Create].toLowerCase():
                    changeType = Resources.ReleaseHistoryChangeTypeCreate;
                    break;
                case ReleaseChangeType[ReleaseChangeType.Start].toLowerCase():
                    changeType = Resources.ReleaseHistoryChangeTypeStart;
                    break;
                case ReleaseChangeType[ReleaseChangeType.Update].toLowerCase():
                    changeType = Resources.ReleaseHistoryChangeTypeUpdate;
                    break;
                case ReleaseChangeType[ReleaseChangeType.Deploy].toLowerCase():
                    changeType = Resources.ReleaseHistoryChangeTypeDeploy;
                    break;
                case ReleaseChangeType[ReleaseChangeType.Approve].toLowerCase():
                    changeType = Resources.ReleaseHistoryChangeTypeApprove;
                    break;
                case ReleaseChangeType[ReleaseChangeType.Abandon].toLowerCase():
                    changeType = Resources.ReleaseHistoryChangeTypeAbandon;
                    break;
                case ReleaseChangeType[ReleaseChangeType.Delete].toLowerCase():
                    changeType = Resources.ReleaseHistoryChangeTypeDelete;
                    break;
                case ReleaseChangeType[ReleaseChangeType.Undelete].toLowerCase():
                    changeType = Resources.ReleaseHistoryChangeTypeUndelete;
                    break;
                default:
                    changeType = revision.changeType;
                    break;
            }

            let row = {
                changedBy: (!!revision.changedBy) ? revision.changedBy.displayName : Utils_String.empty,
                changeType: changeType,
                changedDate: DateTimeUtils.getLocaleTimestamp(revision.changedDate),
                changeDetails: revision.changeDetails,
                comment: (revision.comment ? revision.comment : Utils_String.empty),
                revisionNumber: revision.definitionSnapshotRevision,
            } as IRevisionsData;
            revisionColumns.push(row);
        });

        return revisionColumns;
    }
}
