/// <reference types="react" />

import * as React from "react";

import { CNTRL_KEY, SHIFT_KEY } from "DistributedTaskControls/Common/Common";
import { Item, ItemOverviewProps, ItemOverviewState } from "DistributedTaskControls/Common/Item";
import { SelectableBase } from "DistributedTaskControls/Components/SelectableBase";
import * as Resources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";

import { DirectionalHint } from "OfficeFabric/ContextualMenu";
import { Check } from "OfficeFabric/Check";
import { ContextualMenu, IContextualMenuItem } from "OfficeFabric/ContextualMenu";

import { KeyCode } from "VSS/Utils/UI";

import "VSS/LoaderPlugins/Css!DistributedTaskControls/Components/Selectable";

export interface ISelectableProps extends ItemOverviewProps {
    canParticipateInMultiSelect?: boolean;
    isDraggable?: boolean;
    getContextMenuItems?: (viewContext?: any) => IContextualMenuItem[];
    controlSection?: JSX.Element;
}

export interface ISelectableState extends ItemOverviewState {
    isContextMenuVisible?: boolean;
    contextMenuTarget?: MouseEvent;
}

/**
 * List of scenarios to be validated on making change to this class
 *  - Select an item and make sure right select gets updated
 *  - Move selection using up/down keys
 *  - Multi-select using checkbox
 *  - Unselect using checkbox
 *  - Move selection after multi-select using up/down keys
 *  - Navigation to another tab and navigating back should retain selections
 */

export class Selectable extends SelectableBase<ISelectableProps, ISelectableState> {

    public componentDidMount() {
        super.componentDidMount();

        $(window).on("keydown", this._keyDownHandler);
        $(window).on("keyup", this._keyUpHandler);
    }

    public componentWillUnmount() {
        super.componentWillUnmount();

        $(window).off("keydown", this._keyDownHandler);
        $(window).off("keyup", this._keyUpHandler);
    }

    public render(): JSX.Element {
        let className = "two-panel-selector-selectable";
        if (this.state.isSelected) {
            className += " " + "selected";
        }

        const selectableAriaProps = ({} as React.HTMLAttributes<HTMLElement>);
        if (this.props.ariaProps) {
            if (this.props.ariaProps.labelledBy) {
                selectableAriaProps["aria-labelledby"] = this.props.ariaProps.labelledBy;
            }
            if (this.props.ariaProps.level) {
                selectableAriaProps["aria-level"] = this.props.ariaProps.level;
            }
            if (this.props.ariaProps.expanded) {
                selectableAriaProps["aria-expanded"] = this.props.ariaProps.expanded;
            }
            if (this.props.ariaProps.setSize) {
                selectableAriaProps["aria-setsize"] = this.props.ariaProps.setSize;
            }
            if (this.props.ariaProps.positionInSet) {
                selectableAriaProps["aria-posinset"] = this.props.ariaProps.positionInSet;
            }
            if (this.props.ariaProps.describedBy) {
                selectableAriaProps["aria-describedby"] = this.props.ariaProps.describedBy;
            }
        }
        selectableAriaProps["aria-selected"] = this.state.isSelected;

        return (
            <div className={className}>
                <div ref={(element) => this._element = element}
                    className="selectable-item-section left"
                    onMouseDown={this._onMouseDown}
                    onFocus={this._handleFocus}
                    onClick={this._handleFocus}
                    onKeyUp={this._selectableItemKeyUpHandler}
                    onContextMenu={this._onContextMenu}
                    role={this.props.ariaProps ? this.props.ariaProps.role : null}
                    data-is-focusable={true}
                    {...selectableAriaProps}>
                    {
                        this.props.children
                    }
                    {
                        !!this.state.isContextMenuVisible && this._contextMenuItems.length > 0 &&
                        (<ContextualMenu className="two-panel-selectable-item-context-menu"
                            target={this.state.contextMenuTarget}
                            items={this._contextMenuItems}
                            onDismiss={this._onContextMenuDismiss}
                            ariaLabel={Resources.ContextMenuText}
                            isBeakVisible={true}
                            directionalHint={DirectionalHint.bottomCenter} />)
                    }
                </div>
                <div className="controls-section right"
                    // Fix for bug#867492 - Prevent showing context menu in the controls section
                    // Overriding the contextmenu handler to prevent default behavior
                    onContextMenu={(event: React.MouseEvent<HTMLDivElement>) => {
                        event.persist();
                        event.preventDefault();
                    }}>
                    {
                        this.props.controlSection
                    }
                    {
                        (this.props.canParticipateInMultiSelect) &&
                        (<div className="multi-select-check-box left" title={Resources.SelectTitle} onClick={this._onMultiSelect} >
                            <Check checked={this.state.isSelected} />
                        </div>)
                    }
                    {
                        this.props.isDraggable &&
                        <i className="bowtie-icon bowtie-resize-grip overview-gripper-icon right" onMouseDown={this._onGripperMouseDown} />
                    }
                </div>
            </div>
        ) as JSX.Element;
    }


    protected getItem(): Item {
        return this.props.item;
    }

    protected getElement(): HTMLElement {
        return this._element;
    }

    private _selectableItemKeyUpHandler = (event) => {
        switch (event.keyCode) {
            case KeyCode.SPACE:
                this._onMultiSelect();
                break;
        }
    }

    private _onMouseDown = (event: React.MouseEvent<HTMLElement>) => {
        this._validateAndFixKeyboardCache(event.ctrlKey, event.shiftKey);
        if (event.ctrlKey) {
            // handle ctrl+click
            this._onMultiSelect();
        }
    }

    private _onGripperMouseDown = (event: React.MouseEvent<HTMLElement>) => {
        this._handleFocus();
    }

    private _handleFocus = () => {
        if (this.getItemSelectionStore().getKeyDownState(SHIFT_KEY)) {
            this._onMultiSelect();
        } else if (this.getItemSelectionStore().getKeyDownState(CNTRL_KEY)) {
            // Required to do blank navigation on ctrl.
        } else {
            if (!this.state.isSelected) {
                this.getItemSelectorActions().selectItem.invoke({ data: this.props.item, canParticipateInMultiSelect: this.props.canParticipateInMultiSelect || false });
            }
        }
    }

    private _onContextMenu = (event?: any) => {

        if (!!event) {
            event.persist();
            event.preventDefault(); // Prevent the default context menu

            this._contextMenuItems = !!this.props.getContextMenuItems ? this.props.getContextMenuItems() : [];

            if (this._contextMenuItems.length > 0) {
                this.setState({
                    isContextMenuVisible: true,
                    contextMenuTarget: event
                });
            }
        }
    }

    private _onContextMenuDismiss = () => {
        this.setState({
            isContextMenuVisible: false
        });
    }

    private _onMultiSelect = () => {
        // If this is the only item in the selected list and the same item is clicked again, do nothing
        // Else fire multiselect event, it will handle selection/de-selection logic.
        if (!(this.getItemSelectionStore().getState().selectedItems.length === 1 &&
            this.getItemSelectionStore().getState().selectedItems[0].data.getKey() === this.props.item.getKey())) {
            this.getItemSelectorActions().multiSelectItem.invoke({ data: this.props.item, canParticipateInMultiSelect: this.props.canParticipateInMultiSelect || false });
        }
    }

    private _keyDownHandler = (eventObject: JQueryEventObject) => {
        switch (eventObject.keyCode) {
            case KeyCode.CONTROL:
                if (!this.getItemSelectionStore().getKeyDownState(CNTRL_KEY)) {
                    this.getItemSelectorActions().updateKeyDownState.invoke({ key: CNTRL_KEY, state: eventObject.ctrlKey });
                }
                break;
            case KeyCode.SHIFT:
                if (!this.getItemSelectionStore().getKeyDownState(SHIFT_KEY)) {
                    this.getItemSelectorActions().updateKeyDownState.invoke({ key: SHIFT_KEY, state: eventObject.shiftKey });
                }
                break;
            default:
                break;
        }
    }

    private _keyUpHandler = (eventObject: JQueryEventObject) => {
        this._validateAndFixKeyboardCache(eventObject.ctrlKey, eventObject.shiftKey);
        switch (eventObject.keyCode) {
            case KeyCode.CONTROL:
                if (this.getItemSelectionStore().getKeyDownState(CNTRL_KEY)) {
                    this._updateKeyDownState(CNTRL_KEY, eventObject.ctrlKey);
                }
                break;
            case KeyCode.SHIFT:
                if (this.getItemSelectionStore().getKeyDownState(SHIFT_KEY)) {
                    this._updateKeyDownState(SHIFT_KEY, eventObject.shiftKey);
                }
                break;
        }
    }

    private _updateKeyDownState(key: string, state: boolean) {
        this.getItemSelectorActions().updateKeyDownState.invoke({ key: key, state: state });
    }

    // This is required because in certain scenarios like control+T, control+D etc, we don't get the key up event
    // which leaves our keyboard state cache in invalid state.
    private _validateAndFixKeyboardCache(ctrlKeyPressed: boolean, shiftKeyPressed: boolean): void {

        const shiftKeyState: boolean = this.getItemSelectionStore().getKeyDownState(SHIFT_KEY);
        const ctrlKeyState: boolean = this.getItemSelectionStore().getKeyDownState(CNTRL_KEY);

        if (ctrlKeyPressed !== ctrlKeyState) {
            this._updateKeyDownState(CNTRL_KEY, ctrlKeyPressed);
        }

        if (shiftKeyPressed !== shiftKeyState) {
            this._updateKeyDownState(SHIFT_KEY, shiftKeyPressed);
        }
    }

    private _element: HTMLElement;
    private _contextMenuItems: IContextualMenuItem[] = [];
}
