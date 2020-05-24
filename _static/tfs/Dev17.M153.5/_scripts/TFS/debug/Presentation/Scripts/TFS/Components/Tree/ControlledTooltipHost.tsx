import { ICalloutProps } from "OfficeFabric/Callout";
import { DirectionalHint } from "OfficeFabric/common/DirectionalHint";
import { css, hasOverflow, getId, getNativeProps, divProperties } from "OfficeFabric/Utilities";
import { Tooltip, ITooltipProps, TooltipOverflowMode, TooltipDelay } from "VSSUI/Tooltip";
import * as React from "react";

export interface ControlledTooltipHostProps {
    className?: string;
    content: string;
    directionalHint?: DirectionalHint;
    overflowMode?: TooltipOverflowMode;
    /**
     * (Controlled) Delegates focus management to outside. When set, this component will behave like if it was focused,
     * so it will display the tooltip if it has to (it may depend on overflow rules).
     * This is useful to keep focus on an ancestor element while displaying the tooltip (and checking overflow) on a child.
     */
    isFocused?: boolean;
    calloutProps?: ICalloutProps;
    /**
     * This is temporary while Fabric TooltipDelay adds a value longer than Medium.
     */
    hasLongDelay?: boolean;
    tooltipProps?: ITooltipProps;
}

export interface ControlledTooltipHostState {
    isTooltipVisible: boolean;
}

export class ControlledTooltipHost extends React.Component<ControlledTooltipHostProps, ControlledTooltipHostState> {
    private root: HTMLElement;

    public state: ControlledTooltipHostState = {
        isTooltipVisible: false
    };

    public componentWillReceiveProps(nextProps: ControlledTooltipHostProps) {
        if (nextProps.isFocused !== this.props.isFocused) {
            if (nextProps.isFocused) {
                this.onFocused();
            } else {
                this.onLeft();
            }
        }
    }

    public componentDidMount() {
        if (this.props.isFocused) {
            this.onFocused();
        }
    }

    public render() {
        const {
            className,
            calloutProps,
            content,
            children,
            directionalHint,
            hasLongDelay,
            tooltipProps,
        } = this.props;

        const { isTooltipVisible } = this.state;
        const tooltipId = getId("tooltip");

        return (
            <div
                {...getNativeProps(this.props, divProperties)}
                className={className}
                ref={ref => this.root = ref}
                onFocusCapture={this.onFocused}
                onBlurCapture={this.onLeft}
                onMouseEnter={this.onFocused}
                onMouseLeave={this.onLeft}
                aria-describedby={isTooltipVisible && content ? tooltipId : undefined}
            >
                {children}
                {
                    isTooltipVisible &&
                    <Tooltip
                        id={tooltipId}
                        content={content}
                        delay={hasLongDelay && TooltipDelay.long}
                        targetElement={this.getTargetElement()}
                        directionalHint={directionalHint}
                        calloutProps={{ ...calloutProps, onDismiss: this.onDismiss }}
                        {...tooltipProps}
                    />
                }
            </div>
        );
    }

    private getTargetElement() {
        return this.props.overflowMode === TooltipOverflowMode.Parent
            ? this.root.parentElement
            : this.root;
    }

    /**
     * Reacts to this component being under "focus", so it displays the tooltip if it has to.
     */
    private onFocused = () => {
        const overflowElement = this.getTargetElement();
        if (this.props.overflowMode !== undefined &&
            overflowElement &&
            !hasOverflow(overflowElement)) {
            return;
        }

        this.toggleTooltip(true);
    }

    /**
     * Reacts to this component getting out of "focus", so it hides the tooltip.
     */
    private onLeft = () => {
        this.toggleTooltip(false);
    }

    private onDismiss = () => {
        this.toggleTooltip(false);
    }

    private toggleTooltip(isTooltipVisible: boolean) {
        this.setState({ isTooltipVisible });
    }
}
