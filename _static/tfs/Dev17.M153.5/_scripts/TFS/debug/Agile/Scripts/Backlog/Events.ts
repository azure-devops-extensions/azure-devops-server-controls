
export interface IBacklogGridItem {
    workItemId: number;
    workItemType: string;
}

export interface IBacklogGridSelectionChangedEventArgs {
    selectedWorkItems: IBacklogGridItem[];
}

export class BacklogNotifications {
    public static BACKLOG_GRID_SELECTION_CHANGED = "backlog-grid-selection-changed";
}