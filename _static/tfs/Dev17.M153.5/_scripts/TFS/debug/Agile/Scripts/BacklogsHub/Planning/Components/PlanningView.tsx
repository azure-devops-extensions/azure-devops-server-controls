import * as React from "react";

import "VSS/LoaderPlugins/Css!Agile/Scripts/BacklogsHub/Planning/Components/PlanningView";
import { BacklogsHubTelemetryConstants } from "Agile/Scripts/BacklogsHub/BacklogsHubTelemetryConstants";
import { PlanningActions } from "Agile/Scripts/BacklogsHub/Planning/ActionsCreator/PlanningActions";
import { PlanningActionsCreator } from "Agile/Scripts/BacklogsHub/Planning/ActionsCreator/PlanningActionsCreator";
import { PlanningDataProvider } from "Agile/Scripts/BacklogsHub/Planning/ActionsCreator/PlanningDataProvider";
import {
    IPlanningWorkItemEventSubscriber,
    PlanningWorkItemEventSubscriber
} from "Agile/Scripts/BacklogsHub/Planning/ActionsCreator/PlanningWorkItemEventSubscriber";
import { PlanningRow } from "Agile/Scripts/BacklogsHub/Planning/Components/PlanningRow";
import { getState, IPlanningViewState } from "Agile/Scripts/BacklogsHub/Planning/Selectors/PlanningSelectors";
import { PlanningStore } from "Agile/Scripts/BacklogsHub/Planning/Store/PlanningStore";
import { RightPaneHeader } from "Agile/Scripts/Common/Components/RightPaneHeader/RightPaneHeader";
import { BacklogsHubTelemetryHelper } from "Agile/Scripts/Common/HubTelemetryHelper";
import { BacklogsUrls, SprintsUrls } from "Agile/Scripts/Common/HubUrlUtilities";
import { IWorkItemDragInfo } from "Agile/Scripts/Common/IWorkItemDragInfo";
import { BacklogsHubConstants, SprintsHubRoutingConstants } from "Agile/Scripts/Generated/HubConstants";
import { Iteration } from "Agile/Scripts/Models/Iteration";
import { Team } from "Agile/Scripts/Models/Team";
import { ProductBacklogMembershipEvaluator } from "Agile/Scripts/ProductBacklog/ProductBacklogMembershipEvaluator";
import * as BacklogContentViewResources from "Agile/Scripts/Resources/TFS.Resources.BacklogsHub.BacklogView";
import { SprintEditorCallout } from "Agile/Scripts/SprintsHub/SprintEditor/Components/SprintEditorCallout";
import { ActionButton } from "OfficeFabric/Button";
import { DirectionalHint } from "OfficeFabric/Callout";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { WorkZeroDataIllustrationPaths } from "Presentation/Scripts/TFS/TFS.IllustrationUrlUtils";
import { ProjectCollection } from "Presentation/Scripts/TFS/TFS.OM.Common";
import { getDefaultWebContext } from "VSS/Context";
import { urlHelper } from "VSS/Locations";
import { delay } from "VSS/Utils/Core";
import { equals } from "VSS/Utils/String";
import { FormatComponent } from "VSSPreview/Flux/Components/Format";
import { ZeroData, ZeroDataActionType } from "VSSUI/ZeroData";
import { WorkItemManager } from "WorkItemTracking/Scripts/OM/WorkItemManager";
import { WorkItemStore } from "WorkItemTracking/Scripts/TFS.WorkItemTracking";

export interface IPlanningViewProps {
    /** The selected iteration from the parent page. If the parent page has no iteration, this will be undefined */
    selectedIteration?: Iteration;
    /** Get the current work items that are being dragged */
    getWorkItemDragInfo: ($item: JQuery) => IWorkItemDragInfo;
    /** Handler when this view requests to move work items to another iteration */
    moveWorkItemsToIteration: (workItemIds: number[], newIterationPath: string, $item: JQuery) => void;
    /** The current team */
    team: Team;

    onDismiss: () => void;
}

/**
 * Renders a set of iterations in drop zones
 */
export class PlanningView extends React.Component<IPlanningViewProps, IPlanningViewState> {
    private _newSprintCalloutTarget: HTMLElement;
    private _calloutTargetDirection: DirectionalHint;

    /** Actions creator for the planning pane */
    private _actionsCreator: PlanningActionsCreator;
    /** Store for the planning pane */
    private _store: PlanningStore;
    /** Subscribes to work item events and updates the planning store */
    private _workItemEventsSubscriber: IPlanningWorkItemEventSubscriber;

    constructor(props: IPlanningViewProps, context: any) {
        super(props, context);

        // Planning
        const planningActions = new PlanningActions();
        const planningDataProvider = new PlanningDataProvider(props.team.id);
        this._actionsCreator = new PlanningActionsCreator(planningActions, planningDataProvider);
        this._store = new PlanningStore(planningActions);

        const workItemManager = this._getWorkItemManager();
        this._workItemEventsSubscriber = new PlanningWorkItemEventSubscriber(
            this._actionsCreator,
            () => new ProductBacklogMembershipEvaluator(props.team.id),
            workItemManager,
            planningDataProvider.getTeamFieldReferenceName(),
            planningDataProvider.getEffortsFieldName(),
            planningDataProvider.getRequirementWorkItemTypes());

        this.state = getState(this._store);
    }
    public componentWillMount(): void {
        this._store.addChangedListener(this._onStoreChanged);
        this._actionsCreator.initialize();
        this._workItemEventsSubscriber.initialize();
        BacklogsHubTelemetryHelper.publishTelemetry(BacklogsHubTelemetryConstants.PLANNING_OPENED, {});
    }

    public componentDidUpdate(prevProps: IPlanningViewProps): void {
        if (this.props.selectedIteration && prevProps.selectedIteration !== this.props.selectedIteration) {
            this._actionsCreator.reloadPlanningData();
        }
    }

    public componentWillUnmount(): void {
        this._store.removeChangedListener(this._onStoreChanged);

        BacklogsHubTelemetryHelper.publishTelemetry(BacklogsHubTelemetryConstants.PLANNING_CLOSED, {});

        if (this._workItemEventsSubscriber) {
            this._workItemEventsSubscriber.dispose();
            this._workItemEventsSubscriber = null;
        }
    }

    public render(): JSX.Element {
        const {
            iterations,
            isNewSprintCalloutVisible
        } = this.state;

        return (
            <RightPaneHeader title={BacklogContentViewResources.PlanningPaneTitle} description={BacklogContentViewResources.PlanningPaneDescription} onDismissClicked={this.props.onDismiss}>
                <div className="sprint-planning-view" role="complementary" aria-label={BacklogContentViewResources.PlanningPaneTitle}>
                    {iterations && iterations.length > 0 && [(
                        <div className="sprint-planning-row-list" key="list">
                            {this._renderBacklogIterationRow()}
                            {iterations && iterations.map(iteration => this._renderPlanningRow(iteration))}
                        </div>
                    ), (
                        <div className="sprint-planning-actions" key="actions">
                            <ActionButton
                                iconProps={{ iconName: "Add" }}
                                onClick={this._onOpenNewSprintCallout}
                            >
                                {BacklogContentViewResources.NewSprint}
                            </ActionButton>
                        </div>
                    )]}
                    {this._renderZeroData()}
                    {isNewSprintCalloutVisible && this._renderNewSprintCallout()}
                </div >
            </RightPaneHeader>
        );
    }

    private _renderBacklogIterationRow(): JSX.Element {
        const {
            getWorkItemDragInfo
        } = this.props;

        const {
            backlogIteration
        } = this.state;

        if (backlogIteration) {
            return (
                <PlanningRow
                    key={backlogIteration.id}
                    backlogUrl={this._getBacklogUrl()}
                    iteration={backlogIteration}
                    isBacklogIteration={true}
                    getWorkItemDragInfo={getWorkItemDragInfo}
                    onWorkItemsDropped={this._onWorkItemsDropped}
                    onBacklogClicked={this._onBacklogClicked}
                />
            );
        }
    }

    private _renderPlanningRow(iteration: Iteration): JSX.Element {
        const {
            getWorkItemDragInfo
        } = this.props;

        const {
            currentIterationId,
            iterationEfforts,
            iterationLoading,
            iterationSummaryErrors,
            iterationTeamDaysOffUTC,
            weekends
        } = this.state;

        const iterationEffort = iterationEfforts[iteration.id];
        const iterationIsLoading = !!iterationLoading[iteration.id];
        const summaryError = iterationSummaryErrors[iteration.id];
        const teamDaysOffUTC = iterationTeamDaysOffUTC[iteration.id];
        const workItemSummary = iterationEffort ? iterationEffort.countByWorkItemType : {};
        const totalEffort = iterationEffort ? iterationEffort.totalEfforts : 0;

        return (
            <PlanningRow
                key={iteration.id}
                iterationUrl={this._getIterationUrl(iteration)}
                iteration={iteration}
                isCurrent={currentIterationId === iteration.id}
                effort={totalEffort}
                weekends={weekends}
                teamDaysOffUTC={teamDaysOffUTC}
                iterationDetailsLoading={iterationIsLoading}
                workItemCountByName={workItemSummary}
                summaryError={summaryError}
                getWorkItemDragInfo={getWorkItemDragInfo}
                onWorkItemsDropped={this._onWorkItemsDropped}
                onIterationClicked={this._onIterationClicked}
            />
        );
    }

    private _renderNewSprintCallout(): JSX.Element {
        const {
            team
        } = this.props;

        return (
            <SprintEditorCallout
                currentTeam={team}
                target={this._newSprintCalloutTarget}
                directionalHint={this._calloutTargetDirection || DirectionalHint.leftCenter}
                hideStatusMessage={true}
                onDismiss={this._onNewSprintCalloutDismiss}
                onCompleted={this._onNewSprintCalloutCompleted}
            />
        );
    }

    private _renderZeroData(): JSX.Element {
        const {
            iterations
        } = this.state;

        if (!iterations || iterations.length === 0) {
            const secondaryText = (
                <FormatComponent
                    format={BacklogContentViewResources.PrioritizeWithSprints_Format}
                >
                    <a
                        href={"https://go.microsoft.com/fwlink/?linkid=617156"}
                    >
                        {BacklogContentViewResources.PrioritizeWithSprints_Link}
                    </a>
                </FormatComponent>
            );

            return (
                <div className="sprint-planning-zero-data">
                    <ZeroData
                        imagePath={urlHelper.getVersionedContentUrl(WorkZeroDataIllustrationPaths.GetStartedWithSprints)}
                        imageAltText={BacklogContentViewResources.GetStartedWithSprints}
                        primaryText={BacklogContentViewResources.GetStartedWithSprints}
                        secondaryText={secondaryText}
                        actionText={BacklogContentViewResources.NewSprint}
                        actionType={ZeroDataActionType.ctaButton}
                        onActionClick={this._onOpenNewSprintCalloutZeroDay}
                    />
                </div>
            );
        }
    }

    private _onOpenNewSprintCallout = (event: React.MouseEvent<any>): void => {
        this._newSprintCalloutTarget = event.currentTarget;
        this._calloutTargetDirection = DirectionalHint.leftCenter;
        this._actionsCreator.toggleNewSprintCallout(true);
    }

    private _onOpenNewSprintCalloutZeroDay = (event: React.MouseEvent<any>): void => {
        this._newSprintCalloutTarget = event.currentTarget;
        this._calloutTargetDirection = DirectionalHint.bottomCenter;
        this._actionsCreator.toggleNewSprintCallout(true);
        BacklogsHubTelemetryHelper.publishTelemetry(BacklogsHubTelemetryConstants.PLANNING_NEW_SPRINT_OPENED, {});
    }

    private _onNewSprintCalloutDismiss = (): void => {
        this._newSprintCalloutTarget = null;
        this._actionsCreator.toggleNewSprintCallout(false);
    }

    private _onNewSprintCalloutCompleted = (team: Team, iteration: Iteration): void => {
        this._actionsCreator.toggleNewSprintCallout(false);
        window.location.reload();
    }

    private _onStoreChanged = (): void => {
        this.setState(getState(this._store));
    }

    private _onBacklogClicked = (event: React.MouseEvent<HTMLElement>): void => {
        const {
            team
        } = this.props;

        BacklogsHubTelemetryHelper.publishTelemetry(BacklogsHubTelemetryConstants.PLANNING_NAVIGATE_TO_BACKLOG, {});

        const url = this._getBacklogUrl();

        if (this._canPerformXhrNavigation(team)) {
            delay(null, 0, () => BacklogsUrls.navigateToBacklogsHubUrl(url));
        } else {
            window.location.href = url;
        }
    }

    private _onIterationClicked = (event: React.MouseEvent<HTMLElement>, iteration: Iteration): void => {
        const {
            team
        } = this.props;

        BacklogsHubTelemetryHelper.publishTelemetry(BacklogsHubTelemetryConstants.PLANNING_NAVIGATE_TO_ITERATION, {});

        const url = this._getIterationUrl(iteration);

        if (this._canPerformXhrNavigation(team)) {
            delay(null, 0, () => SprintsUrls.navigateToSprintsHubUrl(url));
        } else {
            window.location.href = url;
        }
    }

    private _canPerformXhrNavigation(targetTeam: Team): boolean {
        // Checking if we need to do a full-page refresh:
        // - no global team context
        // - or, destination team is the same as the current one
        const webContext = getDefaultWebContext();
        return !webContext.team || equals(webContext.team.id, targetTeam.id, true);
    }

    private _onWorkItemsDropped = (workItemIds: number[], iterationPath: string, $item: JQuery) => {
        const {
            moveWorkItemsToIteration
        } = this.props;

        const {
            backlogIteration
        } = this.state;

        if (equals(iterationPath, backlogIteration.iterationPath, true /* ignore case */)) {
            BacklogsHubTelemetryHelper.publishTelemetry(BacklogsHubTelemetryConstants.PLANNING_ITEM_DROPPED_BACKLOG, {
                count: workItemIds.length
            });
        } else {
            BacklogsHubTelemetryHelper.publishTelemetry(BacklogsHubTelemetryConstants.PLANNING_ITEM_DROPPED, {
                count: workItemIds.length
            });
        }

        if (moveWorkItemsToIteration) {
            moveWorkItemsToIteration(workItemIds, iterationPath, $item);
        }
    }

    private _getBacklogUrl = (): string => {
        return BacklogsUrls.getBacklogContentUrl({
            teamIdOrName: this.props.team.name,
            pivot: BacklogsHubConstants.BacklogPivot,
            preserveQueryParameters: true
        });
    }

    private _getIterationUrl = (iteration: Iteration): string => {
        const {
            team
        } = this.props;

        return SprintsUrls.getExternalSprintContentUrl(
            team.name,
            iteration.iterationPath,
            SprintsHubRoutingConstants.SprintBacklogPivot
        );
    }

    private _getWorkItemManager(): WorkItemManager {
        const tfsContext = TfsContext.getDefault();
        const store = ProjectCollection.getConnection(tfsContext).getService<WorkItemStore>(WorkItemStore);
        return WorkItemManager.get(store);
    }
}