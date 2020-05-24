/// <reference types="react" />

import * as React from "react";

import * as ComponentBase from "VSS/Flux/Component";
import * as Utils_String from "VSS/Utils/String";
import * as Utils_Array from "VSS/Utils/Array";
import { PivotBarItem } from "VSSUI/PivotBar";
import { HubHeader, IHubHeaderProps } from "VSSUI/HubHeader";
import { IHeaderItemPicker, IHubBreadcrumbItem } from "VSSUI/Components/HubHeader/HubBreadcrumb.Props";
import { IPivotBarAction, IPivotBarViewAction } from "VSSUI/Components/PivotBar/PivotBarAction.Props";
import { VssIconType } from "VSSUI/Components/VssIcon/VssIcon.Props";

import { autobind } from "OfficeFabric/Utilities";
import { PivotItem } from "OfficeFabric/Pivot";
import { Dropdown, IDropdownOption, IDropdownState } from "OfficeFabric/Dropdown";
import { ContributionSource } from "DistributedTaskControls/Sources/ContributionSource";
import { ContributionComponent } from "DistributedTaskControls/Components/ContributionComponent";
import { Collapsible } from "DistributedTaskControls/SharedControls/Collapsible/Collapsible";
import * as ReleaseExtensionContracts from "ReleaseManagement/Core/ExtensionContracts";

import { IContributionHostBehavior } from "VSS/Contributions/Controls";
import * as ReleaseContracts from "ReleaseManagement/Core/Contracts";
import { LoadingComponent } from "DistributedTaskControls/Components/LoadingComponent";
import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";
import { DefinitionsUtils } from "PipelineWorkflow/Scripts/Definitions/Utils/DefinitionsUtils";
import { ReleaseReportingHeroMatrixNavigateStateActions } from "PipelineWorkflow/Scripts/SharedComponents/ReleaseReporting/Constants";
import { DeploymentTimeTrendChart, IDeploymentTimeTrendChartProps } from "PipelineWorkflow/Scripts/SharedComponents/ReleaseReporting/Charts/DeploymentTimeTrendChart";

import "VSS/LoaderPlugins/Css!RM:PipelineWorkflow/Scripts/SharedComponents/ReleaseReporting/ReleaseReportingDialog";

import * as Base from "DistributedTaskControls/Common/Components/Base";
import * as ReportingStore from "PipelineWorkflow/Scripts/SharedComponents/ReleaseReporting/ReleaseReportingStore";
import * as ActionsCreator from "PipelineWorkflow/Scripts/SharedComponents/ReleaseReporting/ReleaseReportingActionsCreator";
import { ProgressIndicatorStore } from "PipelineWorkflow/Scripts/Common/Stores/ProgressIndicatorStore";
import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";

export interface IDeploymentDurationProps extends Base.IProps {
    definitionId: number;
    definitionName?: string;
    releaseReportingDialogStore: ReportingStore.ReleaseReportingStore;
    releaseReportingActionsCreator: ActionsCreator.ReleaseReportingActionsCreator;
    instanceId: string;
    defaultPivot?: string;
}

export interface IDefinitionTrendChartProps extends ComponentBase.Props {
    environmentDeployments: IEnvironmentDeployments[];
}

export interface IEnvironmentDeployments {
    environmentId: number;
    environmentName: string;
    deployments: IDeploymentRenderingData[];
}

export interface IDeploymentRenderingData {
    id: number;
    status: number;
    startedOn: Date;
    completedOn: Date;
    totalTimeInSeconds: number;
}

export class ReleaseReportingDeploymentDurationHub extends Base.Component<IDeploymentDurationProps, ReportingStore.IReleaseReportingState> {

    constructor(props: IDeploymentDurationProps) {
        super(props);
        this._initialize();
    }

    public render(): JSX.Element {
        return (
            this._getPerformanceClusterSection()
        );
    }

    public componentWillMount() {
        this._handleStoreChange();
        this._store.addChangedListener(this._handleStoreChange);
    }

    public componentWillUnmount() {
        this._store.removeChangedListener(this._handleStoreChange);

        ActionCreatorManager.DeleteActionCreator<ActionsCreator.ReleaseReportingActionsCreator>(ActionsCreator.ReleaseReportingActionsCreator, this._instanceId);

        StoreManager.DeleteStore<ReportingStore.ReleaseReportingStore>(ReportingStore.ReleaseReportingStore, this._instanceId);
        StoreManager.DeleteStore<ProgressIndicatorStore>(ProgressIndicatorStore, this._instanceId);
    }

    private _initialize(): void {
        this._instanceId = this.props.instanceId;
        this._store = this.props.releaseReportingDialogStore;
        this._actionsCreator = this.props.releaseReportingActionsCreator;
    }

    private _handleStoreChange = (): void => {
        this.setState(this._store.getState());
    }

    protected _getPerformanceClusterSection(): JSX.Element {
        let definitionTrendChartProps: IDefinitionTrendChartProps = {
            environmentDeployments: !!this.state.environmentDeployments ? this.state.environmentDeployments : [],
        };
        return (
            <PivotBarItem
                name="release-report-performance-cluster"
                itemKey="release-report-performance-cluster"
                viewActions={this._getViewActions()}>
                {this.state.showReleaseReportFilterBar &&
                    <div className="release-report-days-filter">
                        <Dropdown
                            className="release-report-days-filter-drop-down"
                            placeHolder={Resources.ReportingAnalyzeFilterDefaultText}
                            onChanged={(item: any, i) => this._onDaysSelected(item)}
                            selectedKey={this.state.numberOfDaysToFilter}
                            options={this._getDaysToFilterOption()} />
                    </div>}
                {this._getSeparator()}
                <PivotItem linkText={Resources.ReportingDeploymentDuration}>
                    {this._getDeploymentTimeChartByEnvironment(definitionTrendChartProps)}
                </PivotItem>

            </PivotBarItem>
        );
    }

    private _getSeparator(): JSX.Element {
        return (<div className="release-report-empty-separator"></div>);
    }

    private _getDaysToFilterOption(): IDropdownOption[] {
        return ([
            { key: 7, text: Resources.ReportingAnalyzeFor7Days },
            { key: 15, text: Resources.ReportingAnalyzeFor15Days },
            { key: 30, text: Resources.ReportingAnalyzeFor30Days }]);
    }

    private _onDaysSelected(item: any): void {
        let numberOfDaysToFilter: number = item.key;
        let state = this._store.getState();
        state.numberOfDaysToFilter = numberOfDaysToFilter;
        state.showReleaseReportFilterBar = false;
        this.setState(state);
        this._actionsCreator.updateDeployments(this.props.definitionId, numberOfDaysToFilter);
    }

    private _getViewActions(): IPivotBarViewAction[] {
        const viewActions: IPivotBarViewAction[] = [];
        viewActions.push(
            {
                key: "release-analysis-filter-icon",
                iconProps: { iconName: "Filter", iconType: VssIconType.fabric },
                important: true,
                onClick: this._onReleaseReportFilterCommandClick
            }
        );
        return viewActions;
    }

    @autobind
    private _onReleaseReportFilterCommandClick(): void {
        let currState: boolean = this.state.showReleaseReportFilterBar;
        this.setState({ showReleaseReportFilterBar: !currState });
    }

    private _getDeploymentTimeChartByEnvironment(definitionTrendChartProps: IDefinitionTrendChartProps): JSX.Element[] {
        let environmentsList: JSX.Element[] = [];
        let isFirstEnvironment: boolean = true;
        if (!!definitionTrendChartProps.environmentDeployments) {
            definitionTrendChartProps.environmentDeployments.forEach((environmentDeployment) => {
                let totalDeployments: number = !!environmentDeployment.deployments ? environmentDeployment.deployments.length : 0;
                let successfulDeployment: number = this._getSuccessfulDeployment(environmentDeployment);
                let failedDeployment: number = this._getFailedDeployment(environmentDeployment);
                let medianDeploymentTime: number = this._getMedianOfDeployments(environmentDeployment);
                environmentsList.push((
                    <div className={`deployment-trend`} key={environmentDeployment.environmentId}>
                        {!isFirstEnvironment && this._getSeparator()}
                        <div className="release-report-environment-container">
                            <div className="release-report-environment-matrix-env-name">
                                {environmentDeployment.environmentName}
                            </div>
                            <div className="release-report-environment-matrix-env-container">
                                <div className="release-report-environment-matrix-env-aggregate">{medianDeploymentTime}</div>
                                <div className="release-report-environment-matrix-text">{Resources.ReportingEnvironmentMedian}</div>
                            </div>
                            <div className="release-report-environment-matrix-env-container release-report-empty-vertical-separator" />
                            <div className="release-report-environment-matrix-env-container">
                                <div className="release-report-environment-matrix-env-aggregate">{totalDeployments}</div>
                                <div className="release-report-environment-matrix-text">{Resources.ReportingEnvironmentTotalDeployment}</div>
                            </div>
                            <div className="release-report-environment-matrix-env-container release-report-empty-vertical-separator" />
                            <div className="release-report-environment-matrix-env-container">
                                <div className="release-report-environment-matrix-env-aggregate">{successfulDeployment}</div>
                                <div className="release-report-environment-matrix-text release-report-success-icon" />
                                <div className="release-report-environment-matrix-text">{Resources.ReportingEnvironmentSuccessfulDeployment}</div>
                            </div>
                            <div className="release-report-environment-matrix-env-container release-report-empty-vertical-separator" />
                            <div className="release-report-environment-matrix-env-container">
                                <div className="release-report-environment-matrix-env-aggregate">{failedDeployment}</div>
                                <div className="release-report-environment-matrix-text release-report-failed-icon" />
                                <div className="release-report-environment-matrix-text">{Resources.ReportingEnvironmentFailedDeployment}</div>
                            </div>
                        </div>
                        {this._getSeparator()}
                        {
                            environmentDeployment && environmentDeployment.deployments &&
                            <DeploymentTimeTrendChart key={environmentDeployment.environmentName} {...this._getSelectDeploymentByEnvironmentProps(environmentDeployment)} />
                        }
                    </div>
                ));
                isFirstEnvironment = false;
            });
        }
        return environmentsList;
    }

    private _getMedianOfDeployments(environmentDeployment: IEnvironmentDeployments): number {
        if (!!environmentDeployment.deployments && environmentDeployment.deployments.length > 0) {
            let deployments = Utils_Array.clone(environmentDeployment.deployments);
            let sortedArray = deployments.sort((n1, n2) => n1.totalTimeInSeconds - n2.totalTimeInSeconds);
            let length: number = sortedArray.length;
            let midIndex: number = Math.floor(length / 2);
            let nextMidIndex: number = midIndex + 1;
            let median = (length > 1 && length % 2 === 0) ? (sortedArray[midIndex].totalTimeInSeconds + sortedArray[nextMidIndex].totalTimeInSeconds) / 2 : sortedArray[midIndex].totalTimeInSeconds;

            return Math.round(median * 10) / 10;
        }
        return 0;
    }

    private _getSuccessfulDeployment(environmentDeployment: IEnvironmentDeployments): number {
        if (!!environmentDeployment.deployments) {
            let result = environmentDeployment.deployments.filter(deployment => deployment.status === ReleaseContracts.DeploymentStatus.Succeeded);
            return result.length;
        }
        return 0;
    }

    private _getFailedDeployment(environmentDeployment: IEnvironmentDeployments): number {
        if (!!environmentDeployment.deployments) {
            let result = environmentDeployment.deployments.filter(deployment => deployment.status === ReleaseContracts.DeploymentStatus.Failed);
            return result.length;
        }
        return 0;
    }

    private _getSelectDeploymentByEnvironmentProps(environmentDeployments: IEnvironmentDeployments): IDeploymentTimeTrendChartProps {
        // using full width of the screen to scale well, leaving 50 px so that scroll bar doesnot appear
        let width = window.innerWidth - 100;
        let props: IDeploymentTimeTrendChartProps = {
            environmentDeployments: environmentDeployments,
            chartHeight: 500,
            chartWidth: width,
            suppressAnimation: true
        };

        return props;
    }

    private _store: ReportingStore.ReleaseReportingStore;
    private _actionsCreator: ActionsCreator.ReleaseReportingActionsCreator;
    private _instanceId: string;
}