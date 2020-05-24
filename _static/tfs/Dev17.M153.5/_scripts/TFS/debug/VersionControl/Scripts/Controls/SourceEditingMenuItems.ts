import VCControlsCommon = require("VersionControl/Scripts/Controls/ControlsCommon");
import {RepositoryContext} from "VersionControl/Scripts/RepositoryContext";
import VCResources = require("VersionControl/Scripts/Resources/TFS.Resources.VersionControl");
import VCSpecs = require("VersionControl/Scripts/TFS.VersionControl.VersionSpecs");
import VCSourceEditingDialogs = require("VersionControl/Scripts/Controls/SourceEditingDialogs");
import * as CustomerIntelligenceConstants from "VersionControl/Scripts/CustomerIntelligenceConstants";

/**
* Module defining context menu items related to editing source content (e.g. Add, Edit, Rename, Delete).
*/
export namespace MenuItems {

    /**
    * Get an "Add" menu item which opens a dialog allowing a user to upload existing files or to start editing a new text file.
    *
    * @param repositoryContext RepositoryContext for the repository to commit to
    * @param itemPath Path to the folder being added to
    * @param itemVersion Version string for the version of the folder that Add was called on
    * @param uploadSuccessCallback Method invoked when a new file upload operation has succeeded
    */
    export function getAddNewFileMenuItem(repositoryContext: RepositoryContext, folderPath: string, version: string, options?: any) {
        return {
            id: "add-new-file",
            icon: "bowtie-icon bowtie-math-plus-light",
            text: VCResources.AddNewFile,
            title: VCResources.AddNewFile,
            action: () => {
                if (options && options.customerIntelligenceData) {
                    options.customerIntelligenceData.publish(CustomerIntelligenceConstants.SOURCEEDITING_ADD_FILES, false);
                }

                VCSourceEditingDialogs.Actions.showAddNewItemsUI(repositoryContext, folderPath, version, undefined, undefined, undefined, function(result) {
                    if (!result.newVersion) {
                        window.location.href = VCControlsCommon.getFragmentAction(VCControlsCommon.VersionControlActionIds.Contents, result.newFilePaths[0], version, {
                            editMode: true,
                            newFile: true,
                        });
                    }
                });
            },
            groupId: "editing",
        };
    }

    /**
    * Get an "Edit" menu item which navigates to a particular file and opens it in edit mode.
    *
    * @param repositoryContext RepositoryContext for the repository to commit to
    * @param itemPath Path to the file/folder to open for edit
    * @param itemVersion Version string for the version of the item that edit was called on
    */
    export function getEditFileMenuItem(repositoryContext: RepositoryContext, filePath: string, version: string, options?: any) {
        return {
            id: "edit-file",
            text: VCResources.EditFileContextMenuText,
            title: VCResources.EditFileContextMenuText,
            action: () => {
                if (options && options.customerIntelligenceData) {
                    options.customerIntelligenceData.publish(CustomerIntelligenceConstants.SOURCEEDITING_EDIT, false);
                }

                window.location.href = VCControlsCommon.getFragmentAction(VCControlsCommon.VersionControlActionIds.Contents, filePath, version, {
                    editMode: true
                });
            },
            groupId: "editing"
        };
    }

    /**
    * Get a "Rename" menu item which handles renaming a particular file/folder.
    *
    * @param repositoryContext RepositoryContext for the repository to commit to
    * @param itemPath Path to the file/folder to rename
    * @param itemVersion Version string for the version of the item that rename was called on
    * @param itemIsFolder True if the item represents a folder. False for a file.
    */
    export function getRenameMenuItem(
        repositoryContext: RepositoryContext,
        itemPath: string,
        itemVersion: string,
        itemIsFolder: boolean,
        options?: any) {

        return {
            id: "rename-item",
            icon: "bowtie-icon bowtie-edit-rename",
            text: VCResources.RenameItemMenuItem,
            title: VCResources.RenameItemMenuItem,
            action: () => {
                if (options && options.customerIntelligenceData) {
                    options.customerIntelligenceData.publish(CustomerIntelligenceConstants.SOURCEEDITING_RENAME, false);
                }
                VCSourceEditingDialogs.Actions.showRenameItemUI(repositoryContext, itemPath, itemVersion, itemIsFolder);
            },
            groupId: "editing"
        };
    }

    /**
    * Get a "Delete" menu item which handles deleting a particular file/folder.
    *
    * @param repositoryContext RepositoryContext for the repository to commit to
    * @param itemPath Path to the file/folder to delete
    * @param itemVersion Version string for the version of the item that delete was called on
    */
    export function getDeleteMenuItem(
        repositoryContext: RepositoryContext,
        itemPath: string,
        itemVersion: string,
        options?: any) {

        return {
            id: "delete-item",
            icon: "bowtie-icon bowtie-edit-remove",
            text: VCResources.DeleteItemMenuItem,
            title: VCResources.DeleteItemMenuItem,
            action: () => {
                if (options && options.customerIntelligenceData) {
                    options.customerIntelligenceData.publish(CustomerIntelligenceConstants.SOURCEEDITING_DELETE, false);
                }
                VCSourceEditingDialogs.Actions.showDeleteItemUI(repositoryContext, itemPath, itemVersion);
            },
            groupId: "editing"
        }; 
    }
}
