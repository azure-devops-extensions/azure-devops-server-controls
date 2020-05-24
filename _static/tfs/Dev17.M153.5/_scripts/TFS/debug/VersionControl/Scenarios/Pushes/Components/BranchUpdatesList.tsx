import * as React from "react";
import { ConstrainMode, DetailsList, DetailsRow, IColumn, IDetailsRowProps, SelectionMode } from "OfficeFabric/DetailsList";
import { IGroup, IGroupDividerProps } from "OfficeFabric/GroupedList";
import { css } from "OfficeFabric/Utilities";

import * as Utils_Date from "VSS/Utils/Date";
import * as Utils_String from "VSS/Utils/String";

import {
    SinglePushPageTitleFormat,
    PushesPageTitleFormat,
} from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import { CustomerIntelligenceData } from "VersionControl/Scripts/CustomerIntelligenceData";
import { GitRepositoryContext } from "VersionControl/Scripts/GitRepositoryContext";
import { SimpleLruCache } from "VersionControl/Scenarios/History/GitHistory/SimpleLruCache";
import { GroupHeader } from "VersionControl/Scenarios/History/GroupHeader";
import { Item } from "VersionControl/Scenarios/History/ListInterfaces";
import * as ListSharedUtils from "VersionControl/Scenarios/History/ListSharedUtils";
import { GitPushRefExtended } from "VersionControl/Scenarios/Pushes/ActionsHub";
import { BranchUpdateListItem } from "VersionControl/Scenarios/Pushes/Components/BranchUpdateListItem";
import { HistoryListFlux } from "VersionControl/Scenarios/Pushes/Components/BranchUpdateListItemExpanded";
import { VersionSpec } from "VersionControl/Scripts/TFS.VersionControl.VersionSpecs";

import "VSS/LoaderPlugins/Css!VersionControl/BranchUpdatesList";

class BranchUpdatesItem implements Item {
    refUpdate: GitPushRefExtended;

    constructor(refUpdate: GitPushRefExtended) {
        this.refUpdate = refUpdate;
    }

    public get date(): Date {
        return this.refUpdate.push.date;
    }

    public get item(): GitPushRefExtended {
        return this.refUpdate;
    }
}

export interface BranchUpdatesListProps {
    refUpdates: GitPushRefExtended[];
    hasMoreUpdates: boolean;
    repositoryContext: GitRepositoryContext;
    onRenderMissingItem? (index: number): React.ReactNode;
    searchFilterItemVersion: VersionSpec;
    isLoading: boolean;
    customerIntelligenceData?: CustomerIntelligenceData;
    onScenarioComplete?(splitTimingName: string): void;
    className?: string;
}

interface BranchUpdatesListState {
    listItemHeight: number;
    groupHeaderHeight: number;
}

export class BranchUpdatesList extends React.Component<BranchUpdatesListProps, BranchUpdatesListState> {
    private _totalGroups: number;
    private _historyListCache: SimpleLruCache<HistoryListFlux>;
    private readonly c_historyListCacheCapacity = 5;
    private _branchListRef: HTMLDivElement;
    private _groupHeaderRef: HTMLDivElement;
    private _listItemDefaultHeight: number = 64;
    private _groupHeaderDefaultHeight: number = 31;

    constructor(props: BranchUpdatesListProps) {
        super(props);
        this._historyListCache = new SimpleLruCache<HistoryListFlux>(this.c_historyListCacheCapacity, this._historyListCacheItemDeletedCallback);
        this.state = {
            listItemHeight: this._listItemDefaultHeight,
            groupHeaderHeight: this._groupHeaderDefaultHeight
        }
    }

    public render(): JSX.Element {
        const refUpdates: GitPushRefExtended[] = $.extend(true, [], this.props.refUpdates);

        if (refUpdates && refUpdates.length > 0) {
            if (this.props.hasMoreUpdates && !this.props.isLoading) {
                // if there are more pushes to show, undefined item is pushed in the list to get callback 
                // and raise action to fetch more items from server.
                refUpdates.push(undefined);
            }
            return (
                <DetailsList
                    // the key value should not change, else every time the list updates the view will scroll to top
                    key={"branch-updates-details-list"}
                    className={css("branch-updates-details-list", this.props.className)}
                    items={refUpdates}
                    isHeaderVisible={false}
                    groups={this._getGroupsByDate() }
                    onRenderRow={this._onRenderBranchUpdateRow}
                    constrainMode={ConstrainMode.unconstrained}
                    getGroupHeight={this._getGroupHeight}
                    groupProps={
                        {
                            onRenderHeader: this._onRenderHeader
                        }}
                    selectionMode={SelectionMode.none}
                    onRenderMissingItem={index => {
                        if (this.props.onRenderMissingItem) {
                            return this.props.onRenderMissingItem(index);
                        }
                        return undefined;
                    } } />
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
            if (this._branchListRef) {
                listItemHeight = this._branchListRef.clientHeight;
            }
            if (this._groupHeaderRef) {
                groupHeaderHeight = this._groupHeaderRef.clientHeight;
            }
            this.setState({ listItemHeight, groupHeaderHeight });

        }, 0);

        this._onDrawComplete();
    }

    public componentDidUpdate(): void {
        this._onDrawComplete();
    }

    public componentWillUnmount(): void {
        if (this._historyListCache) {
            this._historyListCache.resetCache();
            this._historyListCache = null;
        }
        this._branchListRef = null;
        this._groupHeaderRef = null;
    }

    private _getGroupHeight = (group: IGroup) => {
        return this.state.groupHeaderHeight + this.state.listItemHeight * group.count;
    }

    private _historyListCacheItemDeletedCallback(item: HistoryListFlux): void {
        if (item && !item.isItemOpen) {
            item.dispose();
        }
    }

    private _getGroupsByDate(): IGroup[] {
        let groupsByDate: IGroup[] = [];
        this._totalGroups = 0;
        const refUpdates = this.props.refUpdates;
        if (!refUpdates) {
            return groupsByDate;
        }

        const items = [] as BranchUpdatesItem[];
        for (let i = 0; i < refUpdates.length; i++) {
            items.push(new BranchUpdatesItem(refUpdates[i]));
        }
        groupsByDate = ListSharedUtils.getGroupsByDate(items as Item[], this.props.hasMoreUpdates);
        this._totalGroups = groupsByDate.length;

        return groupsByDate;
    }

    private _onRenderBranchUpdateRow = (props: IDetailsRowProps): JSX.Element => {
        return (
            <BranchUpdateListItem
                refUpdate={props.item}
                branchUpdateListItemRef={el => this._branchListRef = el}
                repositoryContext={this.props.repositoryContext}
                searchFilterItemVersion={this.props.searchFilterItemVersion}
                historyListCache={this._historyListCache}
                customerIntelligenceData={this.props.customerIntelligenceData ? this.props.customerIntelligenceData.clone() : null} />
        );
    }
    /**
      * Custom render method for group headers.
      */
    private _onRenderHeader = (props: IGroupDividerProps): JSX.Element => {
        let pushesCountText = "";
        let updatesCount: number;

        // If this is the last group, show one less update count.
        // This is to counter an extra undefined item added to last group for achieving infinite scroll.
        if (props.groupIndex === this._totalGroups - 1 &&
            this.props.hasMoreUpdates) {
            updatesCount = props.group.count - 1;
        }
        else {
            updatesCount = props.group.count;
        }

        if (updatesCount > 1) {
            pushesCountText = Utils_String.localeFormat(PushesPageTitleFormat, updatesCount);
        }
        else {
            pushesCountText = Utils_String.localeFormat(SinglePushPageTitleFormat, updatesCount);
        }

        return (
            <GroupHeader
                groupHeaderRef={el => this._groupHeaderRef = el}
                groupName={props.group.name}
                countText={pushesCountText}/>
        );
    }

    private _onDrawComplete(): void {
        if (!this.props.isLoading) {
            if (this.props.onScenarioComplete) {
                this.props.onScenarioComplete("drawBranchUpdatesListComplete");
            }
        }
    }
}
