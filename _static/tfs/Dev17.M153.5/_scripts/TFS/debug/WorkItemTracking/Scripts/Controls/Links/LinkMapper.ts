import { ArtifactTypeNames, ToolNames } from "VSS/Artifacts/Constants";
import { LinkingUtilities } from "VSS/Artifacts/Services";
import { publishErrorToTelemetry } from "VSS/Error";
import { isGuid, isEmptyGuid } from "VSS/Utils/String";
import { ILinkedArtifact } from "TFS/WorkItemTracking/ExtensionContracts";
import {
    Link,
    WorkItemStore,
    WorkItemLink,
    ExternalLink,
    Hyperlink,
    Attachment
} from "WorkItemTracking/Scripts/TFS.WorkItemTracking";
import { getRegisteredLinkName } from "WorkItemTracking/Scripts/TFS.WorkItemTracking.Linking.Utils";
import { createGitHubArtifactFromExternalLink } from "WorkItemTracking/Scripts/Utils/GitHubArtifactLink";

/** Represents a mapped work item link */
export interface IMappedLink {
    /** Original, WIT link */
    link: Link;

    /** WIT link mapped to a linked artifact */
    mappedLink: ILinkedArtifact;
}

/**
 * Mapper to map from WIT links to LinkedArtifacts to consumption by linked artifacts control
 */
export class LinkMapper {
    private _workItemStore: WorkItemStore;

    constructor(workItemStore: WorkItemStore) {
        this._workItemStore = workItemStore;
    }

    /**
     * Map given WIT links to Artifact links
     * @param links Links to map
     * @returns Mapped links
     */
    public mapLinks(links: Link[], filter: boolean = true): IMappedLink[] {
        if (!links) {
            return null;
        }

        let mappedLinks = links.map(link => {
            return <IMappedLink>{
                link: link,
                mappedLink: this._mapLink(link, filter)
            };
        });
        if (filter) {
            mappedLinks = mappedLinks.filter(l => !!l && !!l.mappedLink);
        }

        return mappedLinks;
    }

    protected _mapLink(link: Link, filter: boolean = true): ILinkedArtifact {
        if (filter && (link.isRemoved() || link.deleted)) {
            // Do not map removed or deleted links
            return null;
        }

        let linkedArtifact: ILinkedArtifact;

        if (link instanceof WorkItemLink) {
            linkedArtifact = this._mapWorkItemLink(link);
        } else if (link instanceof ExternalLink) {
            linkedArtifact = this._mapExternalLink(link);
        } else if (link instanceof Hyperlink) {
            linkedArtifact = this._mapHyperLink(link);
        } else if (link instanceof Attachment) {
            return null;
        } else {
            publishErrorToTelemetry(new Error("Unexpected link type encountered"));
        }

        if (!linkedArtifact) {
            publishErrorToTelemetry(new Error("Could not map link"));
            return null;
        }

        this._mapCommonData(link, linkedArtifact);

        return linkedArtifact;
    }

    private _mapWorkItemLink(link: WorkItemLink): ILinkedArtifact {
        const linkTypeEnd = this._workItemStore.findLinkTypeEnd(link.linkData.LinkType);
        const isDirectional = linkTypeEnd.linkType.isDirectional;

        let linkTypeRefName: string;
        if (isDirectional) {
            linkTypeRefName = linkTypeEnd.immutableName;
        } else {
            linkTypeRefName = linkTypeEnd.linkType.referenceName;
        }

        const linkedArtifact: ILinkedArtifact = {
            id: link.linkData.ID.toString(10),
            tool: ToolNames.WorkItemTracking,
            type: ArtifactTypeNames.WorkItem,
            linkType: linkTypeRefName,
            linkTypeDisplayName: linkTypeEnd.name,
            uri: LinkingUtilities.encodeUri({
                tool: ToolNames.WorkItemTracking,
                type: ArtifactTypeNames.WorkItem,
                id: link.linkData.ID.toString(10)
            }),
        };

        const remoteHostId = link.remoteHostId;
        if (remoteHostId && isGuid(remoteHostId) && !isEmptyGuid(remoteHostId)) {
            linkedArtifact.uri = LinkingUtilities.encodeUri({
                tool: `${ToolNames.RemoteWorkItemTracking} - ${remoteHostId}`,
                type: ArtifactTypeNames.WorkItem,
                id: link.linkData.ID.toString(10)
            });
            linkedArtifact.tool = ToolNames.RemoteWorkItemTracking;
            linkedArtifact.remoteHostId = remoteHostId;
            linkedArtifact.remoteProjectId = link.remoteProjectId;
            linkedArtifact.remoteHostUrl = link.remoteHostUrl;
            linkedArtifact.remoteHostName = link.remoteHostName;
            linkedArtifact.remoteStatus = link.remoteStatus;
        }

        return linkedArtifact;
    }

    private _mapExternalLink(link: ExternalLink): ILinkedArtifact {
        return createGitHubArtifactFromExternalLink(link);
    }

    private _mapHyperLink(link: Hyperlink): ILinkedArtifact {
        return {
            comment: link.getComment(),
            id: link.getLocation(),
            linkType: link.getArtifactLinkType(),
            linkTypeDisplayName: getRegisteredLinkName(link.getArtifactLinkType(), link.workItem.store),
            tool: ToolNames.Hyperlink,
            type: link.getArtifactLinkType(),
            uri: link.getLocation()
        };
    }

    protected _mapCommonData(link: Link, linkedArtifact: ILinkedArtifact) {
        linkedArtifact.comment = link.getComment();
    }
}
