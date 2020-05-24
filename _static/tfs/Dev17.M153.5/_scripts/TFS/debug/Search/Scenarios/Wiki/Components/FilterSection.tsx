import * as React from "react";

import { CommandButton } from "OfficeFabric/Button";
import { autobind, css } from "OfficeFabric/Utilities";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { compare } from "Search/Scenarios/Shared/Utils";
import { ActionCreator } from "Search/Scenarios/Wiki/ActionCreator";
import { SearchState } from "Search/Scenarios/Wiki/Stores/SearchStore";
import { StoresHub } from "Search/Scenarios/Wiki/Stores/StoresHub";
import { areFiltersEqual } from "Search/Scenarios/Wiki/WikiUtils";
import { SearchConstants } from "Search/Scripts/Common/TFS.Search.Constants";
import { WikiSearchResponse, Filter } from "Search/Scripts/Generated/Search.Shared.Contracts";
import * as Search_Resources from "Search/Scripts/Resources/TFS.Resources.Search";
import * as SearchScenarios_Resources from "Search/Scripts/Resources/TFS.Resources.Search.Scenarios";
import { SearchPickList, ISearchPickListProps, ISearchPickListItem } from "SearchUI/SearchPickList";
import { NavigationContextLevels } from "VSS/Common/Contracts/Platform";
import * as Utils_Array from "VSS/Utils/Array";
import * as Utils_String from "VSS/Utils/String";

import "VSS/LoaderPlugins/Css!Search/FilterSection";

const projectFilterWidth = 200;
const wikiFilterWidth = 200;

export interface FilterSectionProps {
    actionCreator: ActionCreator;
    storesHub: StoresHub;
    searchState: SearchState;
    tfsContext: TfsContext;
}

export class FilterSection extends React.Component<FilterSectionProps> {

    public render(): JSX.Element {
        const searchState = this.props.searchState;

        if (searchState && searchState.searchResponse) {
            const isProjectLevelContext = this._isProjectLevelContext();

            return (
                <div className="filter-section">
                    <div className="wiki-FilterPane--container">
                        {
                            <div className="filter-pane" role="region" aria-label={Search_Resources.FiltersRegionArialabel}>
                                {this._getFilters(isProjectLevelContext)}
                                {this._getResetToDefault()}
                            </div>
                        }

                        {
                            !searchState.isLoadingResults
                            ? this._getShowResultsFetched(searchState.searchResponse, isProjectLevelContext)
                            : null
                        }
                    </div>
                </div>
            );
        }
        else {
            return null;
        }
    }

    private _getShowResultsFetched(searchResponse: WikiSearchResponse, isProjectLevelContext: boolean): JSX.Element {
        const resultItems = searchResponse && searchResponse.results;
        const totalResultsCount = searchResponse && searchResponse.count;
        let displayText: string = "";
        if (resultItems.length > 0) {
            if (totalResultsCount > resultItems.length) {
                displayText = Utils_String.format(Search_Resources.ShowingXofYResultsTitle, resultItems.length, totalResultsCount);
            }
            else if (resultItems.length === 1) {
                displayText = Utils_String.format(Search_Resources.ShowingSingleResultTitle);
            }
            else {
                displayText = Utils_String.format(Search_Resources.ShowingXResultsTitle, resultItems.length);
            }

            return (
                <div className={css("results-text")}>
                    {displayText}
                </div>
            );
        }
    }

    private _getFilters(isProjectLevelContext: boolean): JSX.Element[] {
        const filters: JSX.Element[] = [];
        if (!this.props.searchState
            || !this.props.searchState.searchResponse.facets) {
            return filters;
        }

        const aggregations = this.props.searchState.searchResponse.facets;
        if (Object.keys(aggregations).length === 0 || Object.keys(aggregations).length === 1) {
            // In case 0 results are received from server, push empty aggregations for the filters we show
            if (!this.props.searchState.searchResponse.facets[SearchConstants.ProjectFilterNew]) {
                this.props.searchState.searchResponse.facets[SearchConstants.ProjectFilterNew] = [];
            }
            if (!this.props.searchState.searchResponse.facets[SearchConstants.WikiFacet]) {
                this.props.searchState.searchResponse.facets[SearchConstants.WikiFacet] = [];
            }
        }

        $.each(aggregations, (key: string, agg: Filter[]) => {
            // Dont show project filter at project context level
            if (!(isProjectLevelContext && key === SearchConstants.ProjectFilterNew)) {
                const filter = this._getFilter(key, agg);
                if (filter) {
                    filters.push(
                        <span className="filter" key={key}>
                            {filter}
                        </span>
                    );
                }
            }
        });

        return filters;
    }

    private _getFilter(aggregationKey: string, filters: Filter[]): JSX.Element {
        let filterProps: ISearchPickListProps;

        switch (aggregationKey) {
            case SearchConstants.ProjectFilterNew:
                filterProps = {
                    name: SearchConstants.ProjectFilterNew,
                    width: projectFilterWidth,
                    enabled: true,
                    displayName: Search_Resources.ProjectFiltersDisplayLabel,
                    allItemLabel: Search_Resources.AllProjectsLabel,
                    allItemDisplayName: Search_Resources.AllProjectsLabel,
                    items: this._getPickListItemsFromAggregations(aggregationKey, filters),
                    searchTextPlaceholder: SearchScenarios_Resources.FindProjectPlaceholder,
                    onGetFooterMessage: (itemCount: number, searchText: string) => this._getFooterMessage(
                                itemCount,
                                searchText,
                                SearchScenarios_Resources.ShowingSingleProject,
                                SearchScenarios_Resources.ShowingMultipleProjects,
                                SearchScenarios_Resources.FoundSingleProject,
                                SearchScenarios_Resources.FoundMultipleProjects),
                    onRefineItems: this._filterItems,
                    onSelectionChanged: this._onFilterChange
                                    
                };
                return this._getSearchPickList(filterProps);

            case SearchConstants.WikiFacet:
                filterProps = {
                    name: SearchConstants.WikiFacet,
                    width: wikiFilterWidth,
                    enabled: true,
                    displayName: Search_Resources.WikiFiltersDisplayLabel,
                    allItemLabel: Search_Resources.AllWikisLabel,
                    allItemDisplayName: Search_Resources.AllWikisLabel,
                    items: this._getPickListItemsFromAggregations(aggregationKey, filters),
                    searchTextPlaceholder: SearchScenarios_Resources.FindWikiPlaceholder,
                    onGetFooterMessage: (itemCount: number, searchText: string) => this._getFooterMessage(
                        itemCount,
                        searchText,
                        SearchScenarios_Resources.ShowingSingleWiki,
                        SearchScenarios_Resources.ShowingMultipleWikis,
                        SearchScenarios_Resources.FoundSingleWiki,
                        SearchScenarios_Resources.FoundMultipleWikis),
                    onRefineItems: this._filterItems,
                    onSelectionChanged: this._onFilterChange

                };
                return this._getSearchPickList(filterProps);

            default:
                return null;
        }
    }

    private _getFooterMessage(
        itemCount: number,
        searchText: string,
        showingSingleItemText: string,
        showingMultipleItemsText: string,
        foundSingleItemText: string,
        foundMultipleItemsText: string): string {

        const isSearchTextPresent = !!searchText && searchText !== "";
        itemCount = !isSearchTextPresent ? itemCount - 1 : itemCount; // Adjust for "All" item.

        return !isSearchTextPresent
            ? (itemCount == 1 ? showingSingleItemText : showingMultipleItemsText.replace("{0}", itemCount.toString()))
            : (itemCount > 1
                ? foundMultipleItemsText.replace("{0}", itemCount.toString())
                : itemCount === 0 ? SearchScenarios_Resources.NoResultsForSearchText.replace("{0}", searchText) : foundSingleItemText);
    }

    private _filterItems(items: ISearchPickListItem[], searchText: string): ISearchPickListItem[] {
        searchText = searchText.toLowerCase();
        return items
            .filter((item) => item.name.toLowerCase().indexOf(searchText) >= 0)
            .sort((a, b) => compare(a.name, b.name, searchText));
    }

    @autobind
    private _onFilterChange(name: string, filters: Filter[]): void {
        if (!this.props.searchState || !this.props.searchState.searchResponse.facets) {
            return;
        }

        const applicableFilters = this.props.searchState.searchFilters;
        if (filters === null || filters.length < 1) {
            delete applicableFilters[name];
        } else {
            applicableFilters[name] = filters.map(f =>  f.name);
        }

        this.props.actionCreator.performSearch(
                this.props.searchState.searchText,
                applicableFilters
            );
    }

    private _getPickListItemsFromAggregations(aggregationKey: string, filters: Filter[]): ISearchPickListItem[] {
        const pickListItems: ISearchPickListItem[] = [];
        filters.map((agg) => {
            pickListItems.push({
                id: agg.id,
                name: agg.name,
                resultCount: agg.resultCount,
                selected: this._isFilterSelected(aggregationKey, agg.name)
            });
        });

        return pickListItems;
    }

    private _isFilterSelected(aggregationKey: string, filterName: string): boolean {
        let isFilterSelected = false;
        const filtersApplied = this.props.searchState.searchFilters;
        if (filtersApplied && (aggregationKey in filtersApplied)) {
            isFilterSelected = Utils_Array.contains(filtersApplied[aggregationKey], filterName);
        }

        return isFilterSelected;
    }

    private _getSearchPickList(pickListProps: ISearchPickListProps): JSX.Element {
        return <SearchPickList {...pickListProps} />;
    }

    private _getResetToDefault(): JSX.Element {
        return (
            <div className="reset-container">
                <CommandButton
                    iconProps={{ iconName: 'Cancel', className: 'reset-btn-icon' }}
                    className="reset-btn"
                    onClick={this._onResetClick}
                    disabled={!this._areFiltersApplied()}
                    onRenderText={
                        (): JSX.Element => {
                            return (
                            <span className="reset-btn-label" key="reset-default-text">
                                {Search_Resources.ResetText}
                            </span>
                            );
                        }
                    } />
            </div>
        );
    }

    private _getDefaultFilters(): { [key: string]: string[]; } {
        const filters: { [key: string]: string[]; } = {};
        const projectName = this.props.tfsContext.navigation.project;
        if (projectName) {
            filters[SearchConstants.ProjectFilterNew] = [projectName];
        }
        return filters;
    }

    @autobind
    private _onResetClick(): void {
        if (this._areFiltersApplied()) {
            this.props.actionCreator.performSearch(
                this.props.searchState.searchText,
                this._getDefaultFilters()
            );
        }
    }

    @autobind    
    private _areFiltersApplied(): boolean {
        return !areFiltersEqual(this._getDefaultFilters(), this.props.searchState.searchFilters);
    }

    @autobind    
    private _isProjectLevelContext(): boolean {
        const currentPageContext = this.props.tfsContext.navigation.topMostLevel;
        return currentPageContext >= NavigationContextLevels.Project;
    }
}
