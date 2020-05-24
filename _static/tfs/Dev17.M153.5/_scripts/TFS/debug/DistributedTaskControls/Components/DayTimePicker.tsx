
import * as React from "react";

import * as Base from "DistributedTaskControls/Common/Components/Base";
import { IScheduleTriggerOptions, ScheduleDays } from "DistributedTaskControls/Common/Types";
import * as Resources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";

import { Checkbox } from "OfficeFabric/Checkbox";
import { DropDownInputControl, IDropDownItem } from "DistributedTaskControls/SharedControls/InputControls/Components/DropDownInputComponent";
import { FocusZone, FocusZoneDirection } from "OfficeFabric/FocusZone";
import { IDropdownOption } from "OfficeFabric/Dropdown";
import { Label } from "OfficeFabric/Label";
import { css } from "OfficeFabric/Utilities";

import * as Utils_String from "VSS/Utils/String";

import "VSS/LoaderPlugins/Css!DistributedTaskControls/Styles/FabricStyleOverrides";
import "VSS/LoaderPlugins/Css!DistributedTaskControls/Components/DayTimePicker";

export namespace DayTimePickerDefaults {
    export const days: number = 31;
    export const startHours: number = 3;
    export const startMinutes: number = 0;
    export const keyForZeroHours: number = 24;
}

export interface IDateTimePickerProps extends Base.IProps {
    label: string;
    daysOfWeek: ScheduleDays;
    hour: number;
    minute: number;
    timeZoneId: string;
    getTimeZones: Function;
    onDayChange: Function;
    onTimeChange: Function;
    id: number;
    disabled?: boolean;
}

export class DayTimePicker extends Base.Component<IDateTimePickerProps, Base.IStateless> {

    public render(): JSX.Element {
        return (
            <div className="dtc-datetime-component">
                <div className="fabric-style-overrides daysOfWeek-datetime-component" aria-describedby="select-days-description">
                    <div id="select-days-description" className="hidden">{Resources.SelectDayDescription}</div>
                    <Label> {this.props.label} </Label>
                    <FocusZone direction={FocusZoneDirection.horizontal}>{this._createDayOptions(this.props.daysOfWeek, this.props.disabled)}</FocusZone>
                </div>
                <div className="timeOfDay-datetime-component">
                    <div className="hours-component" aria-describedby="select-hours-description">
                        <div id="select-hours-description" className="hidden">{Resources.SelectHourDescription}</div>
                        <DropDownInputControl
                            label={Utils_String.empty}
                            options={this._getTimeDropdown()}
                            onValueChanged={(val: IDropDownItem) => { this._handleTimeChange(val.option, val.index); }}
                            selectedKey={this.props.hour}
                            dropdownWidth={0}
                            calloutClassName={"dropdown-style-overrides"}
                            ariaLabel={Resources.ARIALabelScheduledTriggerTimeHours}
                            disabled={!!this.props.disabled} />
                    </div>
                    <div className="minutes-component" aria-describedby="select-minutes-description">
                        <div id="select-minutes-description" className="hidden">{Resources.SelectMinuteDescription}</div>
                        <DropDownInputControl
                            label={Utils_String.empty}
                            options={this._getMinutesDropDown()}
                            onValueChanged={(val: IDropDownItem) => { this._handleMinutesChange(val.option, val.index); }}
                            selectedKey={this.props.minute}
                            dropdownWidth={0}
                            calloutClassName={"dropdown-style-overrides"}
                            ariaLabel={Resources.ARIALabelScheduledTriggerTimeMinute}
                            disabled={!!this.props.disabled} />
                    </div>
                    <div className="timeZone-component" aria-describedby="select-timeZone-description">
                        <div id="select-timeZone-description" className="hidden">{Resources.SelectTimezoneDescription}</div>
                        <DropDownInputControl
                            label={Utils_String.empty}
                            options={this.props.getTimeZones()}
                            onValueChanged={(val: IDropDownItem) => { this._handleTimeZoneChange(val.option, val.index); }}
                            selectedKey={this.props.timeZoneId}
                            ariaLabel={Resources.ARIALabelScheduledTriggerTimeZone}
                            disabled={!!this.props.disabled} />
                    </div>
                </div>
            </div>
        );
    }

    private _createDayOptions(daysOfWeek: ScheduleDays, disabled: boolean = false): JSX.Element[] {
        return [
            this._createDayComponent(Resources.Monday, ScheduleDays.Monday, daysOfWeek, disabled),
            this._createDayComponent(Resources.Tuesday, ScheduleDays.Tuesday, daysOfWeek, disabled),
            this._createDayComponent(Resources.Wednesday, ScheduleDays.Wednesday, daysOfWeek, disabled),
            this._createDayComponent(Resources.Thursday, ScheduleDays.Thursday, daysOfWeek, disabled),
            this._createDayComponent(Resources.Friday, ScheduleDays.Friday, daysOfWeek, disabled),
            this._createDayComponent(Resources.Saturday, ScheduleDays.Saturday, daysOfWeek, disabled),
            this._createDayComponent(Resources.Sunday, ScheduleDays.Sunday, daysOfWeek, disabled)
        ];
    }

    private _createDayComponent(dayToDisplay: string, dayOfWeek: ScheduleDays, daysOfWeek: ScheduleDays, disabled: boolean): JSX.Element {
        let classNames = css("day-checkbox", { "day-checked": (daysOfWeek & dayOfWeek) === dayOfWeek });
        return (
            <Checkbox
                className={classNames}
                label={dayToDisplay}
                key={dayToDisplay}
                checked={(daysOfWeek & dayOfWeek) === dayOfWeek}
                onChange={(ev: React.FormEvent<HTMLInputElement>, isChecked: boolean) => { this._handleDayToggleChange(ev, isChecked, dayOfWeek); }}
                disabled={!!this.props.disabled} />);
    }

    private _getCurrentOptions(): IScheduleTriggerOptions {
        let option: IScheduleTriggerOptions = {
            id: this.props.id,
            hour: this.props.hour,
            minute: this.props.minute,
            day: this.props.daysOfWeek,
            timeZoneId: this.props.timeZoneId
        };

        return option;
    }

    private _getDay(isChecked: boolean, day: ScheduleDays): ScheduleDays {
        if (isChecked) {
            day = this.props.daysOfWeek | day;
        } else {
            day = this.props.daysOfWeek ^ day;
        }

        return day;
    }

    private _handleDayToggleChange(ev: any, isChecked: boolean, day: ScheduleDays): void {
        let option: IScheduleTriggerOptions = this._getCurrentOptions();
        option.day = MergeDay(this.props.daysOfWeek, isChecked, day);
        this.props.onDayChange(option);
    }

    private _handleTimeChange = (options: IDropdownOption, index: number): void => {
        let option: IScheduleTriggerOptions = this._getCurrentOptions();
        option.hour = index;
        this.props.onTimeChange(option);
    }

    private _handleMinutesChange = (options: IDropdownOption, index: number): void => {
        let option: IScheduleTriggerOptions = this._getCurrentOptions();
        option.minute = index;
        this.props.onTimeChange(option);
    }

    private _handleTimeZoneChange = (options: IDropdownOption, index: number): void => {
        let option: IScheduleTriggerOptions = this._getCurrentOptions();
        option.timeZoneId = options.key.toString();
        this.props.onTimeChange(option);
    }

    private _getTimeDropdown(): IDropdownOption[] {
        let options = [{ key: DayTimePickerDefaults.keyForZeroHours, text: "00" + Resources.HourSuffix }];

        for (let i = 1; i <= 9; i++) {
            options.push({ key: i, text: "0" + i + Resources.HourSuffix });
        }

        for (let i = 10; i <= 23; i++) {
            options.push({ key: i, text: i.toString() + Resources.HourSuffix });
        }

        return options;
    }

    private _getMinutesDropDown(): IDropdownOption[] {
        let options: IDropdownOption[] = [];
        let key = 0;
        for (let i = 0; i <= 5; i++) {
            for (let j = 0; j <= 9; j++) {
                let text = i.toString() + j.toString();
                options.push({ key: key, text: text + Resources.MinutesSuffix });
                key++;
            }
        }
        return options;
    }

}

export function MergeDay(initialDays: ScheduleDays, isChecked: boolean, day: ScheduleDays): ScheduleDays {
    if (isChecked) {
        day = initialDays | day;
    } else {
        day = initialDays ^ day;
    }
    return day;
}
