import * as Q from "q";
import * as Artifacts_Constants from "VSS/Artifacts/Constants";
import * as Utils_Date from "VSS/Utils/Date";
import * as Utils_String from "VSS/Utils/String";

import * as SharedSearchConstants from "SearchUI/Constants";
import * as LinkedArtifacts from "Presentation/Scripts/TFS/Controls/LinkedArtifacts/Contracts";
import { ILinkedArtifactsDataProvider } from "Presentation/Scripts/TFS/Controls/LinkedArtifacts/DataProvider/DataProvider";
import { IRouteData, TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import * as TFS_OM_Common from "Presentation/Scripts/TFS/TFS.OM.Common";

import { WikiV2 } from "TFS/Wiki/Contracts";
import { WikiHttpClient } from "TFS/Wiki/WikiRestClient";
import { GitCommitRef, GitQueryCommitsCriteria } from "TFS/VersionControl/Contracts";
import { ILinkedArtifact, ILinkedArtifactAdditionalData, ArtifactIconType } from "TFS/WorkItemTracking/ExtensionContracts";
import { GitCommitSearchResults, GitHttpClient } from "VersionControl/Scripts/TFS.VersionControl.WebApi";
import { VersionControlConstants } from "Wiki/Scripts/CommonConstants";
import { getGitItemPathForPage, getPageNameFromPath } from "Wiki/Scripts/Helpers";
import * as WikiResources from "Wiki/Scripts/Resources/TFS.Resources.Wiki";
import * as WikiPageArtifactHelpers from "Wiki/Scripts/WikiPageArtifactHelpers";
import { getExternalWikiHubPageViewUrl } from "Wiki/Scripts/WikiUrls";

export default class LinkedArtifactsDataProvider implements ILinkedArtifactsDataProvider {
    public artifactLimit = 20;
    readonly supportedTool: string = Artifacts_Constants.ToolNames.Wiki;
    private static readonly _wikiPageTypeIcon = "bowtie-log";

    public beginGetDisplayData(
        artifacts: ILinkedArtifact[],
        columns: LinkedArtifacts.IColumn[],
        tfsContext: TfsContext,
        hostArtifact?: LinkedArtifacts.IHostArtifact): IPromise<LinkedArtifacts.IInternalLinkedArtifactDisplayData[]> {
        const retValue: LinkedArtifacts.IInternalLinkedArtifactDisplayData[] = [];
        const promiseList: Q.Promise<void>[] = [];

        if (artifacts) {
            for (let i = 0; i < artifacts.length; i++) {
                if (!artifacts[i]) {
                    continue;
                }

                if (Utils_String.ignoreCaseComparer(artifacts[i].type, Artifacts_Constants.ArtifactTypeNames.WikiPage) === 0) {
                    this._getWikiPageData(artifacts[i], retValue, promiseList, tfsContext, hostArtifact);
                }
            }
        }

        return Q.all(promiseList).then(() => {
            return retValue;
        });
    }

    private _getWikiPageData(
        artifact: ILinkedArtifact,
        relatedData: LinkedArtifacts.IInternalLinkedArtifactDisplayData[],
        promiseList: Q.Promise<void>[],
        tfsContext: TfsContext,
        hostArtifact?: LinkedArtifacts.IHostArtifact): void {
        const deferredArtifact: Q.Deferred<void> = Q.defer<void>();
        promiseList.push(deferredArtifact.promise);

        const projectId = WikiPageArtifactHelpers.getProjectIdFromArtifactId(artifact.id)
        const wikiId = WikiPageArtifactHelpers.getWikiIdFromArtifactId(artifact.id);
        const pagePath = WikiPageArtifactHelpers.getWikiPagePathFromArtifactId(artifact.id);
        
        const wikiHttpClient = TFS_OM_Common.ProjectCollection.getDefaultConnection().getHttpClient<WikiHttpClient>(WikiHttpClient);
        wikiHttpClient.getWiki(wikiId, projectId).then(
            (wiki: WikiV2) => {
                
                const searchCriteria = {
                    itemVersion: VersionControlConstants.defaultBranch as any,
                    itemPath: getGitItemPathForPage(pagePath, wiki.mappedPath),
                    $top: 1,
                } as GitQueryCommitsCriteria;

                const httpClient = TFS_OM_Common.ProjectCollection.getDefaultConnection().getHttpClient<GitHttpClient>(GitHttpClient);
                httpClient.beginGetCommits(wiki.repositoryId, wiki.projectId, searchCriteria).then(
                    (results: GitCommitSearchResults) => {
                        if (!results || !results.commits || !results.commits.length) {
                            relatedData.push(this._pushDisplayArtifactForError(artifact));
                            deferredArtifact.resolve(null);
                        } else {
                            const topCommit: GitCommitRef = results.commits[0];

                            this._pushWikiPageData(artifact, relatedData, topCommit, tfsContext, hostArtifact);
                            deferredArtifact.resolve(null);
                        }
                    },
                    (error: Error) => {
                        relatedData.push(this._pushDisplayArtifactForError(artifact));
                        deferredArtifact.resolve(null);
                    },
                );
            },
            (error: Error) => {
                relatedData.push(this._pushDisplayArtifactForError(artifact));
                deferredArtifact.resolve(null);
            });
    }

    private _pushWikiPageData(
        artifact: ILinkedArtifact,
        relatedData: LinkedArtifacts.IInternalLinkedArtifactDisplayData[],
        commit: GitCommitRef,
        tfsContext: TfsContext,
        hostArtifact?: LinkedArtifacts.IHostArtifact): void {
        const pagePath = WikiPageArtifactHelpers.getWikiPagePathFromArtifactId(artifact.id);
        const projectId = WikiPageArtifactHelpers.getProjectIdFromArtifactId(artifact.id);
        const wikiId = WikiPageArtifactHelpers.getWikiIdFromArtifactId(artifact.id);

        const routeData: IRouteData = this._getRouteDataForLink(projectId, tfsContext);
        const wikiPageUrl = getExternalWikiHubPageViewUrl(wikiId, { pagePath: pagePath }, routeData);

        let dateAdditionalData: ILinkedArtifactAdditionalData = null;
        if (commit.author.date != null) {
            dateAdditionalData = {
                styledText: { text: Utils_String.format(WikiResources.LinkFormPageUpdatedDescription, Utils_Date.friendly(commit.author.date)) },
                title: Utils_Date.localeFormat(commit.author.date, "F"),
                rawData: commit.author.date,
            }
        }

        const wikiPageData: LinkedArtifacts.IInternalLinkedArtifactDisplayData = {
            tool: WikiPageArtifactHelpers.Tool,
            id: artifact.id,
            type: WikiPageArtifactHelpers.Type,
            linkType: artifact.linkType,
            linkTypeDisplayName: WikiResources.RelatedArtifactsWikiPageTitle,
            uri: artifact.uri,
            comment: artifact.comment,
            primaryData: {
                typeIcon: {
                    type: ArtifactIconType.icon,
                    descriptor: LinkedArtifactsDataProvider._wikiPageTypeIcon,
                    title: WikiResources.RelatedArtifactsWikiPageTitle,
                },
                href: wikiPageUrl,
                title: getPageNameFromPath(pagePath),
                user: {
                    displayName: commit.author.name,
                    email: commit.author.email,
                },
            },
            additionalData: {
                [LinkedArtifacts.InternalKnownColumns.LastUpdate.refName]: dateAdditionalData
            },
        };

        relatedData.push(wikiPageData);
    }

    private _getRouteDataForLink(projectId: string, tfsContext: TfsContext): IRouteData {
        const referencesCurrentProject = tfsContext && tfsContext.contextData && tfsContext.contextData.project && tfsContext.contextData.project.id === projectId;

        return {
            project: referencesCurrentProject ? tfsContext.contextData.project.name : projectId,
            includeTeam: referencesCurrentProject,
        };
    }

    private _pushDisplayArtifactForError(artifact: ILinkedArtifact): LinkedArtifacts.IInternalLinkedArtifactDisplayData {
        return {
            tool: WikiPageArtifactHelpers.Tool,
            id: artifact.id,
            type: WikiPageArtifactHelpers.Type,
            linkType: artifact.linkType,
            linkTypeDisplayName: artifact.linkTypeDisplayName,
            uri: artifact.uri,
            error: <Error>{
                message: WikiResources.LinkFormWikiPageNotFound,
                name: WikiResources.LinkFormWikiPageNotFound,
            }
        }
    }
}