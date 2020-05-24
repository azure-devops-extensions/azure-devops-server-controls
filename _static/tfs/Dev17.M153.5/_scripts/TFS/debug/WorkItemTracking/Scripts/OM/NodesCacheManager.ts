import VSS = require("VSS/VSS");
import { getClient } from "VSS/Service";
import { IReferencedNodes, INode, IReferencedNode, INodeStructureType } from "Presentation/Scripts/TFS/FeatureRef/TFS.AgileCommon";
import * as NavigationServices from "VSS/Navigation/Services";
import { Debug } from "VSS/Diag";
import { NodeHelpers, ClassificationNodeTypeConstants } from "WorkItemTracking/Scripts/Utils/NodeHelpers";
import { PerformanceEvents } from "WorkItemTracking/Scripts/CustomerIntelligence";
import { WITCommonConstants } from "Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants";
import * as ContributionsHttpClient from "VSS/Contributions/RestClient";
import { PerfScenarioManager } from "WorkItemTracking/Scripts/Utils/PerfScenarioManager";
import Ajax = require("Presentation/Scripts/TFS/TFS.Legacy.Ajax");
import { Project } from "WorkItemTracking/Scripts/TFS.WorkItemTracking";
import * as Q from "q";
import * as Telemetry from "VSS/Telemetry/Services";
import { WITCustomerIntelligenceArea, WITCustomerIntelligenceFeature } from "WorkItemTracking/Scripts/CustomerIntelligence";
import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";
import { FeatureAvailabilityFlags } from "Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants";

import { WorkItemTrackingHttpClient4 } from "TFS/WorkItemTracking/RestClient";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { ProjectCollection } from "Presentation/Scripts/TFS/TFS.OM.Common";
import { TreeStructureGroup, WorkItemClassificationNode, TreeNodeStructureType } from "TFS/WorkItemTracking/Contracts";

export class NodesCacheManager {

    private _referencedNodes = {
        byId: <{ [id: number]: IReferencedNode }>{},
        byAreaPath: <{ [areaPath: string]: IReferencedNode }>{},
        byIterationPath: <{ [iterationPath: string]: IReferencedNode }>{}
    }

    private _nodes: INode;
    private _areaNode: INode;
    private _iterationNode: INode;
    private _project: Project;

    constructor(project: Project) {
        this._project = project;
        let projectNode: IReferencedNode = {
            id: this._project.id,
            name: this._project.name,
            path: this._project.name
        };
        this._referencedNodes.byId[projectNode.id] =
            this._referencedNodes.byAreaPath[projectNode.path] =
            this._referencedNodes.byIterationPath[projectNode.path] = projectNode;
    }

    public addReferencedNodes(nodes?: IReferencedNodes) {
        if (nodes) {
            for (let n of nodes.areaNodes) {
                this._referencedNodes.byId[n.id] = this._referencedNodes.byAreaPath[n.path] = n;
            }
            for (let n of nodes.iterationNodes) {
                this._referencedNodes.byId[n.id] = this._referencedNodes.byIterationPath[n.path] = n;
            }
        }
    }

    /**
     * Attempts to get the specified node from, in order: the nodes cache and the shared referenceNodes cache.
     *
     * It is possible that the node specified exists even if getReferencedNodes returns null when nodesCacheManager.isNodesCacheAvailable == false
     * In this case call nodesCacheManager.beginGetNodes to populate the cache
     * @param identifier
     * @return An IExtended node if a referenced node is used otherwise an INode
     */
    public getReferencedNode(identifier: number | { path: string, nodeType: number }): IReferencedNode | INode {
        if (typeof identifier === 'number') {
            var id: number = identifier;
        } else if (typeof identifier === 'object') {
            var { path, nodeType } = <{ path: string, nodeType: number }>identifier;
        }

        if (this.isNodesCacheAvailable()) {
            if (typeof id === 'number') {
                return this.findNodeById(id);
            }
            if (path && nodeType) {
                return nodeType === 1 ? this.findAreaNodeByPath(path) : this.findIterationNodeByPath(path);
            }
        }

        let node: IReferencedNode;
        if (nodeType) {
            let nodes = nodeType === 1 ? this._referencedNodes.byAreaPath : this._referencedNodes.byIterationPath;
            node = nodes[path];
        } else {
            node = this._referencedNodes.byId[id];
        }
        if (node) {
            return node;
        }

        Debug.logInfo(`Could not find a node cache for ${id ? id : `${path} (type: ${nodeType})`}`);
        return null;
    }

    public clearCache(): void {
        this._iterationNode = null;
        this._areaNode = null;
        this._nodes = null;
    }

    public getNodes(): INode {
        if (this.isNodesCacheAvailable()) {
            return <INode>this._nodes;
        }

        Debug.fail("Project nodes are not ready yet. Use beginGetNodes to download from the server.");
    }

    /**
     * Whether all nodes have been retrieved yet
     */
    public isNodesCacheAvailable(): boolean {
        return this._nodes && !$.isFunction(this._nodes);
    }

    /**
     * Clear the cache and reload the nodes from the server
     */
    public refreshCache(): IPromise<INode> {
        this.clearCache();
        const projectId = TfsContext.getDefault().navigation.projectId;
        return this._project.store.metadataCacheStampManager.ensureStampsForCurrentProject(projectId, /**forceRefresh*/ true).then(() => {
            return this.beginGetNodes();
        });
    }

    public beginGetNodes(): IPromise<INode> {
        const readOnly = NavigationServices.getHistoryService().getCurrentState()["readonly"]
        const useRestClient: boolean = readOnly &&
            FeatureAvailabilityService.isFeatureEnabled(FeatureAvailabilityFlags.WebAccessWorkItemTrackingWorkItemFormDataProviders);

        if (useRestClient) {
            return this.beginGetNodesFromRestClient();
        }

        return this.beginGetNodesFromMvc();
    }

    public beginGetNodesFromMvc(): IPromise<INode> {
        let deferred = Q.defer<INode>();

        // this will set this._nodes on completion
        VSS.queueRequest(this, this, "_nodes", (e: INode) => deferred.resolve(e), (error) => deferred.reject(error), (succeeded: IResultCallback, failed: IErrorCallback) => {
            this._project.store.metadataCacheStampManager.addStampToParams(WITCommonConstants.Nodes, null, (params) => {
                PerfScenarioManager.addSplitTiming(
                    PerformanceEvents.WORKITEMTRACKING_GETNODES_REQUEST, true);

                const issueNodesRequest = (reissueOnFailure: boolean) => {
                    Ajax.getMSJSON(this._project.getApiLocation("nodes"),
                        params,
                        (nodes: INode, textStatus: string, xhr: JQueryXHR) => {
                            if ((nodes == null) && reissueOnFailure) {
                                // We observed this primarily on IE - suspect browser cache corruption
                                // Add a fake 'forceQuery' parameter to force invalidate the cache 
                                // And only retry one more time avoid infinite loop 
                                var ciData = {
                                    "ErrorName": "NodesIsNullOrUndefined",
                                    "projectName": this._project.name,
                                    "urlParams": params
                                };
                                Telemetry.publishEvent(new Telemetry.TelemetryEventData(
                                    WITCustomerIntelligenceArea.WORK_ITEM_TRACKING,
                                    WITCustomerIntelligenceFeature.NODES_CACHE_MANAGER,
                                    ciData));

                                params["forceInvalidateCache"] = new Date().getTime().toString();
                                issueNodesRequest(false);

                                return;
                            }
                            PerfScenarioManager.addData({
                                [`${PerformanceEvents.WORKITEMTRACKING_GETNODES_REQUEST}.ETAG`]: xhr.getResponseHeader('ETag')
                            });

                            PerfScenarioManager.addSplitTiming(
                                PerformanceEvents.WORKITEMTRACKING_GETNODES_REQUEST, false);
                            succeeded(NodeHelpers.link(nodes));
                        },
                        failed);
                };

                issueNodesRequest(true);
            });
        });

        return deferred.promise;
    }

    public beginGetNodesFromRestClient(): IPromise<INode> {
        let deferred = Q.defer<INode>();

        // this will set this._nodes on completion
        VSS.queueRequest(this, this, "_nodes", (e: INode) => deferred.resolve(e), (error) => deferred.reject(error),
            (succeeded: IResultCallback, failed: IErrorCallback) => {

                PerfScenarioManager.addSplitTiming(PerformanceEvents.WORKITEMTRACKING_GETNODES_REQUEST, true);

                var workItemTrackingClient: WorkItemTrackingHttpClient4 = getClient(WorkItemTrackingHttpClient4);
                const topLevelProjectNode: INode = {
                    id: this._project.id,
                    name: this._project.name,
                    guid: this._project.guid,
                    structure: 0,
                    type: ClassificationNodeTypeConstants.ProjectType,
                    children: []
                };

                workItemTrackingClient.getRootNodes(this._project.name, 15 /* The current max allowed depth is 14 */).then((nodes: WorkItemClassificationNode[]) => {
                    for (var node of nodes) {
                        topLevelProjectNode.children.push(NodeHelpers.mapClassificationNodesToLegacyNode(node));
                    }
                    NodeHelpers.link(topLevelProjectNode);
                    succeeded(topLevelProjectNode);
                }, (reason: any) => {
                    failed(reason.message);
                });
            });

        return deferred.promise;
    }

    public findAreaNodeByPath(nodePath: string): INode {
        return NodeHelpers.findByPath(this.getNodes(), nodePath, 1, 1);
    }

    public findIterationNodeByPath(nodePath: string): INode {
        return NodeHelpers.findByPath(this.getNodes(), nodePath, 1, 2);
    }

    public findNodeById(nodeId: number): INode {
        return NodeHelpers.findById(this.getNodes(), nodeId);
    }

    public getAreaNode(rootAsProjectNode: boolean): INode {
        if (!this._areaNode) {
            this._areaNode = NodeHelpers.findChildByStructure(this.getNodes(), 1);
        }

        if (rootAsProjectNode) {
            return { id: this._project.id, name: this._project.name, guid: this._project.guid, structure: 0, type: -42, children: this._areaNode.children };
        }
        else {
            return this._areaNode;
        }
    }

    public getIterationNode(rootAsProjectNode: boolean): INode {
        if (!this._iterationNode) {
            this._iterationNode = NodeHelpers.findChildByStructure(this.getNodes(), 2);
        }

        if (rootAsProjectNode) {
            return { id: this._project.id, name: this._project.name, guid: this._project.guid, structure: 0, type: -42, children: this._iterationNode.children };
        }
        else {
            return this._iterationNode;
        }
    }
}
