import * as React from "react";
import * as Container from "Search/Scenarios/Code/Components/Container";
import * as Resources from "Search/Scripts/Resources/TFS.Resources.Search.Scenarios";
import * as _AdornmentCommon from "Presentation/Scripts/TFS/TFS.Adornment.Common";
import * as _VCFileViewer from "VersionControl/Scripts/Controls/FileViewer";
import * as _VCLegacyContracts from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";
import * as _VCRepositoryContext from "VersionControl/Scripts/RepositoryContext";
import * as _VCAnnotatedFileViewer from "VersionControl/Scenarios/Shared/FileViewers/AnnotatedFileViewer";
import * as _MessageBar from "Search/Scenarios/Code/Components/MessageBar";
import { getAsyncLoadedComponent } from "VSS/Flux/AsyncLoadedComponent";
import { Spinner, SpinnerType } from "OfficeFabric/Spinner";
import { isVCType } from "Search/Scenarios/Code/Utils";
import { CodeResult } from "Search/Scenarios/WebApi/Code.Contracts";
import { ActionCreator } from "Search/Scenarios/Code/Flux/ActionCreator";
import { FileContentLoadState } from "Search/Scenarios/Code/Flux/Stores/FileContentStore";

export interface ContentsViewContainerProps extends Container.ContainerProps {
    isVisible: boolean;

    isAnnotate: boolean;

    selectedItem: CodeResult;

    itemModel: _VCLegacyContracts.ItemModel;

    repositoryContext: _VCRepositoryContext.RepositoryContext;

    isPreviewMode: boolean;
}

export const ContentsViewContainer = Container.create<ContentsViewContainerProps>(
    ["fileContentStore", "hitNavigationStore"],
    ({
        fileContentState,
        hitNavigationState
    }, props) => {

        const {
            repositoryContext,
            itemModel,
            selectedItem,
            isVisible,
            isAnnotate,
            isPreviewMode,
            actionCreator
        } = props,
            {
                loadState,
                error
            } = fileContentState;

        const isFileViewerVisible = isVisible && loadState === FileContentLoadState.Success,
            isErrorVisible = isVisible && loadState === FileContentLoadState.Failed,
            errorMessage = error ? error.toString() : "";

        return <div className="item-preview-container">
            {
                isErrorVisible &&
                <MessageBarAsync
                    message={Resources.CodePreviewLoadFailedMessage.replace("{0}", errorMessage)}
                    onDidMount={actionCreator.onPreviewLoadFailed} />
            }
            {
                <AnnotatedFileViewerAsync {...getAnnotatedFileViewerProps(
                    isAnnotate,
                    itemModel,
                    repositoryContext,
                    fileContentState.fileContent,
                    hitNavigationState.hitAdornments,
                    selectedItem,
                    isFileViewerVisible,
                    isPreviewMode,
                    actionCreator) } />
            }
        </div>;
    });

const LoadingSpinner = () =>
    <Spinner type={SpinnerType.large} label={Resources.LoadingMessage} />;

function getAnnotatedFileViewerProps(
    isAnnotate: boolean,
    itemModel: _VCLegacyContracts.ItemModel,
    repoContext: _VCRepositoryContext.RepositoryContext,
    fileContent: _VCLegacyContracts.FileContent,
    hits: _AdornmentCommon.DecorationAdornment[],
    selectedItem: CodeResult,
    isVisible: boolean,
    isPreviewMode: boolean,
    actionCreator: ActionCreator): _VCAnnotatedFileViewer.AnnotatedFileViewerProps {
    // Disabling the copyLinkToSelection feature on search page. This feature needs to be 
    // enabled post completion of task 1189811 for only the VC scenario.
    const copyLinkToSelectionDisabled = true;

    return {
        className: "",
        isVisible,
        isAnnotate,
        isEditing: false,
        isNewFile: false,
        isPreviewMode,
        initialContent: "",
        linesCount: 0,
        displayItem: itemModel,
        repositoryContext: repoContext,
        fileViewerOfflineSettings: {
            isOffline: true,
            enableAddOns: selectedItem && isVCType(selectedItem.vcType),
            forceRefresh: true,
            offlineFileContentUrl: null,
            canDownloadOffline: false,
            offlineFileDownloadUrl: null,
            hitAdornments: hits,
            offlineFileContent: fileContent
        },
        copyLinkToSelectionDisabled,
        addExtension: (fileViewer: _VCFileViewer.FileViewer) => {
            fileViewer.addSelectionListener(actionCreator.onCursorPositionChange);
        },
        onFileContentLoaded: actionCreator.onPreviewLoaded
    }
}

const AnnotatedFileViewerAsync = getAsyncLoadedComponent(
    ["VersionControl/Scenarios/Shared/FileViewers/AnnotatedFileViewer"],
    (vcAnnotatedFileViewer: typeof _VCAnnotatedFileViewer) => vcAnnotatedFileViewer.AnnotatedFileViewer,
    LoadingSpinner);

const MessageBarAsync = getAsyncLoadedComponent(
    ["Search/Scenarios/Code/Components/MessageBar"],
    (MessageBarWrapper: typeof _MessageBar) => MessageBarWrapper.MessageBarWrapper);