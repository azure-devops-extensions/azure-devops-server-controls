import * as React from "react";
import * as _SearchHelpComponent from "Search/Scenarios/Shared/Components/SearchHelp";
import * as _CrossAccountContainer from "Search/Scenarios/Code/Components/CrossAccountContainer";
import * as SharedSearchInput from "Search/Scenarios/Shared/Components/SearchInput";
import * as Container from "Search/Scenarios/Code/Components/Container";
import * as Constants from "Search/Scenarios/Code/Constants";
import * as Resources from "Search/Scripts/Resources/TFS.Resources.Search.Scenarios";
import { getAsyncLoadedComponent } from "VSS/Flux/AsyncLoadedComponent";
import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";

import "VSS/LoaderPlugins/Css!Search/Scenarios/Code/Components/SearchInput";

export const SearchInputContainer = Container.create(
    ["searchStore", "helpStore"],
    ({ searchStoreState, helpStoreState, isProjectContext }, props) => {
        const {
            openSearchInNewTab,
            applySearchText,
            onRemoveSearchText,
            updateHelpDropdownVisibility,
            publishSearchHelpFilter,
            clickAccountLink
        } = props.actionCreator;
        const { query } = searchStoreState;
        const isCrossAccountEnabled: boolean = !isProjectContext && FeatureAvailabilityService.isFeatureEnabled(Constants.FeatureFlags.MultiAccount, false);
        const isDefaultTextAvailable = query && query.searchText;
        const contextLabel = isProjectContext ? Resources.LabelForProjectContext : Resources.LabelForAccountContext;
        const inputAriaLabel = isProjectContext ? Resources.SearchCodeInProjectContext : Resources.SearchCodeInAccountContext;

        return (
            <div className="search-section">
                <SharedSearchInput.SearchInput
                    defaultSearchText={isDefaultTextAvailable ? query.searchText : ""}
                    contextLabel={contextLabel}
                    inputAriaLabel={inputAriaLabel}
                    placeholderText={Resources.SearchCodePlaceholder}
                    onExecuteSearch={(searchText: string, openInNewTab: boolean) =>
                        openInNewTab
                            ? openSearchInNewTab(searchText)
                            : applySearchText(searchText)
                    }
                    onRemoveText={onRemoveSearchText}
                    showHelp={helpStoreState.isDropdownActive}
                    onShowHelp={() => updateHelpDropdownVisibility(true)}
                    onDismissHelp={() => updateHelpDropdownVisibility(false)}>
                    <SearchHelpComponentAsync
                        filterGroups={helpStoreState.filterGroups}
                        onItemActivated={publishSearchHelpFilter}
                        helpLink={Constants.LearnMoreLink}
                        onDismiss={() => updateHelpDropdownVisibility(false)} />
                </SharedSearchInput.SearchInput>
                {
                    isCrossAccountEnabled && <CrossAccountContainerAsync {...props} />
                }
            </div>
        );
    });

const SearchHelpComponentAsync = getAsyncLoadedComponent(
    ["Search/Scenarios/Shared/Components/SearchHelp"],
    (searchHepComponent: typeof _SearchHelpComponent) => searchHepComponent.SearchHelpComponent,
    null);

const CrossAccountContainerAsync = getAsyncLoadedComponent(
    ["Search/Scenarios/Code/Components/CrossAccountContainer"],
    (crossAccountContainer: typeof _CrossAccountContainer) => crossAccountContainer.CrossAccountContainer,
    null);
