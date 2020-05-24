/// <reference types="react" />
import * as Q from "q";
import * as React from "react";

import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import { AppContext } from "DistributedTaskControls/Common/AppContext";
import * as Base from "DistributedTaskControls/Common/Components/Base";
import { GuidPatternRegEx } from "DistributedTaskControls/Common/RegexConstants";
import { ISortJobItemsComponentProps, SortJobItemsMenuComponent } from "DistributedTaskControls/Components/SortJobItemsMenuComponent";

import { AgentlessPhaseLogsDetailsView } from "DistributedTaskUI/Logs/AgentlessPhaseLogsDetailsView";
import { AgentPhaseLogsDetailsView } from "DistributedTaskUI/Logs/AgentPhaseLogsDetailsView";
import { IAgentPhaseJobItem, IJobItem, IJobSortOrder, IPhaseJobItem, IServerPhaseJobItem, ITaskLog, JobSortType, JobStates, JobType } from "DistributedTaskUI/Logs/Logs.Types";
import { StepComponent } from "DistributedTaskUI/Logs/StepComponent";
import { VerticalTabItem } from "DistributedTaskUI/Logs/VerticalTab/VerticalTabItem";
import { IVerticalTabItemProps } from "DistributedTaskUI/Logs/VerticalTab/VerticalTabItem.Types";
import { VerticalTabList } from "DistributedTaskUI/Logs/VerticalTab/VerticalTabList";

import { Async, autobind } from "OfficeFabric/Utilities";

import { NavigationStateUtils } from "PipelineWorkflow/Scripts/Common/NavigationStateUtils";
import { ManualInterventionTaskDefinitionId as MIDefinitionId } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleaseManualInterventionDetailsViewStore";
import { DeploymentGroupAgentLogsDetailsView } from "PipelineWorkflow/Scripts/ReleaseProgress/ContainerTabs/LogsTab/DeploymentGroupAgentLogsDetailsView";
import { DeploymentGroupLogsStore } from "PipelineWorkflow/Scripts/ReleaseProgress/ContainerTabs/LogsTab/DeploymentGroupLogsStore";
import { DeploymentGroupPhaseView } from "PipelineWorkflow/Scripts/ReleaseProgress/ContainerTabs/LogsTab/DeploymentGroupPhaseView";
import { DeploymentStatusControllerView } from "PipelineWorkflow/Scripts/ReleaseProgress/ContainerTabs/LogsTab/DeploymentStatusControllerView";
import { DeploymentStatusOverview } from "PipelineWorkflow/Scripts/ReleaseProgress/ContainerTabs/LogsTab/DeploymentStatusOverview";
import { ILogsState, ILogsStore } from "PipelineWorkflow/Scripts/ReleaseProgress/ContainerTabs/LogsTab/ILogsStore";
import { LogsTabActionsCreator } from "PipelineWorkflow/Scripts/ReleaseProgress/ContainerTabs/LogsTab/LogsTabActionsCreator";
import { LogsTabApprovalDetailsView } from "PipelineWorkflow/Scripts/ReleaseProgress/ContainerTabs/LogsTab/LogsTabApprovalDetailsView";
import { LogsTabFiltersView } from "PipelineWorkflow/Scripts/ReleaseProgress/ContainerTabs/LogsTab/LogsTabFiltersView";
import { LogsTabGatesDetailsView } from "PipelineWorkflow/Scripts/ReleaseProgress/ContainerTabs/LogsTab/LogsTabGatesDetailsView";
import { DeploymentAttemptActionCreator } from "PipelineWorkflow/Scripts/ReleaseProgress/DeploymentAttempt/DeploymentAttemptActionCreator";
import { LogsTabManualInterventionLogComponent } from "PipelineWorkflow/Scripts/ReleaseProgress/ContainerTabs/LogsTab/LogsTabManualInterventionLogComponent";
import { LogsTabTelemetryHelper } from "PipelineWorkflow/Scripts/ReleaseProgress/ContainerTabs/LogsTab/LogsTabTelemetryHelper";
import { ReleasePhaseHelper } from "PipelineWorkflow/Scripts/ReleaseProgress/ContainerTabs/LogsTab/ReleasePhaseHelper";
import { JobRequestsControllerView } from "PipelineWorkflow/Scripts/ReleaseProgress/JobRequests/JobRequestsControllerView";
import { ReleaseDeploymentAttemptHelper } from "PipelineWorkflow/Scripts/ReleaseProgress/ReleaseEnvironment/ReleaseDeploymentAttemptHelper";
import { ReleaseEnvironmentActionCreator } from "PipelineWorkflow/Scripts/ReleaseProgress/ReleaseEnvironment/ReleaseEnvironmentActionCreator";
import { IManualInterventionLog } from "PipelineWorkflow/Scripts/ReleaseProgress/ReleaseEnvironment/ReleaseEnvironmentTypes";
import { ReleaseSignalRManager } from "PipelineWorkflow/Scripts/ReleaseProgress/ReleaseSignalRManager";
import { IDeploymentGroupPhaseJobItem, IDeploymentStatusJobItem, IGatesStatusJobItem, ILogsFilterState } from "PipelineWorkflow/Scripts/ReleaseProgress/Types";
import { ReleaseEnvironmentIssuesHelper } from "PipelineWorkflow/Scripts/Shared/Environment/ReleaseEnvironmentIssuesHelper";
import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";

import * as RMContracts from "ReleaseManagement/Core/Contracts";

import * as ReleaseEventManager from "ReleasePipeline/Scripts/TFS.ReleaseManagement.ReleaseHub.ConnectionManager";

import { empty, equals as String_equals, localeFormat } from "VSS/Utils/String";

import { Statuses } from "VSSUI/Status";
import { VssIconType } from "VSSUI/VssIcon";

import "VSS/LoaderPlugins/Css!RM:PipelineWorkflow/Scripts/ReleaseProgress/ContainerTabs/LogsTab/LogsTab";

export interface ILogsTabProps extends Base.IProps {
    releaseId: number;
    store: ILogsStore;
    isEditMode?: boolean;
    sortProperties?: ILogsTabSortProps;
    filterProperties?: ILogsTabFilterBarProps;
    shouldVirtualize?: () => boolean;
}

export interface ILogsTabSortProps {
    sortFilters: IJobSortOrder[];
    title: string;
    selectedSortOrder?: JobSortType;
}

export interface ILogsTabFilterBarProps {
    onFilterChanged?: (filterState: ILogsFilterState) => void;
    currentFilterState?: ILogsFilterState;
}

export interface ILogsTabState extends ILogsState {
    currentSortFilter?: JobSortType;
}

export class LogsTab extends Base.Component<ILogsTabProps, ILogsTabState> {

    constructor(props: ILogsTabProps) {
        super(props);
        this._logsTabViewStore = this.props.store;
        this._logsTabActionsCreator = ActionCreatorManager.GetActionCreator<LogsTabActionsCreator>(LogsTabActionsCreator, this.props.instanceId);
        this._actionCreator = ActionCreatorManager.GetActionCreator(ReleaseEnvironmentActionCreator, this.props.instanceId);
        this.state = this._getState();
    }

    public componentWillMount(): void {
        this._logsTabViewStore.addChangedListener(this._handleChange);
        if (this.props.isEditMode) {
            ReleaseSignalRManager.instance().markEventForAttaching(ReleaseEventManager.ReleaseHubEvents.RELEASETASK_LOG_UPDATED, this._releaseTaskLogUpdatedEventHandler);
        }
        else {
            ReleaseSignalRManager.instance().attachEvent(ReleaseEventManager.ReleaseHubEvents.RELEASETASK_LOG_UPDATED, this._releaseTaskLogUpdatedEventHandler);
        }
        this._subscribeToNewJobLogs();
    }

    public componentDidMount(): void {
        super.componentDidMount();
        this._async.setInterval(() => {
            this._actionCreator.refreshEnvironmentLocal();
        }, this._refreshIntervalInSeconds * 1000);
        LogsTabTelemetryHelper.publishLogsTabLoadTelemetry(this.state.environment, this.state.logItems);
    }

    public componentWillUnmount(): void {
        this._async.dispose();
        this._logsTabViewStore.removeChangedListener(this._handleChange);
        //While user is in edit mode and logs tab mounts, we are not actually attaching the event. We are just storing in thr dictionary.
        //Then, when user moves to other tabs we do not want to detach this event as it was never attached. We just need to remove it from the dictionary.
        if (this.props.isEditMode) {
            ReleaseSignalRManager.instance().clearAlreadyDetachedEvent(ReleaseEventManager.ReleaseHubEvents.RELEASETASK_LOG_UPDATED, this._releaseTaskLogUpdatedEventHandler);
        }
        else {
            ReleaseSignalRManager.instance().detachEvent(ReleaseEventManager.ReleaseHubEvents.RELEASETASK_LOG_UPDATED, this._releaseTaskLogUpdatedEventHandler);
        }
    }

    public render(): JSX.Element {
        return (
            <div className="cd-logs-tab-container">
                {this._renderLogsTab()}
            </div>);
    }

    private _renderLogsTab(): JSX.Element {
        const selectedKey: string = this.state.currentSelectedItemKey;
        const environment = this.state.environment;
        const logItems: IJobItem[] = this.state.logItems;
        if (environment && environment.status !== RMContracts.EnvironmentStatus.NotStarted && environment.status !== RMContracts.EnvironmentStatus.Scheduled) {
            return <div className="cd-logs-tab">
                {this._getFiltersView()}
                <VerticalTabList
                    selectedKey={selectedKey}
                    leftClassName={"cd-logs-tab-left-section"}
                    rightClassName={"cd-logs-tab-right-section"}
                    leftPaneARIARegionRoleLabel={Resources.ARIALabelLogsLeftPane}
                    rightPaneARIARegionRoleLabel={Resources.ARIALabelLogsRightPane}
                    onItemClick={this._onItemClick}
                    listProps={{ onShouldVirtualize: !!this.props.shouldVirtualize ? this.props.shouldVirtualize : (() => { return false; }) }}>
                    {
                        this._getLogsViewItems(logItems)
                    }
                </VerticalTabList>
            </div>;
        } else {
            const environment = this.state.environment;
            if (environment) {
                const releaseName = environment.release ? environment.release.name : empty;
                const environmentName = environment.name;
                const text = localeFormat(Resources.LogsTabNotDeployedEnvironmentText, releaseName, environmentName);
                return <StepComponent
                    isTitleClickable={false}
                    title={text}
                    statusProps={{ statusProps: Statuses.Queued }}
                    cssClass={"cd-logs-not-deployed-environment"}>
                </StepComponent>;
            } else {
                return null;
            }
        }
    }

    private _getFiltersView(): JSX.Element {
        let filtersView: JSX.Element = null;
        if (this.props.filterProperties) {
            filtersView = <LogsTabFiltersView onFilterChanged={this.props.filterProperties.onFilterChanged} currentFilterState={this.props.filterProperties.currentFilterState} />;
        }
        return filtersView;
    }

    private _getLogsViewItems(items: IJobItem[]): JSX.Element[] {
        let elements: JSX.Element[] = [];
        if (this.props.sortProperties) {
            const sortComponent = this._renderSortJobItemsComponent();
            elements.push(sortComponent);
        }

        items.forEach((item) => {
            let status = ReleasePhaseHelper.getJobStatus(item.jobState);
            const issuesFooterClass = status.status === "Failed" ? "issues-footer-failed-text" : "issues-footer-partially-succeeded-text";
            const issuesInfo = ReleaseEnvironmentIssuesHelper.getIssuesInfo(item.jobIssues || ReleaseEnvironmentIssuesHelper.getEmptyIssues());

            let footerText: string | JSX.Element = status.status;
            let footerTextTooltipContent: string = empty;

            if (!!issuesInfo.errorsText || !!issuesInfo.warningsText) {
                footerText = <span> {status.status} &middot; <span className={issuesFooterClass}>{issuesInfo.errorsText} {issuesInfo.warningsText} </span></span>;
                footerTextTooltipContent = status.status + " " + issuesInfo.errorsText + " " + issuesInfo.warningsText;
            }

            let itemProps: IVerticalTabItemProps = {
                key: item.id,
                itemText: item.name,
                itemKey: item.id,
                itemFooterText: footerText,
                itemFooterTooltipContent: footerTextTooltipContent,
                statusIconProps: status.statusProps,
                cssClass: "cd-logs-job-item"
            } as IVerticalTabItemProps;

            if (status.iconName && status.className) {
                itemProps = { ...itemProps, iconProps: { iconName: status.iconName, className: status.className } };
            }

            const element = this._renderItem(item, itemProps);
            if (element) {
                elements.push(element);
            }
        });

        return elements;
    }

    private _renderSortJobItemsComponent(): JSX.Element {
        let itemProps: IVerticalTabItemProps = {
            itemText: "sort-job-items",
            itemKey: "sort-job-items",
            isItemNonInteractive: true
        };

        let sortComponentProps: ISortJobItemsComponentProps = {
            sortOrders: this.props.sortProperties.sortFilters,
            title: this.props.sortProperties.title,
            onSortOptionSelected: (sortType: JobSortType) => {
                this.setState({
                    currentSortFilter: sortType
                });
                this._logsTabActionsCreator.onSortOrderSelected(sortType);
            }
        };

        if (!!this.state.currentSortFilter) {
            sortComponentProps.selectedSortOrder = this.state.currentSortFilter;
        }
        else {
            sortComponentProps.selectedSortOrder = this.props.sortProperties.selectedSortOrder;
        }

        itemProps.onRenderItem = (props?: IVerticalTabItemProps, defaultRender?: (props?: IVerticalTabItemProps) => JSX.Element | null) => {
            return <SortJobItemsMenuComponent {...sortComponentProps} tabItemProps={props} />;
        };
        return <VerticalTabItem {...itemProps} />;
    }

    private _renderItem(item: IJobItem, itemProps: IVerticalTabItemProps) {
        switch (item.jobType) {
            case JobType.AgentPhaseJob:
                return this._getAgentPhaseItem(item, itemProps);
            case JobType.ServerPhaseJob:
                return this._getServerPhaseItem(item, itemProps);
            case JobType.DeploymentGroupPhaseJob:
                return this._getDeploymentGroupPhaseItem(item, itemProps);
            case JobType.DeploymentStatusJob:
                return this._getDeploymentStatusItem(item, itemProps);
            case JobType.PreDeploymentApprovalJob:
                return this._getPreDeploymentApprovalItem(item, itemProps);
            case JobType.PostDeploymentApprovalJob:
                return this._getPostDeploymentApprovalItem(item, itemProps);
            case JobType.PreDeploymentGateJob:
                return this._getPreDeploymentGatesItem(item, itemProps);
            case JobType.PostDeploymentGateJob:
                return this._getPostDeploymentGatesItem(item, itemProps);
            case JobType.DeploymentGroupAgentJob:
                return this._getDeploymentGroupAgentItem(item, itemProps);
            case JobType.GatesPhaseJob:
                return this._getGatesPhaseItem(item, itemProps);
        }
    }

    private _getPreDeploymentApprovalItem(item: IJobItem, itemProps: IVerticalTabItemProps): JSX.Element {
        return this._getApprovalItem(item, itemProps, RMContracts.ApprovalType.PreDeploy, Resources.PreDeploymentText);
    }

    private _getPostDeploymentApprovalItem(item: IJobItem, itemProps: IVerticalTabItemProps): JSX.Element {
        return this._getApprovalItem(item, itemProps, RMContracts.ApprovalType.PostDeploy, Resources.PostDeploymentText);
    }

    private _getApprovalItem(item: IJobItem, itemProps: IVerticalTabItemProps, approvalType: RMContracts.ApprovalType, title: string): JSX.Element {
        const jobStatus = ReleasePhaseHelper.getJobStatus(item.jobState);

        return (
            <VerticalTabItem {...itemProps}>
                <LogsTabApprovalDetailsView
                    approvalType={approvalType}
                    title={title}
                    stepStatus={{ status: jobStatus.status, className: jobStatus.className }}
                    statusProps={jobStatus.statusProps}
                    environmentName={this.state.environmentName}
                    instanceId={this.props.instanceId}
                    verticalTabItemKey={item.id}
                    onPanelOpen={this._setUserSelectedItemKey}
                    showApproveButtonDelegate={this._shouldShowApproveButton}
                    isEditMode={this.props.isEditMode} />
            </VerticalTabItem>
        );
    }

    private _getPreDeploymentGatesItem(item: IJobItem, itemProps: IVerticalTabItemProps): JSX.Element {
        return this._getReleaseGatesItem(item, itemProps, Resources.EnvironmentPreApprovalGatesHeading);
    }

    private _getPostDeploymentGatesItem(item: IJobItem, itemProps: IVerticalTabItemProps): JSX.Element {
        return this._getReleaseGatesItem(item, itemProps, Resources.EnvironmentPostApprovalGatesHeading);
    }

    private _getGatesPhaseItem(item: IJobItem, itemProps: IVerticalTabItemProps): JSX.Element {
        return this._getReleaseGatesItem(item, itemProps, item.name);
    }

    private _getReleaseGatesItem(item: IJobItem, itemProps: IVerticalTabItemProps, title: string): JSX.Element {
        return (
            <VerticalTabItem {...itemProps}>
                <LogsTabGatesDetailsView
                    instanceId={this.props.instanceId}
                    title={title}
                    gatesStatusJobItem={item as IGatesStatusJobItem} />
            </VerticalTabItem>
        );
    }

    private _getAgentPhaseItem(item: IJobItem, itemProps: IVerticalTabItemProps): JSX.Element {
        const agentPhaseItem = item as IAgentPhaseJobItem;
        let taskIndexToSelect: number;
        const taskIndexFromURL = NavigationStateUtils.getTaskIndexToSelect();

        if (taskIndexFromURL >= 0) {
            taskIndexToSelect = taskIndexFromURL;
        }

        return (
            <VerticalTabItem {...itemProps}>
                {agentPhaseItem.jobState === JobStates.Pending ?
                    <JobRequestsControllerView
                        instanceId={this.props.instanceId}
                        id={agentPhaseItem.id}
                        queueId={agentPhaseItem.queueId}
                        planId={agentPhaseItem.planId}
                        agentName={agentPhaseItem.agentName}
                    />
                    :
                    <AgentPhaseLogsDetailsView
                        tasks={agentPhaseItem.tasks}
                        verticalTabItemKey={agentPhaseItem.id}
                        onPanelOpen={this._setUserSelectedItemKey}
                        issues={agentPhaseItem.issues}
                        indexToScrollOnMount={taskIndexToSelect}
                        item={agentPhaseItem}
                        enableAutoScroll={true}
                        pageContext={AppContext.instance().PageContext as any} />
                }
            </VerticalTabItem>
        );
    }

    private _getServerPhaseItem(item: IJobItem, itemProps: IVerticalTabItemProps): JSX.Element {
        const serverPhaseItem = item as IServerPhaseJobItem;
        return (
            <VerticalTabItem {...itemProps}>
                <AgentlessPhaseLogsDetailsView
                    tasks={serverPhaseItem.tasks}
                    verticalTabItemKey={serverPhaseItem.id}
                    onPanelOpen={this._setUserSelectedItemKey}
                    issues={serverPhaseItem.issues}
                    item={serverPhaseItem}
                    pageContext={AppContext.instance().PageContext as any}
                    onRenderTaskLog={(taskLog, taskIndex, defaultRender) => this._getServerPhaseTaskLogComponent(item, taskLog, taskIndex)}
                />
            </VerticalTabItem>
        );
    }

    private _getServerPhaseTaskLogComponent(item: IJobItem, task: ITaskLog, taskIndex?: number): JSX.Element | null {
        if (task && task.taskDefinition && String_equals(task.taskDefinition.id, MIDefinitionId, true)) {
            const miLog = task as IManualInterventionLog;
            // make sure MI data do exist, otherwise we will fall back to default render mode.
            if (miLog.manualIntervention) {
                return this._getManualInterventionLogComponent(item, miLog, taskIndex);
            }
        }

        // defaultRender will render
        return null;
    }

    private _getManualInterventionLogComponent(item: IJobItem, miLog: IManualInterventionLog, taskIndex?: number): JSX.Element | null {
        if (item && miLog && miLog.manualIntervention) {
            return (
                <LogsTabManualInterventionLogComponent
                    taskState={miLog.state}
                    instanceId={miLog.manualIntervention.id.toString()}
                    verticalTabItemKey={item.id}
                    onPanelOpen={this._setUserSelectedItemKey}
                    manualIntervention={miLog.manualIntervention}
                    definitionPath={this.state.environment.releaseDefinition.path}
                    definitionEnvironmentId={this.state.environment.definitionEnvironmentId}
                    taskIndex={taskIndex}
                />
            );
        }

        return null;
    }

    private _getDeploymentGroupPhaseItem(item: IJobItem, itemProps: IVerticalTabItemProps): JSX.Element {
        let deploymentGroupPhaseItem: IDeploymentGroupPhaseJobItem = item as IDeploymentGroupPhaseJobItem;
        let deploymentGroupPhase: RMContracts.ReleaseDeployPhase = this._getDeploymentGroupPhase(deploymentGroupPhaseItem.id);

        // Calculate the counts of machines in various states.
        const machineStatusCounts = ReleaseDeploymentAttemptHelper.computeMachineStatusCount(deploymentGroupPhaseItem.jobs);

        return (
            <VerticalTabItem {...itemProps}>
                <DeploymentGroupPhaseView
                    instanceId={this.props.instanceId}
                    environmentId={this.state.environment.id}
                    deploymentGroupPhaseId={deploymentGroupPhaseItem.id}
                    phaseJobItem={deploymentGroupPhaseItem}
                    machineStatusCounts={machineStatusCounts}
                    deploymentGroupPhase={deploymentGroupPhase}
                    environment={this.state.environment} />
            </VerticalTabItem>
        );
    }

    private _getDeploymentGroupPhase(deploymentGroupPhaseId): RMContracts.ReleaseDeployPhase {
        let matchingAttempt = ReleaseDeploymentAttemptHelper.getDeploymentAttemptForAttemptNumber(this.state.environment.deploySteps, this.state.selectedAttempt);
        return ReleaseDeploymentAttemptHelper.getDeploymentGroupPhase(matchingAttempt, deploymentGroupPhaseId);
    }

    private _getDeploymentGroupAgentItem(item: IJobItem, itemProps: IVerticalTabItemProps): JSX.Element {
        let deploymentGroupAgentItem: IPhaseJobItem = item as IPhaseJobItem;
        let deploymentGroupLogsStore: DeploymentGroupLogsStore = this._logsTabViewStore as DeploymentGroupLogsStore;

        let taskIndexToSelect: number;
        const taskIndexFromURL = NavigationStateUtils.getTaskIndexToSelect();

        if (taskIndexFromURL >= 0) {
            taskIndexToSelect = taskIndexFromURL;
        }

        return (
            <VerticalTabItem {...itemProps}>
                <DeploymentGroupAgentLogsDetailsView
                    tasks={deploymentGroupAgentItem.tasks}
                    verticalTabItemKey={deploymentGroupAgentItem.id}
                    onPanelOpen={this._setUserSelectedItemKey}
                    issues={deploymentGroupAgentItem.issues}
                    indexToScrollOnMount={taskIndexToSelect}
                    item={deploymentGroupAgentItem}
                    machineGroupId={deploymentGroupLogsStore.getMachineGroupId()}
                    pageContext={AppContext.instance().PageContext as any} />
            </VerticalTabItem>
        );
    }

    private _getDeploymentStatusItem(item: IJobItem, itemProps: IVerticalTabItemProps): JSX.Element {
        let deploymentStatusJobItem: IDeploymentStatusJobItem = item as IDeploymentStatusJobItem;
        const attempts = deploymentStatusJobItem.deploySteps;
        itemProps.isRightPaneFocusable = true;
        itemProps.onRenderItem = (props: IVerticalTabItemProps) => { return this._DeploymentStatusOverviewRender(props, deploymentStatusJobItem); };
        const selectedAttempt = ReleaseDeploymentAttemptHelper.getDeploymentAttemptForAttemptNumber(attempts, this.state.selectedAttempt);
        const isLatestAttempt = ReleaseDeploymentAttemptHelper.getLatestDeploymentAttempt(attempts).attempt === selectedAttempt.attempt;
        return (
            <VerticalTabItem {...itemProps}>
                <DeploymentStatusControllerView
                    attempt={selectedAttempt}
                    environment={this.state.environment}
                    isLatestAttempt={isLatestAttempt}
                    totalAttemptsCount={attempts.length} />
            </VerticalTabItem>
        );
    }

    private _DeploymentStatusOverviewRender = (props: IVerticalTabItemProps, deploymentStatusJobItem: IDeploymentStatusJobItem): JSX.Element => {
        return (
            <DeploymentStatusOverview
                instanceId={this.props.instanceId}
                attempts={deploymentStatusJobItem.deploySteps}
                environment={this.state.environment}
                selectedAttempt={this.state.selectedAttempt}
                onAttemptClick={this._onAttemptClick} />
        );
    }

    private _onAttemptClick = (attemptNumber: number): void => {
        const deploymentAttemptActionsCreator = ActionCreatorManager.GetActionCreator<DeploymentAttemptActionCreator>(DeploymentAttemptActionCreator, this.props.instanceId);
        deploymentAttemptActionsCreator.selectAttempt(attemptNumber);
    }

    private _subscribeToNewJobLogs() {
        // subscribe to jobs that haven't been watched yet
        const jobToLogsMap = this._logsTabViewStore.getJobToLogsMap();
        for (const jobId in jobToLogsMap) {
            // No need to subscribe when JobId is not GUID
            // TODO: Here we are making assumption that only GUID is valid JobId and we
            // should subscribe only valid jobId to get live logs so that we don't have unnecessary subscription
            if (jobToLogsMap.hasOwnProperty(jobId) && this._validateGuid(jobId)
                && !(this._watchedLiveJobs.hasOwnProperty(jobId) && this._watchedLiveJobs[jobId])) {
                ReleaseSignalRManager.instance().subscribeToReleaseJobLogs(jobId);
                this._watchedLiveJobs[jobId] = true;
            }
        }
    }

    @autobind
    private _handleChange(): void {
        this._subscribeToNewJobLogs();
        this.setState(this._getState());
    }

    @autobind
    private _onItemClick(item: VerticalTabItem) {
        let key: string = item.props.itemKey;
        this._setUserSelectedItemKey(key);
    }

    @autobind
    private _setUserSelectedItemKey(key: string) {
        this._logsTabActionsCreator.selectLogItem(key);
    }

    @autobind
    private _shouldShowApproveButton(approvalType: RMContracts.ApprovalType): IPromise<boolean> {
        const isPreApproval: boolean = approvalType === RMContracts.ApprovalType.PreDeploy;

        if (this.state.environment) {
            const selectedAttempt = ReleaseDeploymentAttemptHelper.getDeploymentAttemptForAttemptNumber(this.state.environment.deploySteps, this.state.selectedAttempt);
            if (selectedAttempt) {
                const deploymentAttemptHelper: ReleaseDeploymentAttemptHelper = ReleaseDeploymentAttemptHelper.createReleaseDeploymentAttemptHelper(this.state.environment,
                    selectedAttempt);

                return deploymentAttemptHelper.isApprovalActionable(isPreApproval);
            }
        }

        return Q.resolve(false);
    }

    private _getState(): ILogsTabState {
        const logsState = this._logsTabViewStore.getState();
        return {
            ...logsState
        };
    }

    private _releaseTaskLogUpdatedEventHandler = (sender: any, releaseEvent: RMContracts.ReleaseTaskLogUpdatedEvent): void => {
        this._logsTabActionsCreator.addLogs(releaseEvent.lines, releaseEvent.timelineRecordId, releaseEvent.stepRecordId);
    }

    private _validateGuid(value: string): boolean {
        let regex = new RegExp(GuidPatternRegEx);
        return regex.test(value);
    }

    private _logsTabViewStore: ILogsStore;
    private _actionCreator: ReleaseEnvironmentActionCreator;
    private _logsTabActionsCreator: LogsTabActionsCreator;
    private _watchedLiveJobs: IDictionaryStringTo<boolean> = {};
    private _async: Async = new Async();
    private _refreshIntervalInSeconds = 60;
}
