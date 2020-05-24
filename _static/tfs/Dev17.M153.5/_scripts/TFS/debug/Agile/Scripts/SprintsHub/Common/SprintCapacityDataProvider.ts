import { IRawTeamCapacityData, TeamCapacityModel } from "Agile/Scripts/Capacity/CapacityModels";
import { ExceptionInfo } from "Agile/Scripts/Models/ExceptionInfo";
import { WorkDetailsPanelLoadingFailed_Message } from "Agile/Scripts/Resources/TFS.Resources.AgileSprintPlanning";
import { ICapacity, IUserCapacity, IActivity, IDaysOff } from "Agile/Scripts/SprintsHub/Capacity/CapacityContracts";
import { DateRange, TeamMemberCapacity } from "TFS/Work/Contracts";
import { WebPageDataService } from "VSS/Contributions/Services";
import { getService } from "VSS/Service";
import { shiftToUTC } from "VSS/Utils/Date";
import { ServiceInstanceTypes } from "VSS/WebApi/Constants";
import { Iteration } from "Agile/Scripts/Models/Iteration";
import { toDecimalLocaleString } from "VSS/Utils/Number";

export const AGGREGATEDCAPACITY_DATAPROVIDER_ID: string = "ms.vss-work-web.sprints-hub-aggregatedcapacity-data-provider";
export const CAPACITYOPTIONS_DATAPROVIDER_ID: string = "ms.vss-work-web.sprints-hub-capacityoptions-data-provider";
export const TEAMCAPACITY_DATAPROVIDER_ID: string = "ms.vss-work-web.sprints-hub-capacity-data-provider";

export interface IAggregatedCapacity {
    /** RemainingWork field reference name */
    remainingWorkField: string;

    /** Aggregated capacity per user and activity */
    aggregatedCapacity: IDictionaryStringTo<IDictionaryStringTo<number>>; // (fieldRefName -> (fieldValue -> sumOfRemainingWork))

    /** Breakdown of aggregated capacity */
    previousValueData: IDictionaryStringTo<IDictionaryStringTo<any>>; // (fieldRefName -> (workItemId -> fieldValue))

    /** Flag indicating whether capacityLimitWasExceeded */
    aggregatedCapacityLimitExceeded: boolean;

    /** Exception info if aggregated capacity data failed to resolve. */
    exceptionInfo?: ExceptionInfo;
}

export interface ISprintCapacityOptions {
    /** Account current date */
    accountCurrentDate: string;

    /** Allowed activities such as 'development', 'testing', etc.. */
    allowedActivities: string[];

    /** Configured weekend days array */
    weekends: number[];

    /** Is capacity options editable */
    isEditable: boolean;

    /** Acitivty field reference name */
    activityFieldReferenceName: string;

    /** Activity field display name */
    activityFieldDisplayName: string;

    /** Assigned-to field display name */
    assignedToFieldDisplayName: string;

    /** RemainingWork suffix format (similar to '{0}h') */
    remainingWorkSuffixFormat: string;

    /** Exception info if the capacity options failed to resolve */
    exceptionInfo?: ExceptionInfo;
}

export namespace SprintCapacityDataProvider {

    /**
     * Get aggregatedCapacity from pageData.
     * This method doesn't ensure data is available. It returns null if data is not found
     */
    export function getAggregatedCapacityFromPageData(): IAggregatedCapacity {
        const pageDataService = getService(WebPageDataService);
        return pageDataService.getPageData<IAggregatedCapacity>(AGGREGATEDCAPACITY_DATAPROVIDER_ID);
    }

    /**
     * Get sprintCapacityOptions from pageData.
     * This method doesn't ensure data is available. It returns null if data is not found
     */
    export function getCapacityOptionsFromPageData(): ISprintCapacityOptions {
        const pageDataService = getService(WebPageDataService);
        return pageDataService.getPageData<ISprintCapacityOptions>(CAPACITYOPTIONS_DATAPROVIDER_ID);
    }

    export function getTeamCapacityFromPageData(): ICapacity {
        const pageDataService = getService(WebPageDataService);
        const capacity = pageDataService.getPageData<ICapacity>(TEAMCAPACITY_DATAPROVIDER_ID);

        return processTeamCapacityData(capacity);
    }

    /**
     * Initialize the data for client time and localization.  Shift all dates to UTC time (correct date to display)
     * and localize numbers.
     */
    export function processTeamCapacityData(teamCapacity: ICapacity): ICapacity {

        if (teamCapacity) {
            shiftDaysOffToUTC(teamCapacity.teamDaysOff);

            if (teamCapacity.userCapacities) {
                for (const capacity of teamCapacity.userCapacities) {
                    shiftDaysOffToUTC(capacity.daysOff);
                    localizeCapacityString(capacity.activities);
                }
            }
        }

        return teamCapacity;
    }

    /**
     * Set the local strings to be displayed in the capacity control (i.e. 1.3 -> 1,3)
     * This should only be called on initial data coming from server. After, the client maintains the user string and number value.
     * Localized string is stored separately instead of calculated, because "1." would become "1", and we could lose characters from text input.
     * @param activities - convert capacity per day to strings
     */
    export function localizeCapacityString(activities: IActivity[]) {
        if (activities) {
            for (const activity of activities) {
                activity.displayValue = toDecimalLocaleString(activity.capacityPerDay);
            }
        }
    }

    /**
     * Convert start/end strings to date object in UTC time. UTC time is the date that we want to display and use to calculate days off etc.
     */
    export function shiftDaysOffToUTC(daysOff: IDaysOff[]) {

        if (daysOff) {
            for (const dayOff of daysOff) {
                dayOff.start = shiftToUTC(new Date(dayOff.start));
                dayOff.end = shiftToUTC(new Date(dayOff.end));
            }
        }
    }

    /**
     * Ensures aggregatedCapacity is loaded and returns the data
     * @param reloadData flag indicating whether data should be reloaded from server
     */
    export function ensureAggregatedCapacityData(reloadData?: boolean): IPromise<IAggregatedCapacity> {
        return _fetchContributionData(AGGREGATEDCAPACITY_DATAPROVIDER_ID, reloadData).then(() => {
            let aggregatedCapacity = getAggregatedCapacityFromPageData();
            if (!aggregatedCapacity) {
                aggregatedCapacity = {
                    exceptionInfo: {
                        exceptionMessage: WorkDetailsPanelLoadingFailed_Message
                    }
                } as IAggregatedCapacity;
            }

            return aggregatedCapacity;
        });
    }

    /**
     * Ensures capacityOptions is loaded and returns the data
     * @param reloadData flag indicating whether data should be reloaded from server
     */
    export function ensureCapacityOptionsData(reloadData?: boolean): IPromise<ISprintCapacityOptions> {
        return _fetchContributionData(CAPACITYOPTIONS_DATAPROVIDER_ID, reloadData).then(() => {
            let capacityOptions = getCapacityOptionsFromPageData();
            if (!capacityOptions) {
                capacityOptions = {
                    exceptionInfo: {
                        exceptionMessage: WorkDetailsPanelLoadingFailed_Message
                    }
                } as ISprintCapacityOptions;
            }
            return capacityOptions;
        });
    }

    export function constructTeamCapacityModel(
        teamCapacityData: ICapacity,
        teamId: string,
        iteration: Iteration,
        allowedActivities: string[],
        accountCurrentDate: string,
        weekends: number[],
        teamDaysOff: DateRange[]
    ): TeamCapacityModel {

        const teamMemberCapacity: TeamMemberCapacity[] = teamCapacityData.userCapacities.map((userCapacities: IUserCapacity) => {
            const transformedCapacity: TeamMemberCapacity = {
                activities: userCapacities.activities,
                daysOff: userCapacities.daysOff,
                teamMember: { ...userCapacities.teamMember, url: null, imageUrl: null },
                _links: null,
                url: null
            };
            return transformedCapacity;
        });

        const rawTeamCapacity: IRawTeamCapacityData = {
            TeamCapacity: {
                TeamDaysOffDates: teamDaysOff,
                TeamMemberCapacityCollection: teamMemberCapacity
            },
            ActivityValues: allowedActivities,
            IterationId: iteration.id,
            IterationStartDate: iteration.startDateUTC,
            IterationEndDate: iteration.finishDateUTC,
            Weekends: weekends,
            CurrentDate: shiftToUTC(new Date(accountCurrentDate))
        };

        return new TeamCapacityModel(rawTeamCapacity);
    }

    /**
     * Fetch contribution data
     * @param dataProviderId Contributed dataProvider Id
     * @param reload flag indicating whether data should be reloaded from server
     */
    function _fetchContributionData(dataProviderId: string, reload?: boolean): IPromise<void> {
        const pageDataService = getService(WebPageDataService);
        const contribution = {
            id: dataProviderId,
            properties: {
                serviceInstanceType: ServiceInstanceTypes.TFS
            }
        } as Contribution;

        return pageDataService.ensureDataProvidersResolved([contribution], reload);
    }
}