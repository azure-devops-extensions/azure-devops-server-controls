/// <reference types="react" />

import * as React from "react";

import { AppContext } from "DistributedTaskControls/Common/AppContext";
import * as ComponentBase from "DistributedTaskControls/Common/Components/Base";
import { PanelComponent } from "DistributedTaskControls/Components/PanelComponent";
import { IStepStatus, StepComponent } from "DistributedTaskUI/Logs/StepComponent";
import { IPhaseSummaryViewProps, PhaseSummaryView } from "DistributedTaskUI/Logs/PhaseSummaryView";
import { TaskLogStepComponent } from "DistributedTaskUI/Logs/TaskLogStepComponent";
import { LogsViewUtility } from "DistributedTaskUI/Logs/LogsViewUtility";
import { ExpandedLogsViewerComponent, ILogsViewerSection } from "DistributedTaskUI/Logs/ExpandedLogsViewerComponent";
import { ExpandedLogsTaskHeader } from "DistributedTaskUI/Logs/ExpandedLogsTaskHeader";
import { ITaskLog } from "DistributedTaskUI/Logs/Logs.Types";
import { Badge } from "DistributedTaskControls/SharedControls/Badge/Badge";
import { FormattedComponent } from "DistributedTaskControls/Common/Components/FormattedComponent";

import { autobind, css, KeyCodes } from "OfficeFabric/Utilities";
import { SelectionMode } from "OfficeFabric/DetailsList";

import {
    ILogsTabGatesSecondaryDetailsViewProps,
    LogsTabGatesSecondaryDetailsView
} from "PipelineWorkflow/Scripts/ReleaseProgress/ContainerTabs/LogsTab/LogsTabGatesSecondaryDetailsView";
import { LogsTabGatesDetailsViewHelper, IGateSampleAndPhase } from "PipelineWorkflow/Scripts/ReleaseProgress/ContainerTabs/LogsTab/LogsTabGatesDetailsViewHelper";

import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";
import { IReleaseGateSampleInfo, IReleaseEnvironmentGatesData } from "PipelineWorkflow/Scripts/ReleaseProgress/ReleaseEnvironment/ReleaseEnvironmentGatesTypes";
import { IGatesStatusJobItem } from "PipelineWorkflow/Scripts/ReleaseProgress/Types";
import { NavigationStateUtils } from "PipelineWorkflow/Scripts/Common/NavigationStateUtils";
import { ReleaseProgressNavigateStateActions } from "PipelineWorkflow/Scripts/ReleaseProgress/Constants";
import { ReleaseGatesPreDeployDetailsView } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleaseGatesPreDeployDetailsView";
import { ReleaseGatesDetailsComponent, IReleaseGatesDetailsComponentProps } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleaseGatesDetailsComponent";
import { GatesType } from "PipelineWorkflow/Scripts/Common/Types";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { ReleaseGatesPreDeployDetailsViewStore } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleaseGatesPreDeployDetailsViewStore";

import * as RMContracts from "ReleaseManagement/Core/Contracts";

import * as Utils_String from "VSS/Utils/String";
import * as Utils_Date from "VSS/Utils/Date";
import * as NavigationService from "VSS/Navigation/Services";
import * as Utils_Array from "VSS/Utils/Array";
import { VssIconType } from "VSSUI/VssIcon";
import { PickListDropdown, IPickListItem, IPickListSelection, IPickListDropdownProps } from "VSSUI/PickList";

import "VSS/LoaderPlugins/Css!RM:PipelineWorkflow/Scripts/ReleaseProgress/ContainerTabs/LogsTab/LogsTabGatesDetailsView";

export interface ILogsTabGatesDetailsViewProps extends ComponentBase.IProps {
    title: string;
    gatesStatusJobItem: IGatesStatusJobItem;
}

export interface ILogsTabGatesDetailsViewState extends ComponentBase.IState {
    selectedGateSample: IReleaseGateSampleInfo;
    selectedGateSampleStartTime: string;
    isSelectedSampleOfStabilization: boolean;
    isSelectedSampleObsolete: boolean;
    individualGateInfos: ITaskLog[];
    expandedTask: ITaskLog;
    expandedGateSample: IReleaseGateSampleInfo;
    isExpandedSampleObsolete: boolean;
    expandedTaskContent: string;
    fetchLogInProgress: boolean;
    showPanel: boolean;
    showNewSampleBadge: boolean;
    latestJobRank: number;
    jobRankAtLastSelect: number;
}

interface IDropdownOption {
    key: string;
    text: string;
    groupKey: string;
    sample: IReleaseGateSampleInfo;
}

export class LogsTabGatesDetailsView extends ComponentBase.Component<ILogsTabGatesDetailsViewProps, ILogsTabGatesDetailsViewState> {

    constructor(props: ILogsTabGatesDetailsViewProps) {
        super(props);

        let initialSampleToSelect: IGateSampleAndPhase;
        let expandedGateSample: IReleaseGateSampleInfo;
        let showPanel: boolean = false;
        let fetchLogInProgress: boolean = false;
        let expandedTask: ITaskLog;
        if (NavigationStateUtils.selectGatesItemInLogsView()) {
            let gateName = NavigationStateUtils.getGateName();
            let sampleRank = NavigationStateUtils.getGateSampleRank();
            initialSampleToSelect = LogsTabGatesDetailsViewHelper.getEvaluationSampleByGateNameAndRank(this.props.gatesStatusJobItem.gatesRuntimeData, sampleRank);
            if (initialSampleToSelect) {
                let taskLog = LogsTabGatesDetailsViewHelper.getTaskLogForGateSample(initialSampleToSelect.sample, gateName);
                if (taskLog) {
                    this._fetchLogs(taskLog);
                    expandedTask = taskLog;
                    showPanel = true;
                    fetchLogInProgress = true;
                    expandedGateSample = initialSampleToSelect.sample;
                }
            }
        }

        let latestSample = LogsTabGatesDetailsViewHelper.getLatestSample(this.props.gatesStatusJobItem.gatesRuntimeData);
        if (!initialSampleToSelect) {
            initialSampleToSelect = latestSample;
        }

        if (initialSampleToSelect) {
            this.state = {
                selectedGateSample: initialSampleToSelect.sample,
                selectedGateSampleStartTime: initialSampleToSelect.sample.sampleStartTime.toString(),
                isSelectedSampleOfStabilization: initialSampleToSelect.isStabilizationPhase,
                isSelectedSampleObsolete: false,
                individualGateInfos: initialSampleToSelect.sample.individualGateInfos,
                expandedTask: expandedTask,
                expandedGateSample: expandedGateSample,
                isExpandedSampleObsolete: false,
                expandedTaskContent: undefined,
                fetchLogInProgress: fetchLogInProgress,
                showPanel: showPanel,
                showNewSampleBadge: false,
                latestJobRank: latestSample.sample.gateJobRank,
                jobRankAtLastSelect: initialSampleToSelect.sample.gateJobRank
            };
        }

    }

    public componentWillReceiveProps(newProps: ILogsTabGatesDetailsViewProps): void {

        if (!this.state.isSelectedSampleObsolete && this.state.selectedGateSample) {
            const selectedSampleObsolete: boolean = LogsTabGatesDetailsViewHelper.isGivenSampleObsolete(newProps.gatesStatusJobItem.gatesRuntimeData, this.state.selectedGateSample);

            if (selectedSampleObsolete) {
                let expandedSampleObsolete: boolean = false;

                if (this.state.showPanel) {
                    expandedSampleObsolete = LogsTabGatesDetailsViewHelper.isGivenSampleObsolete(newProps.gatesStatusJobItem.gatesRuntimeData, this.state.expandedGateSample);
                }

                this.setState({
                    isSelectedSampleObsolete: selectedSampleObsolete,
                    isExpandedSampleObsolete: expandedSampleObsolete
                });
            }
        }

        let latestSample: IGateSampleAndPhase = LogsTabGatesDetailsViewHelper.getLatestSample(newProps.gatesStatusJobItem.gatesRuntimeData);
        if (latestSample && latestSample.sample.gateJobRank > this.state.jobRankAtLastSelect) {
            this.setState({
                latestJobRank: latestSample.sample.gateJobRank,
                showNewSampleBadge: true
            });
        }
    }

    public render(): JSX.Element {
        if (!this.props.gatesStatusJobItem || !this.props.gatesStatusJobItem.gatesRuntimeData || !this.props.gatesStatusJobItem.gatesRuntimeData.gatesStatus) {
            return null;
        }
        return (
            <div className="logs-gates-details-view-container">
                <PhaseSummaryView {...this._getPhaseSummaryProperties()} cssClass="logs-gates-summary-view" />
                {this._getGatesDetails()}
            </div>
        );
    }

    private _getPhaseSummaryProperties(): IPhaseSummaryViewProps {
        const gatesRuntimeData = this.props.gatesStatusJobItem.gatesRuntimeData;
        return {
            name: this.props.title,
            startTime: gatesRuntimeData.gatesStartTime,
            finishTime: gatesRuntimeData.gatesCompleteTime,
            onRenderSecondaryDetailsLeftSection: this._onRenderSecondaryDetailsLeftSection,
            pageContext: AppContext.instance().PageContext as any
        };
    }

    @autobind
    private _onRenderSecondaryDetailsLeftSection(): JSX.Element {
        const gateStatus = this.props.gatesStatusJobItem.gatesRuntimeData.gatesStatus;

        let secondaryViewProps: ILogsTabGatesSecondaryDetailsViewProps = {
            gatesViewType: gateStatus.gatesViewType,
            gateStatus: gateStatus.gateStatus,
            gateStatusMessage: gateStatus.gateStatusMessage,
            gateSecondaryMessage: gateStatus.gateSecondaryMessage
        };

        return (
            <LogsTabGatesSecondaryDetailsView {...secondaryViewProps} />
        );
    }

    @autobind
    private _openGateLog(gateName: string, sampleRank: number): void {
        let initialSampleToSelect: IGateSampleAndPhase;
        let expandedGateSample: IReleaseGateSampleInfo;
        let showPanel: boolean = false;
        let fetchLogInProgress: boolean = false;
        let expandedTask: ITaskLog;
        initialSampleToSelect = LogsTabGatesDetailsViewHelper.getEvaluationSampleByGateNameAndRank(this.props.gatesStatusJobItem.gatesRuntimeData, sampleRank);
        if (initialSampleToSelect) {
            let taskLog = LogsTabGatesDetailsViewHelper.getTaskLogForGateSample(initialSampleToSelect.sample, gateName);
            if (taskLog) {
                this._fetchLogs(taskLog);
                expandedTask = taskLog;
                showPanel = true;
                fetchLogInProgress = true;
                expandedGateSample = initialSampleToSelect.sample;
            }
        }

        let latestSample = LogsTabGatesDetailsViewHelper.getLatestSample(this.props.gatesStatusJobItem.gatesRuntimeData);
        if (!initialSampleToSelect) {
            initialSampleToSelect = latestSample;
        }

        if (initialSampleToSelect) {
            this.setState({
                selectedGateSample: initialSampleToSelect.sample,
                selectedGateSampleStartTime: initialSampleToSelect.sample.sampleStartTime.toString(),
                isSelectedSampleOfStabilization: initialSampleToSelect.isStabilizationPhase,
                isSelectedSampleObsolete: false,
                individualGateInfos: initialSampleToSelect.sample.individualGateInfos,
                expandedTask: expandedTask,
                expandedGateSample: expandedGateSample,
                isExpandedSampleObsolete: false,
                expandedTaskContent: undefined,
                fetchLogInProgress: fetchLogInProgress,
                showPanel: showPanel,
                showNewSampleBadge: false,
                latestJobRank: latestSample.sample.gateJobRank,
                jobRankAtLastSelect: initialSampleToSelect.sample.gateJobRank
            } as ILogsTabGatesDetailsViewState);
        }
    }

    private _getGatesDetails(): JSX.Element {
        let samplesContent: JSX.Element = null;
        const dropdownOptions: IDropdownOption[] = this._getDropdownOptions();

        if (dropdownOptions && dropdownOptions.length > 0) {
            samplesContent = (
                <div className="logs-gates-details-individual-gates">
                    {
                        this.state.showPanel &&
                        <ExpandedLogsViewerComponent
                            componentRef={(element) => this._logsViewerElement = element}
                            showPanel={this.state.showPanel}
                            fetchLogInProgress={this.state.fetchLogInProgress}
                            followTail={false}
                            isLive={false}
                            showLineNumber={true}
                            content={this.state.expandedTaskContent}
                            onCloseClick={this._onCloseClick}
                            onRenderHeader={this._getHeader}
                            pageContext={AppContext.instance().PageContext as any}
                        />
                    }
                </div>
            );
        }

        const environmentId = NavigationStateUtils.getEnvironmentId();
        const gatesType = this.props.gatesStatusJobItem.gatesType;
        const componentProps = {
            gatesData: this.props.gatesStatusJobItem.gatesData,
            environmentId: environmentId,
            isPreDeploymentGates: gatesType === GatesType.PreDeploy,
            // to hide ignoreGate menu
            hasManageApproverPermission: gatesType !== GatesType.Deploy && this._hasManageApproverPermission(environmentId),
            onClickGateResult: this._openGateLog
        } as IReleaseGatesDetailsComponentProps;
        return (
            <div className="logs-gates-details-view">
                <ReleaseGatesDetailsComponent {...componentProps} />
                {samplesContent}
            </div>
        );
    }

    private _hasManageApproverPermission(environmentId: number): boolean {
        // approver permission are same for pre/post or gates
        const viewStore = StoreManager.GetStore<ReleaseGatesPreDeployDetailsViewStore>(ReleaseGatesPreDeployDetailsViewStore, environmentId.toString());
        return viewStore.hasManageReleaseApproverPermissions();
    }

    private _getPickListDropdownProps(dropdownOptions: IDropdownOption[], selectedItem: IDropdownOption): IPickListDropdownProps {
        return {
            selectionMode: SelectionMode.single,
            selectedItems: [selectedItem],
            onSelectionChanged: this._onDropdownChanged,
            getPickListItems: () => dropdownOptions,
            getListItem: (item: IDropdownOption) => {
                return {
                    name: item.text,
                    key: item.key.toString(),
                    groupKey: item.groupKey,
                    iconProps: item.sample ? {
                        iconType: VssIconType.fabric,
                        iconName: item.sample.sampleSucceeded ? "Accept" : "Cancel",
                        className: css(item.sample.sampleSucceeded ? "success" : "failure", "logs-gates-samples-dropdown-indicator")
                    } : undefined
                };
            },
            groups: [{
                name: Resources.EvaluationTimeSamplesText,
                key: this._evaluationGroupKey
            }, {
                name: Resources.DelayTimeSamplesText,
                key: this._delayTimeGroupKey
            }]
        };
    }

    private _getDropdownOptions(): IDropdownOption[] {
        let gatesRuntimeData = this.props.gatesStatusJobItem.gatesRuntimeData;

        let dropdownOptions: IDropdownOption[] = [];
        if (gatesRuntimeData.gateEvaluationSamples && gatesRuntimeData.gateEvaluationSamples.length > 0) {
            gatesRuntimeData.gateEvaluationSamples.forEach((sample: IReleaseGateSampleInfo) => {
                let displayText: string = this._getDisplayTextForSample(sample);
                dropdownOptions.push({ key: sample.sampleStartTime.toString(), text: displayText, groupKey: this._evaluationGroupKey, sample: sample });
            });
        }
        if (gatesRuntimeData.gateStabilizationSamples && gatesRuntimeData.gateStabilizationSamples.length > 0) {
            gatesRuntimeData.gateStabilizationSamples.forEach((sample: IReleaseGateSampleInfo) => {
                let displayText: string = this._getDisplayTextForSample(sample);
                dropdownOptions.push({ key: sample.sampleStartTime.toString(), text: displayText, groupKey: this._delayTimeGroupKey, sample: sample });
            });
        }

        // If currently selected sample wasn't found in samples returned by API, add it explicitly at the end of all samples
        if (this.state.isSelectedSampleObsolete) {
            let groupKey = this._evaluationGroupKey;
            // If the last sample in dropdown isn't of stabilization phase, and the sample we're adding now is, add the stabilization phase header as well
            if (this.state.isSelectedSampleOfStabilization) {
                groupKey = this._delayTimeGroupKey;
            }
            let obsoleteSampleData: IReleaseGateSampleInfo = this.state.selectedGateSample;
            if (obsoleteSampleData) {
                obsoleteSampleData.isLatest = false;
                dropdownOptions.push({ key: obsoleteSampleData.sampleStartTime.toString(), text: obsoleteSampleData.sampleName, groupKey: groupKey, sample: obsoleteSampleData });
            }
        }

        return dropdownOptions;
    }

    private _getNewSamplesBadge(newSampleCount: number): JSX.Element {
        let badgeContent: string = newSampleCount > 1 ? Utils_String.localeFormat(Resources.NewSamplePlural, newSampleCount) : Resources.NewSampleSingular;

        return (
            <div className="badge-container">
                <Badge cssClass="new-sample-badge" badgeText={badgeContent} onClick={this._onBadgeClicked} />
            </div>
        );
    }

    private _getDisplayTextForSample(sample: IReleaseGateSampleInfo): string {

        let displayText: string = sample.sampleName;
        if (sample.isLatest) {
            displayText = Utils_String.localeFormat(Resources.ReleaseGateLogSampleFullFormat, sample.sampleName, Resources.GatesLatestText);
        }
        return displayText;
    }

    @autobind
    private _getHeader() {
        const expandedTask = this.state.expandedTask;

        let enablePreviousSampleButton: boolean = false;
        let enableNextSampleButton: boolean = false;
        let dropdownOptions = this._getDropdownOptions();
        let selectedItem: IDropdownOption;

        if (this.state.showPanel) {
            const expandedGateSample: IReleaseGateSampleInfo = this.state.expandedGateSample;

            if (expandedGateSample) {
                let addExtraPreviousToShowObsoleteSample: boolean = this.state.isSelectedSampleObsolete && !this.state.isExpandedSampleObsolete;
                let previousSample = LogsTabGatesDetailsViewHelper.getPreviousSampleOfCurrentGate(this.props.gatesStatusJobItem.gatesRuntimeData, expandedGateSample, addExtraPreviousToShowObsoleteSample ? this.state.selectedGateSample : undefined);
                if (previousSample) {
                    enablePreviousSampleButton = true;
                }
                let addNextToJumpFromObsoleteToFirstSample: boolean = this.state.isSelectedSampleObsolete && this.state.isExpandedSampleObsolete;
                let nextSample = LogsTabGatesDetailsViewHelper.getNextSampleOfCurrentGate(this.props.gatesStatusJobItem.gatesRuntimeData, expandedGateSample, addNextToJumpFromObsoleteToFirstSample);
                if (nextSample) {
                    enableNextSampleButton = true;
                }
                selectedItem = dropdownOptions.length > 0 ? Utils_Array.first(dropdownOptions, (item: IDropdownOption) => item.key === expandedGateSample.sampleStartTime.toString()) : undefined;
            }
        }

        if (!selectedItem) {
            selectedItem = Utils_Array.first(dropdownOptions);
        }

        if (expandedTask) {
            // Header with basic information. Task exists to enable next/previous and combobox
            return (
                <ExpandedLogsTaskHeader
                    task={expandedTask}
                    logUrl={expandedTask.logUrl}
                    onCloseClick={this._onCloseClick}
                    nextTaskDisplayText={Resources.GateNextSample}
                    previousTaskDisplayText={Resources.GatePreviousSample}
                    nextTaskButtonEnabled={enableNextSampleButton}
                    previousTaskButtonEnabled={enablePreviousSampleButton}
                    onPreviousTaskButtonClicked={this._onPreviousButtonClicked}
                    onNextTaskButtonClicked={this._onNextButtonClicked}
                    picklistDropdownProps={this._getPickListDropdownProps(dropdownOptions, selectedItem)}
                    onHeadingTextKeyDown={this._onHeadingTextKeyDown}
                />
            );
        }
    }

    private _onHeadingTextKeyDown = (evt: React.KeyboardEvent<HTMLElement>) => {
        if (this._logsViewerElement) {
            if (evt && evt.shiftKey && evt.keyCode === KeyCodes.tab) {
                this._logsViewerElement.focus();
            }
        }
    }

    @autobind
    private _onCloseClick() {
        if (NavigationStateUtils.selectGatesItemInLogsView()) {
            // Reset the url params since we do not want to re-open the logs view when this component is deleted and recreated.
            let data = {
                environmentId: NavigationStateUtils.getEnvironmentId(),
                gateName: null,
                gateSampleRank: null,
                isPreDeploymentGatesSelected: null,
                selectGatesItemInLogsView: null
            };
            NavigationService.getHistoryService().replaceHistoryPoint(ReleaseProgressNavigateStateActions.ReleaseEnvironmentLogs, data, null, true, true);
        }
        this.setState({
            expandedTaskContent: null,
            showPanel: false
        } as ILogsTabGatesDetailsViewState);
    }

    @autobind
    private _onPreviousButtonClicked() {
        let expandedGateSample: IReleaseGateSampleInfo = this.state.expandedGateSample;
        const selectedSampleObsolete: boolean = this.state.isSelectedSampleObsolete;
        const expandedSampleObsolete: boolean = this.state.isExpandedSampleObsolete;

        let previousSample: IReleaseGateSampleInfo = LogsTabGatesDetailsViewHelper.getPreviousSampleOfCurrentGate(this.props.gatesStatusJobItem.gatesRuntimeData, expandedGateSample, (selectedSampleObsolete && !expandedSampleObsolete) ? this.state.selectedGateSample : undefined);

        if (previousSample) {
            this._navigateLogExpandedView(previousSample);
        }
    }

    @autobind
    private _onNextButtonClicked() {
        let expandedGateSample: IReleaseGateSampleInfo = this.state.expandedGateSample;
        const selectedSampleObsolete: boolean = this.state.isSelectedSampleObsolete;
        const expandedSampleObsolete: boolean = this.state.isExpandedSampleObsolete;

        let nextSample: IReleaseGateSampleInfo = LogsTabGatesDetailsViewHelper.getNextSampleOfCurrentGate(this.props.gatesStatusJobItem.gatesRuntimeData, this.state.expandedGateSample, (selectedSampleObsolete && expandedSampleObsolete));

        if (nextSample) {
            this._navigateLogExpandedView(nextSample);
        }
    }

    @autobind
    private _onDropdownChanged(selection: IPickListSelection): boolean {
        if (!selection.selectedItems && selection.selectedItems.length <= 0) {
            return false;
        }

        let option = selection.selectedItems[0];
        let gatesRuntimeData = this.props.gatesStatusJobItem.gatesRuntimeData;
        let individualGateInfos: ITaskLog[] = [];
        let selectedSample: IReleaseGateSampleInfo = this.state.selectedGateSample;
        let selectedSampleOfStabilization: boolean = this.state.isSelectedSampleOfStabilization;
        if (gatesRuntimeData.gateEvaluationSamples && gatesRuntimeData.gateEvaluationSamples.length > 0) {
            gatesRuntimeData.gateEvaluationSamples.forEach((sample) => {
                if (sample.sampleStartTime.toString() === option.key) {
                    selectedSample = sample;
                    selectedSampleOfStabilization = false;
                    individualGateInfos = sample.individualGateInfos;
                }
            });
        }
        if (gatesRuntimeData.gateStabilizationSamples && gatesRuntimeData.gateStabilizationSamples.length > 0) {
            gatesRuntimeData.gateStabilizationSamples.forEach((sample) => {
                if (sample.sampleStartTime.toString() === option.key) {
                    selectedSample = sample;
                    selectedSampleOfStabilization = true;
                    individualGateInfos = sample.individualGateInfos;
                }
            });
        }

        if (this.state.showPanel) {
            // Panel is open that means user has changed the drpdown inside the panel
            this._navigateLogExpandedView(selectedSample);
        }
        else {
            this.setState({
                selectedGateSample: selectedSample,
                isSelectedSampleOfStabilization: selectedSampleOfStabilization, // Simply false because you can't select back an obsolete sample
                isSelectedSampleObsolete: false,
                selectedGateSampleStartTime: option.key as string,
                individualGateInfos: individualGateInfos,
                jobRankAtLastSelect: this.state.latestJobRank, // Update jobRankAtLastSelect to latestJobRank
                showNewSampleBadge: false
            } as ILogsTabGatesDetailsViewState);
        }

        return false;
    }

    @autobind
    private _onBadgeClicked() {

        let firstSampleAndPhase: IGateSampleAndPhase = LogsTabGatesDetailsViewHelper.getLatestSample(this.props.gatesStatusJobItem.gatesRuntimeData);

        this.setState({
            selectedGateSample: firstSampleAndPhase.sample,
            selectedGateSampleStartTime: firstSampleAndPhase.sample.sampleStartTime.toString(),
            isSelectedSampleOfStabilization: firstSampleAndPhase.isStabilizationPhase,
            isSelectedSampleObsolete: false,
            individualGateInfos: firstSampleAndPhase.sample.individualGateInfos,
            jobRankAtLastSelect: firstSampleAndPhase.sample.gateJobRank,
            showNewSampleBadge: false
        } as ILogsTabGatesDetailsViewState);
    }

    private _showLogExpandedView = (task: ITaskLog) => {
        this._fetchLogs(task);

        this.setState({
            showPanel: true,
            fetchLogInProgress: true,
            expandedTask: task,
            expandedGateSample: this.state.selectedGateSample,
            isExpandedSampleObsolete: this.state.isSelectedSampleObsolete
        } as ILogsTabGatesDetailsViewState);
    }

    private _navigateLogExpandedView(gateSample: IReleaseGateSampleInfo): void {
        let taskLog: ITaskLog = LogsTabGatesDetailsViewHelper.getTaskLogForGateSample(gateSample, this.state.expandedTask.name);
        if (!taskLog) {
            return;
        }
        const isGateSampleObsolete: boolean = LogsTabGatesDetailsViewHelper.isGivenSampleObsolete(this.props.gatesStatusJobItem.gatesRuntimeData, gateSample);

        this._fetchLogs(taskLog);
        this.setState({
            showPanel: true,
            fetchLogInProgress: true,
            expandedTask: taskLog,
            expandedGateSample: gateSample,
            isExpandedSampleObsolete: isGateSampleObsolete
        } as ILogsTabGatesDetailsViewState);
    }

    private _fetchLogs(task: ITaskLog) {
        LogsViewUtility.fetchLogs(task).then((logs) => {
            this.setState({ expandedTaskContent: logs, fetchLogInProgress: false } as ILogsTabGatesDetailsViewState);
        }, (error) => {
            this.setState({ expandedTaskContent: error, fetchLogInProgress: false } as ILogsTabGatesDetailsViewState);
        });
    }

    private _evaluationGroupKey: string = "evaluation";
    private _delayTimeGroupKey: string = "delayTime";
    private _logsViewerElement: ILogsViewerSection | null;
}
