import { ArtifactTypeNames, ToolNames } from "VSS/Artifacts/Constants";
import { RepositoryTypes } from "Build.Common/Scripts/Generated/TFS.Build2.Common";
import { BuildLinks } from "Build.Common/Scripts/Linking";
import { GitStatus } from "TFS/VersionControl/Contracts";
import { RepositoryContext, RepositoryType } from "VersionControl/Scripts/RepositoryContext";
import { LinkingUtilities } from "VSS/Artifacts/Services";
import * as Utils_Number from "VSS/Utils/Number";

export function getStringRepoType(type: RepositoryType): string {
    switch (type) {
        case RepositoryType.Git:
            return RepositoryTypes.TfsGit;
        case RepositoryType.GitHub:
            return RepositoryTypes.GitHub;
        case RepositoryType.Tfvc:
            return RepositoryTypes.TfsVersionControl;
        default:
            return undefined;
    }
}

export function convertArtifactUriToPublicUrl(statuses: GitStatus[],
    repositoryContext: RepositoryContext): GitStatus[] {
    if (!statuses || !repositoryContext) {
        return [];
    }

    for (const status of statuses) {
        status.targetUrl = convertArtifactUriToPublicBuildUrl(status.targetUrl, repositoryContext);
    }

    return statuses;
}

export function convertArtifactUriToPublicBuildUrl(uri: string, repositoryContext: RepositoryContext): string {
    if (uri && _isBuildArtifactUri(uri)) {
        const artifactId = LinkingUtilities.decodeUri(uri);
        const buildId = Utils_Number.parseInvariant(artifactId.id);
        return BuildLinks.getBuildDetailLink(buildId);
    }
    return uri;
}

function _isBuildArtifactUri(url: string): boolean {
    const vstfsUriPrefix = "VSTFS:";
    const uriSeparator = "/";

    url = url.trim().toUpperCase();

    const urlParts = url.split(uriSeparator, 6);
    const [prefix, , , tool, type, moniker] = urlParts;

    return prefix === vstfsUriPrefix &&
        tool === ToolNames.TeamBuild.toUpperCase() &&
        type === ArtifactTypeNames.Build.toUpperCase() &&
        !!moniker;
}
