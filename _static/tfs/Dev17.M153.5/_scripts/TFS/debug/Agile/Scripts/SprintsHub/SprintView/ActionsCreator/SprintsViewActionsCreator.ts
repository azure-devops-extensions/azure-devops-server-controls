import { AgileContext } from "Agile/Scripts/Common/Agile";
import { SprintsHubTelemetryHelper } from "Agile/Scripts/Common/HubTelemetryHelper";
import { PerformanceTelemetryHelper } from "Presentation/Scripts/TFS/PerformanceTelemetryHelper";
import { TfsContextUtils } from "Agile/Scripts/Common/Utils";
import { SprintsHubConstants } from "Agile/Scripts/Generated/HubConstants";
import { ExceptionInfo } from "Agile/Scripts/Models/ExceptionInfo";
import { Iteration, IterationBuilder, parseIterationTimeframe } from "Agile/Scripts/Models/Iteration";
import { ITeam, Team } from "Agile/Scripts/Models/Team";
import { SprintsNavigationSettingsService } from "Agile/Scripts/SprintsHub/Common/SprintsNavigationSettingsService";
import { SprintsViewActions } from "Agile/Scripts/SprintsHub/SprintView/ActionsCreator/SprintsViewActions";
import { IRightPanelContributionState, ISprintHubHeaderData, ITeamIterations, ISprintsPickListData } from "Agile/Scripts/SprintsHub/SprintView/SprintContentViewContracts";
import { SprintViewUsageTelemetryConstants } from "Agile/Scripts/SprintsHub/SprintView/SprintContentViewTelemetryConstants";
import { IIterationData } from "Presentation/Scripts/TFS/FeatureRef/TFS.AgileCommon";
import { TeamAwarenessService, TeamSettingsContributionId } from "Presentation/Scripts/TFS/FeatureRef/TFS.TeamAwarenessService";
import { Actions } from "Presentation/Scripts/TFS/TFS.Configurations.Constants";
import { DateRange, TypeInfo } from "TFS/Work/Contracts";
import { WebPageDataService } from "VSS/Contributions/Services";
import { publishErrorToTelemetry } from "VSS/Error";
import * as Events_Action from "VSS/Events/Action";
import { ContractSerializer } from "VSS/Serialization";
import { getService } from "VSS/Service";
import { shiftToUTC } from "VSS/Utils/Date";
import { getErrorMessage } from "VSS/VSS";
import { ServiceInstanceTypes } from "VSS/WebApi/Constants";
import { toNativePromise } from "VSSPreview/Utilities/PromiseUtils";
import { Project, WorkItemStore } from "WorkItemTracking/Scripts/TFS.WorkItemTracking";

/** Resource retrieved from the data provider */
interface ISprintHubHeaderDataResource {

    /** Current team's ID */
    teamId: string;

    /** Current team's name */
    teamName: string;

    /** Weekends for this team */
    teamWeekends: number[];

    /** Days off for the whole team */
    teamDaysOff: DateRange[];

    /** Selected iteration */
    selectedIteration: IIterationData;

    /** Selected iteration timeframe value */
    selectedIterationTimeFrame: string | number;

    /** Next Iteration */
    nextIteration?: IIterationData;

    /** Previous Iteration */
    previousIteration?: IIterationData;

    /** Friendly path for URL */
    backlogIterationFriendlyPath?: string;

    /** Optional exception information */
    exceptionInfo: ExceptionInfo;
}

export const HEADER_DATAPROVIDER_ID = "ms.vss-work-web.sprints-hub-content-header-data-provider";
export const TEAM_DATAPROVIDER_ID = "ms.vss-work-web.sprints-hub-content-header-teams-provider";
const PICKER_DATAPROVIDER_ID = "ms.vss-work-web.sprints-hub-artifact-picker-data-provider";

export class SprintsViewActionsCreator {
    private _actions: SprintsViewActions;

    constructor(actions: SprintsViewActions) {
        this._actions = actions;
    }

    public initializeHeaderData() {
        const pageDataService = getService(WebPageDataService);
        const headerDataResource = pageDataService.getPageData<ISprintHubHeaderDataResource>(HEADER_DATAPROVIDER_ID);
        const { teamId, teamName, exceptionInfo, teamDaysOff, teamWeekends, selectedIteration, previousIteration,
            nextIteration, backlogIterationFriendlyPath, selectedIterationTimeFrame } = headerDataResource;

        if (exceptionInfo) {
            this._actions.headerDataAvailable.invoke({
                teamId: null,
                teamName: null,
                selectedIteration: null,
                selectedIterationTimeframe: null,
                nextIteration: null,
                previousIteration: null,
                backlogIterationFriendlyPath: null,
                exceptionInfo: exceptionInfo,
                teamDaysOff: null,
                teamWeekends: null,
                teamIterations: null
            });
        } else {

            const teamDaysOffUTC = teamDaysOff && teamDaysOff.map(d => {
                const deserializedDateRange = ContractSerializer.deserialize(d, TypeInfo.DateRange);
                return {
                    start: shiftToUTC(deserializedDateRange.start),
                    end: shiftToUTC(deserializedDateRange.end)
                } as DateRange;
            });

            const teamSettings = getService(TeamAwarenessService).getTeamSettings(teamId);
            const teamIterations: ITeamIterations = {
                currentIteration: IterationBuilder.fromIIterationData(teamSettings.currentIteration),
                futureIterations: teamSettings.futureIterations.map(i => IterationBuilder.fromIIterationData(i)),
                pastIterations: teamSettings.previousIterations.map(i => IterationBuilder.fromIIterationData(i))
            };

            const headerData: ISprintHubHeaderData = {
                teamId: teamId,
                teamName: teamName,
                selectedIteration: IterationBuilder.fromIIterationData(selectedIteration),
                selectedIterationTimeframe: parseIterationTimeframe(selectedIterationTimeFrame),
                nextIteration: IterationBuilder.fromIIterationData(nextIteration),
                previousIteration: IterationBuilder.fromIIterationData(previousIteration),
                backlogIterationFriendlyPath: backlogIterationFriendlyPath,
                exceptionInfo: exceptionInfo,
                teamDaysOff: teamDaysOffUTC,
                teamWeekends: teamWeekends,
                teamIterations
            };

            // Set Agile context for controls that need it
            const iteration: Iteration = headerData.selectedIteration;

            getService<AgileContext>(AgileContext).setContext({
                iteration: {
                    id: iteration ? iteration.id : undefined,
                    name: iteration ? iteration.name : undefined,
                    path: iteration ? iteration.iterationPath : undefined,
                    start: iteration ? iteration.startDateUTC : undefined,
                    finish: iteration ? iteration.finishDateUTC : undefined
                }
            });

            const navigationService = getService(SprintsNavigationSettingsService);
            navigationService.setValues({
                iterationId: iteration ? iteration.id : undefined
            });

            this._actions.headerDataAvailable.invoke(headerData);
        }
    }

    public reloadHeaderData() {
        const telemetryHelper = PerformanceTelemetryHelper.getInstance(SprintsHubConstants.HUB_NAME);

        if (telemetryHelper.isActive()) {
            telemetryHelper.split(SprintViewUsageTelemetryConstants.SPRINT_START_RELOADHEADER);
        }

        const pageDataService = getService(WebPageDataService);

        const headerContribution: Contribution = {
            id: HEADER_DATAPROVIDER_ID,
            properties: {
                serviceInstanceType: ServiceInstanceTypes.TFS
            }
        } as Contribution;

        const teamContribution: Contribution = {
            id: TeamSettingsContributionId,
            properties: {
                serviceInstanceType: ServiceInstanceTypes.TFS
            }
        } as Contribution;

        // Reload both the team settings and the header data in one request
        pageDataService.ensureDataProvidersResolved([headerContribution, teamContribution], /*refreshIfExpired*/true).then(() => {
            if (telemetryHelper.isActive()) {
                telemetryHelper.split(SprintViewUsageTelemetryConstants.SPRINT_END_RELOADHEADER);
            }
            this.initializeHeaderData();
        }, (reason): void => {
            publishErrorToTelemetry(new Error(`Could not reload Sprints Hub header and team settings data: '${reason}'`));

            this._actions.headerDataAvailable.invoke({
                teamId: null,
                teamName: null,
                selectedIteration: null,
                selectedIterationTimeframe: null,
                nextIteration: null,
                previousIteration: null,
                backlogIterationFriendlyPath: null,
                exceptionInfo: { exceptionMessage: getErrorMessage(reason) },
                teamDaysOff: null,
                teamWeekends: null,
                teamIterations: null
            });
        });
    }

    public getTeamsWithIterations(): Promise<Team[]> {
        const pageDataService = getService(WebPageDataService);
        const contribution: Contribution = {
            id: TEAM_DATAPROVIDER_ID,
            properties: {
                serviceInstanceType: ServiceInstanceTypes.TFS
            }
        } as Contribution;

        return toNativePromise(pageDataService.ensureDataProvidersResolved([contribution], true)).then(
            () => {
                const payload: { teams: ITeam[] } = pageDataService.getPageData(contribution.id);
                if (!payload || !payload.teams) {
                    throw new Error("No response was received from the server");
                }

                return payload.teams.map(t => new Team({ id: t.id, name: t.name }));
            }
        );
    }

    public openSprintEditorPane() {
        this._actions.updateSprintEditorCalloutVisibility.invoke(true);
    }

    public closeSprintEditorPane() {
        this._actions.updateSprintEditorCalloutVisibility.invoke(false);
    }

    public openSprintPickerCallout() {
        this._actions.updateSprintPickerCalloutVisibility.invoke(true);
    }

    public closeSprintPickerCallout() {
        this._actions.updateSprintPickerCalloutVisibility.invoke(false);
    }

    public openSettings() {
        Events_Action.getService().performAction(Actions.LAUNCH_COMMON_CONFIGURATION, { hideBacklogVisibilitiesTab: false });
    }

    public updateTeamDaysOff(newTeamDaysOff: DateRange[]) {
        this._actions.updateTeamDaysOff.invoke(newTeamDaysOff);
    }

    public clearNodeCache() {
        const store = getService<WorkItemStore>(WorkItemStore);
        store.beginGetProject(TfsContextUtils.getProjectId(), (project: Project) => {
            project.nodesCacheManager.clearCache();
        });
    }

    protected _publishRightPanelChangedTelemetry(
        prevState: IRightPanelContributionState,
        newState: IRightPanelContributionState,
        teamId: string,
        selectedPivot: string): void {

        const { contributionId } = prevState;

        //  Only send usage telemetry if the toggle state or contribution id has changed.
        if (contributionId !== newState.contributionId) {

            SprintsHubTelemetryHelper.publishTelemetry(
                SprintViewUsageTelemetryConstants.RIGHT_PANEL_CHANGED,
                {
                    id: newState.contributionId,
                    selectedPivot: selectedPivot,
                    teamId: teamId
                }
            );
        }
    }

    public getPickListData(): Promise<Team[]> {
        const pageDataService = getService(WebPageDataService);
        return pageDataService.getDataAsync<ISprintsPickListData>(PICKER_DATAPROVIDER_ID).then(data => {
            return data ? data.teams.map(a => new Team({ id: a.id, name: a.name })) : [];
        }
        );
    }
}
