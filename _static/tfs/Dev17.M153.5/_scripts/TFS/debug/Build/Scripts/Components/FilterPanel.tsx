import * as React from "react";

import * as BuildResources from "Build/Scripts/Resources/TFS.Resources.Build";

import { CommandButton } from "OfficeFabric/components/Button/CommandButton/CommandButton";

import "VSS/LoaderPlugins/Css!Build/FilterPanel";

export interface IFilterPanelProps {
    ariaLabel: string;
    isFilterActive: boolean;
    onClear: () => void;
}

export class FilterPanel extends React.Component<IFilterPanelProps, {}> {
    public render(): JSX.Element {
        return <div className="build-filter-panel" role="search" aria-label={this.props.ariaLabel}>
            {React.Children.map(this.props.children, (child, index) => {
                return <div className="filter-item">
                    {child}
                </div>;
            })}
            <div className="buttons-container">
                <CommandButton
                    iconProps={{ iconName: 'Cancel' }}
                    onClick={this._onClearFilter}
                    disabled={!this.props.isFilterActive}
                    className="clear-button">
                    {BuildResources.ClearFiltersText}
                </CommandButton>
            </div>
        </div>;
    }

    private _onClearFilter = () => {
        this.props.onClear();
    }
}
