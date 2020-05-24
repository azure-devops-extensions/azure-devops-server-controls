/// <reference types="react" />

import * as React from "react";

import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import { AppContext } from "DistributedTaskControls/Common/AppContext";
import * as ComponentBase from "DistributedTaskControls/Common/Components/Base";
import { MessageBarComponent } from "DistributedTaskControls/Components/MessageBarComponent";
import { Telemetry, Feature, Properties } from "DistributedTaskControls/Common/Telemetry";
import { IPhaseSummaryViewProps, PhaseSummaryView } from "DistributedTaskUI/Logs/PhaseSummaryView";
import { TooltipIfOverflow } from "DistributedTaskControls/Components/TooltipIfOverflow";
import { StepComponent } from "DistributedTaskUI/Logs/StepComponent";
import { IStatus } from "DistributedTaskUI/Logs/Logs.Types";
import * as DTUI_Resources from "DistributedTaskUI/Logs/Resources";

import { Label } from "OfficeFabric/Label";
import { css } from "OfficeFabric/Utilities";
import { VssIconType } from "VSSUI/VssIcon";
import { MessageBarType } from "OfficeFabric/MessageBar";

import { CommonConstants, PerfScenarios } from "PipelineWorkflow/Scripts/Common/Constants";
import { ReleaseProgressNavigateStateActions } from "PipelineWorkflow/Scripts/ReleaseProgress/Constants";
import { CircularProgressIndicator, ICircularProgressIndicatorProps, IProgressIndicatorItem } from "DistributedTaskControls/Components/Canvas/CircularProgressIndicator";
import { DeploymentGroupInProgressGrid, IDeploymentGroupInProgressGridProps, IDeploymentGroupGridItemContent } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/DeploymentGroupInProgressGrid";
import { LogsTabTelemetryHelper } from "PipelineWorkflow/Scripts/ReleaseProgress/ContainerTabs/LogsTab/LogsTabTelemetryHelper";
import { LogsTabActionsCreator } from "PipelineWorkflow/Scripts/ReleaseProgress/ContainerTabs/LogsTab/LogsTabActionsCreator";
import { DeploymentGroupSummarySecondaryDetails } from "PipelineWorkflow/Scripts/ReleaseProgress/ContainerTabs/LogsTab/DeploymentGroupSummarySecondaryDetails";
import { IDeploymentGroupPhaseJobItem } from "PipelineWorkflow/Scripts/ReleaseProgress/Types";
import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";

import * as NavigationService from "VSS/Navigation/Services";
import * as Performance from "VSS/Performance";
import * as Utils_Core from "VSS/Utils/Core";
import * as Utils_String from "VSS/Utils/String";
import * as RMContracts from "ReleaseManagement/Core/Contracts";

import "VSS/LoaderPlugins/Css!RM:PipelineWorkflow/Scripts/ReleaseProgress/ContainerTabs/LogsTab/DeploymentGroupPhaseView";

export interface IMachineStatusCounts {
    completedCount: number;
    runningCount: number;
    failedCount: number;
    pendingCount: number;
}

export interface IDeploymentGroupPhaseLogsDetailsViewProps extends ComponentBase.IProps {
    environmentId: number;
    deploymentGroupPhaseId: string;
    phaseJobItem: IDeploymentGroupPhaseJobItem;
    machineStatusCounts: IMachineStatusCounts;
    deploymentGroupPhase: RMContracts.ReleaseDeployPhase;
    environment: RMContracts.ReleaseEnvironment;
}

export class DeploymentGroupPhaseView extends ComponentBase.Component<IDeploymentGroupPhaseLogsDetailsViewProps, ComponentBase.IStateless> {

    constructor(props: IDeploymentGroupPhaseLogsDetailsViewProps) {
        super(props);

        Performance.getScenarioManager().startScenario(CommonConstants.FeatureArea, PerfScenarios.DeploymentGroupGrid);
    }

    public componentDidMount(): void {
        LogsTabTelemetryHelper.publishDGPhaseClickTelemetry();

        const logsTabActionsCreator = ActionCreatorManager.GetActionCreator<LogsTabActionsCreator>(LogsTabActionsCreator, this.props.instanceId);
        logsTabActionsCreator.getDeploymentMachines(this.props.deploymentGroupPhase, this.props.environment);

        Performance.getScenarioManager().endScenario(CommonConstants.FeatureArea, PerfScenarios.DeploymentGroupGrid);
    }

    public render(): JSX.Element {
        let phaseDetails = this.props.phaseJobItem;
        const machineStatusCounts = this.props.machineStatusCounts;

        let circularProgressIndicatorProps: ICircularProgressIndicatorProps = {
            items: [{
                itemCount: machineStatusCounts.failedCount,
                cssClassForColor: "failed"
            },
            {
                itemCount: machineStatusCounts.completedCount,
                cssClassForColor: "completed"
            },
            {
                itemCount: machineStatusCounts.runningCount,
                cssClassForColor: "running"
            },
            {
                itemCount: machineStatusCounts.pendingCount,
                cssClassForColor: "pending"
            }],
            isFocusable: true,
            onClick: this._onProgressInnerContentClick,
            onKeyDown: this._onProgressInnerContentKeyPress
        };

        // Replace the -1 rank of pending machines by a larger rank,
        // so that the pending machines dont come at the start of the list on sorting.
        let pendingMachinePseudoRank = phaseDetails.jobs.length;
        const machineCount = phaseDetails.jobs.length;

        for (let i = 0; i < machineCount; i++) {
            if (phaseDetails.jobs[i].rank === -1) {
                phaseDetails.jobs[i].rank = pendingMachinePseudoRank;
                pendingMachinePseudoRank++;
            }
        }

        // Sort the list of jobs on machines by rank
        phaseDetails.jobs.sort((a, b) => a.rank - b.rank);

        let gridItems: IDeploymentGroupGridItemContent[] = phaseDetails.jobs.filter((item) => {
            if (!item.issues || item.issues.length === 0) {
                return true;
            }
            return false;
        }).map((item) => {
            return {
                jobState: item.jobState,
                machineName: item.agentName
            } as IDeploymentGroupGridItemContent;
        });

        let offlineGridItems: IDeploymentGroupGridItemContent[] = phaseDetails.jobs.filter((item) => {
            if (item.issues && item.issues.length !== 0) {
                return true;
            }
            return false;
        }).map((item) => {
            return {
                jobState: item.jobState,
                machineName: item.agentName
            } as IDeploymentGroupGridItemContent;
        });

        // Note: There are no machine-specific click targets yet since the logs page does not support the appropriate query params yet. 
        // Will add when query param support is added.
        let deploymentGridProps: IDeploymentGroupInProgressGridProps = {
            items: gridItems,
            runningItemCount: machineStatusCounts.runningCount,
            maxGridSize: 2000,
            variableSizing: true,
            onItemClick: this._onViewMachinesClick,
            environmentId: this.props.environmentId,
            deploymentGroupPhaseId: this.props.deploymentGroupPhaseId
        };

        let offlineSectionContent = this._getOfflineSectionContent(offlineGridItems);
        let isPhaseSkippedOrHasError: boolean = this._isPhaseSkipped() || this._isPhaseTargetsEmpty();

        return (
            <div className="deployment-group-logs-summary">
                <PhaseSummaryView {...this._getPhaseSummaryProperties()} cssClass="dg-phase-summary-view" />
                {isPhaseSkippedOrHasError && this._getSkippedOrErrorComponent()}
                {
                    !isPhaseSkippedOrHasError &&
                    <div className="deployment-group-machine-details">
                        <CircularProgressIndicator {...circularProgressIndicatorProps}>
                            <div className="progress-inner-content">
                                <div className={"pending-count-outer-element"}>
                                    {!this._isDeploymentGroupPhaseCompleted() && this._getDeploymentGroupMachineStatusElement(machineStatusCounts.pendingCount, Resources.DeploymentGroupsIndicatorPendingText, "pending-count", "pending-section")}
                                </div>
                                <div className="completed-section">
                                    {this._getDeploymentGroupMachineStatusElement(machineStatusCounts.completedCount, Resources.DeploymentGroupsIndicatorSucceededText, "succeeded-count", "succeeded-section")}
                                    {this._getDeploymentGroupMachineStatusElement(machineStatusCounts.failedCount, Resources.DeploymentGroupsIndicatorFailedText, "failed-count", "failed-section")}
                                </div>
                                {!this._isDeploymentGroupPhaseCompleted() && this._getDeploymentGroupMachineStatusElement(machineStatusCounts.runningCount, Resources.DeploymentGroupsIndicatorInProgressText, "in-progress-count", "in-progress-section")}
                                {this._isDeploymentGroupPhaseCompleted() && this._getPhaseCompletedPassedPercentageElement()}
                            </div>
                        </CircularProgressIndicator>
                        <div className="grids-container">
                            {
                                deploymentGridProps.items && (deploymentGridProps.items.length > 0) &&
                                <div className="deployment-grid-container">
                                    <DeploymentGroupInProgressGrid {...deploymentGridProps} />
                                </div>
                            }
                            {offlineSectionContent}
                        </div>
                    </div>
                }
            </div>
        );
    }

    private _getSkippedOrErrorComponent(): JSX.Element {

        if (this._isPhaseSkipped()) {
            return this._getPhaseSkippedContent();
        }

        if (this._isPhaseTargetsEmpty()) {
            return this._getPhaseErrorComponent();
        }

        return null;
    }

    private _isPhaseSkipped(): boolean {
        return this.props.deploymentGroupPhase.status === RMContracts.DeployPhaseStatus.Skipped;
    }

    private _isPhaseTargetsEmpty(): boolean {
        return this.props.deploymentGroupPhase.status === RMContracts.DeployPhaseStatus.Failed && this.props.phaseJobItem.jobs.length === 0;
    }

    private _getPhaseSkippedContent(): JSX.Element {
        let status: IStatus = {
            status: DTUI_Resources.PhaseSkippedText,
            iconName: "Blocked",
            className: "state-" + "skipped"
        };
        const phaseJobItem = this.props.phaseJobItem;
        const tooltipContent = phaseJobItem && phaseJobItem.resultCode;

        return (
            <div className="deployment-group-phase-error-step-component-container" data-is-focusable={true} role="status" aria-live={"assertive"}>
                <StepComponent
                    isTitleClickable={false}
                    title={status.status}
                    iconProps={{ className: css("log-task-state", status.className), iconName: status.iconName, iconType: VssIconType.fabric }}
                    infoProps={{ tooltipContent: tooltipContent, iconName: "Info", iconAriaLabel: DTUI_Resources.Info }}
                    cssClass={"logs-phase-error-step-component-content"}
                    ariaLabel={status.status}>
                </StepComponent>
            </div>
        );
    }

    private _getPhaseErrorComponent(): JSX.Element {
        let jobItem: IDeploymentGroupPhaseJobItem = this.props.phaseJobItem;
        return (
            <div className={"deployment-group-phase-error-step-component-container"}>
                <MessageBarComponent
                    messageBarType={MessageBarType.error}
                    isMultiline={false} >
                    {jobItem.tags ? Utils_String.format(Resources.NoMachineFoundWithGivenTags, this._getCommaSeparatedTags(jobItem.tags)) : Resources.NoMachineFound}
                </MessageBarComponent>
            </div>
        );
    }

    private _getCommaSeparatedTags(tags: string[]): string {
        return tags.join(", ");
    }

    private _getPhaseCompletedPassedPercentageElement(): JSX.Element {
        let passedPercentage: number = Math.floor((this.props.machineStatusCounts.completedCount / this.props.phaseJobItem.jobs.length) * 100);
        let text: string = Utils_String.localeFormat(Resources.DeploymentGroupsIndicatorPassedText, passedPercentage);

        return (
            <div className={"phase-completed-passed-percentage-element"}>
                <TooltipIfOverflow tooltip={text} targetElementClassName="deployment-group-machine-status-text">
                    <div className="deployment-group-machine-status-text">
                        {text}
                    </div>
                </TooltipIfOverflow>
            </div>
        );
    }

    private _isDeploymentGroupPhaseCompleted(): boolean {
        let status: RMContracts.DeployPhaseStatus = this.props.deploymentGroupPhase.status;

        return (status === RMContracts.DeployPhaseStatus.Succeeded)
            || (status === RMContracts.DeployPhaseStatus.Failed)
            || (status === RMContracts.DeployPhaseStatus.PartiallySucceeded)
            || (status === RMContracts.DeployPhaseStatus.Canceled);
    }

    private _getDeploymentGroupMachineStatusElement(count: number, text: string, countClassName: string, sectionClassName: string): JSX.Element {
        return (
            <div className={css("section", sectionClassName)}>
                <div className={countClassName}>
                    {count}
                </div>
                <TooltipIfOverflow tooltip={text} targetElementClassName="deployment-group-machine-status-text">
                    <div className="deployment-group-machine-status-text">
                        {text}
                    </div>
                </TooltipIfOverflow>
            </div>
        );
    }

    protected _getPhaseSummaryProperties(): IPhaseSummaryViewProps {
        const dgPhaseJobItem = this.props.phaseJobItem as IDeploymentGroupPhaseJobItem;

        if (dgPhaseJobItem) {
            return {
                name: dgPhaseJobItem.name,
                startTime: dgPhaseJobItem.startTime,
                finishTime: dgPhaseJobItem.finishTime,
                logUrl: dgPhaseJobItem.logUrl,
                onRenderSecondaryDetailsLeftSection: this._getDGPhaseSecondaryDetails,
                pageContext: AppContext.instance().PageContext as any
            };
        } else {
            return null;
        }
    }

    private _getDGPhaseSecondaryDetails = (): JSX.Element => {
        const dgPhaseJobItem = this.props.phaseJobItem as IDeploymentGroupPhaseJobItem;
        return (
            <DeploymentGroupSummarySecondaryDetails tags={dgPhaseJobItem.tags} machineGroupId={dgPhaseJobItem.machineGroupId}>
            </DeploymentGroupSummarySecondaryDetails>
        );
    }

    private _onViewMachinesClick = () => {
        NavigationService.getHistoryService().addHistoryPoint(ReleaseProgressNavigateStateActions.ReleaseEnvironmentDeploymentGroupLogs, { environmentId: this.props.environmentId, deploymentGroupPhaseId: this.props.deploymentGroupPhaseId }, null, false, true);
    }

    private _getOfflineSectionContent(offlineGridItems: IDeploymentGroupGridItemContent[]): JSX.Element {
        let offlineGridProps: IDeploymentGroupInProgressGridProps;
        let offlineTargetsText: string;

        if (offlineGridItems.length > 0) {
            offlineGridProps = {
                items: offlineGridItems,
                runningItemCount: offlineGridItems.length,
                maxGridSize: 2000,
                variableSizing: true,
                onItemClick: this._onViewMachinesClick,
                environmentId: this.props.environmentId,
                deploymentGroupPhaseId: this.props.deploymentGroupPhaseId
            };

            if (offlineGridItems.length > 1) {
                offlineTargetsText = Utils_String.format(Resources.DeploymentGroupsSkippedOfflinePluralText, offlineGridItems.length);
            }
            else {
                offlineTargetsText = Utils_String.format(Resources.DeploymentGroupsSkippedOfflineSingularText, offlineGridItems.length);
            }

            return <div className="offline-section-container">
                <Label className="offline-targets-text">
                    {offlineTargetsText}
                </Label>
                <div className="offline-grid-container">
                    <DeploymentGroupInProgressGrid {...offlineGridProps} />
                </div>
            </div>;
        }

        return null;
    }

    private _onProgressInnerContentClick = (): void => {
        this._publishInnerContentClickTelemetry();

        NavigationService.getHistoryService().addHistoryPoint(ReleaseProgressNavigateStateActions.ReleaseEnvironmentDeploymentGroupLogs, { environmentId: this.props.environmentId, deploymentGroupPhaseId: this.props.deploymentGroupPhaseId }, null, false, true);
    }

    private _onProgressInnerContentKeyPress = (event: React.KeyboardEvent<HTMLDivElement>): void => {
        if (event.key === "Enter" || event.key === " " || event.key === "Spacebar") {
            this._onProgressInnerContentClick();
        }
    }

    private _publishInnerContentClickTelemetry(): void {
        let eventProperties: IDictionaryStringTo<any> = {};

        Telemetry.instance().publishEvent(Feature.DeploymentGroupPhaseView, eventProperties);
    }
}