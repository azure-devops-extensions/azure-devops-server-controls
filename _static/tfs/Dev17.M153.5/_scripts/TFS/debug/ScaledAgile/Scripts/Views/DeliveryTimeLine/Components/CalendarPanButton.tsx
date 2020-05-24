/// <reference types="react" />

import * as React from "react";
import * as ScaledAgileResources from "ScaledAgile/Scripts/Resources/TFS.Resources.ScaledAgile";
import { DeliveryTimeLineViewConstants } from "ScaledAgile/Scripts/Views/DeliveryTimeLine/Components/Constants";

import { KeyCode } from "VSS/Utils/UI";
import { TooltipHost } from "VSSUI/Tooltip";

import { DeliveryTimelineFocusUtils } from "ScaledAgile/Scripts/Views/DeliveryTimeLine/Utils/DeliveryTimelineFocusUtils";
import { IDeliveryTimeLineStoreData, PanFocusIdentifier, HorizontalDirection } from "ScaledAgile/Scripts/Views/DeliveryTimeLine/Models/DeliveryTimeLineInterfaces";

export interface ICalendarPanButtonProps {
    /**
    * Callback action invoked when a calendar pan button is clicked
    */
    action(direction: HorizontalDirection): void;

    /**
    * Enum indicating whether the calendar pan button is on the left or right
    */
    direction: HorizontalDirection;

    worldState: IDeliveryTimeLineStoreData;

    /** Optional style attributes to apply to button */
    style?: React.CSSProperties;
}

/**
 * Button in the CalendarElement that allows to change months
 */
export class CalendarPanButton extends React.Component<ICalendarPanButtonProps, {}> {
    private _element: HTMLDivElement;
    private _focus: boolean = false;

    constructor(props: ICalendarPanButtonProps) {
        super(props);
    }

    public render() {
        const { style } = this.props;

        const panStyle: React.CSSProperties = {
            ...style,
            width: DeliveryTimeLineViewConstants.calendarPanWidthAndHeight,
            height: DeliveryTimeLineViewConstants.calendarPanWidthAndHeight
        };

        const directionAsString = this.props.direction === HorizontalDirection.Left ? "left" : "right";
        const title = this.props.direction === HorizontalDirection.Left ? ScaledAgileResources.DeliveryTimelineShortcutPanLeft : ScaledAgileResources.DeliveryTimelineShortcutPanRight;

        const currentPanButtonFocusElement: PanFocusIdentifier = DeliveryTimelineFocusUtils.getCurrentPanFocusIdentifier(this.props.worldState);
        this._focus = currentPanButtonFocusElement && currentPanButtonFocusElement.direction === this.props.direction;

        return <div className={"calendar-pan-button calendar-pan-button-" + directionAsString}
            ref={(element: HTMLDivElement) => { this._element = element; }}
            style={panStyle}
            onClick={(e) => this._onActionTrigger(e)}
            onMouseDown={(e) => {
                // onMouseDown prevents onMouseDown on the timeline from being invoked and causing unneccessary scroll
                this._preventAndStop(e);
            }}
            tabIndex={0}
            role="button"
            aria-label={title}
            onKeyUp={(e: React.KeyboardEvent<HTMLElement>) => { this._onKeyTrigger(e); }}>
            <TooltipHost content={title}><i className={"bowtie-icon bowtie-chevron-" + directionAsString}></i></TooltipHost>
        </div>;
    }

    public componentDidUpdate() {
        if (this._element && this._focus) {
            // render() has been invoked but the actual element may not have been rendered by the browser yet. requestAnimationFrame() to force layout.
            window.requestAnimationFrame(() => {
                // By the time this happens things could have changed - so recheck to see if we still need to set focus.
                if (this._element && this._focus) {
                    this._element.focus();
                    this._focus = false;
                }
            });
        }
    }

    private _preventAndStop(event: React.SyntheticEvent<HTMLElement>) {
        event.stopPropagation();
        event.preventDefault();
    }

    private _onKeyTrigger(event: React.KeyboardEvent<HTMLElement>) {
        if (event.keyCode === KeyCode.ENTER) {
            this._onActionTrigger(event);
        }
    }

    private _onActionTrigger(event: React.MouseEvent<HTMLElement> | React.KeyboardEvent<HTMLElement>) {
        this._preventAndStop(event);
        this.props.action(this.props.direction);
    }
}
