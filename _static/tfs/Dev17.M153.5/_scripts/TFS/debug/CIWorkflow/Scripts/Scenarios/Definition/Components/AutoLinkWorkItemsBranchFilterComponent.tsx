/// <reference types="react" />

import * as React from "react";

import { RepositoryTypes } from "Build.Common/Scripts/Generated/TFS.Build2.Common";

import * as Resources from "CIWorkflow/Scripts/Resources/TFS.Resources.CIWorkflow";
import { FilterType, FilterOption } from "CIWorkflow/Scripts/Scenarios/Definition/Common";
import { SourceProvider } from "CIWorkflow/Scripts/Scenarios/Definition/SourceProvider";
import { FiltersComponent } from "CIWorkflow/Scripts/Scenarios/Definition/Components/Filters";
import { SourcesSelectionStore } from "CIWorkflow/Scripts/Scenarios/Definition/Stores/SourcesSelectionStore";

import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { ErrorComponent } from "DistributedTaskControls/SharedControls/ErrorComponent/ErrorComponent";

import { IDropdownOption } from "OfficeFabric/components/Dropdown/Dropdown.types";

import { BuildRepository, SupportLevel } from "TFS/Build/Contracts";

import * as Utils_String from "VSS/Utils/String";

export interface IProps {
    /** Stringified branch filters */
    branchFilters: string;

    /** Label to be displayed above branch filters control */
    label: string;

    /** Default branch name */
    defaultBranch: string;

    /** Callback - invoked on filter change */
    onChange: (branchFilters: string) => void;

    /** Whether the control is disabled */
    disabled?: boolean;
}

export class AutoLinkWorkItemsBranchFilterComponent extends React.Component<IProps, {}> {
    private readonly _includeBranchPrefix: string = "+";
    private readonly _excludeBranchPrefix: string = "-";

    private _sourcesSelectionStore: SourcesSelectionStore = null;
    private _branchFilters: string[] = [];
    private _repository: BuildRepository = null;
    private _isBranchFilterSupportedForAutoLinking: boolean = false;
    private _defaultBranch: string = Utils_String.empty;

    public render(): JSX.Element {
        return (
            this._isBranchFilterSupportedForAutoLinking ?
                <div>
                    <FiltersComponent
                        repository={this._repository}
                        repositoryType={this._repository.type || Utils_String.empty}
                        isFilterRequired={true}
                        onFilterOptionChange={this._onFilterOptionChange}
                        filterType={FilterType.BranchFilter}
                        filters={this._branchFilters && this._branchFilters.length ? this._branchFilters : []}
                        onFilterChange={this._onFilterChange}
                        onFilterDelete={this._onFilterDelete}
                        onAddFilterClick={this._onAddFilterClick}
                        gitBranches={this._sourcesSelectionStore.getBranches()}
                        filterHeader={Resources.AutoBuildLinkingBranchControlHeader}
                        isReadOnly={!!this.props.disabled}
                    />
                    {
                        this._branchFilters && this._branchFilters.length ? null :
                            <ErrorComponent errorMessage={Resources.AddBranchFilterError} />
                    }
                </div> : null
        );
    }

    /**
     * Override
     */
    public componentWillMount() {
        // get repository from the store
        this._sourcesSelectionStore = StoreManager.GetStore<SourcesSelectionStore>(SourcesSelectionStore);
        this._repository = this._sourcesSelectionStore.getBuildRepository();

        // branch filter control is only supported for tfsgit currently
        const provider: SourceProvider = this._sourcesSelectionStore.getSelectedSourceProvider();
        const providerSupported: boolean = provider && provider.getBranchFilterSupportLevel() !== SupportLevel.Unsupported;
        // TODO: this should be factored out as a property of SourceProvider
        this._isBranchFilterSupportedForAutoLinking = providerSupported && Utils_String.equals(this._repository.type, RepositoryTypes.TfsGit, true);

        // get branch filters and default branch
        this._defaultBranch = this._parseBranchFilters(this.props.defaultBranch)[0] || Utils_String.empty;
        this._branchFilters = this._parseBranchFilters(this.props.branchFilters);
    }

    /**
     * Override
     * @param nextProps
     */
    public componentWillReceiveProps(nextProps: IProps) {
        this._branchFilters = this._parseBranchFilters(nextProps.branchFilters);
    }

    /**
     * Get branch filters from stringified value
     * @param stringifiedVal
     */
    private _parseBranchFilters(stringifiedVal: string): string[] {
        const strArray = (stringifiedVal ? JSON.parse(stringifiedVal) : []) as string[];
        return strArray.filter(s => !!s);
    }

    /**
     * Stringify filters and invoke the change event
     * @param filters
     */
    private _invokeFilterChange(filters: string[]) {
        if (filters.length === 0) {
            this.props.onChange(null);
        }
        else {
            this.props.onChange(JSON.stringify(filters.filter(f => !!f)));
        }
    }

    private _onFilterOptionChange = (option: IDropdownOption, optionIndex: number, rowIndex: number): void => {
        const branch = this._branchFilters[rowIndex].substr(1);
        if (option.key === FilterOption.Include) {
            this._branchFilters[rowIndex] = `${this._includeBranchPrefix}${branch}`;
        }
        else if (option.key === FilterOption.Exclude) {
            this._branchFilters[rowIndex] = `${this._excludeBranchPrefix}${branch}`;
        }
        this._invokeFilterChange(this._branchFilters);
    }

    private _onFilterChange = (branch: string, rowIndex: number): void => {
        const optionPrefix = Utils_String.equals(this._branchFilters[rowIndex].charAt(0), this._includeBranchPrefix, true) ?
            this._includeBranchPrefix : this._excludeBranchPrefix;

        this._branchFilters[rowIndex] = `${optionPrefix}${branch}`;
        this._invokeFilterChange(this._branchFilters);
    }

    private _onFilterDelete = (rowIndex: number): void => {
        this._branchFilters.splice(rowIndex, 1);
        this._invokeFilterChange(this._branchFilters);
    }

    private _onAddFilterClick = (event: React.MouseEvent<HTMLButtonElement>): void => {
        this._invokeFilterChange(this._branchFilters.concat([this._defaultBranch]));
    }
}