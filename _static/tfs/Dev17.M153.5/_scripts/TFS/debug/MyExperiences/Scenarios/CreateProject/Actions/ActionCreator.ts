import * as Q from "q";
import * as Utils_String from "VSS/Utils/String";
import * as VSS_Locations from "VSS/Locations";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { ProjectNameValidator } from "Admin/Scripts/ProjectNameValidator";
import {
    ActionsHub,
    IProjectCreationStatusPayload,
    IProjectCreationMetadataLoadedPayload,
    IProjectNameValidationStatusPayload,
    IStatusPayload
} from "MyExperiences/Scenarios/CreateProject/ActionsHub";
import {
    IJobResult,
    JobResultSource
} from "MyExperiences/Scenarios/CreateProject/Sources/JobResultSource";
import { ApiSource } from "MyExperiences/Scenarios/CreateProject/Sources/ApiSource";
import { DataProviderSource } from "MyExperiences/Scenarios/CreateProject/Sources/DataProviderSource";
import { UrlParametersSource } from "MyExperiences/Scenarios/CreateProject/Sources/UrlParametersSource";
import {
    StatusType,
    StatusValueType,
    INewProjectParameters,
    IProjectCreationMetadata,
    IUrlParameters
} from "MyExperiences/Scenarios/CreateProject/Contracts";
import * as MyExperiencesResources from "MyExperiences/Scripts/Resources/TFS.Resources.MyExperiences";

const isHosted = TfsContext.getDefault().isHosted;

export class ActionCreator {
    constructor(private _actionsHub: ActionsHub,
        private _apiSource?: ApiSource,
        private _jobResultSource?: JobResultSource,
        private _dataProviderSource?: DataProviderSource,
        private _urlParametersSource?: UrlParametersSource) {
    }

    /**
     * Fetches the initial data needed to host the project creation page and invokes the initalization action appropriately
     */
    public fetchProjectCreationMetadata(): IPromise<void> {
        let deferred = Q.defer<void>();
        let projectCreationMetadata: IProjectCreationMetadata;
        let urlParameters: IUrlParameters = this.urlParametersSource.getUrlParameters();

        // To set inprogress state to the data load
        this._actionsHub.projectCreationMetadataLoadStarted.invoke({
            projectCreationMetadata: null,
            urlParameters: null,
            status: {
                value: StatusValueType.InProgress,
                message: null
            }
        });

        this.dataProviderSource.getData().then((projectCreationMetadata: IProjectCreationMetadata) => {
            this._actionsHub.projectCreationMetadataLoadSucceeded.invoke({
                projectCreationMetadata: projectCreationMetadata,
                urlParameters: urlParameters,
                status: {
                    value: StatusValueType.Success,
                    message: null
                }
            });
            deferred.resolve(null);

        }, (error: Error) => {
            this._actionsHub.projectCreationMetadataLoadFailed.invoke({
                projectCreationMetadata: null,
                urlParameters: null,
                status: {
                    value: StatusValueType.Failure,
                    message: error.message
                }
            });
            deferred.reject(error);
        });

        return deferred.promise;
    }

    /**
     * Update the project description in the store, with the new value
     * @param value - The new description value entered
     */
    public updateProjectDescription(value: string): void {
        this._actionsHub.projectDescriptionChanged.invoke(value);
    }

    /**
     * Update the version control type in the store based on the new selected index
     * @param selectedIndex - Index of the new version control type selected
     */
    public updateVersionControlType(selectedIndex: number): void {
        this._actionsHub.versionControlChanged.invoke(selectedIndex);
    }

    /**
     * Update the project visibility option in the store based on the new selected index
     * @param selectedIndex - Index of the new project visbility selected
     */
    public updateProjectVisibilityOption(selectedIndex: number): void {
        this._actionsHub.projectVisibilityChanged.invoke(selectedIndex);
    }

    /**
     * Update the process template in the store based on the new selected value
     * @param selectedValue - The value of the new process template selected
     */
    public updateProcessTemplate(selectedValue: string): void {
        this._actionsHub.processTemplateChanged.invoke(selectedValue);
    }

    /**
     * Reset the validation status for the project name textfield
     */
    public resetProjectNameValidation(): void {
        this._actionsHub.projectNameValidationReset.invoke({
            projectName: null,
            meetsRequirements: false,
            status: {
                value: StatusValueType.NoStatus,
                message: null
            }
        } as IProjectNameValidationStatusPayload);
    }

    /**
     * Checks the validity of the new project name
     * @param newProjectName - Name of the new project
     * @param existingProjectNames - Names of the existing projects in the collection
     */
    public validateAndUpdateProjectName(
        newProjectName: string,
        existingProjectNames: string[]): void {
        if (this._isProjectNameValid(newProjectName, existingProjectNames)) {
            // The name is valid, meets requirements, hence invoke the validation succeeded action
            this._actionsHub.projectNameValidationSucceeded.invoke({
                projectName: newProjectName,
                meetsRequirements: true,
                status: {
                    value: StatusValueType.Success,
                    message: null
                }
            });
        } else if (newProjectName) {
            const trimmedName = newProjectName.trim();
            const isProjectNameAlreadyUsed = this._isProjectNameAlreadyUsed(trimmedName, existingProjectNames);
            const errorMessage = isProjectNameAlreadyUsed
                // The name is valid and meets requirements but is already used
                ? Utils_String.format(MyExperiencesResources.CreateProjectNameNotAvailableText, trimmedName)
                // The name has invalid characters and doesn't meet requirements
                : Utils_String.format(MyExperiencesResources.CreateProjectNameInvalidText, trimmedName);

            this._actionsHub.projectNameValidationFailed.invoke({
                projectName: newProjectName,
                meetsRequirements: isProjectNameAlreadyUsed,
                status: {
                    value: StatusValueType.Failure,
                    message: errorMessage
                }
            });
        }
    }

    /**
     * Two parts of the function
     * 1. Make the CreateProject post api call, which on success internally queues a project creation job
     * 2. Poll on the project creation job till we get the result of the job, either success or failure, is obtained
     * @param newProjectParams - New project creation parameters
     * @param source - Area/module/scenario from where the create project operation was invoked
     * @param projectNameInTextField - Latest project name in the text field (required to check for validation if changed within delayed validation time)
     * @param existingProjectNames - List of project name already existing (required for project name validation)
     */
    public createProject(
        newProjectParams: INewProjectParameters,
        source: string,
        projectNameInTextField: string,
        existingProjectNames: string[]
    ): void {

        if (newProjectParams.projectName !== projectNameInTextField) {
            if (!this._isProjectNameValid(projectNameInTextField, existingProjectNames)) {
                return;
            } else {
                newProjectParams.projectName = projectNameInTextField.trim();
            }
        }

        // Invoking the project creation started action before actually making the creation call
        this._actionsHub.projectCreationStarted.invoke({
            projectName: newProjectParams.projectName,
            projectUrl: null,
            status: {
                value: StatusValueType.InProgress,
                message: null
            } as IStatusPayload
        } as IProjectCreationStatusPayload);

        this.apiSource.createProject(newProjectParams, source).then(
            (projectData: any) => {
                // project creation job is queued successfully, with jobid projectData.JobId

                let mvcOptions: VSS_Locations.MvcRouteOptions = {
                    area: null,
                    project: newProjectParams.projectName,
                    controller: null,
                    action: null,
                    team: null
                }
                let projectUrl: string = VSS_Locations.urlHelper.getMvcUrl(mvcOptions);

                this.jobResultSource.pollJobResult(projectData.JobId).then(
                    (jobResult: IJobResult) => {
                        if (jobResult.isJobResultSuccess) {
                            // The project creation job succeeded, hence invoke project creation succeeded action
                            this._invokeProjectCreationSucceededAction(
                                newProjectParams.projectName,
                                projectUrl,
                                Utils_String.empty);
                        } else {
                            // The project creation job failed, hence invoke project creation failed action
                            this._invokeProjectCreationFailedAction(
                                newProjectParams.projectName,
                                isHosted ? MyExperiencesResources.CreateProjectJobFailedErrorText : MyExperiencesResources.CreateProjectJobFailedErrorTextOnPrem,
                                jobResult.resultMessage,
                                projectData.JobId);
                        }
                    },
                    (error: any) => {
                        // The project creation job result polling failed, hence invoke project creation failed action
                        this._invokeProjectCreationFailedAction(
                            newProjectParams.projectName,
                            error.message);
                    }
                );
            },
            (error: any) => {
                // The project creation api failed and the project craetion job was not queued successfully, hence invoke project creation failed action
                this._invokeProjectCreationFailedAction(
                    newProjectParams.projectName,
                    error.message);
            });
    }

    public downloadProjectCreationLog(projectName: string, jobId: string): void {
        let mvcOptions: VSS_Locations.MvcRouteOptions = {
            area: "api",
            controller: "job",
            action: "DownloadJobLog",
            queryParams: {
                jobId: jobId,
                filename: `CreateTeamProject_${projectName}.log`
            }
        };
        let downloadLink: string = VSS_Locations.urlHelper.getMvcUrl(mvcOptions);
        window.location.href = downloadLink;
    }

    /**
     * Dismisses the status message control
     */
    public dismissStatus(): void {
        this._actionsHub.statusDismissed.invoke(null);
    }

    /**
     * Checks the validity of the new project name and returns boolean flag.
     * @param newProjectName - Name of the new project
     * @param existingProjectNames - Names of the existing projects in the collection
     */
    private _isProjectNameValid(
        newProjectName: string,
        existingProjectNames: string[]): boolean {
        if (!newProjectName) {
            return false;
        }

        // Validations will be based on the trimmed name, though the displayed name is the actual text input
        const trimmedName = newProjectName.trim();
        const isValidName = ProjectNameValidator.validate(trimmedName);
        if (isValidName) {
            if (!this._isProjectNameAlreadyUsed(trimmedName, existingProjectNames)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Makes the actual project creation failed action invocation with given payload params
     * @param projectName - The given project name
     * @param message - The given status message
     * @param detailedMessage - Optional details for status
     * @param detailedLog - Optional details for project creation log
     */
    private _invokeProjectCreationFailedAction(projectName: string, message: string, detailedMessage?: string, jobId?: string): void {
        this._actionsHub.projectCreationFailed.invoke({
            projectName: projectName,
            projectUrl: null,
            projectCreationJobId: jobId,
            status: {
                value: StatusValueType.Failure,
                message: message,
                detailedMessage: detailedMessage
            } as IStatusPayload
        } as IProjectCreationStatusPayload);
    }

    /**
     * Makes the actual project creation succeeded action invocation with given payload params
     * @param projectName - The given project name
     * @param projectUrl - The project page url for the given project name
     * @param message - The given status message
     */
    private _invokeProjectCreationSucceededAction(projectName: string, projectUrl: string, message: string): void {
        this._actionsHub.projectCreationSucceeded.invoke({
            projectName: projectName,
            projectUrl: projectUrl,
            status: {
                value: StatusValueType.Success,
                message: message
            } as IStatusPayload
        } as IProjectCreationStatusPayload);
    }

    /**
     * Checks if the new project name is present in an array of already used project names
     * @param newProjectName - The new project name
     * @param existingProjectNames - Project names already in use
     */
    private _isProjectNameAlreadyUsed(newProjectName: string, existingProjectNames: string[]): boolean {
        let isProjectNameAlreadyUsed: boolean = false;

        existingProjectNames.every((existingProjectName: string) => {
            if (Utils_String.localeIgnoreCaseComparer(newProjectName, existingProjectName) === 0) {
                isProjectNameAlreadyUsed = true;
                return false;
            }
            return true;
        });

        return isProjectNameAlreadyUsed;
    }

    private get urlParametersSource(): UrlParametersSource {
        if (!this._urlParametersSource) {
            this._urlParametersSource = new UrlParametersSource();
        }

        return this._urlParametersSource;
    }

    private get dataProviderSource(): DataProviderSource {
        if (!this._dataProviderSource) {
            this._dataProviderSource = new DataProviderSource();
        }

        return this._dataProviderSource;
    }

    private get apiSource(): ApiSource {
        if (!this._apiSource) {
            this._apiSource = new ApiSource();
        }

        return this._apiSource;
    }

    private get jobResultSource(): JobResultSource {
        if (!this._jobResultSource) {
            this._jobResultSource = new JobResultSource();
        }

        return this._jobResultSource;
    }
}
