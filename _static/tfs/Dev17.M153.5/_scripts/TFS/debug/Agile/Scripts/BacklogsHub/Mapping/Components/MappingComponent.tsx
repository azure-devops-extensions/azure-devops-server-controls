import * as React from "react";

import "VSS/LoaderPlugins/Css!Agile/Scripts/BacklogsHub/Mapping/Components/MappingComponent";
import { ProductBacklogGrid } from "Agile/Scripts/Backlog/ProductBacklogGrid";
import { IWorkItemRowProps, WorkItemList } from "Agile/Scripts/BacklogsHub/Mapping/Components/WorkItemList";
import { DragDropScopes } from "Agile/Scripts/Common/Agile";
import { HubError } from "Agile/Scripts/Common/Components/AgileHubError";
import { LoadingComponent } from "Presentation/Scripts/TFS/Components/LoadingComponent";
import { BacklogsUrls, IBacklogUrlOptions } from "Agile/Scripts/Common/HubUrlUtilities";
import { BacklogsHubConstants } from "Agile/Scripts/Generated/HubConstants";
import { Team } from "Agile/Scripts/Models/Team";
import * as BacklogContentViewResources from "Agile/Scripts/Resources/TFS.Resources.BacklogsHub.BacklogView";
import { BaseButton, IconButton } from "OfficeFabric/Button";
import { Callout, DirectionalHint } from "OfficeFabric/Callout";
import { Link } from "OfficeFabric/Link";
import { IRenderFunction } from "OfficeFabric/Utilities";
import { SimpleDropZone } from "Presentation/Scripts/TFS/Components/SimpleDropZone";
import { IBacklogLevelConfiguration } from "Presentation/Scripts/TFS/FeatureRef/BacklogConfiguration/Models";
import { WorkZeroDataIllustrationPaths } from "Presentation/Scripts/TFS/TFS.IllustrationUrlUtils";
import { WorkItem as IWorkItem } from "TFS/WorkItemTracking/Contracts";
import { urlHelper } from "VSS/Locations";
import { contains } from "VSS/Utils/Array";
import { format, localeIgnoreCaseComparer } from "VSS/Utils/String";
import { IPickListItem, IPickListSelection, PickList } from "VSSUI/PickList";
import { VssIcon, VssIconType } from "VSSUI/VssIcon";
import { ZeroData } from "VSSUI/ZeroData";
import { IWorkItemDragInfo } from "Agile/Scripts/Common/IWorkItemDragInfo";

export interface IMappingComponentProps {
    /** The backlog level that is hosting the mapping component */
    hostBacklogLevel: IBacklogLevelConfiguration;
    /** The currently selected team */
    selectedTeam: Team;
    /** The backlog level to load mapping items */
    targetBacklogLevel: IBacklogLevelConfiguration;
    /** Is the target backlog visible */
    isTargetBacklogLevelVisible: boolean;
    /** All the teams to choose from */
    teams: Team[];
    /** Are the teams loading */
    teamsLoading: boolean;
    /** The work items to display */
    workItemIds: number[];
    /** Are the work item ids loading */
    workItemIdsLoading: boolean;
    /** Error from loading work item ids */
    workItemIdsLoadingError: TfsError;
    /** Error while paging work item */
    workItemPageError: TfsError;
    /** Get a materialized work item, or undefined if it has not been loaded */
    getWorkItem: (workItemId: number) => IWorkItem;
    /** Check if a work item has an error */
    getWorkItemError: (workItemId: number) => boolean;
    /** Get the currently dragging work items from the backlog grid */
    getWorkItemDragInfo: () => IWorkItemDragInfo;
    /** Check if we should page a work item */
    shouldPageWorkItem: (workItemId: number) => boolean;
    /** Callback to navigate to the target backlog */
    onNavigateToTargetBacklog: () => void;
    /** Callback to page work items */
    onPageWorkItems: (workItemIds: number[]) => void;
    /** Callback when teams are requested for the first time */
    onFetchTeams: () => void;
    /** Callback when the user clicks the refresh work items button */
    onRefreshWorkItems: () => void;
    /** Callback when a new team is selected */
    onTeamChanged: (newTeam: Team) => void;
    /** Callback for when work items are dropped on a mapped work item */
    onWorkItemsDropped: (workItemIds: number[], parentId: number) => void;
}

export interface IMappingComponentState {
    isTeamCalloutOpen: boolean;
}

export class MappingComponent extends React.Component<IMappingComponentProps, IMappingComponentState> {
    private _pickListRef: PickList;
    private _teamCalloutTarget: HTMLElement;
    private _teamsPromise: Promise<Team[]>;
    private _teamsPromiseResolve: () => void;

    constructor(props: IMappingComponentProps) {
        super(props);

        this.state = {
            isTeamCalloutOpen: false
        };
    }

    public componentWillReceiveProps(nextProps: IMappingComponentProps): void {
        if (nextProps.teamsLoading && !this._teamsPromise) {
            // PickList will only show loading when there is a Promise passed in
            // We are using Flux, so fake it
            // Start the fake promise, resolve when teams come in
            /* tslint:disable-next-line */
            this._teamsPromise = new Promise<Team[]>((resolve, reject) => {
                this._teamsPromiseResolve = resolve;
            });
        }

        if (!nextProps.teamsLoading && this._teamsPromise) {
            // Teams are no longer loading, but we have an outstanding promise.
            // Resolve the promise, so the teams will show up in the PickList
            this._teamsPromiseResolve();
            this._teamsPromise = null;
            this._teamsPromiseResolve = null;
        }
    }

    public render(): JSX.Element {
        return (
            <div
                className="mapping-component"
                aria-label={BacklogContentViewResources.MappingPane_AriaLabel}
            >
                {this._renderHeader()}
                {this._renderContent()}
                {this._renderTeamCallout()}
            </div>
        );
    }

    private _renderHeader(): JSX.Element {
        return (
            <div className="mapping-header">
                {this._renderTeamHeader()}
                {this._renderHeaderCommands()}
            </div>
        );
    }

    private _renderTeamHeader(): JSX.Element {
        const {
            selectedTeam,
            targetBacklogLevel
        } = this.props;

        const {
            isTeamCalloutOpen
        } = this.state;

        return (
            <div className="team-header">
                {format(BacklogContentViewResources.MappingPane_BacklogForTeam, targetBacklogLevel.name)}
                <div
                    className="team-header-button-container"
                    ref={this._resolveTeamCalloutTarget}
                >
                    <BaseButton
                        className="team-header-button"
                        onClick={this._showTeamCallout}
                        aria-haspopup={true}
                        aria-expanded={isTeamCalloutOpen}
                    >
                        {selectedTeam.name} <VssIcon iconType={VssIconType.fabric} iconName={"ChevronDown"} />
                    </BaseButton>
                </div>
            </div>
        );
    }

    private _renderHeaderCommands(): JSX.Element {
        const {
            onRefreshWorkItems
        } = this.props;

        return (
            <div className="header-commands">
                <IconButton
                    ariaLabel={BacklogContentViewResources.RefreshButtonLabel}
                    iconProps={{ iconName: "Refresh" }}
                    onClick={onRefreshWorkItems}
                />
            </div>
        );
    }

    private _renderContent(): JSX.Element {
        const {
            getWorkItem,
            getWorkItemError,
            isTargetBacklogLevelVisible,
            selectedTeam,
            shouldPageWorkItem,
            targetBacklogLevel,
            workItemIds,
            workItemIdsLoading,
            workItemIdsLoadingError,
            workItemPageError,
            onPageWorkItems
        } = this.props;

        let content: JSX.Element;
        if (workItemIdsLoadingError || workItemPageError) {
            const exceptionMessage = workItemIdsLoadingError ? workItemIdsLoadingError.message : workItemPageError.message;

            content = (
                <HubError
                    exceptionsInfo={[{ exceptionMessage }]}
                />
            );
        } else if (workItemIdsLoading) {
            return (
                <LoadingComponent />
            );
        } else if (!workItemIdsLoading && workItemIds && workItemIds.length === 0) {

            const backlogUrlOptions: IBacklogUrlOptions = {
                teamIdOrName: selectedTeam.name,
                pivot: BacklogsHubConstants.BacklogPivot,
                backlogLevel: targetBacklogLevel.name
            };

            const url = BacklogsUrls.getBacklogContentUrl(backlogUrlOptions);

            content = (
                <ZeroData
                    imagePath={urlHelper.getVersionedContentUrl(WorkZeroDataIllustrationPaths.NoWorkScheduled)}
                    imageAltText={format(BacklogContentViewResources.Backlog_NoItems, targetBacklogLevel.name)}
                    primaryText={format(BacklogContentViewResources.Backlog_NoItems, targetBacklogLevel.name)}
                    secondaryText={isTargetBacklogLevelVisible && targetBacklogLevel ? (
                        <Link onClick={this._onNavigateToTargetBacklog} href={url}>
                            {format(BacklogContentViewResources.MappingPane_GoToBacklog, targetBacklogLevel.name)}
                        </Link>
                    ) : undefined}
                />
            );
        } else {
            content = (
                <WorkItemList
                    getWorkItem={getWorkItem}
                    getWorkItemError={getWorkItemError}
                    shouldPageWorkItem={shouldPageWorkItem}
                    workItemIds={workItemIds}
                    onRenderWorkItemRow={this._renderWorkItemRow}
                    onPageWorkItems={onPageWorkItems}
                />
            );
        }

        return (
            <div className="mapping-work-item-container">
                {content}
            </div>
        );
    }

    private _renderWorkItemRow = (props: IWorkItemRowProps, defaultRenderer: IRenderFunction<IWorkItemRowProps>): JSX.Element => {
        return (
            <DroppableWorkItemRow
                {...props}
                dragAcceptHandler={this._workItemDragAcceptHandler}
                onWorkItemsDropped={this.props.onWorkItemsDropped}
                workItemRowRenderer={defaultRenderer}
            />
        );
    }

    private _renderTeamCallout(): JSX.Element {
        const {
            selectedTeam,
            teams
        } = this.props;

        const {
            isTeamCalloutOpen
        } = this.state;

        if (isTeamCalloutOpen) {
            return (
                <Callout
                    target={this._teamCalloutTarget}
                    onDismiss={this._hideTeamCallout}
                    directionalHint={DirectionalHint.bottomLeftEdge}
                    isBeakVisible={false}
                    setInitialFocus={true}
                    onPositioned={this._onCalloutPositioned}
                >
                    <PickList
                        className="mapping-team-callout"
                        componentRef={this._resolvePickListRef}
                        isSearchable={true}
                        items={this._teamsPromise || teams}
                        getListItem={this._getPickListItem}
                        selectedItems={[selectedTeam]}
                        onSelectionChanged={this._onTeamSelected}
                        searchTextPlaceholder={BacklogContentViewResources.MappingPane_TeamSearchPlaceholder}
                    />
                </Callout>
            );
        }
    }

    private _getPickListItem = (team: Team): IPickListItem => {
        return {
            key: team.id,
            name: team.name,
            iconProps: { iconType: VssIconType.fabric, iconName: "People" }
        };
    }

    private _showTeamCallout = (): void => {
        const {
            onFetchTeams,
            teams
        } = this.props;

        const {
            isTeamCalloutOpen
        } = this.state;

        if (!teams) {
            onFetchTeams();
        }

        if (!isTeamCalloutOpen) {
            this.setState({ isTeamCalloutOpen: true });
        }
    }

    private _hideTeamCallout = (): void => {
        const {
            isTeamCalloutOpen
        } = this.state;

        if (isTeamCalloutOpen) {
            this.setState({ isTeamCalloutOpen: false });
        }
    }

    private _onCalloutPositioned = (): void => {
        if (this._pickListRef) {
            this._pickListRef.focus();
        }
    }

    private _onNavigateToTargetBacklog = (event: React.MouseEvent<HTMLElement>): void => {
        const {
            onNavigateToTargetBacklog
        } = this.props;

        if (onNavigateToTargetBacklog && !event.ctrlKey && !event.metaKey && !event.shiftKey) {
            event.preventDefault();
            onNavigateToTargetBacklog();
        }
    }

    private _onTeamSelected = (selection: IPickListSelection): void => {
        const {
            selectedTeam,
            onTeamChanged
        } = this.props;

        const team: Team = selection.selectedItems[0];
        if (!selectedTeam.equals(team)) {
            onTeamChanged(team);
        }

        this._hideTeamCallout();
    }

    private _workItemDragAcceptHandler = (): boolean => {
        const {
            hostBacklogLevel,
            getWorkItemDragInfo
        } = this.props;

        const {
            topLevelWorkItemTypes
        } = getWorkItemDragInfo();

        return (
            topLevelWorkItemTypes && topLevelWorkItemTypes.length &&
            topLevelWorkItemTypes.every(
                (dragWorkItemType) => contains(hostBacklogLevel.workItemTypes, dragWorkItemType, localeIgnoreCaseComparer)
            )
        );
    }

    private _resolvePickListRef = (element: PickList): void => {
        this._pickListRef = element;
    }

    private _resolveTeamCalloutTarget = (element: HTMLElement): void => {
        this._teamCalloutTarget = element;
    }
}

export interface IDroppableWorkItemRowProps extends IWorkItemRowProps {
    dragAcceptHandler: () => boolean;
    workItemRowRenderer: (props: IWorkItemRowProps) => JSX.Element;
    onWorkItemsDropped: (workItemIds: number[], parentId: number) => void;
}

export class DroppableWorkItemRow extends React.Component<IDroppableWorkItemRowProps> {
    public render(): JSX.Element {
        if (this.props.workItem) {
            return (
                <SimpleDropZone
                    droppableOptions={{
                        accept: this.props.dragAcceptHandler,
                        activeClass: "work-item-row-drop-zone--drag-active",
                        hoverClass: "work-item-row-drop-zone--drag-hover",
                        drop: this._onWorkItemsDropped,
                        scope: DragDropScopes.ProductBacklog,
                        tolerance: "pointer"
                    }}
                    className="work-item-row-drop-zone"
                >
                    {this.props.workItemRowRenderer(this.props)}
                </SimpleDropZone>
            );
        } else {
            return (
                <div className="work-item-row-drop-zone">
                    {this.props.workItemRowRenderer(this.props)}
                </div>
            );
        }
    }

    private _onWorkItemsDropped = (event: JQueryEventObject, ui: JQueryUI.DroppableEventUIParam): void => {
        const {
            workItem,
            onWorkItemsDropped
        } = this.props;

        if (onWorkItemsDropped) {
            const workItemIds: number[] = ui.helper.data(ProductBacklogGrid.DATA_WORK_ITEM_IDS) || [];
            onWorkItemsDropped(workItemIds, workItem.id);
        }
    }
}