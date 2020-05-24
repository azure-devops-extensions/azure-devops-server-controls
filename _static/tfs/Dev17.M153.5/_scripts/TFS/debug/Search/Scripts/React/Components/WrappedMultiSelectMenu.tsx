/// Copyright (c) Microsoft Corporation. All rights reserved.
/// <reference types="react" />
/// <reference types="react-dom" />

"use strict";

import * as React from "react";
import * as ReactDOM from "react-dom";

import Search_Resources = require("Search/Scripts/Resources/TFS.Resources.Search");

import { getId, css } from 'OfficeFabric/Utilities';
import { ignoreCaseComparer } from "VSS/Utils/String";
import { SearchPickList, ISearchPickListProps } from "SearchUI/SearchPickList";
import { getCalloutAble } from "Search/Scripts/React/Components/Callout";
import { SearchConstants } from "Search/Scripts/Common/TFS.Search.Constants";
import { MenuButton } from "Search/Scripts/React/Components/Shared/MenuButton/MenuButton";
import { getItemsShownHint } from "Search/Scripts/React/Common";

import "VSS/LoaderPlugins/Css!Search/React/Components/WrappedMultiSelectMenu";

const CalloutMenuButton = getCalloutAble(MenuButton);

/**
 * A wrapper component to decide between MultiSelectMenu or MenuButton for multi select filter.
 * @param props
 */
export interface WrappedMultiSelectMenuProps extends ISearchPickListProps {
    featureAvailabilityStates: IDictionaryStringTo<boolean>;

    dropdownItemDisplayLabels: string[];
}

export var WrappedMultiSelectMenu: React.StatelessComponent<WrappedMultiSelectMenuProps> = (props: WrappedMultiSelectMenuProps) => {
    // Render the MenuButton only when there is single element in the code type filters.

    if (isNewCodeElementFilter(
        props.name,
        props.items.length,
        props.featureAvailabilityStates.newCodeElementFilterEnabled)) {
        let codeElementFilter = props.items[0],
            calloutMessage = codeElementFilter.resultCount === 1
                ? Search_Resources.NewCodeTypeFilterCalloutContentWithSingleMatch
                : Search_Resources.NewCodeTypeFilterCalloutContent,
            calloutPropsContent = calloutMessage
                .replace("{0}", codeElementFilter.resultCount.toString())
                .replace("{1}", codeElementFilter.name.toLowerCase());

        return (
            <div className="menu-Button--container">
                <CalloutMenuButton
                    enabled={true}
                    displayName={props.displayName}
                    displayLabel={codeElementFilter.name}
                    menuButtonId={getId("search-Filters-DropdownButtonLabel-")}
                    showHelp={true}
                    cssClass="light-mode"
                    calloutProps={{
                        title: Search_Resources.RefineSearchText,
                        content: calloutPropsContent
                    }}
                    role="label"
                    hasDropdown={false} />
            </div >);
    }

    let onGetFooterMessage = (itemCount: number, searchText: string) => {
        // Reduce count by 1 to exclued "All" item
        itemCount = !!searchText ? itemCount : itemCount - 1;
        return getItemsShownHint(itemCount, searchText, props.dropdownItemDisplayLabels);
    }
    return <SearchPickList {...props} onGetFooterMessage={onGetFooterMessage} />
}

function isNewCodeElementFilter(filterName: string, filterCount: number, newCodeElementFilterEnabled: boolean): boolean {
    return ignoreCaseComparer(filterName, SearchConstants.CodeTypeFilters) === 0
        && filterCount === 1
        && newCodeElementFilterEnabled;
}