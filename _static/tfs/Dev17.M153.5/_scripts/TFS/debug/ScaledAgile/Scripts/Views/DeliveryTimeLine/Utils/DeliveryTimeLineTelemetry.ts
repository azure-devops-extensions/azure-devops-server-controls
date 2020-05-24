
import * as Utils_Date from "VSS/Utils/Date";
import { TimelineTeamStatusCode, TimelineIterationStatusCode, TimelineCriteriaStatusCode } from "TFS/Work/Contracts";
import { DeliveryTimeLineActions } from "ScaledAgile/Scripts/Views/DeliveryTimeLine/Actions/DeliveryTimeLineActions";
import { IDeliveryTimeLineViewData, ITeam, IMoveItemParams, ICollapseTeamParams, IZoomLevelParams, ICalendarMarker } from "ScaledAgile/Scripts/Views/DeliveryTimeLine/Models/DeliveryTimeLineInterfaces";
import { ScaledAgileTelemetry } from "ScaledAgile/Scripts/Shared/Utils/Telemetry";
import { autobind } from "OfficeFabric/Utilities";
import { Movement, MovementType } from "ScaledAgile/Scripts/Views/DeliveryTimeLine/Models/DeliveryTimeLineModels";

export interface IDeliveryTimeLineTelemetry {
    /**
     * Telemetry recorded about how the user move around a plan
     */
    move(planId: string, movement: Movement, movementType: MovementType): void;

    /**
     * Telemetry recorded about on what the user right click
     */
    rightClick(planId: string, domId: string, domClasses: string): void;

    /**
     * Telemetry indicating that a user created a new item from a Plan
     */
    newItem(planId: string, areaPath: string, iterationPath: string): void;
}

/**
 * Consolidate all telemetry calls for DelivertyTimeLine into a single class.
 * This class would listen to the DeliveryTimeLineActions and log telemtry automatically.
 */
export class DeliveryTimeLineTelemetry implements IDeliveryTimeLineTelemetry {
    private _deliveryTimelineActions: DeliveryTimeLineActions;

    constructor(deliveryTimelineActions: DeliveryTimeLineActions) {
        this._deliveryTimelineActions = deliveryTimelineActions;
        this._addListeners();
    }

    public move(planId: string, movement: Movement, movementType: MovementType) {
        const properties: IDictionaryStringTo<any> = {
            [ScaledAgileTelemetry.KeyPlanId]: planId,
            "Movement": movement,
            "MovementType": movementType
        };
        ScaledAgileTelemetry.publish("DeliveryTimeline.Move", properties);
    }

    public rightClick(planId: string, domId: string, domClasses: string) {
        const properties: IDictionaryStringTo<any> = {
            [ScaledAgileTelemetry.KeyPlanId]: planId,
            "DomId": domId,
            "DomClasses": domClasses
        };
        ScaledAgileTelemetry.publish("DeliveryTimeline.RightClick", properties);
    }

    public newItem(planId: string, areaPath: string, iterationPath: string) {
        const properties: IDictionaryStringTo<any> = {
            [ScaledAgileTelemetry.KeyPlanId]: planId,
            "AreaPath": areaPath,
            "IterationPath": iterationPath
        };
        ScaledAgileTelemetry.publish("DeliveryTimeline.NewItem", properties);
    }

    /**
     * Cleanup the handlers
     */
    public dispose() {
        this._removeListeners();
    }

    private _addListeners() {
        this._deliveryTimelineActions.initialize.addListener(this._planLoaded);
        this._deliveryTimelineActions.moveItemBetweenIntervals.addListener(this._planMoveCardBetweenIterations);
        this._deliveryTimelineActions.reorderItemInsideInterval.addListener(this._planReorderItemInsideInterval);
        this._deliveryTimelineActions.collapseTeam.addListener(this._planCollapse);
        this._deliveryTimelineActions.zoomLevelChanged.addListener(this._zoomLevelChange);
    }

    private _removeListeners() {
        this._deliveryTimelineActions.initialize.removeListener(this._planLoaded);
        this._deliveryTimelineActions.moveItemBetweenIntervals.removeListener(this._planMoveCardBetweenIterations);
        this._deliveryTimelineActions.reorderItemInsideInterval.removeListener(this._planReorderItemInsideInterval);
        this._deliveryTimelineActions.collapseTeam.removeListener(this._planCollapse);
        this._deliveryTimelineActions.zoomLevelChanged.removeListener(this._zoomLevelChange);
    }

    @autobind
    private _zoomLevelChange(data: IZoomLevelParams): void {
        const properties: IDictionaryStringTo<any> = {
            [ScaledAgileTelemetry.KeyPlanId]: data.planId,
            "ZoomLevel": data.zoomLevel,
        };
        ScaledAgileTelemetry.publish("DeliveryTimeline.ZoomLevel", properties);
    }

    @autobind
    private _planCollapse(data: ICollapseTeamParams): void {
        const properties: IDictionaryStringTo<any> = {
            [ScaledAgileTelemetry.KeyPlanId]: data.planId,
            "TeamId": data.teamId,
            "IsCollapsed": data.isCollapsed,
        };
        ScaledAgileTelemetry.publish("DeliveryTimeline.CollapseTeam", properties);
    }

    @autobind
    private _planReorderItemInsideInterval(data: IMoveItemParams): void {
        if (!data.userInitiated) {
            return;
        }

        const properties: IDictionaryStringTo<any> = {
            [ScaledAgileTelemetry.KeyPlanId]: data.planId,
            "Success": data.isSuccessful,
            "ErrorMessage": data.errorMessage
        };
        ScaledAgileTelemetry.publish("DeliveryTimeline.ReorderWithinInterval", properties, data.startTime);
    }

    /**
     * Record telemetry about usage and performance of moving item across intervals, and record server error message if any.
     * and how many card got loaded
     * @param {boolean} success - Indicate if the server request is successful.
     * @param {string} errorMessage - Server request error message if any.
     * @param {number} startTime - Time when started the execution.
     */
    @autobind
    private _planMoveCardBetweenIterations(data: IMoveItemParams): void {
        const properties: IDictionaryStringTo<any> = {
            [ScaledAgileTelemetry.KeyPlanId]: data.planId,
            "Success": data.isSuccessful,
            "ErrorMessage": data.errorMessage
        };
        ScaledAgileTelemetry.publish("DeliveryTimeline.MoveAcrossIntervals", properties, data.startTime);
    }

    /**
     * Record telemetry on loading the DeliveryTimeline plan.
     * @param {IDeliveryTimeLineViewData} plan - Data for the delievery timeline.
     */
    @autobind
    private _planLoaded(plan: IDeliveryTimeLineViewData): void {
        let featureName = "DeliveryTimelinePlanLoaded";
        let backlogsPerTeam: IDictionaryStringTo<number> = {};
        let teamsPerBacklog: IDictionaryStringTo<number> = {};
        let teamsWithMultipleBacklogs = 0;
        let teamWithMissingTeamFieldCount = 0;
        let teamWithNoIterationCount = 0;
        let totalOverlapIterationCount = 0;

        for (let i = 0, len = plan.teams.length; i < len; i++) {
            let currentTeam: ITeam = plan.teams[i];
            if (currentTeam && currentTeam.backlog) {
                // Backlog count per team - Initialize to 0, if this is the first backlog
                let currentTeamBacklogCount = backlogsPerTeam[currentTeam.id] || 0;
                if (currentTeamBacklogCount === 1) {
                    // This team has multiple backlogs defined in this plan
                    teamsWithMultipleBacklogs++;
                }

                // Increment the backlog count for the team by 1
                backlogsPerTeam[currentTeam.id] = currentTeamBacklogCount + 1;

                // Team count per backlog
                let currentBacklogName = currentTeam.backlog.categoryReferenceName;
                // Teams using this backlog type - Initialize to 0, if this is the first team
                let currentTeamCount = teamsPerBacklog[currentBacklogName] || 0;
                teamsPerBacklog[currentBacklogName] = currentTeamCount + 1;
            }

            if (currentTeam.status && currentTeam.status.type === TimelineTeamStatusCode.MissingTeamFieldValue) {
                teamWithMissingTeamFieldCount++;
            }
            else if (currentTeam.status && currentTeam.status.type === TimelineTeamStatusCode.NoIterationsExist) {
                teamWithNoIterationCount++;
            }
            else {
                if (currentTeam.intervals) {
                    for (let j = 0, jlen = currentTeam.intervals.length; j < jlen; j++) {
                        const interval = currentTeam.intervals[j];
                        if (interval.status && interval.status.type === TimelineIterationStatusCode.IsOverlapping) {
                            totalOverlapIterationCount++;
                        }
                    }
                }
            }
        }

        // Calculate the plan mode
        let totalTeams = Object.keys(backlogsPerTeam).length;
        let totalBacklogs = Object.keys(teamsPerBacklog).length;
        const criteriaStatus = plan.criteriaStatus && plan.criteriaStatus.type ? TimelineCriteriaStatusCode[plan.criteriaStatus.type].toString() : TimelineCriteriaStatusCode[TimelineCriteriaStatusCode.OK].toString();

        const properties: IDictionaryStringTo<any> = {
            [ScaledAgileTelemetry.KeyPlanId]: plan.id,
            "teamCount": totalTeams,
            "backlogLevelCount": totalBacklogs,
            "teamsWithMultipleBacklogs": teamsWithMultipleBacklogs,
            "teamWithMissingTeamFieldCount": teamWithMissingTeamFieldCount,
            "teamWithNoIterationCount": teamWithNoIterationCount,
            "overlapIterationCount": totalOverlapIterationCount,
            "criteriaCount": plan.criteria ? plan.criteria.length : 0,
            "criteriaStatus": criteriaStatus,
        };
        
        // record marker telemetry
        let markerCiData = this._getMarkersTelemetry(plan.calendarMarkers);
        $.extend(properties, markerCiData);
        this._publish(featureName, properties);
    }

    private _getMarkersTelemetry(calendarMarkers: ICalendarMarker[]): IDictionaryStringTo<any> {
        const markerCount = calendarMarkers ? calendarMarkers.length: 0;
        let markerCiData: IDictionaryStringTo<any> = {
            "markerCount": markerCount
        }
        if (markerCount > 0) {
            let markerMaxLabelLength = 0;
            let markerCountBeforeToday = 0;
            let markerCountAfterToday = 0;
            let markerMinDaysDifference = Number.MAX_VALUE;
            const today = new Date();
            today.setHours(0,0,0,0);
            const markerDaysDifferenceFromOldestToToday = Utils_Date.daysBetweenDates(today, calendarMarkers[0].date, true);
            let previousMarker = null;
            for (let i = 0, len = markerCount; i < len; i++) {
                const marker = calendarMarkers[i];
                const labelLength = marker.label.length;
                if (labelLength > markerMaxLabelLength) {
                    markerMaxLabelLength = labelLength;
                }
                if (previousMarker != null && markerMinDaysDifference !== 0) {
                    const daysDiff = Utils_Date.daysBetweenDates(marker.date, previousMarker.date, true);
                    if (daysDiff < markerMinDaysDifference) {
                        markerMinDaysDifference = daysDiff;
                    }
                }
                if (Utils_Date.defaultComparer(marker.date, today) < 0) {
                    markerCountBeforeToday++;
                }
                else {
                    markerCountAfterToday++;
                }

                previousMarker = marker;
            }

            if (markerCount > 1) {
                $.extend(markerCiData, {
                    "markerMinDaysDifference": markerMinDaysDifference,
                });
            }

            $.extend(markerCiData, {
                "markerMaxLabelLength": markerMaxLabelLength,
                "markerDaysDifferenceFromOldestToToday": markerDaysDifferenceFromOldestToToday,
                "markerCountBeforeToday": markerCountBeforeToday,
                "markerCountAfterToday": markerCountAfterToday
            });
        }
        return markerCiData;
    }

    private _publish(featureName: string, properties: IDictionaryStringTo<any>) {
        ScaledAgileTelemetry.publish(featureName, properties);
    }
}
