/// <reference types="react" />

import * as React from "react";
import * as PresentationResources from "Presentation/Scripts/TFS/Resources/TFS.Resources.Presentation";

import { Fabric } from "OfficeFabric/Fabric";
import { IconButton } from "OfficeFabric/Button";
import { TooltipHost } from "VSSUI/Tooltip";
import { DirectionalHint } from "OfficeFabric/common/DirectionalHint";

import { FilterState } from "Presentation/Scripts/TFS/Controls/Filters/IFilterPanel";

import "VSS/LoaderPlugins/Css!Presentation/Controls/Filters/FilterPanelToggleButton";

export interface FilterPanelToggleButtonProps {
    isFilterPanelVisible: boolean;
    filterState: FilterState;
    toggleFilterPanel: () => void;
}

export class FilterPanelToggleButton extends React.Component<FilterPanelToggleButtonProps, {}> {

    public render(): JSX.Element {
        let label = this.props.isFilterPanelVisible ? PresentationResources.ToggleFilterPanelHide : PresentationResources.ToggleFilterPanelShow;
        return (
            <Fabric>
                <span className="filterpanel-toggle-button-container">
                    <TooltipHost
                        content={label}
                        directionalHint={DirectionalHint.bottomCenter}>
                        <IconButton
                            iconProps={ { className: this.stateToCssClassMap[this.props.filterState] }}
                            onClick = {this.props.toggleFilterPanel}
                            ariaLabel={label}/>
                    </TooltipHost>
                </span>
            </Fabric>
        );
    }

    private stateToCssClassMap = {
        [FilterState.FILTER_SELECTED]: "bowtie-icon bowtie-search-filter-fill",
        [FilterState.FILTER_APPLIED]: "bowtie-icon bowtie-search-filter-fill",
        [FilterState.FILTER_CLEARED]: "bowtie-icon bowtie-search-filter",
    };
}
