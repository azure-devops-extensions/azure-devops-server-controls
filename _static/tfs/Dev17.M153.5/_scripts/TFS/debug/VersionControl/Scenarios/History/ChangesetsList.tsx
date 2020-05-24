import * as React from "react";
import {
    CheckboxVisibility,
    ConstrainMode,
    DetailsRow,
    IColumn,
    IDetailsRowProps,
    SelectionMode,
    Selection
} from "OfficeFabric/DetailsList";
import { IGroup, IGroupDividerProps } from "OfficeFabric/GroupedList";
import { Link } from "OfficeFabric/Link";
import { Spinner } from "OfficeFabric/Spinner";
import * as Utils_String from "VSS/Utils/String";
import { VssDetailsList } from "VSSUI/VssDetailsList";

import { AvatarImageSize } from "VersionControl/Scenarios/Shared/AvatarImageInterfaces";

import { AvatarImageCard } from "VersionControl/Scenarios/History/AvatarImageCard";
import { ChangesHistoryListItem } from "VersionControl/Scenarios/History/ChangesHistoryListItem";
import { GroupHeader } from "VersionControl/Scenarios/History/GroupHeader";
import { Item } from "VersionControl/Scenarios/History/ListInterfaces";
import * as ListSharedUtils from "VersionControl/Scenarios/History/ListSharedUtils";
import { ChangeSetsListItem } from "VersionControl/Scenarios/History/TfvcHistory/TfvcInterfaces";
import { FetchingResultsText } from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";

import { TfsChangeList, VersionControlChangeType } from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";
import { RepositoryContext } from "VersionControl/Scripts/RepositoryContext";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import * as VCOM from "VersionControl/Scripts/TFS.VersionControl";
import "VSS/LoaderPlugins/Css!VersionControl/ChangesHistoryList";

const getLeftPadding = (indentLevel: number) => indentLevel * 20;

export interface ChangesetsListProps {
    historyEntries: ChangeSetsListItem[];
    repositoryContext: RepositoryContext;
    isLoading: boolean;
    onSelectionChanged?(selection: ChangeSetsListItem[]): void;
    selectionMode?: SelectionMode;
    onExpandHistory?(item: ChangeSetsListItem): void;
    onCollapseHistory?(item: ChangeSetsListItem): void;
    onScenarioComplete?(splitTimingName: string): void;
    addShowMoreLink?: boolean;
    onShowMoreLinkClick?(): void;
}

class ChangesetsItem implements Item {
    historyEntry: ChangeSetsListItem;

    constructor(historyEntry: ChangeSetsListItem) {
        this.historyEntry = historyEntry;
    }

    public get date(): Date {
        if (this.historyEntry.item) {
            return this.historyEntry.item.changeList.creationDate;
        }
    }

    public get item(): ChangeSetsListItem {
        return this.historyEntry;
    }
}

interface ChangesetsListState {
    listItemHeight: number;
    groupHeaderHeight: number;
}

export class ChangesetsList extends React.Component<ChangesetsListProps, ChangesetsListState>{
    private _totalGroupsCount: number;
    private _columns: IColumn[] = [];
    private _lastListElementRef: DetailsRow;
    private _setFocusOnLastListElement: boolean = false;
    private _selectionTracker: Selection;
    private _listItemDefaultHeight: number = 56;
    private _groupHeaderDefaultHeight: number = 24;
    private _changesetListRef: HTMLDivElement;
    private _groupHeaderRef: HTMLDivElement;

    constructor(props: ChangesetsListProps) {
        super(props);
        if (this.props.onSelectionChanged) {
            this._selectionTracker = new Selection({
                onSelectionChanged: () => this.props.onSelectionChanged(this._selectionTracker.getSelection() as ChangeSetsListItem[])
            });
        }

        this.state = {
            listItemHeight: this._listItemDefaultHeight,
            groupHeaderHeight: this._groupHeaderDefaultHeight
        }

        this._populateChangesHistoryColumns();
    }

    public render(): JSX.Element {
        if (this.props.historyEntries && this.props.historyEntries.length > 0) {
            const historyEntries: ChangeSetsListItem[] = this._getHistoryEntries();

            return (
                <VssDetailsList
                    key={"changes-history-list"}
                    className={"changes-history-list"}
                    items={historyEntries}
                    isHeaderVisible={false}
                    groups={this._getGroupsByDate(historyEntries)}
                    columns={this._columns}
                    onRenderRow={this._onRenderRow}
                    constrainMode={ConstrainMode.unconstrained}
                    getGroupHeight={this._getGroupHeight}
                    groupProps={
                        {
                            onRenderHeader: this._onRenderHeader
                        }}
                    selectionMode={this.props.selectionMode || SelectionMode.none}
                    selection={this._selectionTracker}
                    setKey={"set"} // A key that uniquely identifies the given items. The selection will be reset when the key changes or if not provided
                    checkboxVisibility={CheckboxVisibility.hidden}
                />
            );
        }
        else {
            return null;
        }
    }

    public componentDidMount(): void {
        // Problem: We need to pass the correct height of each group in GroupedList
        // Calculating the height of the group inside componentDidMount of groupedList was showing height 0
        // as the groups and rows of list haven't been rendered yet
        // Setting a timeout resolves this issue as it gets fired asynchronously after groups rendering has been done.
        setTimeout(() => {
            let listItemHeight = this.state.listItemHeight;
            let groupHeaderHeight = this.state.groupHeaderHeight;
            if (this._changesetListRef) {
                listItemHeight = this._changesetListRef.clientHeight;
            }
            if (this._groupHeaderRef) {
                groupHeaderHeight = this._groupHeaderRef.clientHeight;
            }
            this.setState({ listItemHeight, groupHeaderHeight });

        }, 0);

        this._onDrawComplete();
    }

    public componentDidUpdate(): void {
        if (this._setFocusOnLastListElement && this._lastListElementRef) {
            this._lastListElementRef.focus();

            this._lastListElementRef = null;
            this._setFocusOnLastListElement = false;
        }
    }

    public componentWillUnmount(): void {
        this._changesetListRef = null;
        this._groupHeaderRef = null;
    }

    private _getGroupHeight = (group: IGroup) => {
        return this.state.groupHeaderHeight + this.state.listItemHeight * group.count;
    }

    private _getHistoryEntries(): ChangeSetsListItem[] {
        const historyEntries: ChangeSetsListItem[] = $.extend(true, [], this.props.historyEntries) || [];

        const lastHistoryItem: ChangeSetsListItem = $.extend(true, {}, historyEntries[historyEntries.length - 1]);
        if (lastHistoryItem) {
            let addLastItem: boolean = false;

            if (this._shouldAddSpinner()) {
                lastHistoryItem.isSpinnerItem = true;
                addLastItem = true;
            } else if (this._shouldAddShowMoreLink()) {
                lastHistoryItem.isShowMoreLinkItem = true;
                addLastItem = true;
            }

            if (addLastItem) {
                // Adding empty item for show more link/spinner
                historyEntries.push(lastHistoryItem);
            }
        }

        return historyEntries;
    }

    private _shouldAddSpinner(): boolean {
        return this.props.isLoading;
    }

    private _shouldAddShowMoreLink(): boolean {
        return this.props.addShowMoreLink;
    }

    private _onShowMoreLinkClick = (): void => {
        this._setFocusOnLastListElement = true;

        // Now, call the showMore link click handler
        this.props.onShowMoreLinkClick();
    }

    private _onRenderRow = (props: IDetailsRowProps): JSX.Element => {
        const item = props.item;
        let renderElement: JSX.Element;

        if (item.isSpinnerItem) {
            renderElement = <Spinner key={"Spinner"} className={"vc-history-spinner"} label={FetchingResultsText} />;
        } else if (item.isShowMoreLinkItem) {
            return (
                <Link
                    className="changeset-list-row show-more-link"
                    onClick={this._onShowMoreLinkClick}
                    key="ShowMore">
                    {VCResources.ShowMore}
                </Link>
            );
        } else if (item.changeLinkRow) {
            renderElement = this._renderChangeLinkRow(item);
        }
        else {
            const updateLastListElementRef = (element: DetailsRow): void => {
                if (props.itemIndex === this.props.historyEntries.length - 1) {
                    this._lastListElementRef = element;
                }
            };

            renderElement = (<DetailsRow ref={updateLastListElementRef} {...props} />);
        }

        return (
            <div ref={el => this._changesetListRef = el} className={"changeset-result"}>
                {renderElement}
            </div>
            );
    }

    private _getGroupsByDate(historyEntries: ChangeSetsListItem[]): IGroup[] {
        let groupsByDate: IGroup[] = [];
        if (!historyEntries) {
            return groupsByDate;
        }

        const items = [] as ChangesetsItem[];
        for (let i = 0; i < historyEntries.length; i++) {
            items.push(new ChangesetsItem(historyEntries[i]));
        }
        groupsByDate = ListSharedUtils.getGroupsByDate(items as Item[], false);

        return groupsByDate;
    }

    private _populateChangesHistoryColumns(): void {
        const changesHistoryColumn: IColumn = {
            key: "changesHistory",
            name: "changesHistory",
            fieldName: null,
            minWidth: 600,
            onRender: this._onRenderChangesHistoryColumn
        };

        this._columns.push(changesHistoryColumn);
    }

    private _renderChangeLinkRow = (item: ChangeSetsListItem): JSX.Element => {
        const leftPadding = getLeftPadding(item.itemDepth);
        let changeType: string;
        let emptyHistoryMessage: string;

        if (VCOM.ChangeType.hasChangeFlag(item.changeLinkRow.changeType, VersionControlChangeType.Branch)) {
            changeType = VCResources.ChangeTypeBranch;
        }
        else if (VCOM.ChangeType.hasChangeFlag(item.changeLinkRow.changeType, VersionControlChangeType.Merge)) {
            changeType = VCResources.ChangeTypeMerge;
        }
        else {
            changeType = VCResources.ChangeTypeRename;
        }

        let linkText;
        if (item.changeLinkRow.isExpanded) {
            if (item.changeLinkRow.oldFileName.length > 0) {
                linkText = Utils_String.format(VCResources.HideHistoryLinkText, changeType, item.changeLinkRow.oldFileName);
            }
            else {
                linkText = Utils_String.format(VCResources.HistoryCollapseChildLinkFormat, changeType);
            }
        }
        else {
            linkText = Utils_String.format(VCResources.HistoryExpandChildLinkFormat, changeType);
        }

        if (item.changeLinkRow.isExpandedHistoryEmpty) {
            emptyHistoryMessage = Utils_String.format(VCResources.EmptyChangesetsHistoryMessage, changeType);
        }

        const chevronClass = item.changeLinkRow.isExpanded ? "bowtie-chevron-down bowtie-icon" : "bowtie-chevron-right bowtie-icon";

        return (
            <div className="changeset-link-item" style={{ paddingLeft: leftPadding }}>
                <Link
                    className="expand-changes-history-link"
                    onClick={item.changeLinkRow.isExpanded ? () => this.props.onCollapseHistory(item) : () => this.props.onExpandHistory(item)}>
                    <span className={chevronClass}></span>
                    {linkText}
                </Link>
                {
                    item.changeLinkRow.isLoadingHistory &&
                    <Spinner key={"Spinner"} className={"vc-history-spinner"} label={FetchingResultsText} />
                }
                {
                    item.changeLinkRow.isExpandedHistoryEmpty &&
                    <div>
                        {emptyHistoryMessage}
                    </div>
                }
            </div>
        );
    }

    private _onRenderChangesHistoryColumn = (item: ChangeSetsListItem): JSX.Element => {
        const leftPadding = getLeftPadding(item.itemDepth);

        const emailTitle: string = item.item.changeList.owner;
        const name = item.item.changeList.ownerDisplayName;
        const id = item.item.changeList.ownerId;
        const imageProperties = {
            email: emailTitle,
            displayName: name,
            identityId: id,
            size: AvatarImageSize.SmallPlus,
        };

        return (
            <div className="changeset-list-item" style={{ paddingLeft: leftPadding }}>
                <AvatarImageCard
                    imageProperties={imageProperties}>
                        <ChangesHistoryListItem
                        changeList={item.item.changeList as TfsChangeList}
                        itemChangeType={item.item.itemChangeType}
                        serverItem={item.item.serverItem}
                        repositoryContext={this.props.repositoryContext} />
                </AvatarImageCard>
            </div>
        );
    }

    private _getGroupHeaderSecondaryText(count: number): string {
        const changesCount: number = count;
        let changesText: string;
        changesText = changesCount > 1
            ? Utils_String.localeFormat(VCResources.ChangesetsGroupTitle_Plural, changesCount)
            : Utils_String.localeFormat(VCResources.ChangesetsGroupTitle_Singular, changesCount);

        return changesText;
    }

    private _onRenderHeader = (props: IGroupDividerProps): JSX.Element => {
        let nonChangesetItemsCount = 0;
        const groupIndent = (props.group && props.group.data && props.group.data.length > 0) ? props.group.data[0].item.itemDepth : 0;
        // counting number of links/show more link/spinner in the group so that they don't get included in number of changesets . 

        for (let j = 0; j < props.group.count; j++) {
            if (props.group.data[j].item && (props.group.data[j].item.changeLinkRow || props.group.data[j].item.isSpinnerItem || props.group.data[j].item.isShowMoreLinkItem)) {
                nonChangesetItemsCount++;
            }
        }

        const leftPadding = getLeftPadding(groupIndent);
        const changesetCount = props.group.count - nonChangesetItemsCount;
        const changesetCountText = this._getGroupHeaderSecondaryText(changesetCount);

        return (
            <div style={{ paddingLeft: leftPadding }}>
                <GroupHeader
                    groupHeaderRef={el => this._groupHeaderRef = el}
                    groupName={props.group.name}
                    countText={changesetCountText} />
            </div>
        );
    }

    private _onDrawComplete = (): void => {
        if (!this.props.isLoading) {
            if (this.props.onScenarioComplete) {
                this.props.onScenarioComplete("drawChangesHistoryListComplete");
            }
        }
    }
}