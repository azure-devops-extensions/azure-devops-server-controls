import * as React from "react";

import { PlanningView } from "Agile/Scripts/BacklogsHub/Planning/Components/PlanningView";
import { HubError } from "Agile/Scripts/Common/Components/AgileHubError";
import { BacklogContributionRightPanel } from "Agile/Scripts/Common/Components/BacklogPivot/BacklogContributionRightPanel";
import { LoadingComponent } from "Presentation/Scripts/TFS/Components/LoadingComponent";
import { Team } from "Agile/Scripts/Models/Team";
import { ISprintViewRightPanelData, RightPanelKey } from "Agile/Scripts/SprintsHub/SprintView/SprintContentViewContracts";
import { WorkDetailsPanelWrapper } from "Agile/Scripts/SprintsHub/WorkDetailsPanel/Components/WorkDetailsPanelWrapper";
import { IWorkItemDragInfo } from "Agile/Scripts/Common/IWorkItemDragInfo";
import { Iteration } from "Agile/Scripts/Models/Iteration";

export interface ISprintViewRightPanelProps {
    /** The current selected iteration on the Sprints Hub */
    selectedIteration: Iteration;
    /** The current team */
    team: Team;
    /** Props to pass to the right pane */
    panelData: ISprintViewRightPanelData;
    /** Handler to get the current dragging item's work item info */
    getWorkItemDragInfo?: ($item: JQuery) => IWorkItemDragInfo;
    /** Handler to move work items to a new iteration */
    moveWorkItemsToIteration?: (workItemIds: number[], newIterationPath: string, $item: JQuery) => void;
    /** Dismiss handler */
    onDismiss: () => void;
}

export class SprintViewRightPanel extends React.Component<ISprintViewRightPanelProps, {}> {

    constructor(props: ISprintViewRightPanelProps) {
        super(props);
    }

    public render() {
        const {
            selectedContributionId
        } = this.props.panelData;

        if (!selectedContributionId || selectedContributionId === RightPanelKey.OFF) {
            return null;
        } else {
            switch (selectedContributionId) {
                case RightPanelKey.__WORK_DETAILS_LEGACY:
                case RightPanelKey.WORK_DETAILS:
                    return this._renderWorkDetailsPanel();
                case RightPanelKey.PLANNING:
                    return this._renderPlanningPanel();
                default:
                    return this._renderContributionPanel();
            }
        }
    }

    private _renderWorkDetailsPanel(): JSX.Element {
        const { exceptionsInfo, loading } = this.props.panelData;

        if (exceptionsInfo && exceptionsInfo.length > 0) {
            return (
                <div className={"right-panel-error-container"}>
                    <HubError exceptionsInfo={exceptionsInfo} />
                </div>
            );
        } else if (loading || !this._shouldRenderWorkDetailsPanel()) {
            return <LoadingComponent />;
        } else {
            return <WorkDetailsPanelWrapper onDismiss={this.props.onDismiss} {...this.props.panelData.workDetailsData} />;
        }
    }

    private _renderPlanningPanel(): JSX.Element {
        return (
            <PlanningView
                selectedIteration={this.props.selectedIteration}
                onDismiss={this.props.onDismiss}
                team={this.props.team}
                getWorkItemDragInfo={this.props.getWorkItemDragInfo}
                moveWorkItemsToIteration={this.props.moveWorkItemsToIteration}
            />
        )
    }

    private _renderContributionPanel(): JSX.Element {

        if (!this._shouldRenderThirdPartyContributionPanel()) {
            return null;
        }

        return <BacklogContributionRightPanel
            onDismiss={this.props.onDismiss}
            contributionData={this.props.panelData.contributionData}
            eventHelper={this.props.panelData.eventHelper}
            getSelectedWorkItems={this.props.panelData.getSelectedWorkItems}
            team={this.props.team}
        />;
    }

    private _shouldRenderWorkDetailsPanel(): boolean {
        const workDetailsData = this.props.panelData.workDetailsData;

        return workDetailsData &&
            !!workDetailsData.fieldAggregator &&
            !workDetailsData.fieldAggregator.disposed &&
            !!workDetailsData.capacityOptions &&
            !!workDetailsData.teamCapacityModel;
    }

    private _shouldRenderThirdPartyContributionPanel(): boolean {
        return this.props.panelData.contributionData &&
            this.props.panelData.eventHelper &&
            !!this.props.panelData.getSelectedWorkItems;
    }
}