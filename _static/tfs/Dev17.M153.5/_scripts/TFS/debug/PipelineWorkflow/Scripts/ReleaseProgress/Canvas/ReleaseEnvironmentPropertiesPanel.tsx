import * as React from "react";

import * as Base from "DistributedTaskControls/Common/Components/Base";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";

import { autobind, css } from "OfficeFabric/Utilities";

import { ArtifactsComparisonDetailsView, ITabArgs } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ArtifactsComparisonDetailsView";
import { EnvironmentOverviewTab } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/EnvironmentOverviewTab";
import { ReleaseEnvironmentNodeViewStore } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleaseEnvironmentNodeViewStore";
import { CanvasClickTargets, ReleaseProgressCanvasTelemetryHelper } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleaseProgressCanvasTelemetryHelper";
import { ReleaseEnvironmentPanelPivotItemKeys, ReleaseProgressNavigateStateActions } from "PipelineWorkflow/Scripts/ReleaseProgress/Constants";
import { ReleaseEnvironmentStatusIndicator } from "PipelineWorkflow/Scripts/ReleaseProgress/ReleaseEnvironment/ReleaseEnvironmentTypes";
import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";
import { ReleaseEnvironmentStatusHelper } from "PipelineWorkflow/Scripts/Shared/Utils/ReleaseEnvironmentStatusHelper";

import * as NavigationService from "VSS/Navigation/Services";

import { IPivotBarAction } from "VSSUI/Components/PivotBar";
import { IStatusProps } from "VSSUI/Status";

import "VSS/LoaderPlugins/Css!RM:PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleaseEnvironmentPropertiesPanel";

export interface IReleaseEnvironmentPropertiesState extends Base.IState {
    statusText: string;
    statusIconProps: IStatusProps;
    statusIndicator: ReleaseEnvironmentStatusIndicator;
    latestDeploymentAttemptId: number;
}

export interface IReleaseEnvironmentPropertiesPanelProps extends Base.IProps {

    key: string;

    environmentId: number;

    environmentName: string;

    environmentDefinitionId: number;
}

export class ReleaseEnvironmentPropertiesPanel extends Base.Component<IReleaseEnvironmentPropertiesPanelProps, IReleaseEnvironmentPropertiesState> {

    constructor(props: IReleaseEnvironmentPropertiesPanelProps) {
        super(props);
        this._releaseEnvironmentNodeViewStore = StoreManager.GetStore(ReleaseEnvironmentNodeViewStore, this.props.instanceId);
        const environmentState = this._releaseEnvironmentNodeViewStore.getState();
        const statusIndicator = environmentState.statusInfo.statusIndicator;
        const latestDeploymentAttemptId = this._releaseEnvironmentNodeViewStore.getLatestDeploymentAttemptId();
        this.state = {
            statusText: environmentState.statusInfo.statusText,
            statusIconProps: ReleaseEnvironmentStatusHelper.getStatusIconProps(statusIndicator),
            statusIndicator: statusIndicator,
            latestDeploymentAttemptId: latestDeploymentAttemptId
        } as Readonly<IReleaseEnvironmentPropertiesState>;
    }

    public componentDidMount(): void {
        this._releaseEnvironmentNodeViewStore.addChangedListener(this._handleEnvironmentNodeViewStoreChanged);
    }

    public componentWillUnmount(): void {
        this._releaseEnvironmentNodeViewStore.removeChangedListener(this._handleEnvironmentNodeViewStoreChanged);
    }

    public render(): JSX.Element {
        let deploymentStatusClass: string = this._getDeploymentStatusClass(this.state.statusIndicator);

        let overviewTab: ITabArgs = {
            key: "overview",
            title: Resources.SummaryTabTitle,
            getElement: this._getOverviewTab,
            getCommands: this._getPivotCommands
        };

        return (
            <div className={css("cd-environment-core-properties-panel-container", deploymentStatusClass)}>
                <ArtifactsComparisonDetailsView
                    instanceId={this.props.instanceId + "environmentProperties"}
                    headingLabel={this.props.environmentName}
                    descriptionIconProps={this.state.statusIconProps}
                    descriptionStatus={this.state.statusText}
                    descriptionStatusClass={"cd-deployment-status-text"}
                    environmentDefinitionId={this.props.environmentDefinitionId}
                    latestDeploymentAttemptId={this.state.latestDeploymentAttemptId}
                    source={"ReleaseEnvironmentProperties"}
                    fetchLatest={false}
                    isComparedToLatestArtifact={false}
                    showComparisonInfoHeader={true}
                    primaryTab={overviewTab}
                />
            </div>
        );
    }

    private _getDeploymentStatusClass(statusIndicator: ReleaseEnvironmentStatusIndicator): string {
        return `deployment-${statusIndicator.toLowerCase()}`;
    }

    @autobind
    private _handleEnvironmentNodeViewStoreChanged(): void {
        const environmentState = this._releaseEnvironmentNodeViewStore.getState();
        const statusIndicator = environmentState.statusInfo.statusIndicator;
        this.setState({
            statusText: environmentState.statusInfo.statusText,
            statusIconProps: ReleaseEnvironmentStatusHelper.getStatusIconProps(statusIndicator),
            statusIndicator: statusIndicator
        } as Readonly<IReleaseEnvironmentPropertiesState>);
    }

    @autobind
    private _getOverviewTab(selectPivotDelegate?: (ev: React.MouseEvent<HTMLElement> | React.KeyboardEvent<HTMLElement>, pivotKey: string) => void): JSX.Element {
        return <EnvironmentOverviewTab
            instanceId={this.props.instanceId}
            showCommitsDelegate={(ev) => selectPivotDelegate(ev, ReleaseEnvironmentPanelPivotItemKeys.c_commitsPivotItemKey)}
            showWorkItemsDelegate={(ev) => selectPivotDelegate(ev, ReleaseEnvironmentPanelPivotItemKeys.c_workitemsPivotItemKey)} />;
    }

    @autobind
    private _getPivotCommands(): IPivotBarAction[] {
        return [{
            key: "env-overview-view-logs-button",
            name: Resources.ViewLogsButtonText,
            title: Resources.ViewLogsButtonText,
            iconProps: { iconName: "ReplyMirrored" },
            onClick: () => { this._onViewLogsClick(); },
            important: true
        }];
    }

    @autobind
    private _onViewLogsClick(): void {
        ReleaseProgressCanvasTelemetryHelper.publishClickActionTelemetry(CanvasClickTargets.overviewPanelViewLogsButton);

        //  Add history point using navigation services while navigating to Logs tab
        NavigationService.getHistoryService().addHistoryPoint(ReleaseProgressNavigateStateActions.ReleaseEnvironmentLogs,
            { environmentId: this.props.environmentId },
            null, false, true
        );
    }

    private _releaseEnvironmentNodeViewStore: ReleaseEnvironmentNodeViewStore;
}
