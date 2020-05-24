import { TeamProjectReference, WebApiTeam } from "TFS/Core/Contracts";
import { Dashboard } from "TFS/Dashboards/Contracts";

export interface IDashboardConfigData {
    /**
     * The host URL. Eg - https://{accountName}.visualstudio.com, https://codedev.ms, https://dev.azure.com
     * This is required for stiching the board URL
     */
    hostUrl: string;

    /**
     * The organisation URL. Eg - https://{accountName}.visualstudio.com, https://codedev.ms/mseng, https://dev.azure.com/mseng
     */
    orgUrl: string;

    /**
     * Settings for the project picker
     */
    project: IDashboardConfigPickerState<TeamProjectReference>;

    /**
     * Settings for the dashboard picker
     */
    dashboard: IDashboardConfigPickerState<Dashboard>;

    /**
     * Settings for the team picker
     */
    team: IDashboardConfigPickerState<WebApiTeam>;

    /**
     * error message to be rendered at the top of the config experience
     */
    errorMessage: string;
}

export interface IDashboardConfigPickerState<T> {
    selected: T;
    options: IPickerOptions<T>;
    error: IPickerErrorState;
    disabled: boolean;
}

export interface IPickerOptions<T> {
    values: T[];
    isLoading: boolean;
}

export interface IPickerErrorState {
    customText: string;
    errorMessage: string;
}
