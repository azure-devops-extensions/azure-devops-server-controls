export interface IWorkItemDragInfo {
    /** Are all the dragging work items owned */
    areAllItemsOwned: boolean;
    /** All the selected work item ids */
    selectedWorkItemIds: number[];
    /** The top level work item ids. Excludes any children that are also selected */
    topLevelWorkItemIds: number[];
    /** The selected work item types */
    selectedWorkItemTypes: string[];
    /** The top level work item types. Excludes any children that are also selected */
    topLevelWorkItemTypes: string[];
}