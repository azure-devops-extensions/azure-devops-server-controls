import * as React from "react";
import * as ReactDOM from "react-dom";

import {
    CheckboxVisibility,
    ConstrainMode,
    DetailsList,
    DetailsListLayoutMode,
    DetailsRow,
    IDetailsRowProps,
    IColumn,
    Selection,
} from "OfficeFabric/DetailsList";
import { Fabric } from "OfficeFabric/Fabric";
import { Link, ILink } from "OfficeFabric/Link";
import { MessageBar, MessageBarType } from "OfficeFabric/MessageBar";
import { Spinner } from "OfficeFabric/Spinner";
import { css } from "OfficeFabric/Utilities";
import { SelectionMode } from "OfficeFabric/utilities/selection/interfaces";
import * as Events_Services from "VSS/Events/Services";
import * as Performance from "VSS/Performance";
import * as Telemetry from "VSS/Telemetry/Services";
import { delegate } from "VSS/Utils/Core";
import * as Utils_String from "VSS/Utils/String";
import * as Utils_UI from "VSS/Utils/UI";

import { EmptyResultPage } from "VersionControl/Scenarios/Shared/EmptyResultPage";
import { GitHistoryDataOptions, IMessage } from "VersionControl/Scenarios/History/GitHistory/Actions/HistoryTabActionsHub";
import { HistoryListColumns, getHistoryDetailsListColumns } from "VersionControl/Scenarios/History/GitHistory/Components/HistoryListColumns";
import { HistoryListProps, HistoryListItem, RenameRow } from "VersionControl/Scenarios/History/GitHistory/Components/HistoryListInterfaces";
import { getListUpdatedEventName } from "VersionControl/Scenarios/History/GitHistory/GitGraph/GraphRow";
import { IHistoryGraph } from "VersionControl/Scenarios/History/GitHistory/GitGraph/HistoryGraphContracts";
import { getCommitId } from "VersionControl/Scenarios/History/GitHistory/HistoryUtils";

import * as CustomerIntelligenceConstants from "VersionControl/Scripts/CustomerIntelligenceConstants";
import { CustomerIntelligenceData } from "VersionControl/Scripts/CustomerIntelligenceData";
import { HistoryEntry, VersionControlChangeType, GitObjectType, GitHistoryQueryResults } from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";
import { RepositoryContext } from "VersionControl/Scripts/RepositoryContext";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import * as VCOM from "VersionControl/Scripts/TFS.VersionControl";

import "VSS/LoaderPlugins/Css!Site";
import "VSS/LoaderPlugins/Css!fabric";
import "VSS/LoaderPlugins/Css!VersionControl/HistoryList";

// If infinite scroll enabled, more history items are pre-fetched if the scroll bar is less than infiniteScrollFetchBefore
// away from the bottom. 32px is the height of a single row.
const infiniteScrollFetchBefore = 5 * 32;

export interface DetailsListContent {
    historyListItems: HistoryListItem[];
    isRenameHistoryEmpty: boolean;
}

export class HistoryList extends React.Component<HistoryListProps, {}> {
    private _showMoreHistoryScenario: Performance.IScenarioDescriptor;
    private _showRenameHistoryScenario: Performance.IScenarioDescriptor;
    private _onResizeDelegate: IArgsFunctionR<void>;
    private _historydetailListRefs: any[] = [];
    private _detailsListContainerRef: HTMLDivElement;
    private _focusRenameRowIndex: number = -1;
    private _focusRenameElementRef: ILink = null;
    private _nextFocusRowIndex: number = -1;
    private _nextFocusRowElementRef: DetailsRow = null;
    private _isShowRenameHistoryRowAdded: boolean;
    private _selectionTracker: Selection;

    constructor(props: HistoryListProps, context?: any) {
        super(props, context);

        this._selectionTracker = new Selection({
            onSelectionChanged: () => {
                const selection = (this._selectionTracker.getSelection() as HistoryListItem[]);
                const selectedItem = selection && selection[0];

                if (selectedItem && selectedItem.item && this.props.gitGraph) {
                    const commitId = getCommitId(selectedItem.item.changeList, true);
                    this.props.onGraphRowSelected(commitId);
                }

                if (this.props.onSelectionChanged) {
                    this.props.onSelectionChanged(selection);
                }
            }
        });
    }

    public componentDidMount(): void {
        // When the splitter is moved the container of the list gets resized. As the props for the DetailsList remain
        // unchanged we need to call forceUpdate on the DetailsList so that it is re- evaluated according to the new container
        // and the viewport is also recalculated.
        if (!this._onResizeDelegate) {
            this._onResizeDelegate = delegate(this, this._onResize);
        }

        $(window).on("resize", this._onResizeDelegate);
        this._onDrawComplete();
    }

    public componentDidUpdate(): void {
        // If props demand to clear selection, clear selection on all the items in the list
        if (this.props.clearSelection && this._selectionTracker) {
            this._selectionTracker.setAllSelected(false);
        }

        // Scroll to the top of history page in case error has occurred
        if (this.props.error && !this.props.isLoading) {
            Utils_UI.Positioning.scrollIntoViewVertical($(".error-message"), Utils_UI.Positioning.VerticalScrollBehavior.Top);
        }

        // Focus is retained on the show/hide rename link row after it has been expanded or collapsed using Enter key
        if (this._focusRenameElementRef) {
            this._focusRenameElementRef.focus();
            this._focusRenameElementRef = null;
            this._focusRenameRowIndex = -1;
        }

        // Set focus on the next focus row only if more elements are rendered after it
        if (this._nextFocusRowElementRef
            && this.props.historyResults
            && this.props.historyResults.results
            && this.props.historyResults.results.length > (this._nextFocusRowIndex + 1)) {
            this._nextFocusRowElementRef.focus();
            this._nextFocusRowElementRef = null;
            
            // Setting the selection also to the same index. Having a timeout callback to avoid action-in-action warning
            setTimeout(() => {
                if (this._nextFocusRowIndex > -1) {
                    this._selectionTracker.setAllSelected(false);
                    this._selectionTracker.setIndexSelected(this._nextFocusRowIndex, true, true);
                    this._nextFocusRowIndex = -1;
                }
            }, 50);
        }
        
        this._onDrawComplete();
    }

    public componentWillUnmount(): void {
        if (this._onResizeDelegate) {
            $(window).off("resize", this._onResizeDelegate);
            this._onResizeDelegate = null;
        }

        this._historydetailListRefs = [];
        this._focusRenameElementRef = null;
    }

    public render(): JSX.Element {
        // resetting details list refs before each render
        this._historydetailListRefs = [];
        if (this.props.infiniteScroll) {
            return (
                <Fabric className="vc-hl-auto-scroll-relative">
                    <div ref={(ref: HTMLDivElement) => this._detailsListContainerRef = ref}
                        onScroll={this._fetchMoreHistoryIfNeeded}
                        onLoad={this._fetchMoreHistoryIfNeeded}
                        className={css("vc-hl-auto-scroll-absolute", this.props.className)}
                        tabIndex={-1}>
                        {this._getDetailsList()}
                    </div>
                </Fabric>
            );
        }
        else {
            return (<Fabric className={this.props.className}>{this._getDetailsList()}</Fabric>);
        }
    }

    // public for UTs
    public _showMoreHistory = (): void => {
        if (!this.props.isLoading && !this.props.isArtifactsLoading) {
            if (!this.props.historyResults) {
                return;
            }

            this._showMoreHistoryScenario = Performance.getScenarioManager()
                .startScenario(CustomerIntelligenceConstants.VERSION_CONTROL_AREA, CustomerIntelligenceConstants.HISTORYLIST_SHOWMORE_PERF);

            // After fetchMoreItems load more data, we will set focus on the last item which was above show more link
            this._nextFocusRowIndex = this.props.historyResults.results.length - 1;
            this.props.fetchMoreItems();
        }
    }

    // Making it public for UT
    public _getDetailsList(): JSX.Element[] {
        const historyResults = this.props.historyResults;
        let historyResultsEntries: HistoryEntry[] = [];
        let headerVisible: boolean = true;
        const results: JSX.Element[] = [];

        if (historyResults) {
            historyResultsEntries = historyResults.results;
        }

        if (this.props.headerVisible != undefined) {
            headerVisible = this.props.headerVisible;
        }

        if (this.props.shouldDisplayError && this.props.error) {
            results.push(<MessageBar
                className={"error-message"}
                key={"ErrorMessage"}
                messageBarType={MessageBarType.error}>
                {this.props.error.message}
            </MessageBar>);
        }

        if (this.props.dataOptions) {
            if (!this.props.isLoading && historyResultsEntries.length === 0 && !this.props.error) {
                results.push(
                    <EmptyResultPage
                        key={"EmptyResultPage"}
                        title={VCResources.EmptyHistoryResultTitle}
                        message={VCResources.EmptyGitHistoryResultMessage} />);
            }
            else {
                // Need to show the headers along with spinner for the commit details list 
                // when the results are getting fetched
                if (historyResultsEntries.length === 0 && headerVisible) {
                    results.push(
                        <DetailsList
                            key={"DetailsListHeader"}
                            items={historyResultsEntries}
                            columns={this._getHistoryDetailsListColumns()}
                            layoutMode={DetailsListLayoutMode.justified}
                            constrainMode={ConstrainMode.unconstrained}
                            isHeaderVisible={true}
                            selectionMode={SelectionMode.single}
                            selection={this._selectionTracker}
                            selectionPreservedOnEmptyClick={true}
                            setKey={"set"} // A key that uniquely identifies the given items. The selection will be reset when the key changes or if not provided
                            checkboxVisibility={CheckboxVisibility.hidden}
                            className={"vc-history-detailsList"} />
                    );
                }
                else {
                    const detailsListContent: DetailsListContent = this._getHistoryListItems(historyResultsEntries);
                    results.push(<DetailsList ref={(element) => this._historydetailListRefs.push(element)}
                        key={"DetailsListContent"}
                        items={detailsListContent.historyListItems}
                        onRenderRow={this._onRenderRow}
                        columns={this._getHistoryDetailsListColumns()}
                        layoutMode={DetailsListLayoutMode.justified}
                        constrainMode={ConstrainMode.unconstrained}
                        isHeaderVisible={headerVisible}
                        selectionMode={SelectionMode.single}
                        selection={this._selectionTracker}
                        setKey={"setContent"} // A key that uniquely identifies the given items. The selection will be reset when the key changes or if not provided
                        checkboxVisibility={CheckboxVisibility.hidden}
                        className={"vc-history-detailsList"}
                        onDidUpdate={() => {
                            Events_Services.getService().fire(getListUpdatedEventName());
                        }}
                    />);

                    // on expanding rename history if the results doesn't match the current filter criteria empty message will be displayed
                    if (detailsListContent.isRenameHistoryEmpty) {
                        results.push(<div role="alert" key={"EmptyMessage"} className={"empty-rename-history"}>
                            {VCResources.EmptyRenameHistory}
                        </div>);
                    }
                }
            }
        } else if (this.props.isLoading) {
            // Only when no data has been loaded yet
            results.push(<Spinner key={"Spinner"} className={"vc-history-spinner"} label={VCResources.FetchingResultsText} />);
        }

        return results;
    }

    // Making it public for UT
    public _getHistoryDetailsListColumns(): IColumn[] {
        return getHistoryDetailsListColumns(this.props);
    }

    // Making it public for Ut
    public _getRenameHistoryLink(historyListItem: HistoryListItem, itemIndex: number): JSX.Element {
        let renameIconClass: string;
        let renameLinkText: string;
        let keyPrefix: string;

        if (historyListItem.renameRow.isHideRename) {
            renameIconClass = "vc-rename-link-icon bowtie-icon bowtie-chevron-down";

            if (historyListItem.renameRow.oldFileName.length > 0) {
                renameLinkText = Utils_String.format(VCResources.HideRenameHistoryFileName, historyListItem.renameRow.oldFileName);
            }
            else {
                renameLinkText = Utils_String.format(VCResources.HideRenameHistory);
            }
            keyPrefix = "H";
        }
        else {
            renameIconClass = "vc-rename-link-icon bowtie-icon bowtie-chevron-right";
            renameLinkText = Utils_String.format(VCResources.ShowRenameHistory);
            keyPrefix = "S";
        }

        return (<Link
            componentRef={(element: ILink) => {
                if (this._focusRenameRowIndex === itemIndex) {
                    this._focusRenameElementRef = element;
                }
            }
            }
            className={"vc-show-hide-rename-link"}
            key={keyPrefix + historyListItem.item.serverItem}
            title={renameLinkText}
            aria-label={renameLinkText}
            onClick={() => { this._showHideRenameHistory(historyListItem, itemIndex); }}>
            <span className={renameIconClass}></span>
            <span className={"inline text-dark change-link"}>{renameLinkText}</span>
        </Link>);
    }

    // Making it public for UT
    public _showHideRenameHistory(historyListItem: HistoryListItem, itemIndex: number): void {
        // save the index of the rename link which was clicked for accessibility
        this._focusRenameRowIndex = itemIndex;

        // Expand link
        if (!historyListItem.renameRow.isHideRename) {
            this._showRenameHistoryScenario = Performance.getScenarioManager()
                .startScenario(CustomerIntelligenceConstants.VERSION_CONTROL_AREA, CustomerIntelligenceConstants.HISTORYLIST_SHOWRENAME_PERF);

            const historyResults = this.props.historyResults;
            let historyResultsEntries: HistoryEntry[] = [];
            if (historyResults) {
                historyResultsEntries = historyResults.results;
            }
            if (historyResultsEntries && historyResultsEntries.length > 0) {
                const historyResultEntriesLength = historyResultsEntries.length - 1;
                const gitCommit = getCommitId(historyListItem.item.changeList);

                const lastItem: HistoryEntry = historyResultsEntries[historyResultEntriesLength];
                const lastCommit = getCommitId(lastItem.changeList);

                // If the commit that we are looking for is the last entry then client doesn't have data. Make a server call
                if (gitCommit === lastCommit) {
                    this.props.fetchRenameHistory(historyListItem.item);
                }
                // else show till the next rename commit or the last commit in the list (whichever comes first)
                else {
                    const currentItemIndex: number = this._findIndex(historyResultsEntries, gitCommit);
                    let nextDisplayItem: HistoryEntry = this._findNextRename(historyResultsEntries, currentItemIndex + 1);

                    // if there was no rename commit, update it to the last commit in the array
                    if (nextDisplayItem === null) {
                        nextDisplayItem = lastItem;
                    }

                    // update the lastdispalyedcommit in store's state
                    this._updateLastDisplayedCommitId(nextDisplayItem);
                }
            }
        }
        // Collapse Link
        else {
            this._updateLastDisplayedCommitId(historyListItem.item);
        }
        this._recordTelemetry(CustomerIntelligenceConstants.HISTORYLIST_SHOWHIDE_RENAME_HISTORY, {
            "showRename": historyListItem.renameRow.isHideRename ? "false" : "true"
        });
    }

    // Making it public for testing
    // Find the index of the item whose history has to be expanded
    public _findIndex(historyResultsEntries: HistoryEntry[], gitCommit: string): number {
        let itemIndex: number = -1;
        let currItemCommit = null;

        historyResultsEntries.forEach((currItem: HistoryEntry, index: number) => {
            currItemCommit = getCommitId(currItem.changeList);
            if (gitCommit === currItemCommit) {
                itemIndex = index;
                return false;
            }
        });
        return itemIndex;
    }

    // Making it public for testing
    // Find the next rename commit in the list
    public _findNextRename(historyResultsEntries: HistoryEntry[], itemIndex: number): HistoryEntry {
        let nextDisplayItem: HistoryEntry = null;

        for (let i = itemIndex; i < historyResultsEntries.length; i++) {
            if (VCOM.ChangeType.hasChangeFlag(historyResultsEntries[i].itemChangeType, VersionControlChangeType.Rename)) {
                nextDisplayItem = historyResultsEntries[i];
                break;
            }
        }

        return nextDisplayItem;
    }

    private _fetchMoreHistoryIfNeeded = (): void => {
        if (this._detailsListContainerRef && this.props.infiniteScroll
            && this.props.historyResults && this.props.historyResults.moreResultsAvailable
            && !this.props.isLoading
            && !this.props.isArtifactsLoading
            && !this._isShowRenameHistoryRowAdded) {
            const viewPortBottom = this._detailsListContainerRef.clientHeight + this._detailsListContainerRef.scrollTop;
            const totalHeight = this._detailsListContainerRef.scrollHeight;

            if (totalHeight - viewPortBottom < infiniteScrollFetchBefore) {
                this._showMoreHistory();
            }
        }
    }

    private _onResize(): void {
        const historyListElement = ReactDOM.findDOMNode(this) as HTMLDivElement;
        if ($(historyListElement).is(":visible")) {
            this._historydetailListRefs.forEach((element: DetailsList) => {
                if (!!element) {
                    element.forceUpdate();
                }
            });
        }
        this._fetchMoreHistoryIfNeeded();
    }

    private _constructHistoryListRenameRowItem(historyEntryItem: HistoryEntry, isHideRename: boolean, oldFileName: string): HistoryListItem {
        const hideRenameRow: RenameRow = {
            isHideRename: isHideRename,
            oldFileName: oldFileName,
        };
        const historyListRowtItem: HistoryListItem = {
            item: historyEntryItem,
            renameRow: hideRenameRow,
        };

        return historyListRowtItem;
    }

    private _getHistoryListItems(historyResultsEntries: HistoryEntry[]): DetailsListContent {
        const historyListItems: HistoryListItem[] = [];
        let isRenameHistoryEmpty: boolean = false;
        this._isShowRenameHistoryRowAdded = false;
        
        for (let i = 0; i < historyResultsEntries.length; i++) {
            const historyEntryItem: HistoryEntry = historyResultsEntries[i];
            const gitCommit = getCommitId(historyEntryItem.changeList);

            const historyListItem: HistoryListItem = { item: historyEntryItem };
            historyListItems.push(historyListItem);

            // If it is a Rename change
            if (historyEntryItem && VCOM.ChangeType.hasChangeFlag(historyEntryItem.itemChangeType, VersionControlChangeType.Rename)) {
                // Do not display ShowRename row while data is being fetched
                if (!this.props.isLoading && gitCommit === this.props.lastDisplayedCommit) {
                    // Push Show rename row
                    if (this.props.shouldFetchRenameHistory) {
                        historyListItems.push(this._constructHistoryListRenameRowItem(historyEntryItem, false, ""));
                        this._isShowRenameHistoryRowAdded = true;
                    }
                    // If it is the last displayed commit because there is no rename history commits
                    // that match the current filter criteria then push hide rename row and the empty message
                    else {
                        historyListItems.push(this._constructHistoryListRenameRowItem(historyEntryItem, true, ""));
                        isRenameHistoryEmpty = true;
                    }
                    break;
                }
                // push Hide rename row
                else {
                    let oldFile: string = "";
                    if (i + 1 < historyResultsEntries.length) {
                        oldFile = historyResultsEntries[i + 1].serverItem || "";
                    }

                    historyListItems.push(this._constructHistoryListRenameRowItem(historyEntryItem, true, oldFile));
                }
            }

            if (i === historyResultsEntries.length - 1) {
                let lastHistoryItem: HistoryListItem;

                if (this._shouldAddSpinner()) {
                    lastHistoryItem = {
                        isSpinnerItem: true
                    } as HistoryListItem;
                } else if (this._shouldAddShowMoreLink()) {
                    lastHistoryItem = {
                        isShowMoreLinkItem: true
                    } as HistoryListItem;
                }

                if (lastHistoryItem) {
                    // Adding empty item for show more link/spinner
                    historyListItems.push(lastHistoryItem);
                }
            }
        }

        const detailsListContent: DetailsListContent = {
            historyListItems: historyListItems,
            isRenameHistoryEmpty: isRenameHistoryEmpty,
        };
        return detailsListContent;
    }

    private _onRenderRow = (props: IDetailsRowProps): JSX.Element => {
        if (props.item.renameRow) {
            // Adding rename link
            return (this._getRenameHistoryLink(props.item, props.itemIndex));
        } else if (props.item.isSpinnerItem) {
            // Adding spinner
            return <Spinner key={"Spinner"} className={"vc-history-spinner"} label={VCResources.FetchingResultsText} />;
        } else if (props.item.isShowMoreLinkItem) {
            // Adding show more link
            return <Link
                id="vc-history-list-show-more"
                onClick={this._showMoreHistory}
                key="ShowMore">
                {VCResources.ShowMore}
            </Link>;
        } else {
            // Adding normal history list row
            const updateNextFocusableListItemRef = (element: DetailsRow) => {
                if (props.itemIndex === this._nextFocusRowIndex) {
                    this._nextFocusRowElementRef = element;
                }
            };

            return (<DetailsRow ref={updateNextFocusableListItemRef} {...props} />);
        }
    }

    private _updateLastDisplayedCommitId(item: HistoryEntry): void {
        if (this.props.updateLastDisplayedCommitId) {
            this.props.updateLastDisplayedCommitId(getCommitId(item.changeList));
        }
    }

    private _onDrawComplete(): void {
        if (!this.props.isLoading) {
            if (this.props.onScenarioComplete) {
                this.props.onScenarioComplete("drawHistoryListComplete");
            }
            if (this._showMoreHistoryScenario && this._showMoreHistoryScenario.isActive()) {
                this._showMoreHistoryScenario.end();
            }
            if (this._showRenameHistoryScenario && this._showRenameHistoryScenario.isActive()) {
                this._showRenameHistoryScenario.end();
            }
        }
    }

    private _recordTelemetry(featureName: string, properties: { [x: string]: string }): void {
        const ciData = new Telemetry.TelemetryEventData(
            CustomerIntelligenceConstants.VERSION_CONTROL_AREA,
            featureName,
            properties);

        if (this.props.telemetryEventData) {
            ciData.area = this.props.telemetryEventData.area ? this.props.telemetryEventData.area : ciData.area;
            ciData.properties = $.extend({}, properties, this.props.telemetryEventData.properties);
        }

        Telemetry.publishEvent(ciData);
    }

    private _shouldAddSpinner(): boolean {
        return this.props.isLoading;
    }

    private _shouldAddShowMoreLink(): boolean {
        return this.props.historyResults
            && this.props.historyResults.moreResultsAvailable
            && !this._isShowRenameHistoryRowAdded;
    }
}