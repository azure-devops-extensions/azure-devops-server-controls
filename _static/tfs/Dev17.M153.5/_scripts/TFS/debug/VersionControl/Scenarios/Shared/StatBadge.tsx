import * as React from "react";

import { TooltipHost } from "VSSUI/Tooltip";
import { getId } from "OfficeFabric/Utilities";
import { DirectionalHint } from "OfficeFabric/common/DirectionalHint";

import * as Telemetry from "VSS/Telemetry/Services";
import * as Number from "VSS/Utils/Number";
import * as Utils_String from "VSS/Utils/String";

import * as CustomerIntelligenceConstants from "VersionControl/Scripts/CustomerIntelligenceConstants";
import { StatBadgeTextWithCount } from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";

import "VSS/LoaderPlugins/Css!VersionControl/StatBadge";

export interface IStatBadgeProps {
    count?: number;
    title: string;
    iconClassName?: string;
    url?: string;
    urlTargetAttribute?: string;
    tooltip?: string;
    badgeName?: string;
    className?: string;
    telemetryEventData?: Telemetry.TelemetryEventData;
    onLinkClick?(event: React.MouseEvent<HTMLAnchorElement>): void;
}

/**
 * Rendering container for Stats Badge
 */
export class StatBadge extends React.Component<IStatBadgeProps, {}> {
    private _statTextClassName = "stat-text";
    private _statBadgeClassName = "stat-badge";
    private _bowtieIconClassName = "bowtie-icon";
    private _statbadgeTooltipId: string;

    constructor(props: IStatBadgeProps, context?: any) {
        super(props, context);

        this._statbadgeTooltipId = getId("stat-badge-tooltip");
    }

    public render(): JSX.Element {
        const statBadgeElement = (this.props.url) ? <a
            className={this._statBadgeClassName + " " + (this.props.className ? this.props.className : "")}
            role="link"
            key={this.props.title}
            href={this.props.url}
            aria-describedby={(this.props.tooltip) ? this._statbadgeTooltipId : null}
            onClick={this._onLinkClick}
            target={this.props.urlTargetAttribute ? this.props.urlTargetAttribute : "_self"}
        >
            <span className={this._bowtieIconClassName + " " + this.props.iconClassName} />
            {this._getStatContent()}
        </a>
            :
            <div
                className={this._statBadgeClassName + " " + (this.props.className ? this.props.className : "")}
                key={this.props.title}
                aria-describedby={(this.props.tooltip) ? this._statbadgeTooltipId : null}>
                <span className={this._bowtieIconClassName + " " + this.props.iconClassName} />
                {this._getStatContent()}
            </div>;

        return (this.props.tooltip) ?
            <TooltipHost
                id={this._statbadgeTooltipId}
                content={this.props.tooltip}
                directionalHint={DirectionalHint.bottomCenter}>
                {statBadgeElement}
            </TooltipHost>
            : statBadgeElement;
    }

    private _getStatContent(): JSX.Element {
        const statCountString: string = (this.props.count && (typeof this.props.count === "number")) ?
            Number.toDecimalLocaleString(this.props.count, true) : "";
        let statCountText: string;
        if (statCountString.length > 0) {
            statCountText = Utils_String.format(StatBadgeTextWithCount, statCountString, this.props.title);
        }
        else {
            statCountText = this.props.title;
        }

        return <span className={this._statTextClassName}>
            {statCountText}
        </span>;
    }

    // public for testing
    public _onLinkClick = (event: React.MouseEvent<HTMLAnchorElement>): void => {
        if (this.props.onLinkClick) {
            this.props.onLinkClick(event);
        }
        this._logTelemetry();
    }

    private _logTelemetry = (): void => {
        const ciData = new Telemetry.TelemetryEventData(CustomerIntelligenceConstants.VERSION_CONTROL_AREA, CustomerIntelligenceConstants.STATS_BADGE, {});

        if (this.props.telemetryEventData) {
            ciData.area = this.props.telemetryEventData.area;
            ciData.properties = $.extend({}, this.props.telemetryEventData.properties);
        }

        if (this.props.badgeName) {
            ciData.properties[CustomerIntelligenceConstants.STATS_BADGE_NAME_PROPERTY] = this.props.badgeName;
        }

        Telemetry.publishEvent(ciData, true);
    }
}
