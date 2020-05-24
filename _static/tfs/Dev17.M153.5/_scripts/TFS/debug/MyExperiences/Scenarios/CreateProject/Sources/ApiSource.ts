import * as Q from "q";
import * as VSS_Error from "VSS/Error";
import * as Performance from "VSS/Performance";
import * as Utils_Core from "VSS/Utils/Core";
import * as Utils_String from "VSS/Utils/String";
import * as VSS_Locations from "VSS/Locations";
import * as TFS_Core_Ajax from "Presentation/Scripts/TFS/TFS.Legacy.Ajax";
import { INewProjectParameters } from "MyExperiences/Scenarios/CreateProject/Contracts";
import { Constants } from "MyExperiences/Scenarios/CreateProject/Constants";

export interface IProjectData {
    CollectionHost: any;
    JobId: string
}

export class ApiSource {
    private _perfScenarioManager: Performance.IScenarioManager;

    constructor() {
        this._perfScenarioManager = Performance.getScenarioManager();
    }

    /**
     * Create a new project with the provided params under the given tfs context
     * @param projectParams - New project creation parameters
     * @param source - Area/module/scenario from where the create project operation was invoked
     */
    public createProject(
        projectParams: INewProjectParameters,
        source: string): IPromise<IProjectData> {

        var deferred = Q.defer<IProjectData>();
        var projectOptions: any = {};
        projectOptions.VersionControlOption = projectParams.versionControlOption;
        projectOptions.ProjectVisibilityOption = projectParams.projectVisibilityOption || null; // This can be null since this is optional param

        let mvcOptions: VSS_Locations.MvcRouteOptions = {
            area: "api",
            project: null,
            controller: "project",
            action: "CreateProject"
        }
        let url: string = VSS_Locations.urlHelper.getMvcUrl(mvcOptions);

        let scenario = this._perfScenarioManager.startScenario(Constants.Area, "CreateProject.ApiSource.CreateProject");
        TFS_Core_Ajax.postMSJSON(
            url,
            {
                projectName: projectParams.projectName,
                projectDescription: projectParams.projectDescription,
                processTemplateTypeId: projectParams.processTemplateTypeId,
                collectionId: projectParams.collectionId,
                source: Utils_String.format("{0}:{1}", Constants.Feature, source),
                projectData: Utils_Core.stringifyMSJSON(projectOptions)
            },
            (projectData) => {
                scenario.end();
                deferred.resolve(projectData);
            },
            (error) => {
                VSS_Error.publishErrorToTelemetry(
                    {
                        name: "MyExperiences.ApiSource.CreateProject.Failed",
                        message: error.message
                    } as TfsError);

                scenario.end();
                deferred.reject(error);
            }
        );

        return deferred.promise;
    }
}