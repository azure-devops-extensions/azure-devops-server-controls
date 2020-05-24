/// <reference types="react" />

import * as React from "react";
import * as PresentationResources from "Presentation/Scripts/TFS/Resources/TFS.Resources.Presentation";
import { CommandButton } from "OfficeFabric/components/Button/CommandButton/CommandButton";
import { Fabric } from "OfficeFabric/Fabric";
import "VSS/LoaderPlugins/Css!Presentation/Controls/Filters/NewClearFilterButton";

import { FilterState } from "Presentation/Scripts/TFS/Controls/Filters/IFilterPanel";

export interface ClearFilterButtonProps {
    filterState: FilterState;
    filterCleared: () => void;
}

export class NewClearFilterButton extends React.Component<ClearFilterButtonProps, {}> {

    public render(): JSX.Element {
        let disabled = this.props.filterState === FilterState.FILTER_CLEARED;
        return (
            <div className={"new-clear-filter-button-container"}>
                <Fabric>
                    <CommandButton
                        iconProps={{ iconName: 'Cancel' }}
                        onClick={() => { this.stateToActionMapping[this.props.filterState](); }}
                        disabled={disabled}>
                        {PresentationResources.ClearFiltersText}
                    </CommandButton>
                </Fabric>
            </div>
        );
    }

    private stateToActionMapping = {
        [FilterState.FILTER_SELECTED]: this.props.filterCleared,
        [FilterState.FILTER_APPLIED]: this.props.filterCleared,
        [FilterState.FILTER_CLEARED]: () => { },
    };
}
