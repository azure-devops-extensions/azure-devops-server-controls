import Telemetry = require("VSS/Telemetry/Services");
import * as CustomerIntelligenceConstants from "VersionControl/Scripts/CustomerIntelligenceConstants";
import VCSpecs = require("VersionControl/Scripts/TFS.VersionControl.VersionSpecs");
import GitUIService = require("VersionControl/Scripts/Services/GitUIService");

// Open the create branch dialog and show the given work items to link. After submitting
// the dialog, the selected work items will be linked to the newly created branch
// and the user will be redirected to the explorer page under the context of that branch
export function openCreateBranchDialog(workItemIds: number[], openedFrom?: string, currentProjectName?: string, currentProjectGuid?: string, movedToNewProject?: boolean) {

    // Telemetry - Record when the create branch menu was opened, what contribution point was used, and whether
    // there were multiple selected work items
    const executedEvent = new Telemetry.TelemetryEventData(
        CustomerIntelligenceConstants.VERSION_CONTROL_AREA,
        CustomerIntelligenceConstants.CREATE_BRANCH_MENU_EXECUTED, {
            "ContributionPoint": (openedFrom || "non-contribution-point"),
            "MultipleItemsSelected": (workItemIds && workItemIds.length > 1)
        });
    Telemetry.publishEvent(executedEvent);

    /*
     * Uncomment and add the createBranch call to the end (inside) this rest call to re-enable
     * the automatic filling out of the branch name in the dialog.
     *
    witClient.getWorkItems(workItemIds, ["System.Id", "System.Title", "System.WorkItemType"]).then(
        (workItems: TFS_Contracts.WorkItem[]) => {
            var workItemId: number = workItems[0].fields["System.Id"];
            var workItemTitle: string = workItems[0].fields["System.Title"].replace(/\W/g, " ");
            var workItemType: string = workItems[0].fields["System.WorkItemType"].split(" ");

            var branchName: string = workItemType[workItemType.length-1] + workItemId + "-" + workItemTitle;

            // trim space, spaces to dashes, make lowercase
            branchName = $.trim(branchName).split(/\s+/).join("-").toLocaleLowerCase(); 
            
            // trim branch name to last space before charLimit
            var charLimit = 30;

            if (branchName.length > charLimit) {
                var branchNameArr = branchName.substr(0, charLimit+1).split("-");
                branchNameArr.pop();
                branchName = branchNameArr.join("-");
            }
        });
    */

    // Remove these when adding the previous block back in
    const branchName = "";
    const workItemTitle = "";

    const uiService = GitUIService.getGitUIService(null);
    const branchCreateOptions = <GitUIService.ICreateBranchOptions>{
        suggestedFriendlyName: branchName,
        suggestedWorkItemsIds: workItemIds,
        suggestedProjectName: currentProjectName,
        suggestedProjectId: currentProjectGuid
    }

    // create branch and create work item links
    uiService.createBranch(branchCreateOptions).then(branchCreateResult => {
        if (branchCreateResult.cancelled) {
            return;
        }

        // Telemetry - Record when a branch is actually created with this menu, whether a different name was chosen than we provided, at contribution point was used, and whether
        // there were multiple selected work items
        const createdEvent = new Telemetry.TelemetryEventData(
            CustomerIntelligenceConstants.VERSION_CONTROL_AREA,
            CustomerIntelligenceConstants.CREATE_BRANCH_MENU_CREATED, {
                "NameChangedFromOriginal": (workItemTitle !== branchCreateResult.selectedFriendlyName),
                "NameChosenHasSlashes": (branchCreateResult.selectedFriendlyName.indexOf("/") >= 0),
                "MoreThanOneItemLinked": (branchCreateResult.selectedWorkItemsIds.length > 1),
                "MoreThanTwoItemsLinked": (branchCreateResult.selectedWorkItemsIds.length > 2)
            });
        Telemetry.publishEvent(createdEvent, true);

        // handle WIT linking errors if any
        if (branchCreateResult.error !== undefined) {
            // handle errors for workitem linking, 
            // errors for branch creation are handled internally by dialog
            uiService.navigateToBranch(branchCreateResult, null);
        }

        if (!movedToNewProject) {
            uiService.navigateToBranch(branchCreateResult, currentProjectName);
        }
    });
}
