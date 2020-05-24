import * as React from "react";
import { autobind, getNativeProps, htmlElementProperties } from "OfficeFabric/Utilities";
import { getPrDisplayDateString, getPrTooltipDateString } from "VersionControl/Scripts/Utils/VersionControlDateUtils";

export interface IUpdatingTimeStampProps extends React.HTMLProps<HTMLSpanElement> {
    date: Date;
}

export interface IUpdatingTimeStampState {
    convertedDateString?: string;
}

/**
 * This component is a span that displays a date/time in a friendly manner such as '5 minutes ago.'
 * It has a tooltip that displays the full date/time instead of the friendly string
 * It has an internal timer to update itself every minute even if its props don't change so that the friendly
 * strings refresh from '2 minutes ago' -> '3 minutes ago' -> etc
 */
export class UpdatingTimeStamp extends React.PureComponent<IUpdatingTimeStampProps, IUpdatingTimeStampState> {
    private _timerId: number;

    constructor(props: IUpdatingTimeStampProps) {
        super(props);
        this.state = {};
        this._timerId = null;
    }

    public render(): JSX.Element {
        return <span
            {...getNativeProps(this.props, htmlElementProperties) }
            title={getPrTooltipDateString(this.props.date)}
        >
            {this.state.convertedDateString}
        </span>
    }

    public componentDidMount(): void {
        this._updateString();
        this._startUpdateTimer();
    }

    public componentWillUnmount(): void {
        this._stopUpdateTimer();
    }

    public componentDidUpdate(prevProps: IUpdatingTimeStampProps, prevState: IUpdatingTimeStampState): void {
        if (prevProps.date !== this.props.date) {
            this._updateString();
        }
    }

    @autobind
    private _updateString(): void {
        this.setState({
            convertedDateString: getPrDisplayDateString(this.props.date)
        });
    }

    private _startUpdateTimer(): void {
        this._timerId = setInterval(this._updateString, 60000);
    }

    private _stopUpdateTimer(): void {
        if (this._timerId) {
            clearInterval(this._timerId);
            this._timerId = null;
        }
    }
}