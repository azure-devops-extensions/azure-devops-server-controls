import * as React from "react";
import * as VCContainer from "VersionControl/Scenarios/Explorer/Components/Container";
import { AnnotatedFileViewer } from "VersionControl/Scenarios/Shared/FileViewers/AnnotatedFileViewer";
import { VersionControlActionIds } from "VersionControl/Scripts/Controls/ControlsCommon";
import { ItemModel } from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";
import { RepositoryContext } from "VersionControl/Scripts/RepositoryContext";

export interface FileContentContainerProps extends VCContainer.ContainerProps {
    isVisible: boolean;
}

export interface FileContentContainerState {
    isAnnotate: boolean;
    isPreviewModeAvailable: boolean;
    isPreviewMode: boolean;
    isDiffMode: boolean;
    isDiffInline: boolean;
    displayItem: ItemModel;
    initialContent: string;
    isEditing: boolean;
    isNewFile: boolean;
    repositoryContext: RepositoryContext;
}

export const FileContentContainer = VCContainer.create<FileContentContainerProps>(
    ["pivotTabs", "itemContent", "fileContent", "context"],
    ({ pivotTabsState, itemContentState, fileContentState, repositoryContext }, { actionCreator, isVisible }) =>
        <AnnotatedFileViewer
            className={"navigation-view-tab"}
            isVisible={isVisible}
            isAnnotate={pivotTabsState.isAnnotate}
            isPreviewMode={pivotTabsState.isPreviewMode}
            isDiffMode={pivotTabsState.currentTab === VersionControlActionIds.HighlightChanges}
            isDiffInline={fileContentState.isDiffInline}
            displayItem={isItemReady(fileContentState.isLoadingInitialContent) && itemContentState.displayItem}
            initialContent={fileContentState.originalContent}
            isEditing={fileContentState.isEditing}
            isNewFile={fileContentState.isNewFile}
            scrollToAnchor={fileContentState.scrollToAnchor}
            useFragmentsForMarkdownLinks={true}
            line={fileContentState.line}
            linesCount={fileContentState.originalLinesCount}
            repositoryContext={repositoryContext}
            onFileContentLoaded={fileContentState.originalContent === undefined && actionCreator.changeOriginalContent}
            onContentEdited={actionCreator.editFileContent}
            onCommitClick={actionCreator.goToBlameCommit}
            onChangeVersion={actionCreator.changeVersionToBlame}
            onEditorEscapeEdit={actionCreator.focusManager.setFocusToCommandBar}
        />);

function isItemReady(isLoadingInitialContent: boolean): boolean {
    return !isLoadingInitialContent;
}
