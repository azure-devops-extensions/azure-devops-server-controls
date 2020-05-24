// Copyright (c) Microsoft Corporation.  All rights reserved.

/// <reference types="react" />

import * as React from "react";

import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import * as Base from "DistributedTaskControls/Common/Components/Base";
import { DayTimePicker, DayTimePickerDefaults } from "DistributedTaskControls/Components/DayTimePicker";
import { ScheduleItem } from "DistributedTaskControls/Components/ScheduleItem";
import { IDateTimeSchedule, IScheduleTriggerOptions } from "DistributedTaskControls/Common/Types";
import { Component as InfoButton } from "DistributedTaskControls/Components/InfoButton";
import { ICalloutContentProps } from "DistributedTaskControls/Components/CalloutComponent";
import { AccordionCustomRenderer, IAccordionCustomRendererInstanceProps } from "DistributedTaskControls/SharedControls/Accordion/AccordionCustomRenderer";
import { RadioInputComponent } from "DistributedTaskControls/SharedControls/InputControls/Components/RadioInputComponent";
import { MessageBarComponent } from "DistributedTaskControls/Components/MessageBarComponent";
import { DtcUtils } from "DistributedTaskControls/Common/Utilities";
import * as DTCResources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";

import { EnvironmentListStore } from "PipelineWorkflow/Scripts/Editor/Environment/EnvironmentListStore";
import { DeployEnvironmentStore } from "PipelineWorkflow/Scripts/Editor/Environment/EnvironmentStore";
import { EnvironmentTriggerActionCreator } from "PipelineWorkflow/Scripts/Editor/Environment/EnvironmentTriggerActionCreator";
import { EnvironmentTriggerStore, IEnvironmentTriggerState, EnvironmentTriggerTabKeys } from "PipelineWorkflow/Scripts/Editor/Environment/EnvironmentTriggerStore";
import { EnvironmentArtifactTriggerView } from "PipelineWorkflow/Scripts/Editor/Environment/EnvironmentArtifactTriggerView";
import { PipelineDefinitionEnvironment, PipelineReleaseSchedule } from "PipelineWorkflow/Scripts/Common/Types";
import * as ManualTriggerTabItemAsync from "PipelineWorkflow/Scripts/Editor/Environment/ManualTrigger";
import * as PostEnvironmentDeploymentTriggerTabItemAsync from "PipelineWorkflow/Scripts/Editor/Environment/PostEnvironmentDeploymentTrigger";
import * as PostReleaseTriggerTabItemAsync from "PipelineWorkflow/Scripts/Editor/Environment/PostReleaseTrigger";
import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";
import { ReleaseEditorWebPageDataHelper } from "PipelineWorkflow/Scripts/Editor/Sources/ReleaseEditorWebPageData";
import { ScheduleUtils } from "PipelineWorkflow/Scripts/Editor/Common/ScheduleUtils";
import { PreDeploymentConditionsViewComponents } from "PipelineWorkflow/Scripts/Shared/Constants";
import { FeatureFlagUtils } from "PipelineWorkflow/Scripts/Shared/Utils/FeatureFlagUtils";
import { EnvironmentActionsCreator } from "PipelineWorkflow/Scripts/Editor/Environment/EnvironmentActionsCreator";
import { PipelineEnvironmentTriggerConditionType } from "PipelineWorkflow/Scripts/Editor/Common/Types";
import { ArtifactListStore } from "PipelineWorkflow/Scripts/Editor/Artifact/ArtifactListStore";

import RMContracts = require("ReleaseManagement/Core/Contracts");

import { getAsyncLoadedComponent } from "VSS/Flux/AsyncLoadedComponent";
import * as Utils_Array from "VSS/Utils/Array";
import * as Utils_String from "VSS/Utils/String";

import { IChoiceGroupOption } from "OfficeFabric/ChoiceGroup";
import { IDropdownOption } from "OfficeFabric/Dropdown";
import { Toggle } from "OfficeFabric/Toggle";
import { IconType } from "OfficeFabric/Icon";
import { MessageBarType } from "OfficeFabric/MessageBar";
import { css } from "OfficeFabric/Utilities";

import "VSS/LoaderPlugins/Css!RM:PipelineWorkflow/Scripts/Editor/Environment/EnvironmentTriggerControllerView";

export interface ITabItemProps extends Base.IProps {
    key: string;
    id: string;
}

let LoadingComponent: React.StatelessComponent<{}> = (): JSX.Element => {
    return <div>{Resources.Loading}</div>;
};

const AsyncManualTriggerTabItem = getAsyncLoadedComponent(
    ["PipelineWorkflow/Scripts/Editor/Environment/ManualTrigger"],
    (m: typeof ManualTriggerTabItemAsync) => m.Component,
    () => <LoadingComponent />);

const AsyncPostEnvironmentDeploymentTriggerTabItem = getAsyncLoadedComponent(
    ["PipelineWorkflow/Scripts/Editor/Environment/PostEnvironmentDeploymentTrigger"],
    (m: typeof PostEnvironmentDeploymentTriggerTabItemAsync) => m.Component,
    () => <LoadingComponent />);

const AsyncPostReleaseTriggerTabItem = getAsyncLoadedComponent(
    ["PipelineWorkflow/Scripts/Editor/Environment/PostReleaseTrigger"],
    (m: typeof PostReleaseTriggerTabItemAsync) => m.Component,
    () => <LoadingComponent />);

export class EnvironmentTriggerControllerView extends Base.Component<IAccordionCustomRendererInstanceProps, IEnvironmentTriggerState> {
    constructor(props: IAccordionCustomRendererInstanceProps) {
        super(props);
        this._actionCreator = ActionCreatorManager.GetActionCreator<EnvironmentTriggerActionCreator>(EnvironmentTriggerActionCreator, this.props.instanceId);
        this._environmentActionCreator = ActionCreatorManager.GetActionCreator<EnvironmentActionsCreator>(EnvironmentActionsCreator, this.props.instanceId);
        this._store = StoreManager.GetStore<EnvironmentTriggerStore>(EnvironmentTriggerStore, this.props.instanceId);
        this._environmentListstore = StoreManager.GetStore<EnvironmentListStore>(EnvironmentListStore);
        this._environmentStore = StoreManager.GetStore<DeployEnvironmentStore>(DeployEnvironmentStore, this.props.instanceId);
    }

    public componentWillMount() {
        this._store.addChangedListener(this._onChange);
        this._environmentListstore.addChangedListener(this._onEnvironmentListStoreChange);
        this._environmentStore.addChangedListener(this._onChange);
        this.setState(this._store.getState());
    }

    public componentWillUnmount() {
        this._store.removeChangedListener(this._onChange);
        this._environmentListstore.removeChangedListener(this._onEnvironmentListStoreChange);
        this._environmentStore.removeChangedListener(this._onChange);
    }

    public componentWillReceiveProps(props: IAccordionCustomRendererInstanceProps): void {
        if (this._accordianElement) {
            this._accordianElement.showContent(props.expanded);
        }
    }

    public render(): JSX.Element {
        const ariaLabelId = "schedule-label-" + DtcUtils.getUniqueInstanceId();
        let choiceGroupInfoProps = {
            calloutContentProps: {
                calloutMarkdown: Resources.EnvironmentTriggerChoiceGroupHelpText,
            },
            iconAriaLabel: Resources.MoreInformationTriggerAriaLabel
        };

        const ariaLabelIdForPullRequestDeployment = "pr-deployment-label-" + DtcUtils.getUniqueInstanceId();

        const isPullRequestDeploymentEnabled = this._environmentStore.isPullRequestDeploymentEnabled();

        return (
            <AccordionCustomRenderer
                cssClass="envrionment-trigger-accordion"
                label={Resources.TriggersHeading}
                ref={this._resolveRef("_accordianElement")}
                onHeaderClick={this._onHeaderClick}
                initiallyExpanded={this.props.expanded}
                headingLevel={2}
                addSeparator={true}
                description={Resources.TriggersAccordionDescriptionText}
                showErrorDelegate={this._showErrorOnAccordion}
                bowtieIconName="bowtie-trigger-auto">
                <div className="cd-trigger-selection constrained-width">

                    <div className="cd-trigger-selection-tab">
                        <RadioInputComponent
                            label={Resources.TriggerChoiceGroupLabel}
                            options={this._getTriggerTabOptions()}
                            onValueChanged={this._onSourceOptionChange}
                            infoProps={choiceGroupInfoProps} />
                        <div className="cd-trigger-selection-tab-content">
                            {
                                Utils_Array.first(this._getTabItems(), (child: React.ReactElement<ITabItemProps>) => {
                                    return child.key === this.state.selectedTabItemKey;
                                })
                            }
                        </div>
                    </div>
                    {
                        (this.state.selectedTabItemKey !== EnvironmentTriggerTabKeys.ManualTriggerKey) ?
                            <div className="environment-triggers">
                                {
                                    (
                                        <div className="environment-artifact-container">
                                            <EnvironmentArtifactTriggerView instanceId={this.props.instanceId} />
                                        </div>
                                    )
                                }
                                <div className="environment-schedule-container">
                                    <div className="environment-schedule-container-header">
                                        <div className="environment-schedule-container-header-left">
                                            <div id={ariaLabelId} className="schedule-label">{Resources.ScheduleLable}</div>
                                            <InfoButton
                                                iconAriaLabel={Resources.MoreInformationScheduleAriaLabel}
                                                calloutContent={{
                                                    calloutDescription: Resources.ScheduleHelpText,
                                                    calloutContentAriaLabel: Utils_String.localeFormat(DTCResources.InfoCalloutAriaLabel, Resources.ScheduleLable)
                                                } as ICalloutContentProps}
                                                isIconFocusable={true} />
                                        </div>
                                        <Toggle
                                            className="environment-triggers-schedule-toggle"
                                            label={Utils_String.empty}
                                            checked={this.state.isScheduleEnabled}
                                            onText={Resources.EnabledText}
                                            offText={Resources.DisabledText}
                                            onChanged={this._handleToggleChange}
                                            aria-labelledby={ariaLabelId} />
                                    </div>
                                    {
                                        this.state.isScheduleEnabled ?
                                            <div className="environment-schedule">
                                                {this._getScheduleForEnvironment(this.state.environmentTriggerSchedules[0], this._showConfigureSchedule)}
                                            </div> : null
                                    }
                                </div>
                                {FeatureFlagUtils.isPullRequestTriggersEnabled() &&
                                    <div className="environment-schedule-container">
                                        <div className="environment-schedule-container-header">
                                            <div className="environment-schedule-container-header-left">
                                                <div id={ariaLabelIdForPullRequestDeployment} className="schedule-label">{Resources.PullRequestDeployment}</div>
                                                <InfoButton
                                                    iconAriaLabel={Resources.MoreInformationPullRequestDeploymentAriaLabel}
                                                    calloutContent={{
                                                        calloutDescription: Resources.PullRequestDeploymentHelpText,
                                                        calloutContentAriaLabel: Utils_String.localeFormat(DTCResources.InfoCalloutAriaLabel, Resources.PullRequestDeployment)
                                                    } as ICalloutContentProps}
                                                    isIconFocusable={true} />
                                            </div>
                                            <Toggle
                                                className="environment-triggers-schedule-toggle"
                                                label={Utils_String.empty}
                                                checked={isPullRequestDeploymentEnabled}
                                                onText={Resources.EnabledText}
                                                offText={Resources.DisabledText}
                                                onAriaLabel={Resources.PullRequestDeploymentEnabledAriaLabel}
                                                offAriaLabel={Resources.PullRequestDeploymentDisabledAriaLabel}
                                                onChanged={this._handlePullRequestDeploymentToggleChange}
                                                aria-labelledby={ariaLabelIdForPullRequestDeployment} />
                                        </div>
                                        <div>
                                            {this._getPullRequestMessageBar(isPullRequestDeploymentEnabled)}
                                        </div>
                                    </div>
                                }
                            </div>
                            : null
                    }
                </div>
            </AccordionCustomRenderer>
        );
    }

    private _onChange = () => {
        this.setState(this._store.getState());
    }

    private _onEnvironmentListStoreChange = () => {
        let state: IEnvironmentTriggerState = this._store.getState();
        if (state.selectedTabItemKey === EnvironmentTriggerTabKeys.PostEnvironmentDeploymentTriggerKey) {
            this.setState(state);
        }
    }

    private _getDateTimeSchedule(releaseSchedule: PipelineReleaseSchedule): IDateTimeSchedule {
        let schedule: IDateTimeSchedule;
        if (releaseSchedule) {
            schedule = {
                days: releaseSchedule.daysToRelease,
                startHours: releaseSchedule.startHours,
                startMinutes: releaseSchedule.startMinutes
            };
        }

        return schedule;
    }

    private _getPullRequestMessageBar(isPullRequestDeploymentEnabled: boolean): JSX.Element {

        if (!!isPullRequestDeploymentEnabled)
        {
            let dependentEnvMessage = this._getPullRequestDeploymentMessageForDependentEnvironments();
            if (dependentEnvMessage) {
                return (<MessageBarComponent messageBarType={MessageBarType.warning}>
                    {dependentEnvMessage}
                </MessageBarComponent>);
            }

           return null;
        }

        let triggerMissingMessage = this._getPullRequestDeploymentMessageForNoConfiguredTrigger();
        if (triggerMissingMessage) {
            return (<MessageBarComponent messageBarType={MessageBarType.warning}>
                {triggerMissingMessage}
            </MessageBarComponent>);
        }

        let requiredEnvMessage = this._getPullRequestDeploymentMessageForRequiredEnvironments();
        if (requiredEnvMessage) {
            return (<MessageBarComponent messageBarType={MessageBarType.warning}>
                {requiredEnvMessage}
            </MessageBarComponent>);
        }

        return null;
    }

    private _getPullRequestDeploymentMessageForRequiredEnvironments(): JSX.Element {
        const triggerConditions = this._store.getState().environmentTriggerConditions;
        // Those environments on which this environment is dependent and they have PR deployment disabled
        let requiredDisabledPREnvironments: string[] = [];

        if (triggerConditions) {
            triggerConditions.forEach((condition) => {
                if (condition && condition.conditionType === PipelineEnvironmentTriggerConditionType.EnvironmentState) {
                    let environment = this._environmentListstore.getEnvironmentStoreByName(condition.name);

                    // If PR deployment is disabled, then add it to list
                    if (environment && environment.isPullRequestDeploymentEnabled() === false) {
                        requiredDisabledPREnvironments.push(environment.getEnvironmentName());
                    }
                }
            });
        }

        if (requiredDisabledPREnvironments.length > 0) {
            let message = Utils_String.format(Resources.PullRequestDeploymentDisabledEnvironmentsWarningMessage, requiredDisabledPREnvironments.join(", "));
            return <span> {message} </span>;
        }

        return null;
    }

    private _getPullRequestDeploymentMessageForDependentEnvironments(): JSX.Element {
        // We need to go over all the trigger conditions and find where the current environment is part of condition
        // and pull request deployment is enabled
        let dependentEnabledPREnvironments: string[] = [];
        let envs = this._environmentListstore.getDataStoreList();

        for (let env of envs) {
            const envState = env.getCurrentState();
            if (envState.environmentOptions.pullRequestDeploymentEnabled) {
                for (let con of envState.conditions) {
                    if (con.conditionType === PipelineEnvironmentTriggerConditionType.EnvironmentState
                        && Utils_String.ignoreCaseComparer(con.name, this._environmentStore.getEnvironmentName()) === 0) {
                        dependentEnabledPREnvironments.push(env.getEnvironmentName());
                    }
                }
            }
        }

        if (dependentEnabledPREnvironments.length > 0) {
            let message = Utils_String.format(Resources.PullRequestDeploymentsDependentEnvironmentsWarning, dependentEnabledPREnvironments.join(", "));
            return <span> {message} </span>;
        }

        return null;
    }

    private _getPullRequestDeploymentMessageForNoConfiguredTrigger() {
        let isPRTriggerConfigured = false;
        let artifactListStore = StoreManager.GetStore<ArtifactListStore>(ArtifactListStore);
        for (let artifactStore of artifactListStore.getDataStoreList()) {
            isPRTriggerConfigured = isPRTriggerConfigured || artifactStore.isPullRequestTriggerConfigured();
        }

        if (isPRTriggerConfigured === false) {
            return <span> {Resources.PullRequestDeploymentNoTriggerWarning} </span>;
        }

        return null;
    }

    private _getScheduleForEnvironment(schedule: PipelineReleaseSchedule, isConfigureScheduledEnabled: boolean): JSX.Element[] {
        let retValue: JSX.Element[] = [<div className="schedules-header" key="Schedule"> </div>];
        let index: number = 1;

        let dateTimeSchedule: IDateTimeSchedule = this._getDateTimeSchedule(schedule);

        // Todo: Handle focus when schedule button is toggle. Currently isFocused is set to false
        retValue.push(
            <ScheduleItem
                index={index}
                key={index}
                schedule={dateTimeSchedule}
                isConfigureScheduleEnabled={isConfigureScheduledEnabled}
                showRemoveScheduleButton={false}
                isFocused={false}
                toggleConfigureScheduleView={this._toggleConfigureScheduleView}
                showNoDaySelectedError={ScheduleUtils.isNoDaySelected(schedule)}>
                <DayTimePicker
                    key={index}
                    id={index}
                    label={Utils_String.empty}
                    daysOfWeek={schedule.daysToRelease}
                    hour={(schedule.startHours === 0) ? DayTimePickerDefaults.keyForZeroHours : schedule.startHours}
                    minute={schedule.startMinutes}
                    timeZoneId={schedule.timeZoneId}
                    getTimeZones={this._getTimeZoneDropDown}
                    onDayChange={this._onDayChange}
                    onTimeChange={this._onTimeChange} >
                </DayTimePicker>
            </ScheduleItem>
        );

        return retValue;
    }

    private _toggleConfigureScheduleView = (index: number): void => {
        this._showConfigureSchedule = !this._showConfigureSchedule;
        this.setState(this._store.getState());
    }

    private _handleToggleChange = (option: boolean): void => {
        this._actionCreator.updateEnableEnvironmentSchedule(option);
    }

    private _handlePullRequestDeploymentToggleChange = (option: boolean): void => {
        this._environmentActionCreator.togglePullRequestDeployment(option);
    }

    private _onDayChange = (scheduledTriggerOptions: IScheduleTriggerOptions) => {
        this._actionCreator.updateEnvironmentSchedule(scheduledTriggerOptions);
    }

    private _onTimeChange = (scheduledTriggerOptions: IScheduleTriggerOptions) => {
        this._actionCreator.updateEnvironmentSchedule(scheduledTriggerOptions);
    }

    private _getTimeZoneDropDown = (): IDropdownOption[] => {
        let options: IDropdownOption[] = [];
        let timeZones: RMContracts.TimeZone[] = [];
        let storedTimeZones: RMContracts.TimeZoneList = ReleaseEditorWebPageDataHelper.instance().getTimeZones();
        if (Boolean(storedTimeZones)) {
            timeZones = storedTimeZones.validTimeZones;
        }
        if (timeZones) {
            timeZones.forEach((timeZone, index) => {
                options.push({
                    key: timeZone.id, text: timeZone.displayName
                });
            });
        }

        return options;
    }

    private _getTriggerTabOptions(): IChoiceGroupOption[] {
        let triggerTabOptions: IChoiceGroupOption[] = [];
        let environmentList: PipelineDefinitionEnvironment[] = this._getFilteredOutEnvironmentList();

        triggerTabOptions.push(this._getTriggerTabOption(EnvironmentTriggerTabKeys.PostReleaseTriggerKey, Resources.PostReleaseTriggerTabName, "bowtie-build"));

        // Don't show PostEnvironmentDeployment Trigger tab if single environment present
        if (environmentList && environmentList.length > 0) {
            triggerTabOptions.push(this._getTriggerTabOption(EnvironmentTriggerTabKeys.PostEnvironmentDeploymentTriggerKey, Resources.PostEnvironmentDeploymentTriggerTabName, "bowtie-server-remote"));
        }

        triggerTabOptions.push(this._getTriggerTabOption(EnvironmentTriggerTabKeys.ManualTriggerKey, Resources.ManualTriggerTabName, "bowtie-trigger-user"));

        return triggerTabOptions;
    }

    private _getTabItems(): JSX.Element[] {
        let tabItems: JSX.Element[] = [];
        let environmentList: PipelineDefinitionEnvironment[] = this._getFilteredOutEnvironmentList();
        tabItems.push(
            <AsyncManualTriggerTabItem
                key={EnvironmentTriggerTabKeys.ManualTriggerKey}
                id={EnvironmentTriggerTabKeys.ManualTriggerKey}
                instanceId={this.props.instanceId} />);

        tabItems.push(
            <AsyncPostEnvironmentDeploymentTriggerTabItem
                key={EnvironmentTriggerTabKeys.PostEnvironmentDeploymentTriggerKey}
                id={EnvironmentTriggerTabKeys.PostEnvironmentDeploymentTriggerKey}
                instanceId={this.props.instanceId}
                environments={environmentList} />);

        tabItems.push(
            <AsyncPostReleaseTriggerTabItem
                key={EnvironmentTriggerTabKeys.PostReleaseTriggerKey}
                id={EnvironmentTriggerTabKeys.PostReleaseTriggerKey}
                instanceId={this.props.instanceId} />);

        return tabItems;
    }

    private _getFilteredOutEnvironmentList(): PipelineDefinitionEnvironment[] {
        let environmentList: PipelineDefinitionEnvironment[] = this._environmentListstore.getCurrentState();
        return environmentList && environmentList.filter((environment) => {
            return environment.id !== this._store.getEnvironmentId();
        });
    }

    private _onSourceOptionChange = (option?: IChoiceGroupOption) => {
        this._actionCreator.selectEnvironmentTriggerTab({
            selectedTabItemKey: option.key
        });
    }

    private _getTriggerTabOption(key: string, title: string, iconClassName: string): IChoiceGroupOption {
        return {
            key: key,
            text: title,
            iconProps: { className: css("bowtie-icon", "trigger-choice-group-icon", iconClassName) },
            checked: key === this.state.selectedTabItemKey,
        } as IChoiceGroupOption;
    }

    private _showErrorOnAccordion = (): boolean => {
        let showError: boolean = !this._store.isValid();
        return showError;
    }

    private _onHeaderClick = (isExpanded: boolean): void => {
        if (this.props.onHeaderClick) {
            this.props.onHeaderClick(PreDeploymentConditionsViewComponents.EnvironmentTriggerView, isExpanded);
        }
    }

    private iconSize: number = 30;
    private _store: EnvironmentTriggerStore;
    private _environmentListstore: EnvironmentListStore;
    private _environmentStore: DeployEnvironmentStore;
    private _actionCreator: EnvironmentTriggerActionCreator;
    private _environmentActionCreator: EnvironmentActionsCreator;
    private _showConfigureSchedule: boolean = true;
    private _accordianElement: AccordionCustomRenderer;
}
