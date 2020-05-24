/// <reference types="react" />
import * as React from "react";
import { TooltipHost, TooltipDelay } from "VSSUI/Tooltip";
import { DirectionalHint } from "OfficeFabric/common/DirectionalHint";
import { KeyCode } from "VSS/Utils/UI";

export interface KeyboardAccesibleComponentProps extends React.Props<KeyboardAccesibleComponent> {
    className?: string;
    hostClassName?: string;
    /**
     * To avoid the repetition of the text for screen readers, only one of tooltip
     * ariaLabel property should be provided.
     */
    toolTip?: string;
    ariaLabel?: string;
    disabled?: boolean;
    onClick: (event: React.SyntheticEvent<HTMLElement>) => void;
}

export class KeyboardAccesibleComponent extends React.Component<KeyboardAccesibleComponentProps, {}> {
    private _element;

    public render(): JSX.Element {
        if (this.props.toolTip) {
            return (
                <TooltipHost
                    content={this.props.toolTip}
                    directionalHint={DirectionalHint.bottomLeftEdge}
                    hostClassName={this.props.hostClassName}>
                    {this.renderButton()}
                </TooltipHost>
            );
        }
        else {
            return this.renderButton();
        }
    }

    private renderButton(): JSX.Element {
        return (
            <div
                ref={(element) => this._element = element}
                className={this.props.className}
                tabIndex={this.props.disabled ? -1 : 0}
                role="button"
                aria-label={this.props.ariaLabel}
                onClick={this.props.onClick}
                onKeyDown={this.onKeyDown}
                aria-disabled={this.props.disabled}>
                {this.props.children}
            </div>
        );
    }

    private onKeyDown = (event: React.KeyboardEvent<HTMLElement>): void => {
        if (event.keyCode === KeyCode.ENTER || event.keyCode === KeyCode.SPACE) {
            this.props.onClick(event);
            event.preventDefault();
            event.stopPropagation();
        }
    }

    public focus() {
        if (this._element) {
            this._element.focus();
        }
    }
}


