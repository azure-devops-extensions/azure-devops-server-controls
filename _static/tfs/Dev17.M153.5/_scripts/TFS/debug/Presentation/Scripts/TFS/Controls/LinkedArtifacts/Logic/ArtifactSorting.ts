import Diag = require("VSS/Diag");
import Utils_String = require("VSS/Utils/String");
import Utils_Date = require("VSS/Utils/Date");
import Utils_Number = require("VSS/Utils/Number");

import { ILinkedArtifactGroup, IDisplayOptions } from "Presentation/Scripts/TFS/Controls/LinkedArtifacts/Interfaces";
import {
    ViewMode, IColumn, IInternalLinkedArtifactDisplayData , InternalKnownColumns, IInternalLinkedArtifactPrimaryData, SortDirection, ISortColumn
} from "Presentation/Scripts/TFS/Controls/LinkedArtifacts/Contracts";
import {ILinkedArtifactId} from "TFS/WorkItemTracking/ExtensionContracts";

export class ArtifactSorter {
    /**
     * Sort linked artifacts in each group in place
     * @param linkedArtifactGroups Groups to sort artifacts in \
     * @param sortColumns Columns to sort by, if null only primary data will be used
     */
    public sortArtifactsInGroups(linkedArtifactGroups: ILinkedArtifactGroup[], sortColumns?: ISortColumn[]) {
        for (let group of linkedArtifactGroups) {
            this._sort(group.linkedArtifacts, sortColumns);
        }
    }

    /**
     * Sort given artifacts in place
     * @param linkedArtifacts Artifacts to sort
     * @param sortColumns Columns to sort by, if null only primary data will be used
     */
    private _sort(linkedArtifacts: IInternalLinkedArtifactDisplayData [], sortColumns?: ISortColumn[]) {
        let compositeComparer = new CompositeComparer();

        if (!sortColumns || !sortColumns.length) {
            // Primary sort only
            compositeComparer.push(new PrimaryComparer(SortDirection.Ascending));
        } else {
            // Sort by columns in the given order
            for (let sortColumn of sortColumns) {
                if (sortColumn.column.refName === InternalKnownColumns.Link.refName) {
                    compositeComparer.push(new PrimaryComparer(sortColumn.direction));
                } else {
                    compositeComparer.push(new ColumnComparer(sortColumn));
                }
            }

            // Tie break as last
            compositeComparer.push(new TieBreakComparer());
        }

        // Sort artifacts
        linkedArtifacts.sort(compositeComparer.getComparer());
    }
}

/** Compare function to compare two linked artifacts */
interface ILinkedArtifactCompareFct {
    (a: IInternalLinkedArtifactDisplayData , b: IInternalLinkedArtifactDisplayData ): number;
}

/** Comparer for two linked artifacts */
interface ILinkedArtifactComparer {
    compare: ILinkedArtifactCompareFct;
}

class PrimaryComparer implements ILinkedArtifactComparer {
    private _sortDirection: SortDirection;

    constructor(sortDirection: SortDirection) {
        this._sortDirection = sortDirection;
    }

    public compare(a: IInternalLinkedArtifactDisplayData , b: IInternalLinkedArtifactDisplayData ): number {
        let result = this._compare(a, b);
        return result * this._sortDirection;
    }

    private _compare(a: IInternalLinkedArtifactDisplayData , b: IInternalLinkedArtifactDisplayData ): number {
        let artifactUndefined = this._handleUndefined(a, b);
        if (artifactUndefined !== null) {
            return artifactUndefined;
        }

        let primaryA = a.primaryData;
        let primaryB = b.primaryData;

        let primaryUndefined = this._handleUndefined(a.primaryData, b.primaryData);
        if (primaryUndefined !== null) {
            return primaryUndefined;
        }

        let typeResult = Utils_String.localeComparer(primaryA.typeName, primaryB.typeName);
        if (typeResult !== 0) {
            return typeResult;
        }

        if (primaryA.user && primaryB.user) {
            let userResult = Utils_String.localeComparer(primaryA.user.displayName, primaryB.user.displayName);
            if (userResult !== 0) {
                return userResult;
            }
        }

        return Utils_String.localeComparer(primaryA.title, primaryB.title);
    }

    private _handleUndefined(a: any, b: any): number {
        if (!a && !b) {
            return 0;
        } else if (!a) {
            return 1;
        } else if (!b) {
            return -1;
        }

        return null;
    }
}

class ColumnComparer implements ILinkedArtifactComparer {
    private _sortColumn: ISortColumn;

    public constructor(sortColumn: ISortColumn) {
        this._sortColumn = sortColumn;
    }

    public compare(a: IInternalLinkedArtifactDisplayData , b: IInternalLinkedArtifactDisplayData ): number {
        let result = this._compare(a, b);

        return result * this._sortColumn.direction;
    }

    public _compare(a: IInternalLinkedArtifactDisplayData , b: IInternalLinkedArtifactDisplayData ): number {
        let columnA = a.additionalData && a.additionalData[this._sortColumn.column.refName];
        let columnB = b.additionalData && b.additionalData[this._sortColumn.column.refName];

        if (!columnA && !columnB) {
            return 0;
        } else if (!columnA) {
            return 1;
        } else if (!columnB) {
            return -1;
        }

        let valA = columnA.rawData || columnA.styledText.text || "";
        let valB = columnB.rawData || columnB.styledText.text || "";

        if (typeof valA !== typeof valB) {
            // Different types, we cannot compare. Raise error and return a before b.
            Diag.Debug.fail(`Tried to compare ${typeof valA} with ${typeof valB} for sorting linked artifacts, not supported.`);
            return -1;
        }

        let comparer = this._getComparerForType(valA);

        if (!comparer) {
            Diag.Debug.fail(`No comparer found for comparing ${typeof valA} with ${typeof valB} for sorting linked artifacts.`);
            return -1;
        }

        return comparer(valA, valB);
    }

    private _getComparerForType(val: number | string | Date): (a: number | string | Date, b: number | string | Date) => number {
        if (typeof val === "number") {
            return Utils_Number.defaultComparer;
        } else if (typeof val === "string") {
            return Utils_String.localeComparer;
        } else if (val instanceof Date) {
            return Utils_Date.defaultComparer;
        }

        return null;
    }
}

/**
 * Implements tie break sorting behavior
 */
class TieBreakComparer implements ILinkedArtifactComparer {
    public compare(a: IInternalLinkedArtifactDisplayData , b: IInternalLinkedArtifactDisplayData ): number {
        if (!a && !b) {
            return 0;
        } else if (!a) {
            return 1;
        } else if (!b) {
            return -1;
        }

        let titleA = a.primaryData && a.primaryData.title || "";
        let titleB = b.primaryData && b.primaryData.title || "";

        let titleResult = Utils_String.localeComparer(titleA, titleB);
        if (titleResult !== 0) {
            return titleResult;
        }

        // In order to make it easier to understand for a user, try to use display Id first. Since it's sometimes
        // truncated, we'll fall back to the real id in the next step if the result is inconclusive.
        let idA = this._getDisplayId(a);
        let idB = this._getDisplayId(b);
        
        let displayIdResult = Utils_String.defaultComparer(idA, idB);
        if (displayIdResult !== 0) {
            return displayIdResult;
        }

        let idResult = Utils_String.defaultComparer(this._getId(a), this._getId(b));
        if (idResult !== 0) {
            return idResult;
        }

        // If we get here, the tie break behavior wasn't able to break the tie. This should not happen. To catch this 
        // we assert and then, to stay deterministic in production, we order A before B.
        Diag.Debug.logInfo("LinkedArtifact tie break behavior did not break tie, this should not happen");
        return -1;
    }

    private _getDisplayId(linkedArtifact: IInternalLinkedArtifactDisplayData ): string {
        if (!linkedArtifact || !linkedArtifact.primaryData || !linkedArtifact.primaryData.displayId) {
            return linkedArtifact.id;
        }

        let displayId = linkedArtifact.primaryData.displayId;

        if (typeof displayId === "string") {
            return displayId;
        } else {
            return displayId.text || linkedArtifact.id;
        }
    }

    private _getId(linkedArtifact: IInternalLinkedArtifactDisplayData ): string {
        return linkedArtifact.id || "";
    }
}

/**
 * Holds a list of compareres and generates a single comparer function that will call all in sequence
 */
class CompositeComparer {
    private _comparers: ILinkedArtifactComparer[] = [];

    /**
     * Add new comparer
     * @param comparer Comparer to add
     */
    public push(comparer: ILinkedArtifactComparer) {
        this._comparers.push(comparer);
    }

    /**
     * Get comparer function that calls all added comparers in sequence
     */
    public getComparer(): ILinkedArtifactCompareFct {
        return (a: IInternalLinkedArtifactDisplayData , b: IInternalLinkedArtifactDisplayData ): number => {
            for (let comparer of this._comparers) {
                let result = comparer.compare(a, b);
                if (result !== 0) {
                    return result;
                }
            }

            return 0;
        };
    }
}