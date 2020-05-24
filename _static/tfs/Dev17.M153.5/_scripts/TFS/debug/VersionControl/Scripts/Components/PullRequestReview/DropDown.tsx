import React = require("react");

export interface IDropDownListProps extends React.Props<void> {
    header: JSX.Element;
    isVisible: boolean;
    toggleMenu(event: any): void;  // handle menu toggle
    onKeyDown(event: any): void;  // handle key down event on the item
}

/**
 * Render a list of components in a dropdown.
 * The children of this component will automatically be rendered as dropdown elements.
 * The header element will be rendered in the visible part of the drop down.
 */
export class DropDown extends React.Component<IDropDownListProps, {}> {
    public render(): JSX.Element {
        let list: JSX.Element[] = [];

        return (
            <ul className="menu-bar">
                <li
                    className="menu-item"
                    role="menuItem"
                    onKeyDown={this.props.onKeyDown}
                    onClick={this.props.toggleMenu}><a>{this.props.header}</a></li>
                <ul
                    aria-expanded={this.getAriaExpandStyle()}
                    aria-haspopup={true}
                    style={{ display: this.getBockStyle() }}
                    role="menu"
                    className="drop-sub-menu"
                    onMouseLeave={this._hideMenu.bind(this)}>
                    {React.Children.map(this.props.children, this._wrapChild.bind(this))}
                </ul>
            </ul>);
    }

    private _hideMenu(event: any): void {
        this.props.toggleMenu(false);
    }

    private _wrapChild(child: JSX.Element): JSX.Element {
        return (
            <li className="menu-item" role="menuitem"
                onKeyDown={this.props.onKeyDown}>
                <a>{child}</a>
            </li>);
    }

    private getAriaExpandStyle() {
        return this.props.isVisible ? "true" : "false";
    }

    private getBockStyle(): string {
        return this.props.isVisible ? "block" : "none";
    }
}

export interface IDropDownParentState {
    isVisible: boolean;
}

export class DropDownParent<P, S extends IDropDownParentState> extends React.Component<P, S> {

    /**
     * Add keyboard support to our drop down menu items.
     * (we are using jquery here which isn't recommended but focus is not
     * easy to manipulate in react).
     */
    protected onKeyDown(event): void {
        let focusable;

        // support up and down arrow navigation
        if (event.keyCode === 40) { // down
            focusable = $(event.target).parent().next();
        }
        if (event.keyCode === 38) { // up
            focusable = $(event.target).parent().prev();
        }

        if (focusable) {
            // this allows us to switch menu item focus
            // on up/down arrow
            focusable.find("a:first").focus();
            
            // show the menu if it is not yet displayed
            this.toggleMenu(true);
        }

        // if we are going to lose menu focus, hide the menu
        if (event.keyCode === 9) {
            focusable = $(event.target).parent().next();
            if (focusable.length === 0) {
                this.toggleMenu(false);
            }
        }
    }

    /**
     * Toggle showing and hiding of the menu.
     * @param show - optionally tell the menu to show or hide. If not specified, the menu will
     * show or hide itself depending on its current state.
     */
    protected toggleMenu(show?: boolean): void {
        if (show === false || show === true) {
            this.setState($.extend({}, this.state, { isVisible: show }));
        } else {
            // show is not explicitly set, so toggle instead
            this.setState($.extend({}, this.state, { isVisible: !this.state.isVisible }));
        }
    }
}