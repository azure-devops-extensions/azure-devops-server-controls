import { Dashboard } from "TFS/Dashboards/Contracts";

export interface ManageDashboardState {
    // error message if the dashboard metadata was modified unsuccessfully.
    error: string;

    // state of the dashboard received from the server after it was successfully saved.
    dashboardReceived: Dashboard;
}