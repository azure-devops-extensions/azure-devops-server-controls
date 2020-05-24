import * as React from "react";

import TFS_Resources_ScaledAgile = require("ScaledAgile/Scripts/Resources/TFS.Resources.ScaledAgile");

import {DeliveryTimeLineViewConstants} from "ScaledAgile/Scripts/Views/DeliveryTimeLine/Components/Constants";

export interface ITodayMarkerProps {
    /**
     * The left position in pixels of the today marker relative viewport start date.
     */
    position: number;
}

export class TodayMarker extends React.Component<ITodayMarkerProps, {}> {
    constructor(props: ITodayMarkerProps) {
        super(props);
    }

    public render() {
        if (this.props.position < DeliveryTimeLineViewConstants.teamSidebarWidth) {
            return null;
        }

        return <div className="today-marker" style={{ left: this.props.position, top: 0 - DeliveryTimeLineViewConstants.todayMarkerTitleOverlap }}>{TFS_Resources_ScaledAgile.TodayMarker_Today}</div>;
    }
}
