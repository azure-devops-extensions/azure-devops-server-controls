import { IterationTimeframe } from "Agile/Scripts/Models/Iteration";
import "VSS/LoaderPlugins/Css!Agile/Scripts/Common/Components/SprintMarker/SprintMarker";
import { css } from "OfficeFabric/Utilities";
import * as React from "react";
import { mapToMarkerData } from "Agile/Scripts/Common/Components/SprintMarker/SprintMarkerHelper";

export interface ISprintMarkerProps {
    /* The sprint time frame. Defaults to current
     * @default "Current"
     */
    timeFrame?: IterationTimeframe;
    /* Additional class name will apply to the marker */
    className?: string;
}

/** Displays a rounded marker, used for labeling sprint items */
export class SprintMarker extends React.PureComponent<ISprintMarkerProps> {
    public render(): JSX.Element {
        const {
            timeFrame = IterationTimeframe.Current,
            className
        } = this.props;

        const markerData = mapToMarkerData(timeFrame);
        return (
            <div className={css(markerData.cssClass, className)}>
                {markerData.text}
            </div>
        );
    }
}