import * as React from "react";

import { autobind } from "OfficeFabric/Utilities";
import { Callout } from "OfficeFabric/Callout";
import { DirectionalHint } from "OfficeFabric/common/DirectionalHint";
import { KeyCode } from "VSS/Utils/UI";
import { ICalendarMarker } from "ScaledAgile/Scripts/Views/DeliveryTimeLine/Models/DeliveryTimeLineInterfaces";
import { DeliveryTimeLineViewConstants } from "ScaledAgile/Scripts/Views/DeliveryTimeLine/Components/Constants";

export interface ICalendarMarkerProps {
    markers: ICalendarMarker[];
    viewportWidth: number;
}

export interface ICalendarMarkerState {
    isCalloutVisible: boolean;
}

export class CalendarMarker extends React.Component<ICalendarMarkerProps, ICalendarMarkerState> {
    private _clickTarget: HTMLElement;

    constructor(props: ICalendarMarkerProps) {
        super(props);
        this.state = { isCalloutVisible: false };
    }

    public render(): JSX.Element {
        // Primary marker is the last marker in the set - that determines where to draw the marker and beak.
        const primaryMarker = this.props.markers[this.props.markers.length - 1];

        if (primaryMarker.leftOffset < DeliveryTimeLineViewConstants.teamSidebarWidth || primaryMarker.leftOffset > this.props.viewportWidth) {
            // if the marker left offset is outside viewport, do not render.
            return null;
        }

        const bgColor = primaryMarker.backgroundColor;
        return <div>
            <div className="calendar-marker" style={{ left: primaryMarker.leftOffset, top: 0 - DeliveryTimeLineViewConstants.calendarMarkerTitleOverlap, color: bgColor, borderLeftColor: bgColor }}>
                <div className="pin-head-container"
                    onKeyDown={this._onKeyDown}
                    onClick={this._toggleCallout}>
                    <div className="pin-head"
                        ref={(x: HTMLElement) => this._clickTarget = x}
                        style={{ borderColor: bgColor }}
                        tabIndex={0}
                        aria-label={this._getAriaLabel(this.props.markers)}>
                    </div>
                </div>
                {this.state.isCalloutVisible && (
                    <Callout
                        className="marker-callout-container"
                        target={this._clickTarget}
                        directionalHint={DirectionalHint.topCenter}
                        onDismiss={this._onCalloutDismiss}
                        setInitialFocus={true}
                        gapSpace={3}
                        onLayerMounted={this._onCalloutLayerMounted}>
                        {this._getMarkerElements(this.props.markers)}
                    </Callout>
                )}
            </div>
        </div>;
    }

    private _getMarkerElements(markers: ICalendarMarker[]): JSX.Element[] {
        return markers.map(m => this._getMarkerElement(m));
    }

    private _getMarkerElement(marker: ICalendarMarker): JSX.Element {
        return <div className="calendar-marker-callout" style={this._getCalloutStyle(marker)} key={marker.id}>
            <span className="marker-date">{marker.dateDisplayLabel + " "}</span>
            {marker.label}
        </div>;
    }

    private _getAriaLabel(markers: ICalendarMarker[]): string {
        let result = markers[0].dateDisplayLabel;
        for (let i = 0, length = markers.length; i < length; ++i) {
            result += (" " + markers[i].label);
        }

        return result;
    }

    private _getCalloutStyle(marker: ICalendarMarker): React.CSSProperties {
        return {
            border: marker.backgroundColor,
            backgroundColor: marker.backgroundColor,
            color: marker.fontColor,
            paddingLeft: 5,
            paddingRight: 5,
            paddingTop: 2,
            paddingBottom: 2,
            whiteSpace: "nowrap",
            wordWrap: "normal",
            overflow: "hidden",
            textOverflow: "ellipsis",
        };
    }

    @autobind
    private _onCalloutLayerMounted() {
        // set the callout beak color
        var $beak = $(document.body).find(".marker-callout-container .ms-Callout-beak");
        $beak.css("background-color", this.props.markers[this.props.markers.length - 1].backgroundColor);
    }

    @autobind
    private _onCalloutDismiss() {
        this.setState({ isCalloutVisible: false });
    };

    @autobind
    private _toggleCallout() {
        this.setState({ isCalloutVisible: !this.state.isCalloutVisible });
    };

    @autobind
    private _onKeyDown(event: React.KeyboardEvent<HTMLElement>) {
        if (event.keyCode === KeyCode.ENTER || event.keyCode === KeyCode.SPACE) {
            this._toggleCallout();
        }
    };
}