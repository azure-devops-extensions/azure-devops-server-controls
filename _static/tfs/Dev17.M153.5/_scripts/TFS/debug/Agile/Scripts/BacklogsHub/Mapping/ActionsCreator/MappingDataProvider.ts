import { CoreFieldRefNames } from "Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants";
import { TeamContext } from "TFS/Core/Contracts";
import { BacklogLevelConfiguration, BacklogLevelWorkItems } from "TFS/Work/Contracts";
import { WorkHttpClient } from "TFS/Work/RestClient";
import { WorkItem as IWorkItem, WorkItemLink as IWorkItemLink } from "TFS/WorkItemTracking/Contracts";
import { getClient } from "VSS/Service";
import { toNativePromise } from "VSSPreview/Utilities/PromiseUtils";
import { PageWorkItemHelper } from "WorkItemTracking/Scripts/Utils/PageWorkItemHelper";

export interface IMappingDataProvider {
    isBacklogVisible(backlogId: string, projectId: string, teamId: string): Promise<boolean>;
    fetchWorkItemsForBacklog(projectId: string, teamId: string, backlogId: string): Promise<number[]>;
    pageWorkItems(workItemIds: number[]): Promise<IWorkItem[]>;
}

export class MappingDataProvider implements IMappingDataProvider {
    public isBacklogVisible(backlogId: string, projectId: string, teamId: string): Promise<boolean> {
        const workRestClient = this._getWorkRestClient();

        return toNativePromise(
            workRestClient.getBacklog(this._getTeamContext(projectId, teamId), backlogId).then((value: BacklogLevelConfiguration) => {
                return !value.isHidden;
            })
        );
    }

    public pageWorkItems(workItemIds: number[]): Promise<IWorkItem[]> {
        if (workItemIds.length === 0) {
            return Promise.resolve([]);
        }

        const fieldRefNames = [
            CoreFieldRefNames.TeamProject,
            CoreFieldRefNames.Title,
            CoreFieldRefNames.WorkItemType
        ];

        // Page work items
        return toNativePromise(PageWorkItemHelper.pageWorkItems(workItemIds, /* projectName */null, fieldRefNames));
    }

    public fetchWorkItemsForBacklog(projectId: string, teamId: string, backlogId: string): Promise<number[]> {
        const workRestClient = this._getWorkRestClient();
        return toNativePromise(
            workRestClient.getBacklogLevelWorkItems(this._getTeamContext(projectId, teamId), backlogId).then((value: BacklogLevelWorkItems) => {
                if (value && value.workItems) {
                    return value.workItems.map((workItemLink: IWorkItemLink) => {
                        return workItemLink.target.id;
                    });
                } else {
                    return [];
                }
            })
        );
    }

    private _getTeamContext(projectId: string, teamId: string): TeamContext {
        return { team: teamId, teamId, project: projectId, projectId };
    }

    private _getWorkRestClient(): WorkHttpClient {
        return getClient<WorkHttpClient>(WorkHttpClient, undefined, undefined, undefined, undefined);
    }
}