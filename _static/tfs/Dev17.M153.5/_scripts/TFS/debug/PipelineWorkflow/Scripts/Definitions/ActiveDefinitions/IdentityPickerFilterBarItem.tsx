import * as React from "react";

import { css } from "OfficeFabric/Utilities";

import * as Controls from "VSS/Controls";
import * as VSSContext from "VSS/Context";
import {registerLWPComponent} from "VSS/LWP";
import * as Identities_Picker_Controls from "VSS/Identities/Picker/Controls";
import * as Identities_Picker_Services from "VSS/Identities/Picker/Services";
import { IEntity } from "VSS/Identities/Picker/RestClient";

import { FILTER_RESET_EVENT } from "VSSUI/Utilities/Filter";
import { FilterBarItem, IFilterBarItemState, IFilterBarItemProps } from "VSSUI/FilterBarItem";

import "VSS/LoaderPlugins/Css!RM:PipelineWorkflow/Scripts/Definitions/ActiveDefinitions/ActiveReleasesFilterBar";

export interface IIdentityPickerFilterBarItemProps extends IFilterBarItemProps {
    consumerId: string;
    identityPickerSearchControlClass: string;
    identityPickerSearchControlId: string;
    placeholderText: string;
    ariaLabel: string;
}

export interface IIdentityPickerFilterBarItemState extends IFilterBarItemState<IEntity> {
    focused: boolean;
}

export class IdentityPickerFilterBarItem extends FilterBarItem<IEntity, IIdentityPickerFilterBarItemProps, IIdentityPickerFilterBarItemState> {
    public render(): JSX.Element {
        const selectedKey = (this.state.value) || "";
        let className: string = css("identity-picker-filter-bar-item", this.props.identityPickerSearchControlClass);
        if (this.state.focused) {
            className = css(className, "focus");
        }
        return (
            <div
                onFocus={this._onFocus}
                onBlur={this._onBlur}
                ref={this._identityPickerControlContainer}
                className={className}>
            </div>
        );
    }

    public focus(): void {
        if (this._identityPickerControlContainer.current) {
            this._identityPickerControlContainer.current.focus();
        }
    }

    public componentDidMount(): void {
        this._identityPickerSearchControl = this._createIdentityPickerSearchControl();

        const dropDown = this._identityPickerSearchControl.getElement().find("." + Identities_Picker_Controls.IdentityPickerSearchControl.SEARCH_MRU_TRIANGLE_CLASS);
        // to make the drop icon consistent with other icons in the page
        dropDown.removeClass("bowtie-triangle-down");
        dropDown.addClass("bowtie-chevron-down-light");

		if (this.props.filter) {
            this.props.filter.subscribe(this._onFilterClear, FILTER_RESET_EVENT);
        }
    }

    public componentWillUnmount(): void {
        if (this._identityPickerSearchControl) {

            const element = this._identityPickerSearchControl.getElement();
            if (element && typeof element.unbind === "function") {
                element.unbind();
            }

            this._identityPickerSearchControl.dispose();
            this._identityPickerSearchControl = null;
            this._identityPickerControlContainer = null;
        }

		if (this.props.filter) {
            this.props.filter.unsubscribe(this._onFilterClear, FILTER_RESET_EVENT);
        }
    }

    private _getAdditionalSearchOptions(): Identities_Picker_Controls.IIdentityPickerSearchOptions {
        const identityType: Identities_Picker_Services.IEntityType = {
            User: true,
        };

        const operationScope: Identities_Picker_Services.IOperationScope = {
            Source: true,
            IMS: true
        };

        const context = VSSContext.getDefaultWebContext();

        return {
            showMruTriangle: true,
            operationScope,
            identityType,
            consumerId: this.props.consumerId,
            showContactCard: false,
            pageSize: 10,
            loadOnCreate: true,
            size: Identities_Picker_Controls.IdentityPickerControlSize.Medium,
            placeholderText: this.props.placeholderText,
            ariaLabel: this.props.ariaLabel,
            callbacks: {
                preDropdownRender: (entityList: IEntity[]) => {
                    // Always show the current user in the dropdown
                    let currentUserEntity: IEntity = null;
                    const filteredEntityList: IEntity[] = [];
                    const searchInput = this._identityPickerSearchControl.getDropdownPrefix();
                    if (!searchInput) {
                        currentUserEntity = Identities_Picker_Controls.EntityFactory.createStringEntity(context.user.name);

                        currentUserEntity.displayName = context.user.name;
                        currentUserEntity.signInAddress = context.user.email;
                        currentUserEntity.localId = context.user.id;

                        filteredEntityList.push(currentUserEntity);
                    }

                    entityList.forEach((entity: IEntity, index: number) => {
                        if (entity.localId && (!currentUserEntity || entity.localId !== currentUserEntity.localId)) {
                            filteredEntityList.push(entity);
                        }
                    });

                    return filteredEntityList;
                }
            }
        };
    }

    private _createIdentityPickerSearchControl(): Identities_Picker_Controls.IdentityPickerSearchControl {

        const additionalOptions: Identities_Picker_Controls.IIdentityPickerSearchOptions = this._getAdditionalSearchOptions();

        let options: Identities_Picker_Controls.IIdentityPickerSearchOptions =
            {
                ...additionalOptions,
                elementId: this.props.identityPickerSearchControlId,
                callbacks: {
                    ...additionalOptions.callbacks,
                    onItemSelect: (item: IEntity) => this._onSelectionChanged(item),
                    onInputBlur: () => this._onInputBlurHandler()
                }
            };

        this._identityPickerSearchControl = Controls.BaseControl.createIn(
            Identities_Picker_Controls.IdentityPickerSearchControl,
            this._identityPickerControlContainer.current,
            options
        ) as Identities_Picker_Controls.IdentityPickerSearchControl;

        // when the selected identity is cleared, we need to clear the filter
        this._identityPickerSearchControl._bind(Identities_Picker_Controls.IdentityPickerSearchControl.RESOLVED_INPUT_REMOVED_EVENT, (e: Event, removedbyClose: boolean) => {
            if (removedbyClose) {
                this._onSelectionChanged(null);
            }
        });

        this._identityPickerSearchControl.getElement()[0].addEventListener("click", () => {
            // Open dropdown on clicking input, when input is empty
            // searchControl automatically opens it for non-empty input.
            let wasDropDownVisible = this._identityPickerSearchControl.isDropdownVisible();
            if (!wasDropDownVisible) {
                this._identityPickerSearchControl.showMruDropdown();
            }
        }, false);

        return this._identityPickerSearchControl;
    }

    private _onSelectionChanged(entity: IEntity): void {
        this.setFilterValue({ value: entity });
    }

    private _onInputBlurHandler(): void {
        if (this._identityPickerSearchControl.isDropdownVisible()) {
            this._identityPickerSearchControl.showMruDropdown();
        }
    }

    private _onFilterClear = () => {
        if (this._identityPickerSearchControl) {
            this._identityPickerSearchControl.clear();
        }
    }

    private _onFocus = () => {
        this.setState({ focused: true });
    }

    private _onBlur = () => {
        this.setState({ focused: false });
    }


    private _identityPickerSearchControl: Identities_Picker_Controls.IdentityPickerSearchControl;
    private _identityPickerSearchControlClass = this.props.identityPickerSearchControlClass;
    private _identityPickerControlContainer = React.createRef<HTMLDivElement>();
}

registerLWPComponent("identitypicker-filter-item", IdentityPickerFilterBarItem);
