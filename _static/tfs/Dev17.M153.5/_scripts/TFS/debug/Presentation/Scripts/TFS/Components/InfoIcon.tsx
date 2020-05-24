import "VSS/LoaderPlugins/Css!Presentation/Components/InfoIcon";

import { Callout, DirectionalHint } from "OfficeFabric/Callout";
import { autobind, css, getNativeProps, divProperties } from "OfficeFabric/Utilities";
import * as React from "react";
import { IVssIconProps, VssIcon } from "VSSUI/VssIcon";
import { KeyCode } from "VSS/Utils/UI";

export { DirectionalHint };

export interface IInfoIconProps extends React.HTMLAttributes<HTMLDivElement> {
    /** Props for the icon */
    iconProps: IVssIconProps;
    /** Direction for the location of the callout @default bottomLeftEdge */
    directionalHint?: DirectionalHint;
    /** The text to display in the callout */
    infoText?: string;
    /** Optional render override for the callout */
    onRenderContent?: () => JSX.Element;
}

export interface IInfoIconState {
    /** Is the callout open */
    calloutOpened: boolean;
}

/**
 * Icon which shows a callout with extra information when hovered
 */
export class InfoIcon extends React.PureComponent<IInfoIconProps, IInfoIconState> {
    private _calloutTarget: HTMLElement;

    constructor(props: IInfoIconProps) {
        super(props);

        this.state = {
            calloutOpened: false
        };
    }

    public render(): JSX.Element {
        const {
            directionalHint = DirectionalHint.topCenter,
            iconProps,
            infoText,
            onRenderContent
        } = this.props;

        const {
            calloutOpened
        } = this.state;

        return (
            <div
                aria-label={infoText}
                {...getNativeProps(this.props, divProperties) }
                ref={element => this._calloutTarget = element}
                onClick={this._onClick}
                onKeyDown={this._onKeyDown}
                role="button"
                tabIndex={0}
            >
                <VssIcon
                    {...iconProps}
                    className={css(iconProps.className, "vss-info-icon")}
                />
                {
                    calloutOpened &&
                    <Callout
                        target={this._calloutTarget}
                        directionalHint={directionalHint}
                        className="vss-info-callout"
                        onDismiss={this._onDismiss}
                    >
                        {this._renderCalloutContent()}
                    </Callout>
                }
            </div>
        );
    }

    private _renderCalloutContent(): JSX.Element {
        const {
            infoText,
            onRenderContent
        } = this.props;

        if (onRenderContent) {
            return onRenderContent();
        } else {
            return (
                <div className="vss-info-text-container">
                    {infoText}
                </div>
            );
        }
    }

    @autobind
    private _onClick(): void {
        this.setState({ calloutOpened: true });
    }

    @autobind
    private _onKeyDown(event: React.KeyboardEvent<HTMLElement>): void {
        if (event.keyCode === KeyCode.ENTER || event.keyCode === KeyCode.SPACE) {
            this.setState({ calloutOpened: true });
        }
    }

    @autobind
    private _onDismiss(): void {
        this.setState({ calloutOpened: false });
    }
}