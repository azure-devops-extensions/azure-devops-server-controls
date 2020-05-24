import { CodeHubContributionIds } from "VersionControl/Scripts/CodeHubContributionIds";
import { RepositoryContext, RepositoryType } from "VersionControl/Scripts/RepositoryContext";

/**
 * Returns the contribution Id for the changesets hub
 * @param repositoryContext
 */
export function getChangesetsHubContributionId(repositoryContext: RepositoryContext): string {
    let targetHubId: string;

    if (repositoryContext.getTfsContext().navigation.project) {
        targetHubId = CodeHubContributionIds.changesetsHub;
    } else {
        targetHubId = CodeHubContributionIds.collectionChangesetsHub;
    }

    return targetHubId;
}

/**
 * Returns the contribution Id for the changesets hub
 * @param repositoryContext
 */
export function getTfvcFilesHubContributionId(repositoryContext: RepositoryContext): string {
    let targetHubId: string;

    if (repositoryContext.getTfsContext().navigation.project) {
        targetHubId = CodeHubContributionIds.tfvcFilesHub;
    } else {
        targetHubId = CodeHubContributionIds.collectionTfvcFilesHub;
    }

    return targetHubId;
}

/**
 * Returns the contribution Id for the shelvesets hub
 * @param repositoryContext
 */
export function getShelvesetsHubContributionId(repositoryContext: RepositoryContext): string {
    let targetHubId: string;

    if (repositoryContext.getTfsContext().navigation.project) {
        targetHubId = CodeHubContributionIds.shelvesetsHub;
    } else {
        targetHubId = CodeHubContributionIds.collectionShelvesetsHub;
    }

    return targetHubId;
}

/**
 * Returns the contribution Id for the files hub, depending on the type of repository.
 * (null if no repsoitory context can be determined).
 */
export function getTargetFilesHubId(repositoryContext: RepositoryContext): string {
    if (!repositoryContext) {
        return null;
    }

    if (repositoryContext.getRepositoryType() === RepositoryType.Git) {
        return CodeHubContributionIds.gitFilesHub;
    } else {
        return getTfvcFilesHubContributionId(repositoryContext);
    }
}