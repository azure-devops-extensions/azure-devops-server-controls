import * as React from "react";
import {
    CheckboxVisibility,
    ConstrainMode,
    DetailsList,
    DetailsRow,
    IColumn,
    IDetailsRowProps,
    Selection,
    SelectionMode
} from "OfficeFabric/DetailsList";
import { IGroup, IGroupDividerProps } from "OfficeFabric/GroupedList";
import * as Utils_String from "VSS/Utils/String";
import { VssDetailsList } from "VSSUI/VssDetailsList";

import { AvatarImageCard } from "VersionControl/Scenarios/History/AvatarImageCard";
import { ChangesHistoryListItem } from "VersionControl/Scenarios/History/ChangesHistoryListItem";
import { GroupHeader } from "VersionControl/Scenarios/History/GroupHeader";
import { Item } from "VersionControl/Scenarios/History/ListInterfaces";
import * as ListSharedUtils from "VersionControl/Scenarios/History/ListSharedUtils";
import { AvatarImageSize } from "VersionControl/Scenarios/Shared/AvatarImageInterfaces";
import { AvatarUtils } from "VersionControl/Scenarios/Shared/AvatarUtils";
import { HistoryEntry, TfsChangeList } from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";
import { RepositoryContext } from "VersionControl/Scripts/RepositoryContext";
import { ChangesetsGroupTitle_Plural,
    ChangesetsGroupTitle_Singular,
    ShelvesetsGroupTitle_Plural,
    ShelvesetsGroupTitle_Singular
} from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import "VSS/LoaderPlugins/Css!VersionControl/ChangesHistoryList";

class ChangesHistoryItem implements Item {
    historyEntry: HistoryEntry;

    constructor(historyEntry: HistoryEntry) {
        this.historyEntry = historyEntry;
    }

    public get date(): Date {
        return this.historyEntry.changeList.creationDate;
    }

    public get item(): HistoryEntry {
        return this.historyEntry;
    }
}

export interface ChangesHistoryListProps {
    historyEntries: HistoryEntry[];
    repositoryContext: RepositoryContext;
    isLoading: boolean;
    hasMoreUpdates?: boolean;
    selectionMode?: SelectionMode;
    onSelectionChanged?(selection: HistoryEntry[]): void;
    onRenderMissingItem?(index: number): React.ReactNode;
    onScenarioComplete?(splitTimingName: string): void;
}

interface ChangesHistoryListState {
    listItemHeight: number;
    groupHeaderHeight: number;
}

export class ChangesHistoryList extends React.Component<ChangesHistoryListProps, ChangesHistoryListState> {
    private _isShelvesetList: boolean;
    private _totalGroupsCount: number;
    private _columns: IColumn[] = [];
    private _selectionTracker: Selection;
    private _listItemDefaultHeight: number = 56;
    private _groupHeaderDefaultHeight: number = 24;
    private _changesetListRef: HTMLDivElement;
    private _groupHeaderRef: HTMLDivElement;

    constructor(props: ChangesHistoryListProps) {
        super(props);

        this._populateChangesHistoryColumns();
        if (this.props.historyEntries && this.props.historyEntries.length > 0) {
            this._isShelvesetList = (this.props.historyEntries[0].changeList as TfsChangeList).isShelveset;
        }

        if (this.props.onSelectionChanged) {
            this._selectionTracker = new Selection({
                onSelectionChanged: () => this.props.onSelectionChanged(this._selectionTracker.getSelection() as HistoryEntry[])
            });
        }

        this.state = {
            listItemHeight: this._listItemDefaultHeight,
            groupHeaderHeight: this._groupHeaderDefaultHeight
        }
    }

    public render(): JSX.Element {
        const historyEntries: HistoryEntry[] = $.extend(true, [], this.props.historyEntries);

        if (historyEntries.length > 0) {
            if (this.props.hasMoreUpdates && !this.props.isLoading && this.props.onRenderMissingItem) {
                historyEntries.push(undefined);
            }
            return (
                <VssDetailsList
                    key={"changes-history-list"}
                    className={"changes-history-list"}
                    items={historyEntries}
                    isHeaderVisible={false}
                    groups={this._getGroupsByDate() }
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
                    onRenderMissingItem={(index: number) => {
                        if (this.props.onRenderMissingItem) {
                            return this.props.onRenderMissingItem(index);
                        }
                        return {};
                    } }
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

    public componentWillUnmount(): void {
        this._changesetListRef = null;
        this._groupHeaderRef = null;
    }

    public componentDidUpdate(): void {
        this._onDrawComplete();
    }

    private _getGroupHeight = (group: IGroup) => {
        return this.state.groupHeaderHeight + this.state.listItemHeight * group.count;
    }

    private _getGroupsByDate(): IGroup[] {
        let groupsByDate: IGroup[] = [];
        this._totalGroupsCount = 0;
        const historyEntries = this.props.historyEntries;
        if (!historyEntries) {
            return groupsByDate;
        }

        const items = [] as ChangesHistoryItem[];
        for (let i = 0; i < historyEntries.length; i++) {
            items.push(new ChangesHistoryItem(historyEntries[i]));
        }
        groupsByDate = ListSharedUtils.getGroupsByDate(items as Item[], this.props.hasMoreUpdates);
        this._totalGroupsCount = groupsByDate.length;

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

    private _onRenderChangesHistoryColumn = (item: HistoryEntry): JSX.Element => {
        const emailTitle: string = item.changeList.owner;
        const name = item.changeList.ownerDisplayName;
        const id = item.changeList.ownerId;
        const imageProperties = {
            email: emailTitle,
            displayName: name,
            identityId: id,
            size: AvatarImageSize.SmallPlus,
        };

        return (
            <AvatarImageCard
                imageProperties={imageProperties}>
                <ChangesHistoryListItem
                    changeList={item.changeList as TfsChangeList}
                    itemChangeType={item.itemChangeType}
                    serverItem={item.serverItem}
                    repositoryContext={this.props.repositoryContext}/>
            </AvatarImageCard>
        );
    }

    private _getGroupHeaderSecondaryText(groupIndex: number, count: number): string {
        let changesCount: number;
        let changesText: string = "";
        if (groupIndex === this._totalGroupsCount - 1 &&
            this.props.hasMoreUpdates) {
            changesCount = count - 1;
        }
        else {
            changesCount = count;
        }

        if (changesCount > 1) {
            changesText = this._isShelvesetList
                ? Utils_String.localeFormat(ShelvesetsGroupTitle_Plural, changesCount)
                : Utils_String.localeFormat(ChangesetsGroupTitle_Plural, changesCount);
        }

        else {
            changesText = this._isShelvesetList
                ? Utils_String.localeFormat(ShelvesetsGroupTitle_Singular, changesCount)
                : Utils_String.localeFormat(ChangesetsGroupTitle_Singular, changesCount);
        }

        return changesText;
    }

    private _onRenderRow = (props: IDetailsRowProps): JSX.Element => {
        return (
            <div ref={el => this._changesetListRef = el} className={"changes-history-result"}>
                <DetailsRow {...props} />
            </div>
            );
    }

    private _onRenderHeader = (props: IGroupDividerProps): JSX.Element => {
        let changesetCount: number;
        const changesetCountText = this._getGroupHeaderSecondaryText(props.groupIndex, props.group.count);

        return (
            <GroupHeader
                groupHeaderRef={el => this._groupHeaderRef = el}
                groupName={props.group.name}
                countText={changesetCountText}/>
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