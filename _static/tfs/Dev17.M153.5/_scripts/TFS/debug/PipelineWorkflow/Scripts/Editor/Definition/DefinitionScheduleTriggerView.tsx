/// <reference types="react" />

import * as React from "react";

import * as ComponentBase from "DistributedTaskControls/Common/Components/Base";
import { OverlayPanelHeading } from "DistributedTaskControls/Components/OverlayPanelHeading";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import { ErrorComponent } from "DistributedTaskControls/SharedControls/ErrorComponent/ErrorComponent";
import { DtcUtils } from "DistributedTaskControls/Common/Utilities";

import { Toggle } from "OfficeFabric/Toggle";
import { IDropdownOption } from "OfficeFabric/Dropdown";
import { CommandButton, IButton } from "OfficeFabric/Button";

import { DefinitionScheduleTriggerStore, IDefinitionScheduleTriggerState } from "PipelineWorkflow/Scripts/Editor/Definition/DefinitionScheduleTriggerStore";
import { DefinitionScheduleTriggerActionCreator } from "PipelineWorkflow/Scripts/Editor/Definition/DefinitionScheduleTriggerActionCreator";

import { DayTimePicker, DayTimePickerDefaults } from "DistributedTaskControls/Components/DayTimePicker";
import { ScheduleItem } from "DistributedTaskControls/Components/ScheduleItem";
import { IDateTimeSchedule, IScheduleTriggerOptions } from "DistributedTaskControls/Common/Types";
import { PipelineReleaseSchedule } from "PipelineWorkflow/Scripts/Common/Types";
import { ReleaseEditorWebPageDataHelper } from "PipelineWorkflow/Scripts/Editor/Sources/ReleaseEditorWebPageData";
import { ScheduleUtils } from "PipelineWorkflow/Scripts/Editor/Common/ScheduleUtils";
import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";

import RMContracts = require("ReleaseManagement/Core/Contracts");

import * as Utils_String from "VSS/Utils/String";

import "VSS/LoaderPlugins/Css!RM:PipelineWorkflow/Scripts/Editor/Definition/DefinitionScheduleTriggerView";

/**
 * View containing schedule trigger of an environment
 */
export class DefinitionScheduleTriggerView extends ComponentBase.Component<ComponentBase.IProps, IDefinitionScheduleTriggerState> {

    constructor(props: ComponentBase.IProps) {
        super(props);
        this._actionCreator = ActionCreatorManager.GetActionCreator<DefinitionScheduleTriggerActionCreator>(DefinitionScheduleTriggerActionCreator);
        this._store = StoreManager.GetStore<DefinitionScheduleTriggerStore>(DefinitionScheduleTriggerStore);
    }

    public componentWillMount() {
        this._store.addChangedListener(this._onChange);
        this.setState(this._store.getState());
    }

    public componentWillUnmount() {
        this._store.removeChangedListener(this._onChange);
    }

    public render(): JSX.Element {
        const ariaLabelId = "overlay-panel-heading-label-" + DtcUtils.getUniqueInstanceId();
        let focusAddNewTime: boolean = (this.state.isScheduleEnabled && this.state.schedules.length === 0) ? true : false;

        return (<div className="definition-schedule-triggers-container">
            <div className="schedules-container" data-first-focus-element={true}>

                <OverlayPanelHeading
                    label={Resources.DefinitionScheduleTriggerHeading}
                    labelId={ariaLabelId}
                    infoButtonRequired={false}
                    description={Resources.DefinitionScheduleTriggerDescription} >
                </OverlayPanelHeading>

                <Toggle
                    label={Utils_String.empty}
                    checked={this.state.isScheduleEnabled}
                    onText={Resources.EnabledText}
                    offText={Resources.DisabledText}
                    onChanged={this._handleToggleChange}
                    aria-labelledby={ariaLabelId} />

                <div className="toggle-help-text">{Resources.DefinitionScheduleToggleHelpText}</div>

                {
                    this.state.isScheduleEnabled &&
                    <div className="schedule-list constrained-width">
                        {this._getSchedulesForBuild(this.state.schedules, this.state.isConfigureScheduleEnabled)}
                    </div>
                }

                <div className="schedule-trigger-add-new">
                    {
                        this.state.isScheduleEnabled && this._getAddNewTimeButton(focusAddNewTime)
                    }
                </div>

            </div>
        </div>
        );
    }

    private _getSchedulesForBuild(schedules: PipelineReleaseSchedule[], configureScheduleEnabled: boolean[]): JSX.Element[] {
        let retValue: JSX.Element[] = [];

        schedules.forEach((schedule: PipelineReleaseSchedule, index: number) => {
            let dateTimeSchedule: IDateTimeSchedule = this._getDateTimeSchedule(schedule);
            retValue.push(
                <ScheduleItem
                    index={index}
                    key={index}
                    schedule={dateTimeSchedule}
                    isConfigureScheduleEnabled={configureScheduleEnabled[index]}
                    showRemoveScheduleButton={schedules.length > 1}
                    onRemoveSchedule={this._removeSchedule}
                    isFocused={index === this._selectedScheduleIndex}
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
        });
        this._resetSelectedScheduleIndex();
        return retValue;
    }

    private _getAddNewTimeButton(focusButton: boolean): JSX.Element {
        let addNewScheduleButton: JSX.Element = (
            <CommandButton
                className="fabric-style-overrides add-new-item-button"
                componentRef={(elem) => {
                    this._addNewSchedule = elem;
                }}
                iconProps={{ iconName: "Add" }}
                ariaLabel={Resources.AddNewTimeDescription}
                ariaDescription={Resources.AddNewTimeDescription}
                onClick={this._onAddScheduleClick}>
                {Resources.AddNewTimeDescription}
            </CommandButton>);

        if (focusButton && this._addNewSchedule) {
            this._addNewSchedule.focus();
        }
        return addNewScheduleButton;
    }

    private _resetSelectedScheduleIndex(): void {
        this._selectedScheduleIndex = -1;
    }

    private _onChange = () => {
        this.setState(this._store.getState());
    }

    private _getDateTimeSchedule(buildSchedule: PipelineReleaseSchedule): IDateTimeSchedule {
        return {
            days: buildSchedule.daysToRelease,
            startHours: buildSchedule.startHours,
            startMinutes: buildSchedule.startMinutes
        };
    }

    private _getTimeZoneDropDown(): IDropdownOption[] {
        let options: IDropdownOption[] = [];
        let timeZones: RMContracts.TimeZone[] = [];
        let storedTimeZones: RMContracts.TimeZoneList = ReleaseEditorWebPageDataHelper.instance().getTimeZones();
        if (Boolean(storedTimeZones)) {
            timeZones = storedTimeZones.validTimeZones;
        }
        if (timeZones) {
            timeZones.forEach((timeZone: RMContracts.TimeZone, index: number) => {
                options.push({
                    key: timeZone.id, text: timeZone.displayName
                });
            });
        }

        return options;
    }

    private _handleToggleChange = (option: boolean): void => {
        if (option) {
            this._selectedScheduleIndex = 0;
        } else {
            this._resetSelectedScheduleIndex();
        }
        this._actionCreator.updateEnableEnvironmentSchedule(option);
    }

    private _onDayChange = (scheduledTriggerOptions: IScheduleTriggerOptions) => {
        this._actionCreator.updateDefinitionSchedule(scheduledTriggerOptions);
    }

    private _onTimeChange = (scheduledTriggerOptions: IScheduleTriggerOptions) => {
        this._actionCreator.updateDefinitionSchedule(scheduledTriggerOptions);
    }

    private _onAddScheduleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        this._actionCreator.addSchedule();
        this._selectedScheduleIndex = this.state.schedules.length;
        DtcUtils.scrollElementToView(event.currentTarget);
    }

    private _removeSchedule = (index: number): void => {
        let lastIndex: number = this.state.schedules ? this.state.schedules.length - 1 : 0;
        if ((index === lastIndex) && this._addNewSchedule) {
            this._addNewSchedule.focus();
            this._resetSelectedScheduleIndex();
        } else {
            this._selectedScheduleIndex = index === lastIndex ? lastIndex - 1 : index;
        }

        this._actionCreator.removeSchedule(index);
    }

    private _toggleConfigureScheduleView = (index: number): void => {
        this._actionCreator.toggleConfigureScheduleView(index);
    }

    private _actionCreator: DefinitionScheduleTriggerActionCreator;
    private _store: DefinitionScheduleTriggerStore;
    private _selectedScheduleIndex: number = -1;
    private _addNewSchedule: IButton;
}