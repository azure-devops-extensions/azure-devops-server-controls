import * as React from "react";
import * as Container from "Search/Scenarios/Code/Components/Container";
import * as _FilterPane from "Search/Scenarios/Code/Components/FilterPane";
import { css } from "OfficeFabric/Utilities";
import { getAsyncLoadedComponent } from "VSS/Flux/AsyncLoadedComponent";

import "VSS/LoaderPlugins/Css!Search/Scenarios/Code/Components/FilterPaneContainer";

export const FilterPaneContainer = Container.create(
    ["filterStore"],
    ({ filterStoreState, searchStoreState }, props) => {
        const { filterItemsVisible } = filterStoreState;

        return (
            <div className={css("search-Filters-container code-Filters-container", { "hidden": !filterItemsVisible })}>
                <FilterPaneAsync 
                    searchStoreState={searchStoreState} 
                    filterStoreState={filterStoreState} 
                    {...props} />
            </div>
        );
    }, () => {
        // Triggering the resize event on the updation of FilterPaneContainer. All the other component like fileViewer
        // may update and adjust to the layout ( E.g. when filter pane is hidden the viewer needs to update itself)
        const event = document.createEvent('Event');
        event.initEvent('resize', false, true);
        window.dispatchEvent(event);
    });

const FilterPaneAsync = getAsyncLoadedComponent(
    ["Search/Scenarios/Code/Components/FilterPane"],
    (filterPane: typeof _FilterPane) => filterPane.FilterPane);