///<amd-dependency path="jQueryUI/droppable"/>
///<reference types="jquery" />
import * as Service from "VSS/Service";
import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";
import { FeatureAvailabilityFlags } from "Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants";
import { WebPageDataService } from "VSS/Contributions/Services";
import TFS_FeatureLicenseService = require("Presentation/Scripts/TFS/TFS.FeatureLicenseService");
import ServerConstants = require("Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants");

export const BACKLOGPERMISSION_DATAPROVIDER_ID: string = "ms.vss-work-web.backlog-permission-data-provider";

export interface IAdvanceBacklogManagementPermission {
    hasPermission: boolean
}

export function hasAgileToolsBacklogManagementPermission(): boolean {
    const pageDataService = Service.getService(WebPageDataService);
    let permissionData = pageDataService.getPageData<IAdvanceBacklogManagementPermission>(BACKLOGPERMISSION_DATAPROVIDER_ID);
    return !!permissionData ? permissionData.hasPermission : false;
}

export function haveBacklogManagementPermission(): boolean {
    if (FeatureAvailabilityService.isFeatureEnabled(FeatureAvailabilityFlags.EnableBacklogManagementPermission)) {
        return hasAgileToolsBacklogManagementPermission()
    }
    else {
        return TFS_FeatureLicenseService.FeatureLicenseService.isFeatureActive(ServerConstants.LicenseFeatureIds.AdvancedBacklogManagement);
    }
}