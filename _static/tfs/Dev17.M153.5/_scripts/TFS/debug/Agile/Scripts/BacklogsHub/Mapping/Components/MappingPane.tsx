import * as React from "react";

import "VSS/LoaderPlugins/Css!Agile/Scripts/BacklogsHub/Mapping/Components/MappingPane";
import { BacklogsHubTelemetryConstants } from "Agile/Scripts/BacklogsHub/BacklogsHubTelemetryConstants";
import { MappingActions } from "Agile/Scripts/BacklogsHub/Mapping/ActionsCreator/MappingActions";
import { IMappingActionsCreator, MappingActionsCreator } from "Agile/Scripts/BacklogsHub/Mapping/ActionsCreator/MappingActionsCreator";
import { MappingDataProvider } from "Agile/Scripts/BacklogsHub/Mapping/ActionsCreator/MappingDataProvider";
import { MappingMembershipEvaluator } from "Agile/Scripts/BacklogsHub/Mapping/ActionsCreator/MappingMembershipEvaluator";
import { MappingWorkItemEventSubscriber } from "Agile/Scripts/BacklogsHub/Mapping/ActionsCreator/MappingWorkItemEventSubscriber";
import { MappingComponent } from "Agile/Scripts/BacklogsHub/Mapping/Components/MappingComponent";
import { getState, IMappingPaneState } from "Agile/Scripts/BacklogsHub/Mapping/Selectors/MappingSelectors";
import { IMappingStore, MappingStore } from "Agile/Scripts/BacklogsHub/Mapping/Store/MappingStore";
import { BacklogsHubTelemetryHelper } from "Agile/Scripts/Common/HubTelemetryHelper";
import { BacklogsUrls, IBacklogUrlOptions } from "Agile/Scripts/Common/HubUrlUtilities";
import { Team } from "Agile/Scripts/Models/Team";
import * as BacklogContentViewResources from "Agile/Scripts/Resources/TFS.Resources.BacklogsHub.BacklogView";
import { IBacklogLevelConfiguration } from "Presentation/Scripts/TFS/FeatureRef/BacklogConfiguration/Models";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { ProjectCollection } from "Presentation/Scripts/TFS/TFS.OM.Common";
import { WorkItem as IWorkItem } from "TFS/WorkItemTracking/Contracts";
import { getDefaultWebContext } from "VSS/Context";
import { equals, format } from "VSS/Utils/String";
import { WorkItemManager } from "WorkItemTracking/Scripts/OM/WorkItemManager";
import { WorkItemStore } from "WorkItemTracking/Scripts/TFS.WorkItemTracking";
import { RightPaneHeader } from "Agile/Scripts/Common/Components/RightPaneHeader/RightPaneHeader";
import { IWorkItemDragInfo } from "Agile/Scripts/Common/IWorkItemDragInfo";

export interface IMappingPaneProps {
    /** The current team */
    currentTeam: Team;
    /** The backlog level hosting this panel */
    hostBacklogLevel: IBacklogLevelConfiguration;
    /** The backlog level this panel will display */
    targetBacklogLevel: IBacklogLevelConfiguration;
    /** Get the currently dragging work items information */
    getWorkItemDragInfo: () => IWorkItemDragInfo;

    onSameTeamBacklogChanged: (backlog: IBacklogLevelConfiguration) => void;
    /** Callback for when work items are dropped on a feature */
    onWorkItemsDropped: (workItemIds: number[], parentId: number) => void;

    onDismiss: () => void;
}

export class MappingPane extends React.Component<IMappingPaneProps, IMappingPaneState> {
    private _actionsCreator: IMappingActionsCreator;
    private _mappingWorkItemEventSubscriber: MappingWorkItemEventSubscriber;
    private _store: IMappingStore;

    constructor(props: IMappingPaneProps) {
        super(props);

        const mappingActions = new MappingActions();
        const mappingDataProvider = new MappingDataProvider();
        this._actionsCreator = new MappingActionsCreator(mappingActions, mappingDataProvider);
        this._store = new MappingStore(mappingActions);

        this._mappingWorkItemEventSubscriber = new MappingWorkItemEventSubscriber(
            this._actionsCreator,
            new MappingMembershipEvaluator(() => this.state.selectedTeamSettings, () => this.props.targetBacklogLevel),
            this._getWorkItemManager()
        );

        this._mappingWorkItemEventSubscriber.initialize();

        this.state = getState(this._store);
    }

    public componentWillMount(): void {
        this._store.addChangedListener(this._onStoreChanged);

        // Delay till next tick, as an action could still be executing
        this._actionsCreator.selectTeamAndBacklogLevel(this.props.currentTeam, this.props.targetBacklogLevel);

        BacklogsHubTelemetryHelper.publishTelemetry(BacklogsHubTelemetryConstants.MAPPING_OPENED, {});
    }

    public componentWillReceiveProps(nextProps: IMappingPaneProps): void {
        if (nextProps.targetBacklogLevel.id !== this.props.targetBacklogLevel.id) {
            // Delay till next tick, as an action could still be executing
            this._actionsCreator.selectTeamAndBacklogLevel(this.state.selectedTeam, nextProps.targetBacklogLevel);
        }
    }

    public componentWillUnmount(): void {
        this._mappingWorkItemEventSubscriber.dispose();
        this._store.removeChangedListener(this._onStoreChanged);

        BacklogsHubTelemetryHelper.publishTelemetry(BacklogsHubTelemetryConstants.MAPPING_CLOSED, {});
    }

    public render(): JSX.Element {
        const {
            getWorkItemDragInfo,
            hostBacklogLevel,
            onWorkItemsDropped,
            targetBacklogLevel
        } = this.props;

        const {
            isBacklogLevelVisible,
            selectedTeam,
            teams,
            teamsLoading,
            workItemIds,
            workItemIdsLoading,
            workItemIdsLoadingError,
            workItemPageError
        } = this.state;

        if (targetBacklogLevel && selectedTeam) {
            return (
                <RightPaneHeader
                    title={BacklogContentViewResources.MappingPaneTitle}
                    description={format(BacklogContentViewResources.MappingPaneDescription, this.props.targetBacklogLevel.name)}
                    onDismissClicked={this.props.onDismiss}>
                    <div className="mapping-pane" role="complementary" aria-label={BacklogContentViewResources.MappingPaneTitle}>

                        <MappingComponent
                            getWorkItemDragInfo={getWorkItemDragInfo}
                            hostBacklogLevel={hostBacklogLevel}
                            isTargetBacklogLevelVisible={isBacklogLevelVisible}
                            targetBacklogLevel={targetBacklogLevel}
                            selectedTeam={selectedTeam}
                            teams={teams}
                            teamsLoading={teamsLoading}
                            workItemIds={workItemIds}
                            workItemIdsLoading={workItemIdsLoading}
                            workItemIdsLoadingError={workItemIdsLoadingError}
                            workItemPageError={workItemPageError}
                            getWorkItem={this._getWorkItem}
                            getWorkItemError={this._getWorkItemError}
                            shouldPageWorkItem={this._shouldPageWorkItem}
                            onFetchTeams={this._onFetchTeams}
                            onNavigateToTargetBacklog={this._onNavigateToTargetBacklog}
                            onPageWorkItems={this._onPageWorkItems}
                            onRefreshWorkItems={this._onRefreshWorkItems}
                            onTeamChanged={this._onTeamChanged}
                            onWorkItemsDropped={onWorkItemsDropped}
                        />
                    </div >
                </RightPaneHeader>
            );
        }

        return null;
    }

    private _onFetchTeams = (): void => {
        this._actionsCreator.fetchTeamsForProject();
    }

    private _onNavigateToTargetBacklog = (): void => {
        const {
            currentTeam,
            onSameTeamBacklogChanged,
            targetBacklogLevel
        } = this.props;

        const {
            selectedTeam
        } = this.state;

        if (equals(selectedTeam.id, currentTeam.id, true)) {
            onSameTeamBacklogChanged(targetBacklogLevel);
        } else {
            const url = BacklogsUrls.getBacklogContentUrl({
                teamIdOrName: selectedTeam.name,
                backlogLevel: targetBacklogLevel.name
            } as IBacklogUrlOptions);

            if (!getDefaultWebContext().team) {
                // Vertical navigation is enabled, can perform xhr switch
                BacklogsUrls.navigateToBacklogsHubUrl(url);
            } else {
                window.location.href = url;
            }
        }
    }

    private _onPageWorkItems = (workItemIds: number[]): void => {
        this._actionsCreator.pageWorkItems(workItemIds);
    }

    private _onRefreshWorkItems = (): void => {
        const {
            targetBacklogLevel
        } = this.props;

        const {
            selectedTeam
        } = this.state;

        this._actionsCreator.selectTeamAndBacklogLevel(selectedTeam, targetBacklogLevel);
    }

    private _onStoreChanged = (): void => {
        this.setState(getState(this._store));
    }

    private _onTeamChanged = (newTeam: Team): void => {
        const {
            currentTeam,
            targetBacklogLevel
        } = this.props;

        BacklogsHubTelemetryHelper.publishTelemetry(BacklogsHubTelemetryConstants.MAPPING_TEAM_SELECTED, {
            [BacklogsHubTelemetryConstants.SameTeam]: currentTeam.id === newTeam.id
        });

        this._actionsCreator.selectTeamAndBacklogLevel(newTeam, targetBacklogLevel);
    }

    private _getWorkItem = (workItemId: number): IWorkItem => {
        return this._store.getWorkItem(workItemId);
    }

    private _getWorkItemError = (workItemId: number): boolean => {
        return this._store.isWorkItemError(workItemId);
    }

    private _shouldPageWorkItem = (workItemId: number): boolean => {
        return this._store.shouldPageWorkItem(workItemId);
    }

    private _getWorkItemManager(): WorkItemManager {
        const tfsContext = TfsContext.getDefault();
        const store = ProjectCollection.getConnection(tfsContext).getService<WorkItemStore>(WorkItemStore);
        return WorkItemManager.get(store);
    }
}