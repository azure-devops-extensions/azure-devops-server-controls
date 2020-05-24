import TFSWorkItemTrackingConstants = require("Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants");

import * as VCContracts from "TFS/VersionControl/Contracts";
import * as WITContracts from "TFS/WorkItemTracking/Contracts";

export function getAssociatedWorkItems(workItems: WITContracts.WorkItem[]): VCContracts.AssociatedWorkItem[] {
    let associatedWorkItems: VCContracts.AssociatedWorkItem[] = [];
    workItems.forEach((workItem: WITContracts.WorkItem, index: number) => {
        let associatedWorkItem: VCContracts.AssociatedWorkItem = <VCContracts.AssociatedWorkItem>{};
        for (const field in workItem.fields) {
            const value =workItem.fields[field];
            switch (field) {
                case TFSWorkItemTrackingConstants.CoreFieldRefNames.AssignedTo:
                    associatedWorkItem.assignedTo = value;
                    break;
                case TFSWorkItemTrackingConstants.CoreFieldRefNames.State:
                    associatedWorkItem.state = value;
                    break;
                case TFSWorkItemTrackingConstants.CoreFieldRefNames.Title:
                    associatedWorkItem.title = value;
                    break;
                case TFSWorkItemTrackingConstants.CoreFieldRefNames.WorkItemType:
                    associatedWorkItem.workItemType = value;
                    break;
                default:
                    break;
            }
        }
        associatedWorkItem.url = workItem.url;
        associatedWorkItem.id = workItem.id;
        associatedWorkItems.push(associatedWorkItem);
    });

    return associatedWorkItems;
}