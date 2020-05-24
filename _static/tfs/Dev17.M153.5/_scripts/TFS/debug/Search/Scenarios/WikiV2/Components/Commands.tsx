import * as React from "react";
import * as Container from "Search/Scenarios/WikiV2/Components/Container";
import * as Resources from "Search/Scripts/Resources/TFS.Resources.Search.Scenarios";
import { CommandBar } from "OfficeFabric/CommandBar";
import { getAccountContextUrl, constructCompleteOrgSearchURL } from "Search/Scenarios/Shared/Utils";
import { getSearchAccountMenuItem } from "Search/Scenarios/Shared/Components/SearchAccountLink";
import { getSearchOrgMenuItem } from "Search/Scenarios/Shared/Components/SearchOrgButton";
import { IconPosition } from "Search/Scenarios/Shared/Components/SearchAccountLink/SearchAccountLink.Props";
import { EntityTypeUrlParam } from "Search/Scenarios/WikiV2/Constants";
import { isSearchOrgButtonEnabled } from "Search/Scenarios/Shared/Base/Sources/SearchOrgButtonAvailabilityHelper";

export const CommandsContainer = Container.create(
    ["searchStore"],
    ({
        searchStoreState,
        isProjectContext
    }, props) => {

        // Do not enable "search this account" button for anonymous or public users.
        const { isMember } = props;
        const showSearchThisAccountButton = isMember && isProjectContext;
        const showSearchThisOrgButton = isMember && isSearchOrgButtonEnabled();
        const { request } = searchStoreState;
        const items = [].concat(showSearchThisAccountButton ?
            [
                getSearchAccountMenuItem("searchThisAccountButton", {
                    url: request ? getAccountContextUrl(request.searchText, EntityTypeUrlParam) : "",
                    onInvoked: props.actionCreator.clickAccountButton,
                    iconPlacement: IconPosition.Left,
                    iconClassName: "bowtie-arrow-open",
                    itemType: "button"
                })
            ] :
            []).concat(showSearchThisOrgButton ?
            [
                 getSearchOrgMenuItem("searchThisOrgButton", {
                    buttonText: Resources.SearchThisOrgWikisButtonText,
                    onInvoked: props.actionCreator.handleSearchThisOrgButtonClick,
                    iconName: "Dictionary",
                    searchText: request.searchText
                })
            ] :
            []);

        const farItems = [];

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