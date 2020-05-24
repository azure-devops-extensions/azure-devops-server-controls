/// <reference types="react" />

import * as React from "react";

import * as Base from "DistributedTaskControls/Common/Components/Base";
import { DateTimeUtilities } from "DistributedTaskControls/Common/DateTimeUtilities";

import { Async, css } from "OfficeFabric/Utilities";

import "VSS/LoaderPlugins/Css!DistributedTaskControls/Components/ClockComponent";

export interface IClockComponentProps extends Base.IProps {
    startTime: Date;
    finishTime?: Date;
    autoRefresh?: boolean;
    refreshIntervalInSeconds?: number;
    showTimerWithMilliSecondPrecision?: boolean;
    hideTimerIcon?: boolean;

}

export interface IClockComponentState extends Base.IState {
    friendlyTimeString: string;
}

export class ClockComponent extends Base.Component<IClockComponentProps, IClockComponentState>{

    public componentDidMount() {
        if (this.props.autoRefresh) {
            this._async = new Async();
            const refreshInterval = this.props.refreshIntervalInSeconds ? this.props.refreshIntervalInSeconds : ClockComponent.c_threeSeconds;
            this._async.setInterval(() => {
                this._setTime(this.props.startTime, this.props.finishTime);
            }, (refreshInterval * 1000));
        }

        // Set time always as we don't want to wait for 1 sec to get it set in the above setInterval code
        // otherwise when component mount it waits for 1 sec to render time
        this._setTime(this.props.startTime, this.props.finishTime);
    }

    public componentWillUnmount() {
        if (this.props.autoRefresh) {
            this._disposeAsyncTimer();
        }
    }

    public componentWillReceiveProps(nextProps: IClockComponentProps) {
        if (!nextProps.autoRefresh) {
            this._disposeAsyncTimer();
        }
        if (nextProps.startTime) {
            this._setTime(nextProps.startTime, nextProps.finishTime);
        }
    }

    public render(): JSX.Element {
        return (
            <div className={css("dtc-clock-container", this.props.cssClass)} aria-live="off">
                {
                    !this.props.hideTimerIcon &&
                    <span className="bowtie-icon bowtie-stopwatch dtc-clock-icon"></span>
                }
                <span className="dtc-clock-value">{this.state.friendlyTimeString}</span>
            </div>
        );
    }

    private _setTime(startTime: Date, finishTime: Date): void {
        finishTime = !!finishTime ? finishTime : this._getCurrentDate();
        const friendlyTimeString = this.props.showTimerWithMilliSecondPrecision ?
            DateTimeUtilities.getDateDiffWithMilliSecondPrecision(finishTime, startTime) : DateTimeUtilities.getDateDiffFriendlyString(finishTime, startTime);

        this.setState({
            friendlyTimeString: friendlyTimeString
        });
    }

    private _getCurrentDate = (): Date => {
        return new Date();
    }

    private _disposeAsyncTimer(): void {
        if (this._async) {
            this._async.dispose();
            this._async = null;
        }
    }

    private _async: Async;
    private static readonly c_threeSeconds: number = 3;
}
