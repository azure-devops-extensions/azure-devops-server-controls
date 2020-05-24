import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";

import * as RepositoryOverviewContracts from "RepositoryOverview/Scripts/Generated/Contracts";

export function IsTfvcRepository(repositoryData: RepositoryOverviewContracts.RepositoryOverviewData): boolean {
    if (repositoryData.id === TfsContext.getDefault().contextData.project.id) {
        return true;
    }

    return false;
}