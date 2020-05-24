import * as Tooltip from "VSSUI/Tooltip";
import * as React from "react";
import * as Utils_Date from "VSS/Utils/Date";
import * as Utils_String from "VSS/Utils/String";

export interface IDateTimeCellOptions {
    /**
     * Optional format string for the content (e.g. "Updated {0}" will translate to "Updated 2 hours ago")
     */
    contentFormat?: string;

    /**
     * Date and time to be displayed
     */
    dateTime: Date;

    /**
     * Show the friendly version of date time (on by default, set to false to turn off)
     */
    showFriendlyDateTime?: boolean;

    /**
     * The start date and time used to calculate the relative friendly date from
     */
    friendlyStartDateTime?: Date;
}

export function createWorkItemDateTimeCell(options: IDateTimeCellOptions): JSX.Element {
    const {
        dateTime,
        contentFormat = "{0}",
        showFriendlyDateTime = true,
        friendlyStartDateTime = null
    } = options;
    const tooltip: string = Utils_Date.localeFormat(dateTime, "F");
    // use the user setting formatted date when not showing friendly version
    const content: string = showFriendlyDateTime ? Utils_Date.friendly(dateTime, friendlyStartDateTime) : Utils_Date.localeFormat(dateTime, "g");

    return (
        <Tooltip.TooltipHost hostClassName="work-item-date-time-cell" content={tooltip}>
            {Utils_String.format(contentFormat, content)}
        </Tooltip.TooltipHost>
    );
}
