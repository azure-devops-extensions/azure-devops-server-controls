import * as VSSStore from "VSS/Flux/Store";
import { localeIgnoreCaseComparer, startsWith } from "VSS/Utils/String";

import { AddNewFileDialogPromptPayload, NewFileTargetFolderChangedPayload } from "VersionControl/Scenarios/Explorer/ActionsHub";
import { ItemModel } from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";
import { combinePaths, pathSeparator } from "VersionControl/Scripts/VersionControlPath";

export interface AddNewFilePromptState {
    isVisible: boolean;
    isGit: boolean;
    folderPath: string;
    newSubfolder: string;
    /**
     * The partial path of a file found in the composed path where the new file being created.
     * Example: "/doc/README.md" in a composed path like "/doc/README.md/new".
     */
    fileUsedAsFolder: string;
    /**
     * Full path of child items of the folderPath (perhaps including newSubfolder), at first level only.
     */
    existingPaths: string[];
    isLoadingChildItems: boolean;
    isCreatingFolder: boolean;
}

/**
 * A store containing the state of the prompt to add a new file.
 */
export class AddNewFilePromptStore extends VSSStore.Store {
    public state = {
        isVisible: false,
    } as AddNewFilePromptState;

    public initialize = (isGit: boolean): void => {
        this.state.isGit = isGit;
        this.emitChanged();
    }

    public prompt = (payload: AddNewFileDialogPromptPayload) => {
        this.state.isVisible = true;
        this.state.folderPath = payload.folderPath;
        this.state.newSubfolder = "";
        this.state.fileUsedAsFolder = "";
        this.state.existingPaths = extractPaths(payload.childItems, this.getCombinedFolderPath());
        this.state.isLoadingChildItems = payload.isLoadingChildItems;
        this.state.isCreatingFolder = payload.isCreatingFolder;

        this.emitChanged();
    }

    public hide = () => {
        this.state.isVisible = false;

        this.emitChanged();
    }

    public changeTargetFolder = (payload: NewFileTargetFolderChangedPayload) => {
        this.state.newSubfolder = payload.newSubfolder;
        this.state.fileUsedAsFolder = payload.fileUsedAsFolder;
        this.state.existingPaths = extractPaths(payload.childItems, this.getCombinedFolderPath());
        this.state.isLoadingChildItems = payload.isLoadingChildItems;

        this.emitChanged();
    }

    public updateChildren = (retrievedItems: ItemModel[]) => {
        if (this.state.isVisible) {
            const composedPath = this.getCombinedFolderPath();

            for (const item of retrievedItems) {
                if (item && localeIgnoreCaseComparer(item.serverItem, composedPath) === 0) {
                    if (!item.isFolder) {
                        this.state.fileUsedAsFolder = item.serverItem;
                    }

                    if (item.childItems) {
                        this.state.existingPaths = extractPaths(item.childItems, composedPath);
                    } else {
                        this.state.isLoadingChildItems = true;
                    }

                    this.emitChanged();

                    return;
                }
            }
        }
    }

    private getCombinedFolderPath(): string {
        return combinePaths(this.state.folderPath, this.state.newSubfolder);
    }
}

function extractPaths(childItems: ItemModel[], folderPath: string): string[] {
    return childItems.map(item => {
        const separatorIndexAfterFirstLevel = item.serverItem.indexOf(pathSeparator, folderPath.length + 1);
        if (separatorIndexAfterFirstLevel < 0) {
            return item.serverItem;
        } else {
            return item.serverItem.substring(0, separatorIndexAfterFirstLevel);
        }
    });
}
