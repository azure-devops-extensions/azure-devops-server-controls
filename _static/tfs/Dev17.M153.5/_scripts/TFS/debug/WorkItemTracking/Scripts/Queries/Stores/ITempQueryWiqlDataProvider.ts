import { ITemporaryQueryData } from "WorkItemTracking/Scripts/Queries/Models/Models";

/**
 * Temporary query data store data provider
 */
export interface ITempQueryDataProvider {
    /**
     * Gets the query data for the temporary query id
     *
     * @param tempId the temporary query id
     * @returns The temporary query data for the temporary query id
     */
    getQueryDataForTempId(tempId: string): ITemporaryQueryData;
}
