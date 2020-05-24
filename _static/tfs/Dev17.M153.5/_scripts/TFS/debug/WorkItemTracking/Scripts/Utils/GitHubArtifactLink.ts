import { ToolNames } from "VSS/Artifacts/Constants";
import { LinkingUtilities, IArtifactData } from "VSS/Artifacts/Services";
import { IExternalLinkedArtifact, ILinkedArtifact } from "TFS/WorkItemTracking/ExtensionContracts";
import { ExternalLink } from "WorkItemTracking/Scripts/TFS.WorkItemTracking";
import { getRegisteredLinkName } from "WorkItemTracking/Scripts/TFS.WorkItemTracking.Linking.Utils";
import { publishErrorToTelemetry } from "VSS/Error";

/**
 * Creates GitHub artifact url from the github context.
 * Example: vstfs:///GitHub/{PullRequest|Commit|Issue}/{{repoInternalId}/{SHA|number}}
 * 
 * @param tool Artifact tool name
 * @param type Artifact type name
 * @param gitHubExtLinkContext GitHub external link context
 */
export function createGitHubArtifactUrlFromContext(tool: string, type: string, gitHubExtLinkContext: IExternalLinkedArtifact): string {
    return LinkingUtilities.encodeUri({
        tool: tool,
        type: type,
        id: [
            gitHubExtLinkContext.repoInternalId,
            gitHubExtLinkContext.numberOrSHA
        ].join(LinkingUtilities.URI_SEPARATOR)
    });
}

/**
 * Creates GitHub artifact link with github context from an external link
 * 
 * @param link External link data from work item
 */
export function createGitHubArtifactFromExternalLink(link: ExternalLink): ILinkedArtifact {
    try {
        const artifactData: IArtifactData = LinkingUtilities.decodeUri(link.linkData.FilePath);
        const externalLinkedArtifactContext: IExternalLinkedArtifact =
            link.linkData.externalLinkContext || _getExternalLinkContextFromArtifact(artifactData);

        return {
            comment: link.getComment(),
            id: artifactData.id,
            tool: artifactData.tool,
            type: artifactData.type,
            uri: artifactData.uri,
            linkType: link.getArtifactLinkType(),
            linkTypeDisplayName: getRegisteredLinkName(link.getArtifactLinkType(), link.workItem.store),
            externalLinkedArtifactContext: externalLinkedArtifactContext
        };
    }
    catch {
        publishErrorToTelemetry(new Error(`Invalid artifact link: ${link.linkData.FilePath} `));
        return null;
    }
}

/**
 * Get github external link context from artifact link data.
 * 
 * @param artifactData Artifact data
 */
function _getExternalLinkContextFromArtifact(artifactData: IArtifactData): IExternalLinkedArtifact | undefined {
    if (artifactData.tool !== ToolNames.GitHub) {
        return undefined;
    }

    const artifactId = artifactData.id;
    const artifactIdParts = artifactId.split(LinkingUtilities.URI_SEPARATOR);

    if (!artifactIdParts || artifactIdParts.length < 2) {
        return undefined;
    }

    const [repoInternalId, numberOrSHA] = artifactId.split(LinkingUtilities.URI_SEPARATOR);
    return {
        itemType: artifactData.type,
        repoInternalId: repoInternalId,
        numberOrSHA: numberOrSHA
    } as IExternalLinkedArtifact;
}