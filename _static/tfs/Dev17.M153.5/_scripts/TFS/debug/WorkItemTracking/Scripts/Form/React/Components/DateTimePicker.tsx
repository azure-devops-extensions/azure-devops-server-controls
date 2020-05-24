import "VSS/LoaderPlugins/Css!WorkItemTracking/Form/React/Components/DateTimePicker";

import * as React from "react";
import * as Utils_Date from "VSS/Utils/Date";
import { KeyCode } from "VSS/Utils/UI";
import { autobind, css } from "OfficeFabric/Utilities";
import { TextField } from "OfficeFabric/TextField";
import { IDatePickerProps, DatePicker, DayOfWeek, IDatePickerStrings } from "OfficeFabric/DatePicker";
import { Calendar } from "OfficeFabric/Calendar";
import { Time, ITimeStrings } from "WorkItemTracking/Scripts/Form/React/Components/Time";
import * as WorkItemTrackingResources from "WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking";

export interface IDateTimePickerProps {
    /** Date value that represents today */
    today: Date;

    /** initial date for the date time picker. If null, today will be selected */
    value: Date;

    /** DateTimePicker culture setting */
    dateTimePickerCulture: IDateTimePickerCulture;

    /** Callback issued when date is changed */
    onSelectDate?: (date: Date) => void;
}

export interface IDateTimePickerState {
    /** Current date */
    selectedDate: Date;

    /** value for the date text field */
    dateTextFieldValue: string;
}

export interface IDateTimePickerCulture {
    /** Localized strings to use in the Calendar control */
    calendarStrings: IDatePickerStrings;

    /** Localized strings to use in the Time control */
    timeStrings: ITimeStrings;

    /** The first day of the week for your locale */
    firstDayOfWeek?: DayOfWeek;

    /** whether to use 24 hour format or not */
    use24HourFormat: boolean;

    /** whether to render AM/PM before time or not */
    renderAmPmBeforeTime: boolean;
}

export class DateTimePicker extends React.Component<IDateTimePickerProps, IDateTimePickerState> {
    constructor(props: IDateTimePickerProps) {
        super(props);

        const { today, value } = props;

        let initialDate: Date = null;
        if (value) {
            initialDate = new Date(value);
        }
        else {
            initialDate = new Date(today);
            initialDate.setHours(0, 0, 0, 0);
        }

        this.state = {
            selectedDate: initialDate,
            dateTextFieldValue: this._calculateDateTextField(value)
        };
    }

    public render(): JSX.Element {
        const { dateTimePickerCulture, today } = this.props;
        const { selectedDate, dateTextFieldValue } = this.state;
        const textFieldValue = dateTextFieldValue || WorkItemTrackingResources.DateTimePicker_SelectDateTime;

        return <div className="date-time-picker">
            <div className="date-time-picker-header">
                <div className={css("date-time-picker-textfield", { "placeholder": !dateTextFieldValue })} >
                    <span className="bowtie-icon bowtie-calendar" aria-hidden="true" />
                    {textFieldValue}
                </div>
                <div className="date-time-picker-delete">
                    <button
                        className="date-time-picker-delete-icon bowtie-icon bowtie-edit-remove"
                        aria-label={WorkItemTrackingResources.DateTimePicker_ClearDate}
                        onClick={this._onClearDate} />
                </div>
            </div>
            <div className="date-time-picker-calendar">
                <Calendar
                    onSelectDate={this._onSelectDate}
                    isMonthPickerVisible={false} // note: make sure to add the prev/next year strings if we want to enable this
                    today={today}
                    value={selectedDate}
                    strings={dateTimePickerCulture.calendarStrings}
                />
            </div>
            <div className="date-time-picker-time">
                <Time
                    onSelectTime={this._onSelectTime}
                    hour={selectedDate ? selectedDate.getHours() : 12}
                    minute={selectedDate ? selectedDate.getMinutes() : 0}
                    timeStrings={dateTimePickerCulture.timeStrings}
                    use24HourFormat={dateTimePickerCulture.use24HourFormat}
                    renderAmPmBeforeTime={dateTimePickerCulture.renderAmPmBeforeTime}
                />
            </div>
        </div >;
    }

    private _calculateDateTextField(date: Date) {
        return date ? Utils_Date.localeFormat(date, "g", true) : "";
    }

    @autobind
    private _onClearDate() {
        const { onSelectDate } = this.props;

        const defaultDate = new Date(this.props.today);
        defaultDate.setHours(0, 0, 0, 0);

        this.setState({
            selectedDate: defaultDate,
            dateTextFieldValue: this._calculateDateTextField(null)
        });

        if (onSelectDate) {
            onSelectDate(null);
        }
    }

    @autobind
    private _onSelectDate(date: Date) {
        const { onSelectDate } = this.props;
        const newDate = new Date(date);
        const hour = this.state.selectedDate.getHours();
        const minute = this.state.selectedDate.getMinutes();
        newDate.setHours(hour);
        newDate.setMinutes(minute);

        this.setState({
            selectedDate: newDate,
            dateTextFieldValue: this._calculateDateTextField(newDate)
        });

        if (onSelectDate) {
            onSelectDate(new Date(newDate));
        }
    };

    @autobind
    private _onSelectTime(hour: number, minute: number) {
        const { onSelectDate } = this.props;
        let { selectedDate } = this.state;

        selectedDate.setHours(hour);
        selectedDate.setMinutes(minute);

        this.setState({
            selectedDate,
            dateTextFieldValue: this._calculateDateTextField(selectedDate)
        });

        if (onSelectDate) {
            onSelectDate(new Date(selectedDate));
        }
    }
}
