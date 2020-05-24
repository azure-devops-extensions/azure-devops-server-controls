/// <reference types="jquery" />

import VSS = require("VSS/VSS");
import VSS_Service = require("VSS/Service");
import Contribution_Services = require("VSS/Contributions/Services");
import SDK_Shim = require("VSS/SDK/Shim");
import Context = require("VSS/Context");
import TFS_Service = require("Presentation/Scripts/TFS/TFS.Service");
import Platform_VersionControl_Services = require("TFS/VersionControl/Services");
import VCCreateBranchWithLinkedWorkItems_NO_REQUIRE = require("VersionControl/Scripts/CreateBranchWithLinkedWorkItems");
import Q = require("q");
import LicenseConstants = require("Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants");

(function () {
    let pageContext = Context.getPageContext();

    let contribution = VSS_Service.getService(Contribution_Services.WebPageDataService).getPageData("ms.vss-code-web.supports-git-data-provider");
    let isGitSupported = contribution && contribution['isSupported'];

    if (isGitSupported) {
        SDK_Shim.VSS.register(Platform_VersionControl_Services.VersionControlActionService.fullyQualifiedContributionId, (context) => {
            return VSS_Service.getCollectionService(VersionControlActionService, (context || {}).webContext);
        });

        // Relative path for work item delete menu (Remove after M102 is deployed to all SUs)
        SDK_Shim.VSS.register(Platform_VersionControl_Services.VersionControlActionService.contributionId, (context) => {
            return VSS_Service.getCollectionService(VersionControlActionService, (context || {}).webContext);
        });
    }
} ());

/** Version control action service implementation */
export class VersionControlActionService extends TFS_Service.TfsService implements Platform_VersionControl_Services.IVersionControlActionService {
    /** Launches create branch dialog
    * @param workItemIds The work item ids to link to the newly created branch
    * @param project The Project Name to open the dialog for
    * @param projectId The Project ID/Guid to open the dialog for
    */
    public beginLaunchCreateBranchDialog(workItemIds: number[], project?: string, projectId?: string): IPromise<void> {
        let deferred = Q.defer<void>();
        VSS.using(["VersionControl/Scripts/CreateBranchWithLinkedWorkItems"], (VCCreateBranchWithLinkedWorkItems: typeof VCCreateBranchWithLinkedWorkItems_NO_REQUIRE) => {
            VCCreateBranchWithLinkedWorkItems.openCreateBranchDialog(workItemIds, Platform_VersionControl_Services.VersionControlActionService.fullyQualifiedContributionId, project, projectId);
            deferred.resolve(null);
        });
        return deferred.promise;
    }

    public requiredFeaturesForActions: string[] = [LicenseConstants.LicenseFeatureIds.Code];
}

VSS.tfsModuleLoaded("TFS.VersionControl.ActionServices", exports);
