/// <reference types="react" />

import * as React from "react";
import * as PresentationResources from "Presentation/Scripts/TFS/Resources/TFS.Resources.Presentation";
import "VSS/LoaderPlugins/Css!Presentation/Controls/Filters/FilterButton";

import { FilterState } from "Presentation/Scripts/TFS/Controls/Filters/IFilterPanel";

export interface FilterButtonProps {
    filterState: FilterState;
    filterApplied: () => void;
    filterCleared: () => void;
}

export class FilterButton extends React.Component<FilterButtonProps, {}> {

    public render(): JSX.Element {
        return (
            <button
                className={ this.stateToCssClassMap[this.props.filterState]}
                aria-label={ this.stateToCssClassMap[this.props.filterState]}
                onClick={() => { this.stateToActionMapping[this.props.filterState]() } }
                disabled={this.props.filterState === FilterState.FILTER_CLEARED} >

                <span> { this.stateToFilterButtonTextMap[this.props.filterState] } </span>
            </button>
        );
    }

    private stateToCssClassMap = {
        [FilterState.FILTER_SELECTED]: "filter-button",
        [FilterState.FILTER_APPLIED]: "filter-button",
        [FilterState.FILTER_CLEARED]: "filter-button disabled",
    };

    private stateToFilterButtonTextMap = {
        [FilterState.FILTER_SELECTED]: PresentationResources.FilterApplyFiltersButtonText,
        [FilterState.FILTER_APPLIED]: PresentationResources.FilterButtonClearFilters,
        [FilterState.FILTER_CLEARED]: PresentationResources.FilterApplyFiltersButtonText,
    };

    private stateToActionMapping = {
        [FilterState.FILTER_SELECTED]: this.props.filterApplied,
        [FilterState.FILTER_APPLIED]: this.props.filterCleared,
    };
}