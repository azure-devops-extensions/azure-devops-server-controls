import * as React from "react";

import { ConstrainMode, DetailsListLayoutMode, DetailsList, IColumn, SelectionMode } from "OfficeFabric/DetailsList";
import { BaseComponent, IBaseProps } from "OfficeFabric/Utilities";
import { Selection } from "OfficeFabric/utilities/selection/Selection";

import * as BuildContextualMenuItems from "Build/Scripts/Components/BuildContextualMenuItems";
import { BuildDetailLink } from "Build/Scripts/Components/BuildDetailLink";
import { BuildReason } from "Build/Scripts/Components/BuildReason";
import { BuildStatus } from "Build/Scripts/Components/BuildStatus";
import { Component as FriendlyDateTime } from "Build/Scripts/Components/FriendlyDateTime";
import { BuildRetain } from "Build/Scripts/Components/BuildRetain";
import { LinkWithKeyBinding } from "Build/Scripts/Components/LinkWithKeyBinding";
import { SourceBranchLink } from "Build/Scripts/Components/SourceBranchLink";
import { SourceVersionLink } from "Build/Scripts/Components/SourceVersionLink";
import { getQueueNewBuildMenuItem } from "Build/Scripts/ContextualMenuItems";
import { focusFocusableElement } from "Build/Scripts/ReactFocus";
import * as BuildResources from "Build/Scripts/Resources/TFS.Resources.Build";
import { Sources } from "Build/Scripts/Telemetry";

import { BuildLinks } from "Build.Common/Scripts/Linking";

import { IContextualMenuItem } from "OfficeFabric/components/ContextualMenu/ContextualMenu.types";

import { PopupContextualMenu, IPopupContextualMenuProps } from "Presentation/Scripts/TFS/Components/PopupContextualMenu";

import { AgentPoolQueue, Build, BuildStatus as Status, BuildQueryOrder, Change, DefinitionReference } from "TFS/Build/Contracts";

import { getPageContext } from "VSS/Context";
import { logError, logInfo } from "VSS/Diag";
import { CommonActions, getService as getEventActionService } from "VSS/Events/Action";
import { Action } from "VSS/Flux/Action";
import { format } from "VSS/Utils/String";

import "VSS/LoaderPlugins/Css!Build/BuildsGrid";
import "VSS/LoaderPlugins/Css!fabric";

export namespace WellKnownColumnKeys {
    export const Retain = "retain";
    export const Reason = "reason";
    export const Status = "status";
    export const Name = "name";
    export const Source = "source";
    export const SourceVersion = "sourceVersion";
    export const DateQueued = "dateQueued";
    export const DateStarted = "dateStarted";
    export const DateCompleted = "dateCompleted";
    export const RequestedFor = "requestedFor";

    export const DefinitionName = "definitionName";
    export const QueueName = "queueName";
}

namespace RowKeys {
    export const ShowMore = "BuildsGrid_ShowMore";
}

export enum IBuildsGridItemType {
    Build,
    ShowMoreButton
}

interface IBuildsContextualMenuData {
    build: Build;
    selectedBuilds: Build[];
}

interface ISmartPopupContextualMenuProps extends IPopupContextualMenuProps {
    build: Build;
}

interface ISmartPopupContextualMenuState {
    items: IContextualMenuItem[];
}

var selectionChanged = new Action<Build[]>();

class SmartPopupContextualMenu extends React.Component<ISmartPopupContextualMenuProps, ISmartPopupContextualMenuState> {
    private _updateContextMenuItemsListener: (payload: Build[]) => void;
    private _isMounted: boolean = false;

    private _updateItemsTimer: number = 0;

    constructor(props: ISmartPopupContextualMenuProps) {
        super(props);

        this.state = { items: props.items };
    }

    public render(): JSX.Element {
        // Note: using object spread. props and state both uses "items", so this.state's items would replace props's.
        let props = { ...this.props, ...this.state };
        return <PopupContextualMenu {...props} />;
    }

    public componentWillMount() {
        this._isMounted = true;
        // we need to hook up to selection changed, selection might happen after we get selected items on user click
        this._updateContextMenuItemsListener = selectionChanged.addListener((builds) => {
            clearTimeout(this._updateItemsTimer);
            setTimeout(() => {
                this._isMounted && this.setState({
                    items: getBuildsContextualMenuItems({
                        build: this.props.build,
                        selectedBuilds: builds
                    })
                });
            }, 100);
        });
    }

    public componentWillUnmount() {
        this._isMounted = false;
        selectionChanged.removeListener(this._updateContextMenuItemsListener);
    }
}

export interface IBuildsGridRow {
    key: string;
    itemType: IBuildsGridItemType;
    item: Build | null;
    canToggleRetained: boolean;
}

export interface IBuildsGridProps extends IBaseProps {
    rows: IBuildsGridRow[];
    hasMore: boolean;
    queryOrder: BuildQueryOrder;
    columnKeysInOrder: string[];
    ariaLabelForGrid: string;
    hideContributedMenuItems?: boolean;
    singleSelectionMode?: boolean;
    onMoreBuildsClicked?: () => void;
    onSortTimeClicked?: (queryOrder: BuildQueryOrder) => void;
    noAutoFocus?: boolean;
    sortPivotColumnNames?: string[];
}

export class BuildsGrid extends BaseComponent<IBuildsGridProps, {}> {
    private _firstItemKey: string;
    private _selection: Selection;
    private _selectedKeys: string[] = [];

    private _focusGridPending: boolean = false;

    private _selectionChangedTimer: number = 0;

    private _root: HTMLElement;

    private _isMounted: boolean = false;
    private _updated: boolean = false;

    constructor(props: IBuildsGridProps) {
        super(props);

        this._selection = new Selection({
            canSelectItem: (item) => {
                let row = item as IBuildsGridRow;
                if (row && row.itemType === IBuildsGridItemType.Build) {
                    return true;
                }

                return false;
            },
            onSelectionChanged: () => {
                // let the callback sit on seperate thread than UI, user might just keep changing selection, we don't have to trigger every change, we care about latest
                clearTimeout(this._selectionChangedTimer);
                this._selectionChangedTimer = setTimeout(() => {
                    selectionChanged.invoke(this._getSelectedBuilds())
                }, 200);
            }
        });

        this._selection.setItems(props.rows, false);
    }

    public render(): JSX.Element {
        if (this.props.hasMore) {
            // inject new item at the end that should render more button
            this.props.rows.push({
                itemType: IBuildsGridItemType.ShowMoreButton,
                item: null,
                key: RowKeys.ShowMore,
                canToggleRetained: false
            });
        }

        let columns: IColumn[] = [];
        this.props.columnKeysInOrder.forEach((key) => {
            let column = this._getColumn(key);
            if (column) {
                columns.push(column);
            }
        });

        return <div ref={this._resolveRef('_root')}>
            <DetailsList
                ariaLabelForGrid={format(BuildResources.GridArrowKeysInformationLabel, this.props.ariaLabelForGrid)}
                ariaLabelForSelectAllCheckbox={BuildResources.SelectAllBuildsInGridText}
                checkButtonAriaLabel={BuildResources.CheckButtonLabel}
                items={this.props.rows}
                columns={columns}
                constrainMode={ConstrainMode.unconstrained}
                layoutMode={DetailsListLayoutMode.justified}
                className="builds-grid"
                selectionMode={this.props.singleSelectionMode ? SelectionMode.single : SelectionMode.multiple}
                selection={this._selection}
                onItemInvoked={(item) => this._onItemInvoked(item)}
                { ...(this.props.noAutoFocus ? {} : { initialFocusedIndex: 0, onRowWillUnmount: this._onRowWillUnmount }) }
            />
        </div>;
    }

    public componentWillUpdate() {
        this._updated = false;
        this._selectedKeys = [];
        if (this._selection.getSelectedCount() > 0) {
            // when we update grid, we should do our best effort to reselect them, else everytime we get build update we will loose all selections, that's bad
            this._selection.getSelection().forEach((item) => {
                this._selectedKeys.push("" + item.key);
            });
        }
    }

    public componentWillUnmount() {
        this._isMounted = false;
    }

    public componentDidMount() {
        this._isMounted = true;
        // we set _updated to true since componentDidUpdate won't be called on initial render
        this._updated = true;
        this._focusGridIfPending();
    }

    public componentDidUpdate() {
        this._updated = true;
        this._selectedKeys.forEach((key) => {
            this._selection.setKeySelected(key, true, true);
        });

        this._focusGridIfPending();
    }

    public focusGrid() {
        if (this._updated) {
            // if this is already updated, just focus
            // this is to make sure that if the component is being mounted and focus grid is called we won't miss that
            focusFocusableElement(this._root);
        }
        else {
            // delegate focus, so that it would be set at right time
            this._focusGridPending = true;
        }
    }

    private _focusGridIfPending() {
        if (this._focusGridPending) {
            focusFocusableElement(this._root);
            this._focusGridPending = false;
        }
    }

    private _onRowWillUnmount = (item: IBuildsGridRow, index: number) => {
        if (this._isMounted && this._root) {
            // The component is mounted, but row is being unmounted implies a delete operation is being performed
            //  on delete, we loose focus on the list, initialFocusedIndex focuses only on row mount (which we could argue it's by design...), which won't happen in delete case
            // for accessibility to regain focus on the list we do this...
            // Note that DetailsList doesn't expose anything to bring focus to, we can't depend on refs as well per https://github.com/OfficeDev/office-ui-fabric-react/issues/926
            this._focusGridPending = true;
        }
    }

    private _getColumn(key: string): IColumn {
        let sortPivotColumns = this.props.sortPivotColumnNames || [];
        if (sortPivotColumns.length == 0) {
            // if none are sent, we assume the pivot is finish time
            sortPivotColumns.push(WellKnownColumnKeys.DateCompleted);
        }

        switch (key) {
            case WellKnownColumnKeys.Retain:
                return {
                    key: WellKnownColumnKeys.Retain,
                    name: "",
                    fieldName: null,
                    minWidth: 30,
                    maxWidth: 30,
                    isResizable: false,
                    className: "retain-column",
                    headerClassName: "icon-header",
                    onRender: (itemRow: IBuildsGridRow, index: number) => {
                        if (!shouldRenderColumn(itemRow)) {
                            return null;
                        }

                        return <BuildRetain build={itemRow.item} showText={false} canToggleRetained={itemRow.canToggleRetained} />;
                    },
                    iconClassName: " bowtie-icon bowtie-security-lock",

                };
            case WellKnownColumnKeys.Reason:
                return {
                    key: WellKnownColumnKeys.Reason,
                    name: "",
                    fieldName: null,
                    minWidth: 30,
                    maxWidth: 30,
                    isResizable: false,
                    className: "reason-column",
                    headerClassName: "icon-header",
                    onRender: (itemRow: IBuildsGridRow, index: number) => {
                        if (!shouldRenderColumn(itemRow)) {
                            return null;
                        }

                        return <BuildReason reason={itemRow.item.reason} showText={false} />;
                    },
                    iconClassName: " bowtie-icon bowtie-build"
                };
            case WellKnownColumnKeys.Status:
                return {
                    key: WellKnownColumnKeys.Status,
                    name: "",
                    fieldName: null,
                    minWidth: 30,
                    maxWidth: 30,
                    isResizable: false,
                    className: "status-column",
                    headerClassName: "icon-header",
                    onRender: (itemRow: IBuildsGridRow, index: number) => {
                        if (!shouldRenderColumn(itemRow)) {
                            return null;
                        }

                        return <BuildStatus build={itemRow.item} hideText={true} />;
                    },
                    iconClassName: " build-muted-icon-color bowtie-icon bowtie-status-info-outline"
                };
            case WellKnownColumnKeys.Name:
                return {
                    key: WellKnownColumnKeys.Name,
                    name: BuildResources.CompletedBuildNameColumn,
                    fieldName: null,
                    maxWidth: 300,
                    minWidth: 200,
                    isResizable: true,
                    className: "primary-column",
                    onRender: (itemRow: IBuildsGridRow, index: number) => {
                        if (itemRow.itemType === IBuildsGridItemType.ShowMoreButton) {
                            // render more button
                            return <div className='show-more'><a onClick={this._onMoreBuildsClicked}>{BuildResources.ShowMoreLabel}</a></div>;
                        }

                        let contributedIds = [];
                        if (!this.props.hideContributedMenuItems) {
                            contributedIds = ["ms.vss-build-web.completed-build-menu"];
                        }

                        let props: ISmartPopupContextualMenuProps = {
                            className: "popup-menu action-icon",
                            iconClassName: "bowtie-ellipsis",
                            build: itemRow.item,
                            items: [],
                            menuClassName: "build-popup-menu",
                            contributionData: {
                                contributionIds: contributedIds,
                                extensionContext: itemRow.item
                            },
                            onClick: (event) => {
                                // TODO: hide contributed extensions in multi-select scenario, since we send only single build context
                                if (this._selection.getSelectedCount() > 1) {
                                    // this is multi-selection, we don't want to propagate the click which would deselect all items since grid considers it as a row click
                                    event.stopPropagation();
                                }
                            },
                            useTargetElement: true
                        };

                        return <div className="builds-grid-entry-name">
                            <BuildDetailLink build={itemRow.item} />
                            <SmartPopupContextualMenu {...props} />
                        </div>;
                    }
                };
            case WellKnownColumnKeys.Source:
                return {
                    key: WellKnownColumnKeys.Source,
                    name: BuildResources.CompletedBuildSourceBranchColumn,
                    fieldName: null,
                    maxWidth: 200,
                    minWidth: 100,
                    isResizable: true,
                    className: "branch-column",
                    onRender: (itemRow: IBuildsGridRow, index: number) => {
                        if (!shouldRenderColumn(itemRow)) {
                            return null;
                        }

                        return <SourceBranchLink build={itemRow.item} />;
                    }
                };
            case WellKnownColumnKeys.SourceVersion:
                return {
                    key: WellKnownColumnKeys.SourceVersion,
                    name: BuildResources.CompletedBuildSourceVersionColumn,
                    fieldName: null,
                    maxWidth: 200,
                    minWidth: 100,
                    isResizable: true,
                    className: "source-version-column",
                    onRender: (itemRow: IBuildsGridRow, index: number) => {
                        if (!shouldRenderColumn(itemRow)) {
                            return null;
                        }

                        let build = itemRow.item;

                        let change = {
                            id: build.sourceVersion,
                            type: build.repository.type
                        } as Change;

                        return <SourceVersionLink build={itemRow.item} change={change} />;
                    }
                };
            case WellKnownColumnKeys.DateCompleted:
                return {
                    key: WellKnownColumnKeys.DateCompleted,
                    name: BuildResources.CompletedBuildDateColumn,
                    fieldName: null,
                    maxWidth: 200,
                    minWidth: 100,
                    isResizable: true,
                    isSorted: this._isSortPivot(WellKnownColumnKeys.DateCompleted, sortPivotColumns),
                    isSortedDescending: this.props.queryOrder === BuildQueryOrder.FinishTimeDescending,
                    className: "date-completed-column",
                    onColumnClick: (event, column: IColumn) => {
                        if (this.props.onSortTimeClicked) {
                            let newQueryOrder = this.props.queryOrder === BuildQueryOrder.FinishTimeAscending ? BuildQueryOrder.FinishTimeDescending : BuildQueryOrder.FinishTimeAscending;
                            this.props.onSortTimeClicked(newQueryOrder);
                        }
                    },
                    onRender: (itemRow: IBuildsGridRow, index: number) => {
                        if (!shouldRenderColumn(itemRow)) {
                            return null;
                        }

                        return <FriendlyDateTime time={itemRow.item.finishTime} />;
                    }
                };
            case WellKnownColumnKeys.RequestedFor:
                return {
                    key: WellKnownColumnKeys.RequestedFor,
                    name: BuildResources.CompletedBuildRequestedForColumn,
                    fieldName: null,
                    minWidth: 100,
                    isResizable: true,
                    className: "requested-for-column",
                    onRender: (itemRow: IBuildsGridRow, index: number) => {
                        if (!shouldRenderColumn(itemRow)) {
                            return null;
                        }

                        return <span>{itemRow.item.requestedFor.displayName}</span>;
                    }
                };
            case WellKnownColumnKeys.DefinitionName:
                return {
                    key: WellKnownColumnKeys.DefinitionName,
                    name: BuildResources.DefinitionNameColumn,
                    fieldName: null,
                    maxWidth: 200,
                    minWidth: 100,
                    isResizable: true,
                    className: "definition-name-column",
                    onRender: (itemRow: IBuildsGridRow, index: number) => {
                        if (!shouldRenderColumn(itemRow)) {
                            return null;
                        }

                        return <DefinitionLinkComponent definition={itemRow.item.definition} />;
                    }
                };
            case WellKnownColumnKeys.QueueName:
                return {
                    key: WellKnownColumnKeys.QueueName,
                    name: BuildResources.QueueNameColumn,
                    fieldName: null,
                    maxWidth: 200,
                    minWidth: 100,
                    isResizable: true,
                    className: "queue-name-column",
                    onRender: (itemRow: IBuildsGridRow, index: number) => {
                        if (!shouldRenderColumn(itemRow)) {
                            return null;
                        }

                        return <QueueLinkComponent queue={itemRow.item.queue} />;
                    }
                };
            case WellKnownColumnKeys.DateQueued:
                return {
                    key: WellKnownColumnKeys.DateQueued,
                    name: BuildResources.QueuedBuildDateColumn,
                    fieldName: null,
                    maxWidth: 200,
                    minWidth: 100,
                    isResizable: true,
                    isSorted: this._isSortPivot(WellKnownColumnKeys.DateQueued, sortPivotColumns),
                    isSortedDescending: this.props.queryOrder === BuildQueryOrder.QueueTimeDescending,
                    className: "date-queued-column",
                    onColumnClick: (event, column: IColumn) => {
                        if (this.props.onSortTimeClicked) {
                            let newQueryOrder = this.props.queryOrder === BuildQueryOrder.QueueTimeAscending ? BuildQueryOrder.QueueTimeDescending : BuildQueryOrder.QueueTimeAscending;
                            this.props.onSortTimeClicked(newQueryOrder);
                        }
                    },
                    onRender: (itemRow: IBuildsGridRow, index: number) => {
                        if (!shouldRenderColumn(itemRow)) {
                            return null;
                        }

                        return <FriendlyDateTime time={itemRow.item.queueTime} />;
                    }
                };
            case WellKnownColumnKeys.DateStarted:
                return {
                    key: WellKnownColumnKeys.DateStarted,
                    name: BuildResources.StartedBuildDateColumn,
                    fieldName: null,
                    maxWidth: 200,
                    minWidth: 100,
                    isResizable: true,
                    isSorted: this._isSortPivot(WellKnownColumnKeys.DateStarted, sortPivotColumns),
                    isSortedDescending: this.props.queryOrder === BuildQueryOrder.StartTimeDescending,
                    className: "date-started-column",
                    onColumnClick: (event, column: IColumn) => {
                        if (this.props.onSortTimeClicked) {
                            let newQueryOrder = this.props.queryOrder === BuildQueryOrder.StartTimeAscending ? BuildQueryOrder.StartTimeDescending : BuildQueryOrder.StartTimeAscending;
                            this.props.onSortTimeClicked(newQueryOrder);
                        }
                    },
                    onRender: (itemRow: IBuildsGridRow, index: number) => {
                        if (!shouldRenderColumn(itemRow)) {
                            return null;
                        }

                        return <FriendlyDateTime time={itemRow.item.startTime} />;
                    }
                };
            default:
                logError("Column key: " + key + "is not a wellknownkey.");
                return null;
        }
    }

    private _getSelectedBuilds(): Build[] {
        let selection = this._selection.getSelection() as IBuildsGridRow[];
        return selection.map((row) => {
            return row.item;
        });
    }

    private _onItemInvoked(row: IBuildsGridRow) {
        if (!row) {
            logError("Row cannot be null");
            return;
        }

        if (row.itemType === IBuildsGridItemType.Build) {
            let build = row.item as Build;
            getEventActionService().performAction(CommonActions.ACTION_WINDOW_NAVIGATE, {
                url: BuildLinks.getBuildDetailLink(build.id)
            });
        }
        else if (row.itemType === IBuildsGridItemType.ShowMoreButton) {
            this._onMoreBuildsClicked();
        }
    }

    private _onMoreBuildsClicked = (event?: React.MouseEvent<HTMLElement>) => {
        if (event) {
            // let's not consider this as a normal click since this will consider as selection and hence existing selections would vanish...
            event.preventDefault();
            event.stopPropagation();
        }

        if (this.props.onMoreBuildsClicked) {
            this.props.onMoreBuildsClicked();
        }
        else {
            logError("onMoreBuildsClicked has not been passed.");
        }
    }

    private _isSortPivot(columnName: string, sortPivots: string[]): boolean {
        // click callback has to be sent and this should be part of sort pivot columns
        return !!this.props.onSortTimeClicked && sortPivots.indexOf(columnName) > -1;
    }
}

interface DefinitionLinkComponentProps {
    definition: DefinitionReference;
}

class DefinitionLinkComponent extends React.Component<DefinitionLinkComponentProps, any> {
    public render(): JSX.Element {
        if (this.props.definition) {
            return <LinkWithKeyBinding href={BuildLinks.getDefinitionLink(this.props.definition.id)} text={this.props.definition.name} title={format(BuildResources.ViewDefinitionSummaryText, this.props.definition.name)} />
        }
        else {
            return null;
        }
    }

    public shouldComponentUpdate(nextProps: DefinitionLinkComponentProps, nextState: any): boolean {
        return this.props.definition && this.props.definition.id !== nextProps.definition.id;
    }
}

interface QueueLinkComponentProps {
    queue: AgentPoolQueue;
}

class QueueLinkComponent extends React.Component<QueueLinkComponentProps, any> {
    public render(): JSX.Element {
        if (this.props.queue) {
            return <LinkWithKeyBinding href={BuildLinks.getQueueLink(this.props.queue.id)} text={this.props.queue.name} title={format(BuildResources.ViewQueueWithNameText, this.props.queue.name)} />
        }
        else {
            return null;
        }
    }

    public shouldComponentUpdate(nextProps: QueueLinkComponentProps, nextState: any): boolean {
        return this.props.queue && this.props.queue.id !== nextProps.queue.id;
    }
}

function getBuildsContextualMenuItems(data: IBuildsContextualMenuData): IContextualMenuItem[] {
    let items: IContextualMenuItem[] = [];
    let selectedBuilds = data.selectedBuilds || [];
    selectedBuilds = data.selectedBuilds.length === 0 ? [data.build] : data.selectedBuilds;

    if (!data.build) {
        return items;
    }

    let isMultiSelection = data.selectedBuilds.length > 1;

    items.push(BuildContextualMenuItems.getViewBuildMenuItemInNewTab(data.build, isMultiSelection));
    if (!isMultiSelection && data.build.definition) {
        items.push(getQueueNewBuildMenuItem(data.build.definition, Sources.Queued));
    }

    items.push(BuildContextualMenuItems.getRetainBuildsMenuItem(selectedBuilds));
    items.push(BuildContextualMenuItems.getDeleteBuildsMenuItem(selectedBuilds, data.build.status !== Status.Completed));
    items.push(BuildContextualMenuItems.getCancelBuildsMenuItem(getPageContext().webContext.user.id, selectedBuilds, data.build.status === Status.Completed));

    items = items.filter((item) => {
        return item !== null;
    });

    return items;
}

export function getBuildKey(build: Build): string {
    return build.id + "";
}

function shouldRenderColumn(item: IBuildsGridRow): boolean {
    if (item.itemType === IBuildsGridItemType.ShowMoreButton) {
        return false;
    }

    return true;
}