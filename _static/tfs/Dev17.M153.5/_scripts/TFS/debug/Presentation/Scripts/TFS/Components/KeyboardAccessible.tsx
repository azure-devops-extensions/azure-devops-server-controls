/// <reference types="react" />
import * as React from "react";
import { TooltipHost } from "VSSUI/Tooltip";
import { css, getId } from "OfficeFabric/Utilities";
import { DirectionalHint } from "OfficeFabric/common/DirectionalHint";
import { KeyCode } from "VSS/Utils/UI";

export interface KeyboardAccesibleComponentProps extends React.Props<KeyboardAccesibleComponent> {
    className?: string;
    /**
     * To avoid the repetition of the text for screen readers, only one of tooltip
     * ariaLabel property should be provided.
     */
    toolTip?: string;
    ariaLabel?: string;
    ariaExpanded?: boolean;
    ariaDescribedBy?: string;
    disabled?: boolean;
    onClick: (event: React.SyntheticEvent<HTMLElement>) => void;
    onKeyDown?: (event: React.KeyboardEvent<HTMLElement>, props: KeyboardAccesibleComponentProps) => void;
    hideTooltip?: boolean;
}

export interface KeyboardAccesibleComponentState {
    isTooltipVisible: boolean;
}

export class KeyboardAccesibleComponent extends React.Component<KeyboardAccesibleComponentProps, KeyboardAccesibleComponentState> {
    public state: KeyboardAccesibleComponentState = {
        isTooltipVisible: false,
    };

    private buttonDiv: HTMLDivElement;
    private buttonTooltipId: string;

    constructor(props: KeyboardAccesibleComponentProps, context?: any) {
        super(props, context);

        this.buttonTooltipId = getId('keyboard-accessible-button-tooltip');
    }

    public render(): JSX.Element {
        if (this.props.toolTip) {
            return (
                <TooltipHost
                    id={this.buttonTooltipId}
                    content={this.props.toolTip}
                    directionalHint={DirectionalHint.bottomCenter}
                    calloutProps={{
                        className: css({ hidden: this.props.hideTooltip })
                    }}
                    onTooltipToggle={this.onTooltipToggle}
                >
                    {this.renderButton()}
                </TooltipHost>
            );
        }
        else {
            return this.renderButton();
        }
    }

    private renderButton(): JSX.Element {
        const ariaDescribedBy = css(
            { [this.buttonTooltipId]: this.props.toolTip && this.state.isTooltipVisible },
            this.props.ariaDescribedBy) || undefined;

        return (
            <div
                className={this.props.className}
                tabIndex={this.props.disabled ? -1 : 0}
                role="button"
                ref={ref => this.buttonDiv = ref}
                aria-describedby={ariaDescribedBy}
                aria-label={this.props.ariaLabel}
                aria-expanded={this.props.ariaExpanded}
                onClick={this.props.onClick}
                onContextMenu={this.props.onClick}
                onKeyDown={this.onKeyDown}
                aria-disabled={this.props.disabled}>
                {this.props.children}
            </div>
        );
    }

    public focus() {
        if (this.buttonDiv) {
            this.buttonDiv.focus();
        }
    }

    private onKeyDown = (event: React.KeyboardEvent<HTMLElement>): void => {
        if(this.props.onKeyDown) {
            this.props.onKeyDown(event, this.props);
        } else if (event.keyCode === KeyCode.ENTER || event.keyCode === KeyCode.SPACE || event.keyCode === KeyCode.CONTEXT_MENU) {
            this.props.onClick(event);
            event.preventDefault();
            event.stopPropagation();
        }
    }

    private onTooltipToggle = (isTooltipVisible: boolean) => {
        this.setState({ isTooltipVisible });
    }
}
