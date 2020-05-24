import * as Contracts from "TFS/VersionControl/Contracts";
import { GitCommit, GitObjectType } from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";
import { GitCommitSearchResults } from "VersionControl/Scripts/TFS.VersionControl.WebApi";
import * as VisualizationContracts from "VersionControl/Scenarios/History/GitHistory/GitGraph/VisualizationContracts";

export interface GitCommitExtended extends GitCommit {
    statuses: Contracts.GitStatus[];
    pullRequest: PullRequest;
    tags: GitTag[];
}

export interface WebClientVisualizationCell {
    components: string;
    excisionComponents: string;
}

export interface WebClientGraphRow {
    commit: Contracts.GitCommitRef;
    commitLane: number;
    maxCellId: number;
    cells: IDictionaryNumberTo<WebClientVisualizationCell>;
    hasOutgoingExcisedCommits: boolean;
    hasIncomingExcisedCommits: boolean;
    hasOngoingExcisedCommitTrackingLine: boolean;
}

export interface GitCommitSearchResultsExtended extends GitCommitSearchResults {
    searchCancelled: boolean;
    resultsObjectType: GitObjectType;
    pullRequests: {
        [key: string]: Contracts.GitPullRequest;
    };
    tags: {
        [key: string]: GitTag[];
    },
    graphRows: WebClientGraphRow[],
    isGitGraphFeatureEnabled: boolean,
}

export interface GitCommitArtifactsMap {
    [key: string]: GitCommitExtended;
}

/* Use the REST api data contract for tags when we implement the REST apis for tags (User Story 881222) */
export interface GitTag {
    name: string;
    comment?: string;
    resolvedCommitId?: string;
    tagger?: Contracts.GitUserDate;
}

export interface PullRequest {
    id: string;
    title: string;
    url: string;
}

export var TypeInfo = {
    GitTag: <any>{
    },
};

TypeInfo.GitTag.fields = {
    tagger: {
        typeInfo: Contracts.TypeInfo.GitUserDate,
    }
};