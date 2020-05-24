import { Action } from "VSS/Flux/Action";
import { IDashboardConfigData, IPickerOptions, IPickerErrorState } from "Presentation/Scripts/TFS/SkypeTeamTabs/Dashboards/Models/IDashboardConfigData";
import { IFieldShallowReference } from "Presentation/Scripts/TFS/SkypeTeamTabs/KanbanBoards/Models/SkypeTeamTabInterfaces";
import { DashboardGroup, Dashboard } from "TFS/Dashboards/Contracts";
import { TeamProjectReference, WebApiTeam } from "TFS/Core/Contracts";

export class DashboardConfigActions {
    public projectsReceived: Action<IPickerOptions<TeamProjectReference>>;
    public projectChanged: Action<TeamProjectReference>;
    public setProjectErrorState: Action<IPickerErrorState>;

    public teamsReceived: Action<IPickerOptions<WebApiTeam>>;
    public teamChanged: Action<WebApiTeam>;
    public setTeamErrorState: Action<IPickerErrorState>;

    public dashboardChanged: Action<Dashboard>;
    public dashboardsReceived: Action<IPickerOptions<Dashboard>>;
    public setDashboardErrorState: Action<IPickerErrorState>;

    public setTopLevelError: Action<string>;

    constructor() {
        this.projectsReceived = new Action<IPickerOptions<TeamProjectReference>>();
        this.projectChanged = new Action<TeamProjectReference>();
        this.setProjectErrorState = new Action<IPickerErrorState>();

        this.teamsReceived = new Action<IPickerOptions<WebApiTeam>>();
        this.teamChanged = new Action<WebApiTeam>();
        this.setTeamErrorState = new Action<IPickerErrorState>();

        this.dashboardsReceived = new Action<IPickerOptions<Dashboard>>();
        this.dashboardChanged = new Action<Dashboard>();
        this.setDashboardErrorState = new Action<IPickerErrorState>();

        this.setTopLevelError = new Action<string>();
    }
}