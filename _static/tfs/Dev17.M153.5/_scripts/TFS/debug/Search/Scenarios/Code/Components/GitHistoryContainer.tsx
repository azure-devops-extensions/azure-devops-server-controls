import * as React from "react";
import * as _VCContracts from "TFS/VersionControl/Contracts";
import * as _VCGitRepositoryContext from "VersionControl/Scripts/GitRepositoryContext";
import { HistoryTabStoresHub } from "VersionControl/Scenarios/History/GitHistory/Stores/HistoryTabStoresHub";
import { HistoryTabActionCreator } from "VersionControl/Scenarios/History/GitHistory/Actions/HistoryTabActionCreator";
import { HistoryTabActionsHub, GitHistoryDataOptions } from "VersionControl/Scenarios/History/GitHistory/Actions/HistoryTabActionsHub";
import { HistoryCommitsSource } from "VersionControl/Scenarios/History/GitHistory/Sources/HistoryCommitsSource";
import { HistorySourcesHub } from "VersionControl/Scenarios/History/GitHistory/Sources/HistorySourcesHub";
import { HistoryTab, IHistoryTabSearchProps, IHistoryTabOptions } from "VersionControl/Scenarios/History/GitHistory/Components/Tabs/HistoryTab";
import { GitPermissionsSource } from "VersionControl/Scenarios/Shared/Permissions/GitPermissionsSource";

export interface GitHistoryContainerProps {
    repoContext: _VCGitRepositoryContext.GitRepositoryContext;

    filePath: string;

    branch: string;

    onScenarioComplete?: (splitTimingName?: string) => void;
}

export class GitHistoryContainer extends React.Component<GitHistoryContainerProps, {}> {
    private _storesHub: HistoryTabStoresHub;
    private _actionCreator: HistoryTabActionCreator;
    constructor(props) {
        super(props);
        this._initializeFlux();
    }

    public render(): JSX.Element {
        const { repoContext, branch, filePath, onScenarioComplete } = this.props;
        return (
            <HistoryTab
                actionCreator={this._actionCreator}
                storesHub={this._storesHub}
                historySearchProps={getHistorySearchProps(repoContext, filePath, branch)}
                tabOptions={{
                    scenarioComplete: onScenarioComplete
                }} />
        );
    }

    private _initializeFlux() {
        const { repoContext } = this.props;
        if (!this._actionCreator && repoContext) {
            // Initialize the flux if not initialized earlier.
            const actionsHub = new HistoryTabActionsHub();
            this._storesHub = new HistoryTabStoresHub(actionsHub);
            const gitRepoContext = repoContext as _VCGitRepositoryContext.GitRepositoryContext;
            const sourcesHub: HistorySourcesHub = {
                historyCommitsSource: new HistoryCommitsSource(gitRepoContext),
                permissionsSource: new GitPermissionsSource(gitRepoContext.getRepository().project.id, gitRepoContext.getRepositoryId())
            };

            this._actionCreator = new HistoryTabActionCreator(actionsHub, sourcesHub, this._storesHub.getAggregatedState);
        }
    }
}

function getHistorySearchProps(
    repoContext: _VCGitRepositoryContext.GitRepositoryContext,
    filePath: string,
    branch: string): IHistoryTabSearchProps {
    return {
        historySearchCriteria: null,
        repositoryContext: repoContext,
        dataOptions: {
            fetchBuildStatuses: false,
            fetchGraph: false,
            fetchPullRequests: true,
            fetchTags: true
        },
        path: filePath,
        // The version passed to VC comprises of branch name appended by GB eg: GBmaster
        version: `GB${branch}`,
    }
}