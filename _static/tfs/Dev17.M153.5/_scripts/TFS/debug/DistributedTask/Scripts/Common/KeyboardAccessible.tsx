/// <reference types="react" />
import * as React from "react";
import { TooltipHost, DirectionalHint } from "VSSUI/Tooltip";
import { KeyCode } from "VSS/Utils/UI";

export interface KeyboardAccesibleComponentProps extends React.Props<KeyboardAccesibleComponent> {
    className?: string;
    toolTip?: string;
    ariaLabel?: string;
    disabled?: boolean;
    onClick: (event: React.SyntheticEvent<HTMLElement>) => void;
}

export class KeyboardAccesibleComponent extends React.Component<KeyboardAccesibleComponentProps, {}> {
    public render(): JSX.Element {
        if (this.props.toolTip) {
            return (
                <TooltipHost
                    content={this.props.toolTip}
                    directionalHint={DirectionalHint.bottomLeftEdge}>
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
}