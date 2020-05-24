/// copyright (c) microsoft corporation. all rights reserved.
/// <reference types="react" />
/// <reference types="react-dom" />

"use strict";
import * as React from "react";
import { ICodePathElement, IPathControlElement } from "Search/Scripts/React/Models";

import "VSS/LoaderPlugins/Css!Search/React/Components/PathControlDropdownElementRenderer";

/**
 * Returns the version control element for rendering. Applies the bowtie icon according to the item type.
 * @param item
 */
export function versionControlElementRenderer(item: ICodePathElement, hitText: string, needTextBolding: boolean): JSX.Element {   
    let icon: string,
        displayName = needTextBolding ? getboldText(item.displayName, hitText) : item.displayName;
    if (item.isRoot) {
        icon = "source-icon bowtie-icon bowtie-tfvc-repo";
    }
    if (item.isBranch) {
        icon = "source-icon bowtie-icon bowtie-tfvc-branch";
    }
    else if (item.isSymLink) {
        icon = "source-icon bowtie-icon bowtie-file-symlink";
    }
    else if (item.isFolder){
        icon =  "source-icon bowtie-icon bowtie-folder";
    }

    return (
        <div className="vc-element">
            <span className={icon} />
            <span className="path" dangerouslySetInnerHTML={{ __html: displayName }}></span>
        </div>);
}

/**
 * Returns the area path element for rendering.
 * @param item
 */
export function areaPathElementRenderer(item: IPathControlElement, hitText: string, needTextBolding: boolean): JSX.Element {

    let displayName = needTextBolding ? getboldText(item.displayName, hitText) : item.displayName;
    return (
        <div className="area-path-element">
            <span className="path" dangerouslySetInnerHTML={{ __html: displayName }}></span>
        </div>);
}

/**
 * returns the branch pahth for rendering. Applies the branch icon before the name
 * @param item
 */
export function branchPathElementRenderer(item: IPathControlElement, hitText: string, needTextBolding: boolean): JSX.Element {
    let displayName = needTextBolding ? getboldText(item.displayName, hitText) : item.displayName;
    return (
        <div className="branch-element">
            <span className={"source-icon bowtie-icon bowtie-tfvc-branch"} />
            <span className="path" dangerouslySetInnerHTML={{ __html: displayName }}></span>
        </div>);
}
/**
 * returns the displayName by bolding the matched search text
 * @param itemDisplayname
 * @param searchText
 */
export function getboldText(itemDisplayname: string, searchText: string): string {
    if (!searchText) {
        return itemDisplayname;
    }

    // Replace all instances of "\" in searchText with "\\" as "\" is a escape character in regular expression.
    searchText = searchText.replace(/\\/g, "\\\\");
   // $& is the matched text stored as this in java script, as the text written can be case sensitive but we dont want to replace our display
   // string with case sensitive string, so we are using $& which will replace the string which is matched
    let regexMatch = new RegExp("({0})".replace("{0}", searchText), "gi"),
        boldText = "<b>$&</b>";
    return itemDisplayname.replace(regexMatch, boldText);
}