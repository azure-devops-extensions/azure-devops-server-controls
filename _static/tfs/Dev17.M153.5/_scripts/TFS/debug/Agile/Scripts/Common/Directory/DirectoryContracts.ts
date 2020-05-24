import { ExceptionInfo } from "Agile/Scripts/Models/ExceptionInfo";
import { ITeam } from "Agile/Scripts/Models/Team";
import { IFilterState } from "VSSUI/Utilities/Filter";

/** Basic Payload for all directory pages */
export interface IDirectoryData {
    /** The teams that will be displayed */
    teams: ITeam[];
    /** The saved filter state */
    filterStateJson: string;
    /** The parsed filter state */
    filterState: IFilterState;
    /** The favorites */
    favorites: IFavoriteData[];
    /** Any exception from the data provider */
    exceptionInfo?: ExceptionInfo;
}

export interface IMyDirectoryData extends IDirectoryData {
    /** Teams that are favorites, but non member teams */
    nonMemberTeams: ITeam[];
}

export interface IFavoriteData {
    id: string;
    artifactId: string;
    artifactName: string;
    artifactProperties: IDictionaryStringTo<string>;
    isDeleted: boolean;
}

export enum FavoriteState {
    Favorited = 1,
    Unfavorited = 2,
    Favoriting = 3,
    Unfavoriting = 4
}