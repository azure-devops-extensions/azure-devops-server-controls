import React = require("react");

import { Spinner, ISpinnerProps } from "OfficeFabric/Spinner";
import { Overlay } from "OfficeFabric/Overlay";
import { css } from "OfficeFabric/Utilities";

import * as Component_Base from "VSS/Flux/Component";
import * as Utils_Core from "VSS/Utils/Core";

export interface ILoadingProps extends ISpinnerProps {
    blocking?: boolean;
    wait?: number;
}

export interface IState extends Component_Base.State {
    show: boolean;
}

/**
 * Component to show loading Spinner with label underneath.
 */
export class LoadingComponent extends Component_Base.Component<ILoadingProps, IState> {

    constructor() {
        super();
        this.state = { show: false };
    }

    public componentWillMount(): void {
        this._waitHandle = Utils_Core.delay(this,
            this.props.wait ? this.props.wait : LoadingComponent.c_defaultWaitTime, () => {
                this._waitHandle = null;
                this.setState({ show: true });
            });
    }

    public componentWillUnmount(): void {
        if (this._waitHandle) {
            this._waitHandle.cancel();
        }
    }

    public render(): JSX.Element {
        let spinner: JSX.Element = <Spinner
            key={"Spinner"}
            size={this.props.size}
            className={css("dt-loading-spinner", this.props.className)}
            label={this.props.label}
            ariaLabel={this.props.ariaLabel} />;

        if (this.state.show) {
            if (!!this.props.blocking) {
                return (<Overlay>{spinner}</Overlay>);
            } else {
                return spinner;
            }
        }

        return null;
    }

    private static readonly c_defaultWaitTime: number = 100;
    private _waitHandle: Utils_Core.DelayedFunction;
}