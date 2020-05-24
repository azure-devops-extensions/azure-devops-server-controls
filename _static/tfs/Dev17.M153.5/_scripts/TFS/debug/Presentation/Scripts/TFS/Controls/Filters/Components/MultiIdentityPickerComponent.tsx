import * as React from "react";

import * as Controls from "VSS/Controls";
import * as Identities_Picker_Controls from "VSS/Identities/Picker/Controls";
import { IEntity } from "VSS/Identities/Picker/RestClient";
import * as Identities_Picker_Services from "VSS/Identities/Picker/Services";
import { delegate } from "VSS/Utils/Core";
import * as Utils_String from "VSS/Utils/String";

import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { IdentityHelper } from "Presentation/Scripts/TFS/TFS.OM.Identities";

import { IFilterComponentProps } from "Presentation/Scripts/TFS/Controls/Filters/Components/IFilterComponent";

import "VSS/LoaderPlugins/Css!fabric";
import "VSS/LoaderPlugins/Css!Presentation/Controls/Filters/Components/IdentityPickerBaseComponent";

export interface MultiIdentityPickerBaseComponentProps extends IFilterComponentProps {
    consumerId: string;
    identityPickerSearchControlClass: string;
    identityPickerSearchControlId: string;
}

export interface MultiIdentityPickerComponentProps extends MultiIdentityPickerBaseComponentProps {
    placeholderText: string;
    callbacks?: Identities_Picker_Controls.ISearchControlCallbackOptions;
}

const multipleIdentitiesSeperator = "*";

export abstract class MultiIdentityPickerBaseComponent<TProps extends MultiIdentityPickerBaseComponentProps, TState> extends React.Component<TProps, TState> {

    private _identityPickerSearchControl: Identities_Picker_Controls.IdentityPickerSearchControl;
    private _identityPickerSearchControlClass = this.props.identityPickerSearchControlClass;
    private _$identityPickerControlContainer: JQuery;
    private _$input: JQuery;

    private get _fixedIdentityPickerSearchOptions(): Identities_Picker_Controls.IIdentityPickerSearchOptions {
        return {
            highlightResolved: true,
            consumerId: this.props.consumerId
        };
    }

    public render(): JSX.Element {
        return (
            <div className="multi-identity-picker-filter-container identity-picker-filter-container">
                <div
                    className={this._identityPickerSearchControlClass + " identity-picker-control-container identity-picker bowtie"}
                    ref={this._identityRefCallback} >
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
            this._identityPickerSearchControl.setEntities([], this.getInitialIdentities(this.props.filterValue));
        }
    }

    public componentWillUnmount(): void {
        if (this._identityPickerSearchControl) {
            if (!!this._$input) {
                this._$input.unbind();
                this._$input = null;
            }
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
            this._identityPickerSearchControl.setEntities([], this.getInitialIdentities(this.props.filterValue));
        } else {
            this._identityPickerSearchControl.clear();
        }
    }

    public getIdentityPickerSearchControl(): Identities_Picker_Controls.IdentityPickerSearchControl {
        return this._identityPickerSearchControl;
    }

    protected abstract onIdentityPickerSelectionChange(entity: IEntity, removeEntity?: boolean): void;

    protected abstract getInitialIdentities(fullName: string): string[];

    protected abstract getAdditionalSearchOptions(): Identities_Picker_Controls.IIdentityPickerSearchOptions;

    private _createIdentityPickerSearchControl(): Identities_Picker_Controls.IdentityPickerSearchControl {

        const options: Identities_Picker_Controls.IIdentityPickerSearchOptions = $.extend(this.getAdditionalSearchOptions(), this._fixedIdentityPickerSearchOptions);

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

    private _identityRefCallback = (ref: HTMLElement) => { this._$identityPickerControlContainer = $(ref); };

    private _onInputBlurHandler(): void {
        this._$identityPickerControlContainer.removeClass("focus");
        if (this._identityPickerSearchControl.isDropdownVisible()) {
            this._identityPickerSearchControl.showMruDropdown();
        }
    }

}

export class MultiIdentityPickerComponent extends MultiIdentityPickerBaseComponent<MultiIdentityPickerComponentProps, {}> {

    protected getAdditionalSearchOptions(): Identities_Picker_Controls.IIdentityPickerSearchOptions {
        const identityType: Identities_Picker_Services.IEntityType = {
            User: true,
        };

        const operationScope: Identities_Picker_Services.IOperationScope = {
            Source: true,
            IMS: true,
        };
        return {
            showMruTriangle: true,
            operationScope: operationScope,
            identityType: identityType,
            consumerId: this.props.consumerId,
            showContactCard: true,
            pageSize: 10,
            placeholderText: this.props.placeholderText,
            size: Identities_Picker_Controls.IdentityPickerControlSize.Medium,
            callbacks: this.props.callbacks || {},
            watermark: null,
            multiIdentitySearch: true,
        } as Identities_Picker_Controls.IIdentityPickerSearchOptions;
    }

    protected getInitialIdentities(fullName: string): string[] {
        return fullName.split(multipleIdentitiesSeperator);
    }

    protected onIdentityPickerSelectionChange(entity: IEntity): void {
        if (entity) {
            this.getIdentityPickerSearchControl().addIdentitiesToMru([entity]);
        }
        const filterValue = this.getIdentityPickerSearchControl().getIdentitySearchResult().resolvedEntities.map(value => value.localId).join(multipleIdentitiesSeperator);
        this.props.onUserInput(this.props.filterKey, filterValue);
    }
}

