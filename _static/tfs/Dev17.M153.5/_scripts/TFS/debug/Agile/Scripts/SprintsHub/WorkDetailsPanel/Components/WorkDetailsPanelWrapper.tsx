import * as React from "react";

import "VSS/LoaderPlugins/Css!Agile/Scripts/SprintsHub/WorkDetailsPanel/Components/WorkDetailsPanel";
import * as SprintsHubResources from "Agile/Scripts/Resources/TFS.Resources.SprintsHub";
import {
    IWorkDetailsPanelOptions,
    WorkDetailsPanel,
    WorkDetailsPanelContainers
} from "Agile/Scripts/SprintsHub/WorkDetailsPanel/Components/WorkDetailsPanel";
import { IWorkDetailsPanelDataProvidersInput, IWorkDetailsPanelWrapperProps } from "Agile/Scripts/SprintsHub/WorkDetailsPanel/WorkDetailsContracts";
import {
    ActivityGroupDataProvider,
    AssignedToGroupDataProvider,
    TeamGroupDataProvider
} from "Agile/Scripts/SprintsHub/WorkDetailsPanel/WorkDetailsDataProviders";
import { Debug } from "VSS/Diag";
import { Component } from "VSS/Flux/Component";
import { format } from "VSS/Utils/String";
import { RightPaneHeader } from "Agile/Scripts/Common/Components/RightPaneHeader/RightPaneHeader";

export class WorkDetailsPanelWrapper extends Component<IWorkDetailsPanelWrapperProps, {}> {

    private _detailsPanel: WorkDetailsPanel;

    constructor(props: IWorkDetailsPanelWrapperProps) {
        super(props);
        this._verifyProps(this.props);
    }

    public render(): JSX.Element {
        return (
            <RightPaneHeader title={SprintsHubResources.WorkDetails} description={SprintsHubResources.WorkDetailsDescription} onDismissClicked={this.props.onDismiss}>
                <div className="details-panel-container" role="complementary" aria-label={SprintsHubResources.WorkDetails}>
                    <div className="backlogs-default-tool-panel-container">
                        <div className="backlogs-tool-panel-content">
                            <div className={WorkDetailsPanelContainers.CapacityPaneContainer}>
                                <div className={WorkDetailsPanelContainers.TeamCapacity} />
                                <div className={WorkDetailsPanelContainers.ActivityGroupedProgress} />
                                <div className={WorkDetailsPanelContainers.AssignedToGroupedProgress} />
                            </div>
                        </div>
                    </div>
                </div>
            </RightPaneHeader>
        );
    }

    public componentDidMount() {
        this._createPanel();
    }

    public componentWillReceiveProps(nextProps: IWorkDetailsPanelWrapperProps) {
        this._verifyProps(nextProps);

        if (nextProps.fieldAggregator !== this.props.fieldAggregator ||
            nextProps.capacityOptions !== this.props.capacityOptions ||
            nextProps.teamCapacityModel !== this.props.teamCapacityModel ||
            nextProps.capacityActions !== this.props.capacityActions ||
            nextProps.droppableWorkItemChangeOptions !== this.props.droppableWorkItemChangeOptions) {

            this._resetPanel();
        }
    }

    public componentDidUpdate() {
        this._createPanel();
    }

    public componentWillUnmount(): void {
        this._resetPanel();
    }

    private _resetPanel(): void {
        if (this._detailsPanel) {
            this._detailsPanel.dispose();
            this._detailsPanel = null;
        }
    }

    private _createPanel(): void {
        if (this._shouldCreateWorkDetailsPanel()) {
            const {
                activityGroupDataProvider,
                assignedToGroupDataProvider,
                teamGroupDataProvider,
                remainingWorkSuffixFormat
            } = this._createProviders(this.props);

            const {
                droppableWorkItemChangeOptions,
                fieldAggregator
            } = this.props;

            const options: IWorkDetailsPanelOptions = {
                fieldAggregator,
                assignedToGroupDataProvider,
                activityGroupDataProvider,
                teamGroupDataProvider,
                remainingWorkSuffixFormat,
                droppableWorkItemChangeOptions
            };

            this._detailsPanel = new WorkDetailsPanel(options);
        }
    }

    private _createProviders(input: IWorkDetailsPanelDataProvidersInput): {
        assignedToGroupDataProvider: AssignedToGroupDataProvider;
        activityGroupDataProvider: ActivityGroupDataProvider;
        teamGroupDataProvider: TeamGroupDataProvider;
        remainingWorkSuffixFormat: string;
    } {

        const assignedToDataProvider = new AssignedToGroupDataProvider(
            input.fieldAggregator,
            input.teamCapacityModel,
            input.capacityOptions.assignedToFieldDisplayName,
            input.capacityActions);

        const activityDataProvider = new ActivityGroupDataProvider(
            input.fieldAggregator,
            input.capacityOptions.activityFieldReferenceName,
            input.capacityOptions.activityFieldDisplayName,
            input.teamCapacityModel,
            input.capacityActions);

        const teamDataProvider = new TeamGroupDataProvider(
            input.fieldAggregator,
            input.teamCapacityModel,
            input.capacityActions);

        return {
            assignedToGroupDataProvider: assignedToDataProvider,
            activityGroupDataProvider: activityDataProvider,
            teamGroupDataProvider: teamDataProvider,
            remainingWorkSuffixFormat: input.capacityOptions.remainingWorkSuffixFormat
        };
    }

    private _verifyProps(props: IWorkDetailsPanelWrapperProps): void {
        const msgFormat = "WorkDetailsPanelWrapper - {0}";
        Debug.assertIsNotNull(props.fieldAggregator, format(msgFormat, "fieldAggregator is null"));
        Debug.assert(!props.fieldAggregator.disposed, format(msgFormat, "fieldAggregator is disposed"));
        Debug.assertIsNotNull(props.capacityOptions, format(msgFormat, "capacityOptions is null"));
        Debug.assertIsNotNull(props.teamCapacityModel, format(msgFormat, "teamCapacity is null"));
    }

    private _shouldCreateWorkDetailsPanel(): boolean {
        return this._detailsPanel == null;
    }
}