import * as React from "react";
import * as Resources from "Search/Scripts/Resources/TFS.Resources.Search.Scenarios";
import * as _SortOptions from "SearchUI/SortOptions";
import * as Container from "Search/Scenarios/WorkItem/Components/Container";
import { CommandBar } from "OfficeFabric/CommandBar";
import { getFilterToggleMenuItem } from "Search/Scenarios/Shared/Components/FilterToggle";
import { getPreviewSettingsPivotMenuItem } from "Search/Scenarios/Shared/Components/PreviewSettingsPivot";
import { getSearchAccountMenuItem } from "Search/Scenarios/Shared/Components/SearchAccountLink";
import { IconPosition } from "Search/Scenarios/Shared/Components/SearchAccountLink/SearchAccountLink.Props";
import { getAccountContextUrl, constructCompleteOrgSearchURL } from "Search/Scenarios/Shared/Utils";
import { SortActionIds, EntityTypeUrlParam } from "Search/Scenarios/WorkItem/Constants";
import { getSortOptionContextMenuItem } from "SearchUI/SortOptions";

export const CommandsContainer = Container.create(
    ["filterStore", "sortOptionsStore", "previewOrientationStore"],
    ({
        availableSortFields,
        appliedEntitySortOption,
        isSortOptionVisible,
        availablePreviewOrientations,
        filterStoreState,
        previewOrientationStoreState,
        searchStoreState,
        isProjectContext
    }, props) => {

        const { filterItemsVisible, filter } = filterStoreState;
        const filterToggle = getFilterToggleMenuItem("workitemFilterToggle", {
            visible: true,
            onClick: () => props.actionCreator.toggleFilePaneVisibility(!filterItemsVisible),
            fill: filter.hasChangesToReset(),
            tooltipContent: filterItemsVisible ? Resources.HideFilterPanel : Resources.ShowFilterPanel
        });

        const appliedSortOption: _SortOptions.SortOption = {
            key: appliedEntitySortOption.field,
            order: appliedEntitySortOption.sortOrder as ("asc" | "desc")
        };

        const sortOption = getSortOptionContextMenuItem("workitemSortOption", {
            actionButtonEnabled: appliedSortOption.key !== SortActionIds.Relevance,
            items: availableSortFields,
            onSortOptionChanged: (so) => {
                // In case of relevance order is always "desc";
                so.order = so.key !== SortActionIds.Relevance ? so.order : "desc";
                props.actionCreator.changeSortCriteria(so);
            },
            selectedSortOption: appliedSortOption
        });

        const { previewOrientation, visible } = previewOrientationStoreState;
        const settingsPivot = getPreviewSettingsPivotMenuItem("workItemPreviewSettingsPivot", {
            currentSetting: previewOrientation,
            items: availablePreviewOrientations,
            onClick: props.actionCreator.changePreviewOrienation,
            tooltipContent: Resources.PreviewOrientationLabel,
            visible
        });

        // Do not enable "search this account" button for anonymous or public users.
        const { isMember } = props;
        const showSearchThisAccountButton = isMember && isProjectContext;
        const { query } = searchStoreState;
        const items = [].concat(showSearchThisAccountButton ?
            [
                getSearchAccountMenuItem("searchThisAccountButton", {
                    url: query ? getAccountContextUrl(query.searchText, EntityTypeUrlParam) : "",
                    onInvoked: props.actionCreator.clickAccountButton,
                    iconPlacement: IconPosition.Left,
                    iconClassName: "bowtie-arrow-open",
                    itemType: "button"
                })
            ] :
            []);
        let farItems;
        if (isSortOptionVisible) {
            farItems = [sortOption, settingsPivot, filterToggle];
        }
        else {
            farItems = [settingsPivot, filterToggle];
        }

        return (
            <div className="search-commandbar--container">
                {
                    items.length > 0 &&
                    <div className="commandbar--seperator"></div>
                }
                <CommandBar items={items} farItems={farItems} className="header-CommandBar" />
            </div>
        );
    });
