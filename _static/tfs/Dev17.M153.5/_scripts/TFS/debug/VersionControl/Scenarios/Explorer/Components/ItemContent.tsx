import { Spinner, SpinnerType } from "OfficeFabric/Spinner";
import * as React from "react";
import { getAsyncLoadedComponent } from "VSS/Flux/AsyncLoadedComponent";

import * as _VCCompare from "VersionControl/Scenarios/Explorer/Components/Compare";
import * as VCContainer from "VersionControl/Scenarios/Explorer/Components/Container";
import { ErrorContentContainer } from "VersionControl/Scenarios/Explorer/Components/ErrorContent";
import * as _VCFileContent from "VersionControl/Scenarios/Explorer/Components/FileContent";
import { FolderContentContainer } from "VersionControl/Scenarios/Explorer/Components/FolderContent";
import * as _VCHistory from "VersionControl/Scenarios/Explorer/Components/History";
import { getExplorerTabId } from "VersionControl/Scenarios/Explorer/Components/PivotTabs";
import * as _VCTfvcHistory from "VersionControl/Scenarios/Explorer/Components/TfvcHistory";
import { ExplorerItemTab } from "VersionControl/Scenarios/Explorer/Stores/ItemContentStore";
import { ItemModel } from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";
import { RepositoryContext } from "VersionControl/Scripts/RepositoryContext";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";

export const ItemContentContainer = VCContainer.create(
    ["itemContent", "pivotTabs", "version", "context"],
    ({ itemContentState, tab, version, isGit, repositoryContext }, props) =>
        <ItemContent
            isGit={isGit}
            version={version}
            repositoryContext={repositoryContext}
            tab={tab}
            {...itemContentState}
            {...props}
            />);

interface ItemContentProps extends VCContainer.ContainerProps {
    isGit: boolean;
    tab: string;
    visibleItemTab: ExplorerItemTab;
    path: string;
    version: string;
    item: ItemModel;
    repositoryContext: RepositoryContext;
}

const innerContentClassName = "inner-content absolute-full";

/**
 * Displays the content of the selected item for the selected tab.
 */
class ItemContent extends React.Component<ItemContentProps, {}> {
    private isFileContentCreated: boolean;
    private isTfvcHistoryCreated: boolean;
    private isCompareCreated: boolean;

    public render(): JSX.Element {
        if (this.props.visibleItemTab === ExplorerItemTab.FileContent) {
            // HACK Once we create the FileViewer, we have to keep it alive to prevent some internal callbacks to fail.
            this.isFileContentCreated = true;
        } else if (this.props.visibleItemTab === ExplorerItemTab.Compare) {
            this.isCompareCreated = true;
        } else if (this.props.visibleItemTab === ExplorerItemTab.History && !this.props.isGit) {
            this.isTfvcHistoryCreated = true;
        }

        return (
            <div
                className="item-content"
                role="tabpanel"
                aria-labelledby={getExplorerTabId(this.props.tab)}>
                {
                    this.isFileContentCreated &&
                    <div key="file-contents-tab" className={innerContentClassName}>
                        <FileContentContainerAsync
                            {...this.props}
                            isVisible={this.props.visibleItemTab === ExplorerItemTab.FileContent}
                            />
                    </div>
                }
                {
                    this.props.visibleItemTab === ExplorerItemTab.FolderContent &&
                    <div key="folder-contents-tab" className="absolute-full">
                        <FolderContentContainer {...this.props} />
                    </div>
                }
                {
                    this.props.visibleItemTab === ExplorerItemTab.History &&
                    this.props.isGit &&
                    <div key="folder-contents-tab" className={innerContentClassName}>
                        <GitHistoryContainerAsync {...this.props} />
                    </div>
                }
                {
                    this.props.visibleItemTab === ExplorerItemTab.History &&
                    !this.props.isGit &&
                    <TfvcHistoryAsync className={innerContentClassName} {...this.props} />
                }
                {
                    this.isCompareCreated &&
                    <CompareContainerAsync
                        className={innerContentClassName}
                        isVisible={this.props.visibleItemTab === ExplorerItemTab.Compare}
                        item={this.props.item}
                        {...this.props}
                        />
                }
                {
                    this.props.visibleItemTab === ExplorerItemTab.Error &&
                    <ErrorContentContainer {...this.props} />
                }
            </div>
        );
    }
}

const LoadingSpinner = () =>
    <Spinner type={SpinnerType.large} label={VCResources.LoadingText} />;

const FileContentContainerAsync = getAsyncLoadedComponent(
    ["VersionControl/Scenarios/Explorer/Components/FileContent"],
    (vcFileContent: typeof _VCFileContent) => vcFileContent.FileContentContainer,
    LoadingSpinner);

const GitHistoryContainerAsync = getAsyncLoadedComponent(
    ["VersionControl/Scenarios/Explorer/Components/History"],
    (vcHistory: typeof _VCHistory) => vcHistory.HistoryContainer,
    LoadingSpinner);

const TfvcHistoryAsync = getAsyncLoadedComponent(
    ["VersionControl/Scenarios/Explorer/Components/TfvcHistory"],
    (vcTfvcHistory: typeof _VCTfvcHistory) => vcTfvcHistory.TfvcHistoryContainer,
    LoadingSpinner);

const CompareContainerAsync = getAsyncLoadedComponent(
    ["VersionControl/Scenarios/Explorer/Components/Compare"],
    (vcCompare: typeof _VCCompare) => vcCompare.CompareContainer,
    LoadingSpinner);
