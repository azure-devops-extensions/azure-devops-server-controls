
import * as Resources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";

import { ChangeType, IRevisionsData } from "DistributedTaskControls/SharedViews/ContainerTabs/HistoryTab/HistoryStore";

import { PipelineDefinitionRevision } from "PipelineWorkflow/Scripts/Common/Types";
import { DateTimeUtils } from "PipelineWorkflow/Scripts/Shared/Utils/DateTimeUtils";

import * as Utils_Date from "VSS/Utils/Date";
import * as Utils_String from "VSS/Utils/String";

/**
 * @brief Helper for History
 */
export class HistoryUtils {

    public static convertPipelineDefinitionRevisionToColumn(revisions: PipelineDefinitionRevision[]): IRevisionsData[] {
        let revisionColumns: IRevisionsData[] = [];

        revisions.sort((revision1: PipelineDefinitionRevision, revision2: PipelineDefinitionRevision) => {
            // order revisions by desc
            return Utils_Date.defaultComparer(revision2.changedDate, revision1.changedDate);
        });
        revisions.forEach((revision, index) => {
            let changeType: string = Utils_String.empty;
            switch (revision.changeType.valueOf()) {
                case ChangeType.Add:
                    changeType = Resources.Add;
                    break;
                case ChangeType.Update:
                    changeType = Resources.Update;
                    break;
                case ChangeType.Delete:
                    changeType = Resources.Delete;
                    break;
                case ChangeType.Undelete:
                    changeType = Resources.Undelete;
                    break;
            }

            let row = {
                changedBy: (!!revision.changedBy) ? revision.changedBy.displayName : Utils_String.empty,
                changeType: changeType,
                changedDate: DateTimeUtils.getLocaleTimestamp(revision.changedDate),
                comment: (revision.comment ? revision.comment : Utils_String.empty),
                revisionNumber: revision.revision,
                apiVersion: revision.apiVersion || Utils_String.empty
            } as IRevisionsData;
            revisionColumns.push(row);
        });

        return revisionColumns;
    }
}
