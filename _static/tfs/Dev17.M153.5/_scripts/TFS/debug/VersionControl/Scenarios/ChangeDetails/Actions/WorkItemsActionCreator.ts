import { ActionsHub } from  "VersionControl/Scenarios/ChangeDetails/Actions/ActionsHub";
import { WorkItemsSource } from  "VersionControl/Scenarios/ChangeDetails/Sources/WorkItemsSource";
import { isEmptyGuid } from "VSS/Utils/String";
import { RepositoryContext } from "VersionControl/Scripts/RepositoryContext";

/**
 * Action Creator for workitems information
 */
export class WorkItemsActionCreator {

    constructor(
        private _actionsHub: ActionsHub,
        private _repositoryContext: RepositoryContext,
        private _workItemsSource?: WorkItemsSource) {
    }

    /**
     * Loads workitems information associated with the tfvc artifact, and creates an action with workitem ids as payload.
     */
    public loadAssociatedWorkItemsForTfvc = (versionSpecString: string): void => {
        this._loadAssociatedWorkItems(this.workItemsSource.getAssociatedWorkItemsForTfvc(versionSpecString));
    }

    /**
     * Loads workitems information associated with the git artifact, and creates an action with workitem ids as payload.
     */
    public loadAssociatedWorkItemsForGit = (artifactUri: string, projectId: string): void => {
        this._loadAssociatedWorkItems(this.workItemsSource.getAssociatedWorkItemsForGit(artifactUri, projectId));
    }

    private _loadAssociatedWorkItems = (workItemsSourcePromise: IPromise<number[]>): void => {
        workItemsSourcePromise.then(
            (workItems: number[]) => {
                this._actionsHub.workItemsUpdated.invoke(workItems);
            },
            (error: Error) => {
                this._actionsHub.errorRaised.invoke(error);
            });
    }

    private get workItemsSource(): WorkItemsSource {
        if (!this._workItemsSource) {
            this._workItemsSource = new WorkItemsSource(this._repositoryContext);
        }

        return this._workItemsSource;
    }

}
