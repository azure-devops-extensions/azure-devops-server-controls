import * as React from "react";

import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { IJobSortOrder, JobSortType, JobStates } from "DistributedTaskUI/Logs/Logs.Types";

import { ContributionIds } from "PipelineWorkflow/Scripts/Common/Constants";
import { NavigationStateUtils } from "PipelineWorkflow/Scripts/Common/NavigationStateUtils";
import { ReleaseSummaryEnvironmentTabsPivotItemKeys } from "PipelineWorkflow/Scripts/ReleaseProgress/Constants";
import {
    DeploymentGroupLogsStore,
    IDeploymentGroupLogsArgs,
} from "PipelineWorkflow/Scripts/ReleaseProgress/ContainerTabs/LogsTab/DeploymentGroupLogsStore";
import {
    DeploymentGroupLogsTabActionCreator,
} from "PipelineWorkflow/Scripts/ReleaseProgress/ContainerTabs/LogsTab/DeploymentGroupLogsTabActionCreator";
import { LogsTab } from "PipelineWorkflow/Scripts/ReleaseProgress/ContainerTabs/LogsTab/LogsTab";
import { IEnvironmentProgressHubProps } from "PipelineWorkflow/Scripts/ReleaseProgress/EnvironmentProgressHub";
import { IProgressHubProps, ProgressHub } from "PipelineWorkflow/Scripts/ReleaseProgress/ProgressHub";
import { IProgressHubViewState } from "PipelineWorkflow/Scripts/ReleaseProgress/ProgressHubViewStore";
import {
    ReleaseDeploymentAttemptHelper,
} from "PipelineWorkflow/Scripts/ReleaseProgress/ReleaseEnvironment/ReleaseDeploymentAttemptHelper";
import {
    IReleaseHubDataProvider,
    ReleaseHubDataProvider,
} from "PipelineWorkflow/Scripts/ReleaseProgress/ReleaseHubDataProvider";
import { ILogsFilterState } from "PipelineWorkflow/Scripts/ReleaseProgress/Types";
import { ReleaseBreadcrumbUtils } from "PipelineWorkflow/Scripts/ReleaseProgress/Utilities/ReleaseBreadcrumbUtils";
import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";

import * as RMContracts from "ReleaseManagement/Core/Contracts";
import { IReleaseEnvironmentExtensionContext } from "ReleaseManagement/Core/ExtensionContracts";

import { ContributablePivotItemProvider } from "VSSPreview/Providers/ContributablePivotItemProvider";
import { IHubBreadcrumbItem } from "VSSUI/Components/HubHeader/HubBreadcrumb.Props";
import { IFilterState } from "VSSUI/Utilities/Filter";
import { HubHeader, IHubHeaderProps } from "VSSUI/HubHeader";
import { IPivotBarAction, PivotBarItem } from "VSSUI/PivotBar";
import * as Utils_Accessibility from "VSS/Utils/Accessibility";
import * as Utils_String from "VSS/Utils/String";

import "VSS/LoaderPlugins/Css!RM:PipelineWorkflow/Scripts/ReleaseProgress/DeploymentGroupLogsHub";

export interface IDeploymentGroupLogsHub extends IProgressHubProps {
    deploymentGroupPhaseId: number;
    environmentId: number;
}

export class DeploymentGroupLogsHub extends ProgressHub<IDeploymentGroupLogsHub, IProgressHubViewState> {

    constructor(props: IEnvironmentProgressHubProps) {
        super(props);
        this._hubDataProvider = new ReleaseHubDataProvider(this._getSelectedEnvironment);
        this._deploymentGroupPhaseId = NavigationStateUtils.getDeploymentGroupPhaseId();
        this._environmentId = NavigationStateUtils.getEnvironmentId();
        this._agentName = NavigationStateUtils.getAgentName();
        this._jobStates = NavigationStateUtils.getJobStates();
        this._deploymentGroupLogsTabActionCreator = ActionCreatorManager.GetActionCreator<DeploymentGroupLogsTabActionCreator>(DeploymentGroupLogsTabActionCreator, this._deploymentGroupPhaseId.toString());
        this._showPivots = () => {
            return true;
        };
    }

    public componentDidMount(): void {        
        this._deploymentGroupLogsTabActionCreator.getDeploymentMachines(this._getDeploymentGroupPhase(), this._getSelectedEnvironment());
    }

    protected _getPivotProviders(): ContributablePivotItemProvider<IReleaseEnvironmentExtensionContext>[] {
        if (!this._contributedPivotItemProviders) {
            this._contributedPivotItemProviders = [
                this._hubDataProvider.getReleaseEnvironmentContextPivotItemProvider(ContributionIds.ReleaseEnvironmentDeploymentGroupLogsPivotContributionId)
            ];
        }
        return this._contributedPivotItemProviders;
    }

    protected _onSelectedPivotChange(pivot: string): void {
        //Nothing to do here as there is only one pivot
        return;
    }

    protected _getLogsItem(): JSX.Element {

        let deploymentGroupPhase: RMContracts.ReleaseDeployPhase = this._getDeploymentGroupPhase();

        let deploymentGroupsLogStore = StoreManager.CreateStore<DeploymentGroupLogsStore, IDeploymentGroupLogsArgs>(DeploymentGroupLogsStore, this._deploymentGroupPhaseId.toString(), {
            deploymentGroupPhaseId: this._deploymentGroupPhaseId,
            environmentInstanceId: this.props.instanceId
        });

        let logsState = deploymentGroupsLogStore.getState();
        const selectedSortOrder = logsState ? logsState.selectedSortOrder : null;
        let currentFilterState = null;
        if (this._agentName) {
            currentFilterState = { filterText: this._agentName, jobStates: JobStates.Undefined };
        }
        if (this._jobStates) {
            let selectedJobStates: JobStates = JobStates.Undefined;

            switch (this._jobStates.toLowerCase()) {
                case "pending":
                    selectedJobStates |= JobStates.Pending;
                    break;
                case "succeeded":
                    selectedJobStates |= JobStates.Succeeded | JobStates.PartiallySucceeded;
                    break;
                case "inprogress":
                    selectedJobStates |= JobStates.InProgress;
                    break;
                case "failed":
                    selectedJobStates |= JobStates.Failed | JobStates.Cancelled | JobStates.Cancelling | JobStates.Skipped;
                    break;
            }

            if (selectedJobStates !== JobStates.Undefined) {
                if (!currentFilterState) {
                    currentFilterState = { filterText: null, jobStates: selectedJobStates };
                }
                else {
                    currentFilterState.jobStates = selectedJobStates;
                }
            }
        }        

        return (
            <PivotBarItem
                className="customPadding"
                name={Resources.LogsTabItemTitle}
                key={ReleaseSummaryEnvironmentTabsPivotItemKeys.c_logsPivotItemKey}
                itemKey={ReleaseSummaryEnvironmentTabsPivotItemKeys.c_logsPivotItemKey}>

                <LogsTab
                    key={this.props.instanceId}
                    store={deploymentGroupsLogStore}
                    instanceId={this.props.instanceId}
                    releaseId={this.props.releaseId}
                    isEditMode={this.state.isEditMode}
                    shouldVirtualize={() => { return true; }}
                    sortProperties={{
                        sortFilters: this._getSortFilters(),
                        title: Resources.SortOrder,
                        selectedSortOrder: selectedSortOrder
                    }}
                    filterProperties={{
                        onFilterChanged: (filterState: ILogsFilterState) => {
                            this._deploymentGroupLogsTabActionCreator.filtersChanged(filterState);
                            Utils_Accessibility.announce(Utils_String.format(Resources.DeploymentGroupLogsFilterChangedText, deploymentGroupsLogStore.getLogItems().length), true);
                        },
                        currentFilterState: currentFilterState
                    }}
                />
            </PivotBarItem>
        );
    }

    private _getSortFilters(): IJobSortOrder[] {
        return [{
            displayName: Resources.SortByStartTime,
            sortType: JobSortType.StartTimeAsc
        },
        {
            displayName: Resources.SortBySlowestFirst,
            sortType: JobSortType.DurationDesc
        },
        {
            displayName: Resources.SortByFastestFirst,
            sortType: JobSortType.DurationAsc
        }];
    }

    protected _getPivotBarItems(): JSX.Element[] {
        let pivotItems: JSX.Element[] = [];
        pivotItems.push(this._getLogsItem());
        return pivotItems;
    }

    protected _getHubHeader(): JSX.Element {
        const hubHeaderProps: IHubHeaderProps = {
            title: this._getDeploymentGroupPhase().name,
            breadcrumbItems: this._getBreadcrumbItems(this.props.releaseId)
        };
        return <HubHeader {...hubHeaderProps} />;
    }

    private _getBreadcrumbItems(releaseId: number): IHubBreadcrumbItem[] {
        let breadcrumbItems: IHubBreadcrumbItem[] = ReleaseBreadcrumbUtils.getBreadcrumbItemsForEnvironment(this.viewStore.getRelease(), this.props.environmentId);
        return breadcrumbItems;
    }

    protected _getHubCommandItems(): IPivotBarAction[] {
        return [];
    }

    private _getDeploymentGroupPhase(): RMContracts.ReleaseDeployPhase {
        let attemptNumber = ReleaseDeploymentAttemptHelper.getAttemptNumberForPhase(this._deploymentGroupPhaseId, this._getSelectedEnvironment().deploySteps);
        let matchingAttempt = ReleaseDeploymentAttemptHelper.getDeploymentAttemptForAttemptNumber(this._getSelectedEnvironment().deploySteps, attemptNumber);
        return ReleaseDeploymentAttemptHelper.getDeploymentGroupPhase(matchingAttempt, this.props.deploymentGroupPhaseId);
    }

    private _getSelectedEnvironment = (): RMContracts.ReleaseEnvironment => {
        let selectedEnvironment: RMContracts.ReleaseEnvironment;
        let release: RMContracts.Release = this.viewStore.getRelease();
        if (release && release.environments) {
            // By default select first environment
            selectedEnvironment = release.environments[0];
            release.environments.some((environment) => {
                if (environment.id === this.props.environmentId) {
                    selectedEnvironment = environment;
                    return true;
                }
            });
        }

        return selectedEnvironment;
    }

    private _contributedPivotItemProviders: ContributablePivotItemProvider<IReleaseEnvironmentExtensionContext>[];
    private _deploymentGroupPhaseId: number;
    private _environmentId: number;
    private _agentName: string;
    private _jobStates: string;
    private _deploymentGroupLogsTabActionCreator: DeploymentGroupLogsTabActionCreator;
    private _hubDataProvider: IReleaseHubDataProvider;
}
