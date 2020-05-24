import { IDirectoryData, IMyDirectoryData } from "Agile/Scripts/Common/Directory/DirectoryContracts";
import { ITeam } from "Agile/Scripts/Models/Team";

/** Payload for the all sprints directory */
export interface IAllSprintsData extends IDirectoryData {
    /** The teams that have been paged */
    pagedTeams: ITeam[];
    /** The page size */
    pageSize: number;
    /** The current iterations, mapped by team id */
    currentIterationMapping: IDictionaryStringTo<ISprintsIterationData>;
}

export interface IMySprintsData extends IMyDirectoryData {
    /** The current iterations, mapped by team id */
    currentIterationMapping: IDictionaryStringTo<ISprintsIterationData>;
}


export interface ISprintsIterationData {
    id: string;
    name: string;
    path: string;
    startDate?: string;
    endDate?: string;
}