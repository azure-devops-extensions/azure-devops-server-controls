/// <reference types="react" />
import * as React from "react";
import { Callout } from "OfficeFabric/Callout";
import { DirectionalHint } from "OfficeFabric/common/DirectionalHint";
import { KeyboardAccesibleComponent } from "Presentation/Scripts/TFS/Components/KeyboardAccessible";
import "VSS/LoaderPlugins/Css!VersionControl/Flyout";
import { CalloutTooltip, CalloutTooltipProps } from "VersionControl/Scenarios/Shared/CalloutTooltip";

/**
 * Defines the properties of the Flyout component.
 */
export interface FlyoutProps {
    className?: string;
    headerClassName?: string;
    dropdownContent: JSX.Element;
    isEnabled?: boolean;
    isBeakVisible?: boolean;
    setInitialFocus?: boolean;
    toolTip?: string;
    ariaLabel?: string;

    /**
     * aria-describedby id for keyboard accessible component 
     */
    ariaDescribedBy?: string;

    /**
     * does callout have focusable elements.
     */
    calloutHasFocusableElements?: boolean;

    /**
     * aria-label to apply to callout
     */
    calloutAriaLabel?: string;

    /**
     * callback invoked when flyout appears
     */
    onOpen?: () => void;
}

/**
 * Defines the state of the Flyout component.
 */
export interface FlyoutState {
    isDroppedDown: boolean;
}

/**
 * A component that displays its children, and when clicked will display a flyout below it.
 */
export class Flyout extends React.Component<FlyoutProps, FlyoutState> {
    static defaultProps: FlyoutProps = { isEnabled: true, isBeakVisible: true } as any;

    private _flyoutHeaderDiv: HTMLElement;

    public state: FlyoutState = {
        isDroppedDown: false,
    };

    public render(): JSX.Element {
        const flyoutClassName =
            "flyout " +
            (this.props.className || "") +
            (this.props.isEnabled ? " enabled" : "") +
            (this.state.isDroppedDown ? " open" : "");

        return (
            <div className={flyoutClassName} ref="flyout">
                <KeyboardAccesibleComponent
                    onClick={this.toggleDropdown}
                    toolTip={this.props.toolTip}
                    ariaLabel={this.props.ariaLabel}
                    ariaDescribedBy={this.props.ariaDescribedBy}
                    disabled={!this.props.isEnabled}
                    hideTooltip={this.state.isDroppedDown}
                >
                    <div
                        className={"flyout-header " + (this.props.headerClassName || "")}
                        ref={div => this._flyoutHeaderDiv = div}>
                        {this.props.children}
                    </div>
                    {this.state.isDroppedDown &&
                        <CalloutTooltip hasFocusableElements={this.props.calloutHasFocusableElements}
                            ariaLabel={this.props.calloutAriaLabel}
                            calloutProps={{
                                directionalHint: DirectionalHint.bottomLeftEdge,
                                target: this._flyoutHeaderDiv,
                                beakWidth: 16,
                                setInitialFocus: this.props.setInitialFocus,
                                isBeakVisible: this.props.isBeakVisible,
                                gapSpace: this.props.isBeakVisible ? 4 : 0,
                                onDismiss: this.toggleDropdown,
                            }} >
                            {this.props.dropdownContent}
                        </CalloutTooltip>
                    }
                </KeyboardAccesibleComponent>
            </div>
        );
    }

    public componentDidUpdate(prevProps: FlyoutProps, prevState: FlyoutState): void {
        if (prevState.isDroppedDown === false && this.state.isDroppedDown === true) {
            if (this.props.onOpen) {
                this.props.onOpen();
            }
        }
    }

    private toggleDropdown = (event: React.SyntheticEvent<HTMLElement>): void => {
        this.setState({
            isDroppedDown: !this.state.isDroppedDown && this.props.isEnabled,
        });

        if (event) {
            event.stopPropagation();
        }
    }
}
