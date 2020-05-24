import * as React from "react";
import { CommandBar } from "OfficeFabric/CommandBar";

import { LoseChangesDialog } from "VersionControl/Scenarios/Shared/Committing/LoseChangesDialog";
import { CommitDialog } from "VersionControl/Scenarios/Shared/Committing/CommitDialog";
import { CommitPromptState } from "VersionControl/Scenarios/Shared/Committing/CommitPromptStore";
import { VersionControlActionIds } from "VersionControl/Scripts/Controls/ControlsCommon";
import { RepositoryContext } from "VersionControl/Scripts/RepositoryContext";
import { VersionSpec, GitBranchVersionSpec } from "VersionControl/Scripts/TFS.VersionControl.VersionSpecs";
import { ItemModel } from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";
import { EditableFileViewer } from "VersionControl/Scenarios/Shared/FileViewers/EditableFileViewer";
import { PathParser } from "VersionControl/Scenarios/Shared/Path/PathParser";
import { ReadmeEditorActionCreator, isReadmeDirty } from "ProjectOverview/Scripts/Shared/ReadmeEditorActionCreator";
import { ReadmeFile, ReadmeEditorState } from "ProjectOverview/Scripts/Shared/Components/ReadmeSection/ReadmeInterfaces";
import { isGit } from "ProjectOverview/Scripts/Shared/Components/ReadmeSection/ReadmeUtils";
import { EditModeToolbar, getEditTabId, CommandsOptions } from "ProjectOverview/Scripts/Shared/Components/ReadmeSection/EditModeToolbar";

export interface ReadmeEditorProps {
    isDisplayContentPresent: boolean;
    readmeEditorState: ReadmeEditorState,
    commitPromptState: CommitPromptState;
    readmeEditorActionCreator: ReadmeEditorActionCreator;
    onRendered: (originalContent: string) => void;
}

export class ReadmeEditor extends React.Component<ReadmeEditorProps, {}> {
    public render(): JSX.Element {
        return (
            <div className="readme-editmode-container">
                <EditModeToolbar
                    commandsOptions={this._getCommandOptions()}
                    onPivotItemClick={this.props.readmeEditorActionCreator.setReadmeEditModeTab} />
                <div
                    className="readme-tabpanel"
                    role="tabpanel"
                    aria-labelledby={getEditTabId(this.props.readmeEditorState.currentReadmeEditModeTab)}>
                    <EditableFileViewer
                        className="readme-file-viewer"
                        repositoryContext={this.props.readmeEditorState.readmeFile.repositoryContext}
                        displayItem={this.props.readmeEditorState.readmeFile.itemModel}
                        isNewFile={this.props.readmeEditorState.isNewFile}
                        initialContent={this._getInitialContent()}
                        isPreviewMode={this.props.readmeEditorState.currentReadmeEditModeTab === VersionControlActionIds.Preview}
                        isEditing={this.props.readmeEditorState.isEditing}
                        isDiffMode={this.props.readmeEditorState.currentReadmeEditModeTab === VersionControlActionIds.HighlightChanges}
                        isDiffInline={this.props.readmeEditorState.isDiffInline}
                        onContentEdited={this.props.readmeEditorActionCreator.editContent}
                        onFileContentLoaded={this.props.readmeEditorState.currentReadmeEditModeTab !== VersionControlActionIds.Preview && this.props.onRendered}
                        onEditorEscapeEdit={this.props.readmeEditorActionCreator.focusManager.setFocusToCommandBar} />
                </div>
                <LoseChangesDialog
                    dirtyFileName={(new PathParser(this.props.readmeEditorState.readmeFile.itemModel.serverItem)).lastPartName} // to remove "/" in the path.
                    isDialogOpen={this.props.readmeEditorState.isLoseChangesDialogVisible}
                    onDiscardChanges={this.props.readmeEditorActionCreator.cancelReadmeEditing}
                    onDismiss={this.props.readmeEditorActionCreator.dismissLoseChangesDialog} />
                {this.props.commitPromptState.isVisible &&
                    <CommitDialog
                        {...this.props.commitPromptState}
                        tfsContext={this.props.readmeEditorState.readmeFile.repositoryContext.getTfsContext()}
                        currentBranchName={(VersionSpec.parse(this.props.readmeEditorState.readmeFile.itemModel.version) as GitBranchVersionSpec).branchName}
                        isRenaming={false}
                        canCreatePullRequest={true}
                        onSave={this.props.readmeEditorActionCreator.saveReadmeCommit}
                        onDismiss={this.props.readmeEditorActionCreator.dismissCommitDialog} />
                }
            </div>
        );
    }

    private _getInitialContent = (): string => {
        if (this.props.readmeEditorState.isNewFile) {
            return this.props.readmeEditorState.newReadmeDefaultContent;
        }
        else {
            return this.props.readmeEditorState.readmeFile.content;
        }
    }

    private _getCommandOptions(): CommandsOptions {
        const isDirty = isReadmeDirty(this.props.readmeEditorState);

        return {
            isGit: isGit(this.props.readmeEditorState.readmeFile.repositoryContext),
            showToggleInlineDiff: VersionControlActionIds.isCompareAction(this.props.readmeEditorState.currentReadmeEditModeTab),
            isDirty: isDirty,
            isDiffInline: this.props.readmeEditorState.isDiffInline,
            toggleEditingDiffInlineClicked: this.props.readmeEditorActionCreator.toggleEditingDiffInline,
            discardEditingFile: () => { this.props.readmeEditorActionCreator.discardEditingFile(isDirty); },
            promptSaveEditingFile: () => { this.props.readmeEditorActionCreator.promptSaveEditingFile(); },
            setCommandBar: (commandBar: CommandBar) => { this.props.readmeEditorActionCreator.focusManager.setCommandBar(commandBar); },
        };
    }
}
