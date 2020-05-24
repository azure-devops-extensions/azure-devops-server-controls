import * as React from "react";

import * as Base from "DistributedTaskControls/Common/Components/Base";
import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";

import { ReleaseEnvironmentPropertiesContributionsActionCreator } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleaseEnvironmentPropertiesContributionsActionCreator";
import { ReleaseEnvironmentPropertiesContributionHostItem } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleaseEnvironmentPropertiesContributionHostItem";
import { ContributionsVisibilityMap, IReleaseEnvironmentPropertiesContributionsState, ReleaseEnvironmentPropertiesContributionsStore } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleaseEnvironmentPropertiesContributionsStore";

import { EnvironmentStatus } from "ReleaseManagement/Core/Contracts";

import { autobind } from "OfficeFabric/Utilities";

import "VSS/LoaderPlugins/Css!RM:PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleaseEnvironmentPropertiesContributionHost";

export interface IReleaseEnvironmentPropertiesContributionHostProps extends Base.IProps {

    releaseId: number;

    releaseEnvironmentId: number;

    environmentStatus: EnvironmentStatus;
}

export class ReleaseEnvironmentPropertiesContributionHost extends Base.Component<IReleaseEnvironmentPropertiesContributionHostProps, IReleaseEnvironmentPropertiesContributionsState> {

    public componentWillMount() {
        this._contributionsStore = StoreManager.GetStore<ReleaseEnvironmentPropertiesContributionsStore>(ReleaseEnvironmentPropertiesContributionsStore);
        this._contributionsActionCreator = ActionCreatorManager.GetActionCreator<ReleaseEnvironmentPropertiesContributionsActionCreator>(ReleaseEnvironmentPropertiesContributionsActionCreator);

        this._contributionsStore.addChangedListener(this._onStoreChanged);
        this.setState(this._contributionsStore.getState());
    }

    public render() {
        let renderedContributions: JSX.Element[] = [];

        this.state.contributions.forEach((contribution: Contribution) => {

            renderedContributions.push(
                <div key={contribution.id}>
                    {this._isVisible(contribution.id) && <hr className="cd-release-progress-node-extension-separator" />}
                    <ReleaseEnvironmentPropertiesContributionHostItem 
                        {...this.props}
                        hideLoading={true}
                        key={contribution.id}
                        contribution={contribution}
                        setVisibleState={this._setVisibleState}/>
                </div>
            );
            
        });

        return <div>{renderedContributions}</div>;
    }

    public componentWillUnmount() {
        this._contributionsStore.removeChangedListener(this._onStoreChanged);
    }

    @autobind
    private _onStoreChanged(): void {
        this.setState(this._contributionsStore.getState());
    }

    private _setVisibleState = (contributionId: string, isVisible: boolean): void => {
        this._contributionsActionCreator.updateVisibility(this.props.instanceId, contributionId, isVisible);
    }

    private _isVisible(contributionId: string): boolean {
        const contributionsVisibilityMap: ContributionsVisibilityMap = this.state.instanceIdToContributionsVisibilityMap[this.props.instanceId];

        if (!contributionsVisibilityMap) {
            return false;
        }

        return !!contributionsVisibilityMap[contributionId];
    }

    private _contributionsStore: ReleaseEnvironmentPropertiesContributionsStore;
    private _contributionsActionCreator: ReleaseEnvironmentPropertiesContributionsActionCreator;
}