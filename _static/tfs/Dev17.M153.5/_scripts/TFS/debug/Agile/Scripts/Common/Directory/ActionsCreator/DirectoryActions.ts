import { ActionsHub } from "Agile/Scripts/Common/ActionsHub";
import { Action } from "VSS/Flux/Action";
import { ExceptionInfo } from "Agile/Scripts/Models/ExceptionInfo";
import { IDirectoryData, IFavoriteData, IMyDirectoryData } from "Agile/Scripts/Common/Directory/DirectoryContracts";
import { IFilterState } from "VSSUI/Utilities/Filter";
import { DirectoryPivotType } from "Agile/Scripts/Common/DirectoryPivot";
import { registerDiagActions } from "VSS/Flux/Diag";

@registerDiagActions
export class DirectoryActions extends ActionsHub {
    // Directory data
    public readonly myDataAvailableAction: Action<IMyDirectoryData> = this.createAction<IMyDirectoryData>();
    public readonly allDataAvailableAction: Action<IDirectoryData> = this.createAction<IDirectoryData>();
    public readonly loadAllDataFailedAction: Action<ExceptionInfo> = this.createAction<ExceptionInfo>();
    public readonly loadMyDataFailedAction: Action<ExceptionInfo> = this.createAction<ExceptionInfo>();
    public readonly invalidateData: Action<void> = this.createAction<void>();

    // Favorites
    public readonly beginAddFavorite: Action<string> = this.createAction<string>();
    public readonly addFavoriteSuccessful: Action<IFavoriteData> = this.createAction<IFavoriteData>();
    public readonly addFavoriteFailed: Action<{ error: TfsError, teamId: string }> = this.createAction<{ error: TfsError, teamId: string }>();

    public readonly beginRemoveFavorite: Action<string> = this.createAction<string>();
    public readonly removeFavoriteSuccessful: Action<string> = this.createAction<string>();
    public readonly removeFavoriteFailed: Action<{ error: TfsError, teamId: string }> = this.createAction<{ error: TfsError, teamId: string }>();

    // User actions
    public readonly filterChanged: Action<IFilterState> = this.createAction<IFilterState>();
    public readonly groupToggled: Action<string> = this.createAction<string>();
    public readonly pivotChanged: Action<DirectoryPivotType> = this.createAction<DirectoryPivotType>();
}