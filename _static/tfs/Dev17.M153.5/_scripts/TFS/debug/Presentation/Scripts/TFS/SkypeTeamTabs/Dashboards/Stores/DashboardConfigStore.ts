import { Store } from "VSS/Flux/Store";
import { IFeatureConfigStore } from "Presentation/Scripts/TFS/SkypeTeamTabs/IFeatureConfigStore";
import { DashboardConfigActions } from "Presentation/Scripts/TFS/SkypeTeamTabs/Dashboards/Actions/DashboardConfigActions";
import { IDashboardConfigData, IPickerOptions, IPickerErrorState } from "Presentation/Scripts/TFS/SkypeTeamTabs/Dashboards/Models/IDashboardConfigData";
import { DashboardUrlBuilder } from "Presentation/Scripts/TFS/SkypeTeamTabs/Dashboards/DashboardUrlBuilder";
import { TeamProjectReference, WebApiTeam } from "TFS/Core/Contracts";
import { DashboardGroup, Dashboard } from "TFS/Dashboards/Contracts";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { GUIDUtils } from "Presentation/Scripts/TFS/TFS.Core.Utils";

export class DashboardConfigStore extends Store implements IFeatureConfigStore<IDashboardConfigData> {

    private state: IDashboardConfigData;

    constructor(actions: DashboardConfigActions) {
        super();
        actions.projectsReceived.addListener(this.setProjectsList, this);
        actions.projectChanged.addListener(this.setProject, this);
        actions.setProjectErrorState.addListener(this.setProjectError, this);

        actions.teamsReceived.addListener(this.setTeamsList, this);
        actions.teamChanged.addListener(this.setTeam, this);
        actions.setTeamErrorState.addListener(this.setTeamError, this);

        actions.dashboardsReceived.addListener(this.setDashboardsList, this);
        actions.dashboardChanged.addListener(this.setDashboard, this);
        actions.setDashboardErrorState.addListener(this.setDashboardError, this);

        actions.setTopLevelError.addListener(this.setErrorMessage, this);

        this.state = {
            hostUrl: window.location.origin,
            orgUrl: TfsContext.getDefault().contextData.account.uri,
            project: {
                disabled: true,
                error: null,
                options: {
                    values: [],
                    isLoading: false,
                },
                selected: null
            },
            team: {
                disabled: true,
                error: null,
                options: {
                    values: [],
                    isLoading: false,
                },
                selected: null
            },
            dashboard: {
                disabled: true,
                error: null,
                options: {
                    values: [],
                    isLoading: false,
                },
                selected: null
            },
            errorMessage: null
        }
    }

    public getValue(): IDashboardConfigData {
        return this.state;
    }

    public isValueValid(): boolean {
        return (this.state.project.selected != null
            && this.state.team.selected != null
            && this.state.dashboard.selected != null
            && this.state.project.error == null
            && this.state.team.error == null
            && this.state.dashboard.error == null);
    }

    public getTabSettings(): microsoftTeams.settings.Settings {
        const projectId = this.state.project.selected.id;
        const teamId = this.state.team.selected.id;
        const dashboardId =  this.state.dashboard.selected.id;

        return {
            entityId: GUIDUtils.newGuid(),
            contentUrl: DashboardUrlBuilder.getEmbeddedDashboardUrl(this.state.hostUrl, this.state.orgUrl, projectId, dashboardId),
            websiteUrl: DashboardUrlBuilder.getFullDashboardUrl(this.state.hostUrl, projectId, teamId, dashboardId),
            suggestedDisplayName: this.getTabName()
        }
    }

    public getErrorMessage(): string {
        return this.state.errorMessage;
    }

    public dismissErrorMessage(): void {
        this.state.errorMessage = null;
        this.emitChanged();
    }

    private setErrorMessage(message): void {
        this.state.errorMessage = message;
        this.emitChanged();
    }

    private setProjectsList(projects: IPickerOptions<TeamProjectReference>): void {
        this.state.project.options = projects;
        this.state.project.disabled = projects.isLoading;

        this.emitChanged();
    }

    private setProject(project: TeamProjectReference): void {
        this.state.project.selected = project;
        this.state.project.error = null;
        this.emitChanged();
    }

    private setProjectError(error: IPickerErrorState): void {
        this.state.project.error = error;
        this.state.dashboard.disabled = error != null;
        this.state.team.disabled = error != null;
        this.emitChanged();
    }

    private setTeamsList(teams: IPickerOptions<WebApiTeam>): void {
        this.state.team.options = teams;
        this.state.team.disabled = teams.isLoading
        || this.state.project.options.isLoading;

        this.emitChanged();
    }

    private setTeam(team: WebApiTeam): void {
        this.state.team.selected = team;
        this.state.team.error = null;
        this.emitChanged();
    }

    private setTeamError(error: IPickerErrorState): void {
        this.state.team.error = error;
        this.state.dashboard.disabled = error != null;
        this.emitChanged();
    }

    private setDashboardsList(dashboards: IPickerOptions<Dashboard>): void {
        this.state.dashboard.options = dashboards;
        this.state.dashboard.disabled = dashboards.isLoading
        || this.state.project.options.isLoading
        || this.state.team.options.isLoading;
        this.emitChanged();
    }

    private setDashboard(dashboard: Dashboard): void {
        this.state.dashboard.selected = dashboard;
        this.state.dashboard.error = null;
        this.emitChanged();
    }

    private setDashboardError(error: IPickerErrorState): void {
        this.state.dashboard.error = error;
        this.emitChanged();
    }

    private getTabName(): string {
        return `${this.state.team.selected.name} ${this.state.dashboard.selected.name}`;
    }
}