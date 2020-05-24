import Service = require("VSS/Service");
import SecurityService = require("VSS/Security/Services");
import Utils_String = require("VSS/Utils/String");
import * as TFS_Host_TfsContext from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import * as UserClaimsService from "VSS/User/Services";
import { getSharedData } from "VSS/Contributions/LocalPageData";

export class PermissionUtils {

	public static isMember(): boolean {
		const claimService: UserClaimsService.IUserClaimsService = UserClaimsService.getService();
		return claimService.hasClaim(UserClaimsService.UserClaims.Member);
	}

    public static isWorkServiceEnabled(): boolean {
        const workItemService = "ms.vss-work.agile";
        const sharedFeatures = getSharedData<IDictionaryStringTo<boolean>>("_features");
        if (sharedFeatures && sharedFeatures[workItemService] !== undefined) {
            return sharedFeatures[workItemService];
        }

        // if feature is not present page data assume work service is enabled since we do not want to disable if we are not able to pass the shared data
        return true;
    }

	public static hasCreateWorkItemPermission(projectId: string): boolean {
        //return this._hasPermission(this._workItemHubSecurityNamespace, this._getCreateWorkItemSecurityToken(projectId), 1);
        return this.isMember() && this.isWorkServiceEnabled();
	}

	public static hasTestManagementUserSettingsPermission(projectId: string): boolean {
		//return this._hasPermission(this._testManagementSecurityNamespace, this._getTestManagementUserSettingsSecurityToken(projectId), 1);
		return this.isMember();
	}

    public static hasPublishResultPermission(projectId: string): boolean {
        let securityToken: string = `$PROJECT:vstfs:///Classification/TeamProject/${projectId}:`;
        return this._hasPermission(this._tfsSecurityNamespace, securityToken, 8);
	}

	private static _getCreateWorkItemSecurityToken(projectId: string) {
		return Utils_String.format("/WorkItemsHub/{0}/NewWorkItem", projectId);
	}

	private static _getTestManagementUserSettingsSecurityToken(projectId: string) {
		return Utils_String.format("/TestManagement/{0}/TestManagementUserSettings", projectId);
	}

	private static _hasPermission(securityNamespaceId: string, securityToken: string, requestedPermission: number): boolean {
		const securityService = Service.getLocalService(SecurityService.SecurityService);
		if (securityService.isPermissionIncluded(securityNamespaceId, securityToken)) {
			return securityService.hasPermission(securityNamespaceId, securityToken, requestedPermission)
		}
		else {
			// Incase permission is not passed from server we return true.
			return true;
		}
	}


	private static _workItemHubSecurityNamespace = "c0e7a722-1cad-4ae6-b340-a8467501e7ce";
	private static _testManagementSecurityNamespace = "e06e1c24-e93d-4e4a-908a-7d951187b483";
	private static _tfsSecurityNamespace = "52d39943-cb85-4d7f-8fa8-c6baac873819";
}