import * as React from "react";
import * as ReactDOM from "react-dom";

import {
    ConstrainMode,
    DetailsList,
    IColumn,
    SelectionMode,
} from "OfficeFabric/DetailsList";
import { Link } from "OfficeFabric/Link";
import { Spinner } from "OfficeFabric/Spinner";
import { FeatureAvailabilityFlags } from "Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { ZeroData } from "Presentation/Scripts/TFS/Components/ZeroData";
import { ActionCreator } from "Search/Scenarios/Wiki/ActionCreator";
import { sanitizeHtml } from "Search/Scenarios/Wiki/Components/SearchHitsHighlights";
import { ErrorMessage } from "Search/Scenarios/Wiki/Components/ZeroData";
import * as TelemetryUtils from "Search/Scenarios/Wiki/Sources/TelemetryUtils";
import * as WikiUtils from "Search/Scenarios/Wiki/WikiUtils";
import { ContributedSearchTabsStoreState } from "Search/Scenarios/Wiki/Stores/ContributedSearchTabsStore";
import { SearchState } from "Search/Scenarios/Wiki/Stores/SearchStore";
import { SearchContext } from "Search/Scripts/Common/TFS.Search.Context";
import { WikiResult } from "Search/Scripts/Generated/Search.Shared.Contracts";
import { getSearchEntity } from "Search/Scripts/React/Models";
import * as Search_Resources from "Search/Scripts/Resources/TFS.Resources.Search";
import { getUrlWithTrackingData } from "SearchUI/Telemetry/TelemetryUtils";
import * as WikiHelper from "SearchUI/Helpers/WikiHelper";
import {
    getWikiPageAriaLabel,
    WikiSearchResultRow,
    InText
} from "SearchUI/WikiSearchResultItem";
import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";
import * as Utils_Accessibility from "VSS/Utils/Accessibility";
import * as Culture from "VSS/Utils/Culture";
import * as Utils_Date from "VSS/Utils/Date";
import * as Utils_String from "VSS/Utils/String";
import { FormatComponent } from "VSSPreview/Flux/Components/Format";
import { VssDetailsList } from "VSSUI/VssDetailsList";

import "VSS/LoaderPlugins/Css!Search/SearchResultsList";

export interface SearchResultsListProps {
    actionCreator: ActionCreator;
    searchState: SearchState;
    tfsContext: TfsContext;
    contributionsState: ContributedSearchTabsStoreState;
}

let nextFocusRowIndex = 0;

export const SearchResultsList = ({ actionCreator, searchState, contributionsState, tfsContext }: SearchResultsListProps): JSX.Element => {

    const {
        searchFilters,
        searchResponse,
        searchText,
        isLoadingResults,
        isFetchingMoreResults,
        errorCode
    } = searchState;

    const { isLoadingTabs, currentTab } = contributionsState;

    let result: JSX.Element;

    if (isLoadingTabs) {
        return null;
    }

    if (isLoadingResults) {
        result = <LoadingSpinner key={"LoadingSpinner"} />;
    }
    else {
        const resultItems = searchResponse && searchResponse.results;
        const totalResults = searchResponse && searchResponse.count;

        if (resultItems && resultItems.length) {
            result =
                <div key="ResultsList" className="wiki-search-results-container">
                    <ResultsList items={resultItems} queryText={searchText} />
                    {
                        loadMoreComponents(
                            actionCreator,
                            isFetchingMoreResults,
                            resultItems,
                            totalResults,
                            searchFilters,
                            searchText)
                    }
                </div>;
        }
        else {
            result =
                <ErrorMessage
                    searchText={searchText}
                    activityId={tfsContext.activityId}
                    errorCode={errorCode}
                    isServiceError={Boolean(errorCode) && !Boolean(resultItems)}
                    searchEntity={getSearchEntity(currentTab)} />;
        }
    }

    return <div className="search-results-layout" tabIndex={-1}>{result}</div>;
};

const Empty = ({ searchText }: { searchText: string }): JSX.Element =>
    <ZeroData
        primaryText={Utils_String.format(Search_Resources.NoResultsMessage, searchText, Search_Resources.WikiPageAriaLabel)}
        secondaryText={Search_Resources.NoResultsHelptext}
        imageUrl={SearchContext.getTfsContext().configuration.getResourcesFile("NoResults.svg")}
        imageAltText={Search_Resources.NoResultsFoundText} />;

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
        ? WikiUtils.constructLinkToWikiContent(result, collectionContext.navigation.serviceHost.uri, WikiHelper.removeExtensionfromPagePath(result.path))
        : WikiUtils.constructLinkToProjectWikiContent(result, collectionContext.navigation.serviceHost.uri, wikiPath);

    const telemetryData = TelemetryUtils.getWikiItemTrackingData(wikiItemIndex);
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
