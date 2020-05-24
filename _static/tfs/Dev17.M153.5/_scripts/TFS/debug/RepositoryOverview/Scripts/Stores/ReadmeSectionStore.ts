import * as VSSStore from "VSS/Flux/Store";
import { IContentRenderer } from "Presentation/Scripts/TFS/TFS.ContentRendering";
import { RepositoryContext } from "VersionControl/Scripts/RepositoryContext";
import { VersionControlActionIds } from "VersionControl/Scripts/Controls/ControlsCommon";
import { ItemModel, FileContent } from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";
import { ISuggestionObject } from "VersionControl/Scenarios/Shared/Suggestion";
import * as FileViewerModelBuilder from "Welcome/Scripts/TFS.Welcome.FileViewerModelBuilder";
import {
    ReadmeSavedPayload,
    ErrorPayload,
} from "ProjectOverview/Scripts/Shared/ReadmeActionsHub";
import * as ProjectOverviewResources from "ProjectOverview/Scripts/Resources/TFS.Resources.ProjectOverview";

import { ReadmeEditorState, ReadmeNotificationState } from "ProjectOverview/Scripts/Shared/Components/ReadmeSection/ReadmeInterfaces";

export interface ReadmeSectionState {
    editorState: ReadmeEditorState;
    notificationState: ReadmeNotificationState;
}

export class ReadmeSectionStore extends VSSStore.Store {
    private _state: ReadmeSectionState;

    constructor(readmeItemModel: ItemModel, content: string, repositoryContext: RepositoryContext) {
        super();

        this._state = {
            editorState: {
                readmeFile: {
                    repositoryContext: repositoryContext,
                    itemModel: readmeItemModel,
                    isItemModelComplete: false,
                    content: content,
                    renderer: undefined,
                },
                isEditing: false,
                isNewFile: false,
                editedContent: null,
                isLoseChangesDialogVisible: false,
                currentReadmeEditModeTab: null,
                isDiffInline: false,
                newReadmeDefaultContent: undefined,
            },
            notificationState: {},
        };
    }

    public initializeRenderer = (renderer: IContentRenderer): void => {
        this._state.editorState.readmeFile.renderer = renderer;
        this.emitChanged();
    }

    public getState(): ReadmeSectionState {
        return this._state;
    }

    public saveReadme = (readmeSavedPayload: ReadmeSavedPayload): void => {
        this._resetEditState();
        this._state.editorState.readmeFile.content = readmeSavedPayload.content;
        this._updateItemModel(readmeSavedPayload.itemModel);
        this._clearNotification();
        this.emitChanged();
    }

    public saveReadmeToNewBranch = (suggestion: ISuggestionObject): void => {
        this._resetEditState();
        this._setNewBranchSuggestion(suggestion);
        this.emitChanged();
    }

    public startEditing = (isNewFile: boolean): void => {
        this._state.editorState.isEditing = true;
        this._state.editorState.currentReadmeEditModeTab = VersionControlActionIds.Contents;
        if (isNewFile === true) {
            this._state.editorState.isNewFile = true;
        } else {
            this._state.editorState.isNewFile = false;
        }
        this.emitChanged();
    }

    public startEditingFailed = (error: TfsError): void => {
        const statusCode = parseInt(error.status);
        // 404 is returned for stakeholders instead of 403, we might end up coverign an actual 404 error
        // (project readme rendered , then deleted, then trying to edit it)
        // but taking that hit for a more prominent stakeholder scenario
        if (statusCode === 401 || statusCode === 403 || statusCode === 404) {
            this._setErrorMessage(ProjectOverviewResources.InsufficientReadmePermission);
        }
        else {
            this._setErrorMessage(error.message);
        }
        this._state.editorState.isEditing = false;
        this.emitChanged();
    }

    public toggleEditingDiffInline = (): void => {
        this._state.editorState.isDiffInline = !this._state.editorState.isDiffInline;
        this._clearNotification();
        this.emitChanged();
    }

    public setDefaultItem = (defaultContentItem: FileViewerModelBuilder.IFileViewerModel): void => {
        this._updateItemModel(defaultContentItem.item);
        this._state.editorState.newReadmeDefaultContent = defaultContentItem.defaultContent;
        this._state.editorState.editedContent = defaultContentItem.defaultContent;
        this.emitChanged();
    }

    public clearEditState = (): void => {
        this._resetEditState();
        this.emitChanged();
    }

    public showLoseChangesDialog = (): void => {
        this._state.editorState.isLoseChangesDialogVisible = true;
        this.emitChanged();
    }

    public hideLoseChangesDialog = (): void => {
        this._state.editorState.isLoseChangesDialogVisible = false;
        this.emitChanged();
    }

    public setReadmeEditModeTab = (readmeEditModeTab: string): void => {
        if (this._state.editorState.currentReadmeEditModeTab !== readmeEditModeTab) {
            this._state.editorState.currentReadmeEditModeTab = readmeEditModeTab;
            this.emitChanged();
        }
    }

    public setEditedContent = (newContent: string): void => {
        if (this._state.editorState.editedContent !== newContent) {
            this._state.editorState.editedContent = newContent;
            this.emitChanged();
        }
    }

    public updateErrorMessage = (errorPayload: ErrorPayload): void => {
        this._setErrorMessage(errorPayload.errorMessage);
        this.emitChanged();
    }

    public initializeItemModel = (item: ItemModel): void => {
        this._updateItemModel(item);
        this.emitChanged();
    }

    public clearNotification = (): void => {
        this._clearNotification();
        this.emitChanged();
    }

    private _resetEditState = (): void => {
        this._state.editorState.isEditing = false;
        this._state.editorState.editedContent = null;
        this._state.editorState.isLoseChangesDialogVisible = false;
    }

    private _clearNotification = (): void => {
        this._setNotificationState(undefined, undefined);
    }

    private _updateItemModel(item: ItemModel): void {
        this._state.editorState.readmeFile.itemModel = item;
        this._state.editorState.readmeFile.isItemModelComplete = Boolean(item);
    }

    private _setNewBranchSuggestion = (suggestion: ISuggestionObject): void => {
        this._setNotificationState(suggestion);
    }

    private _setErrorMessage = (message: string): void => {
        this._setNotificationState(undefined, message);
    }

    private _setNotificationState = (suggestion: ISuggestionObject = undefined, message: string = undefined): void => {
        this._state.notificationState = {
            message: message,
            newBranch: suggestion,
        }
    }
}
