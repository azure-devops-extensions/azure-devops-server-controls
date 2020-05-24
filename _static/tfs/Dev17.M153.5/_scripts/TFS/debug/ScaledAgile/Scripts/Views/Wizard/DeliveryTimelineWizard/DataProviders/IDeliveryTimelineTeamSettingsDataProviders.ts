import { IInitialPayload, IProjectData, ITeamConfiguration } from "ScaledAgile/Scripts/Views/Wizard/DeliveryTimelineWizard/Models/DeliveryTimelineTeamSettingsInterfaces";
import { IFieldShallowReference } from "ScaledAgile/Scripts/Views/Wizard/Models/WizardInterfaces";

export interface IDeliveryTimelineTeamSettingsDataProviders {
    /**
     * Get all projects for the collection
     * @returns {IFieldShallowReference[]} the array of projects
     */
    getProjects(): IPromise<IFieldShallowReference[]>;

    /**
     * Get project data given a project id and name
     * @returns {IProjectData} the teams and backlog levels for the given project
     */
    getProjectData(project: IFieldShallowReference): IPromise<IProjectData>;

    /**
     * Get team setting given the project id/name and the team id/name
     * @returns {ITeamConfiguration} the team configuration for the given team
     */
    getTeamConfiguration(project: IFieldShallowReference, team: IFieldShallowReference, allBacklogs: IFieldShallowReference[]): IPromise<ITeamConfiguration>;

    /**
     * Get initial payload to populate data for wizard experience
     * We are geting the initial wizard setting and all teams and backlog levels for the current project,
     * as well as the default team configuration.
     * @returns {IInitialPayload} the initial payload
     */
    getInitialPayload(): IPromise<IInitialPayload>;
}
