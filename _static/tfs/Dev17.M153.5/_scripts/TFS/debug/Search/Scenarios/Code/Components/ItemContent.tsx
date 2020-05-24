import * as React from "react";
import * as Resources from "Search/Scripts/Resources/TFS.Resources.Search.Scenarios";
import * as _MessageBar from "Search/Scenarios/Code/Components/MessageBar";
import * as _CompareContainer from "Search/Scenarios/Code/Components/CompareContainer";
import * as _HistoryContainer from "Search/Scenarios/Code/Components/HistoryContainer";
import * as Container from "Search/Scenarios/Code/Components/Container";
import { Spinner, SpinnerSize } from "OfficeFabric/Spinner";
import { ContentsViewContainer } from "Search/Scenarios/Code/Components/ContentsViewContainer";
import { getAsyncLoadedComponent } from "VSS/Flux/AsyncLoadedComponent";
import { CodeResult } from "Search/Scenarios/WebApi/Code.Contracts";
import { ContextLoadState, ContextStoreState } from "Search/Scenarios/Code/Flux/Stores/RepositoryContextStore";
import { PivotTabActionIds } from "Search/Scenarios/Code/Constants";
import { isVCType } from "Search/Scenarios/Code/Utils";
import { SearchOverlay } from "Search/Scenarios/Shared/Components/SearchOverlay";

export interface ItemContentProps extends Container.ContainerProps {
    visibleTab: string;

    item: CodeResult;

    contextStoreState: ContextStoreState;
}

export class ItemContent extends React.Component<ItemContentProps, {}> {
    private isFileViewerCreated: boolean;
    private isCompareCreated: boolean;

    public render(): JSX.Element {
        const { visibleTab, item, contextStoreState, actionCreator } = this.props;
        const { itemModel, loadStatus, repositoryContext, error } = contextStoreState;
        const isContextLoaded = loadStatus === ContextLoadState.Success;
        const renderOtherTabs = isVCType(item.vcType);

        // True only once when the page is initialized.
        if (!itemModel) {
            return previewUnavailableWrapper(
                handlePreviewUnavailable(
                    loadStatus,
                    error,
                    actionCreator.onPreviewLoadFailed));
        }

        if (isContentsViewContainerVisible(visibleTab)) {
            // Render fileViewer even if it is not active.
            this.isFileViewerCreated = true;
        }
        else if (visibleTab === PivotTabActionIds.Compare) {
            // Render compare view even if it is not active.
            this.isCompareCreated = true;
        }

        const renderCompareContent = this.isCompareCreated && renderOtherTabs;
        const renderHistoryContent = visibleTab === PivotTabActionIds.History && renderOtherTabs && isContextLoaded;
        const isContentsVisible = isContentsViewContainerVisible(visibleTab) && isContextLoaded;
        const isCompareVisible = visibleTab === PivotTabActionIds.Compare && isContextLoaded;

        return (
            <div className="item-Content">
                <div className="inner-Content absolute-full">
                    {
                        this.isFileViewerCreated &&
                        <ContentsViewContainer
                            {...this.props}
                            repositoryContext={repositoryContext}
                            itemModel={itemModel}
                            selectedItem={item}
                            isVisible={isContentsVisible}
                            isPreviewMode={visibleTab === PivotTabActionIds.Preview}
                            isAnnotate={visibleTab === PivotTabActionIds.Blame} />
                    }
                    {
                        renderCompareContent &&
                        <CompareContainerAsync
                            {...this.props}
                            itemModel={itemModel}
                            repositoryContext={repositoryContext}
                            selectedItem={item}
                            isVisible={isCompareVisible} />
                    }
                    {
                        renderHistoryContent &&
                        <HistoryContainerAsync
                            changeId={item.changeId}
                            filePath={item.path}
                            repoContext={repositoryContext}
                            vcType={item.vcType}
                            branch={item.branch}
                            onScenarioComplete={actionCreator.onPreviewLoaded} />
                    }
                    {
                        handlePreviewUnavailable(loadStatus, error, actionCreator.onPreviewLoadFailed)
                    }
                </div>
            </div>);
    }
}

function handlePreviewUnavailable(loadState: ContextLoadState, error: any, onPreviewLoadFailed: () => void): JSX.Element {
    const errorMessage = error ? error.toString() : "";
    return loadState === ContextLoadState.Loading
        ? <SearchOverlay spinnerText={Resources.FetchingPreview} />
        : loadState === ContextLoadState.Failed
            ? <MessageBarAsync message={Resources.CodePreviewLoadFailedMessage.replace("{0}", errorMessage)} onDidMount={onPreviewLoadFailed} />
            : null;
}

function isContentsViewContainerVisible(activeTabKey: string): boolean {
    return activeTabKey === PivotTabActionIds.Contents ||
        activeTabKey === PivotTabActionIds.Blame ||
        activeTabKey === PivotTabActionIds.Preview;
}

function previewUnavailableWrapper(wrappedElement: JSX.Element): JSX.Element {
    return (
        <div className="item-Content">
            <div className="inner-Content absolute-full">
                {wrappedElement}
            </div>
        </div>);
}

const LoadingSpinner = (): JSX.Element => <Spinner size={SpinnerSize.large} label={Resources.LoadingMessage} />;

const CompareContainerAsync = getAsyncLoadedComponent(
    ["Search/Scenarios/Code/Components/CompareContainer"],
    (compareContainer: typeof _CompareContainer) => compareContainer.CompareContainer, LoadingSpinner);

const HistoryContainerAsync = getAsyncLoadedComponent(
    ["Search/Scenarios/Code/Components/HistoryContainer"],
    (HistoryContainer: typeof _HistoryContainer) => HistoryContainer.HistoryContainer, LoadingSpinner);

const MessageBarAsync = getAsyncLoadedComponent(
    ["Search/Scenarios/Code/Components/MessageBar"],
    (MessageBarWrapper: typeof _MessageBar) => MessageBarWrapper.MessageBarWrapper);
