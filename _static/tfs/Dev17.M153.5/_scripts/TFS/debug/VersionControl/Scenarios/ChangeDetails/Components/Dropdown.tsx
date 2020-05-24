import * as React from "react";
import { DirectionalHint } from "OfficeFabric/common/DirectionalHint";
import { ContextualMenu, IContextualMenuItem } from "OfficeFabric/ContextualMenu";
import { css, getId } from 'OfficeFabric/Utilities';
import * as Utils_String from "VSS/Utils/String";

import { GitCommit } from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";

import * as IdentityImage from "Presentation/Scripts/TFS/Components/IdentityImage";

import "VSS/LoaderPlugins/Css!VersionControl/Dropdown";

export interface DropdownItem {
    /**
     * UI to be rendered for the corresponding item
     */
    content: JSX.Element;

    /**
     * AriaLabel for the corresponding item
     */
    contentAriaLabel?: string;

    /**
     * AriaDescribedBy for the corresponding item
     */
    contentAriaDescribedBy?: string;

    /**
     * Provide if different UI needs to be shown in header when an item is selected.
     */
    contentInHeader?: JSX.Element;

    /**
     * Commit information for commiter's image
     */
    commit: GitCommit;

    /**
     * Commiter's image element
     */
    imageComponent?: JSX.Element;
}

export interface DropdownProps {
    items: DropdownItem[];
    className?: string;
    dropDownButtonAriaLabel?: string;
    dropDownButtonAriaDescribedBy?: string;
    onItemSelected(itemIndex: number): void;
    initialSelectedItemIndex: number;
}

export interface DropdownState {
    isDroppedDown: boolean;
    selectedItemIndex: number;
}

/**
 * This class creates a drop down list with given items
 * It can show different UI components for same item in drop down and header when selected
 */
export class Dropdown extends React.Component<DropdownProps, DropdownState> {
    private _togglerElement: HTMLElement;
    private _menuid: string;

    constructor(props: DropdownProps) {
        super(props);

        this.state = {
            isDroppedDown: false,
            selectedItemIndex: (props.initialSelectedItemIndex >= 0 && props.initialSelectedItemIndex < props.items.length)
                ? props.initialSelectedItemIndex
                : 0,
        } as DropdownState;
        this._menuid = getId('contextual-menu');
    }

    public render(): JSX.Element {
        const selectedItem = this.props.items[this.state.selectedItemIndex];

        return (
            <div className={"dropdown " + (this.props.className ? this.props.className : "")}>
                {selectedItem.contentInHeader || selectedItem.content}
                <button
                    className={"drop-icon"}
                    aria-haspopup={true}
                    aria-pressed={this.state.isDroppedDown}
                    aria-label={this.props.dropDownButtonAriaLabel}
                    aria-describedby={this.props.dropDownButtonAriaDescribedBy}
                    aria-owns={this.state.isDroppedDown ? this._menuid : null}
                    onClick={this._toggleDropdown}
                    ref={(target) => this._togglerElement = target}>
                    <span className={"bowtie-icon bowtie-chevron-down"}></span>
                </button>
                {this.state.isDroppedDown &&
                    <ContextualMenu
                        id={this._menuid}
                        items={this.props.items.map((value, index) => ({
                            key: Utils_String.numberToString(index),
                            name: Utils_String.empty,
                            onRender: () =>
                                <DropdownItemHolder
                                    key={Utils_String.numberToString(index)}
                                    component={value.content}
                                    ariaLabel={value.contentAriaLabel}
                                    ariaDescribedBy={value.contentAriaDescribedBy}
                                    onClick={() => this._onItemSelected(index)}
                                    commit={value.commit}
                                    imageComponent={value.imageComponent}
                                />,
                        } as IContextualMenuItem))}
                        onDismiss={this._onDismiss}
                        directionalHint={DirectionalHint.bottomRightEdge}
                        target={this._togglerElement} />
                }
            </div>
        );
    }

    public componentWillReceiveProps(nextProps: DropdownProps): void {
        this.setState({
            selectedItemIndex: (nextProps.initialSelectedItemIndex >= 0 && nextProps.initialSelectedItemIndex < nextProps.items.length)
                ? nextProps.initialSelectedItemIndex
                : 0,
        } as DropdownState);
    }

    public componentWillUnmount(): void {
        this._togglerElement = null;
    }

    private _onDismiss = (event: any): void => {
        this.setState({ isDroppedDown: false } as DropdownState);
    };

    private _onItemSelected = (newIndex: number): void => {
        this.props.onItemSelected(newIndex);

        this.setState({
            isDroppedDown: false,
            selectedItemIndex: newIndex,
        } as DropdownState);
    };

    private _toggleDropdown = (): void => {
        this.setState({ isDroppedDown: !this.state.isDroppedDown } as DropdownState);
    };
}

// Exported for UT
export interface DropdownItemProps {
    component: JSX.Element;
    imageComponent?: JSX.Element;
    ariaLabel?: string;
    ariaDescribedBy?: string;
    onClick(): void;
    commit: GitCommit;
}

// Exported for UT
export const DropdownItemHolder = (props: DropdownItemProps): JSX.Element => {

    return (
        <div className="dropdown-item-holder">
            <div className="dropdown-item-image">
                {props.imageComponent}
            </div>
            <button
                className="dropdown-item-text"
                role="menuitem"
                aria-label={props.ariaLabel}
                aria-describedby={props.ariaDescribedBy}
                onClick={props.onClick}>
                {props.component}
            </button>
        </div>
    );
};
