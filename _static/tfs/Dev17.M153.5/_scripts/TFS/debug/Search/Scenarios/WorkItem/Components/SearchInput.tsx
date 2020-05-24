import * as React from "react";
import * as _NavigationHandler from "Search/Scenarios/Hub/NavigationHandler";
import * as _SearchHelp from "Search/Scenarios/WorkItem/Components/SearchHelp";
import * as SharedSearchInput from "Search/Scenarios/Shared/Components/SearchInput";
import * as SharedSearchAccountLink from "Search/Scenarios/Shared/Components/SearchAccountLink";
import * as Container from "Search/Scenarios/WorkItem/Components/Container";
import * as Constants from "Search/Scenarios/WorkItem/Constants";
import * as Resources from "Search/Scripts/Resources/TFS.Resources.Search.Scenarios";
import { DropdownType } from "Search/Scenarios/WorkItem/Flux/Stores/HelpStore";
import { getAccountContextUrl } from "Search/Scenarios/Shared/Utils";
import { getAsyncLoadedComponent } from "VSS/Flux/AsyncLoadedComponent";

import "VSS/LoaderPlugins/Css!Search/Scenarios/Code/Components/SearchInput";

export const SearchInputContainer = Container.create(
    ["searchStore", "helpStore"],
    ({ searchStoreState, helpStoreState, isProjectContext }, props) => {
        const isMember = props.isMember;
        const {
            openSearchInNewTab,
            applySearchText,
            refineHelperSuggestions,
            onRemoveSearchText,
            updateHelpDropdownVisibility,
            selectSearchHelpFilter,
            clickAccountLink
        } = props.actionCreator,
            { query } = searchStoreState,
            url = query ? getAccountContextUrl(query.searchText, Constants.EntityTypeUrlParam) : "",
            isDefaultTextAvailable = query && query.searchText;
        const showHelp = helpStoreState.isDropdownActive && helpStoreState.dropdownType !== DropdownType.None;
        const contextLabel = isProjectContext ? Resources.LabelForProjectContext : Resources.LabelForAccountContext;
        const inputAriaLabel = isProjectContext ? Resources.SearchWorkItemsInProjectContext : Resources.SearchWorkItemsInAccountContext;

        return (
            <div className="search-section">
                <SharedSearchInput.SearchInput
                    defaultSearchText={isDefaultTextAvailable ? query.searchText : ""}
                    placeholderText={Resources.SearchWorkItemPlaceholder}
                    contextLabel={contextLabel}
                    inputAriaLabel={inputAriaLabel}
                    onExecuteSearch={(searchText: string, openInNewTab: boolean) => {
                        openInNewTab
                            ? openSearchInNewTab(searchText)
                            : applySearchText(searchText)
                    }}
                    onInputChange={refineHelperSuggestions}
                    showHelp={showHelp}
                    onRemoveText={onRemoveSearchText}
                    onDismissHelp={() => updateHelpDropdownVisibility(false)}
                    onShowHelp={() => updateHelpDropdownVisibility(true)}>
                    <SearchHelpComponentAsync
                        filterGroups={helpStoreState.filterGroups}
                        dropdownType={helpStoreState.dropdownType}
                        filterText={helpStoreState.filterText}
                        helpLink={Constants.LearnMoreLink}
                        onItemActivated={selectSearchHelpFilter}
                        onDismiss={() => updateHelpDropdownVisibility(false)}
                        isMember={isMember} />
                </SharedSearchInput.SearchInput>
            </div>
        );
    });

const SearchHelpComponentAsync = getAsyncLoadedComponent(
    ["Search/Scenarios/WorkItem/Components/SearchHelp"],
    (searchHelpComponent: typeof _SearchHelp) => searchHelpComponent.SearchHelp);
