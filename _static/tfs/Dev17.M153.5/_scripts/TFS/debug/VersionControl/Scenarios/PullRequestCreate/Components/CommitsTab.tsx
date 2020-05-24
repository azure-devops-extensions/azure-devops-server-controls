import * as React from "react";
import { GitRepositoryContext } from "VersionControl/Scripts/GitRepositoryContext";
import { GitHistoryQueryResults, GitObjectType, ChangeList, HistoryEntry, GitCommit } from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";
import { DefaultColumns } from "VersionControl/Scenarios/History/GitHistory/Components/HistoryListColumns";
import { GitHistoryDataOptions } from "VersionControl/Scenarios/History/GitHistory/Actions/HistoryTabActionsHub";
import { HistoryList } from "VersionControl/Scenarios/History/GitHistory/Components/HistoryList";
import { HistoryListItem } from "VersionControl/Scenarios/History/GitHistory/Components/HistoryListInterfaces";
import { Link } from "OfficeFabric/Link";
import { CodeHubContributionIds } from "VersionControl/Scripts/CodeHubContributionIds";
import { onClickNavigationHandler } from "VersionControl/Scripts/Utils/XhrNavigationUtils";
import * as VersionControlUrls from "VersionControl/Scripts/VersionControlUrls";
import * as Constants from "VersionControl/Scenarios/PullRequestCreate/Constants";
import { VersionSpec } from "VersionControl/Scripts/TFS.VersionControl.VersionSpecs";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";

import "VSS/LoaderPlugins/Css!VersionControl/CommitsTab";

export interface CommitsTabProps {
    repoContext: GitRepositoryContext;
    history: GitHistoryQueryResults;
    sourceBranchVersionString: string;
    targetBranchVersionString: string;
    maxHistoryItems?: number;
}

export class CommitsTabComponent extends React.PureComponent<CommitsTabProps, {}> {
    public render(): JSX.Element {
        const maxHistoryItems = this.props.maxHistoryItems || Constants.DEFAULT_MAX_HISTORY_ITEMS_COUNT;
        return this.props.history ?
            <div className="vc-pullRequestCreate-historyList">
                <HistoryList
                    repositoryContext={this.props.repoContext}
                    historyResults={this.props.history}
                    resultsObjectType={GitObjectType.Commit}
                    lastDisplayedCommit={getLastDisplayedCommitId(this.props.history.results)}
                    headerVisible={false}
                    columns={DefaultColumns.BasicColumns}
                    dataOptions={this._getDataOptions()}
                    fetchRenameHistory={(HistoryEntry) => { }}
                    fetchMoreItems={() => { }}
                    onScenarioComplete={(splitTimingName: string) => { }}
                    onSelectionChanged={(selection: HistoryListItem[]) => { }}
                    onGraphRowSelected={(selectedCommitId: string) => { }}
                    onGraphRowUnSelected={() => { }}
                    onItemSelected={(event: React.MouseEvent<HTMLAnchorElement>) => onClickNavigationHandler(event, CodeHubContributionIds.historyHub, (event.currentTarget as HTMLAnchorElement).href)}
                    updateLastDisplayedCommitId={() => { }} />
                {this.props.history.results.length > maxHistoryItems &&
                    <LinkToCompareBranches {...this.props as CommitsTabProps} />}
            </div>
            : null;
    }

    private _getDataOptions(): GitHistoryDataOptions {
        return {
            fetchBuildStatuses: false,
            fetchGraph: false,
            fetchPullRequests: false,
            fetchTags: false,
        };
    }
}

function LinkToCompareBranches(props: CommitsTabProps): JSX.Element {
    return <div className="vc-pullRequestCreate-navigateToCompare">
        <Link target="_blank"
            rel="noopener noreferrer"
            href={VersionControlUrls.getBranchCompareUrl(props.repoContext, props.targetBranchVersionString,  props.sourceBranchVersionString)}>
        {VCResources.PullRequestCreate_ViewFullBranchesCompareLink}</Link>
    </div>;
}

function getLastDisplayedCommitId(historyEntries: HistoryEntry[]): string {
    let lastCommitId: string = "";
    if (historyEntries && historyEntries.length > 0) {
        const item: HistoryEntry = historyEntries[Math.min(historyEntries.length - 1, Constants.DEFAULT_MAX_HISTORY_ITEMS_COUNT)];

        const gitCommit = item.changeList as GitCommit;

        if (gitCommit && gitCommit.commitId) {
            lastCommitId = gitCommit.commitId.full;
        }
    }
    return lastCommitId;
}
