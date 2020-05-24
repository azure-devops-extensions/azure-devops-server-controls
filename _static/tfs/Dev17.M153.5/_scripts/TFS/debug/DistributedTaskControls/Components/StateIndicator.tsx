import * as React from "react";

import { css } from "OfficeFabric/Utilities";

import "VSS/LoaderPlugins/Css!DistributedTaskControls/Components/StateIndicator";

export enum StateIndicatorType {
    Error,
    Warning
}

export interface IStateIndicatorProps {
    type: StateIndicatorType;
    text: string;
    className?: string;
}

interface IStateIndicatorData {
    className: string;
    iconClassName: string;
}

/**
 * @brief Creates a status indicator based on status indicator type, also makes sure screen readers will hear about this by making it a live region.
 */
export class StateIndicator extends React.Component<IStateIndicatorProps, {}> {

    public render(): JSX.Element {
        const stateIndicatorData = this._getStateIndicatorClass(this.props.type);

        return <div
            className={css(stateIndicatorData.className, "ms-font-s", "dt-state-indicator", "small-font", this.props.className)}
            aria-live="polite"
            aria-relevant="text">
            <i className={css("bowtie-icon", stateIndicatorData.iconClassName)} />
            <span className="text">{this.props.text}</span>
        </div>;
    }

    private _getStateIndicatorClass(type: StateIndicatorType): IStateIndicatorData {
        let stateIndicatorData = {} as IStateIndicatorData;
        switch (type) {
            case StateIndicatorType.Error:
                // see #1108883 we can't use "error"
                stateIndicatorData.className = "error-state";
                stateIndicatorData.iconClassName = "bowtie-status-error-outline";
                break;
            case StateIndicatorType.Warning:
                stateIndicatorData.className = "warning";
                stateIndicatorData.iconClassName = "bowtie-status-warning";
                break;
        }

        return stateIndicatorData;
    }
}