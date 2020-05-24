import * as Q from "q";

import { Iteration } from "Agile/Scripts/Models/Iteration";
import { CapacityContractsMapper } from "Agile/Scripts/SprintsHub/Capacity/ActionsCreator/CapacityContractsMapper";
import { WorkContractsMapper } from "Agile/Scripts/SprintsHub/Capacity/ActionsCreator/WorkContractsMapper";
import { ICapacity, IInitialPayload, IUser, IUserCapacity } from "Agile/Scripts/SprintsHub/Capacity/CapacityContracts";
import { CapacityHelper } from "Agile/Scripts/SprintsHub/Capacity/CapacityHelper";
import {
    CAPACITYOPTIONS_DATAPROVIDER_ID,
    ISprintCapacityOptions,
    SprintCapacityDataProvider,
    TEAMCAPACITY_DATAPROVIDER_ID
} from "Agile/Scripts/SprintsHub/Common/SprintCapacityDataProvider";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { getMSJSON } from "Presentation/Scripts/TFS/TFS.Legacy.Ajax";
import { TeamContext } from "TFS/Core/Contracts";
import { TeamMemberCapacity } from "TFS/Work/Contracts";
import { WorkHttpClient } from "TFS/Work/RestClient";
import { WebPageDataService } from "VSS/Contributions/Services";
import { getService, VssConnection } from "VSS/Service";

export interface ICapacityApi {
    getCapacityPivotData(): IInitialPayload;
    reloadCapacityPivotData(): Promise<IInitialPayload>;
    addMissingTeamMembers(teamId: string): IPromise<IUser[]>;
    getCapacity(iteration: Iteration, teamId: string): IPromise<IUserCapacity[]>;
    save(iteration: Iteration, teamId: string, capacity: ICapacity): IPromise<ICapacity>;
}

export class CapacityApi implements ICapacityApi {
    /**
     * Gets local data from the data provider
     */
    public getCapacityPivotData(): IInitialPayload {
        const input = {
            [TEAMCAPACITY_DATAPROVIDER_ID]: SprintCapacityDataProvider.processTeamCapacityData,
            [CAPACITYOPTIONS_DATAPROVIDER_ID]: data => data
        };
        const output = this.loadFromPageData(input);
        return {
            teamCapacity: output[TEAMCAPACITY_DATAPROVIDER_ID],
            capacityOptions: output[CAPACITYOPTIONS_DATAPROVIDER_ID]
        }
    }

    /**
     * Reloads local data from the data provider
     */
    public async reloadCapacityPivotData(): Promise<IInitialPayload> {
        const pageDataService = getService(WebPageDataService);
        const [teamCapacity, capacityOptions] = await Promise.all([
            pageDataService.getDataAsync<ICapacity>(TEAMCAPACITY_DATAPROVIDER_ID),
            pageDataService.getDataAsync<ISprintCapacityOptions>(CAPACITYOPTIONS_DATAPROVIDER_ID)
        ]);

        return {
            teamCapacity: SprintCapacityDataProvider.processTeamCapacityData(teamCapacity),
            capacityOptions: capacityOptions
        }
    }

    /**
     * Gets expanded list of team members
     */
    public addMissingTeamMembers(teamId: string): IPromise<IUser[]> {
        const tfsContext = TfsContext.getDefault();
        const deferred = Q.defer<IUser[]>();
        const actionUrl = tfsContext.getActionUrl(
            "getexpandedteammembers",
            "teamcapacity",
            {
                area: "api",
                includeVersion: true,
                teamId: teamId
            });

        getMSJSON(
            actionUrl,
            null,
            (data) => {
                if (data.success) {
                    deferred.resolve(data.users as IUser[]);
                } else {
                    deferred.reject(data.message);
                }
            },
            (error) => {
                deferred.reject(error);
            });

        return deferred.promise;
    }

    /**
     * Copies capacity from given sprint
     * @param iteration
     */

    public getCapacity(iteration: Iteration, teamId: string): IPromise<IUserCapacity[]> {
        const workClient = this._getWorkClient();
        const teamContext = this._getTeamContext(teamId);

        return workClient.getCapacities(teamContext, iteration.id)
            .then((capacities: TeamMemberCapacity[]) => {
                return WorkContractsMapper.mapCapacities(capacities);
            });
    }

    public save(iteration: Iteration, teamId: string, capacity: ICapacity): IPromise<ICapacity> {
        const workClient = this._getWorkClient();
        const teamContext = this._getTeamContext(teamId);
        const capacities = this._getUserCapacitiesForSave(capacity);

        return workClient.replaceCapacities(capacities, teamContext, iteration.id).then((replaced) => {
            // Replace capacity also re-writes the team days off.  Need to make the update team days off call after
            // the capacities call has finished so that this value isn't overwritten.
            const daysOffPatch = { daysOff: CapacityContractsMapper.mapDaysOff(capacity.teamDaysOff) };
            return workClient.updateTeamDaysOff(daysOffPatch, teamContext, iteration.id).then(() => {
                return capacity;
            });
        });

    }

    protected loadFromPageData(dataProviders: IDictionaryStringTo<(data) => any>): IDictionaryStringTo<any> {
        const pageDataService = getService(WebPageDataService);
        dataProviders = { ...dataProviders };
        const output: IDictionaryStringTo<any> = {};
        let unavailableDataProviders = [];
        for (const dataProviderId in dataProviders) {
            if (!output[dataProviderId]) {
                let pageData = pageDataService.getPageData(dataProviderId);
                pageDataService.removePageData(dataProviderId);
                if (pageData) {
                    pageData = dataProviders[dataProviderId](pageData);
                    output[dataProviderId] = pageData;
                } else {
                    unavailableDataProviders.push(dataProviderId);
                }
            }
        }
        if (unavailableDataProviders.length > 0) {
            throw new Error(`Could not load data for ${unavailableDataProviders}`);
        }
        return output;
    }

    /**
     * Dedupes activities in the capacity data and converts it to Rest Contracts
     * public for unit testing
     */
    protected _getUserCapacitiesForSave(capacity: ICapacity): TeamMemberCapacity[] {
        capacity = CapacityHelper.deepCopyCapacity(capacity);
        CapacityHelper.dedupeAllActivities(capacity);
        return CapacityContractsMapper.mapCapacities(capacity.userCapacities, /* shiftDates */ true);
    }

    private _getWorkClient(): WorkHttpClient {
        const tfsContext = TfsContext.getDefault();
        const tfsConnection = new VssConnection(tfsContext.contextData);
        return tfsConnection.getHttpClient(WorkHttpClient);
    }

    private _getTeamContext(teamId: string): TeamContext {
        const tfsContext = TfsContext.getDefault();
        return {
            projectId: tfsContext.contextData.project.id,
            teamId: teamId
        } as TeamContext;
    }
}