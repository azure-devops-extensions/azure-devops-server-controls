import * as VSSStore from "VSS/Flux/Store";

export interface ProjectTagState {
    projectId: string;
    initialProjectTags: string[];
    currentProjectTags: string[];
    allProjectTags: string[];
    errorMessage: string;
    isProjectTagsLoaded: boolean;
}

export class ProjectTagStore extends VSSStore.Store {
    private _state: ProjectTagState;

    constructor() {
        super();
        this._state = {
            initialProjectTags: [],
            currentProjectTags: [],
            allProjectTags: [],
            isProjectTagsLoaded: false,
            projectId: "",
            errorMessage: ""
        };
    }

    public getState(): ProjectTagState {
        return this._state;
    }

    public loadProjectTags = (projectTags: string[]): void => {
        this._setProjectTags(projectTags);
        this._state.isProjectTagsLoaded = true;
        this.emitChanged();
    };

    public saveProjectTags = (projectTags: string[]): void => {
        this._setProjectTags(projectTags);
        this._state.errorMessage = "";
        this.emitChanged();
    };

    public updateAllProjectTags = (allTags: string[]): void => {
        this._state.allProjectTags = allTags;
        this.emitChanged();
    };

    public updateErrorMessage = (errorMessage: string): void => {
        this._state.errorMessage = errorMessage;
        this.emitChanged();
    };

    public updateCurrentTags = (tags: string[]): void => {
        this._state.currentProjectTags = tags;
        this.emitChanged();
    };

    private _setProjectTags(projectTags: string[]): void {
        this._state.initialProjectTags = projectTags;
        this._state.currentProjectTags = projectTags;
    }
}
