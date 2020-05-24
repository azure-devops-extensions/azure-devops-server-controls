import { ArtifactTypeNames, ToolNames } from "VSS/Artifacts/Constants";
import { localeFormat, parseDateString, friendly } from "VSS/Utils/Date";
import { format } from "VSS/Utils/String";
import {
    IColumn,
    IHostArtifact,
    IInternalLinkedArtifactDisplayData,
    InternalKnownColumns
} from "Presentation/Scripts/TFS/Controls/LinkedArtifacts/Contracts";
import { ILinkedArtifactsDataProvider } from "Presentation/Scripts/TFS/Controls/LinkedArtifacts/DataProvider/DataProvider";
import * as TFS_Host_TfsContext from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import {
    ArtifactIconType,
    IExternalLinkedArtifact,
    ILinkedArtifact,
    ILinkedArtifactAdditionalData
} from "TFS/WorkItemTracking/ExtensionContracts";
import { resolveGitHubItems, IGitHubLinkItemIdentifier } from "WorkItemTracking/Scripts/OM/GitHubLinkDataSource";
import { WorkItemArtifactLastUpdatedLabel, WorkItemArtifactLinkGitHubCannotRender } from "WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking";
import * as Resources from "WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking";
import { GitHubIntegrationCIActions, publishGitHubTelemetry } from "WorkItemTracking/Scripts/Utils/WorkItemTrackingCIEventHelper";

export const SHORT_HASH_LENGTH = 7;  // Length matches Github

/**
 * Example: Pull Request owner/repo#1
 * {0} = localized artifact type display name (e.g. Commit, Pull Request)
 * {1} = owner/repo
 * {2} = symbol (e.g. @ for commits, # for PR)
 * {3} = number or SHA
 */
const FALLBACK_ARTIFACT_LINK_TITLE_FORMAT = "{0}{1}{2}{3}";

export default class GitHubDataProvider implements ILinkedArtifactsDataProvider {
    readonly supportedTool: string = ToolNames.GitHub;

    public async beginGetDisplayData(
        artifacts: ILinkedArtifact[],
        columns: IColumn[],
        tfsContext: TFS_Host_TfsContext.TfsContext,
        hostArtifact?: IHostArtifact): Promise<IInternalLinkedArtifactDisplayData[]> {

        const linkItemIdentifiers: IGitHubLinkItemIdentifier[] = [];
        const externalLinkMap: IDictionaryStringTo<ILinkedArtifact> = {};

        for (const artifact of artifacts) {
            const externalLinkContext = artifact.externalLinkedArtifactContext;
            if (externalLinkContext && externalLinkContext.repoInternalId && externalLinkContext.numberOrSHA) {
                externalLinkMap[this._getExternalLinkContextLookupKey(externalLinkContext)] = artifact;
                if (!externalLinkContext.title) {
                    // Attempt to fetch link data from data provider if existing context isn't resolved.
                    linkItemIdentifiers.push({
                        itemType: externalLinkContext.itemType,
                        repoInternalId: externalLinkContext.repoInternalId,
                        numberOrSHA: externalLinkContext.numberOrSHA
                    });
                }
            }
        }
        
        const workitemId = hostArtifact && hostArtifact.id;
        const externalLinkResult: IDictionaryStringTo<IExternalLinkedArtifact> = await this._getGitHubLinkResult(linkItemIdentifiers, workitemId);
        const externalLinkArtifacts = Object.keys(externalLinkResult).map(k => externalLinkResult[k]);
        publishGitHubTelemetry(
            GitHubIntegrationCIActions.LINKS_FETCH,
            {
                numberRequested: linkItemIdentifiers.length,
                numberReturned: externalLinkArtifacts.length,
                numberOfReturnedWithoutTitle: externalLinkArtifacts.filter(l => !l.title).length
            }
        );

        return this._createArtifactLinksDisplayData(externalLinkMap, externalLinkResult);
    }

    private async _getGitHubLinkResult(linkItemIdentifiers: IGitHubLinkItemIdentifier[], workitemId: string | null): Promise<IDictionaryStringTo<IExternalLinkedArtifact>> {
        const externalLinkResult: IDictionaryStringTo<IExternalLinkedArtifact> = {};
        if (linkItemIdentifiers.length > 0) {
            const linkResult = await resolveGitHubItems(linkItemIdentifiers, workitemId);
            for (const externalLink of linkResult) {
                if (externalLink) {
                    externalLinkResult[this._getExternalLinkContextLookupKey(externalLink)] = externalLink;
                }
            }
        }

        return externalLinkResult;
    }

    private _getExternalLinkContextLookupKey(externalLinkContext: IExternalLinkedArtifact): string {
        return `${externalLinkContext.itemType}${externalLinkContext.repoInternalId}${externalLinkContext.numberOrSHA}`.toLowerCase();
    }

    private _createArtifactLinksDisplayData(externalLinkMap: IDictionaryStringTo<ILinkedArtifact>, externalLinkResult: IDictionaryStringTo<IExternalLinkedArtifact>): IInternalLinkedArtifactDisplayData[] {
        const result: IInternalLinkedArtifactDisplayData[] = [];
        const fallbackLinkTypeAndIdCount: { [key: string]: number } = {};
        const keys = Object.keys(externalLinkMap);

        // Loop through the artifact link for the first time and count the fallback links by their type and number/SHA
        for (const key of keys) {
            const artifactLink = externalLinkMap[key];
            const externalLinkContext = externalLinkResult[key] || artifactLink.externalLinkedArtifactContext;
            if (externalLinkContext && !externalLinkContext.title) {
                const typeAndIdLookupKey = `${externalLinkContext.itemType}_${externalLinkContext.numberOrSHA}`;
                if (!fallbackLinkTypeAndIdCount[typeAndIdLookupKey]) {
                    fallbackLinkTypeAndIdCount[typeAndIdLookupKey] = 1;
                } else {
                    fallbackLinkTypeAndIdCount[typeAndIdLookupKey]++;
                }
            }
        }

        for (const key of keys) {
            const artifactLink = externalLinkMap[key];
            const externalLinkContext = externalLinkResult[key] || artifactLink.externalLinkedArtifactContext;
            const artifactDisplayData: IInternalLinkedArtifactDisplayData = {
                ...artifactLink,
                externalLinkedArtifactContext: externalLinkContext
            };

            if (externalLinkContext && (externalLinkContext.title || externalLinkContext.url)) {
                const isFallbackLink = !externalLinkContext.title;
                const typeAndIdLookupKey = `${externalLinkContext.itemType}_${externalLinkContext.numberOrSHA}`;
                const hasSameTypeAndIdFallbackLink = fallbackLinkTypeAndIdCount[typeAndIdLookupKey] > 1;

                artifactDisplayData.primaryData = {
                    typeIcon: {
                        type: ArtifactIconType.icon,
                        title: artifactLink.linkTypeDisplayName,
                        descriptor: this._getArtifactTypeIcon(externalLinkContext.itemType)
                    },
                    displayId: isFallbackLink ? undefined : this._getArtifactTypeDisplayData(externalLinkContext.itemType, externalLinkContext.numberOrSHA),
                    href: externalLinkContext.url,
                    title: this._getArtifactLinkDisplayTitle(externalLinkContext, isFallbackLink, hasSameTypeAndIdFallbackLink),
                    additionalPrefixIcon: {
                        type: ArtifactIconType.icon,
                        title: artifactLink.linkTypeDisplayName,
                        descriptor: "bowtie-brand-github"
                    }
                };

                const dateAdditionalData = this._getAdditionalDateData(externalLinkContext.date);
                artifactDisplayData.additionalData = {
                    [InternalKnownColumns.LastUpdate.refName]: dateAdditionalData,
                    [InternalKnownColumns.State.refName]:
                        externalLinkContext.state ?
                            {
                                icon: null,
                                styledText: { text: externalLinkContext.state },
                                title: externalLinkContext.state
                            }
                            : null
                };
            } else {
                // Show an error if we do not have either title nor the fallback error
                artifactDisplayData.error = new Error(WorkItemArtifactLinkGitHubCannotRender);
            }
            result.push(artifactDisplayData);
        }

        return result;
    }

    private _getArtifactLinkDisplayTitle(externalLinkContext: IExternalLinkedArtifact, isFallbackLink: boolean, hasSameTypeAndIdFallbackLink: boolean): string {
        if (!isFallbackLink) {
            return externalLinkContext.title;
        }

        switch (externalLinkContext.itemType) {
            case ArtifactTypeNames.Commit:
                return format(
                    FALLBACK_ARTIFACT_LINK_TITLE_FORMAT,
                    Resources.LinksControlCommitText,
                    hasSameTypeAndIdFallbackLink ? ` ${externalLinkContext.repoNameWithOwner}` : "",
                    "@",
                    externalLinkContext.numberOrSHA!.substr(0, SHORT_HASH_LENGTH));
            case ArtifactTypeNames.PullRequest:
                return format(
                    FALLBACK_ARTIFACT_LINK_TITLE_FORMAT,
                    Resources.LinksControlPullRequestText,
                    hasSameTypeAndIdFallbackLink ? ` ${externalLinkContext.repoNameWithOwner}` : "",
                    "#",
                    externalLinkContext.numberOrSHA);
            default:
                return "";
        }
    }

    private _getAdditionalDateData(lastUpdate: string | Date): ILinkedArtifactAdditionalData {
        if (lastUpdate) {
            const lastChangedDate: Date = typeof (lastUpdate) === "string" ? parseDateString(lastUpdate) : lastUpdate;
            const lastChangedFriendlyText = friendly(lastChangedDate);
            return {
                styledText: { text: format(WorkItemArtifactLastUpdatedLabel, lastChangedFriendlyText) },
                title: localeFormat(lastChangedDate, "F"),
                rawData: lastChangedDate
            };
        }

        return null;
    }

    private _getArtifactTypeIcon(artifactType: string): string {
        switch (artifactType) {
            case ArtifactTypeNames.Commit:
                return "bowtie-tfvc-commit";
            case ArtifactTypeNames.PullRequest:
                return "bowtie-tfvc-pull-request";
            default:
                return "bowtie-status-failure-outline";
        }
    }

    private _getArtifactTypeDisplayData(artifactType: string, numberOrSHA: string) {
        switch (artifactType) {
            case ArtifactTypeNames.Commit:
                return {
                    text: numberOrSHA ? numberOrSHA.substr(0, SHORT_HASH_LENGTH) : numberOrSHA,
                    title: numberOrSHA
                };
            case ArtifactTypeNames.PullRequest:
                return {
                    text: numberOrSHA,
                    title: numberOrSHA
                }
        }

        return null;
    }
}