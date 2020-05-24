import VSS = require("VSS/VSS");
import VSS_Service = require("VSS/Service");
import Contribution_Services = require("VSS/Contributions/Services");
import SDK_Shim = require("VSS/SDK/Shim");
import Context = require("VSS/Context");
import ServerConstants = require("Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants");

import VCCreateBranchWithLinkedWorkItems_Async = require("VersionControl/Scripts/CreateBranchWithLinkedWorkItems");

(function () {
    const shortItemContributionId = "create-branch-menu";
    const fullyQualifiedItemContributionId = "ms.vss-code-web." + shortItemContributionId;
    const supportsGitContributionId = "ms.vss-code-web.supports-git-data-provider";

    let pageContext = Context.getPageContext();
    
    let contribution = VSS_Service.getService(Contribution_Services.WebPageDataService).getPageData(supportsGitContributionId);
    let isGitSupported = contribution && contribution['isSupported'];

    if (isGitSupported) {
        SDK_Shim.VSS.register(shortItemContributionId, { execute: onCreateBranchMenuItemClick });
        SDK_Shim.VSS.register(fullyQualifiedItemContributionId, { execute: onCreateBranchMenuItemClick });
    }
} ());

export function onCreateBranchMenuItemClick(actionContext: any): void {
    let pageContext = Context.getPageContext();

    // extract selected work item ids depending on which contribution point
    let workItemIds = actionContext.ids                                                                // work items on queries view
        || actionContext.workItemIds                                                                   // work items on backlog view
        || (actionContext.workItemAvailable && actionContext.workItemId && [actionContext.workItemId]) // work item toolbar
        || (actionContext.id && [actionContext.id]);                                                   // work items on board view 

    let contributionPoint = actionContext.workItemAvailable ? "item." : "";
    contributionPoint += pageContext.navigation.currentController + "." + pageContext.navigation.currentAction;

    VSS.requireModules(["VersionControl/Scripts/CreateBranchWithLinkedWorkItems"]).spread((VCCreateBranchWithLinkedWorkItems: typeof VCCreateBranchWithLinkedWorkItems_Async) => {
        VCCreateBranchWithLinkedWorkItems.openCreateBranchDialog(
            workItemIds, contributionPoint, actionContext.currentProjectName, actionContext.currentProjectGuid, actionContext.movedToNewProject);
    }); 
}

VSS.tfsModuleLoaded("TFS.VersionControl.CreateBranchContextMenu", exports);