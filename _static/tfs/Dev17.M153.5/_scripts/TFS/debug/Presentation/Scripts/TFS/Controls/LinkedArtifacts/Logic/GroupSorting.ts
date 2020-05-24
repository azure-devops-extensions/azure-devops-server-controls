import Utils_String = require("VSS/Utils/String");

import { ILinkedArtifactGroup, IMessage, FetchingDisplayData } from "Presentation/Scripts/TFS/Controls/LinkedArtifacts/Interfaces";

export class GroupSorter {
    public sort(linkTypeRefNames: string[], groups: ILinkedArtifactGroup[]) {       
        let sorter: IGroupSorter;

        if (!linkTypeRefNames || !linkTypeRefNames.length) {
            // Sort alphabetically by display name
            sorter = new DefaultGroupSorter();            
        } else {
            // Sort by given link type reference names
            sorter = new LinkTypeGroupSorter(linkTypeRefNames);
        }

        groups.sort(sorter.getComparer());
    }
}

interface IGroupComparer {
    (a: ILinkedArtifactGroup, b: ILinkedArtifactGroup): number;
}

interface IGroupSorter {
    getComparer(): IGroupComparer;
}

class DefaultGroupSorter implements IGroupSorter {
    public getComparer(): IGroupComparer {
        return (a: ILinkedArtifactGroup, b: ILinkedArtifactGroup): number => {
            return Utils_String.localeIgnoreCaseComparer(a.displayName, b.displayName);
        };
    }
}

class LinkTypeGroupSorter implements IGroupSorter {
    private _linkTypeRefNames: string[];
    private _linkTypeRefNamesIndexMap: IDictionaryStringTo<number>;

    constructor(linkTypeRefNames: string[]) {
        this._linkTypeRefNames = linkTypeRefNames;

        // Build map of linkTypeRefName to index
        this._linkTypeRefNamesIndexMap = {};
        linkTypeRefNames.forEach((linkTypeRefName, index) => this._linkTypeRefNamesIndexMap[linkTypeRefName] = index);
    }

    public getComparer(): IGroupComparer {
        return (a: ILinkedArtifactGroup, b: ILinkedArtifactGroup): number => {
            // Determine position of link type in link type array
            let idxA = this._linkTypeRefNamesIndexMap[a.linkType];
            let idxB = this._linkTypeRefNamesIndexMap[b.linkType];

            let undefinedA = typeof idxA === "undefined";
            let undefinedB = typeof idxB === "undefined";

            // Handle the case where we have an explicit order for 
            // - for none of the groups
            // - only one of the groups
            if (undefinedA && undefinedB) {
                // For both groups the link type order is not expliclity given, fall back to display name
                return Utils_String.localeIgnoreCaseComparer(a.displayName, b.displayName);
            } else if (undefinedA) {
                // If A is not given, place below B
                return 1;
            } else if (undefinedB) {
                // If B is not given, place below A
                return -1;
            }
            
            return idxA - idxB;
        };
    }
}