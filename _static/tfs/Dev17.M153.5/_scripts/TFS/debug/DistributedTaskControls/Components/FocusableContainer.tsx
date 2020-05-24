/// <reference types="jquery" />
/// <reference types="react" />

import * as React from "react";
import * as Base from "DistributedTaskControls/Common/Components/Base";

import * as Utils_String from "VSS/Utils/String";
import { KeyCode } from "VSS/Utils/UI";

import "VSS/LoaderPlugins/Css!DistributedTaskControls/Components/FocusableContainer";

export interface IProps extends Base.IProps {
    expanded: boolean;
    ariaLabel: string;
    keys?: number[];
    onFocus?: () => void;
    isFocused?: boolean;
    role?: string;
}

export interface IState extends Base.IState {
    focusByMouse: boolean;
}

export class FocusableContainer extends Base.Component<IProps, IState> {

    public componentDidMount(): void {
        this._setFocus();
    }

    public componentDidUpdate(prevProps: IProps, prevState: IState): void {
        if (this.props && this.props.isFocused) {
            // if we have already focused it don't focus it again.
            // this check was needed because onBlur was updating component which was resulting in refocus
            if (!prevProps || prevProps.isFocused !== this.props.isFocused) {
                this._setFocus();
            }
        }
    }

    public render(): JSX.Element {
        let containerClassName = "focusable-container";
        let focusByMouseClassName = this.state.focusByMouse ? (containerClassName + this._spaceSeparator + "focus-mouse") : containerClassName;
        let cssStyleName: string = (this.props.cssClass || Utils_String.empty) + this._spaceSeparator + focusByMouseClassName;
        
        return (
            <div className={cssStyleName}
                role={this.props.role}
                aria-expanded={this.props.expanded}
                aria-label={this.props.ariaLabel}
                tabIndex={0}
                onKeyDown={this._onKeyDown}
                onMouseDown={this._onMouseDown}
                onClick={this._onClick}
                onBlur={this._onBlur}
                ref={(element) => { this._elementInFocus = $(element); }}>
                {this.props.children}
            </div>
        );
    }

    private _onBlur = (): void => {
        this.setState({ focusByMouse: false });
    }

    private _onMouseDown = (): void => {
        this.setState({ focusByMouse: true });
    }

    private _onKeyDown = (e: React.KeyboardEvent<HTMLElement>): void => {
        this.setState({ focusByMouse: false });
        if (!this.props.onFocus) {
            return;
        }

        // If keys=undefined and keypress is space then focus
        // If keys=defined and keys contains pressed key then focus
        if (((!this.props.keys || this.props.keys.length === 0) && e.keyCode === KeyCode.SPACE) ||
            (this.props.keys && this.props.keys.indexOf(e.keyCode) !== -1)) {
            this.props.onFocus();
        }
    }

    private _setFocus() {
        if (this.props.isFocused && this._elementInFocus) {
            this._elementInFocus.focus();
        }
    }

    private _onClick = (): void => {
        if (this.props.onFocus) {
            this.props.onFocus();
        }
    }

    private _spaceSeparator: string = " ";
    private _elementInFocus: JQuery;
}