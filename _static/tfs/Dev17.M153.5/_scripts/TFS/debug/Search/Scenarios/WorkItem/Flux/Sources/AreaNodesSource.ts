import * as VSS from "VSS/VSS";
import * as VSS_Service from "VSS/Service"
import * as _AgileCommon from "Presentation/Scripts/TFS/FeatureRef/TFS.AgileCommon";
import * as _WITNodeHelpers from "WorkItemTracking/Scripts/Utils/NodeHelpers";
import * as _WITRestClient from "TFS/WorkItemTracking/RestClient";
import * as _WITContracts from "TFS/WorkItemTracking/Contracts";

export class AreaNodesSource {
    public getAreaNode(project: string): Promise<_AgileCommon.INode> {
        return new Promise((resolve, reject) => {
            VSS.using([
                "WorkItemTracking/Scripts/Utils/NodeHelpers",
                "TFS/WorkItemTracking/RestClient",
                "TFS/WorkItemTracking/Contracts"
            ], (WITNodeHelpers: typeof _WITNodeHelpers,
                WITRestClient: typeof _WITRestClient,
                WITContracts: typeof _WITContracts) => {
                    const workItemTrackingClient: _WITRestClient.WorkItemTrackingHttpClient = VSS_Service.getClient(_WITRestClient.WorkItemTrackingHttpClient);

                    // Depth is passed as 25 which means the max depth of the tree structure that will be returned will not exceed 25.
                    workItemTrackingClient.getClassificationNode(project, WITContracts.TreeStructureGroup.Areas, undefined, 25)
                        .then((node:
                            _WITContracts.WorkItemClassificationNode) => {
                            resolve(WITNodeHelpers.NodeHelpers.mapClassificationNodesToLegacyNode(node));
                        }, reject);
                });
        });
    }
}
