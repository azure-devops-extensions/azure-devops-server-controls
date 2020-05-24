import React = require("react");
import VCContracts = require("TFS/VersionControl/Contracts");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import { HistoryList } from "VersionControl/Scenarios/History/GitHistory/Components/HistoryList";
import { HistoryListItem } from "VersionControl/Scenarios/History/GitHistory/Components/HistoryListInterfaces";
import { DefaultColumns } from "VersionControl/Scenarios/History/GitHistory/Components/HistoryListColumns";
import { GitHistoryDataOptions } from "VersionControl/Scenarios/History/GitHistory/Actions/HistoryTabActionsHub";
import { RepositoryContext } from "VersionControl/Scripts/RepositoryContext";
import { GitClientService } from "VersionControl/Scripts/GitClientService";
import { GitHistoryQueryResults, GitObjectType, ChangeList } from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";

import { CodeHubContributionIds } from "VersionControl/Scripts/CodeHubContributionIds";
import { onClickNavigationHandler } from "VersionControl/Scripts/Utils/XhrNavigationUtils";

export interface ICommitsListOptions {
    headerVisible?: boolean;
    commits: VCContracts.GitCommitRef[];
    sourceCommitId: string;
    repositoryContext: RepositoryContext;
    tfsContext: TFS_Host_TfsContext.TfsContext;
    maxToShow: number;
}

export class CommitsList extends React.Component<ICommitsListOptions, {}> {

    public render(): JSX.Element {
        return <div className="vc-pullrequest-commits-list-container">
            {this.props.commits.length > 0 ?
                <HistoryList
                    repositoryContext={this.props.repositoryContext}
                    historyResults={this._getHistoryQueryResults()}
                    resultsObjectType={GitObjectType.Commit}
                    lastDisplayedCommit={this.props.commits[Math.min(this.props.commits.length - 1, this.props.maxToShow)].commitId}
                    headerVisible={!!this.props.headerVisible}
                    columns={DefaultColumns.BasicColumns}
                    dataOptions={this._getDataOptions()}
                    fetchRenameHistory={(HistoryEntry) => { }}
                    fetchMoreItems={() => { }}
                    onScenarioComplete={(splitTimingName: string) => { }}
                    onSelectionChanged={(selection: HistoryListItem[]) => { }}
                    onGraphRowSelected={(selectedCommitId: string) => { }}
                    onGraphRowUnSelected={() => { }}
                    updateLastDisplayedCommitId={() => { }}
                    onItemSelected={this._onCommitMessageClick}
                />
                : null}
        </div>;
    }

    /**
     * Property onItemSelected of HistoryList is misleading, the better name for it would be onCommitMessageClick.
     * This handler triggers only when user clicks on message link of the commit.
     */
    private _onCommitMessageClick = (event: React.MouseEvent<HTMLAnchorElement>): void => {
        onClickNavigationHandler(event, CodeHubContributionIds.historyHub, (event.currentTarget as HTMLAnchorElement).href);
    }

    private _getHistoryQueryResults(): GitHistoryQueryResults {
        const gitClient = this.props.repositoryContext.getClient() as GitClientService;

        return gitClient.getHistoryQueryResults({
            commits: this.props.commits.slice(0, this.props.maxToShow),
            startingCommitId: this.props.sourceCommitId,
            hasMore: false,
            stillProcessing: false
        });
    }

    private _getDataOptions(): GitHistoryDataOptions {
        return {
            fetchBuildStatuses: false,
            fetchGraph: false,
            fetchPullRequests: false,
            fetchTags: false,
        }
    }
}