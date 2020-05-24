/// <reference types="react" />
/// <reference types="react-dom" />

import * as React from "react";
import * as Controls from "VSS/Controls";
import { delegate } from "VSS/Utils/Core";
import * as Utils_String from "VSS/Utils/String";
import * as Identities_Picker_Controls from "VSS/Identities/Picker/Controls";
import { IEntity } from "VSS/Identities/Picker/RestClient";

import { IdentityHelper } from "Presentation/Scripts/TFS/TFS.OM.Identities";
import { IFilterComponentProps } from "Presentation/Scripts/TFS/Controls/Filters/Components/IFilterComponent";

import "VSS/LoaderPlugins/Css!fabric";
import "VSS/LoaderPlugins/Css!Presentation/Controls/Filters/Components/IdentityPickerBaseComponent";

export interface IdentityPickerBaseComponentProps extends IFilterComponentProps {
    consumerId: string;
    identityPickerSearchControlClass: string;
    identityPickerSearchControlId: string;
}

export abstract class IdentityPickerBaseComponent<TProps extends IdentityPickerBaseComponentProps, TState> extends React.Component<TProps, TState> {

    private _identityPickerSearchControl: Identities_Picker_Controls.IdentityPickerSearchControl;
    private _identityPickerSearchControlClass = this.props.identityPickerSearchControlClass;
    private _currentSelectedEntity: IEntity;
    private _$identityPickerControlContainer: JQuery;
    private _$input: JQuery;

    private get _fixedIdentityPickerSearchOptions(): Identities_Picker_Controls.IIdentityPickerSearchOptions {
        return {
            highlightResolved: true,
            consumerId: this.props.consumerId
        };
    }

    /**
     * TFS.OM.Identities.getDistinctDisplayName cannot be used when uniqueName is "" 
     * which we need for local identities like Administrator in TFS.
     */
    public static getDistinctDisplayName(displayName: string, uniqueName: string): string {
        if (!displayName && !uniqueName) {
            return "";
        }
        return Utils_String.format("{0} {1}{2}{3}", displayName,
            IdentityHelper.IDENTITY_UNIQUEFIEDNAME_SEPERATOR_START, uniqueName, IdentityHelper.IDENTITY_UNIQUEFIEDNAME_SEPERATOR_END);
    }

    protected abstract getInitialIdentity(fullName: string): IEntity;

    protected abstract getAdditionalSearchOptions(): Identities_Picker_Controls.IIdentityPickerSearchOptions;

    public render(): JSX.Element {
        return (
            <div className="identity-picker-filter-container">
                <div
                    className={this._identityPickerSearchControlClass + " identity-picker-control-container identity-picker bowtie"}
                    ref={(ref) => { this._$identityPickerControlContainer = $(ref); } } >
                </div>
            </div>
        );
    }

    public componentDidMount(): void {
        this._identityPickerSearchControl = this._createIdentityPickerSearchControl();

        const $dropDown = this._identityPickerSearchControl.getElement().find("." + Identities_Picker_Controls.IdentityPickerSearchControl.SEARCH_MRU_TRIANGLE_CLASS);
        // to make the drop icon consistent with other icons in the page
        $dropDown.removeClass("bowtie-triangle-down");
        $dropDown.addClass("bowtie-chevron-down-light");
        // if the initial filter value is provided set it on the control
        if (this.props.filterValue) {
            this._currentSelectedEntity = this.getInitialIdentity(this.props.filterValue);
            this._identityPickerSearchControl.setEntities([this._currentSelectedEntity], []);
        }
    }

    public componentWillUnmount(): void {
        if (this._identityPickerSearchControl) {
            this._$input.unbind();
            this._$input = null;

            const element = this._identityPickerSearchControl.getElement();
            if (element) {
                element.unbind();
            }

            this._identityPickerSearchControl.dispose();
            this._identityPickerSearchControl = null;
            this._$identityPickerControlContainer = null;
        }
    }

    public componentDidUpdate(): void {
        // after the component is updated check the new props and see if the filter needs to be updated or cleared
        if (this.props.filterValue) {
            this._currentSelectedEntity = this.getInitialIdentity(this.props.filterValue);
            this._identityPickerSearchControl.setEntities([this._currentSelectedEntity], []);
        } else {
            this._identityPickerSearchControl.clear();
            this._currentSelectedEntity = null;
        }
    }

    public getIdentityPickerSearchControl(): Identities_Picker_Controls.IdentityPickerSearchControl {
        return this._identityPickerSearchControl;
    }

    protected onIdentityPickerSelectionChange(entity: IEntity): void {
        this._currentSelectedEntity = entity;
    }

    protected _getDecodedFilterValue(displayName: string, identifierString: string): string {
        // htmlDecode is browser dependent and returns "null" for null input in IE/edge. Avoiding it.
        const displayNameDecoded = displayName ? Utils_String.htmlDecode(displayName) : displayName;
        const identifierStringDecoded = identifierString ? Utils_String.htmlDecode(identifierString) : identifierString;
        return IdentityPickerBaseComponent.getDistinctDisplayName(displayNameDecoded, identifierStringDecoded);
    }

    private _createIdentityPickerSearchControl(): Identities_Picker_Controls.IdentityPickerSearchControl {

        let options: Identities_Picker_Controls.IIdentityPickerSearchOptions = $.extend(this.getAdditionalSearchOptions(), this._fixedIdentityPickerSearchOptions);

        options.elementId = this.props.identityPickerSearchControlId;
        options.callbacks.onItemSelect = (item: IEntity) => {
            this.onIdentityPickerSelectionChange(item);
        };
        options.callbacks.onInputBlur = () => {
            this._onInputBlurHandler();
        };

        const identityPickerSearchControl = Controls.BaseControl.createIn(
            Identities_Picker_Controls.IdentityPickerSearchControl,
            this._$identityPickerControlContainer,
            options
        ) as Identities_Picker_Controls.IdentityPickerSearchControl;

        this._$identityPickerControlContainer.focus ( () => {
            this._$identityPickerControlContainer.addClass("focus");
        });

        this._$input = identityPickerSearchControl.getElement().find(`#${options.elementId}`).first();

        // Clear filters when text is cleared. Using keyup instead of input to overcome IE11 issues
        this._$input.on("keyup", () => {
            if (!this._$input.val()) {
                this.onIdentityPickerSelectionChange(null);
            }
        });

        // when the selected identity is cleared, we need to clear the filter
        identityPickerSearchControl._bind(Identities_Picker_Controls.IdentityPickerSearchControl.RESOLVED_INPUT_REMOVED_EVENT, (e: Event, removedbyClose: boolean) => {
            if (removedbyClose) {
                this.onIdentityPickerSelectionChange(null);
            }
        });

        identityPickerSearchControl.getElement().get(0).addEventListener("click", (e: JQueryEventObject) => {
            // Open dropdown on clicking input, when input is empty
            // searchControl automatically opens it for non-empty input.
            let wasDropDownVisible = this._identityPickerSearchControl.isDropdownVisible();
            if (!wasDropDownVisible && !this._$input.val()) {
                this._identityPickerSearchControl.showMruDropdown();
            }
        }, false);

        return identityPickerSearchControl;
    }

    private _onInputBlurHandler(): void {
        this._$identityPickerControlContainer.removeClass("focus");
        if (this._identityPickerSearchControl.isDropdownVisible()) {
            this._identityPickerSearchControl.showMruDropdown();
        }
    }

}
