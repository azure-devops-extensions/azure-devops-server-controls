import * as VSS from "VSS/VSS";
import * as Q from "q";

import { DashboardDataProvider } from "Presentation/Scripts/TFS/SkypeTeamTabs/Dashboards/DataProviders/DashboardDataProvider";
import { IPickerErrorState } from "Presentation/Scripts/TFS/SkypeTeamTabs/Dashboards/Models/IDashboardConfigData";
import { DashboardConfigActions } from "Presentation/Scripts/TFS/SkypeTeamTabs/Dashboards/Actions/DashboardConfigActions";
import { TeamProjectReference, WebApiTeam } from "TFS/Core/Contracts";
import * as Resources from "Presentation/Scripts/TFS/Resources/TFS.Resources.Presentation";
import { Dashboard } from "TFS/Dashboards/Contracts";
import * as StringUtils from "VSS/Utils/String";

export class DashboardConfigActionCreator {

    private dataProvider: DashboardDataProvider;
    private actions: DashboardConfigActions;

    constructor(dataProvider: DashboardDataProvider, actions: DashboardConfigActions) {
        this.dataProvider = dataProvider;
        this.actions = actions;
    }

    /**
     * Initialize the delivery timeline tab experience
     * returns promise for testing purposes
     */
    public initializeStore(): IPromise<void> {
        // Set loading state
        this.actions.projectsReceived.invoke({
            values: [],
            isLoading: true
        });

        // Set Projects list
        return this.dataProvider.getProjects().then(
            (projects: TeamProjectReference[]) => {
                if (projects) {
                    projects.sort((a, b) => StringUtils.localeComparer(a.name, b.name));
                }

                this.actions.projectsReceived.invoke({
                    values: projects,
                    isLoading: false
                });
            },
            (error) => {
                this.actions.setTopLevelError.invoke(VSS.getErrorMessage(error));
            }
        );
    }

    /**
     * Returns promise for testing purposes.
     */
    public selectProject(project: TeamProjectReference): IPromise<void> {
        this.actions.projectChanged.invoke(project);
        this.actions.teamChanged.invoke(null);
        this.actions.teamsReceived.invoke({
            values: [],
            isLoading: true
        });
        this.actions.dashboardChanged.invoke(null);
        this.actions.dashboardsReceived.invoke({
            values: [],
            isLoading: false
        });

        return this.dataProvider.getTeams({
            projectId: project.id,
            project: null,
            teamId: null,
            team: null
        }).then(
            (teams) => {
                if (teams) {
                    teams.sort((a, b) => StringUtils.localeComparer(a.name, b.name));
                }

                this.actions.teamsReceived.invoke({
                    values: teams,
                    isLoading: false
                });
            },
            (error) => {
                this.actions.setTopLevelError.invoke(VSS.getErrorMessage(error));
            }
        );
    }

    public setProjectError(selectedValue: string): void {
        let error: IPickerErrorState = {
            customText: selectedValue,
            errorMessage: Resources.ProjectDoesNotExistMessage
        }
        this.actions.setProjectErrorState.invoke(error);
    }

    public selectTeam(project: TeamProjectReference, team: WebApiTeam): IPromise<void> {
        this.actions.teamChanged.invoke(team);
        this.actions.dashboardChanged.invoke(null);
        this.actions.dashboardsReceived.invoke({
            values: [],
            isLoading: true
        });

        return this.dataProvider.getDashboards({
            projectId: project.id,
            project: null,
            teamId: team.id,
            team: null
        }).then(
            (dashboards) => {
                if (dashboards && dashboards.dashboardEntries) {
                    dashboards.dashboardEntries.sort((a, b) => StringUtils.localeComparer(a.name, b.name));
                }

                this.actions.dashboardsReceived.invoke({
                    values: dashboards.dashboardEntries,
                    isLoading: false
                });
            },
            (error) => {
                this.actions.setTopLevelError.invoke(VSS.getErrorMessage(error));
            }
        );
    }

    public setTeamError(selectedValue: string): void {
        let error: IPickerErrorState = {
            customText: selectedValue,
            errorMessage: Resources.TeamDoesNotExistMessage
        }
        this.actions.setTeamErrorState.invoke(error);
    }

    public selectDashboard(dashboard: Dashboard): void {
        this.actions.dashboardChanged.invoke(dashboard);
    }

    public setDashboardError(selectedValue: string): void {
        let error: IPickerErrorState = {
            customText: selectedValue,
            errorMessage: Resources.DashboardDoesNotExistMessage
        }
        this.actions.setDashboardErrorState.invoke(error);
    }
}