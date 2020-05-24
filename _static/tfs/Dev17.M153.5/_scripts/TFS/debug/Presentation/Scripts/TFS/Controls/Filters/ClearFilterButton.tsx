/// <reference types="react" />

import * as React from "react";
import * as PresentationResources from "Presentation/Scripts/TFS/Resources/TFS.Resources.Presentation";
import "VSS/LoaderPlugins/Css!Presentation/Controls/Filters/ClearFilterButton";

import { FilterState } from "Presentation/Scripts/TFS/Controls/Filters/IFilterPanel";

export interface ClearFilterButtonProps {
    filterState: FilterState;
    filterCleared: () => void;
}

export class ClearFilterButton extends React.Component<ClearFilterButtonProps, {}> {

    public render(): JSX.Element {
        return (
            <span className="clear-button-container bowtie bowtie-fabric">
                <button
                    className={this.stateToCssClassMap[this.props.filterState]}
                    aria-label={PresentationResources.FilterClearFiltersTooltip}
                    onClick={() => {this.stateToActionMapping[this.props.filterState]();}}
                    aria-disabled={this.props.filterState === FilterState.FILTER_CLEARED} >
                </button>
            </span>
        );
    }

    private stateToCssClassMap = {
        [FilterState.FILTER_SELECTED]: "clear-filter-button bowtie-icon bowtie-clear-filter",
        [FilterState.FILTER_APPLIED]: "clear-filter-button bowtie-icon bowtie-clear-filter btn-cta",
        [FilterState.FILTER_CLEARED]: "clear-filter-button bowtie-icon bowtie-search-filter disabled",
    };

    private stateToActionMapping = {
        [FilterState.FILTER_SELECTED]: this.props.filterCleared,
        [FilterState.FILTER_APPLIED]: this.props.filterCleared,
        [FilterState.FILTER_CLEARED]: () => {},
    };

}
