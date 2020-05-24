/// <reference types="react" />
import * as React from "react";

import "VSS/LoaderPlugins/Css!DistributedTaskControls/Components/FilterListComponent";
import "VSS/LoaderPlugins/Css!DistributedTaskControls/Styles/FabricStyleOverrides";

import * as Base from "DistributedTaskControls/Common/Components/Base";
import * as Resources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";
import { CommandButton, DefaultButton, IButton } from "OfficeFabric/Button";
import { css } from "OfficeFabric/Utilities";
import * as Utils_Core from "VSS/Utils/Core";
import * as Utils_String from "VSS/Utils/String";

export interface IFiltersProps extends Base.IProps {
    filters: JSX.Element[];
    onFilterDelete: (rowIndex: number) => void;
    onAddFilterClick: (event?: React.MouseEvent<HTMLButtonElement>) => void;
    filterHeader?: JSX.Element;
    addButtonAriaLabel?: string;
    addButtonAriaDescription?: string;
    deleteButtonAriaLabel?: string;
    deleteButtonAriaDescription?: string;
}

export class FilterListComponent extends Base.Component<IFiltersProps, Base.IStateless> {
    private _addNewFilter: IButton;
    private _shouldFocusOnCell: boolean = false;
    private _focusedRow: number = -1;

    public render(): JSX.Element {
        const isAddNewFilterFocused: boolean = (!this.props.filters || this.props.filters.length === 0) ? true : false;

        const deleteButtonComponent = (index: number, onFilterDelete: (index: number, event?: React.MouseEvent<HTMLButtonElement>) => void) => {
            const deleteButtonOnClick = (event?: React.MouseEvent<HTMLButtonElement>) => {
                onFilterDelete(index, event);
            };

            return <CommandButton
                ariaDescription={this.props.deleteButtonAriaDescription}
                ariaLabel={this.props.deleteButtonAriaLabel}
                className={css("fabric-style-overrides", "delete-button", "bowtie-icon", "bowtie-trash", "filter-row-button")}
                onClick={deleteButtonOnClick}>
            </CommandButton>;
        };

        return (
            <div className="dt-filter-list-component">
                <div className="dt-filter-list-header">
                    <div className="dt-filter-row">
                        {
                            this.props.filters && this.props.filters.length !== 0 && (this.props.filterHeader)
                        }
                    </div>
                    <div className="empty-spacer"></div>
                </div>
                {
                    this.props.filters.map((filter: JSX.Element, index: number) => {
                        return (
                            <div className="dt-filter-list-row" key={index}>
                                <div className="dt-filter-row">
                                    {filter}
                                </div>
                                <div className="dt-filter-delete-button">
                                    {deleteButtonComponent(index, this._onRemoveFilterClick)}
                                </div>
                            </div>
                        );
                    })
                }
                {this._getAddNewFilterButton(isAddNewFilterFocused)}
            </div>
        );
    }

    private _getAddNewFilterButton(focusButton: boolean): JSX.Element {
        const addNewFilterComponent: JSX.Element = (
            <DefaultButton
                componentRef={(ref: IButton) => this._addNewFilter = ref}
                iconProps={{ iconName: "Add" }}
                ariaDescription={this.props.addButtonAriaDescription}
                className="dt-filter-add-button"
                onClick={this._onAddFilterClick}
                ariaLabel={this.props.addButtonAriaLabel}>
                {Resources.Add}
            </DefaultButton>);

        if (focusButton) {
            if (this._addNewFilter) {
                Utils_Core.delay(this, 10, () => { this._addNewFilter.focus(); });
            }
        }

        this._shouldFocusOnCell = false;

        return addNewFilterComponent;
    }

    private _onAddFilterClick = (event?: React.MouseEvent<HTMLButtonElement>): void => {
        this._shouldFocusOnCell = true;
        this._focusedRow = this.props.filters ? this.props.filters.length : 0;
        this.props.onAddFilterClick(event);
    }

    private _onRemoveFilterClick = (index, event?: React.MouseEvent<HTMLButtonElement>): void => {
        this._shouldFocusOnCell = true;
        const lastIndex: number = this.props.filters ? this.props.filters.length - 1 : 0;
        if (index !== lastIndex) {
            // Set focus on the next filter row
            this._focusedRow = index;
        } else {
            // Set focus on Add button if the last filter is deleted
            if (this._addNewFilter) {
                Utils_Core.delay(this, 10, () => { this._addNewFilter.focus(); });
            }

            this._focusedRow = -1;
        }

        this.props.onFilterDelete(index);
    }
}
