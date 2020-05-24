import * as React from "react";
import * as _NavigationHandler from "Search/Scenarios/Hub/NavigationHandler";
import * as SharedSearchAccountLink from "Search/Scenarios/Shared/Components/SearchAccountLink";
import * as SharedSearchInput from "Search/Scenarios/Shared/Components/SearchInput";
import * as Container from "Search/Scenarios/WikiV2/Components/Container";
import * as Constants from "Search/Scenarios/WikiV2/Constants";
import * as Resources from "Search/Scripts/Resources/TFS.Resources.Search.Scenarios";

import { TfsContext, IRouteData } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { NavigationContextLevels } from "VSS/Common/Contracts/Platform";

import "VSS/LoaderPlugins/Css!Search/Scenarios/Code/Components/SearchInput";

export const SearchInputContainer = Container.create(
    ["searchStore"],
    ({ searchStoreState }, props) => {
        const currentPageContext = TfsContext.getDefault();
        const isProjectContext = currentPageContext.navigation.topMostLevel >= NavigationContextLevels.Project;
        const collectionName = TfsContext.getDefault().contextData.collection.name;
        const { request } = searchStoreState;
        const params: _NavigationHandler.UrlParams = request ? {
            type: Constants.EntityTypeUrlParam,
            text: request.searchText,
            project: null
        } as _NavigationHandler.UrlParams : null;
        const url: string = request
            ? TfsContext
                .getDefault()
                .getCollectionActionUrl(collectionName, "", "search", params as IRouteData)
            : "";
        const isDefaultTextAvailable = request && request.searchText;
        const contextLabel = isProjectContext ? Resources.LabelForProjectContext : Resources.LabelForAccountContext;
        const inputAriaLabel = isProjectContext ? Resources.SearchWikiInProjectContext : Resources.SearchWikiInAccountContext;
        // Do not enable "search this account" link for anonymous or public users.
        return (
            <div className="search-section">
                <SharedSearchInput.SearchInput
                    defaultSearchText={isDefaultTextAvailable ? request.searchText : ""}
                    placeholderText={Resources.SearchWikiPlaceholder}
                    contextLabel={contextLabel}
                    inputAriaLabel={inputAriaLabel}
                    onExecuteSearch={(searchText: string, openInNewTab: boolean) => {
                        openInNewTab
                            ? props.actionCreator.openSearchInNewTab(searchText)
                            : props.actionCreator.applySearchText(searchText)
                    }}
                    onRemoveText={props.actionCreator.onRemoveSearchText} >
                </SharedSearchInput.SearchInput>
            </div>
        );
    });
