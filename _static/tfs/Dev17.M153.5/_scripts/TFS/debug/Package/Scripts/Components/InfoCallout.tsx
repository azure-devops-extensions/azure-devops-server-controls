import * as React from "react";

import { IconButton } from "OfficeFabric/Button";
import { Callout, DirectionalHint } from "OfficeFabric/Callout";
import { IIconProps } from "OfficeFabric/Icon";
import { autobind, css } from "OfficeFabric/Utilities";

import { Component, Props, State } from "VSS/Flux/Component";
import { announce } from "VSS/Utils/Accessibility";

import "VSS/LoaderPlugins/Css!Package:Package/Scripts/Components/InfoCallout";

export interface IInfoCalloutProps extends Props {
    calloutMessage: string;
    buttonAriaLabel?: string;
    calloutAriaLabel?: string;
    className?: string;
    directionalHint?: DirectionalHint;
    calloutWidth?: number;
}

export interface IInfoCalloutState extends State {
    calloutOpen: boolean;
}

export class InfoCallout extends Component<IInfoCalloutProps, IInfoCalloutState> {
    constructor(props: IInfoCalloutProps) {
        super(props);
        this.state = {
            calloutOpen: false
        };
    }

    public render(): JSX.Element {
        const divClassName = css("info-callout-container", this.props.className != null ? this.props.className : "");
        /* Setting a default width because otherwise the message will be all one line */
        const defaultCalloutWidth: number = 300;
        return (
            <div className={divClassName} ref={this._resolveCalloutTarget}>
                <IconButton
                    className="icon"
                    onClick={this._toggleInfoCalloutOpen}
                    iconProps={{ iconName: "Info" } as IIconProps}
                    ariaLabel={this.props.buttonAriaLabel}
                    aria-expanded={this.state.calloutOpen}
                />
                {this.state.calloutOpen && (
                    <Callout
                        calloutWidth={this.props.calloutWidth ? this.props.calloutWidth : defaultCalloutWidth}
                        ariaLabel={this.props.calloutAriaLabel}
                        className="info-callout"
                        setInitialFocus={true}
                        gapSpace={0}
                        onDismiss={this._toggleInfoCalloutOpen}
                        target={this._calloutTarget}
                        directionalHint={this.props.directionalHint}
                    >
                        <p className="info-callout-paragraph"> {this.props.calloutMessage} </p>
                    </Callout>
                )}
            </div>
        );
    }

    @autobind
    private _toggleInfoCalloutOpen(): void {
        if (this.state.calloutOpen === false) {
            announce(this.props.calloutMessage);
        }

        this.setState({
            calloutOpen: !this.state.calloutOpen
        });
    }

    @autobind
    private _resolveCalloutTarget(element: HTMLElement): void {
        if (element) {
            this._calloutTarget = element;
        }
    }

    private _calloutTarget: HTMLElement;
}
