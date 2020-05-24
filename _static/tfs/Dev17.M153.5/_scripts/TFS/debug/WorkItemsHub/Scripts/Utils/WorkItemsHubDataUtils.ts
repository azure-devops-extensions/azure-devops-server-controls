import { WorkItemsHubProcessData } from "WorkItemsHub/Scripts/Generated/Contracts";
import * as Utils_String from "VSS/Utils/String";
import * as WITResources from "WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking";
import { CoreFieldRefNames } from "Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants";


export function getFieldFriendlyName(fieldReferenceName: string, hubProcessData: WorkItemsHubProcessData): string {
    if (hubProcessData.fieldReferenceNames) {

        // Hack to show 'Comments' instead of 'Comment Count'
        if (Utils_String.equals(fieldReferenceName, CoreFieldRefNames.CommentCount, true)) {
            return WITResources.WorkItemsHubComments;
        }

        const index = hubProcessData.fieldReferenceNames.indexOf(fieldReferenceName);
        if (index >= 0) {
            return hubProcessData.fieldFriendlyNames[index];
        }
    }

    return fieldReferenceName;
}
