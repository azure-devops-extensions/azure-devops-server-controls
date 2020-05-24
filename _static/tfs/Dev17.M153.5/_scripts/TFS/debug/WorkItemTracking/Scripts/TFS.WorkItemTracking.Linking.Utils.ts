import Utils_String = require("VSS/Utils/String");
import WITOM = require("WorkItemTracking/Scripts/TFS.WorkItemTracking");
import { LinkDirection, TopologyOptions, TopologyType } from "WorkItemTracking/Scripts/Controls/LinksVisualization/Interfaces";
import { RegisteredLinkTypeNames } from "WorkItemTracking/Scripts/RegisteredLinkTypeNames";
import Artifacts_Constants = require("VSS/Artifacts/Constants");
import Resources = require("WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking");

export const ACTIONS_LINK_TO_EXISTING = "link-to-existing";
export const ACTIONS_LINK_TO_NEW = "link-to-new";

export const DefaultTopologyOptions: TopologyOptions = {
    topology: TopologyType.Tree,
    linkDirection: LinkDirection.Forward
};

export function getRegisteredLinkName(linkType: string, store): string {
    /// <summary>Gets the display name of the specified registered link type</summary>
    /// <param name="linkType" type="String">Link type to get the display name</param>
    /// <returns type="String" />
    let name;
    switch (linkType) {
        case RegisteredLinkTypeNames.Related:
            name = Resources.LinksControlRelatedText;
            break;
        case RegisteredLinkTypeNames.Hyperlink:
            name = Resources.LinksControlHyperlinkText;
            break;
        case RegisteredLinkTypeNames.Changeset:
            name = Resources.LinksControlChangesetText;
            break;
        case RegisteredLinkTypeNames.VersionedItem:
            name = Resources.LinksControlVersionedItemText;
            break;
        case RegisteredLinkTypeNames.Commit:
            name = Resources.LinksControlCommitText;
            break;
        case RegisteredLinkTypeNames.Branch:
            name = Resources.LinksControlBranchText;
            break;
        case RegisteredLinkTypeNames.Tag:
            name = Resources.LinksControlTagsText;
            break;
        case RegisteredLinkTypeNames.PullRequest:
            name = Resources.LinksControlPullRequestText;
            break;
        case RegisteredLinkTypeNames.ResultAttachment:
            name = Resources.LinksControlResultAttachmentText;
            break;
        case RegisteredLinkTypeNames.TestResult:
            name = Resources.LinksControlTestResultText;
            break;
        case RegisteredLinkTypeNames.Test:
            name = Resources.LinksControlTestText;
            break;
        case RegisteredLinkTypeNames.Storyboard:
            name = Resources.LinksControlStoryboardText;
            break;
        case RegisteredLinkTypeNames.Build:
            name = Resources.LinksControlBuildText;
            break;
        case RegisteredLinkTypeNames.FoundInBuild:
            name = Resources.LinksControlFoundInBuildText;
            break;
        case RegisteredLinkTypeNames.IntegratedInBuild:
            name = Resources.LinksControlIntegratedInBuildText;
            break;
        case RegisteredLinkTypeNames.WikiPage:
            name = Resources.LinksControlWikiPageText;
            break;
        case RegisteredLinkTypeNames.GitHubPullRequestLinkType:
            name = Resources.LinksControlGitHubPullRequestText
            break;
        case RegisteredLinkTypeNames.GitHubCommitLinkType:
            name = Resources.LinksControlGitHubCommitText
            break;
        default:
            {
                // If it is not one of the registered link types, it probably came from an extension.
                const linkData = getContributedLinkName(linkType, store);
                name = (linkData && linkData.linkTypeName) ? linkData.linkTypeName : Resources.LinksControlUnknownLinkTypeText;
            }
            break;
    }
    return name;
}

export function getLinkTypeRefName(link: WITOM.Link): string {
    /// <summary>Gets the link type reference name of the specified link</summary>
    /// <param name="link" type="WITOM.Link">Link to get the reference name of its type</param>
    /// <returns type="String" />

    if (link instanceof WITOM.WorkItemLink) {
        const workItemLink = <WITOM.WorkItemLink>link;

        return workItemLink.getLinkTypeEnd().immutableName;
    } else {
        return link.getArtifactLinkType();
    }
}

export function getLinkTypeName(link: WITOM.Link): string {
    /// <summary>Gets the link type name of the specified link</summary>
    /// <param name="link" type="WITOM.Link">Link to get the name of its type</param>
    /// <returns type="String" />

    if (link instanceof WITOM.WorkItemLink) {
        const workItemLink = <WITOM.WorkItemLink>link;

        return workItemLink.getLinkTypeEnd().name;
    } else {
        return getRegisteredLinkName(link.getArtifactLinkType(), link.workItem.store);
    }
}

export function getFriendlyToolName(toolId: string): string {
    switch (toolId) {
        case Artifacts_Constants.ToolNames.VersionControl:
        case Artifacts_Constants.ToolNames.Git:
            return Resources.LinkToolTypeCode;
        case Artifacts_Constants.ToolNames.TestManagement:
            return Resources.LinkToolTypeTest;
        case Artifacts_Constants.ToolNames.Requirements:
            return Resources.LinkToolTypeRequirements;
        case Artifacts_Constants.ToolNames.TeamBuild:
            return Resources.LinkToolTypeBuild;
        case Artifacts_Constants.ToolNames.Wiki:
            return Resources.LinkToolTypeWiki;
        case Artifacts_Constants.ToolNames.GitHub:
            return Resources.LinkToolTypeGitHub;
        default:
            return Resources.LinkToolTypeWork;
    }
}

export function getLinkTopologyOptions(linkTopology: string, isForwardLink: boolean): TopologyOptions {
    if (linkTopology) {
        const topologyType: TopologyType = getTopology(linkTopology);
        const linkDirection: LinkDirection = getLinkDirection(isForwardLink, topologyType);
        return {
            topology: topologyType,
            linkDirection
        };
    } else {
        return DefaultTopologyOptions;
    }
}

// if the links are coming from our data provider, enums are getting serialized to be numbers. If they are coming from mvc, they are strings.
// this code here does a safe check so depending on where we loaded them from we will still get the right enum out from here
export function getTopology(topologyName: string | TopologyType): TopologyType {
    let result: TopologyType = null;
    let trueTopologyName: string = null;
    if (typeof topologyName === 'string') {
        trueTopologyName = topologyName;
    }
    else {
        trueTopologyName = TopologyType[topologyName as TopologyType];
    }

    if (Utils_String.equals(trueTopologyName, TopologyType[TopologyType.Dependency], true)) {
        result = TopologyType.Dependency;
    } else if (Utils_String.equals(trueTopologyName, TopologyType[TopologyType.Network], true)) {
        result = TopologyType.Network;
    } else if (Utils_String.equals(trueTopologyName, TopologyType[TopologyType.Tree], true)) {
        result = TopologyType.Tree;
    } else if (Utils_String.equals(trueTopologyName, TopologyType[TopologyType.DirectedNetwork], true)) {
        result = TopologyType.DirectedNetwork;
    } else {
        throw new Error(
            Utils_String.format(
                "Topology name '{0}' is not supported.",
                topologyName));
    }

    return result;
}

export function getLinkDirection(isForward: boolean, topologyType: TopologyType): LinkDirection {
    let result: LinkDirection = LinkDirection.NonDirectional;

    if (topologyType !== TopologyType.Network) {
        result = (isForward) ? LinkDirection.Forward : LinkDirection.Reverse;
    }

    return result;
}

export function getTopologyOptions(linkTypeName: string, workItem: WITOM.WorkItem): TopologyOptions {
    let topologyValue: TopologyType = null;
    let linkDirectionValue: LinkDirection = null;

    if (linkTypeName) {
        const linkTypeEnd = workItem.store.findLinkTypeEnd(linkTypeName);
        topologyValue = getTopology(linkTypeEnd.linkType.topology);
        linkDirectionValue = getLinkDirection(linkTypeEnd.isForwardLink, topologyValue);
    }

    return {
        topology: topologyValue,
        linkDirection: linkDirectionValue
    };
}

function getContributedLinkName(linkType: string, store) {
    const clt: WITOM.IContributedLinkTypes = store.getContributedLinkTypes() || {};
    const matchingTypes = Object.keys(clt).filter(k => Utils_String.equals(k, linkType));
    return matchingTypes.length > 0 ? clt[matchingTypes[0]] : null;
}
