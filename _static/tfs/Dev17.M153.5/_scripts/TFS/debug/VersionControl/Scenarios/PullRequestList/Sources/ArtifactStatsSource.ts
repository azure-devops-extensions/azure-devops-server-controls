import Q = require("q");
import * as ReactSource from "VersionControl/Scripts/Sources/Source";

import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";

import * as VisitsClient from "CodeReview/Visits/RestClient";
import * as VisitsContracts from "CodeReview/Visits/Contracts";
import * as TFS_OM_Common from "Presentation/Scripts/TFS/TFS.OM.Common";

import { SourceConstants } from "VersionControl/Scenarios/PullRequestList/Sources/SourceConstants";

export interface IArtifactStatsSource {
    getArtifactStats(artifactIds: string[], artifactIdsForDiscussions: string[], includeUpdatesSinceLastVisit: boolean): IPromise<VisitsContracts.ArtifactStats[]>;
}

export class ArtifactStatsSource extends ReactSource.CachedSource {
    private _visitsClient: VisitsClient.VisitsHttpClient;

    constructor(tfsContext: TfsContext) {
        super(SourceConstants.DATA_ISLAND_PROVIDER_ID, SourceConstants.DATA_ISLAND_CACHE_PREFIX);

        this._visitsClient = TFS_OM_Common.ProjectCollection.getConnection(tfsContext)
            .getHttpClient<VisitsClient.VisitsHttpClient>(VisitsClient.VisitsHttpClient);
    }

    public getArtifactStats(
        artifactIds: string[],
        artifactIdsForDiscussions: string[] = [],
        includeUpdatesSinceLastVisit: boolean = false): IPromise<VisitsContracts.ArtifactStats[]> {

        const statsIn: VisitsContracts.ArtifactStats[] = artifactIds.map((uri: string) => ({ artifactId: uri } as VisitsContracts.ArtifactStats));

        for (let i = 0; i < artifactIdsForDiscussions.length; ++i) {
            if (artifactIdsForDiscussions[i] !== statsIn[i].artifactId) {
                statsIn[i].discussionArtifactId = artifactIdsForDiscussions[i];
            }
        }

        return this._visitsClient.getStats(statsIn, includeUpdatesSinceLastVisit);
    }
}
