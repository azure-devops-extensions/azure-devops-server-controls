import React = require("react");
import { getPrDisplayDateString, getPrTooltipDateString } from "VersionControl/Scripts/Utils/VersionControlDateUtils";

export interface IActivityCardTimestampProps {
    date: Date;
}

/**
 * Timestamp component for use in "Cards" (such as displayed in the pull request activity feed).
 */
export class ActivityCardTimestamp extends React.Component<IActivityCardTimestampProps, any> {
    public render(): JSX.Element {
        return (
            <span className="activity-card-timestamp" title={getPrTooltipDateString(this.props.date)}>
                {getPrDisplayDateString(this.props.date)}
            </span>
        );
    }
}
