import * as Settings_RestClient from "VSS/Settings/RestClient";
import { getService as getSettingsService, ISettingsService, SettingsUserScope } from "VSS/Settings/Services";
import { RepositoryContext } from "VersionControl/Scripts/RepositoryContext";

const userDefaultBranchSettingPath = "Git/DefaultUserBranch";

export function setUserDefaultBranchSetting(defaultBranchName: string, repositoryContext: RepositoryContext): void {
    if (defaultBranchName) {
        const settingsService: ISettingsService = getSettingsService();
        const entries: IDictionaryStringTo<any> = {};
        entries[userDefaultBranchSettingPath] = defaultBranchName;
        settingsService.setEntries(entries, SettingsUserScope.Me, "Repository", repositoryContext.getRepositoryId());
    }
}