import { Identity } from "VSS/Identities/Contracts";
import * as Service from "VSS/Service";

import { HubWebPageDataService } from "Package/Scripts/DataServices/WebPageDataService";
import { FeedPermission, FeedRole } from "Package/Scripts/WebApi/VSS.Feed.Contracts";

/**
 * Gets Adds to the Contributors role the following identities, if they're not already present:
 *  1. Project Collection Build Service (isCollectionScope)
 *  2. Project Build Service (!isCollectionScope)
 */
export function GetScopedBuildPermission(isCollectionScope: boolean): FeedPermission {
    const webPageDataService = Service.getLocalService(HubWebPageDataService);
    const identity: Identity = isCollectionScope
        ? webPageDataService.getCollectionBuildIdentity()
        : webPageDataService.getProjectBuildIdentity();

    return {
        identityId: identity.id,
        identityDescriptor: identity.descriptor,
        displayName: identity.customDisplayName,
        role: FeedRole.Contributor
    };
}
