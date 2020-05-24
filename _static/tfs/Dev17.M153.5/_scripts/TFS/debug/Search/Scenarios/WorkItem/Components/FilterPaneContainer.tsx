import * as React from "react";
import * as Container from "Search/Scenarios/WorkItem/Components/Container";
import * as _FilterPane from "Search/Scenarios/WorkItem/Components/FilterPane";
import { css } from "OfficeFabric/Utilities";
import { getAsyncLoadedComponent } from "VSS/Flux/AsyncLoadedComponent";

export const FilterPaneContainer = Container.create(
    ["filterStore"],
    ({ filterStoreState, searchStoreState }, props) => {
        const { filterItemsVisible } = filterStoreState;

        return (
            <div className={css("search-Filters-container", { "hidden": !filterItemsVisible })}>
                <FilterPaneAsync
                    searchStoreState={searchStoreState}
                    filterStoreState={filterStoreState}
                    {...props} />
            </div>
        );
    });

const FilterPaneAsync = getAsyncLoadedComponent(
    ["Search/Scenarios/WorkItem/Components/FilterPane"],
    (filterPane: typeof _FilterPane) => filterPane.FilterPane);
