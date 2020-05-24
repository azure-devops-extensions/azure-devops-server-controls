import * as React from "react";
import * as ReactDOM from "react-dom";
import * as TelemetryUtils from "Search/Scenarios/Wiki/Sources/TelemetryUtils";
import * as Search_Resources from "Search/Scripts/Resources/TFS.Resources.Search";
import * as WikiHelper from "SearchUI/Helpers/WikiHelper";
import * as Utils_Accessibility from "VSS/Utils/Accessibility";
import * as Culture from "VSS/Utils/Culture";
import * as Utils_Date from "VSS/Utils/Date";
import * as Utils_String from "VSS/Utils/String";

import {
    ConstrainMode,
    DetailsList,
    IColumn,
    SelectionMode,
} from "OfficeFabric/DetailsList";
import { Link } from "OfficeFabric/Link";
import { Spinner } from "OfficeFabric/Spinner";
import { FeatureAvailabilityFlags } from "Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants";
import { ActionCreator } from "Search/Scenarios/WikiV2/Flux/ActionCreator";
import { SearchStoreState } from "Search/Scenarios/Shared/Base/Stores/SearchStoreV2";
import { getWikiItemTrackingData, getUrlWithTrackingData } from "Search/Scenarios/WikiV2/Flux/Sources/TelemetryWriter";
import { 
    sanitizeHtml,
    constructLinkToProjectWikiContent,
    constructLinkToWikiContent
} from "Search/Scenarios/WikiV2/WikiUtils";
import { WikiSearchRequest, WikiSearchResponse } from "Search/Scripts/Generated/Search.Shared.Contracts";
import { SearchContext } from "Search/Scripts/Common/TFS.Search.Context";
import { WikiResult } from "Search/Scripts/Generated/Search.Shared.Contracts";
import {
    getWikiPageAriaLabel,
    WikiSearchResultRow,
    InText
} from "SearchUI/WikiSearchResultItem";
import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";
import { FormatComponent } from "VSSPreview/Flux/Components/Format";
import { VssDetailsList } from "VSSUI/VssDetailsList";

import "VSS/LoaderPlugins/Css!Search/Scenarios/WikiV2/Components/SearchResultsList";

export interface SearchResultsListProps {
    actionCreator: ActionCreator;
    searchStoreState: SearchStoreState<WikiSearchRequest, WikiSearchResponse>;
}

let nextFocusRowIndex = 0;

export const SearchResultsList = ({ actionCreator, searchStoreState }: SearchResultsListProps): JSX.Element => {

    const {
        request,
        fetchMoreScenario,
        response
    } = searchStoreState;

    const resultsAvailable = response && response.count > 0;
    
    if (!resultsAvailable) {
        return null;
    }
    
    const resultItems = response.results;
    
    return (
            <div key="ResultsList" className="wiki-search-results-container">
                <ResultsList items={resultItems} queryText={request.searchText} />
                {
                    loadMoreComponents(
                        actionCreator,
                        fetchMoreScenario,
                        resultItems,
                        response.count,
                        request.filters,
                        request.searchText)
                }
            </div>
    );
};

const ResultsList = (props: { items: WikiResult[], queryText: string }): JSX.Element =>
    <VssDetailsList
        key={"DetailsList"}
        ariaLabelForGrid={Search_Resources.WikiSearchResultsGridAriaLabel}
        className={"details-list"}
        items={props.items}
        isHeaderVisible={false}
        columns={getColumn()}
        getRowAriaLabel={getWikiPageAriaLabel}
        constrainMode={ConstrainMode.unconstrained}
        selectionMode={SelectionMode.none} />;

const Error = ({ error }: { error: Error }): JSX.Element => {
    const messageToBeReadOut = Search_Resources.GetResultsErrorMessage + error.message;
    Utils_Accessibility.announce(messageToBeReadOut, true);
    return (
        <div className="error-message">
            <span dangerouslySetInnerHTML={{ __html: "<b>" + Search_Resources.GetResultsErrorMessage + "</b>" }} />
            <span>{error.message}</span>
        </div>
    );
};

// Unused Function
// Function for getting last updated string
const LastUpdatedString = (props: { date: Date }): string => {
    return Utils_String.format(
        Search_Resources.WikiSearchResultLastUpdated,
        Utils_Date.localeFormat(props.date, Culture.getDateTimeFormat().ShortDatePattern)
    );
};

function loadMoreComponents(
    actionCreator: ActionCreator,
    isFetching: boolean,
    resultItems: WikiResult[],
    totalResults: number,
    searchFilters: { [key: string]: string[]; },
    searchText: string): JSX.Element {

    if (isFetching) {
        return <LoadingSpinner />;
    }

    return getShowMore(actionCreator, searchText, searchFilters, resultItems, totalResults);
}

function getShowMore(
    actionCreator: ActionCreator,
    searchText: string,
    searchFilters: { [key: string]: string[]; },
    resultItems: WikiResult[],
    totalResults: number): JSX.Element {

    const currentResultsCount: number = resultItems.length;
    const shouldShowMore: boolean = totalResults > currentResultsCount;

    if (shouldShowMore) {
        return (
            <div className="wiki-search-cell">
                <Link className="show-more-results"
                    aria-label={Search_Resources.ShowMoreResults}
                    onClick={() => { getMoreResults(actionCreator, searchText, searchFilters, currentResultsCount); }}>
                    {Search_Resources.ShowMoreResults}
                </Link>
            </div>
        );
    }

    return null;
}

const LoadingSpinner = (): JSX.Element =>
    <Spinner key={"Spinner"} className={"loading-spinner"} label={Search_Resources.FetchingResultsText} />;

function getMoreResults(
    actionCreator: ActionCreator,
    searchText: string,
    searchFilters: { [key: string]: string[]; },
    skip: number): void {

    if (searchText) {
        actionCreator.fetchMoreItems();
        nextFocusRowIndex = skip - 1;
    }
}

function getColumn(): IColumn[] {
    return [{
        key: "0",
        minWidth: 500,
        maxWidth: Infinity,
        onRender: (item: WikiResult, index?: number) => {
            const wikiPageUrl = constructWikiPageUrl(item, index);

            const rowSubTitle = FeatureAvailabilityService.isFeatureEnabled(FeatureAvailabilityFlags.WebAccessWikiProductDocumentation)
                ? constructProjectAndWikiNameSubTitle(item.project.name, item.wiki.name)
                : constructProjectNameSubTitle(item.project.name);

            return (<WikiSearchResultRow
                result={item}
                sanitizeHtml={sanitizeHtml}
                wikiPageUrl={wikiPageUrl}
                rowSubTitle={rowSubTitle}
            />);
        },
        className: "item-row"
    } as IColumn];
}

function constructWikiPageUrl(result: WikiResult, wikiItemIndex: number): string {
    const wikiPath = WikiHelper.getWikiPagePathFromGitPath(WikiHelper.removeExtensionfromPagePath(result.path));
    const collectionContext = SearchContext.getTfsContext(result.collection.name);

    const wikiPageUrl = FeatureAvailabilityService.isFeatureEnabled(FeatureAvailabilityFlags.WebAccessWikiProductDocumentation)
        ? constructLinkToWikiContent(
            result,
            collectionContext.navigation.serviceHost.uri,
            WikiHelper.removeExtensionfromPagePath(result.path))
        : constructLinkToProjectWikiContent(result, collectionContext.navigation.serviceHost.uri, wikiPath);

    const telemetryData = getWikiItemTrackingData(wikiItemIndex);
    return getUrlWithTrackingData(wikiPageUrl, telemetryData);
}

function constructProjectNameSubTitle(projectName: string): JSX.Element {

    return (
        <div>
            <FormatComponent format={Search_Resources.InProjectString}>
                <span>{projectName}</span>
            </FormatComponent>
        </div>
    );
}

function constructProjectAndWikiNameSubTitle(projectName: string, wikiName: string): JSX.Element {

    return (
        <div>
            <FormatComponent format={Search_Resources.InProjectString}>
                <div className="project-and-wiki">
                    <span>{projectName}</span>
                    <span> > </span>
                    <span>{wikiName}</span>
                </div>
            </FormatComponent>
        </div>
    );
}
