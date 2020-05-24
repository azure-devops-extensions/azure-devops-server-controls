import { IBaseProps } from "OfficeFabric/Utilities";

export interface FilterPanelProps extends IBaseProps {
    className: string;
    filterUpdated: (searchCriteria: FilterSearchCriteria) => void;
    ariaLabel?: string;
}

export interface NewFilterPanelProps {
    className: string;
    filterUpdated: (searchCriteria: FilterSearchCriteria) => void;
    ariaLabel?: string;
    isFilterPanelVisible: boolean;
}

export interface FilterPanelState {
    filterState: FilterState;
    currentSearchCriteria: FilterSearchCriteria;
}

export interface FilterSearchCriteria {

}

export enum FilterState {
    FILTER_CLEARED,
    FILTER_SELECTED,
    FILTER_APPLIED,
}

