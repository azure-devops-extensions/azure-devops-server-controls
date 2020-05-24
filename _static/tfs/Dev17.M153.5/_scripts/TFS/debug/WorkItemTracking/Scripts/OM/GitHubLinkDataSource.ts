import { getDefaultWebContext } from "VSS/Context";
import { WebPageDataService } from "VSS/Contributions/Services";
import { publishErrorToTelemetry } from "VSS/Error";
import { getService } from "VSS/Service";
import { IExternalLinkedArtifact } from "TFS/WorkItemTracking/ExtensionContracts";

const GitHubLinkDataProvider = "ms.vss-work-web.github-link-data-provider";

export interface IGitHubLinkItemIdentifier {
    /**
     * GitHub item type. (e.g. Pull, Issue or Commit)
     */
    itemType: string;

    /**
     * GitHub item internal repository Guid
     */
    repoInternalId: string;

    /**
     * GitHub item number (PR or Issue) or SHA (Commit)
     */
    numberOrSHA: string;
}

interface IGitHubLinkItems {
    resolvedLinkItems: IExternalLinkedArtifact[];
}

async function _getGitHubLinkData(properties: { urls: string[] } | { identifiers: IGitHubLinkItemIdentifier[] }, workItemId: string | null): Promise<IExternalLinkedArtifact[]> {
    try {
        const propertiesWithWorkItemId = {
            ...properties,
            workItemId: workItemId
        }
        const gitHubLinkItems: IGitHubLinkItems = await getService(WebPageDataService, getDefaultWebContext())
            .getDataAsync<IGitHubLinkItems>(GitHubLinkDataProvider, null, propertiesWithWorkItemId);
        return gitHubLinkItems && gitHubLinkItems.resolvedLinkItems && gitHubLinkItems.resolvedLinkItems.length > 0 ?
            gitHubLinkItems.resolvedLinkItems : [];
    } catch (ex) {
        publishErrorToTelemetry(ex);
        return [];
    }
}

export function resolveGitHubUrls(urls: string[], workItemId: number | null): Promise<IExternalLinkedArtifact[]> {
    const properties = { urls: urls };
    return _getGitHubLinkData(properties, workItemId && workItemId.toString());
}


export function resolveGitHubItems(itemIdentifiers: IGitHubLinkItemIdentifier[], workItemId: string | null): Promise<IExternalLinkedArtifact[]> {
    const properties = { identifiers: itemIdentifiers };
    return _getGitHubLinkData(properties, workItemId);
}
