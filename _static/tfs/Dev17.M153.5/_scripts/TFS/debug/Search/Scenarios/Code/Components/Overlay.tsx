import * as React from "react";
import * as SharedOverlay from "Search/Scenarios/Shared/Components/SearchOverlay";
import * as Resources from "Search/Scripts/Resources/TFS.Resources.Search.Scenarios";
import * as Container from "Search/Scenarios/Code/Components/Container";
import { SearchStatus } from "Search/Scenarios/Shared/Base/Stores/SearchStore";

export const OverlayContainer = Container.create(
    ["searchStore"],
    ({ searchStoreState }, props) => {
        const element: JSX.Element = searchStoreState.searchStatus === SearchStatus.Loading
            ? <SharedOverlay.SearchOverlay spinnerText={Resources.FetchingResultsLabel} />
            : null;

        return element;
    });