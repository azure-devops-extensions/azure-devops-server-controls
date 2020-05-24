import * as React from "react";

import * as Base from "DistributedTaskControls/Common/Components/Base";
import { Circle } from "DistributedTaskControls/Components/Canvas/Circle";
import { CircularProgressBar, ICircularProgressBarProps } from "DistributedTaskControls/Components/CircularProgressBar";

import { LayoutConstants } from "PipelineWorkflow/Scripts/Common/Canvas/LayoutConstants";
import { IndicatorSizeAndPosition, IIndicatorViewInfo, ReleaseIndicatorType, ReleaseGatesStatusIndicator } from "PipelineWorkflow/Scripts/ReleaseProgress/ReleaseEnvironment/ReleaseEnvironmentTypes";

import { VssIcon, VssIconType } from "VSSUI/VssIcon";
import * as Utils_String from "VSS/Utils/String";

import { css } from "OfficeFabric/Utilities";

import "VSS/LoaderPlugins/Css!RM:PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleaseIndicator";

export interface IReleaseIndicatorProps extends Base.IProps {
    statusName: string;
    indicatorSizeAndPosition: IndicatorSizeAndPosition;
    indicatorViewInfo: IIndicatorViewInfo;
    indicatorName: string;
    isSelectable?: boolean;
}

export class ReleaseIndicator extends Base.Component<IReleaseIndicatorProps, Base.IStateless>{

    public render(): JSX.Element {

        let sizeClass = null;
        if (this.props.indicatorSizeAndPosition === IndicatorSizeAndPosition.SmallTop) {
            sizeClass = "cd-indicator-circle-small cd-indicator-circle-small-top";
        }
        else if (this.props.indicatorSizeAndPosition === IndicatorSizeAndPosition.SmallBottom) {
            sizeClass = "cd-indicator-circle-small cd-indicator-circle-small-bottom";
        }
        const circleClass = css("cd-indicator-circle",
            `cd-${this.props.indicatorName}-${this.props.statusName}`, sizeClass);
        const circleRadius = (this.props.indicatorSizeAndPosition === IndicatorSizeAndPosition.Big) ?
            LayoutConstants.postDeploymentIndicatorElementRadius : LayoutConstants.postDeploymentIndicatorElementRadiusSmall;
        const iconClass = this.props.indicatorViewInfo.iconName;
        let vssIconClass: string = Utils_String.format("release-indicator-icon {0}-icon", this.props.indicatorName);

        let indicatorElement: JSX.Element;

        if (this.props.indicatorName === ReleaseIndicatorType.Gate && this.props.statusName === ReleaseGatesStatusIndicator.InProgress) {
            indicatorElement = this._getInProgressGateElement(circleRadius, circleClass, iconClass, vssIconClass);
        } else if (this.props.isSelectable) {
            indicatorElement = (
                <Circle circleCss={circleClass} radius={circleRadius}>
                    <VssIcon className={vssIconClass} iconName={iconClass} iconType={VssIconType.fabric} />
                </Circle>
            );
        } else {
            const indicatorStyle = {
                height: (2 * circleRadius),
                width: (2 * circleRadius)
            };
            indicatorElement = (
                <div className={circleClass} style={indicatorStyle}>
                    <VssIcon className={vssIconClass} iconName={iconClass} iconType={VssIconType.fabric} />
                </div>
            );
        }

        return (
            <div className="cd-indicators">
                {
                    indicatorElement
                }
            </div>
        );
    }

    private _getInProgressGateElement(defaultRadius: number, circleClass: string, iconClass: string, vssIconClass: string): JSX.Element {
        const isOnlyGate = (this.props.indicatorSizeAndPosition === IndicatorSizeAndPosition.Big);
        const progressBarProps = {
            borderWidth: 5,
            borderHeight: 1,
            noOfBorderStripes: 24,
            radius: LayoutConstants.gatesInprogressIndicatorElementRadius
        };

        if (isOnlyGate) {
            return (
                <Circle circleCss={circleClass} radius={defaultRadius}>
                    <CircularProgressBar {...progressBarProps}>
                        <VssIcon className={vssIconClass} iconName={iconClass} iconType={VssIconType.fabric} />
                    </CircularProgressBar>
                </Circle>
            );
        }
        else {
            return (
                <CircularProgressBar cssClass={circleClass} {...progressBarProps}>
                    <VssIcon className={vssIconClass} iconName={iconClass} iconType={VssIconType.fabric} />
                </CircularProgressBar>
            );
        }
    }

    private _releaseIndicatorIconClass: string = "release-indicator-icon {0}-icon";
}