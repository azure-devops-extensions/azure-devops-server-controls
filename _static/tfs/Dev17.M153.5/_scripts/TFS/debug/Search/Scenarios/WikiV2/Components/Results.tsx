import * as React from "react";
import * as ReactDOM from "react-dom";
import * as Container from "Search/Scenarios/WikiV2/Components/Container";

import { FilterPaneContainer } from "Search/Scenarios/WikiV2/Components/FilterPaneContainer";
import { SearchResultsList } from "Search/Scenarios/WikiV2/Components/SearchResultsList";
import { ZeroDataContainer } from "Search/Scenarios/WikiV2/Components/ZeroData";
import { OverlayContainer } from "Search/Scenarios/WikiV2/Components/Overlay";

import "VSS/LoaderPlugins/Css!Search/Scenarios/WikiV2/Components/Results";

const FixedPaneWidth = 0.64;
const MarginAdjustment = 20;

export const ResultsContainer = Container.create(
    ["searchStore"],
    ({ searchStoreState }, props) => {
        return (
            <div className="search-View--container absolute-full wikisearch-page">
                <FilterPaneContainer {...props} />
                <div className="search-results-layout">
                    <OverlayContainer {...props} />
                    <ZeroDataContainer {...props} />
                    <SearchResultsList actionCreator={props.actionCreator}  searchStoreState={searchStoreState}/>
                </div>
            </div>
        );
    });
