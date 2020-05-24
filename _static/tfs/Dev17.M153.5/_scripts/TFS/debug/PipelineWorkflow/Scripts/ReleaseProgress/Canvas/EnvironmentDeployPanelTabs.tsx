/// <reference types="react" />

import * as React from "react";

import * as Utils_String from "VSS/Utils/String";

import { ActionButton, CommandBarButton, DefaultButton, PrimaryButton } from "OfficeFabric/Button";
import { css, Async, autobind } from "OfficeFabric/Utilities";

import { Item } from "DistributedTaskControls/Common/Item";
import * as Base from "DistributedTaskControls/Common/Components/Base";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";

import { ReleaseEnvironmentStore } from "PipelineWorkflow/Scripts/ReleaseProgress/ReleaseEnvironment/ReleaseEnvironmentStore";
import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";
import { ComputedDeploymentStatus } from "PipelineWorkflow/Scripts/Common/Types";
import { ArtifactsComparisonDetailsView, ITabArgs } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ArtifactsComparisonDetailsView";
import { DeployEnvironmentsPanelActions } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/DeployEnvironmentsPanelActions";
import { EnvironmentDeployPanel } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/EnvironmentDeployPanel";
import { ReleaseStore } from "PipelineWorkflow/Scripts/ReleaseProgress/Release/ReleaseStore";

import "VSS/LoaderPlugins/Css!RM:PipelineWorkflow/Scripts/ReleaseProgress/Canvas/EnvironmentDeployPanel";

export interface IEnvironmentDeployPanelTabsProps extends Base.IProps {
    onActionComplete: () => void;
}
export class EnvironmentDeployPanelTabs extends Base.Component<IEnvironmentDeployPanelTabsProps, Base.IStateless> {

    public componentWillMount() {
        this._releaseEnvironmentStore = StoreManager.GetStore<ReleaseEnvironmentStore>(ReleaseEnvironmentStore, this.props.instanceId);
    }

    public render(): JSX.Element {
        //TODO - initialize artifacts on mount.
        const environmentName = this._releaseEnvironmentStore.getEnvironmentName();
        const environmentDefinitionId = this._releaseEnvironmentStore.getEnvironmentDefinitionId();

        let additionalTab: ITabArgs = {
            key: "overview",
            title: Resources.Overview,
            getElement: this._getOverviewTab
        };

        return (
            <div className="deploy-panel-tabs">
                <ArtifactsComparisonDetailsView
                    instanceId={this.props.instanceId + DeployEnvironmentsPanelActions.SOURCE_KEY_INDIVIDUAL}
                    headingDescription={Resources.DeployRelease}
                    headingLabel={environmentName}
                    environmentDefinitionId={environmentDefinitionId}
                    latestDeploymentAttemptId={0}
                    source={"EnvironmentDeployPanel"}
                    isComparedToLatestArtifact={true}
                    fetchLatest={true}
                    primaryTab={additionalTab}
                    showComparisonInfoHeader={false} />
            </div>
        );
    }

    @autobind
    private _getOverviewTab(): JSX.Element {
        return <EnvironmentDeployPanel
            instanceId={this.props.instanceId} 
            onActionComplete={this.props.onActionComplete}/>;
    }

    private _releaseEnvironmentStore: ReleaseEnvironmentStore;
}