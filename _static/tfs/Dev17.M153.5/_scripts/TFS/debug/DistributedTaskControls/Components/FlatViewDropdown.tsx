/// <reference types="react" />

import * as React from "react";

import * as Base from "DistributedTaskControls/Common/Components/Base";
import { ComboBoxInputComponent, ComboBoxType } from "DistributedTaskControls/SharedControls/InputControls/Components/ComboBoxInputComponent";

import { KeyCodes, css } from "OfficeFabric/Utilities";
import { Dropdown, IDropdownOption } from "OfficeFabric/Dropdown";

import { ComboListBehavior, Combo } from "VSS/Controls/Combos";

import * as Utils_String from "VSS/Utils/String";
import "VSS/LoaderPlugins/Css!DistributedTaskControls/Components/FlatViewDropdown";

const noUnderLine: string = "flat-view-table-dropdown-row";
const hoverUnderLine: string = "flat-view-table-dropdown-row-hover";
const errorUnderLine: string = "flat-view-table-dropdown-row-error";

export interface IFlatViewDropdownProps extends Base.IProps {
    conditions: string[];
    selectedCondition: string;
    rowSelected: boolean;
    onValueChanged: (newValue: string) => void;
    ariaLabel?: string;
    ariaDescription?: string;
    type?: ComboBoxType;
    enableFilter?: boolean;
    allowEdit?: boolean;
    hasErrors?: boolean;
    isDisabled?: boolean;
    maxAutoExpandDropWidth?: number;
    staticFlatViewDropdown?: boolean;
    disabledConditions?: string[];
}

// custom combo behavior to fix keyboard navigation issues b/w focuszone and combo
class FlatViewDropdownComboBehaviour extends ComboListBehavior {

    // [Up arrow] -> should only work when dropdown popup is open
    public upKey(e?: JQueryEventObject): any {

        if (e.altKey || this.isDropVisible()) {
            super.upKey(e);
        }
    }

    // [Down arrow] -> should only work when dropdown popup is open OR 
    // [Alt + Down arrow] -> open the dropdown popup
    public downKey(e?: JQueryEventObject): any {

        if (e.altKey || this.isDropVisible()) {
            super.downKey(e);
        }
    }

    // Special handling for enter and space to support dropdown toggle
    public keyDown(e?: JQueryEventObject): any {

        if (e.keyCode === KeyCodes.enter) {

            // support to close dropdown when enter key is pressed is already present
            // we are adding support open it via enter key
            if (!this.isDropVisible()) {
                this.showDropPopup();
                return false;
            }
        }
        else if (e.keyCode === KeyCodes.space) {

            // open/close dropdown popup with space
            this.toggleDropDown();
        }
    }

    public static Type = "dtc-flat-view-drop-down";
}

Combo.registerBehavior(FlatViewDropdownComboBehaviour.Type, FlatViewDropdownComboBehaviour);

export class FlatViewDropdown extends Base.Component<IFlatViewDropdownProps, Base.IStateless> {

    public render(): JSX.Element {
        this._underLineRow(this._element, this.props.rowSelected);

        let flatViewControl = !this.props.staticFlatViewDropdown ? this._getDefaultFlatViewDropdown() :
            this._getStaticFlatViewDropdown();

        return (
            <div
                className="flatview-dropdown-container"
                onKeyDown={this._onKeyDown}
                ref={(element) => { this._element = $(element); }}>

                {
                    flatViewControl
                }

            </div>);
    }

    public componentDidMount(): void {
        this._underLineRow(this._element, this.props.rowSelected);

        // We don't want focuszone to focus on drop chevron icon, setting this property will disable this focus behavior
        if (this._comboBoxInputComponent) {
            let dropButton = this._comboBoxInputComponent.getDropButton();
            dropButton.attr("data-is-visible", "false");
        }
    }

    public componentWillUnmount(): void {
        let parentElement: JQuery | null = (!!this._element) ? this._element.closest(".flat-view-table-cell") : null;
        parentElement.removeClass(noUnderLine);
        parentElement.removeClass(errorUnderLine);
        parentElement.removeClass(hoverUnderLine);
    }

    private _onChange = (newValue: string) => {
        this.props.onValueChanged(newValue);
    }

    private _getDefaultFlatViewDropdown(): JSX.Element {
        return (
            <ComboBoxInputComponent
                ref={this._resolveRef("_comboBoxInputComponent")}
                enabled={!this.props.isDisabled}
                value={this.props.selectedCondition}
                comboBoxType={this.props.type || ComboBoxType.Searchable}
                source={this.props.conditions}
                onValueChanged={this._onChange}
                enableFilter={this.props.enableFilter || false}
                allowEdit={this.props.allowEdit || false}
                hideErrorMessage={true}
                ariaDescription={this.props.ariaDescription}
                ariaLabel={this.props.ariaLabel}
                type={this._getType()}
                maxAutoExpandDropWidth={this.props.maxAutoExpandDropWidth}
            />
        );
    }

    private _getStaticFlatViewDropdown(): JSX.Element {
        const disabledCssStyle = this.props.isDisabled ? "flatview-dropdown-static-disabled" : Utils_String.empty;
        return (
            <Dropdown
                data-is-focusable={true}
                ref={this._resolveRef("_dropdown")}
                className={css("flatview-dropdown-static", disabledCssStyle)}
                ariaLabel={this.props.ariaLabel}
                options={this._getDropdownOptions()}
                selectedKey={this.props.selectedCondition}
                onKeyDown={this._onDropdownKeyDown}
                onChanged={this._onDropdownValChanged}
                aria-disabled={this.props.isDisabled}
                disabled={this.props.isDisabled}
                calloutProps={
                    {

                        className: "flatview-dropdown-static-callout-style"
                    }
                }
            />
        );
    }

    private _getDropdownOptions(): IDropdownOption[] {
        let options: IDropdownOption[] = [];

        if (this.props.conditions) {

            this.props.conditions.forEach((condition: string) => {

                let isDisabled = false;

                //  Checking if the disabledConditions[] contains any condition
                if (this.props.disabledConditions &&
                    this.props.disabledConditions.indexOf(condition) !== -1) {
                    isDisabled = true;
                }

                options.push({
                    key: condition,
                    text: condition,
                    disabled: isDisabled
                } as IDropdownOption);

            });
        }
        return options;
    }

    private _onDropdownValChanged = (option: IDropdownOption) => {
        this._onChange(option.key.toString());
    }

    private _underLineRow(element: JQuery, rowSelected: boolean): void {

        let parentElement: JQuery | null = (!!element) ? element.closest(".flat-view-table-cell") : null;

        if (!!parentElement) {
            let className: string = noUnderLine;

            if (this.props.hasErrors) {
                className = errorUnderLine;
            }
            else if (rowSelected) {
                className = hoverUnderLine;
            }

            parentElement.removeClass(noUnderLine);
            parentElement.removeClass(errorUnderLine);
            parentElement.removeClass(hoverUnderLine);
            parentElement.addClass(className);
        }
    }

    /**
     * Customizing on key down event, to remove the friction between dropdown and focuszone
     */
    private _onDropdownKeyDown = (ev: React.KeyboardEvent<HTMLElement>) => {
        if (this._dropdown) {
            if (ev.keyCode === KeyCodes.down || ev.keyCode === KeyCodes.up) {
                if (!ev.altKey) {
                    ev.preventDefault();
                }
            }
        }
    }

    private _onKeyDown = (ev: React.KeyboardEvent<HTMLElement>) => {

        if (this._comboBoxInputComponent) {

            let behavior = this._comboBoxInputComponent.getBehavior();

            // If dropdown is open, don't bubble up any keyboard events
            if (behavior.isDropVisible()) {
                ev.stopPropagation();
            }
        }
    }

    private _getType(): string {
        let type: string;

        // we don't want to set any type when it's not editable, combo takes care of applying the default behavior
        if (!this.props.allowEdit) {
            type = FlatViewDropdownComboBehaviour.Type;
        }

        return type;
    }

    private _element: JQuery;
    private _dropdown: Dropdown;
    private _comboBoxInputComponent: ComboBoxInputComponent;
}