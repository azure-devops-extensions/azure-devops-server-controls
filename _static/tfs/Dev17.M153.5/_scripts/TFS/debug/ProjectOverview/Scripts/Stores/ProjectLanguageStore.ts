import * as VSSStore from "VSS/Flux/Store";
import * as Utils_Array from "VSS/Utils/Array";
import * as Utils_String from "VSS/Utils/String";
import { ProjectLanguageMetricsData } from "ProjectOverview/Scripts/ActionsHub";

export interface ProjectLanguageState {
    projectLanguagesMetrics: ProjectLanguageMetricsData[];
    isProjectLanguageMetricsLoaded: boolean;
}

export class ProjectLanguageStore extends VSSStore.Store {
    private _state: ProjectLanguageState;

    constructor() {
        super();
        this._state = {
            projectLanguagesMetrics: [],
            isProjectLanguageMetricsLoaded: false
        };
    }

    public getState(): ProjectLanguageState {
        return this._state;
    }

    public loadProjectLanguages = (projectLanguagesMetrics: ProjectLanguageMetricsData[]): void => {
        this._state.projectLanguagesMetrics = projectLanguagesMetrics;
        this._state.isProjectLanguageMetricsLoaded = true;
        this.emitChanged();
    }
}
