import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";

import { getLocalService, ILocalService } from "VSS/Service";

export class CINavigationService implements ILocalService {
    public getProjectId() {
        const tfsContext = TfsContext.getDefault();
        return tfsContext.navigation.projectId;
    }
}

export function getCINavigationService(): CINavigationService {
    return getLocalService(CINavigationService);
}