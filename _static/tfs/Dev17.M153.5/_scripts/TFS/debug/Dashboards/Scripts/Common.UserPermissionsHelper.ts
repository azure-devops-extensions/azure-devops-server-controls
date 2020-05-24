import * as TFS_Dashboards_Constants from "Dashboards/Scripts/Generated/Constants";
import {WebPageDataService} from "VSS/Contributions/Services";
import * as VSS_Service from "VSS/Service";
import * as UserClaimsService from "VSS/User/Services";
import { getFromPage } from "Dashboards/Scripts/Common.PageHelpers";
import TFS_Dashboards_Contracts = require("TFS/Dashboards/Contracts");

export class Utils {
    public static isStakeholder(): boolean {
        /**
         * Returns a boolean that represents whether or not current user has a stakeholder license
         */
        return getFromPage<boolean>(
            TFS_Dashboards_Constants.DashboardPageDataProviderKeys.IsStakeholder,
            TFS_Dashboards_Constants.JsonIslandDomClassNames.IsStakeholder);
    }
}

interface WrappedValue {
    value: number;
}

export function getDashboardsPrivilegesFromWebPageData(): number {
    let webPageDataSvc = VSS_Service.getService(WebPageDataService);
    let teamContextData: WrappedValue = webPageDataSvc.getPageData<WrappedValue>(TFS_Dashboards_Constants.DashboardProviderPropertyBagNames.TeamContextData);
    let permissions = (teamContextData != null) ? teamContextData.value : 0;

    return permissions;
}

export function getTeamPermissions(): TFS_Dashboards_Contracts.TeamDashboardPermission {
    return getDashboardsPrivilegesFromWebPageData() as TFS_Dashboards_Contracts.TeamDashboardPermission;
}

export function isDashboardsPrivilegesLoaded(): boolean {
    var permission = getDashboardsPrivilegesFromWebPageData();
    return permission != null || permission > 0;
}

export function CanReadDashboards(): boolean {
    return HasModernRead() || HasModernManagePermissions();
}

export function CanCreateDashboards(): boolean {
    return HasModernCreate() || HasModernManagePermissions();
}

export function CanEditDashboard(): boolean {
    return HasModernEdit() || HasModernManagePermissions();
}

export function CanDeleteDashboards(): boolean {
    return HasModernDelete() || HasModernManagePermissions();
}

export function CanManagePermissionsForDashboards(): boolean {
    return HasModernManagePermissions();
}

export function canSeeActions(): boolean {
    return UserClaimsService.getService().hasClaim(UserClaimsService.UserClaims.Member);
}

function HasModernRead(): boolean {
    return (getDashboardsPrivilegesFromWebPageData() & TFS_Dashboards_Constants.DashboardsPermissions.Read) !== 0;
}

function HasModernCreate(): boolean {
    return (getDashboardsPrivilegesFromWebPageData() & TFS_Dashboards_Constants.DashboardsPermissions.Create) !== 0;
}

function HasModernEdit(): boolean {
    return (getDashboardsPrivilegesFromWebPageData() & TFS_Dashboards_Constants.DashboardsPermissions.Edit) !== 0;
}

function HasModernDelete(): boolean {
    return (getDashboardsPrivilegesFromWebPageData() & TFS_Dashboards_Constants.DashboardsPermissions.Delete) !== 0;
}

function HasModernManagePermissions(): boolean {
    return (getDashboardsPrivilegesFromWebPageData() & TFS_Dashboards_Constants.DashboardsPermissions.ManagePermissions) !== 0;
}
