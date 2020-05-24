import * as React from "react";
import * as ReactDOM from "react-dom";

import { Fabric } from "OfficeFabric/Fabric";
import { HeaderSection } from "Search/Scripts/React/Components/HeaderSection/HeaderSection";
import { IndexingLandingPage } from "Search/Scripts/React/Components/IndexingLandingPage";
import { MainSearchBoxSection } from "Search/Scripts/React/Components/MainSearchBox";
import { MiddleSection } from "Search/Scripts/React/Components/MiddleSection/MiddleSection";
import { Overlay } from "Search/Scripts/React/Components/Overlay";
import { NoResultsPage } from "Search/Scripts/React/Components/NoResultsPage";

import { ActionCreator } from "Search/Scripts/React/ActionCreator";
import { StoresHub } from "Search/Scripts/React/StoresHub";

import { SearchResultsRegionAriaLabel, PreviewPaneRgionAriaLabel } from "Search/Scripts/Resources/TFS.Resources.Search";

import "VSS/LoaderPlugins/Css!fabric";

export function renderInto(container: HTMLElement, props: PageProps): void {
    ReactDOM.render(
        <Page {...props} />,
        container);
}

export interface PageProps {
    actionCreator: ActionCreator;
    storesHub: StoresHub;
    featureAvailabilityStates: IDictionaryStringTo<boolean>;
    currentPageContext: NavigationContextLevels;
    isOldLayout: boolean;
}

const Page = (props: PageProps) =>
    <Fabric className="search-Page absolute-full">
        <div id="welcome-banner" />
        <div id="search-banner" />
        <MainSearchBoxSection {...props} />
        <HeaderSection {...props} />
        <MiddleSection {...props} />
        <ResultsSection {...props} />
    </Fabric>;

/**
 * Once we go full react this section should not just render simple divs, instead it would render individual components.
 * @param props
 */
const ResultsSection = (props: PageProps) =>
    <div className="search-view-container">
        <Overlay {...props} />
        <NoResultsPage {...props}/>
        <div className="search-view-content-area landing-page-view-mode">
            <div className="search-view-preference-restorable-splitter">
                <div className="leftPane search-view-results-pane">
                    <div className="search-results-information-container" />
                    <div className="search-view-information-area-container" />
                    <div className="search-results-contents" role="region" aria-label={SearchResultsRegionAriaLabel} />
                </div>
                <div className="handleBar search-view-content-handle-bar" />
                <div className="rightPane search-view-preview-pane" role="region" aria-label={PreviewPaneRgionAriaLabel}>
                    <div className="search-preview-pane-header" />
                    <div className="search-preview-contents" />
                </div>
            </div>
        </div>
    </div>;
