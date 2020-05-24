import * as React from "react";

import { delay } from "VSS/Utils/Core";
import { IAnimatedEntryProps } from "TfsCommon/Scripts/Components/Animation/AnimatedEntry.Props";

export interface IAnimatedEntryState {
    animationActive: boolean;
}

/**
 * Use the same TICK delay as the CSSTransitionGroup. This should make sure that dom operations before are flushed, and then
 * trigger the transition.
 */
const TICK = 17;

/**
 * Component that animates the entry of a given nested element.
 */
export class AnimatedEntry extends React.Component<IAnimatedEntryProps, IAnimatedEntryState> {
    private _resolveElement = (element: HTMLSpanElement): void => { this._element = element; };
    private _element: HTMLSpanElement;

    private _hasAnimated = false;

    constructor(props: IAnimatedEntryProps) {
        super(props);

        this.state = {
            animationActive: false
        };
    }

    public componentDidMount() {
        // Only animate the very first time this component is mounted
        if (!this._hasAnimated) {
            this._hasAnimated = true;

            if (this._element) {
                this._element.classList.add(this.props.enterClassName);

                const activeClassName = `${this.props.enterClassName}-active`;
                delay(null, TICK, () => {
                    if (this._element) {
                        this._element.classList.add(activeClassName);
                    }
                });
                delay(null, TICK + this.props.enterTimeout, () => {
                    if (this._element) {
                        this._element.classList.remove(this.props.enterClassName, activeClassName);
                    }
                });
            }
        }
    }

    public render() {
        return <span className={this.props.className} ref={this._resolveElement}>
            {this.props.children}
        </span>;
    }
}