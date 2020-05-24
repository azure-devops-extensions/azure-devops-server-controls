import { WorkItem } from "WorkItemTracking/Scripts/TFS.WorkItemTracking";

/**
 * Contract for the DiscussionEditor and WorkItemDiscussionControl to access the DiscussionEditor control.
 * This has been implemented by DiscussionRichEditorControl and DiscussionEditorControl (legacy).
 */
export interface IDiscussionEditorControl extends IDisposable {
    /**
     * Get the control implementing IMessageEntryControl, could be either RichEditor or DiscussionEditor.
     */
    getMessageEntryControl(): IMessageEntryControl;

    /**
     * Check if the control is visible.
     */
    isVisible(): boolean;

    /**
     * Ensure that the control is visible.
     */
    showElement(): void;

    /**
     * Hide the control.
     */
    hideElement(): void;
    
    /**
     * Set full screen mode. Implemented by DiscussionEditor, but not legacy.
     */
    setFullScreen(fullScreen: boolean): void;

    /**
     * Set the api location for uploading attachments, used by legacy DiscussionEditorControl
     */
    setUploadAttachmentApiLocation(apiLocation: string): void;

    /**
     * Set the target workitem for uploading attachments, used by the new DiscussionRichEditorControl
     */
    setWorkItem(workItem: WorkItem): void;
}

/**
 * Contract for the WorkItemDiscussionControl to access the message entry control.
 * This has been implemented by DiscussionEditor and RichEditor (legacy).
 */
export interface IMessageEntryControl extends IDisposable {
    /**
     * Ensure that the control has been loaded and then call back the specified method.
     */
    ready(callback: () => void): void;

    /**
     * Enable the toolbar for RichEditor. Legacy method, not implemented by DiscussionEditor.
     */
    enableToolbar(): void;

    /**
     * Disable the toolbar for RichEditor. Legacy method, not implemented by DiscussionEditor.
     */
    disableToolbar(): void;

    /**
     * Check if the control has focus.
     */
    hasFocus(): boolean;

    /**
     * Get the html value of the control.
     */
    getValue(): string;

    /**
     * Set the html value.
     */
    setValue(newValue: string): void;

    /**
     * Select the text in the editor.
     */
    selectText(collapseToEnd?: boolean);

    /**
     * Get outer height. Legacy method, not implemented by DiscussionEditor.
     */
    getOuterHeight(includeMargin?: boolean): number;

    /**
     * Get height. Legacy method, not implemented by DiscussionEditor.
     */
    getHeight(): number;

    /**
     * Set height. Legacy method, not implemented by DiscussionEditor.
     */
    setHeight(newHeight: number): void;

    /**
     * Check whether the value of the control is changed or not and fires the CHANGE event if it has
     */
    checkModified(): void;
}