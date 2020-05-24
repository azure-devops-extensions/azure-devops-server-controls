import * as React from "react";
import { StoresHub } from "VersionControl/Scenarios/PullRequestCreate/Stores/StoresHub";
import { PullRequestCreateActionCreator } from "VersionControl/Scenarios/PullRequestCreate/Actions/PullRequestCreateActionCreator";
import { IDiffCommit, ICommitHistory } from "VersionControl/Scenarios/PullRequestCreate/Stores/CommitsStore";

import { Pivot, PivotItem } from "OfficeFabric/Pivot";
import { FilesTab } from "VersionControl/Scenarios/PullRequestCreate/Components/FilesTab";
import { CommitsTabComponent } from "VersionControl/Scenarios/PullRequestCreate/Components/CommitsTab";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { GitRepositoryContext } from "VersionControl/Scripts/GitRepositoryContext";
import { GitCommit, GitHistoryQueryResults } from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";
import * as Constants from "VersionControl/Scenarios/PullRequestCreate/Constants";
import * as Utils_String from "VSS/Utils/String";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import { VersionSpec }from "VersionControl/Scripts/TFS.VersionControl.VersionSpecs";
import { autobind } from "OfficeFabric/Utilities";

import "VSS/LoaderPlugins/Css!VersionControl/Pivots";

export interface PivotsContainerProps {
    storesHub: StoresHub;
    actionCreator: PullRequestCreateActionCreator;
}

export interface PivotsContainerState {
    tfsContext: TfsContext;
    repositoryContext: GitRepositoryContext;
    diffCommit: IDiffCommit;
    history: ICommitHistory;
    isLoading: boolean;
    filesTabName: string;
    historyTabName: string;
}

export class PivotsContainer extends React.Component<PivotsContainerProps, PivotsContainerState> {
    constructor(props: PivotsContainerProps) {
        super(props);
        this.state = this._getStateFromStores();
    }

    public componentDidMount() {
        this.props.storesHub.branchesStore.addChangedListener(this._onChange);
        this.props.storesHub.commitsStore.addChangedListener(this._onChange);
    }

    public componentWillUnmount() {
        this.props.storesHub.branchesStore.removeChangedListener(this._onChange);
        this.props.storesHub.commitsStore.removeChangedListener(this._onChange);
    }

    public getComponentProps(): PivotsProps {
        return {
            repositoryContext: this.state.repositoryContext,
            tfsContext: this.state.tfsContext,
            diffCommit: this.state.diffCommit,
            history: this.state.history,
            isLoading: this.state.isLoading,
            filesTabName: this.state.filesTabName,
            historyTabName: this.state.historyTabName
        };
    }

    public render(): JSX.Element {
        return this.props.storesHub.commitsStore.shouldShowPreview && <Pivots {...this.getComponentProps()} />;
    }

    @autobind
    private _onChange() {
        this.setState(this._getStateFromStores());
    }

    private _getStateFromStores(): PivotsContainerState {
        return {
            isLoading: this.props.storesHub.commitsStore.isLoadingDiff(),
            history: this.props.storesHub.commitsStore.getHistory(),
            diffCommit: this.props.storesHub.commitsStore.getDiffCommit(),
            repositoryContext: this.props.storesHub.branchesStore.getSourceRepositoryContext(),
            tfsContext: this.props.storesHub.contextStore.getTfsContext(),
            historyTabName: this.props.storesHub.commitsStore.getCommitsTabName(),
            filesTabName: this.props.storesHub.commitsStore.getFilesTabName()
        };
    }
}

export interface PivotsProps {
    tfsContext: TfsContext;
    repositoryContext: GitRepositoryContext;
    diffCommit: IDiffCommit;
    isLoading: boolean;
    history: ICommitHistory;
    filesTabName: string;
    historyTabName: string;
}

export class Pivots extends React.PureComponent<PivotsProps, {}> {
    public render(): JSX.Element {
        const commit = this.props.diffCommit ? this.props.diffCommit.commit : null;

        return <div className="vc-pullRequestCreate-pivots">
            <Pivot>
                <PivotItem linkText={this.props.filesTabName} className="vc-pullRequestCreate-first-pivot">
                    <FilesTab
                        tfsContext={this.props.tfsContext}
                        repositoryContext={this.props.repositoryContext}
                        diffCommit={commit}
                        isLoading={this.props.isLoading}
                        sourceBranchVersionString={this.props.diffCommit.sourceBranchVersionString} />
                </PivotItem>
                <PivotItem linkText={this.props.historyTabName}>
                    <CommitsTabComponent
                        repoContext={this.props.repositoryContext}
                        history={this.props.history.history}
                        targetBranchVersionString={this.props.history.targetBranchVersionString}
                        sourceBranchVersionString={this.props.history.sourceBranchVersionString} />
                </PivotItem>
            </Pivot>
        </div>;
    }
}
