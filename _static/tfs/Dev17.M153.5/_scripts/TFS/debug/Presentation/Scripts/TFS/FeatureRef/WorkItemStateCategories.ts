import PresentationResources = require("Presentation/Scripts/TFS/Resources/TFS.Resources.Presentation");

/**
 * Module for constants regarding WorkItemStateCategories
 */
export module WorkItemStateCategoryNames {
    export const Proposed = "Proposed";
    export const InProgress = "InProgress";
    export const Resolved = "Resolved";
    export const Completed = "Completed";
    export const Removed = "Removed";

    export const DefaultWorkItemStateCategory = WorkItemStateCategoryNames.InProgress;
}

/**
 * Represents information about a WorkItemStateCategory
 */
export interface IWorkItemStateCategory {
    /**
     * Reference Name
     */
    refName: string;

    /**
     * Display Name
     */
    displayName: string;

    /**
     * Order with respect to other WorkItemStateCategories
     */
    order: number;

    /**
     * Default Color for WorkItemStateCategory
     */
    defaultColor: string;

    // Useful for when using as source for Combo Control
    toString: () => string;
};

/**
 * Information for each WorkItemStateCategory
 */
export const WorkItemStateCategoryData: IDictionaryStringTo<IWorkItemStateCategory> = {
    "Proposed": {
        displayName: PresentationResources.StateCategoryProposed,
        order: 100,
        refName: WorkItemStateCategoryNames.Proposed,
        defaultColor: "D5D5D5", // Grey
        toString: () => PresentationResources.StateCategoryProposed
    },
    "InProgress": {
        displayName: PresentationResources.StateCategoryInProgress,
        order: 200,
        refName: WorkItemStateCategoryNames.InProgress,
        defaultColor: "5688E0", // Blue
        toString: () => PresentationResources.StateCategoryInProgress
    },
    "Resolved": {
        displayName: PresentationResources.StateCategoryResolved,
        order: 300,
        refName: WorkItemStateCategoryNames.Resolved,
        defaultColor: "FF9D00", // Orange
        toString: () => PresentationResources.StateCategoryResolved
    },
    "Completed": {
        displayName: PresentationResources.StateCategoryCompleted,
        order: 400,
        refName: WorkItemStateCategoryNames.Completed,
        defaultColor: "4E9D5D", // Green
        toString: () => PresentationResources.StateCategoryCompleted
    },
    "Removed": {
        displayName: PresentationResources.StateCategoryRemoved,
        order: 500,
        refName: WorkItemStateCategoryNames.Removed,
        defaultColor: "FFFFFF", // White
        toString: () => PresentationResources.StateCategoryRemoved
    }
};
