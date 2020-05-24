import * as React from "react";
import { autobind } from "OfficeFabric/Utilities";

import { getAsyncLoadedComponent } from "VSS/Flux/AsyncLoadedComponent";

import { CommitPromptState } from "VersionControl/Scenarios/Shared/Committing/CommitPromptStore";
import { ReadmeEditorState } from "ProjectOverview/Scripts/Shared/Components/ReadmeSection/ReadmeInterfaces";
import { ReadmeEditorActionCreator } from "ProjectOverview/Scripts/Shared/ReadmeEditorActionCreator";

import * as ReadmeEditor_Async from "ProjectOverview/Scripts/Shared/Components/ReadmeSection/ReadmeEditor";

export interface AsyncReadmeEditorContainerProps {
    // Can we remove it?
    isDisplayContentPresent: boolean;
    readmeEditorState: ReadmeEditorState,
    commitPromptState: CommitPromptState;
    readmeEditorActionCreator: ReadmeEditorActionCreator;
}

export class AsyncReadmeEditorContainer extends React.Component<AsyncReadmeEditorContainerProps, {}> {
    private _fileViewerContainer: HTMLElement;

    public render(): JSX.Element {
        const readmeEditingState = this.props.readmeEditorState;

        let fileViewerItemModel = readmeEditingState.isEditing && readmeEditingState.readmeFile.isItemModelComplete
            ? readmeEditingState.readmeFile.itemModel
            : undefined;

        const className = "readme-file-viewer-container";

        return (
            <div
                ref={this._saveRefToContainer}
                className={className}>
                {
                    fileViewerItemModel && // Render this component only if itemModel is available
                    <AsyncReadmeEditor {...this.props} onRendered={this._onRendered} />
                }
            </div>
        );
    }

    @autobind
    private _saveRefToContainer(container: HTMLDivElement): void {
        this._fileViewerContainer = container;
    }

    private _onRendered = (originalContent: string): void => {
        if (this._fileViewerContainer && this.props.readmeEditorState.isEditing) {
            this._fileViewerContainer.scrollIntoView();
        }
    }
}

const AsyncReadmeEditor = getAsyncLoadedComponent(
    ["ProjectOverview/Scripts/Shared/Components/ReadmeSection/ReadmeEditor"],
    (module: typeof ReadmeEditor_Async) => module.ReadmeEditor);
