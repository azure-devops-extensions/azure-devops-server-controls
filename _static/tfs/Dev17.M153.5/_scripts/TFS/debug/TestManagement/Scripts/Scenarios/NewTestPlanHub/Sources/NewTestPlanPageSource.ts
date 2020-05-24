/// <reference path="../actions/testplanactionscreator.ts" />
import * as Contributions_Contracts from "VSS/Contributions/Contracts";
import * as Service from "VSS/Service";
import * as TFS_Host_TfsContext from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import * as Utils_Array from "VSS/Utils/Array";
import * as WIT_Contracts from "TFS/WorkItemTracking/Contracts";
import * as WIT_RestClient from "TFS/WorkItemTracking/RestClient";
import * as TCM_RestClient from "TFS/TestManagement/RestClient";
import { getClient as getWIClient, WorkItemTrackingHttpClient4_1 } from "TFS/WorkItemTracking/RestClient";
import { INode, INodeStructureType } from "Presentation/Scripts/TFS/FeatureRef/TFS.AgileCommon";
import { PlanUpdateModel, ShallowReference, TestPlan } from "TFS/TestManagement/Contracts";
import { TreeStructureGroup, WorkItemClassificationNode, TreeNodeStructureType } from "TFS/WorkItemTracking/Contracts";
import {
    ClassificationNodeTypeConstants,
    INewTestPlanFields
} from "TestManagement/Scripts/Scenarios/NewTestPlanHub/Contracts";

export class NewTestPlanPageSource {

    public static getInstance() {
        if (!NewTestPlanPageSource._instance) {
            NewTestPlanPageSource._instance = new NewTestPlanPageSource();
        }
        return NewTestPlanPageSource._instance;
    }
    private static _instance: NewTestPlanPageSource;
    private readonly depth: number = 15;

    public createTestPlan(name: string, projectId: string, areaPath: string, iteration: string): IPromise<TestPlan> {

        const plan = {
            name: name,
            area: { name: areaPath } as ShallowReference,
            iteration: iteration
        } as PlanUpdateModel;

        return Service.getClient(TCM_RestClient.TestHttpClient).createTestPlan(plan, projectId).then((plan: TestPlan) => {
            return new Promise(resolve => resolve(plan));
        },
            (error: Error) => {
                return new Promise((resolve, reject) => reject(error));
            });
    }

    public getNewTestPlanFields(): IPromise<INewTestPlanFields> {
        const project = this.getProjectIdFromContext();
        const topLevelProjectNode: INode = {
            id: parseInt(project.id),
            name: project.name,
            guid: undefined,
            structure: 0,
            type: ClassificationNodeTypeConstants.ProjectType,
            children: []
        };


        return Service.getClient(WIT_RestClient.WorkItemTrackingHttpClient).getRootNodes(
            project.name,
            this.depth
        ).then((nodes: WorkItemClassificationNode[]) => {

            for (const node of nodes) {
                topLevelProjectNode.children.push(this._mapClassificationNodesToLegacyNode(node));
            }
            this._link(topLevelProjectNode);
            const fields = {
                areaPath: this._findChildByStructure(topLevelProjectNode, 1),
                iteration: this._findChildByStructure(topLevelProjectNode, 2),
                projectId : project.id
            } as INewTestPlanFields;

            return new Promise(resolve => resolve(fields));
        },
            (error: Error) => {
                return new Promise((resolve, reject) => reject(error));
            });
    }

    /**
    * Get project id from context
    */
    public getProjectIdFromContext(): ContextIdentifier {
        return TFS_Host_TfsContext.TfsContext.getDefault().contextData.project;
    }

    private _findChildByStructure(node: INode, structure: number): INode {
        const children = node.children;

        if (children) {
            for (const child of children) {
                if (child.structure === structure) {
                    return child;
                }
            }
        }

        return null;
    }

    private _mapClassificationNodesToLegacyNode(node: WorkItemClassificationNode): INode {
        const legacyNode: INode = {
            id: node.id,
            structure: null,
            startDate: node.attributes ? new Date(node.attributes["startDate"]) : null,
            children: [],
            finishDate: node.attributes ? new Date(node.attributes["finishDate"]) : null,
            guid: node.identifier,
            name: node.name,
            parent: null,
            type: null
        };

        if (node.structureType === TreeNodeStructureType.Area) {
            legacyNode.structure = INodeStructureType.Area;
            legacyNode.type = ClassificationNodeTypeConstants.AreaType;
        }
        else if (node.structureType === TreeNodeStructureType.Iteration) {
            legacyNode.structure = INodeStructureType.Iteration;
            legacyNode.type = ClassificationNodeTypeConstants.IterationType;
        }

        if (node.children) {
            for (const childNode of node.children) {
                legacyNode.children.push(this._mapClassificationNodesToLegacyNode(childNode));
            }
        }


        return legacyNode;
    }

    private _link(parentNode: INode): INode {
        if (parentNode.children) {

            for (const node of parentNode.children) {
                node.parent = parentNode;
                this._link(node);
            }
        }

        return parentNode;
    }
}
