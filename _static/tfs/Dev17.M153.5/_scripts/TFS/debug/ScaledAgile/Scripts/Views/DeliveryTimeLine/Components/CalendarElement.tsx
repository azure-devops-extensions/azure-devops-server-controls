/// <reference types="react" />

import * as React from "react";
import * as Utils_Date from "VSS/Utils/Date";

import { autobind } from "OfficeFabric/Utilities";
import { KeyCode } from "VSS/Utils/UI";
import { IDeliveryTimeLineActionsCreator } from "ScaledAgile/Scripts/Views/DeliveryTimeLine/Actions/DeliveryTimeLineActionsCreator";
import { CalendarPanButton } from "ScaledAgile/Scripts/Views/DeliveryTimeLine/Components/CalendarPanButton";
import { CalendarMonth } from "ScaledAgile/Scripts/Views/DeliveryTimeLine/Components/CalendarMonth";
import { TodayMarker } from "ScaledAgile/Scripts/Views/DeliveryTimeLine/Components/TodayMarker";
import { Movement, MovementType } from "ScaledAgile/Scripts/Views/DeliveryTimeLine/Models/DeliveryTimeLineModels";
import { IDeliveryTimeLineStoreData, ICalendarMonth, ICalendarMarker, HorizontalDirection } from "ScaledAgile/Scripts/Views/DeliveryTimeLine/Models/DeliveryTimeLineInterfaces";
import { CalendarMarker } from "ScaledAgile/Scripts/Views/DeliveryTimeLine/Components/CalendarMarker";
import { DateManipulationFunctions } from "ScaledAgile/Scripts/Shared/Utils/DateManipulationFunctions";
import { DeliveryTimeLineViewConstants } from "ScaledAgile/Scripts/Views/DeliveryTimeLine/Components/Constants";

export interface ICalendarElementProps {
    /**
     * The action creator for the delivery time line
     */
    actionsCreator: IDeliveryTimeLineActionsCreator;

    /**
     * Months to display
     */
    months: ICalendarMonth[];

    /**
     * Calendar markers to display.
     */
    calendarMarkers: ICalendarMarker[];

    /**
     * The number of pixels a day corresponds to based off zoom
     */
    zoomLevelInPixelPerDay: number;

    /**
     * The left pixel offset relative viewport start date of today marker
     */
    todayMarkerPosition: number;

    /**
     * The start date timeline
     */
    worldStartDate: Date;

    /**
     * Width of the viewport.
     */
    viewportWidth: number;

    worldState: IDeliveryTimeLineStoreData;
}

/**
 * Contains the list of months for the time line. Also, has buttons to navigate within the month
 */
export class CalendarElement extends React.Component<ICalendarElementProps, {}> {

    public render(): JSX.Element {
        let renderMonth = (value: ICalendarMonth, index: number): JSX.Element => {
            return <CalendarMonth
                key={this._generateKey(value.date)}
                date={value.date}
                numberOfDaysInMonth={DateManipulationFunctions.getAmountOfDaysInMonth(value.date)}
                zoomLevelInPixelPerDay={this.props.zoomLevelInPixelPerDay}
                leftValue={value.left}
            />;
        };

        if (this.props.months.length === 0) {
            return <div className="calendar-element" style={{ marginLeft: DeliveryTimeLineViewConstants.teamSidebarWidth }}></div>;
        }

        return <div className="calendar-element" style={{ marginLeft: DeliveryTimeLineViewConstants.teamSidebarWidth }}>
            <CalendarPanButton
                style={{
                    left: DeliveryTimeLineViewConstants.teamSidebarWidth
                }}
                direction={HorizontalDirection.Left}
                action={(e) => this._panClick(e)}
                worldState={this.props.worldState}
            />
            <TodayMarker position={this.props.todayMarkerPosition} />
            {this._getCalendarMarkers(this.props.calendarMarkers)}
            {this.props.months.map(renderMonth)}
            <CalendarPanButton direction={HorizontalDirection.Right} action={(e) => this._panClick(e)} worldState={this.props.worldState} />
        </div>;
    }

    /**
     * Generate a unique key for the month by concatenating the year and the month
     * @param {date} value for the month
     * @return {string} key with the yyyy + underscore + month (1 or 2 digits)
     */
    private _generateKey(value: Date): string {
        let yyyy = value.getFullYear().toString();
        let mm = (value.getMonth() + 1).toString(); // getMonth() is zero-based
        return yyyy + "_" + mm;
    }

    private _panClick(direction: HorizontalDirection): void {
        this.props.actionsCreator.panViewportHorizontal(direction, MovementType.CalendarButton, 300);
    }

    private _getCalendarMarkers(elements: ICalendarMarker[]): JSX.Element[] {
        if (!elements) {
            return null;
        }

        let currentDate: Date;
        let currentMarkers: ICalendarMarker[];
        const components: JSX.Element[] = [];
        for (let i = 0, len = elements.length; i < len; ++i) {
            const element = elements[i];
            if (currentMarkers) {
                if (Utils_Date.defaultComparer(currentDate, element.date) === 0) {
                    // Same date. Add it to the current markers and keep processing.
                    currentMarkers.push(element);
                }
                else {
                    components.push(<CalendarMarker key={"calendar-marker" + currentMarkers[0].id} markers={currentMarkers} viewportWidth={this.props.viewportWidth} />);

                    // Different date. Reset to current date.
                    currentDate = element.date;
                    currentMarkers = [element];
                }
            }
            else {
                // Don't have any current yet... set it up.
                currentDate = element.date;
                currentMarkers = [element];
            }
        }

        // Mop up
        if (currentMarkers) {
            components.push(<CalendarMarker key={"calendar-marker" + currentMarkers[0].id} markers={currentMarkers} viewportWidth={this.props.viewportWidth} />);
        }

        return components;
    }
}
