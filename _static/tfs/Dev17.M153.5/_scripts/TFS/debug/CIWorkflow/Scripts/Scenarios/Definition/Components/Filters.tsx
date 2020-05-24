/// <reference types="react" />

import * as React from "react";

import * as Resources from "CIWorkflow/Scripts/Resources/TFS.Resources.CIWorkflow";
import { SourceProvider, SourceProviderUtils } from "CIWorkflow/Scripts/Scenarios/Definition/SourceProvider";
import { FilterType, FilterOption } from "CIWorkflow/Scripts/Scenarios/Definition/Common";
import { ScmComponentProvider } from "CIWorkflow/Scripts/Scenarios/Definition/Components/SourceProviders/ScmComponentProvider";

import { ISelectedPathNode } from "DistributedTasksCommon/TFS.Tasks.Types";

import * as Base from "DistributedTaskControls/Common/Components/Base";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { DropDownInputControl, IDropDownItem } from "DistributedTaskControls/SharedControls/InputControls/Components/DropDownInputComponent";
import { StringInputComponent } from "DistributedTaskControls/SharedControls/InputControls/Components/StringInputComponent";

import { IButton } from "OfficeFabric/Button";
import { CommandButton } from "OfficeFabric/components/Button/CommandButton/CommandButton";
import { IDropdownOption } from "OfficeFabric/components/Dropdown/Dropdown.types";
import { css, getId } from "OfficeFabric/Utilities";

import { BuildRepository } from "TFS/Build/Contracts";

import * as Diag from "VSS/Diag";
import * as Utils_String from "VSS/Utils/String";

import "VSS/LoaderPlugins/Css!CIWorkflow/Scripts/Scenarios/Definition/Components/Filters";
import "VSS/LoaderPlugins/Css!DistributedTaskControls/Styles/FabricStyleOverrides";

export interface IFiltersProps {
    isReadOnly?: boolean;
    filters: string[];
    filterType: FilterType;
    onFilterOptionChange: (option: IDropdownOption, optionIndex: number, rowIndex: number) => void;
    onFilterChange: (filterValue: string, rowIndex: number) => void;
    onFilterDelete: (rowIndex) => void;
    onAddFilterClick: (event?: React.MouseEvent<HTMLButtonElement>) => void;
    repository?: BuildRepository;
    repositoryType?: string;
    gitBranches?: string[];
    isFilterRequired?: boolean;

    // Optional: header to be shown above filter control
    filterHeader?: string;
    showPathDialog?: (initialValue: string, callback: (selectedValue: ISelectedPathNode) => void) => void;
}

interface IFilterProps {
    isReadOnly?: boolean;
    filterType: FilterType;
    selectedFilterOption: FilterOption;
    filter: string;
    index: number;
    ariaLabelledBy: string;
    onFilterOptionChange: (dropdownOption: IDropDownItem) => void;
    onFilterChange: (value: string) => void;
    onFilterDelete: () => void;
    repositoryType?: string;
    repository?: BuildRepository;
    gitBranches?: string[];
    focusOnElement?: boolean;
    showPathDialog?: (initialValue: string, callback: (selectedValue: ISelectedPathNode) => void) => void;
}

class FiltersUtils {

    public static GetTypeColumnHeader(): string {
        return Resources.TypeText;
    }

    public static GetSpecificationColumnHeader(isBranchFilter: boolean = false): string {
        return (isBranchFilter ? Resources.BranchSpecificationText : Resources.PathSpecificationText);
    }

}

class FilterComponent extends React.Component<IFilterProps, Base.IStateless> {
    private _dropdown: DropDownInputControl;
    
    public render(): JSX.Element {
        let displayFilter: JSX.Element;
        let deleteDescription: string;

        switch (this.props.filterType) {
            case FilterType.BranchFilter:
                displayFilter = this._getBranchFilter();
                deleteDescription = Resources.DeleteFilterDescription;
                break;
            case FilterType.PathFilter:
                displayFilter = this._getPathFilter();
                deleteDescription = Resources.DeletePathFilterDescription;
                break;
        }

        return (
            <div className="filter-row">
                <div className="fabric-style-overrides filter-dropdown">
                    <DropDownInputControl
                        label={Utils_String.empty}
                        options={
                            [
                                { key: FilterOption.Include, text: Resources.IncludeText },
                                { key: FilterOption.Exclude, text: Resources.ExcludeText },
                            ]
                        }
                        onValueChanged={this.props.onFilterOptionChange}
                        ref={(dropdown) => {
                            this._dropdown = dropdown;
                        }}
                        selectedKey={this.props.selectedFilterOption}
                        ariaLabel={FiltersUtils.GetTypeColumnHeader()}
                        disabled={!!this.props.isReadOnly} />
                </div>

                {displayFilter}

                <div className="filter-delete-button">
                    <CommandButton
                        ariaDescription={deleteDescription}
                        ariaLabel={Resources.DeleteRowButtonAreaLabel}
                        className={css("fabric-style-overrides", "delete-button", "bowtie-icon", "bowtie-trash", "filter-row-button")}
                        onClick={this.props.onFilterDelete}
                        disabled={!!this.props.isReadOnly}>
                    </CommandButton>
                </div>
            </div>
        );
    }

    public componentDidMount() {
        if (this.props.focusOnElement) {
            this._dropdown.setFocus();
        }
    }

    public componentDidUpdate() {
        if (this.props && this.props.focusOnElement) {
            this._dropdown.setFocus();
        }
    }

    private _getBranchFilter(): JSX.Element {
        if (!this.props.repository) {
            Diag.logError("Repository not defined for Branch Filters");
            return this._getDefaultFilter(true);
        }

        const componentProvider: ScmComponentProvider = SourceProviderUtils.getComponentProvider(this.props.repository.type);

        return componentProvider && componentProvider.getBranchFilter(
            this.props.repository,
            this.props.filter.substring(1),
            this.props.onFilterChange,
            true,
            this.props.gitBranches,
            this.props.ariaLabelledBy,
            this.props.isReadOnly
        );
    }

    private _getPathFilter(): JSX.Element {
        if (!this.props.repository) {
            Diag.logError("Repository not defined for Path Filters");
            return this._getDefaultFilter();
        }

        const rootFolder: string = this.props.repository ? this.props.repository.rootFolder : Utils_String.empty;
        const componentProvider: ScmComponentProvider = SourceProviderUtils.getComponentProvider(this.props.repository.type);

        return componentProvider && componentProvider.getPathFilter(
            this.props.repository,
            "filter-selector-" + this.props.index,
            this.props.filter.substring(1),
            this.props.onFilterChange,
            this.props.showPathDialog,
            rootFolder,
            this.props.isReadOnly
        );
    }

    private _getDefaultFilter(isBranchFilter: boolean = false): JSX.Element {
        return (
            <div className="filter-selector">
                <StringInputComponent
                    value={this.props.filter.substring(1)}
                    onValueChanged={this.props.onFilterChange}
                    ariaLabel={FiltersUtils.GetSpecificationColumnHeader(isBranchFilter)}
                    disabled={this.props.isReadOnly}
                />
            </div>
        );
    }
}

export class FiltersComponent extends React.Component<IFiltersProps, Base.IStateless> {
    private _addNewBranchFilter: IButton;
    private _addNewPathFilter: IButton;
    private _shouldFocusOnCell: boolean = false;
    private _focusedRow: number = -1;
    private readonly _filterSelectorId = getId("filter-selector");

    public render(): JSX.Element {
        let isBranchFilter: boolean = this.props.filterType === FilterType.BranchFilter;
        let isAddNewFilterFocused: boolean = (!this.props.filters || this.props.filters.length === 0) ? true : false;
        return (
            <div className="ci-branch-path-filter">

                <div className="filter-header">
                    {this.props.filterHeader || (isBranchFilter ? Resources.BranchFilters : Resources.PathFilters)}
                </div>

                {
                    !!this.props.filters.length && (
                        <div className="filter-header-row">
                            <div className="fabric-style-overrides filter-dropdown">
                                {FiltersUtils.GetTypeColumnHeader()}
                            </div>

                            <div className="filter-selector" id={this._filterSelectorId}>
                                {FiltersUtils.GetSpecificationColumnHeader(isBranchFilter)}
                            </div>
                        </div>
                    )
                }

                {
                    this.props.filters.map((filter: string, index: number) => {
                        return (
                            <FilterComponent
                                key={index}
                                selectedFilterOption={filter.charAt(0) === "+" ? FilterOption.Include : FilterOption.Exclude}
                                filterType={this.props.filterType}
                                filter={filter}
                                index={index}
                                ariaLabelledBy={this._filterSelectorId}
                                onFilterOptionChange={(dropdownOption: IDropDownItem) => { this.props.onFilterOptionChange(dropdownOption.option, dropdownOption.index, index); }}
                                onFilterChange={(value: string) => { this.props.onFilterChange(value, index); }}
                                onFilterDelete={() => { this._onRemoveFilterClick(index); }}
                                repositoryType={this.props.repositoryType}
                                repository={this.props.repository}
                                gitBranches={this.props.gitBranches}
                                focusOnElement={index === this._focusedRow && this._shouldFocusOnCell}
                                showPathDialog={this.props.showPathDialog}
                                isReadOnly={this.props.isReadOnly} />
                        );
                    })
                }
                {this._getAddNewFilterButton(isBranchFilter, isAddNewFilterFocused)}
            </div>

        );
    }

    private _getAddNewFilterButton(isBranchFilter: boolean, focusButton: boolean): JSX.Element {
        let addNewFilterComponent: JSX.Element = (
            <CommandButton
                componentRef={(elem) => {
                    if (isBranchFilter) {
                        this._addNewBranchFilter = elem;
                    }
                    else {
                        this._addNewPathFilter = elem;
                    }
                }}
                iconProps={{ iconName: "Add" }}
                ariaDescription={isBranchFilter ? Resources.AddBranchFilterButtonDescription : Resources.AddPathFilterButtonDescription}
                className="fabric-style-overrides add-new-item-button filter-button"
                onClick={this._onAddFilterClick}
                ariaLabel={isBranchFilter ? Resources.ARIALabelAddBranchFilter : Resources.ARIALabelAddPathFilter}
                disabled={this.props.isReadOnly}>
                {Resources.Add}
            </CommandButton>);

        if (focusButton) {
            if (isBranchFilter && this._addNewBranchFilter) {
                this._addNewBranchFilter.focus();
            }
            else if (this._addNewPathFilter && this.props.isFilterRequired) {
                this._addNewPathFilter.focus();
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

    private _onRemoveFilterClick = (index: number): void => {
        this._shouldFocusOnCell = true;
        let lastIndex: number = this.props.filters ? this.props.filters.length - 1 : 0;
        if (index !== lastIndex) {
            // Set focus on the next filter row
            this._focusedRow = index;
        }
        else {
            // Set focus on Add button if the last filter is deleted
            if (this.props.filterType === FilterType.BranchFilter && this._addNewBranchFilter) {
                this._addNewBranchFilter.focus();
            }
            else if (this.props.filterType === FilterType.PathFilter && this._addNewPathFilter) {
                this._addNewPathFilter.focus();
            }

            this._focusedRow = -1;
        }
        this.props.onFilterDelete(index);
    }
}