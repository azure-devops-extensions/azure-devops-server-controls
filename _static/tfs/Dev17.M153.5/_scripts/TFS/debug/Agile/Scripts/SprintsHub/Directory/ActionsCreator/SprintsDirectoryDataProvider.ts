import { ClassificationMode, CssNode, IClassificationTreeNode } from "Agile/Scripts/Admin/AreaIterations.DataModels";
import { CSSNodeManager } from "Agile/Scripts/Admin/CSSNodeManager";
import { getClient as getWorkClient } from "TFS/Work/RestClient";
import { INode } from "Presentation/Scripts/TFS/FeatureRef/TFS.AgileCommon";
import * as TFS_Host_TfsContext from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import * as TFS_OM_Common from "Presentation/Scripts/TFS/TFS.OM.Common";
import { TeamContext } from "TFS/Core/Contracts";
import { FieldDataProvider } from "Presentation/Scripts/TFS/TFS.UI.Controls.Grid.DataAdapters";
import { TeamSettingsIteration } from "TFS/Work/Contracts";
import { getDefaultWebContext } from "VSS/Context";
import * as WITOM from "WorkItemTracking/Scripts/TFS.WorkItemTracking";
import { Iteration, IterationBuilder } from "Agile/Scripts/Models/Iteration";

export interface ISprintsDirectoryDataProvider {
    /**
     * Edit an iteration node
     * @param iterationId The iteration id
     */
    editNode(iterationId: string): Promise<void>;
    /**
     * Load current iterations for the provided teams
     * @param teamIds The ids of the teams
     */
    loadMoreIterations(teamIds: string[]): Promise<Iteration[]>;
}

export class SprintsDirectoryDataProvider implements ISprintsDirectoryDataProvider {

    protected _needToReloadProjectNodes: boolean = true;

    public editNode(iterationId: string): Promise<void> {
        return this._getIterationRootNode().then((rootNode: INode) => {
            const rootCssNode = this._nodeToCssNode(rootNode, null);
            const fieldDataProvider = new FieldDataProvider([rootCssNode], { sort: CssNode.compare });
            const cssNodeToEdit = fieldDataProvider.getNodeFromId(iterationId);
            const nodeManager = new CSSNodeManager(ClassificationMode.MODE_ITERATIONS, fieldDataProvider);
            if (!cssNodeToEdit) {
                return;
            }

            return new Promise<void>((resolve, reject) => {
                // Show edit dialog to edit the css node via the UI
                nodeManager.editNode(
                    cssNodeToEdit,
                    () => {
                        // Refresh the cache on the next run
                        this._needToReloadProjectNodes = true;
                        resolve();
                    },
                    () => reject("Dialog closed")
                );
            });
        });
    }

    /**
     * Load more iterations for the given team ids
     * @param teamIds The array of team guid.
     */
    public loadMoreIterations(teamIds: string[]): Promise<Iteration[]> {
        const workHttpClient = getWorkClient();
        const promises: IPromise<Iteration>[] = teamIds.map((teamId: string, index: number) => {
            return workHttpClient.getTeamIterations(this._getTeamContext(teamId), "Current").then((teamSettingsIterations: TeamSettingsIteration[]) => {
                return IterationBuilder.fromTeamSettingsIteration(teamSettingsIterations[0]);
            });
        });

        return Promise.all(promises);
    }

    /**
     * Get the iteration nodes for the project
     */
    private _getIterationRootNode(): Promise<INode> {
        const tfsContext = TFS_Host_TfsContext.TfsContext.getDefault();
        const store = TFS_OM_Common.ProjectCollection.getConnection(tfsContext).getService<WITOM.WorkItemStore>(WITOM.WorkItemStore);
        return this._getRootNode(tfsContext.navigation.project, store);
    }

    protected _getRootNode(projectId: string, store: WITOM.WorkItemStore): Promise<INode> {
        return new Promise((resolve, reject) => {
            store.beginGetProject(projectId, (project: WITOM.Project) => {
                const nodeCacheManager = project.nodesCacheManager;
                if (this._needToReloadProjectNodes) {
                    nodeCacheManager.refreshCache().then(() => {
                        this._needToReloadProjectNodes = false;
                        const rootNode = nodeCacheManager.getIterationNode(false);
                        // Get iteration node returns a tree with the root being the structure node 'Iteration'
                        // When we edit an iteration, the parent id should be this stuctural node
                        // However, we want to display the iteration as 'Project Name'
                        // HACK: Rename the node
                        rootNode.name = project.name;
                        resolve(rootNode);
                    }, reject);
                } else {
                    nodeCacheManager.beginGetNodes().then(() => {
                        const rootNode = nodeCacheManager.getIterationNode(false);
                        rootNode.name = project.name;
                        resolve(rootNode);
                    }, reject);
                }
            }, reject);
        });
    }

    /**
     * Convert INode obtained from nodeCacheManager.beginGetNodes to noded compatible with FieldDataProvider
     * @param node the node to convert
     * @param parentNode the parent css node
     */
    protected _nodeToCssNode(node: INode, parentNode: IClassificationTreeNode): IClassificationTreeNode {
        const cssNode: any = {};

        cssNode.id = node.guid;
        cssNode.children = [];
        cssNode.parent = parentNode;
        cssNode.parentId = parentNode ? parentNode.id : null;
        cssNode.text = node.name;
        cssNode.values = [];
        cssNode.values.push(cssNode.text);
        cssNode.values.push(node.startDate ? node.startDate : null);
        cssNode.values.push(node.finishDate ? node.finishDate : null);

        for (let index = 0; index < node.children.length; index++) {
            const cssChild = this._nodeToCssNode(node.children[index], cssNode);
            cssNode.children[index] = cssChild;
        }

        return cssNode as IClassificationTreeNode;
    }

    private _getTeamContext(teamId: string): TeamContext {
        const project = getDefaultWebContext().project;

        return {
            projectId: project.id,
            teamId: teamId
        } as TeamContext;
    }
}
