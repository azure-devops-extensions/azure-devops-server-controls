import { css } from "OfficeFabric/Utilities";
import * as React from "react";
import { NavigationContextLevels } from "VSS/Common/Contracts/Platform";

import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { RelationFromExactCount } from "Search/Scripts/Generated/Search.SharedLegacy.Contracts";
import { getSearchUserPermissions, ISearchUserPermissions } from "Search/Scenarios/Shared/Base/ContributedSearchTab";
import { PivotContainer, PivotTab, CountFormat } from "Search/Scenarios/Shared/Components/PivotContainer";
import { ActionCreator } from "Search/Scenarios/Wiki/ActionCreator";
import { IEntityResultCount } from "Search/Scenarios/Wiki/ActionsHub";
import { ContributedSearchTabsStoreState } from "Search/Scenarios/Wiki/Stores/ContributedSearchTabsStore";
import { SearchState } from "Search/Scenarios/Wiki/Stores/SearchStore";
import { StoresHub } from "Search/Scenarios/Wiki/Stores/StoresHub";
import { filtersToUrlString, getAccountContextUrl } from "Search/Scenarios/Wiki/UrlPageHandler";
import { Utils } from "Search/Scripts/Common/TFS.Search.Helpers";
import { SearchBox, SearchAccountLink } from "Search/Scripts/React/Components/SearchBox";
import { PivotTabItem, getSearchEntities, getSearchEntity } from "Search/Scripts/React/Models";
import { SearchEntitiesIds } from "Search/Scripts/React/Models";
import * as Search_Resources from "Search/Scripts/Resources/TFS.Resources.Search";
import * as Resources from "Search/Scripts/Resources/TFS.Resources.Search.Scenarios";

import "VSS/LoaderPlugins/Css!Search/React/Components/HeaderSection";
import "VSS/LoaderPlugins/Css!Search/React/Components/MainSearchBox";

export interface HeaderSectionProps {
    tfsContext: TfsContext;
    searchState: SearchState;
    contributionsState: ContributedSearchTabsStoreState;
    actionCreator: ActionCreator;
    storesHub: StoresHub;
}

export const HeaderSection = ({ tfsContext, searchState, contributionsState, actionCreator, storesHub }: HeaderSectionProps): JSX.Element => {
    const { searchText } = searchState;
    const { isLoadingTabs, tabItems, currentTab } = contributionsState;

    const isProjectContext = tfsContext.navigation.topMostLevel >= NavigationContextLevels.Project;
    const permissionData: ISearchUserPermissions = getSearchUserPermissions();
    const contextLabel = isProjectContext
        ? Search_Resources.LabelForProjectContext
        : Search_Resources.LabelForAccountContext;

    return (
        isLoadingTabs ? null :
            <div>
                <div className="search-section">
                    <SearchBox
                        value={searchText}
                        contextLabel={contextLabel}
                        // tslint:disable-next-line:jsx-no-lambda
                        onPerformSearch={(text, openInNewTab) => performSearch(actionCreator, searchState, text, openInNewTab)}
                        waterMarkText={getSearchEntity(currentTab).placeholderText} />
                    {
                        isProjectContext
                        && permissionData.isMember
                        && <SearchAccountLink url={getAccountContextUrl(searchText)} />
                    }
                </div>
                <div
                    className={
                        css("header-section", {
                            "no-border": tabItems.length <= 0
                        })}
                    role="navigation"
                    aria-label={Search_Resources.HeaderSectionAriaLabel}>
                    <div className="header-section-container">
                        <PivotContainer
                            className="search-entities"
                            pivotTabs={getPivotTabs(contributionsState.tabItems, contributionsState.countResults)}
                            onTabClick={actionCreator.changeTab}
                            selectedTabId={currentTab} />
                    </div>
                </div>
            </div>
    );
};

function performSearch(actionCreator: ActionCreator, searchState: SearchState, text: string, openInNewTab: boolean): void {
    if (openInNewTab) {
        Utils.routeToWikiSearchResultsView(text, true, filtersToUrlString(searchState.searchFilters));
    }
    else {
        actionCreator.performSearch(text, searchState.searchFilters);
    }
}

function getPivotTabs(contributionTabsInfo: PivotTabItem[], resultsCount: { [key: string]: IEntityResultCount; }): PivotTab[] {
    return (contributionTabsInfo || []).map<PivotTab>(contributionTab => {
        const { tabKey, title } = contributionTab,
            count = resultsCount ? resultsCount[tabKey].count : undefined,
            countFormat = resultsCount
                ? (tabKey === SearchEntitiesIds.wiki
                    ? CountFormat.ToNearest
                    : resultsCount[tabKey].relationFromExactCount === RelationFromExactCount.LessThanEqualTo
                        ? CountFormat.LessThanEqualTo
                        : CountFormat.None)
                : undefined;

        return { tabKey, title, count, countFormat, ariaLabel: Resources.TabAriaLabel.replace("{0}", title) };
    });
}
