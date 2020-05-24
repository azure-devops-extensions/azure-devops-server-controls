import * as Service from "VSS/Service";
import { LocalSettingsService, LocalSettingsScope } from "VSS/Settings";

import { GitRepositoryContext } from "VersionControl/Scripts/GitRepositoryContext";

const localSettingsService = Service.getLocalService(LocalSettingsService);
const scope = LocalSettingsScope.Project;

export function readCompareBranchLocally(repositoryId: string): string {
    return localSettingsService.read(getCompareBranchKey(repositoryId), undefined, scope);
}

export function saveCompareBranchLocally(repositoryId: string, compareBranchName: string) {
    localSettingsService.write(getCompareBranchKey(repositoryId), compareBranchName, scope);
}

function getCompareBranchKey(repositoryId: string) {
    return `BranchCompareForRepo.${repositoryId}`;
}
