import * as Resources from "Presentation/Scripts/TFS/Resources/TFS.Resources.Presentation";
import { DashboardConfigActionCreator } from "Presentation/Scripts/TFS/SkypeTeamTabs/Dashboards/Actions/DashboardConfigActionCreator";
import { DashboardConfigActions } from "Presentation/Scripts/TFS/SkypeTeamTabs/Dashboards/Actions/DashboardConfigActions";
import { DashboardConfig, IDashboardConfigProps } from "Presentation/Scripts/TFS/SkypeTeamTabs/Dashboards/Components/DashboardConfig";
import { DashboardDataProvider } from "Presentation/Scripts/TFS/SkypeTeamTabs/Dashboards/DataProviders/DashboardDataProvider";
import { IDashboardConfigData } from "Presentation/Scripts/TFS/SkypeTeamTabs/Dashboards/Models/IDashboardConfigData";
import { DashboardConfigStore } from "Presentation/Scripts/TFS/SkypeTeamTabs/Dashboards/Stores/DashboardConfigStore";
import { IFeatureConfig } from "Presentation/Scripts/TFS/SkypeTeamTabs/IFeatureConfig";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import * as Context from "VSS/Context";
import * as Telemetry from "VSS/Telemetry/Services";
import { SkypeTeamTabTelemetry } from "Presentation/Scripts/TFS/SkypeTeamTabs/KanbanBoards/Utils/Telemetry";

/** Returns the description of the feature config that will be used by the tab config view */
export function getConfig(): IFeatureConfig<DashboardConfigActionCreator, IDashboardConfigData, IDashboardConfigProps> {
    const actions = new DashboardConfigActions();
    const store = new DashboardConfigStore(actions);
    const dataProvider = new DashboardDataProvider();
    const actionCreator = new DashboardConfigActionCreator(dataProvider, actions);
    const featureName = "OnCreateDashboardTab";

    actionCreator.initializeStore();

    return {
        store: store,
        actionCreator: actionCreator,
        key: "dashboards",
        displayName: Resources.MSTeamsVSTSConfig_AddDashboardRadioButton,
        description: Resources.MSTeamsVSTSConfig_DashboardDescription,
        learnMoreText: Resources.MSTeamsVSTSConfig_DashboardLinkText,
        learnMoreUrl: "https://go.microsoft.com/fwlink/?linkid=872902",
        configComponent: DashboardConfig,
        onSave: (saveEvent) => {
            SkypeTeamTabTelemetry.onCreateDashboardsTab(store.getValue(), featureName);
            saveEvent.notifySuccess();
        }
    }
}