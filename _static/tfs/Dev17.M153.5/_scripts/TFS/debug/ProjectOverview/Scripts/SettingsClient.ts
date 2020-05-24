import * as VSS_Service from "VSS/Service";
import { errorHandler } from "VSS/VSS";
import { SettingsHttpClient } from "VSS/Settings/RestClient";
import { RepositoryContext, RepositoryType } from "VersionControl/Scripts/RepositoryContext";
import { getTfvcRepositoryName } from "ProjectOverview/Scripts/Utils";
import * as TelemetryClient from "ProjectOverview/Scripts/TelemetryClient";
import * as ProjectOverviewContracts from "ProjectOverview/Scripts/Generated/Contracts";
import { ProjectOverviewConstants } from "ProjectOverview/Scripts/Generated/Constants";

export class SettingsClient {
    private static client = VSS_Service.getClient(SettingsHttpClient);

    public static saveReadmeRepository(repositoryContext: RepositoryContext, isWikiHomePage?: boolean) {
        let entries: IDictionaryStringTo<string> = {};
        let isGit = repositoryContext.getRepositoryType() === RepositoryType.Git;
        let projectId = repositoryContext.getTfsContext().contextData.project.id;
        let collectionId = repositoryContext.getTfsContext().contextData.collection.id;
        let settings: string;
        if (isGit) {
            settings = isWikiHomePage
                ? ProjectOverviewConstants.WikiHomePage + ":" + repositoryContext.getRepositoryId()
                : repositoryContext.getRepositoryId();
        } else {
            settings = getTfvcRepositoryName(repositoryContext.getTfsContext());
        }
        entries[ProjectOverviewConstants.ProjectDefaultRepoRegistryPath] = settings;
        SettingsClient.client.setEntriesForScope(entries, "host", "project", projectId).then(
            () => {
                TelemetryClient.publishReadmeRepositoryChanged({
                    ProjectId: projectId,
                    CollectionId: collectionId,
                    DisplayContent: isWikiHomePage ? ProjectOverviewConstants.WikiHomePage : ProjectOverviewConstants.ReadmeFilePath
                });
            },
            (error) => {
                TelemetryClient.publishReadmeRepositoryChangeFailed({ ProjectId: projectId, CollectionId: collectionId });
                errorHandler.show(error);
            });
    }

    public static saveDismissedUpsells(projectId: string, currentDismissedUpsells: IDictionaryNumberTo<boolean>): void {
        var entries: IDictionaryStringTo<IDictionaryNumberTo<boolean>> = {};
        entries[ProjectOverviewConstants.DismissedUpsellPath] = currentDismissedUpsells;
        SettingsClient.client.setEntriesForScope(entries, "me", "project", projectId);
    }

    public static invalidateProjectMembers(projectId: string): void {
        SettingsClient.client.removeEntriesForScope("host", "project", projectId, ProjectOverviewConstants.ProjectMembers_MembersRegistryPath)
    }
}