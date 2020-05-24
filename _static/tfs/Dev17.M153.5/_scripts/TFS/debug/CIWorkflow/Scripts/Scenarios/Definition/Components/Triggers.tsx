/// <reference types="react" />

import * as React from "react";

import { ErrorMessageParentKeyConstants } from "CIWorkflow/Scripts/Common/Constants";
import * as Resources from "CIWorkflow/Scripts/Resources/TFS.Resources.CIWorkflow";
import { ContinuousIntegrationTriggerOverview, ContinuousIntegrationTriggerDetails } from "CIWorkflow/Scripts/Scenarios/Definition/Components/ContinuousIntegrationTriggers";
import { GatedCheckInTriggerOverview, GatedCheckInDetails } from "CIWorkflow/Scripts/Scenarios/Definition/Components/GatedCheckIn";
import { PullRequestTriggerOverview, PullRequestTriggerDetails } from "CIWorkflow/Scripts/Scenarios/Definition/Components/PullRequestTrigger";
import { ScheduledTriggerDetails, ScheduledTriggerOverview } from "CIWorkflow/Scripts/Scenarios/Definition/Components/ScheduledIntegrationTriggers";
import { SourcesSelectionStore } from "CIWorkflow/Scripts/Scenarios/Definition/Stores/SourcesSelectionStore";
import { TriggersActionsCreator } from "CIWorkflow/Scripts/Scenarios/Definition/Actions/TriggersActionsCreator";
import * as Actions from "CIWorkflow/Scripts/Scenarios/Definition/Actions/TriggersActions";
import { ScheduledTriggerStore, IScheduledTriggerState } from "CIWorkflow/Scripts/Scenarios/Definition/Stores/ScheduledTriggerStore";
import { GatedCheckInStore, ITriggersState as IGatedCheckInTriggersState } from "CIWorkflow/Scripts/Scenarios/Definition/Stores/GatedCheckInStore";
import { PullRequestTriggerStore, IPullRequestTriggerState } from "CIWorkflow/Scripts/Scenarios/Definition/Stores/PullRequestTriggerStore";
import { BuildCompletionTriggerStore, IBuildCompletionTriggerState } from "CIWorkflow/Scripts/Scenarios/Definition/Stores/BuildCompletionTriggerStore";
import { BuildCompletionTriggerDetails } from "CIWorkflow/Scripts/Scenarios/Definition/Components/BuildCompletionTriggerDetails";
import { BuildCompletionTriggerOverview } from "CIWorkflow/Scripts/Scenarios/Definition/Components/BuildCompletionTriggerOverview";

import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import * as Base from "DistributedTaskControls/Common/Components/Base";
import { Item } from "DistributedTaskControls/Common/Item";
import { Store as ItemSelectionStore } from "DistributedTaskControls/Stores/ItemSelectionStore";
import { TwoPanelSelectorComponent } from "DistributedTaskControls/Components/TwoPanelSelectorComponent";
import { ITwoPanelOverviewProps, TwoPanelOverviewComponent } from "DistributedTaskControls/Components/TwoPanelOverviewComponent";
import { ITabItemProps } from "DistributedTaskControls/Common/Types";
import { Component as ErrorMessageBar } from "DistributedTaskControls/Components/InformationBar";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { ScheduleIntegrationUtils } from "DistributedTaskControls/Common/ScheduleIntegrationUtils";

import { Actions as ItemSelectorActions } from "DistributedTaskControls/Actions/ItemSelectorActions";

import { Schedule, BuildRepository } from "TFS/Build/Contracts";

import * as ServerConstants from "Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants";

import * as Utils_String from "VSS/Utils/String";
import * as FeatureAvailability_Services from "VSS/FeatureAvailability/Services";

import { ActionButton } from "OfficeFabric/Button";
import { css } from "OfficeFabric/Utilities";

import "VSS/LoaderPlugins/Css!CIWorkflow/Scripts/Scenarios/Definition/Components/Triggers";
import "VSS/LoaderPlugins/Css!DistributedTaskControls/Styles/FabricStyleOverrides";

export interface ITriggerCategoryButtonProperties {
    caption: string;
    ariaLabel: string;
    iconName: string;
    disabled: boolean;
    callback: () => any;
}

export class TriggerCategoryHeadingItem implements Item {
    public constructor(key: string, heading: string, subheading?: string, buttonProps?: ITriggerCategoryButtonProperties) {
        this._key = key;
        this._heading = heading;
        this._subheading = subheading;
        this._buttonProps = buttonProps;
    }

    public getOverview(instanceId?: string): JSX.Element {
        return (
            <div className="two-panel-overview">
                <div className={this._buttonProps ? "trigger-category-overview-aligned" : "trigger-category-overview"}>
                    <div className="trigger-category-title">
                        {this._heading}
                    </div>
                    {
                        this._subheading &&
                        <div className="trigger-category-subheading">
                            {this._subheading}
                        </div>
                    }
                </div>
                {
                    this._buttonProps &&
                    <div className="trigger-category-control right">
                            <ActionButton
                                className="trigger-category-button"
                                onClick={this._onButtonClicked}
                                disabled={this._buttonProps.disabled}
                                ariaLabel={this._buttonProps.ariaLabel}
                                iconProps={{
                                    iconName: "Add",
                                    className:"trigger-button-icon"
                                }}>
                                    <div className="trigger-button-text">{this._buttonProps.caption}</div>
                            </ActionButton>
                    </div>
                }
            </div>
        );
    }

    public getDetails(): JSX.Element {
        return null;
    }

    public getView(): JSX.Element {
        return null;
    }

    public getKey(): string {
        return this._key;
    }

    private _onButtonClicked = () => {
        if (this._buttonProps && this._buttonProps.callback) {
            this._buttonProps.callback();
        }
    }

    private _key: string;
    private _heading: string;
    private _subheading: string;
    private _buttonProps: ITriggerCategoryButtonProperties;
}


export class TriggerItem implements Item {
    public constructor(key: string, overview: JSX.Element, details: JSX.Element) {
        this._key = key;
        this._overview = overview;
        this._details = details;
    }

    public getOverview(instanceId?: string): JSX.Element {
        return this._overview;
    }

    public setOverview(overview: JSX.Element) {
        this._overview = overview;
    }

    public getDetails(): JSX.Element {
        return (
            <div className="trigger-details">
                {this._details}
            </div>
        );
    }

    public getView(): JSX.Element {
        return null;
    }

    public getKey(): string {
        return this._key;
    }

    private _key: string;
    private _overview: JSX.Element;
    private _details: JSX.Element;
}

export interface ITriggersTabProps extends ITabItemProps {
    isReadOnly: boolean;
}

export interface ITriggersTabState {
    scheduledTriggerState: IScheduledTriggerState;
    gatedCheckInState: IGatedCheckInTriggersState;
    pullRequestTriggerState: IPullRequestTriggerState;
    buildCompletionTriggerState: IBuildCompletionTriggerState;
}

export class TriggersTab extends Base.Component<ITriggersTabProps, ITriggersTabState> {

    public componentWillMount() {
        this._enableBuildCompletion = FeatureAvailability_Services.FeatureAvailabilityService.isFeatureEnabled(ServerConstants.FeatureAvailabilityFlags.WebAccessBuildCIWorkflowBuildCompletion);

        this._scheduleTriggerStore = StoreManager.GetStore<ScheduledTriggerStore>(ScheduledTriggerStore);
        this._gatedCheckInStore = StoreManager.GetStore<GatedCheckInStore>(GatedCheckInStore);
        this._pullRequestTriggerStore = StoreManager.GetStore<PullRequestTriggerStore>(PullRequestTriggerStore);
        this._buildCompletionTriggerStore = StoreManager.GetStore<BuildCompletionTriggerStore>(BuildCompletionTriggerStore);
        this._actionCreator = ActionCreatorManager.GetActionCreator<TriggersActionsCreator>(TriggersActionsCreator);
        this._sourcesSelectionStore = StoreManager.GetStore<SourcesSelectionStore>(SourcesSelectionStore);

        this.setState({
            scheduledTriggerState: this._scheduleTriggerStore.getState(),
            gatedCheckInState: this._gatedCheckInStore.getState(),
            pullRequestTriggerState: this._pullRequestTriggerStore.getState(),
            buildCompletionTriggerState: this._buildCompletionTriggerStore.getState()
        });
    }

    public componentDidMount() {
        this._scheduleTriggerStore.addChangedListener(this._onChange);
        this._gatedCheckInStore.addChangedListener(this._onChange);
        this._pullRequestTriggerStore.addChangedListener(this._onChange);
        this._buildCompletionTriggerStore.addChangedListener(this._onChange);
    }

    public componentWillUnmount() {
        this._scheduleTriggerStore.removeChangedListener(this._onChange);
        this._gatedCheckInStore.removeChangedListener(this._onChange);
        this._pullRequestTriggerStore.removeChangedListener(this._onChange);
        this._buildCompletionTriggerStore.removeChangedListener(this._onChange);
    }

    public render(): JSX.Element {
        let myItems = [];
        myItems.push(new TriggerCategoryHeadingItem("ContinuousIntegrationHeading", Resources.ContinuousIntegrationHeading));
        let repoTrigger = new TriggerItem("ContinuousIntegration", null, <ContinuousIntegrationTriggerDetails disabled={!!this.props.isReadOnly} />);
        repoTrigger.setOverview(<ContinuousIntegrationTriggerOverview item={repoTrigger} />);
        myItems.push(repoTrigger);

        if (this.state.gatedCheckInState.showGatedCheckIn) {
            myItems.push(new TriggerCategoryHeadingItem("GatedCheckInHeading", Resources.GatedCheckInHeading));
            let gatedCheckInTrigger = new TriggerItem("GatedCheckIn", null, <GatedCheckInDetails disabled={!!this.props.isReadOnly} />);
            gatedCheckInTrigger.setOverview(<GatedCheckInTriggerOverview item={gatedCheckInTrigger} />);
            myItems.push(gatedCheckInTrigger);
        }

        if (this.state.pullRequestTriggerState.isSupported) {
            myItems.push(new TriggerCategoryHeadingItem("PullRequestHeading", Resources.PullRequestHeading));
            let pullRequestTrigger = new TriggerItem("PullRequestTrigger", null, <PullRequestTriggerDetails disabled={!!this.props.isReadOnly} />);
            pullRequestTrigger.setOverview(<PullRequestTriggerOverview item={pullRequestTrigger} />);
            myItems.push(pullRequestTrigger);
        }

        myItems.push(new TriggerCategoryHeadingItem(
            "SchedulesHeading",
            Resources.SchedulesHeading,
            null,
            {caption: Resources.AddTrigger, ariaLabel:Resources.AddScheduleTriggerLabel, iconName: "Add", disabled: !!this.props.isReadOnly, callback: this._addScheduleClicked})
        );

        if (this.state.scheduledTriggerState.isScheduledIntegrationEnabled && this.state.scheduledTriggerState.schedules) {
            this.state.scheduledTriggerState.schedules.forEach((schedule, index) => {
                let scheduleTriggerItem = new TriggerItem("Schedule_" + index, null, <ScheduledTriggerDetails scheduleIndex={index} onScheduleDeleted={this._onScheduleDeleted} disabled={!!this.props.isReadOnly} />);
                scheduleTriggerItem.setOverview(
                    <ScheduledTriggerOverview
                        item={scheduleTriggerItem}
                        title={ScheduleIntegrationUtils.getScheduleTimeText(schedule.startHours, schedule.startMinutes)}
                        subtitle={ScheduleIntegrationUtils.getScheduleDaysText(schedule.daysToBuild)}
                        isValid={!(this._scheduleTriggerStore.showBranchFilterError(schedule) || this._scheduleTriggerStore.showNoDaySelectedError(schedule))}/>
                );
                myItems.push(scheduleTriggerItem);
            });
        }
        else {
            myItems.push(new TriggerCategoryHeadingItem(
                "NoSchedulesHeading",
                null,
                Resources.NoSchedulesSubheading)
            );
        }

        if (this._enableBuildCompletion && this.state.buildCompletionTriggerState.isBuildCompletionSupported) {
            myItems.push(new TriggerCategoryHeadingItem(
                "BuildCompletionHeading",
                Resources.BuildCompletionHeading,
                null,
                {caption: Resources.AddTrigger, ariaLabel: Resources.AddBuildCompletionTriggerLabel, iconName: "Add", disabled: !!this.props.isReadOnly || this.state.buildCompletionTriggerState.definitionNames.length === 0, callback: this._addBuildCompletionClicked})
            );

            if (this.state.buildCompletionTriggerState.isBuildCompletionEnabled && this.state.buildCompletionTriggerState.buildCompletionTriggers) {
                this.state.buildCompletionTriggerState.buildCompletionTriggers.forEach((triggerInfo, index) => {
                    let trigger = triggerInfo.trigger;
                    let buildCompletionTrigger = new TriggerItem("BuildCompletion_" + index, null, <BuildCompletionTriggerDetails index={index} onTriggerDeleted={this._onBuildCompletionTriggerDeleted} disabled={!!this.props.isReadOnly} />);
                    buildCompletionTrigger.setOverview(<BuildCompletionTriggerOverview index={index} item={buildCompletionTrigger} trigger={trigger}/>);
                    myItems.push(buildCompletionTrigger);
                });
            }
            else {
                myItems.push(new TriggerCategoryHeadingItem(
                    "NoBuildCompletionHeading",
                    null,
                    Resources.NoBuildCompletionTriggersSubheading)
                );
            }
        }

        this._items = myItems;

        return (
            <div className="triggers-parent-container-two-panel" role="region" aria-label={Resources.ARIALabelTriggersTab}>
                <ErrorMessageBar parentKey={ErrorMessageParentKeyConstants.Triggers} />
                <TwoPanelSelectorComponent
                    items={this._items}
                    defaultItemKey="ContinuousIntegration"
                    leftPaneARIARegionRoleLabel={Resources.TriggersEditorLeftPane}
                    rightPaneARIARegionRoleLabel={Resources.TriggersEditorRightPane}
                    instanceId="trigger-selector"
                    setFocusOnLastSelectedItem={false} />
            </div>
        );
    }

    public componentDidUpdate(prevProps: ITabItemProps, prevState: ITriggersTabState) {
        let itemSelectionStore = StoreManager.GetStore<ItemSelectionStore>(ItemSelectionStore, "trigger-selector");
        let itemSelectorActions = ActionsHubManager.GetActionsHub<ItemSelectorActions>(ItemSelectorActions, "trigger-selector");
        let selectedItem: Item = itemSelectionStore.getSelectedItem();
        let matchingItem: Item = null;
        if (selectedItem) {
            let selectedKey = selectedItem.getKey();
            for (let i = 0; i < this._items.length; i++) {
                if (this._items[i].getKey() === selectedKey) {
                    matchingItem = this._items[i];
                    break;
                }
            }
        }
        if (!matchingItem) {
            let newSelectionKey = "ContinuousIntegration";
            let newSelectedItem: Item = null;
            for (let i = 0; i < this._items.length; i++) {
                if (this._items[i].getKey() === newSelectionKey) {
                    newSelectedItem = this._items[i];
                    break;
                }
            }

            // need to invoke the selectItem action asynchronously to avoid invoking it within another action
            window.setTimeout(function () { itemSelectorActions.selectItem.invoke({data: newSelectedItem}); }, 0);
        }
    }

    private _onChange = () => {
        this.setState({
            scheduledTriggerState: this._scheduleTriggerStore.getState(),
            gatedCheckInState: this._gatedCheckInStore.getState(),
            pullRequestTriggerState: this._pullRequestTriggerStore.getState(),
            buildCompletionTriggerState: this._buildCompletionTriggerStore.getState()
        });
    }

    private _addScheduleClicked = () => {
        let index = 0;

        if (this.state.scheduledTriggerState.isScheduledIntegrationEnabled) {
            index = this.state.scheduledTriggerState.schedules.length;
            let schedule: Actions.IScheduleIndexBranchPayload = {
                scheduleIndex: index,
                defaultBranch: this._sourcesSelectionStore.getBuildRepository().defaultBranch
            };
            this._actionCreator.addSchedule(schedule);
        }
        else {
            index = 0;
            let defaultRepository: BuildRepository = this._sourcesSelectionStore.getBuildRepository();
            let defaultBranchFilter: string = Utils_String.empty;
            if (defaultRepository) {
                defaultBranchFilter = defaultRepository.defaultBranch ? defaultRepository.defaultBranch : defaultRepository.rootFolder;
            }

            let togglePayload: Actions.IToggleBranchPayload = {
                toggleValue: true,
                defaultBranchFilter: defaultBranchFilter,
                defaultPathFilter: null,
                repositoryType: defaultRepository ? defaultRepository.type : null,
                scheduleIndex: index
            };

            this._actionCreator.toggleScheduleIntegration(togglePayload);

            // Schedule store restores previous schedules when toggled, so need
            // to remove and add a new schedule in this case
            while (this.state.scheduledTriggerState.schedules.length > 0) {
                let schedule: Actions.IScheduleActionPayload = {
                    index: 0
                };
                this._actionCreator.removeSchedule(schedule);
            }
            let newSchedule: Actions.IScheduleIndexBranchPayload = {
                scheduleIndex: 0,
                defaultBranch: this._sourcesSelectionStore.getBuildRepository().defaultBranch
            };
            this._actionCreator.addSchedule(newSchedule);
        }

        let itemSelectorActions = ActionsHubManager.GetActionsHub<ItemSelectorActions>(ItemSelectorActions, "trigger-selector");
        let scheduleTriggerItem = new TriggerItem("Schedule_" + index, null, <ScheduledTriggerDetails scheduleIndex={index} onScheduleDeleted={this._onScheduleDeleted}/>);
        scheduleTriggerItem.setOverview(
            <ScheduledTriggerOverview
                item={scheduleTriggerItem}
                title=""
                subtitle=""
                isValid={true} />
        );

        itemSelectorActions.selectItem.invoke({data: scheduleTriggerItem});
    }

    private _addBuildCompletionClicked = () => {
        let index = this.state.buildCompletionTriggerState.buildCompletionTriggers.length;
        if (!this.state.buildCompletionTriggerState.isBuildCompletionEnabled) {
            index = 0;
        }
        let triggerInfo: Actions.IAddBuildCompletionTrigger = {
            definitionId: null
        };
        this._actionCreator.addBuildCompletionTrigger(triggerInfo);

        let itemSelectorActions = ActionsHubManager.GetActionsHub<ItemSelectorActions>(ItemSelectorActions, "trigger-selector");
        let triggerItem = new TriggerItem("BuildCompletion_" + index, null, <BuildCompletionTriggerDetails index={index} onTriggerDeleted={this._onBuildCompletionTriggerDeleted}/>);
        triggerItem.setOverview(
            <BuildCompletionTriggerOverview index={index} item={triggerItem} trigger={null}/>
        );

        itemSelectorActions.selectItem.invoke({data: triggerItem});
    }

    private _onScheduleDeleted = (index: number) => {
        let itemSelectorActions = ActionsHubManager.GetActionsHub<ItemSelectorActions>(ItemSelectorActions, "trigger-selector");
        itemSelectorActions.clearSelection.invoke({});

        if (this.state.scheduledTriggerState.isScheduledIntegrationEnabled && this.state.scheduledTriggerState.schedules.length > 0) {
            let newSelectedIndex = index;
            if (this.state.scheduledTriggerState.schedules.length <= index) {
                newSelectedIndex = this.state.scheduledTriggerState.schedules.length - 1;
            }
            let newSelectedItem = null;
            for (let i = 0; i < this._items.length; i++) {
                if (this._items[i].getKey() === "Schedule_" + newSelectedIndex) {
                    newSelectedItem = this._items[i];
                    break;
                }
            }
            itemSelectorActions.selectItem.invoke({data: newSelectedItem});
        }
        else {
            let newSelectedItemKey = "ContinuousIntegration";
            if (this.state.gatedCheckInState.showGatedCheckIn) {
                newSelectedItemKey = "GatedCheckIn";
            }
            else if (this.state.pullRequestTriggerState.isSupported) {
                newSelectedItemKey = "PullRequestTrigger";
            }
            let newSelectedItem = null;
            for (let i = 0; i < this._items.length; i++) {
                if (this._items[i].getKey() === newSelectedItemKey) {
                    newSelectedItem = this._items[i];
                    break;
                }
            }
            itemSelectorActions.selectItem.invoke({data: newSelectedItem});
        }
    }

    private _onBuildCompletionTriggerDeleted = (index: number) => {
        let itemSelectorActions = ActionsHubManager.GetActionsHub<ItemSelectorActions>(ItemSelectorActions, "trigger-selector");
        itemSelectorActions.clearSelection.invoke({});

        if (this.state.buildCompletionTriggerState.isBuildCompletionEnabled && this.state.buildCompletionTriggerState.buildCompletionTriggers.length > 0) {
            let newSelectedIndex = index;
            if (this.state.buildCompletionTriggerState.buildCompletionTriggers.length <= index) {
                newSelectedIndex = this.state.buildCompletionTriggerState.buildCompletionTriggers.length - 1;
            }
            let newSelectedItem = null;
            for (let i = 0; i < this._items.length; i++) {
                if (this._items[i].getKey() === "BuildCompletion_" + newSelectedIndex) {
                    newSelectedItem = this._items[i];
                    break;
                }
            }
            itemSelectorActions.selectItem.invoke({data: newSelectedItem});
        }
        else {
            let newSelectedItemKey = "ContinuousIntegration";
            if (this.state.scheduledTriggerState.isScheduledIntegrationEnabled && this.state.scheduledTriggerState.schedules.length > 0)
            {
                newSelectedItemKey = "Schedule_" + (this.state.scheduledTriggerState.schedules.length - 1);
            }
            else if (this.state.gatedCheckInState.showGatedCheckIn) {
                newSelectedItemKey = "GatedCheckIn";
            }
            else if (this.state.pullRequestTriggerState.isSupported) {
                newSelectedItemKey = "PullRequestTrigger";
            }
            let newSelectedItem = null;
            for (let i = 0; i < this._items.length; i++) {
                if (this._items[i].getKey() === newSelectedItemKey) {
                    newSelectedItem = this._items[i];
                    break;
                }
            }
            itemSelectorActions.selectItem.invoke({data: newSelectedItem});
        }
    }

    private _scheduleTriggerStore: ScheduledTriggerStore;
    private _gatedCheckInStore: GatedCheckInStore;
    private _pullRequestTriggerStore: PullRequestTriggerStore;
    private _buildCompletionTriggerStore: BuildCompletionTriggerStore;
    private _actionCreator: TriggersActionsCreator;
    private _sourcesSelectionStore: SourcesSelectionStore;
    private _enableBuildCompletion: boolean;
    private _items: Item[];
}
