/// <reference types="react" />

import * as React from "react";
import { DateManipulationFunctions } from "ScaledAgile/Scripts/Shared/Utils/DateManipulationFunctions";
import { DeliveryTimeLineViewConstants } from "ScaledAgile/Scripts/Views/DeliveryTimeLine/Components/Constants";
import Utils_Date = require("VSS/Utils/Date");

export interface CalendarMonthProps {
    date: Date;
    key?: string | number;
    numberOfDaysInMonth: number;
    zoomLevelInPixelPerDay: number;
    leftValue: number;
}

/**
 * Represent a single month in the calendar element
 */
export class CalendarMonth extends React.Component<CalendarMonthProps, {}> {

    private title: string;

    constructor(props: CalendarMonthProps) {
        super(props);
    }

    private getWidth(): number {
        return this.props.numberOfDaysInMonth * this.props.zoomLevelInPixelPerDay;
    }

    /**
     * Display the month with the year only if January
     * @param {date} value for the month
     * @return {string} : If January : Monthname YYYY; Else : Monthname
    */
    private formatDate(value: Date): string {
        const monthName = Utils_Date.localeFormat(value, "MMMM", /*ignoreTimeZone*/ true);
        return monthName + (value.getMonth() === 0 ? " " + value.getFullYear().toString() : "");
    };

    public render() {
        //This force the logic of formatting to be executed once
        if (this.title === undefined) {
            this.title = this.formatDate(this.props.date);
        }

        let monthsWidth = this.getWidth();
        let divStyle = {
            marginRight: DeliveryTimeLineViewConstants.spaceBetweenMonthInPixel,
            width: monthsWidth,
            height: DeliveryTimeLineViewConstants.calendarPanWidthAndHeight,
            flex: "0 0 " + monthsWidth + "px",
            //zIndex here is used to show calendar month above today marker. 
            //Since there is no zindex for today marker, use 1 here is enough
            zIndex: 1,
            lineHeight: DeliveryTimeLineViewConstants.calendarPanWidthAndHeight + "px",
            left: this.props.leftValue
        };

        return <div
                className="calendar-month"
                style={divStyle}
                >
                    {this.title}
               </div>;
    }

}
