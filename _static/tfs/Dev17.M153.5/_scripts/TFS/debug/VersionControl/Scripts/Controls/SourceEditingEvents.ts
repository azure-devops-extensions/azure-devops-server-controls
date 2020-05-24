import VCSpecs = require("VersionControl/Scripts/TFS.VersionControl.VersionSpecs");

/**
* Module that allows callbacks to be registered for source editing events.
*/
export module Events {

    export interface IDeleteItemCallback {
        (newVersion: VCSpecs.VersionSpec, comment: string, itemPath: string, originalItemVersion: string): void;
    }
    export interface IEditItemCallback {
        (newVersion: VCSpecs.VersionSpec, comment: string, originalItemPath: string, originalItemVersion: string, newBranchVersion?: string, repositoryId?: string): void;
    }
    export interface IRenameItemCallback {
        (newVersion: VCSpecs.VersionSpec, comment: string, originalItemPath: string, originalItemVersion: string, newItemPath: string): void;
    }
    export interface IFilesUploadedCallback {
        (newVersion: VCSpecs.VersionSpec, comment: string, folderPath: string, newItemPaths: string[]): void;
    }
    export interface IDirtyItemCallback {
        (isDirty: boolean, itemPath: string, originalItemVersion: string): void;
    }
    export interface IRevertEditedItemCallback {
        (itemPath: string, itemVersion: string): void;
    }
    export interface IEditModeChangedCallback {
        (itemPath: string, itemVersion: string, editMode: boolean): void;
    }
    export interface IRefreshItemCallback {
        (itemPath: string, itemVersion: string): void;
    }

    let deleteListeners = <IDeleteItemCallback[]>[];
    let editListeners = <IEditItemCallback[]>[];
    let uploadFilesListeners = <IFilesUploadedCallback[]>[];
    let renameListeners = <IRenameItemCallback[]>[];
    let dirtyListeners = <IDirtyItemCallback[]>[];
    let revertListeners = <IRevertEditedItemCallback[]>[];
    let editModeListeners = <IEditModeChangedCallback[]>[];
    let refreshListeners = <IRefreshItemCallback[]>[];

    /**
    * Register a callback that gets called whenever a file or folder is deleted.
    *
    * @param callback Method called once a delete occurs
    */
    export function subscribeItemDeletedEvent(callback: IDeleteItemCallback) {
        deleteListeners.push(callback);
    }

    export function _triggerItemDeletedEvent(newVersion: VCSpecs.VersionSpec, comment: string, originalItemPath: string, originalItemVersion: string) {
        for (let i = 0, l = deleteListeners.length; i < l; i++) {
            deleteListeners[i](newVersion, comment, originalItemPath, originalItemVersion);
        }
    }

    /**
    * Register a callback that gets called whenever a file is edited.
    *
    * @param callback Method called once an edit occurs
    */
    export function subscribeItemEditedEvent(callback: IEditItemCallback) {
        editListeners.push(callback);
    }

    export function _triggerItemEditedEvent(newVersion: VCSpecs.VersionSpec, comment: string, itemPath: string, originalItemVersion: string, newBranchVersion?: string, repositoryId?: string) {
        for (let i = 0, l = editListeners.length; i < l; i++) {
            editListeners[i](newVersion, comment, itemPath, originalItemVersion, newBranchVersion, repositoryId);
        }
    }

    export function unsubscribeItemEditedEvent(callback: IEditItemCallback) {
        editListeners = editListeners.filter(c => c !== callback);
    }

    /**
    * Register a callback that gets called whenever files are uploaded to a folder.
    *
    * @param callback Method called once an upload operation is complete
    */
    export function subscribeItemsUploadedEvent(callback: IFilesUploadedCallback) {
        uploadFilesListeners.push(callback);
    }

    export function _triggerItemsUploadedEvent(newVersion: VCSpecs.VersionSpec, comment: string, folderPath: string, filesAdded: string[]) {
        for (let i = 0, l = uploadFilesListeners.length; i < l; i++) {
            uploadFilesListeners[i](newVersion, comment, folderPath, filesAdded);
        }
    }

    /**
    * Register a callback that gets called whenever a file or folder is renamed.
    *
    * @param callback Method called once a delete occurs
    */
    export function subscribeItemRenamedEvent(callback: IRenameItemCallback) {
        renameListeners.push(callback);
    }

    export function _triggerItemRenamedEvent(newVersion: VCSpecs.VersionSpec, comment: string, originalItemPath: string, originalItemVersion: string, newItemPath: string) {
        for (let i = 0, l = renameListeners.length; i < l; i++) {
            renameListeners[i](newVersion, comment, originalItemPath, originalItemVersion, newItemPath);
        }
    }

    /**
    * Register a callback that gets called whenever the dirty state of a file changes.
    *
    * @param callback Method called once a dirty state change occurs
    */
    export function subscribeItemDirtyStateChangedEvent(callback: IDirtyItemCallback) {
        dirtyListeners.push(callback);
    }

    export function _triggerItemDirtyStateChangedEvent(isDirty: boolean, itemPath: string, originalItemVersion: string) {
        for (let i = 0, l = dirtyListeners.length; i < l; i++) {
            dirtyListeners[i](isDirty, itemPath, originalItemVersion);
        }
    }

    export function unsubscribeItemDirtyStateChangedEvent(callback: IDirtyItemCallback) {
        dirtyListeners = dirtyListeners.filter(c => c !== callback);
    }

    /**
    * Register a callback that gets called whenever changes to an item that was being edited have been reverted.
    *
    * @param callback Method called once item changes are reverted.
    */
    export function subscribeRevertEditedItemEvent(callback: IRevertEditedItemCallback) {
        revertListeners.push(callback);
    }

    export function _triggerRevertEditedItemEvent(itemPath: string, itemVersion: string) {
        for (let i = 0, l = revertListeners.length; i < l; i++) {
            revertListeners[i](itemPath, itemVersion);
        }
    }

    export function unsubscribeRevertEditedItemEvent(callback: IRevertEditedItemCallback) {
        revertListeners = revertListeners.filter(c => c !== callback);
    }

    /**
    * Register a callback that gets called whenever an item has started to be edited 
    * or whenever the item exists edit mode (due to commit or revert)
    *
    * @param callback Method called when edit mode changes.
    */
    export function subscribeEditModeChangedEvent(callback: IEditModeChangedCallback) {
        editModeListeners.push(callback);
    }

    export function _triggerEditModeChangedEvent(itemPath: string, itemVersion: string, editMode: boolean) {
        for (let i = 0, l = editModeListeners.length; i < l; i++) {
            editModeListeners[i](itemPath, itemVersion, editMode);
        }
    }

    /**
    * Register a callback that gets called whenever an item has been updated externally and should be refreshed.
    *
    * @param callback Method called to refresh the item.
    */
    export function subscribeRefreshItemEvent(callback: IRefreshItemCallback) {
        refreshListeners.push(callback);
    }

    export function _triggerRefreshItemEvent(itemPath: string, itemVersion: string) {
        for (let i = 0, l = refreshListeners.length; i < l; i++) {
            refreshListeners[i](itemPath, itemVersion);
        }
    }
}
