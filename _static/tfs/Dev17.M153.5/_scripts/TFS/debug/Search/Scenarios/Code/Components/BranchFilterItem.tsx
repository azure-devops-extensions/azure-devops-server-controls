import * as React from "react";
import * as _SearchSharedContracts from "Search/Scripts/Generated/Search.SharedLegacy.Contracts";
import "VSS/LoaderPlugins/Css!Search/Scenarios/Code/Components/BranchFilterItem";

export interface BranchFilterItemProps {
    item: _SearchSharedContracts.Filter;

    hitText: string;
}

export const BranchFilterItem: React.StatelessComponent<BranchFilterItemProps> = (props: BranchFilterItemProps) => {
    const displayName = getboldText(props.item.id, props.hitText);
    const icon: string = "source-icon bowtie-icon bowtie-tfvc-branch";

    return (
        <div className="search-branch-filter-item">
            <span className={icon} />
            <span className="path" dangerouslySetInnerHTML={{ __html: displayName }}></span>
        </div>);
}

function getboldText(itemDisplayname: string, searchText: string): string {
    if (!searchText) {
        return itemDisplayname;
    }

    // Replace all instances of "\" in searchText with "\\" as "\" is a escape character in regular expression.
    searchText = searchText.replace(/\\/g, "\\\\");
    const regexMatch = new RegExp(`(${searchText})`, "gi"), boldText = "<b>$&</b>";
    return itemDisplayname.replace(regexMatch, boldText);
}