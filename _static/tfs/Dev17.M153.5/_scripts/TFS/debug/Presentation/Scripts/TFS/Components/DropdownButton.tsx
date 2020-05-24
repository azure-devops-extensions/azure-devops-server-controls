import "VSS/LoaderPlugins/Css!Presentation/Components/DropdownButton";

import * as React from "react";

import { PrimaryButton, IButtonProps, IButton } from "OfficeFabric/Button";
import { ContextualMenu, IContextualMenuItem, DirectionalHint } from "OfficeFabric/ContextualMenu";
import { css, autobind } from "OfficeFabric/Utilities";

export interface IDropdownButtonProps {
    /** Optional class name to add to root element */
    className?: string;

    /** Label to show on button */
    label?: string;

    /** Callback to render button content, label will not be used if this is passed in */
    onButtonContentRender?: () => JSX.Element;

    /** Props to be passed to the button */
    buttonProps?: IButtonProps

    /** Array of menu items to show in the dropdown */
    menuItems: IContextualMenuItem[];
}

export interface IDropdownButtonState {
    isOpen: boolean;
}

/**
 * Component that renders a single button, with a dropdown context menu that opens once the button is clicked/activated
 */
export class DropdownButton extends React.Component<IDropdownButtonProps, IDropdownButtonState> implements IButton {
    private _button: IButton;
    private _element: HTMLElement;
    private _resolveElement = (element: HTMLElement) => { this._element = element; };

    constructor(props: IDropdownButtonProps, context?) {
        super(props, context);

        this.state = {
            isOpen: false
        };
    }

    public focus() {
        if (this._button) {
            this._button.focus();
        }
    }

    public dismissMenu(): void {
        // no-op
    }

    public openMenu(): void {
        // no-op
    }
    
    public render() {
        const { className, buttonProps, menuItems } = this.props;
        const { isOpen } = this.state;

        return <div className={css("dropdown-button", className)}>
            <div className="dropdown-button-wrapper" ref={this._resolveElement}>
                <PrimaryButton {...buttonProps} onClick={this._onOpen} componentRef={this._resolveButton}>
                    {this._renderButtonContent()}&nbsp;<span className="bowtie-icon bowtie-chevron-down-light" />
                </PrimaryButton>
            </div>

            {isOpen && <ContextualMenu
                className="bowtie-fabric"
                directionalHint={DirectionalHint.bottomLeftEdge}
                isBeakVisible={false}
                items={menuItems}
                gapSpace={0}
                onDismiss={this._onDismiss}
                target={this._element}
            />}
        </div>;
    }

    private _renderButtonContent() {
        const { label, onButtonContentRender } = this.props;

        if (onButtonContentRender) {
            return onButtonContentRender();
        }

        return <span>{label}</span>;
    }

    @autobind
    private _resolveButton(button: IButton) {
        this._button = button;
    }

    @autobind
    private _onOpen(event) {
        this.setState({
            isOpen: true
        });
    }

    @autobind
    private _onDismiss() {
        this.setState({
            isOpen: false
        });
    }
}