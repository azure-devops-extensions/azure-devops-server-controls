/// <reference types="react" />

import * as React from 'react';
import * as ReactDOM from 'react-dom';
import * as Diag from "VSS/Diag";

import Controls = require("VSS/Controls");
import Utils_Core = require("VSS/Utils/Core");
import * as Tooltip from "VSSUI/Tooltip";
import { DefaultButton } from "OfficeFabric/Button";
import { ContextualMenu, IContextualMenuItem, DirectionalHint } from "OfficeFabric/ContextualMenu";
import { autobind } from "OfficeFabric/Utilities";

import "VSS/LoaderPlugins/Css!Presentation/Components/AddNewItem";
import { VssIcon, IVssIconProps, VssIconType } from "VSSUI/VssIcon";

export interface IAddNewItemState {
    /**
     * Flag indicating whether the control's menu is currently open (visible)
     */
    isContextMenuOpen: boolean;
}

export interface IAddNewItemProps {
    /**
     * Display text for the add new item button
     */
    displayText: string;

    /**
     * The items to be displayed in the context menu
     */
    items: IContextualMenuItem[];

    /**
     * Flag used to "disable" the button, making it unclickable
     */
    isDisabled?: boolean;

    /** 
     * Tooltip to display for control when disabled
     */
    disabledTooltip?: string;

    /**
     * Override configuration for the "plus" icon
     */
    iconProps?: IVssIconProps;

    /**
     * When true, the button is rendered without text and only displays the icon.
     */
    isCollapsed?: boolean;

    /**
     * The CSS class of the top-level div container
     */
    className?: string;

    /**
     * Callback invoked when the menu is opened/closed
     */
    onDropdownToggled?: (isOpen: boolean) => void;

    /**
     * If true, the tabindex property of the button will be set to -1
     */
    preventTabFocus?: boolean;
}

export class AddNewItemComponent extends React.Component<IAddNewItemProps, IAddNewItemState> {
    private static iconCssClass = "add-item-icon";
    private static iconElementCssClass = "add-item-icon-element";
    private static displayTextCssClass = "text";
    private static bowtieMathPlusHeavyCssClass = "bowtie-icon bowtie-math-plus-heavy";
    private static bowtieChevronDownCssClass = "bowtie-icon bowtie-chevron-down";

    private _addNewItemButtonRef: HTMLButtonElement;

    constructor(props: IAddNewItemProps) {
        super(props);

        this.state = {
            isContextMenuOpen: false
        };
    }

    public render(): JSX.Element {
        const hasDropdown = this.props.items && this.props.items.length > 1;
        const button = <button
                className={"add-new-item-component-button" + (this.props.isDisabled ? " disabled" : "")}
                ref={(ref) => this._addNewItemButtonRef = ref}
                onClick={this._clickHandler}
                tabIndex={this.props.preventTabFocus ? -1 : 0}>

            <VssIcon {...(this.props.iconProps || { iconName: "math-plus-heavy", iconType: VssIconType.bowtie }) } />
            {!this.props.isCollapsed ? <span className={AddNewItemComponent.displayTextCssClass}>{this.props.displayText}</span> : null}
            {hasDropdown ? <VssIcon iconName="chevron-down" iconType={VssIconType.bowtie} /> : null}
        </button>;

        if (this.props.isDisabled) {
            return <div className={this.props.className}>
                <Tooltip.TooltipHost content={this.props.disabledTooltip}>
                    {button}
                </Tooltip.TooltipHost>
            </div>;
        }

        return <div className={this.props.className} onMouseDown={this._onMouseDown} onMouseUp={this._onMouseUp}>
            {button}
            {
                (hasDropdown && this.state.isContextMenuOpen) ?
                    <ContextualMenu
                        items={this.props.items}
                        onDismiss={this._onDismiss}
                        target={this._addNewItemButtonRef}
                        shouldFocusOnMount={true}
                        directionalHint={DirectionalHint.bottomLeftEdge} />
                    : null
            }
        </div>;
    }

    public focus() {
        if (this._addNewItemButtonRef) {
            this._addNewItemButtonRef.focus();
        }
    }

    public get isMenuActive(): boolean {
        return this.state.isContextMenuOpen;
    }

    public activateMenu() {
        this._setIsContextMenuOpen(true);
    }
    
    private _setIsContextMenuOpen(isOpen: boolean) {
        if (!!isOpen !== !!this.state.isContextMenuOpen) {
            this.setState({ isContextMenuOpen: isOpen });
            if (this.props.onDropdownToggled) {
                this.props.onDropdownToggled(isOpen);
            }
        }
    }

    @autobind
    private _onMouseDown(event: React.MouseEvent<HTMLDivElement>) {
        // We perform all logic in the button "click" event, but want to register that we've stopped propagation
        // for the other mouse events so that any containers don't react to any part of the event
        event.stopPropagation();
    }

    @autobind
    private _onMouseUp(event: React.MouseEvent<HTMLDivElement>) {
        // We perform all logic in the button "click" event, but want to register that we've stopped propagation
        // for the other mouse events so that any containers don't react to any part of the event
        event.stopPropagation();
    }

    @autobind
    private _clickHandler(event: React.MouseEvent<HTMLButtonElement>) {
        if (this.props.isDisabled) {
            event.preventDefault();
            event.stopPropagation();
            return;
        }

        Diag.Debug.assert(!!this.props.items);
        if (this.props.items.length > 1) {
            this._setIsContextMenuOpen(true);
        }
        else {
            if (this.props.items[0] && $.isFunction(this.props.items[0].onClick)) {
                this.props.items[0].onClick(event, this.props.items[0]);
            }
        }

        event.stopPropagation();
    }

    @autobind
    private _onDismiss() {
        this._setIsContextMenuOpen(false);
    }
}
