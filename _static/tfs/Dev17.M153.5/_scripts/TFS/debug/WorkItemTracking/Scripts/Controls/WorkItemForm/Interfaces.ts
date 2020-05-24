import WITOM = require("WorkItemTracking/Scripts/TFS.WorkItemTracking");
import { IWorkItemControlOptions } from "WorkItemTracking/Scripts/Controls/WorkItemForm/WorkItemControl";

export interface IContainedFieldControl {
    dispose?(): void;

    getValue(): any;
    invalidate(flushing: boolean, field: WITOM.Field): void;
    clear(): void;
    setInvalid(invalid: boolean): void;
    setEnabled(enabled: boolean): void;
    setValue(value: any): void;
    setAdditionalValues?(allowedValues: string[]): void;
    onBind(workItem: WITOM.WorkItem): void;
    onUnbind(): void;
    onResize(): void;
}

export interface IWorkItemDiscussionControlOptions extends IWorkItemControlOptions {
    enableContactCard: boolean;
    pageSize?: number;
    maximizedPageSize?: number;
}

/**
 * AttachmentControls Options
 */
export interface IWorkItemAttachmentsControlOptions extends IWorkItemControlOptions {
    /*
     * render browse button instead of "Drag and drop attachments or click here to browse." text
     */
    showBrowseButton: boolean;

    /*
     * render file name column only for attachment grid
     */
    showNameColumnOnly: boolean;

    /*
     * find out available space remaining and render AttachmentsGrid accordingly
     */
    calculateHeightWidth: boolean;

    /*
     * hide context menu options
     */
    hideActions: boolean;

    /*
     * Clicking cell itself (not a tag) opens the attachment
    */
    clickCellToOpen: boolean;
}

export interface IStateTransitionGraphControlOptions extends IWorkItemControlOptions {
    showSpinner: boolean;
    showErrors: boolean;
    showPin: boolean;
}
