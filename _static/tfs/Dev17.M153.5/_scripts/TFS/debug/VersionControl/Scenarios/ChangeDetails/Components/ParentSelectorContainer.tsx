import * as React from "react";

import { GitCommit } from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";
import { GitRepositoryContext } from "VersionControl/Scripts/GitRepositoryContext";
import { RepositoryContext } from "VersionControl/Scripts/RepositoryContext";

import { ActionCreator } from "VersionControl/Scenarios/ChangeDetails/GitCommit/ActionCreator";
import { IChangeDetailsPropsBase } from "VersionControl/Scenarios/ChangeDetails/IChangeDetailsPropsBase";
import { ParentSelector } from "VersionControl/Scenarios/ChangeDetails/Components/ParentSelector";
import { StoresHub } from "VersionControl/Scenarios/ChangeDetails/GitCommit/StoresHub";

export interface ParentSelectorContainerProps extends IChangeDetailsPropsBase {
    actionCreator: ActionCreator;
    currentCommit: GitCommit;
    storesHub: StoresHub;
    parentIndex: number;
    repositoryContext: RepositoryContext;
}

export interface ParentSelectorContainerState {
    parentDetails: GitCommit[];
    isFullScreenMode: boolean;
}

export class ParentSelectorContainer extends React.Component<ParentSelectorContainerProps, ParentSelectorContainerState> {
    constructor(props: ParentSelectorContainerProps) {
        super(props);

        this.state = this._getStateFromStores();
    }

    public componentDidMount(): void {
        this.props.storesHub.gitCommitParentDetailStore.addChangedListener(this._onStoresChange);
        this.props.storesHub.urlParametersStore.addChangedListener(this._onStoresChange);
    }

    public componentWillUnmount(): void {
        this.props.storesHub.gitCommitParentDetailStore.removeChangedListener(this._onStoresChange);
        this.props.storesHub.urlParametersStore.removeChangedListener(this._onStoresChange);
    }

    public render(): JSX.Element {
        return (
            <ParentSelector
                currentCommit={this.props.currentCommit}
                onDiffParentUpdated={this._onDiffParentChange}
                parentDetails={this.state.parentDetails}
                parentIndex={this.props.parentIndex}
                repositoryContext={this.props.repositoryContext as GitRepositoryContext}
                isFullScreenMode={this.state.isFullScreenMode}
                customerIntelligenceData={this.props.customerIntelligenceData ? this.props.customerIntelligenceData.clone() : null}/>
        );
    }

    private _getStateFromStores(): ParentSelectorContainerState {
        const {gitCommitParentDetailStore, urlParametersStore} = this.props.storesHub;

        return {
            parentDetails: gitCommitParentDetailStore.parentGitCommits,
            isFullScreenMode: urlParametersStore.isFullScreen,
        };
    }

    private _onDiffParentChange = (newDiffParent: string): void => {
        const {navigationStateActionCreator, changeListActionCreator} = this.props.actionCreator;
        const navigateState = getNavigableState(newDiffParent, this.props.storesHub);
        if (navigateState) {
            navigationStateActionCreator.navigateWithState(navigateState.action, navigateState.state);
        }
        changeListActionCreator.changeDiffParent(newDiffParent);
    };

    private _onStoresChange = (): void => {
        this.setState(this._getStateFromStores());
    };
}

/**
* Get new navigation state using newDiffParent
* @param newDiffParent:
*  new diff parent value from components which can have values diffParent[1-9] or summary
*  newdiffParent value summary is used to show changes done in that commit while merging
*/
export function getNavigableState(newDiffParent: string, storesHub: StoresHub): { action?: string, state?: any } {
    const {changeListStore} = storesHub;
    if (!changeListStore.isGitMergeCommit) {
        return;
    }

    return { action: newDiffParent };
}