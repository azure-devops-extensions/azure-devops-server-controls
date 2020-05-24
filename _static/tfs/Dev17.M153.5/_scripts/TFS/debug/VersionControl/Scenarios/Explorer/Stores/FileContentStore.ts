import * as VSSStore from "VSS/Flux/Store";

import {
    CurrentRepositoryChangedPayload,
    CommitSavedPayload,
    EditingFileDiscardedPayload,
    FileContentLoadedPayload,
} from "VersionControl/Scenarios/Explorer/ActionsHub";
import { LineAdornmentOptions } from "VersionControl/Scripts/FileViewerLineAdornment";
import { ItemModel } from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";

export interface FileContentState {
    rootPath: string;
    allowEditingFeatures: boolean;
    allowEditingVersion: boolean;
    isEditing: boolean;
    isNewFile: boolean;
    createIfNew: boolean;
    isLoadingInitialContent: boolean;
    isDiffInline: boolean;
    isTooBigToEdit: boolean;
    scrollToAnchor: string;
    line: LineAdornmentOptions;
    originalContent: string;
    editingContent: string;
    originalLinesCount: number;
}

export interface SelectItemArguments {
    allowEditingVersion?: boolean;
    options?: {
        createIfNew?: boolean;
        line?: LineAdornmentOptions;
        anchor?: string;
    };
}

/**
 * A store containing the state of the currently displayed file.
 */
export class FileContentStore extends VSSStore.Store {
    public state = {
        isEditing: false,
        isNewFile: false,
        isDiffInline: false,
    } as FileContentState;

    public changeRepository = (payload: CurrentRepositoryChangedPayload) => {
        this.state.rootPath = payload.rootPath;
        this.state.allowEditingFeatures = payload.allowEditing;

        this.emitChanged();
    }

    public selectItem = (payload: SelectItemArguments) => {
        this.state.allowEditingVersion = payload.allowEditingVersion;
        this.state.originalContent = undefined;
        this.state.originalLinesCount = 0;
        this.state.isLoadingInitialContent = false;

        this.state.line = payload.options && payload.options.line;
        this.state.scrollToAnchor = payload.options && payload.options.anchor;
        this.state.createIfNew = payload.options && payload.options.createIfNew;

        this.emitChanged();
    }

    public editFile = (fileItem: ItemModel): void => {
        this.state.isNewFile = false;
        this.startEditing();

        this.emitChanged();
    }

    public addNewFile = (newFileItem: ItemModel): void => {
        this.state.isNewFile = true;
        this.state.originalContent = undefined;
        this.state.originalLinesCount = 0;
        this.state.isLoadingInitialContent = true;
        this.startEditing();

        this.emitChanged();
    }

    public loadOriginalContent = (payload: FileContentLoadedPayload): void => {
        this.state.originalContent = payload.originalContent;
        this.state.originalLinesCount = getLinesCount(payload.originalContent);
        this.state.isLoadingInitialContent = false;
        this.state.isTooBigToEdit = payload.isTooBigToEdit;
        if (this.state.isTooBigToEdit) {
            this.state.isEditing = false;
        }

        this.emitChanged();
    }

    public editContent = (newContent: string): void => {
        if (this.state.isEditing) {
            this.state.editingContent = newContent;
        } else {
            throw new Error("content cannot be changed if not editing.");
        }

        this.emitChanged();
    }

    public commit = (payload: CommitSavedPayload): void => {
        let hasChanged = false;

        if (this.state.isEditing) {
            this.state.isEditing = false;
            this.state.isNewFile = false;
            this.state.originalContent = this.state.editingContent;
            hasChanged = true;
        }

        if (payload.newBranchVersionSpec &&
            this.state.allowEditingVersion !== payload.newBranchVersionAllowEditing
        ) {
            this.state.allowEditingVersion = payload.newBranchVersionAllowEditing;
            hasChanged = true;
        }

        if (hasChanged) {
            this.emitChanged();
        }
    }

    public discardEditingFile = (payload: EditingFileDiscardedPayload): void => {
        this.state.isNewFile = false;
        this.state.isEditing = false;
        if (payload.navigateVersionSpec) {
            this.state.allowEditingVersion = payload.navigateVersionAllowEditing;
        }

        this.emitChanged();
    }

    public toggleDiffInline = (): void => {
        this.state.isDiffInline = !this.state.isDiffInline;

        this.emitChanged();
    }

    private startEditing(): void {
        this.state.isEditing = true;
        this.state.editingContent = this.state.originalContent || "";
    }
}

function getLinesCount(text: string): number {
    const lineBreaks = text && text.match(/\n/g);
    return lineBreaks ? lineBreaks.length + 1 : 1;
}
