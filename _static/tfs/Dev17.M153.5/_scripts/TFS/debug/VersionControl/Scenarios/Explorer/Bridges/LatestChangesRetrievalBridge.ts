import { GitLastChangeItem } from "TFS/VersionControl/Contracts";
import { ActionsHub } from  "VersionControl/Scenarios/Explorer/ActionsHub";
import { RepositorySource } from  "VersionControl/Scenarios/Explorer/Sources/RepositorySource";
import { AggregateState } from  "VersionControl/Scenarios/Explorer/Stores/StoresHub";

export interface FetchFolderLatestChangesOptions {
    path: string;
    version?: string;
    allowPartial?: boolean;
}

/**
 * Flux implementation of retrieval of latest changes for a folder.
 */
export class LatestChangesRetrievalBridge {
    constructor(
        private readonly actionsHub: ActionsHub,
        private readonly repositorySource: RepositorySource,
        private readonly getAggregateState: () => AggregateState,
    ) {}

    /**
     * Fetch latest changes for the given folder path.
     */
    public fetchFolderLatestChanges({ path, version = this.getAggregateState().version, allowPartial = true }: FetchFolderLatestChangesOptions): void {
        if (this.getAggregateState().isGit) {
            this.repositorySource.getGitLastChangeForChildItems(path, version, allowPartial)
                .then(response => {
                    this.actionsHub.folderLatestChangesRetrieved.invoke({
                        gitLastChanges: response.items,
                        gitCommits: response.commits,
                        lastExploredTime: response.lastExploredTime,
                        changeUrls: this.repositorySource.calculateGitChangeUrls(response.items.map(lastChange => lastChange.commitId), version),
                    });

                    if (response.items.length > 0 && response.commits.length === 0) {
                        this.fetchMissingCommitDetails(response.items);
                    }
                });
        } else {
            this.repositorySource.getChangeListsForChildItems(path, version)
                .then(changeLists =>
                    this.actionsHub.folderLatestChangesRetrieved.invoke({
                        changeLists,
                        changeUrls: this.repositorySource.calculateTfvcChangeUrls(changeLists as any),
                    }));
        }
    }

    private fetchMissingCommitDetails(lastChanges: GitLastChangeItem[]): void {
        const commitIdsToFetch: string[] = [];
        for (const lastChange of lastChanges) {
            if (!this.getAggregateState().folderContentState.knownCommits[lastChange.commitId] &&
                commitIdsToFetch.indexOf(lastChange.commitId) < 0) {
                commitIdsToFetch.push(lastChange.commitId);
            }
        }

        if (commitIdsToFetch.length) {
            this.repositorySource.getCommitDetails(commitIdsToFetch)
                .then(commitDetails => this.actionsHub.commitDetailsRetrieved.invoke(commitDetails));
        }
    }
}
