import * as React from "react";
import { FilterBar } from "VSSUI/FilterBar";
import { KeywordFilterBarItem } from "VSSUI/TextFilterBarItem";
import { Filter, IFilterState, FILTER_CHANGE_EVENT } from "VSSUI/Utilities/Filter";
import { IPickListItem } from "VSSUI/PickList";
import * as TestManagementResources from "TestManagement/Scripts/Resources/TFS.Resources.TestManagement";
import * as ComponentBase from "VSS/Flux/Component";
import * as TCMContracts from "TFS/TestManagement/Contracts";

export interface ICodeCoverageModuleFilterBarProps extends ComponentBase.Props {
    onFilterChange: (moduleFilterText: string) => void;
}

export interface ICodeCoverageModuleFilterBarState extends ComponentBase.State {
    filter: any;
}

export interface IConfigurationItem extends IPickListItem {
    value: string;
}

export class CodeCoverageModuleFilterBar extends React.Component<ICodeCoverageModuleFilterBarProps, ICodeCoverageModuleFilterBarState> {
    
    constructor(props: ICodeCoverageModuleFilterBarProps) {
        super(props);

        this.state = {
            filter: new Filter()
        };
    }

    public componentDidMount() {
        this.state.filter.subscribe(this._onFilterChanged, FILTER_CHANGE_EVENT);
    }
    
    public componentWillUnmount() {
        this.state.filter.unsubscribe(this._onFilterChanged, FILTER_CHANGE_EVENT);
    }

    public render() {
        return (
        <div className="module-filterbar-container">
            <FilterBar filter={this.state.filter}>
                <KeywordFilterBarItem
                    filterItemKey="moduleFilter"
                    placeholder={TestManagementResources.CoverageModuleFilterPlaceholder}
                />
            </FilterBar>
        </div>
        );
    }

    private _onFilterChanged = () => {
        const filterState: IFilterState = this.state.filter.getState();
        this.props.onFilterChange(filterState.moduleFilter ? filterState.moduleFilter.value : "");
    }
}

export interface ICCModuleFilterState {
    moduleFilterText: string;
    selectedConfiguration: number;    
}