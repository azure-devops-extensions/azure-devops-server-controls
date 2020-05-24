import {ITeam} from "../Team/Team";
import { FavoriteTypes } from "TfsCommon/Scripts/Favorites/Constants";

export interface IBoardArtifact extends ITeam{
    isIdBoard?: boolean;
    favoriteType?: string;
}

export class BoardArtifact {
    public readonly id: string;
    public readonly name: string;
    public readonly favoriteType?: string;
    public readonly isIdBoard?: boolean;

    constructor(params: IBoardArtifact) {
        this.id = params.id;
        this.name = params.name;
        this.isIdBoard = params.isIdBoard === true;
        this.favoriteType = this.isIdBoard? FavoriteTypes.WORK_IDBOARD: FavoriteTypes.WORK_TEAMBOARD;
    }
}