import * as Context from "VSS/Context";
import * as Contributions_Contracts from "VSS/Contributions/Contracts";
import * as Contracts from "Search/Scenarios/ExtensionStatus/Contracts";
import * as String from "VSS/Utils/String";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";

export var DefaultServiceDataKey = "ms.vss-extmgmt-web.manageExtensions-collection-data-provider";
export var emsServiceInstanceId = "00000028-0000-8888-8000-000000000000";
export var galleryServiceInstanceId = "00000029-0000-8888-8000-000000000000";

export interface IExtensionDetail {
    extensionId: string;
    publisherId: string;
    extensionName: string;
    userHasRequestedExtension: boolean;
    userHasManageExtensionPermission: boolean;
    isExtensionDisabled: boolean;
    extensionMarketplaceUrl: string;
    extensionDetailUrl: string;
}

module ExtensionManagementPermissions {
    export var ReadExtensions = 1;
    export var ManageExtensions = 2;
    export var ManageSecurity = 4;
}

module ExtensionManagementPermissionNames {
    /**
    * The permission to manage (add, update, delete) extensions
    */
    export var ManageExtensions = "manageExtensions";
    /**
    * The permission to manage security.
    */
    export var ManageSecurity = "manageSecurity";
}

export function createExtensionIdentifier(publisherName: string, extensionName: string): string {
    return publisherName + "." + extensionName;
}

function getTargetIdQueryParameter() {
    const hostId = Context.getDefaultWebContext().collection.id;
    return "targetId=" + hostId;
}

export function getManageExtensionsUrl(): string {
    const tfsContext = TfsContext.getDefault();
    return (tfsContext.navigation.serviceHost.uri + "_settings/extensions?tab=Manage&status=active");
}

export function updateExtensionStatus(extensionDetail:IExtensionDetail, allExtensionsData:Contracts.ExtensionManagementDefaultServiceData): IExtensionDetail {
    const userId = Context.getDefaultWebContext().user.id,
          publisherName = extensionDetail.publisherId,
          extensionName = extensionDetail.extensionId,
          extensionQualifier = encodeURIComponent(createExtensionIdentifier(publisherName, extensionName)),
          targetIdQueryParameter = getTargetIdQueryParameter(),
          marketplaceUrl = allExtensionsData.marketplaceUrl,
          marketplaeUrlSourceParam = "&utm_source=vstsproduct&utm_medium=SearchExtStatus";

    let reqExt = allExtensionsData.requestedExtensions
        .filter(r=> (r.publisherName === publisherName && r.extensionName === extensionName) && isRequestedByMe(r, userId));
    extensionDetail.userHasRequestedExtension = (reqExt != null && reqExt.length > 0);

    let extension = allExtensionsData.installedExtensions
        .filter(r=> (r.publisherId === publisherName && r.extensionId === extensionName));
    extensionDetail.isExtensionDisabled = extension != null && extension.length > 0 && (extension[0].installState.flags & Contributions_Contracts.ExtensionStateFlags.Disabled) > 0;

    extensionDetail.userHasManageExtensionPermission = allExtensionsData.userPermissions && allExtensionsData.userPermissions[ExtensionManagementPermissionNames.ManageExtensions] === true;
    extensionDetail.extensionMarketplaceUrl = String.format("{0}acquisition?itemName={1}&{2}{3}", marketplaceUrl, extensionQualifier, targetIdQueryParameter, marketplaeUrlSourceParam);
    extensionDetail.extensionDetailUrl = String.format("{0}items?itemName={1}&{2}{3}", marketplaceUrl, extensionQualifier, targetIdQueryParameter, marketplaeUrlSourceParam);
    return extensionDetail;
}

function isRequestedByMe(requested: Contributions_Contracts.RequestedExtension, userId: string): boolean {
    // Check whether this extension is requested by me
    if (requested &&
        requested.extensionRequests.some((req) => (!req.requestedBy || req.requestedBy.id === userId))) {
        return true;
    }
    return false;
}