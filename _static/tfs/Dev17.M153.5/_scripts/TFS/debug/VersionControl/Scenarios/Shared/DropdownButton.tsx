import * as React from "react";
import * as ReactDOM from "react-dom";

import { DefaultButton, PrimaryButton, ActionButton } from "OfficeFabric/Button";
import { DirectionalHint } from "OfficeFabric/common/DirectionalHint";
import { IContextualMenuItem } from "OfficeFabric/ContextualMenu";
import { IIconProps } from "OfficeFabric/Icon";
import { ICalloutProps } from 'OfficeFabric/Callout';
import { autobind, BaseComponent, css, getId, IBaseProps } from "OfficeFabric/Utilities";

import { ContributableContextualMenu, IContributionData } from "VSSPreview/Flux/Components/ContributableContextMenu";
import { CalloutTooltipProps } from "Scenarios/Shared/CalloutTooltip";
import { MoreActionsButton } from "VSSUI/ContextualMenuButton";

export interface IDropdownButtonProps extends IBaseProps {
    id?: string;
    title: string;
    directionalHint?: DirectionalHint;
    iconClassName?: string;
    items: IContextualMenuItem[];
    className?: string;
    contributionData?: IContributionData;
    disabled?: boolean;
    text?: string;
    calloutProps?: ICalloutProps;
}

export interface IDropdownButtonState {
    isContextMenuVisible?: boolean;
}

export class DropdownButton extends BaseComponent<IDropdownButtonProps, IDropdownButtonState> {
    private _contextMenuExpandedId: string;
    private _buttonRef: HTMLElement;
    private _hasFocus: boolean;

    public constructor(props: IDropdownButtonProps) {
        super(props);

        this._contextMenuExpandedId = getId("context-menu-expanded");

        this.state = {
            isContextMenuVisible: false,
        };

        this._hasFocus = false;
        this._buttonRef = null;
    }

    public componentWillUpdate(nextProps: IDropdownButtonProps, nextState: IDropdownButtonState): void {
        // check to see if our button element has focus
        this._hasFocus = document.activeElement === this._buttonRef;
    }

    public componentDidUpdate(prevProps: IDropdownButtonProps, prevState: IDropdownButtonState): void {
        // if our button previously had focus but we lost it
        // because we switched the control type, we need to set focus again
        if (this._hasFocus && document.activeElement !== this._buttonRef) {
            this._buttonRef.focus();
        }
    }

    public render() {
        const id = this.props.id || "dropdown-icon-button";

        const buttonProps = {
            iconProps: undefined,
            ariaLabel: this.props.title,
            className: this.props.className,
            onClick: this._onClick,
            id,
            "aria-haspopup": true,
            "aria-expanded": this.state.isContextMenuVisible,
            "aria-controls": this.state.isContextMenuVisible ? this._contextMenuExpandedId : null,
            disabled: this.props.disabled,
            text: this.props.text,
        };

        buttonProps.className = css(buttonProps.className, "dropdown-icon-button");

        const buttonChildren = (
            <span className={this.props.iconClassName || "bowtie-icon bowtie-chevron-down-light"}>
                {this.props.children}
            </span>
        );

        let button: JSX.Element;
        if (buttonProps.className.indexOf("btn-cta") >= 0) {
            buttonProps.className = buttonProps.className.replace(/\bbtn-cta\b/, "");
            button = <PrimaryButton
                        ref={ref => this._buttonRef = ReactDOM.findDOMNode(ref) as HTMLElement }
                        {...buttonProps}
                        >{buttonChildren}</PrimaryButton>;
        }
        else if (buttonProps.className.indexOf("--action") >= 0) { 
            button = <ActionButton
                        ref={ref => this._buttonRef = ReactDOM.findDOMNode(ref) as HTMLElement }
                        {...buttonProps}
                        >{buttonChildren}</ActionButton>;
        }
        else {
            button = <DefaultButton
                        ref={ref => this._buttonRef = ReactDOM.findDOMNode(ref) as HTMLElement }
                        {...buttonProps}
                        >{buttonChildren}</DefaultButton>;
        }

        return (
            <span>
                {button}
                {this.state.isContextMenuVisible ? (
                    <ContributableContextualMenu
                        className="bowtie-fabric"
                        items={this.props.items}
                        onDismiss={this._onDismiss}
                        shouldFocusOnMount={true}
                        target={"#" + id}
                        contributionData={this.props.contributionData}
                        directionalHint={this.props.directionalHint || DirectionalHint.bottomLeftEdge}
                        calloutProps={this.props.calloutProps}
                    />) : (null)}
            </span>
        );
    }

    @autobind
    private _onClick(event: React.MouseEvent<HTMLButtonElement>): void {
        // hide/show menu on click
        this.setState({ isContextMenuVisible: !this.state.isContextMenuVisible });
        event.preventDefault();
        event.stopPropagation();
    }

    @autobind
    private _onDismiss(): void {
        this.setState({ isContextMenuVisible: false });
    }
}

export function getMenuIcon(name: string): IIconProps {
    return { className: "bowtie-icon " + name, iconName: undefined };
}
