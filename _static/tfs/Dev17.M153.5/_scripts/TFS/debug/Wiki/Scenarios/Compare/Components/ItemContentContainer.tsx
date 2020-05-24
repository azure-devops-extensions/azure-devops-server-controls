import * as React from "react";

import { CommandBar } from "OfficeFabric/CommandBar";
import { IContextualMenuItem } from "OfficeFabric/ContextualMenu";
import {
    Pivot,
    PivotItem,
    PivotLinkFormat,
    PivotLinkSize,
} from "OfficeFabric/Pivot";
import { Spinner } from "OfficeFabric/Spinner";
import { autobind } from "OfficeFabric/Utilities";

import { ItemModel, VersionControlChangeType } from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";
import { DiffViewerOrientation } from "VersionControl/Scripts/Generated/TFS.VersionControl.WebAccess.Contracts";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";

import { DiffViewer } from "VersionControl/Scenarios/Shared/FileViewers/DiffViewer";
import { CompareModuleFluxProps } from "Wiki/Scenarios/Compare/Components/CompareContainer";
import { WikiMarkdownRenderer } from "Wiki/Scenarios/Shared/Components/WikiMarkdownRenderer";
import { UrlParameters } from "Wiki/Scenarios/Shared/SharedActionsHub";
import { VersionControlConstants, CompareViews } from "Wiki/Scripts/CommonConstants";
import { CompareTabTitle, Preview } from "Wiki/Scripts/Resources/TFS.Resources.Wiki";

import "VSS/LoaderPlugins/Css!Wiki/Scenarios/Compare/Components/ItemContentContainer";

export interface ItemContentContainerState {
    gitItemPath: string;
    oversion: string;
    mversion: string;
    item: ItemModel;
    itemChangeType: VersionControlChangeType;
    isDiffInline: boolean;
    currentDiffIndex: number;
    diffLines: number[];
    isDiffViewContentLoading: boolean;
    isPreviewContentLoading: boolean;
}

export class ItemContentContainer extends React.Component<CompareModuleFluxProps, ItemContentContainerState> {
    private _isFirstContentRendered = false;

    constructor(props: CompareModuleFluxProps) {
        super(props);

        this.state = {
            gitItemPath: "",
            oversion: null,
            mversion: null,
            item: null,
            itemChangeType: null,
            isDiffInline: false,
            diffLines: [],
            currentDiffIndex: 0,
            isDiffViewContentLoading: true,
            isPreviewContentLoading: true,
        };
    }

    public render(): JSX.Element {
        const pivotItems: JSX.Element[] = [];
        const storesHubSharedState = this.props.storesHub.state.sharedState;

        if (this.state.itemChangeType === VersionControlChangeType.Edit) {
            pivotItems.push(<PivotItem linkText={CompareTabTitle} itemKey={"compare"} key={"CompareViewPivot"} />);
        }

        pivotItems.push(<PivotItem linkText={Preview} itemKey={"preview"} key={"PreviewViewPivot"} />);
        return (
            <div className={"item-content-container"}>
                <div className={"pivot-header-bar"}>
                    <div className={"pivot-container"}>
                        <Pivot
                            linkFormat={PivotLinkFormat.links}
                            linkSize={PivotLinkSize.normal}
                            selectedKey={storesHubSharedState.urlState.view}
                            onLinkClick={this._onPivotClick}
                            getTabId={this._getRevisionDetailsTabId}>
                            {pivotItems}
                        </Pivot>
                    </div>
                    <CommandBar
                        className={"compare-command-bar " + (this._isCurrentView(CompareViews.Compare) ? "" : "hidden")}
                        items={[]}
                        farItems={this._getCommandsInBar(this.state.isDiffInline)} />
                    <div className={"clear-float"} />
                </div>
                {this._renderPageContent()}
            </div>
        );
    }

    public componentDidMount(): void {
        this.props.storesHub.comparePageStore.addChangedListener(this._onComparePageStateChanged);
    }

    public componentDidUpdate(): void {
        if (this._isCurrentView(CompareViews.Preview) && !this.state.isPreviewContentLoading) {
            this._onPreviewLoadCompleted();
        }
    }

    public componentWillUnmount(): void {
        if (!this.props.storesHub || !this.props.storesHub.comparePageStore) {
            return;
        }

        this.props.storesHub.comparePageStore.removeChangedListener(this._onComparePageStateChanged);
    }

    private _renderPageContent(): JSX.Element {
        const pageContent: JSX.Element[] = [];

        if ((!this._isCurrentView(CompareViews.Compare) && this.state.isPreviewContentLoading) ||
            (this._isCurrentView(CompareViews.Compare) && this.state.isDiffViewContentLoading)) {
            pageContent.push(
                <Spinner
                    label={VCResources.LoadingText}
                    key={"Spinner"}
                    className={"wiki-spinner"}
                />
            );
        }

        if (this.state.item) {
            pageContent.push(
                <div className={"compare-view-container " + (this._isCurrentView(CompareViews.Compare) ? "" : "hidden")}
                    key={"CompareView"}>
                    <DiffViewer
                        className="compare-tab"
                        isVisible={true}
                        hideActionsToolbar={true}
                        hideVersionSelector={true}
                        rightAlignVersionSelectorDropDown={false}
                        hideComments={true}
                        disableDownloadFile={true}
                        hideFileName={false}
                        item={this.state.item}
                        oversion={this.state.oversion}
                        mversion={this.state.mversion}
                        opath={this.state.gitItemPath} // This can be same as it is not a rename
                        mpath={this.state.gitItemPath}
                        discussionManager={undefined}
                        repositoryContext={this.props.storesHub.state.sharedState.commonState.repositoryContext}
                        orientation={this.state.isDiffInline ? DiffViewerOrientation.Inline : DiffViewerOrientation.SideBySide}
                        desiredLine={this.state.diffLines[this.state.currentDiffIndex]}
                        onError={this._onDiffViewerLoadFailed}
                        onDiffLinesChanged={this._onDiffLinesChanged}
                        onOrientationChange={undefined}
                        onLoadComplete={this._onDiffViewerLoadCompleted} />
                </div>
            );
        }

        const fileContent = this.props.storesHub.comparePageStore.state.fileContent;
        if (!this.state.isPreviewContentLoading) {
            pageContent.push(
                <div className={"preview-view-container " + (this._isCurrentView(CompareViews.Preview) ? "" : "hidden")}
                    key={"PreviewView"}>
                    <WikiMarkdownRenderer
                        content={fileContent}
                        wiki={this.props.storesHub.state.sharedState.commonState.wiki}
                        repositoryContext={this.props.storesHub.state.sharedState.commonState.repositoryContext}
                        urlParameters={this.props.storesHub.state.sharedState.urlState}
                        onFragmentLinkClick={this._onFragmentLinkClick}
                    />
                </div>
            );
        }

        return (
            <div className={"item-content"}>
                {pageContent}
            </div>
        );
    }

    @autobind
    private _onFragmentLinkClick(linkParameters: UrlParameters): void {
        this.props.actionCreator.updateUrlSilently(linkParameters, false, false);
    }

    private _getRevisionDetailsTabId = (itemKey: string): string => {
        return `RevisionDetailsTab_${itemKey}`;
    }

    private _onDiffViewerLoadFailed = (error: Error): void => {
        this.props.actionCreator.onAnyDataLoadFailed(error);
    }

    private _onDiffViewerLoadCompleted = (): void => {
        this.props.actionCreator.compareDiffDataLoaded();
        if (!this._isFirstContentRendered) {
            this._onItemContentRenderComplete();
        }
    }

    private _onPreviewLoadCompleted = (): void => {
        if (!this._isFirstContentRendered) {
            const pageContentState = this.props.storesHub.comparePageStore.state;
            const isContentAvailable = pageContentState.gitItemPath
                && (pageContentState.fileContent || pageContentState.fileContent === "");

            if (isContentAvailable) {
                this._onItemContentRenderComplete();
            }
        }
    }

    private _onItemContentRenderComplete(): void {
        this._isFirstContentRendered = true;
        if (this.props.onContentRendered) {
            this.props.onContentRendered();
        }
    }

    private _onPivotClick = (pivotItem: PivotItem) => {
        this.props.actionCreator.changeComparePageView(pivotItem.props.itemKey);
    }

    private _isCurrentView = (expectedView: string): boolean => {
        return expectedView === this.props.storesHub.state.sharedState.urlState.view;
    }

    private _onComparePageStateChanged = (): void => {
        let mversion: string = null;
        let oversion: string = null;
        const comparePageState = this.props.storesHub.state.comparePageState;

        if (comparePageState.itemChangeType === VersionControlChangeType.Edit) {
            mversion = this._getVersion(VersionControlConstants.MCommitVersionPrefix);
            oversion = this._getVersion(VersionControlConstants.OCommitVersionPrefix);
        }

        this.setState({
            gitItemPath: comparePageState.gitItemPath,
            itemChangeType: comparePageState.itemChangeType,
            oversion: oversion,
            mversion: mversion,
            item: comparePageState.item,
            isPreviewContentLoading: comparePageState.isPreviewContentLoading,
            isDiffViewContentLoading: comparePageState.isDiffViewContentLoading,
        } as ItemContentContainerState);
    }

    private _getVersion(versionPrefix: string): string {
        const version = this.props.storesHub.state.comparePageState.version;
        return version ? (versionPrefix + version) : null;
    }

    private _getCommandsInBar = (isDiffInline: boolean): IContextualMenuItem[] => {
        const commands: IContextualMenuItem[] = [];

        if (this._isCurrentView(CompareViews.Compare)) {
            commands.push(
                {
                    key: "goToPreviousDiff",
                    name: VCResources.PreviousDifferenceTooltip,
                    className: "compare-command-item",
                    disabled: !this._canGoToPreviousDiff(),
                    iconProps: { className: "bowtie-icon bowtie-arrow-up" },
                    onClick: this._goToPreviousDiff,
                },
                {
                    key: "goToNextDiff",
                    name: VCResources.NextDifferenceTooltip,
                    className: "compare-command-item",
                    disabled: !this._canGoToNextDiff(),
                    iconProps: { className: "bowtie-icon bowtie-arrow-down" },
                    onClick: this._goToNextDiff,
                },
                {
                    key: "toggleInlineDiff",
                    name: isDiffInline ? VCResources.EditFileDiffSideBySide : VCResources.EditFileDiffInline,
                    className: "compare-command-item",
                    iconProps: { className: "bowtie-icon " + (isDiffInline ? "bowtie-diff-side-by-side" : "bowtie-diff-inline") },
                    onClick: this._toggleEditingDiffInlineClicked,
                },
            );
        }

        return commands;
    }

    private _toggleEditingDiffInlineClicked = (): void => {
        this.setState({ isDiffInline: !this.state.isDiffInline } as ItemContentContainerState);
    }

    private _onDiffLinesChanged = (diffLines: number[]): void => {
        this.setState({ diffLines: diffLines, currentDiffIndex: 0 } as ItemContentContainerState);
    }

    private _goToPreviousDiff = (): void => {
        if (this._canGoToPreviousDiff()) {
            this.setState({ currentDiffIndex: this.state.currentDiffIndex - 1 } as ItemContentContainerState);
        }
    }

    private _goToNextDiff = (): void => {
        if (this._canGoToNextDiff()) {
            this.setState({ currentDiffIndex: this.state.currentDiffIndex + 1 } as ItemContentContainerState);
        }
    }

    private _canGoToPreviousDiff = (): boolean => {
        return this.state.currentDiffIndex > 0 ? true : false;
    }

    private _canGoToNextDiff = (): boolean => {
        return this.state.currentDiffIndex < this.state.diffLines.length - 1 ? true : false;
    }
}
