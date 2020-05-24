import "VSS/LoaderPlugins/Css!VersionControl/PullRequestListCollapsibleTab";

import * as React from "react";
import { SelectionMode } from "OfficeFabric/utilities/selection/interfaces";
import { Selection } from "OfficeFabric/utilities/selection/Selection";
import { SelectionZone } from "OfficeFabric/utilities/selection/SelectionZone"
import { FocusZone, FocusZoneDirection } from "OfficeFabric/FocusZone";
import { getRTLSafeKeyCode, KeyCodes, autobind } from "OfficeFabric/Utilities";
import { IButton, CommandButton } from "OfficeFabric/Button";
import { GroupedList, IGroup, IGroupDividerProps } from "OfficeFabric/GroupedList";
import { HubSpinner, Alignment } from "MyExperiences/Scenarios/Shared/Components/HubSpinner";
import { PullRequestListActionCreator } from "VersionControl/Scenarios/PullRequestList/Actions/PullRequestListActionCreator";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { PullRequestSummaryDetails, PullRequestListSection } from "VersionControl/Scenarios/PullRequestList/PullRequestListDataModel";
import { PullRequestListQueryCriteria } from "VersionControl/Scenarios/PullRequestList/PullRequestListQueryCriteria";
import { PullRequestListStatus, PullRequestListState, DefaultListState } from "VersionControl/Scenarios/PullRequestList/Stores/PullRequestListStore";
import * as SectionStateStore from "VersionControl/Scenarios/PullRequestList/Stores/SectionStateStore";
import { PullRequestRow } from "VersionControl/Scenarios/PullRequestList/PullRequestRow";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import * as Utils_String from "VSS/Utils/String";

export interface PullRequestListCollapsibleTabProps {
    sections: PullRequestListSection[];
    sectionStoreState: SectionStateStore.StoreState;
    listStoreState: IDictionaryStringTo<PullRequestListState>;
    actionCreator: PullRequestListActionCreator;
    tfsContext: TfsContext;
    dataLoaded(key: string, count: number, markAsLoaded: boolean): void;
    showRepositoryDetails: boolean;
    isDefaultTab: boolean;
    showLabels?: boolean;
}

interface CriteriaGroup extends IGroup {
    criteria: PullRequestListQueryCriteria;
}

const SpinnerDelay = 300;

export class PullRequestListCollapsibleTab extends React.Component<PullRequestListCollapsibleTabProps, {}> {

    public render(): JSX.Element {
        const props = getCollapsibleListProps(
            this.props.sections,
            this.props.tfsContext,
            this.props.showRepositoryDetails,
            this.props.sectionStoreState,
            this.props.listStoreState,
            (cidata) => this.props.actionCreator.onLinkNavigation(cidata),
            this.toggleCollapse,
            this.queryLoadMore,
            this.groupLimit,
            this.groupListState,
            this.props.isDefaultTab,
            this.props.showLabels);

        return <div className="vc-pullrequest-list-collapsible-tab v-scroll-auto h-scroll-auto">
            {this.hasLoadingSections() && <div className="initial-loading-container">
                <HubSpinner alignment={Alignment.left} labelText={VCResources.FetchingResultsText} delay={SpinnerDelay} />
            </div>}
            <CollapsibleDetailsListSection {...props} />
        </div>;
    }

    public componentDidUpdate(): void {
        // Consider TTI as load time of all expanded sections on this tab
        const expandedSections = this.props.sections.filter(s => !s.sectionInfo.isCollapsed);
        const expandedSectionsLoaded = expandedSections.length === 0 || expandedSections.every(s => s.status === PullRequestListStatus.Loaded);
        if (expandedSectionsLoaded) {
            this.props.dataLoaded("collapible-tab", 1, true);
        }
    }

    public shouldComponentUpdate(nextProps: PullRequestListCollapsibleTabProps): boolean {
        return this.props.sections !== nextProps.sections;
    }

    public hasLoadingSections(): boolean {
        return this.props.sections.some(initialLoading);
    }

    public toggleCollapse = (group: IGroup): void => {
        // Keep track of expanded/collapsed tabs
        // No need to rerender when state changes so do not subscribe to the store
        const criteriaGroup = group as CriteriaGroup;
        if (group.isCollapsed) {
            this.props.actionCreator.expandSection(criteriaGroup.criteria);
        }
        else {
            this.props.actionCreator.collapseSection(criteriaGroup.criteria);
        }
    }

    public queryLoadMore = (group: IGroup): void => {
        const criteriaGroup = group as CriteriaGroup;
        this.props.actionCreator.queryPullRequests(criteriaGroup.criteria, true);
    }

    public groupLimit = (group: IGroup): number => {
        const criteriaGroup = group as CriteriaGroup;
        const listState = this.props.listStoreState[criteriaGroup.criteria.key] || DefaultListState;
        const count = listState.items ? listState.items.length : 0;
        return listState.hasMore ? count - 1 : count + 1;
    }

    public groupListState = (group: IGroup): PullRequestListState => {
        const criteriaGroup = group as CriteriaGroup;
        return this.props.listStoreState[criteriaGroup.criteria.key] || DefaultListState;
    }
}

export function getCollapsibleListProps(
    sections: PullRequestListSection[],
    tfsContext: TfsContext,
    showRepositoryDetails: boolean,
    sectionsState: SectionStateStore.StoreState,
    listStoreState: IDictionaryNumberTo<PullRequestListState>,
    onLinkNavigation: (cidata: IDictionaryStringTo<any>) => void,
    toggleCollapse: (group: IGroup) => void,
    queryLoadMore: (group: IGroup) => void,
    groupLimit: (group: IGroup) => number,
    groupListState: (group: IGroup) => PullRequestListState,
    isDefaultTab: boolean,
    showLabels?: boolean): CollapsibleDetailsListSectionProps {

    const visibleSections = sections.filter(s => !initialLoading(s) && !initialLoadedAndEmpty(s));
    const result: CollapsibleDetailsListSectionProps = {
        items: [],
        groups: [],
        cssStyle: visibleSections[0] ? visibleSections[0].sectionInfo.cssClass : "",
        toggleCollapse: toggleCollapse,
        queryLoadMore: queryLoadMore,
        groupLimit: groupLimit,
        groupListState: groupListState,
        focusedIndex: -1,
        tfsContext: tfsContext,
        onLinkNavigation: onLinkNavigation,
        showRepositoryDetails: showRepositoryDetails,
        isDefaultTab: isDefaultTab,
        showLabels: showLabels,
    };

    visibleSections.forEach(section => {
        const stateFromStore = sectionsState.sectionStates[section.sectionInfo.criteria.key];
        const isCollapsed = stateFromStore ? stateFromStore.isCollapsed : section.sectionInfo.isCollapsed;
        const listState = listStoreState[section.sectionInfo.criteria.key] || DefaultListState;

        const group: CriteriaGroup = {
            key: section.sectionInfo.criteria.key,
            name: section.sectionInfo.criteria.criteriaTitle,
            criteria: section.sectionInfo.criteria,
            startIndex: result.items.length,
            count: 0,
            isCollapsed: isCollapsed,
            hasMoreData: listState.HasMore,
            level: 0
        };

        if (section.sectionInfo.criteria.key === sectionsState.latestLoadMoreRequestSection && section.status === PullRequestListStatus.Loaded) {
            // -1 bellow since we display count-1 elements because of groupLimit
            result.focusedIndex = result.items.length + listState.lastPageStartIndex - 1;
        }

        section.items.forEach(item => result.items.push(item));
        group.count = section.items.length;

        const lastCell = getLastSectionCell(section);
        if (lastCell) {
            result.items.push(lastCell);
            group.count++;
        }

        result.groups.push(group);
    });

    return result;
}

// ignore showing initial loading sections
function initialLoading(section: PullRequestListSection): boolean {
    return section.status === PullRequestListStatus.Updating && section.initialLoad;
}

// ignore showing initial loaded empty sections
function initialLoadedAndEmpty(section: PullRequestListSection): boolean {
    return section.status === PullRequestListStatus.Loaded && section.initialLoad && section.items.length === 0 && !section.hasMore;
}

function getLastSectionCell(section: PullRequestListSection): ServiceCell {
    if (section.items.length === 0) {
        if (section.status === PullRequestListStatus.Loaded) {
            return { isServiceCell: true, cellType: ServiceCellType.emptyCell };
        }
        return { isServiceCell: true, cellType: ServiceCellType.loadingCell };
    }
    return null;
}

export enum ServiceCellType {
    emptyCell,
    loadingCell
}

export interface ServiceCell {
    isServiceCell: boolean;
    cellType: ServiceCellType;
}

export interface CollapsibleDetailsListSectionProps {
    items: (PullRequestSummaryDetails|ServiceCell)[];
    groups: IGroup[];
    cssStyle: string;
    toggleCollapse(group: IGroup): void;
    queryLoadMore(criteria: IGroup): void;
    groupLimit(group: IGroup): number;
    groupListState(group: IGroup): PullRequestListState;
    focusedIndex: number;
    tfsContext: TfsContext;
    onLinkNavigation(cidata: IDictionaryStringTo<any>): void;
    showRepositoryDetails: boolean;
    isDefaultTab: boolean;
    showLabels?: boolean;
    cidata?: IDictionaryStringTo<any>;
}

export class CollapsibleDetailsListSection extends React.Component<CollapsibleDetailsListSectionProps, {}> {
    private _selection: Selection;

    constructor(props: CollapsibleDetailsListSectionProps) {
        super(props);
        this._selection = new Selection();
        this._selection.setItems(props.items as any);
    }

    public componentWillReceiveProps(props: CollapsibleDetailsListSectionProps) {
        this._selection = new Selection();
        this._selection.setItems(props.items as any);
    }

    public render(): JSX.Element {
        return <div className={"vc-pullRequest-collapsible-list-section " + this.props.cssStyle}>
            <div className="collapsible-details-list">
                <FocusZone direction={FocusZoneDirection.vertical}
                    isInnerZoneKeystroke={this._isInnerZoneKeyStroke}>
                    <SelectionZone
                        selection={this._selection}
                        selectionMode={SelectionMode.none} >
                        <GroupedList
                            items={this.props.items}
                            groups={this.props.groups}
                            onRenderCell={this._onRenderCell}
                            selection={this._selection}
                            selectionMode={SelectionMode.none}
                            groupProps={
                                {
                                    onRenderHeader: this._onRenderHeader,
                                    onRenderFooter: this._onRenderFooter,
                                    onRenderShowAll: this._onRenderShowAll,
                                    getGroupItemLimit: this.props.groupLimit
                                }
                            }
                        />
                    </SelectionZone>
                </FocusZone>
            </div>
        </div>;
    }

    @autobind
    private _onRenderHeader(props: IGroupDividerProps): JSX.Element {
        const listState = this.props.groupListState(props.group);
        return <GroupHeader
            onToggleCollapse={this._onToggleCollapse}
            groupProps={props}
            listState={listState} />;
    }

    @autobind
    private _onRenderFooter(props: IGroupDividerProps): JSX.Element {
        if (props.group.isCollapsed) {
            return null;
        }

        const listState = this.props.groupListState(props.group);
        const hasMorePullRequests = listState.hasMore;
        const loadingMore = listState.status === PullRequestListStatus.LoadingMore;

        const loadingSpinner = loadingMore &&
            <HubSpinner alignment={Alignment.left} labelText={VCResources.LoadingText} delay={SpinnerDelay} />;

        const loadMoreButton = !loadingMore && hasMorePullRequests &&
            <CommandButton onClick={() => this.props.queryLoadMore(props.group)}
                title={VCResources.PullRequests_ShowMoreTitle}>{VCResources.ShowMore}</CommandButton>;

        if (!loadingSpinner && !loadMoreButton) {
            return null;
        }

        return <div className="vc-pullrequests-list-footer">
            {loadingSpinner}
            {loadMoreButton}
        </div>;
    }

    @autobind
    private _onRenderShowAll(props: IGroupDividerProps): JSX.Element {
        // We never want default ShowAll footer of GroupedList to show up
        return null;
    }

    @autobind
    private _isInnerZoneKeyStroke(ev: React.KeyboardEvent<HTMLElement>) {
        return ev.which === getRTLSafeKeyCode(KeyCodes.right);
    }

    @autobind
    private _onToggleCollapse(props: IGroupDividerProps) {
        this.props.toggleCollapse(props.group);
        props.onToggleCollapse(props.group);
    }

    @autobind
    private _onRenderCell(nestingDepth: number, item: any, itemIndex: number) {
        if (item.isServiceCell) {
            return <div className="pullrequests-section-placeholder-cell">
                {item.cellType === ServiceCellType.emptyCell &&
                    <span className="empty-pullRequests">{VCResources.PullRequestList_NoPullRequestsText}</span>}

                {item.cellType === ServiceCellType.loadingCell &&
                    <HubSpinner alignment={Alignment.left} labelText={VCResources.FetchingResultsText} delay={SpinnerDelay} />}

            </div>;
        }
        return <PullRequestRow
            item={item}
            onLinkNavigation={this.props.onLinkNavigation}
            cidata={this.props.cidata}
            tfsContext={this.props.tfsContext}
            showRepositoryDetails={this.props.showRepositoryDetails}
            showLabels={this.props.showLabels}
            highlightNewUpdates={this.props.isDefaultTab}
        />;
    }
}

export interface GroupHeaderProps {
    groupProps: IGroupDividerProps;
    listState: PullRequestListState;
    onToggleCollapse(groupProps: IGroupDividerProps): void;
}

export class GroupHeader extends React.Component<GroupHeaderProps, {}> {
    private _button: IButton;
    private _divElement: HTMLElement;

    public render(): JSX.Element {
        const header = this.getHeader();

        return <div className="vc-pullrequests-list-head"
            data-is-focusable="true"
            aria-expanded={!this.props.groupProps.group.isCollapsed}
            aria-label={header}
            onKeyDown={this._onHeaderKeyDown}
            ref={elem => this._divElement = elem} >
            <FocusZone direction={FocusZoneDirection.horizontal}>
                <CommandButton className="header-button"
                    iconProps={{ iconName: this.props.groupProps.group.isCollapsed ? "ChevronUp" : "ChevronDown" }}
                    onClick={this._onButtonClick}
                    title={VCResources.PullRequestsList_ExpandButtonLabel}
                    aria-pressed={!this.props.groupProps.group.isCollapsed}
                    componentRef={elem => this._button = elem} >
                    {header}
                </CommandButton>
            </FocusZone>
        </div>;
    }

    public getHeader(): string {
        const { listState, groupProps } = this.props;

        if (listState.status === PullRequestListStatus.NotLoaded) {
            return groupProps.group.name;
        }
        else if (!listState.items) {
            return groupProps.group.name;
        }
        else if (listState.hasMore) {

            if (listState.items.length <= 1) {
                // group has more items but current items all filtered out by client filter (e.g. in 'Created by me' sections)
                // in this case we do not really know how many items are there
                return groupProps.group.name;
            }

            return Utils_String.format(VCResources.PullRequests_Section_Header_HasMore, groupProps.group.name, listState.items.length - 1);
        }

        return Utils_String.format(VCResources.PullRequests_Section_Header, groupProps.group.name, listState.items.length);
    }

    @autobind
    private _onButtonClick() {
        this.props.onToggleCollapse(this.props.groupProps);
    }

    @autobind
    private _onHeaderKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
        if (!event || event.target !== this._divElement) {
            // avoid calling toggle from button and from div
            return;
        }

        if (event.keyCode === KeyCodes.enter || event.keyCode === KeyCodes.space) {
            this.props.onToggleCollapse(this.props.groupProps);
        }

        if (event.keyCode === KeyCodes.left || event.keyCode === KeyCodes.right) {
            if (this._button) {
                this._button.focus();
            }
        }
    }
}
