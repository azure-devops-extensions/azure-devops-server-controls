/// <reference types="react" />

import * as React from "react";

import * as Resources from "CIWorkflow/Scripts/Resources/TFS.Resources.CIWorkflow";
import * as Actions from "CIWorkflow/Scripts/Scenarios/Definition/Actions/TriggersActions";
import { TriggersActionsCreator } from "CIWorkflow/Scripts/Scenarios/Definition/Actions/TriggersActionsCreator";
import { FilterType } from "CIWorkflow/Scripts/Scenarios/Definition/Common";
import { FiltersComponent as Filters } from "CIWorkflow/Scripts/Scenarios/Definition/Components/Filters";
import * as WebPageData from "CIWorkflow/Scripts/Scenarios/Definition/Sources/WebPageData";
import { IScheduledTriggerState, ScheduledTriggerStore } from "CIWorkflow/Scripts/Scenarios/Definition/Stores/ScheduledTriggerStore";
import { SourcesSelectionStore } from "CIWorkflow/Scripts/Scenarios/Definition/Stores/SourcesSelectionStore";

import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import * as Base from "DistributedTaskControls/Common/Components/Base";
import { Item } from "DistributedTaskControls/Common/Item";
import { ScheduleIntegrationUtils } from "DistributedTaskControls/Common/ScheduleIntegrationUtils";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { IDateTimeSchedule, IScheduleTriggerOptions } from "DistributedTaskControls/Common/Types";
import { DtcUtils } from "DistributedTaskControls/Common/Utilities";
import { DayTimePicker, DayTimePickerDefaults } from "DistributedTaskControls/Components/DayTimePicker";
import { ScheduleItem } from "DistributedTaskControls/Components/ScheduleItem";
import { TwoPanelOverviewComponent } from "DistributedTaskControls/Components/TwoPanelOverviewComponent";
import { ErrorComponent } from "DistributedTaskControls/SharedControls/ErrorComponent/ErrorComponent";
import { BooleanInputComponent } from "DistributedTaskControls/SharedControls/InputControls/Components/BooleanInputComponent";
import { ToggleInputComponent } from "DistributedTaskControls/SharedControls/InputControls/Components/ToggleInputComponent";

import { ActionButton, IButton } from "OfficeFabric/Button";
import { CommandButton } from "OfficeFabric/components/Button/CommandButton/CommandButton";
import { IDropdownOption } from "OfficeFabric/components/Dropdown/Dropdown.types";

import { BuildRepository, Schedule } from "TFS/Build/Contracts";

import * as Utils_String from "VSS/Utils/String";
import { Positioning } from "VSS/Utils/UI";

export interface IScheduledTriggerOverviewProps extends Base.IProps {
    item: Item;
    title: string;
    subtitle: string;
    isValid: boolean;
}

export class ScheduledTriggerOverview extends Base.Component<IScheduledTriggerOverviewProps, Base.IStateless> {
    public render(): JSX.Element {
        let viewElement: JSX.Element = null;

        if (!this.props.isValid) {
            viewElement = (<ErrorComponent cssClass="trigger-overview-error" errorMessage={Resources.SomeSettingsNeedAttention} />);
        }
        else {
            viewElement = (<div className="schedule-trigger-item-view">{this.props.subtitle}</div>);
        }

        return (
            <div className="repository-trigger-item-overview">
                <TwoPanelOverviewComponent
                    title={this.props.title}
                    view={viewElement}
                    item={this.props.item}
                    instanceId="trigger-selector"
                    iconClassName="ms-Icon ms-Icon--Clock trigger-icon"
                    overviewClassName="si-trigger-overview-body" />
            </div>
        );
    }
}

export interface IScheduleTriggerDetailsProps extends Base.IProps {
    scheduleIndex: number;
    onScheduleDeleted: (index: number) => any;
    disabled?: boolean;
}

export class ScheduledTriggerDetails extends Base.Component<IScheduleTriggerDetailsProps, IScheduledTriggerState> {
    private _store: ScheduledTriggerStore;
    private _actionCreator: TriggersActionsCreator;
    private _sourcesSelectionStore: SourcesSelectionStore;
    
    public componentWillMount() {
        this._store = StoreManager.GetStore<ScheduledTriggerStore>(ScheduledTriggerStore);
        this._actionCreator = ActionCreatorManager.GetActionCreator<TriggersActionsCreator>(TriggersActionsCreator);
        this._sourcesSelectionStore = StoreManager.GetStore<SourcesSelectionStore>(SourcesSelectionStore);
        this.state = this._store.getState();
    }

    public componentDidMount() {
        this._store.addChangedListener(this._onChange);
    }

    public componentWillUnmount() {
        this._store.removeChangedListener(this._onChange);
    }

    public render(): JSX.Element {
        if (this.props.scheduleIndex >= this.state.schedules.length) {
            // This schedule no longer exists, nothing to render
            return null;
        }

        let schedule = this.state.schedules[this.props.scheduleIndex];
        let dateTimeSchedule: IDateTimeSchedule = this._getDateTimeSchedule(schedule);

        let repository: BuildRepository = this._sourcesSelectionStore.getBuildRepository();
        let repositoryType: string = repository ? repository.type : Utils_String.empty;

        const summaryText = ScheduleIntegrationUtils.getScheduleSummaryText(dateTimeSchedule.days,
            dateTimeSchedule.startHours, dateTimeSchedule.startMinutes);
        
        return (
            <div className="trigger-si-sub-container">
                <div className="schedule-trigger-overview" key={this.props.scheduleIndex}>
                    <div className="trigger-details-header">
                        <div className="ms-Icon ms-Icon--Clock schedule-clock" />
                        <div className="schedule-summary">
                            <div className="days-summary">
                                {summaryText}
                            </div>
                        </div>
                        <div className="trigger-delete">
                            <ActionButton
                                ariaLabel={Resources.DeleteScheduleTrigger}
                                className="delete-schedule-button"
                                onClick={(event: React.MouseEvent<HTMLButtonElement>) => { this._removeSchedule(this.props.scheduleIndex); }}
                                disabled={!!this.props.disabled}>
                                <i className="bowtie-icon bowtie-trash trigger-button-icon" aria-hidden="true"/> {Resources.DeleteScheduleTrigger}
                            </ActionButton>
                        </div>
                    </div>
                    <div className="schedule-expanded-container">
                        <DayTimePicker
                            key={this.props.scheduleIndex}
                            id={this.props.scheduleIndex}
                            label={Resources.DayTimePickerLabel}
                            daysOfWeek={schedule.daysToBuild}
                            hour={(schedule.startHours === 0) ? DayTimePickerDefaults.keyForZeroHours : schedule.startHours}
                            minute={schedule.startMinutes}
                            timeZoneId={schedule.timeZoneId}
                            getTimeZones={this._getTimeZoneDropDown}
                            onDayChange={this._onDayChange}
                            onTimeChange={this._onTimeChange}
                            disabled={!!this.props.disabled} >
                        </DayTimePicker>

                        <BooleanInputComponent
                            cssClass={"standalone-checkbox-data"}
                            label={Resources.ScheduleOnlyWithChangesLabel}
                            onValueChanged={(newValue: boolean) => { this._onScheduleOnlyWithChangesChanged(newValue, this.props.scheduleIndex); } }
                            value={schedule.scheduleOnlyWithChanges}
                            disabled={!!this.props.disabled} />

                        {this.state.isBranchFilterSupported ?
                            <Filters
                                key={"si-trigger-filters-" + this.props.scheduleIndex}
                                onFilterOptionChange={(option, optionIndex, rowIndex) => { this._onBranchFilterOptionChange(option, optionIndex, rowIndex, this.props.scheduleIndex); } }
                                filterType={FilterType.BranchFilter}
                                isFilterRequired={true}
                                filters={schedule.branchFilters}
                                onFilterChange={(filterValue, rowIndex) => { this._onBranchFilterChange(filterValue, rowIndex, this.props.scheduleIndex); } }
                                onFilterDelete={(rowIndex) => { this._onBranchFilterDelete(rowIndex, this.props.scheduleIndex); } }
                                onAddFilterClick={(event: React.MouseEvent<HTMLButtonElement>) => { this._onAddBranchFilterClick(event, this.props.scheduleIndex); } }
                                repositoryType={repositoryType}
                                repository={repository}
                                gitBranches={this._sourcesSelectionStore.getBranches()}
                                isReadOnly={!!this.props.disabled} />
                            : null}

                        {this._store.showBranchFilterError(schedule) &&
                            <ErrorComponent
                                cssClass="si-trigger-error"
                                errorMessage={Resources.AddBranchFilterError} />
                        }
                    </div>
                    {
                        this._store.showNoDaySelectedError(schedule) &&
                        <ErrorComponent
                            cssClass="schedule-trigger-error"
                            errorMessage={Resources.NoScheduleDaySelected} />
                    }
                </div>
                {this._store.noScheduleExists() ?
                    <ErrorComponent
                        cssClass="trigger-schedule-error"
                        errorMessage={Resources.NoScheduleError} />
                    : null}
            </div>
        );
    }

    private _handleToggleChange = (option: boolean): void => {
        let defaultRepository: BuildRepository = this._sourcesSelectionStore.getBuildRepository();
        let defaultBranchFilter: string = Utils_String.empty;
        if (defaultRepository) {
            defaultBranchFilter = defaultRepository.defaultBranch ? defaultRepository.defaultBranch : defaultRepository.rootFolder;
        }

        let togglePayload: Actions.IToggleBranchPayload = {
            toggleValue: option,
            defaultBranchFilter: defaultBranchFilter,
            defaultPathFilter: null,
            repositoryType: defaultRepository ? defaultRepository.type : null,
            scheduleIndex: 0
        };

        this._actionCreator.toggleScheduleIntegration(togglePayload);
    }

    private _getDateTimeSchedule(buildSchedule: Schedule): IDateTimeSchedule {
        return {
            days: buildSchedule.daysToBuild,
            startHours: buildSchedule.startHours,
            startMinutes: buildSchedule.startMinutes
        };
    }

    private _getTimeZoneDropDown(): IDropdownOption[] {
        let options: IDropdownOption[] = [];
        let timeZones: WebPageData.ITimeZoneInfoModel[] = WebPageData.WebPageDataHelper.getTimeZones();
        if (timeZones) {
            timeZones.forEach((timeZone, index) => {
                options.push({
                    key: timeZone.id, text: timeZone.displayName
                });
            });
        }
        return options;
    }

    private _onDayChange = (scheduledTriggerOptions: IScheduleTriggerOptions) => {
        this._actionCreator.updateSchedules(scheduledTriggerOptions);
    }

    private _onTimeChange = (scheduledTriggerOptions: IScheduleTriggerOptions) => {
        this._actionCreator.updateSchedules(scheduledTriggerOptions);
    }

    private _toggleConfigureScheduleView = (index: number): void => {
        let payload: Actions.IScheduleActionPayload = {
            index: index
        };
        this._actionCreator.toggleConfigureScheduleView(payload);
    }

    private _removeSchedule = (index: number): void => {
        let schedule: Actions.IScheduleActionPayload = {
            index: index
        };
        this._actionCreator.removeSchedule(schedule);
        if (this.state.schedules.length === 0)
        {
            this._handleToggleChange(false);
        }
        
        if (this.props.onScheduleDeleted) {
            this.props.onScheduleDeleted(index);
        }
    }

    private _onChange = () => {
        this.setState(this._store.getState());
    }

    private _onBranchFilterOptionChange = (option: IDropdownOption, index: number, rowIndex: number, scheduleIndex: number): void => {
        let dropdownIndexRowPair: Actions.IDropdownIndexRowPair = {
            dropdownIndex: index,
            rowIndex: rowIndex,
            scheduleIndex: scheduleIndex
        };
        this._actionCreator.changeSIBranchFilterOption(dropdownIndexRowPair);
    }

    private _onBranchFilterChange = (branch: string, rowIndex: number, scheduleIndex: number): void => {
        let branchIndexPair: Actions.InputIndexPair = {
            input: branch,
            index: rowIndex,
            scheduleIndex: scheduleIndex,
            branches: this._sourcesSelectionStore.getBranches()
        };
        this._actionCreator.changeSIBranchFilter(branchIndexPair);
    }

    private _onBranchFilterDelete = (rowIndex: number, scheduleIndex: number): void => {
        let scheduleBranchPair: Actions.IScheduleNumberIndexPair = {
            input: rowIndex,
            index: scheduleIndex
        };
        this._actionCreator.removeSIBranchFilter(scheduleBranchPair);
    }

    private _onAddBranchFilterClick = (event: React.MouseEvent<HTMLButtonElement>, scheduleIndex: number): void => {
        let scheduleBranchPair: Actions.IScheduleStringIndexPair = {
            input: this._sourcesSelectionStore.getBuildRepository().defaultBranch,
            index: scheduleIndex
        };
        this._actionCreator.addSIBranchFilter(scheduleBranchPair);
        DtcUtils.scrollElementToView(event.currentTarget, Positioning.VerticalScrollBehavior.Bottom);
    }

    private _onScheduleOnlyWithChangesChanged = (scheduleOnlyWithChanges: boolean, scheduleIndex: number) => {
        const scheduleOnlyWithChangesChecked: Actions.IBooleanTraceablePayload = {
            value: scheduleOnlyWithChanges,
            id: scheduleIndex
        };
        this._actionCreator.changeScheduleOnlyWithChanges(scheduleOnlyWithChangesChecked);
    }
}