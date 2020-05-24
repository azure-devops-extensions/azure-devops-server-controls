import * as Resources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";
import { ChangeType, IRevisionsData } from "DistributedTaskControls/SharedViews/ContainerTabs/HistoryTab/HistoryStore";

import * as BuildContracts from "TFS/Build/Contracts";
import * as DTContracts from "TFS/DistributedTask/Contracts";

import * as Context from "VSS/Context";
import * as Utils_Date from "VSS/Utils/Date";
import * as Utils_String from "VSS/Utils/String";

export class Utilities {

    public static getDefaultQueue(queues: DTContracts.TaskAgentQueue[], pools: DTContracts.TaskAgentPool[]) {
        if (!queues || !pools) {
            return null;
        }
        // get hosted pool ids
        let hostedPoolIds = pools.filter((pool) => {
            return pool.isHosted;
        }).map((pool) => {
            return pool.id;
        });

        // get first queue for a hosted pool
        let agentQueue = queues.filter((queue: DTContracts.TaskAgentQueue) => {
            return hostedPoolIds.some((id: number) => {
                return id === queue.pool.id;
            });
        })[0];

        return Utilities.convertToBuildQueue(agentQueue || queues[0]);
    }

    public static convertToBuildQueue(queue: DTContracts.TaskAgentQueue): BuildContracts.AgentPoolQueue {
        // a queue with id 0 means "inherit from definition". in the object model this is represented as a null queue
        if (!queue || queue.id === 0) {
            return null;
        }
        else {
            return {
                id: queue.id,
                name: queue.name,
                pool: {
                    id: queue.pool.id,
                    name: queue.pool.name
                } as BuildContracts.TaskAgentPoolReference
            } as BuildContracts.AgentPoolQueue;
        }
    }

    public static convertFromBuildQueue(queue: BuildContracts.AgentPoolQueue): DTContracts.TaskAgentQueue {
        if (!queue) {
            return null;
        }
        else {
            return {
                id: queue.id,
                name: queue.name,
                pool: !queue.pool ? queue.pool : {
                    id: queue.pool.id,
                    name: queue.pool.name,
                } as DTContracts.TaskAgentPoolReference,
                projectId: Context.getDefaultWebContext().project.id
            } as DTContracts.TaskAgentQueue;
        }
    }

    public static convertBuildDefinitionRevisionToColumn(revisions: BuildContracts.BuildDefinitionRevision[]): IRevisionsData[] {
        let revisionColumns: IRevisionsData[] = [];

        revisions.sort((revision1: BuildContracts.BuildDefinitionRevision, revision2: BuildContracts.BuildDefinitionRevision) => {
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
            }

            let row = {
                changedBy: (!!revision.changedBy) ? revision.changedBy.displayName : Utils_String.empty,
                changeType: changeType,
                changedDate: Utils_Date.localeFormat(revision.changedDate, "g"),
                comment: (revision.comment ? revision.comment : Utils_String.empty),
                revisionNumber: revision.revision
            } as IRevisionsData;
            revisionColumns.push(row);
        });

        return revisionColumns;
    }
}
