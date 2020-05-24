import * as Q from "q";
import * as Performance from "VSS/Performance";

import * as VisitsContracts from "CodeReview/Visits/Contracts";
import * as VisitsClient from "CodeReview/Visits/RestClient";
import { ProjectCollection } from "Presentation/Scripts/TFS/TFS.OM.Common";
import { CodeHubContributionIds } from "VersionControl/Scripts/CodeHubContributionIds";
import * as CustomerIntelligenceConstants from "VersionControl/Scripts/CustomerIntelligenceConstants";
import { GitRepositoryContext } from "VersionControl/Scripts/GitRepositoryContext";
import { PullRequestArtifact } from "VersionControl/Scripts/PullRequestArtifact";
import { CachedSource } from "VersionControl/Scripts/Sources/Source";
import { onClickNavigationHandler } from "VersionControl/Scripts/Utils/XhrNavigationUtils";
import { getCommitUrl } from "VersionControl/Scripts/VersionControlUrls";

export class NavigationSource extends CachedSource {
    private static DATA_ISLAND_PROVIDER_ID: string = "ms.vss-code-web.pull-request-detail-visit-data-provider";
    private static DATA_ISLAND_CACHE_PREFIX: string = "TFS.VersionControl.PullRequestDetailVisitProvider";
    private static DATA_ISLAND_CACHE_SUFFIX: string = "Visit";

    private _visitsClient: VisitsClient.VisitsHttpClient;

    constructor(private _repositoryContext: GitRepositoryContext, private _pullRequestId: number) {
        super(NavigationSource.DATA_ISLAND_PROVIDER_ID, NavigationSource.DATA_ISLAND_CACHE_PREFIX);

        this._visitsClient = ProjectCollection.getDefaultConnection().getHttpClient<VisitsClient.VisitsHttpClient>(VisitsClient.VisitsHttpClient);
    }

    /**
     * Update the last visit data for this user and return the current visit data
     */
    public updateLastVisitAsync(): IPromise<Date> {
        if (!this._pullRequestId) {
            return Q(null); // pull request id could be invalid
        }

        const scenario = Performance.getScenarioManager().startScenario(
            CustomerIntelligenceConstants.VERSION_CONTROL_AREA,
            CustomerIntelligenceConstants.PULL_REQUEST_UPDATE_VISIT_FEATURE);

        scenario.addData({
            pullRequestId: this._pullRequestId
        });

        // check for cached value before going to REST
        const cached = this.fromCache<VisitsContracts.ArtifactVisit>(NavigationSource.DATA_ISLAND_CACHE_SUFFIX, VisitsContracts.TypeInfo.ArtifactVisit);

        if (cached) {
            scenario.addData({ cached: true });
            scenario.end();
            return Q<Date>(cached.previousLastVisitedDate || null);
        }

        const pullRequestArtifact = new PullRequestArtifact({
            projectGuid: this._repositoryContext.getProjectId(),
            repositoryId: this._repositoryContext.getRepositoryId(),
            pullRequestId: this._pullRequestId
        });

        const visit = { artifactId: pullRequestArtifact.getUri() } as VisitsContracts.ArtifactVisit;

        const deferred = Q.defer<Date>();

        this._visitsClient.updateLastVisit(visit)
            .then(updatedVisit => {
                deferred.resolve(updatedVisit.previousLastVisitedDate || null);
            });

        return deferred.promise;
    }

    /**
     * Navigates to the page of the provided commit.
     */
    public viewCommit(commitId: string, event: React.MouseEvent<HTMLElement>): void {
        const url = getCommitUrl(this._repositoryContext, commitId);
        onClickNavigationHandler(event, CodeHubContributionIds.historyHub, url);
    }
}