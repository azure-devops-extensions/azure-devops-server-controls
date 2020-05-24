import { INode } from "Presentation/Scripts/TFS/FeatureRef/TFS.AgileCommon";
import { NodesCacheManager } from "WorkItemTracking/Scripts/OM/NodesCacheManager";
import { TeamContext } from "TFS/Core/Contracts";
import { VssConnection } from "VSS/Service";
import { WorkHttpClient4_1 } from "TFS/Work/RestClient";
import { WorkItemTrackingHttpClient4_1 } from "TFS/WorkItemTracking/RestClient";
import Work_Contracts = require("TFS/Work/Contracts");
import WorkItemTracking_Contracts = require("TFS/WorkItemTracking/Contracts");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import TFS_OM_Common = require("Presentation/Scripts/TFS/TFS.OM.Common");
import WITOM = require("WorkItemTracking/Scripts/TFS.WorkItemTracking")
import { toNativePromise } from "VSSPreview/Utilities/PromiseUtils";
import { NodeHelpers } from "WorkItemTracking/Scripts/Utils/NodeHelpers";

export interface ISprintEditorDataProvider {
    getRootIterationNodeForProject(): Promise<INode>;
    getTeamSettings(teamId: string): Promise<Work_Contracts.TeamSetting>;
    getIterationPathsForTeam(teamId: string): Promise<string[]>;
    createAndAddIterationForTeam(teamId: string, iterationName: string, iterationParentPath: string, iterationStartDate: Date, iterationEndDate: Date): Promise<Work_Contracts.TeamSettingsIteration>;
    editIteration(iteration: INode, iterationName: string, iterationStartDate: Date, iterationEndDate: Date): Promise<WorkItemTracking_Contracts.WorkItemClassificationNode>;
    selectIterationForTeam(teamId: string, selectedIterationPath: string): Promise<Work_Contracts.TeamSettingsIteration>;
    /**
     * Try get the suggested next iteration for team to select.
     * 1. If the team does not select any iterations, returns empty suggestion.
     * 2. If the team's last selected iteration is the last child of the direct parent, return empty suggestion.
     * 3. If the team is last selected iteration is not the last child of the direct parent, return the next siblings. (sorted by dates)
     * @param sortedSelectedIterationPaths The sorted and selected iterations of one team.
     */
    tryGetNextSuggestedIterationPath(sortedSelectedIterationPaths: string[]): string;
}

export class SprintEditorDataProvider implements ISprintEditorDataProvider {
    private _workHttpClient: WorkHttpClient4_1;
    private _workItemTrackingClient: WorkItemTrackingHttpClient4_1;
    private _nodeManager: NodesCacheManager;
    private static readonly ITERATION_SEPARATOR = '\\';


    public getRootIterationNodeForProject(): Promise<INode> {
        const tfsContext = TFS_Host_TfsContext.TfsContext.getDefault();
        const store = TFS_OM_Common.ProjectCollection.getConnection(tfsContext).getService<WITOM.WorkItemStore>(WITOM.WorkItemStore);
        return new Promise((resolve, reject) => {
            store.beginGetProject(tfsContext.navigation.project, (project: WITOM.Project) => {
                this._nodeManager = project.nodesCacheManager;
                this._nodeManager.beginGetNodes().then(() => {
                    const rootNode: INode = this._nodeManager.getIterationNode(true);
                    resolve(rootNode);
                }, reject);
            }, reject);
        });
    }

    public getTeamSettings(teamId: string): Promise<Work_Contracts.TeamSetting> {
        const teamContext = this._getTeamContext(teamId);
        return toNativePromise(this._getWorkHttpClient().getTeamSettings(teamContext).then((settings: Work_Contracts.TeamSetting) => {
            if (settings) {
                return settings;
            } else {
                throw new Error("Error parsing return result");
            }
        }));
    }

    public getIterationPathsForTeam(teamId: string): Promise<string[]> {
        if (this._isNodesCacheAvailable()) {
            const teamContext = this._getTeamContext(teamId);
            return toNativePromise(this._getWorkHttpClient().getTeamIterations(teamContext).then((iterations: Work_Contracts.TeamSettingsIteration[]) => {
                return iterations.map((iteration: Work_Contracts.TeamSettingsIteration) => {
                    return iteration.path.split('/').join(SprintEditorDataProvider.ITERATION_SEPARATOR);
                });
            }));
        }

        return Promise.reject(null);
    }

    public tryGetNextSuggestedIterationPath(sortedSelectedIterationPaths: string[]): string {
        if (!sortedSelectedIterationPaths || sortedSelectedIterationPaths.length === 0) {
            return "";
        }
        const lastSelectedPath = sortedSelectedIterationPaths[sortedSelectedIterationPaths.length - 1];
        const lastSelectedIteration = this._getNodeManager().findIterationNodeByPath(lastSelectedPath);
        if (lastSelectedIteration.parent === null) {
            // Should never be hit, just for safety purpose.
            return "";
        }
        const directParent = this._getNodeManager().findNodeById(lastSelectedIteration.parent.id);
        const siblings = directParent.children;
        const index = (siblings.map((sibling: INode) => sibling.guid)).indexOf(lastSelectedIteration.guid);
        return (index >= 0 && index < siblings.length - 1) ? this._replaceLeafPath(lastSelectedPath, siblings[index + 1].name) : "";
    }

    public createAndAddIterationForTeam(
        teamId: string,
        iterationName: string,
        iterationParentPath: string,
        iterationStartDate: Date,
        iterationEndDate: Date
    ): Promise<Work_Contracts.TeamSettingsIteration> {
        return this._createNewIterationInternal(teamId, iterationName, iterationParentPath, iterationStartDate, iterationEndDate).then((createdNode: WorkItemTracking_Contracts.WorkItemClassificationNode) => {
            return this._getNodeManager().refreshCache().then(
                () => this._selectIterationInternal(teamId, null, createdNode.identifier)
            );
        });
    }

    public editIteration(iteration: INode, iterationName: string, iterationStartDate: Date, iterationEndDate: Date): Promise<WorkItemTracking_Contracts.WorkItemClassificationNode> {
        const patchNode = this._getPatchNode(iterationName, iterationStartDate, iterationEndDate);
        const projectId = this._getCurrentProjectId();
        const iterationPath = NodeHelpers.getRelativePath(NodeHelpers.getPath(iteration, 1));

        return (
            toNativePromise(
                this._getWorkItemTrackingHttpClient().updateClassificationNode(patchNode, projectId, WorkItemTracking_Contracts.TreeStructureGroup.Iterations, iterationPath)
            ).then(
                (value: WorkItemTracking_Contracts.WorkItemClassificationNode) => {
                    return this._getNodeManager().refreshCache().then(() => {
                        return value;
                    });
                }
            )
        );
    }

    public selectIterationForTeam(teamId: string, selectedIterationPath: string): Promise<Work_Contracts.TeamSettingsIteration> {
        if (this._isNodesCacheAvailable()) {
            return this._selectIterationInternal(teamId, selectedIterationPath);
        }
        else {
            // If nodes are not ready, we load the nodes to the cache.
            return this.getRootIterationNodeForProject().then(() => {
                return this._selectIterationInternal(teamId, selectedIterationPath);
            });
        }
    }

    // For unit tests.
    protected _getNodeManager() {
        return this._nodeManager;
    }

    protected _isNodesCacheAvailable(): boolean {
        return !!this._nodeManager && this._nodeManager.isNodesCacheAvailable();
    }

    protected _selectIterationInternal(teamId: string, iterationPath?: string, iterationGuid?: string): Promise<Work_Contracts.TeamSettingsIteration> {
        let guid = iterationGuid;
        if (!guid) {
            const iterationNode = this._nodeManager.findIterationNodeByPath(iterationPath);
            if (!iterationNode) {
                return Promise.reject(null);
            }

            guid = iterationNode.guid;
        }
        const teamContext = this._getTeamContext(teamId);
        const iteration = { id: guid.toString() } as Work_Contracts.TeamSettingsIteration;
        return toNativePromise(this._getWorkHttpClient().postTeamIteration(iteration, teamContext));
    }

    protected _createNewIterationInternal(teamId: string,
        iterationName: string,
        iterationParentPath: string,
        iterationStartDate: Date,
        iterationEndDate: Date): Promise<WorkItemTracking_Contracts.WorkItemClassificationNode> {
        const patchNode = this._getPatchNode(iterationName, iterationStartDate, iterationEndDate);
        const projectId = this._getCurrentProjectId();
        return toNativePromise(
            this._getWorkItemTrackingHttpClient().createOrUpdateClassificationNode(patchNode, projectId, WorkItemTracking_Contracts.TreeStructureGroup.Iterations, NodeHelpers.getRelativePath(iterationParentPath))
        );
    }

    protected _getWorkHttpClient(): WorkHttpClient4_1 {
        if (!this._workHttpClient) {
            let tfsConnection: VssConnection = new VssConnection(TFS_Host_TfsContext.TfsContext.getDefault().contextData);
            this._workHttpClient = tfsConnection.getHttpClient<WorkHttpClient4_1>(WorkHttpClient4_1);
        }
        return this._workHttpClient;
    }

    protected _getWorkItemTrackingHttpClient(): WorkItemTrackingHttpClient4_1 {
        if (!this._workItemTrackingClient) {
            let tfsConnection: VssConnection = new VssConnection(TFS_Host_TfsContext.TfsContext.getDefault().contextData);
            this._workItemTrackingClient = tfsConnection.getHttpClient<WorkItemTrackingHttpClient4_1>(WorkItemTrackingHttpClient4_1);
        }
        return this._workItemTrackingClient;
    }

    protected _getTeamContext(teamId?: string): TeamContext {
        return {
            projectId: this._getCurrentProjectId(),
            teamId: teamId
        } as TeamContext;
    }

    protected _getCurrentProjectId(): string {
        const context = TFS_Host_TfsContext.TfsContext.getDefault();
        if (context && context.contextData && context.contextData.project) {
            return context.contextData.project.id;
        }
        return "";
    }

    private _replaceLeafPath(pathToBeReplaced: string, leafPathName: string): string {
        const pathSegments = pathToBeReplaced.split(SprintEditorDataProvider.ITERATION_SEPARATOR);
        pathSegments[pathSegments.length - 1] = leafPathName;
        return pathSegments.join(SprintEditorDataProvider.ITERATION_SEPARATOR);
    }

    private _getPatchNode(iterationName: string, iterationStartDate: Date, iterationEndDate: Date): any {
        return {
            name: iterationName,
            attributes: {
                startDate: new Date(Date.UTC(iterationStartDate.getFullYear(), iterationStartDate.getMonth(), iterationStartDate.getDate())),
                finishDate: new Date(Date.UTC(iterationEndDate.getFullYear(), iterationEndDate.getMonth(), iterationEndDate.getDate()))
            }
        };
    }
}