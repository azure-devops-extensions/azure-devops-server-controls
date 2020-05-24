import * as React from "react";
import { css } from "OfficeFabric/Utilities";

export interface IPullRequestActivityCardBoxProps extends React.ClassAttributes<any> {
    timelineIconClass?: string;
    timelineBadgeNumber?: number;
    showTimelineLine?: boolean;
    showTimelineDot?: boolean;
    useSubduedStyle?: boolean;
    isNew?: boolean;
    cssClass?: string;
    ariaLabel?: string;
    ariaLabelledBy?: string;
}

/**
 * Component for an entry in an activity feed. Responsible for rendering timeline icon.
 */
export class Component extends React.Component<IPullRequestActivityCardBoxProps, any> {

    public render(): JSX.Element {

        const timelineIconClass = css(
            this.props.timelineIconClass,
            { "new": this.props.isNew },
            { "bowtie-icon timeline-icon": Boolean(this.props.timelineIconClass) },
            { "timeline-icon-dot": this.props.showTimelineDot },
            { "timeline-icon-badge" : Boolean(this.props.timelineBadgeNumber)});

        const timelineIcon = this.props.timelineBadgeNumber
            ? <div className="timeline-badge-container">
                    <span className={timelineIconClass}>
                        {this.props.timelineBadgeNumber}
                    </span>
                </div>
            : <i className={timelineIconClass}></i>;

        const timelineLineClass = css(
            { "new": this.props.isNew },
            { "timeline-icon-line": this.props.showTimelineLine !== false });

        const timelineLine = <div className={timelineLineClass}></div>;

        const containerProps = {
            className: css("vc-pullrequest-activity-box", this.props.cssClass, { "subdued": this.props.useSubduedStyle })
        };

        if (this.props.ariaLabel) {
            containerProps["aria-label"] = this.props.ariaLabel;
        } else if (this.props.ariaLabelledBy) {
            containerProps["aria-labelledby"] = this.props.ariaLabelledBy;
        }

        return (
            <div {...containerProps}>
                {timelineLine}
                {timelineIcon}
                {this.props.children}
            </div>
        );
    }
}
