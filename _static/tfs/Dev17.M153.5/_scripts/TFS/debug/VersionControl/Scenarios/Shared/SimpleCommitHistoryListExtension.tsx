import * as React from "react";
import * as ReactDOM from "react-dom";

import Utils_String = require("VSS/Utils/String");
import * as SDK_Shim from "VSS/SDK/Shim";

import { ISimpleCommitHistoryListOptions } from "TFS/VersionControl/Controls";
import { GitCommitRef } from "TFS/VersionControl/Contracts";

import * as CommitIdHelper from "VersionControl/Scripts/CommitIdHelper";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import * as VCLegacyContracts from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";
import { GitHistoryDataOptions } from "VersionControl/Scenarios/History/GitHistory/Actions/HistoryTabActionsHub";
import { HistoryList } from "VersionControl/Scenarios/History/GitHistory/Components/HistoryList";
import { DefaultColumns } from "VersionControl/Scenarios/History/GitHistory/Components/HistoryListColumns";
import { HistoryListItem } from "VersionControl/Scenarios/History/GitHistory/Components/HistoryListInterfaces";
import * as GitItemUtils from "VersionControl/Scripts/GitItemUtils";

export class SimpleCommitHistoryList extends React.Component<ISimpleCommitHistoryListOptions, {}> {
    public render(): JSX.Element {
        const defaultDataOptions = {
            fetchBuildStatuses: false,
            fetchGraph: false,
            fetchPullRequests: false,
            fetchTags: false,
        } as GitHistoryDataOptions;

        return <div className="vc-pullrequest-commits-list-container">
            {this.props.commits && this.props.commits.length > 0 ?
                <HistoryList
                    repositoryContext={null}
                    historyResults={this._getHistoryQueryResults()}
                    resultsObjectType={VCLegacyContracts.GitObjectType.Commit}
                    lastDisplayedCommit={this.props.commits[this.props.commits.length - 1].commitId}
                    headerVisible={!!this.props.isHeaderVisible}
                    columns={this.props.visibleColumns ? DefaultColumns.GetCustomColumns(this.props.visibleColumns) : DefaultColumns.BasicColumns}
                    dataOptions={defaultDataOptions}
                    fetchRenameHistory={(HistoryEntry) => { }}
                    fetchMoreItems={this.props.fetchMoreItems}
                    onScenarioComplete={this.props.onScenarioComplete}
                    onSelectionChanged={(selection) => { }}
                    onGraphRowSelected={(selectedCommitId) => { }}
                    onGraphRowUnSelected={() => { }}
                    updateLastDisplayedCommitId={() => { }}
                />
                : null}
        </div>
    }

    private _getHistoryQueryResults(): VCLegacyContracts.GitHistoryQueryResults {
        return {
            results: this.commitRefsToHistoryEntries(this.props.commits),
            moreResultsAvailable: this.props.moreResultsAvailable,
            startingCommitId: this.props.commits[0].commitId
        } as VCLegacyContracts.GitHistoryQueryResults;
    }

    private commitRefsToHistoryEntries(commitRefs: GitCommitRef[]): VCLegacyContracts.HistoryEntry[] {

        const historyEntries = commitRefs.map(commit => {
            let changelist = GitItemUtils.simpleGitCommitRefToLegacyChangeList(commit);
            changelist.url = commit.url;

            const historyEntry = {
                changeList: changelist,
            } as VCLegacyContracts.HistoryEntry

            return historyEntry;
        });

        return historyEntries;
    }
}

SDK_Shim.registerContent("tfs.versioncontrol.commit-history-list", (context: SDK_Shim.InternalContentContextData): IDisposable => {
    if (context.options) {
        ReactDOM.render(
            <SimpleCommitHistoryList {...context.options} />,
            context.$container[0]);
    }

    const disposable: IDisposable = {
        dispose: (): void => {
            ReactDOM.unmountComponentAtNode(context.$container[0]);
        }
    };

    return disposable;
});
