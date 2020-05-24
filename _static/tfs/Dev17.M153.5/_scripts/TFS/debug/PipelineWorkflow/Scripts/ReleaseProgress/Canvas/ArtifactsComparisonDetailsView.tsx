/// <reference types="react" />

import * as React from "react";

import * as Base from "DistributedTaskControls/Common/Components/Base";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { Feature, Properties, Telemetry } from "DistributedTaskControls/Common/Telemetry";

import { ArtifactComparisonControllerView } from "PipelineWorkflow/Scripts/ReleaseProgress/ArtifactComparison/ArtifactComparisonControllerView";
import { CommitsComparisonStore } from "PipelineWorkflow/Scripts/ReleaseProgress/ArtifactComparison/Commits/CommitsComparisonStore";
import { WorkItemsComparisonStore } from "PipelineWorkflow/Scripts/ReleaseProgress/ArtifactComparison/WorkItems/WorkItemsComparisonStore";
import { CustomOverlayPanelHeading } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/CustomOverlayPanelHeading";
import { ReleaseEnvironmentPanelPivotItemKeys } from "PipelineWorkflow/Scripts/ReleaseProgress/Constants";
import { ReleaseStore } from "PipelineWorkflow/Scripts/ReleaseProgress/Release/ReleaseStore";
import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";

import { IPivotBarAction, PivotBar, PivotBarItem } from "VSSUI/PivotBar";
import { IStatusProps } from "VSSUI/Status";

import "VSS/LoaderPlugins/Css!RM:PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ArtifactsComparisonDetailsView";

export interface ITabArgs {
    key: string;
    title: string;
    getElement: (selectPivotDelegate?: (ev: React.MouseEvent<HTMLElement> | React.KeyboardEvent<HTMLElement>, pivotKey: string) => void) => JSX.Element;
    getCommands?: () => IPivotBarAction[];
}

export interface IArtifactsComparisonDetailsViewProps extends Base.IProps {
    environmentDefinitionId: number;
    headingLabel: string;
    headingDescription?: string;
    descriptionIconProps?: IStatusProps;
    descriptionStatus?: string;
    descriptionStatusClass?: string;
    source: string;
    isComparedToLatestArtifact: boolean;
    fetchLatest: boolean;
    primaryTab?: ITabArgs;
    showComparisonInfoHeader?: boolean;
    latestDeploymentAttemptId: number;
}

export interface IArtifactsComparisonDetailsViewState extends Base.IState {
    selectedPivotKey: string;
}

export class ArtifactsComparisonDetailsView extends Base.Component<IArtifactsComparisonDetailsViewProps, IArtifactsComparisonDetailsViewState> {

    public componentWillMount() {
        this._releaseStore = StoreManager.GetStore<ReleaseStore>(ReleaseStore);

        let defaultKey = this.props.primaryTab ?
            this.props.primaryTab.key :
            ReleaseEnvironmentPanelPivotItemKeys.c_commitsPivotItemKey;
        this.setState({
            selectedPivotKey: defaultKey
        } as IArtifactsComparisonDetailsViewState);
    }

    public render(): JSX.Element {

        return (<div className="cd-artifacts-comparison-item-view-container">
            <CustomOverlayPanelHeading
                header={this.props.headingLabel}
                descriptionLabel={this.props.headingDescription}
                hideDotIcon={true}
                descriptionIconProps={this.props.descriptionIconProps}
                descriptionStatus={this.props.descriptionStatus}
                descriptionStatusClass={this.props.descriptionStatusClass} >
            </CustomOverlayPanelHeading>
            {this._getPivotBar()}
        </div>);
    }

    private _getPivotBar(): JSX.Element {
        let artifacts = this._releaseStore.getArtifacts();
        let items = this.props.primaryTab ? [this._getPrimaryPivotBarItem()] : [];

        if (artifacts && artifacts.length > 0) {
            //commits tab
            items.push(<PivotBarItem
                className="customPadding"
                key={ReleaseEnvironmentPanelPivotItemKeys.c_commitsPivotItemKey}
                itemKey={ReleaseEnvironmentPanelPivotItemKeys.c_commitsPivotItemKey}
                name={Resources.Commits}>

                <ArtifactComparisonControllerView
                    instanceId={ReleaseEnvironmentPanelPivotItemKeys.c_commitsPivotItemKey + this.props.instanceId}
                    isComparedToLatestArtifact={this.props.isComparedToLatestArtifact}
                    showComparisonInfoHeader={this.props.showComparisonInfoHeader}
                    environmentDefinitionId={this.props.environmentDefinitionId}
                    latestDeploymentAttemptId={this.props.latestDeploymentAttemptId}
                    fetchLatest={this.props.fetchLatest}
                    getComparisonStore={(instanceId: string) => StoreManager.GetStore<CommitsComparisonStore>(CommitsComparisonStore, instanceId)} />

            </PivotBarItem>);

            //WI Tab
            items.push(<PivotBarItem
                className="customPadding"
                key={ReleaseEnvironmentPanelPivotItemKeys.c_workitemsPivotItemKey}
                itemKey={ReleaseEnvironmentPanelPivotItemKeys.c_workitemsPivotItemKey}
                name={Resources.Workitems}>

                <ArtifactComparisonControllerView
                    instanceId={ReleaseEnvironmentPanelPivotItemKeys.c_workitemsPivotItemKey + this.props.instanceId}
                    isComparedToLatestArtifact={this.props.isComparedToLatestArtifact}
                    showComparisonInfoHeader={this.props.showComparisonInfoHeader}
                    environmentDefinitionId={this.props.environmentDefinitionId}
                    latestDeploymentAttemptId={this.props.latestDeploymentAttemptId}
                    fetchLatest={this.props.fetchLatest}
                    getComparisonStore={(instanceId: string) => StoreManager.GetStore<WorkItemsComparisonStore>(WorkItemsComparisonStore, instanceId)} />

            </PivotBarItem>);
        }

        if (items.length > 0) {
            return <PivotBar
                headerAriaLabel={Resources.Overview}
                selectedPivot={this.state.selectedPivotKey}
                onPivotClicked={this._onPivotClicked}
                showPivots={true}
                isPivotBarContentScrollable={false}
                className="cd-artifacts-comparison-pivot-bar">
                {items}
            </PivotBar>;
        }

        return null;
    }

    private _getPrimaryPivotBarItem(): JSX.Element {
        if (this.props.primaryTab) {
            return (
                <PivotBarItem
                    key={this.props.primaryTab.key}
                    className="customPadding"
                    itemKey={this.props.primaryTab.key}
                    name={this.props.primaryTab.title}
                    commands={this.props.primaryTab.getCommands ? this.props.primaryTab.getCommands() : null}>

                    {this.props.primaryTab.getElement(this._onPivotClicked)}
                </PivotBarItem>
            );
        }

        return null;
    }

    private _onPivotClicked = (ev: React.MouseEvent<HTMLElement>, pivotKey: string): void => {
        this._selectPivot(pivotKey);
        this._publishPivotClickTelemetry(pivotKey);
    }

    private _selectPivot(pivotKey: string): void {

        this.setState({
            selectedPivotKey: pivotKey
        } as IArtifactsComparisonDetailsViewState);
    }

    private _publishPivotClickTelemetry(selectedTabKey: string) {
        let eventProperties: IDictionaryStringTo<any> = {};

        //TODO - confirm if telemetry is required for this.
        eventProperties[Properties.environmentPropertiesSelectedTab] = selectedTabKey;
        eventProperties[Properties.Source] = this.props.source;

        Telemetry.instance().publishEvent(Feature.EnvironmentDetailsPanel, eventProperties);
    }

    private _releaseStore: ReleaseStore;
}
