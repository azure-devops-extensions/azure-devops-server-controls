import { MessageBarType } from "OfficeFabric/components/MessageBar/MessageBar.types";

import { empty as emptyString } from "VSS/Utils/String";

import * as DTContracts from "TFS/DistributedTask/Contracts";

import { ActionCreatorBase } from "DistributedTaskControls/Common/Actions/Base";
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import { HistoryActions } from "DistributedTaskControls/SharedViews/ContainerTabs/HistoryTab/HistoryActions";

import { TaskGroupHistorySource } from "TaskGroup/Scripts/TaskGroupEditor/History/TaskGroupHistorySource";
import { TabActionCreator } from "TaskGroup/Scripts/TaskGroupEditor/TabContentContainer/TabActionCreator";
import { getRevisionDataFromTaskGroupRevision, sortRevisionsByChangedDate } from "TaskGroup/Scripts/TaskGroupEditor/History/TaskGroupHistoryUtils";
import { ActionCreatorKeys, TabInstanceIds } from "TaskGroup/Scripts/TaskGroupEditor/Constants";
import * as Resources from "TaskGroup/Scripts/Resources/TFS.Resources.TaskGroup";

export class TaskGroupHistoryActionCreator extends ActionCreatorBase {
    public static getKey(): string {
        return ActionCreatorKeys.TaskGroupHistoryActionCreator;
    }

    public initialize(instanceId?: string): void {
        this.historyActions = ActionsHubManager.GetActionsHub<HistoryActions>(HistoryActions);
         this._tabActionCreator = ActionCreatorManager.GetActionCreator<TabActionCreator>(TabActionCreator, TabInstanceIds.Tasks);
   }

    public fetchTaskGroupRevisions(taskGroupId: string): void {
        TaskGroupHistorySource.instance().getTaskGroupRevisions(taskGroupId)
            .then((revisions: DTContracts.TaskGroupRevision[]) => {
                revisions = sortRevisionsByChangedDate(revisions);

                const revisionDataList = revisions.map((revision) => getRevisionDataFromTaskGroupRevision(revision));

                this.historyActions.UpdateRevisions.invoke(revisionDataList);
            },
            (error) => {
                this._tabActionCreator.updateErrorMessage(error);
            });
    }

    private _tabActionCreator: TabActionCreator;
    private historyActions: HistoryActions;
}