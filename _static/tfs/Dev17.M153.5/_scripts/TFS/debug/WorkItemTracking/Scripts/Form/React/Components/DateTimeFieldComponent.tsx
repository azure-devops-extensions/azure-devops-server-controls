import * as React from "react";

import { autobind } from "OfficeFabric/Utilities";
import { WorkItemBindableComponent } from "WorkItemTracking/Scripts/Form/React/Components/WorkItemBindableComponent";
import { IWorkItemControlProps } from "WorkItemTracking/Scripts/Form/React/Components/WorkItemControlComponent";
import { DateTimePicker, IDateTimePickerCulture } from "WorkItemTracking/Scripts/Form/React/Components/DateTimePicker";
import { ITimeStrings } from "WorkItemTracking/Scripts/Form/React/Components/Time";
import { IWorkItemFormComponentContext } from "WorkItemTracking/Scripts/Form/React/FormContext";
import { IDatePickerStrings } from "OfficeFabric/DatePicker";
import * as Culture from "VSS/Utils/Culture";
import * as Utils_Date from "VSS/Utils/Date";
import * as WorkItemTrackingResources from "WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking";

export class DateTimeFieldComponent extends WorkItemBindableComponent<IWorkItemControlProps, void> {
    private _dateTimePickerCulture: IDateTimePickerCulture;

    constructor(props: IWorkItemControlProps, context: IWorkItemFormComponentContext) {
        super(props, context);

        this._initializeDateTimePickerCulture();
    }

    public render(): JSX.Element {
        if (this._formContext && this._formContext.workItem) {
            const field = this._formContext.workItem.getField(this.props.controlOptions.fieldName);
            const dateInClientTime = field.getValue();
            const todayInUserTimeZone: Date = Utils_Date.convertClientTimeToUserTimeZone(new Date(), true);
            todayInUserTimeZone.setHours(0, 0, 0, 0);

            let dateInUserTimeZone: Date = null;
            if (dateInClientTime) {
                dateInUserTimeZone = Utils_Date.convertClientTimeToUserTimeZone(dateInClientTime, true);
            }

            return <DateTimePicker
                onSelectDate={this._onSelectDate}
                today={todayInUserTimeZone}
                value={dateInUserTimeZone}
                dateTimePickerCulture={this._dateTimePickerCulture}
            />
        }

        return null;
    }

    @autobind
    private _onSelectDate(dateInUserTimeZone: Date) {
        this._formContext.workItem.setFieldValue(this.props.controlOptions.fieldName,
            dateInUserTimeZone ? Utils_Date.convertUserTimeToClientTimeZone(dateInUserTimeZone) : null);
    }

    private _initializeDateTimePickerCulture() {
        const dateTimeFormat = Culture.getDateTimeFormat();

        // build calendar strings
        const calendarStrings = {
            months: dateTimeFormat.MonthNames,
            days: dateTimeFormat.DayNames,
            shortMonths: dateTimeFormat.AbbreviatedMonthNames,
            shortDays: dateTimeFormat.AbbreviatedDayNames,
            goToToday: WorkItemTrackingResources.DateTimePicker_GoToToday,
            prevMonthAriaLabel: WorkItemTrackingResources.DateTimePicker_PreviousMonthAriaLabel,
            nextMonthAriaLabel: WorkItemTrackingResources.DateTimePicker_NextMonthAriaLabel
        } as IDatePickerStrings;

        // build time strings
        const timeStrings = {
            AMDesignator: dateTimeFormat.AMDesignator,
            PMDesignator: dateTimeFormat.PMDesignator,
            ariaLabelHourUpButton: WorkItemTrackingResources.DateTimePicker_HourUpAriaLabel,
            ariaLabelHourDownButton: WorkItemTrackingResources.DateTimePicker_HourDownAriaLabel,
            ariaLabelMinuteUpButton: WorkItemTrackingResources.DateTimePicker_MinuteUpAriaLabel,
            ariaLabelMinuteDownButton: WorkItemTrackingResources.DateTimePicker_MinuteDownAriaLabel,
            ariaLabelAMPMUpButton: WorkItemTrackingResources.DateTimePicker_AMPMUpAriaLabel,
            ariaLabelAMPMDownButton: WorkItemTrackingResources.DateTimePicker_AMPMDownAriaLabel
        } as ITimeStrings;

        // build time format
        let use24HourFormat = false;
        let renderAmPmBeforeTime = false;
        let ttIndex = dateTimeFormat.ShortTimePattern.indexOf("tt");
        if (ttIndex === -1) {
            use24HourFormat = true;
        }
        else if (ttIndex === 0) {
            renderAmPmBeforeTime = true;
        }

        this._dateTimePickerCulture = {
            calendarStrings: calendarStrings,
            timeStrings: timeStrings,
            use24HourFormat: use24HourFormat,
            renderAmPmBeforeTime: renderAmPmBeforeTime,
            firstDayOfWeek: dateTimeFormat.FirstDayOfWeek
        } as IDateTimePickerCulture
    }
}
