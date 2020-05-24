import * as VSSStore from "VSS/Flux/Store";
import { ProjectOverviewData } from "ProjectOverview/Scripts/Generated/Contracts";

export interface ProjectInfoState {
    isLoading: boolean;
    isLoadingFailed: boolean;
    projectInfo: ProjectOverviewData;
    errorMessage: string;
    isEditing: boolean;
    isEditingDisabled: boolean;
}

export class ProjectInfoStore extends VSSStore.Store {
    private _state: ProjectInfoState;

    constructor() {
        super();
        
        this._state = {
            isLoading: true,
            isLoadingFailed: false,
            projectInfo: null,
            errorMessage: null,
            isEditing: false,
            isEditingDisabled: false,
        };
    }

    public getState(): ProjectInfoState {
        return this._state;
    }

    public loadProjectInfo = (projectInfo: ProjectOverviewData): void => {
        // We're async loading isProjectImageSet flag. So, initializing it with undefined 
        // to defer decision on loading project persona or image till flag is fetched.
        if (projectInfo && projectInfo.info) {
            projectInfo.info.isProjectImageSet = undefined;
        }

        this._state.isLoading = false;
        this._state.projectInfo = projectInfo;
        this.emitChanged();
    }

    public stopIsLoading = (): void => {
        this._state.isLoading = false;
        this._state.isLoadingFailed = true;
        this.emitChanged();
    }

    public updateProjectDescription = (newDescription: string): void => {
        this._state.projectInfo.info.description = newDescription;
        this._state.errorMessage = null;
        this._state.isEditing = false;
        this._state.isEditingDisabled = false;
        this.emitChanged();
    }

    public updateProjectImageSetInformation = (isProjectImageSet: boolean): void => {
        this._state.projectInfo.info.isProjectImageSet = isProjectImageSet;
        this.emitChanged();
    }

    public toggleEditing = (): void => {
        this._state.isEditing = !this._state.isEditing;
        this._state.isEditingDisabled = false;
        this.emitChanged();
    }

    public updateErrorMessage = (errorMessage: string): void => {
        this._state.errorMessage = errorMessage;
        this._state.isEditingDisabled = false;
        this.emitChanged();
    }

    public disableEditing = (): void => {
        this._state.isEditingDisabled = true;
        this.emitChanged();
    }

    public clearErrorMessage = (): void => {
        this._state.errorMessage = null;
        this.emitChanged();
    }
}