import * as React from "react";
import * as Container from "Search/Scenarios/WorkItem/Components/Container";
import * as Resources from "Search/Scripts/Resources/TFS.Resources.Search.Scenarios";
import { SearchOverlay } from "Search/Scenarios/Shared/Components/SearchOverlay";
import { SearchStatus } from "Search/Scenarios/Shared/Base/Stores/SearchStore";

export const OverlayContainer = Container.create(
    ["searchStore"],
    ({ searchStoreState }, props) => {
        const element: JSX.Element = searchStoreState.searchStatus === SearchStatus.Loading
            ? <SearchOverlay spinnerText={Resources.FetchingResultsLabel} />
            : null;

        return element;
    });