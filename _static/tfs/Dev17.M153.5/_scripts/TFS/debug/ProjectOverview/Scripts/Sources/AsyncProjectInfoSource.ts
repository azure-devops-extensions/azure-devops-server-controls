import * as Q from "q";
import { requireModules } from "VSS/VSS";
import { WebApiTeamRef } from "TFS/Core/Contracts";
import * as ProjectInfoSource_Async from "ProjectOverview/Scripts/Sources/ProjectInfoSource";
import * as ProjectOverviewResources from "ProjectOverview/Scripts/Resources/TFS.Resources.ProjectOverview";

export class AsyncProjectInfoSource {
    private _projectInfoSourcePromise: IPromise<ProjectInfoSource_Async.ProjectInfoSource>;

    public saveProjectDescription(newDescription: string, projectId: string): IPromise<string> {
        return this._getProjectInfoSourceAsync().then(
            (projectInfoSource: ProjectInfoSource_Async.ProjectInfoSource) => projectInfoSource.saveProjectDescription(newDescription, projectId));
    }

    public getIsProjectImageSet(): IPromise<boolean> {
        return this._getProjectInfoSourceAsync().then(
            (projectInfoSource: ProjectInfoSource_Async.ProjectInfoSource) => projectInfoSource.getIsProjectImageSet());
    }

    public getDefaultTeam(projectId: string): IPromise<WebApiTeamRef> {
        return this._getProjectInfoSourceAsync().then(
            (projectInfoSource: ProjectInfoSource_Async.ProjectInfoSource) => projectInfoSource.getDefaultTeam(projectId));
    }

    private _getProjectInfoSourceAsync(): IPromise<ProjectInfoSource_Async.ProjectInfoSource> {
        if (!this._projectInfoSourcePromise) {
            this._projectInfoSourcePromise = requireModules(["ProjectOverview/Scripts/Sources/ProjectInfoSource"]).spread(
                (projectInfoSourceModule: typeof ProjectInfoSource_Async) => new projectInfoSourceModule.ProjectInfoSource());
        }

        return this._projectInfoSourcePromise;
    }
}