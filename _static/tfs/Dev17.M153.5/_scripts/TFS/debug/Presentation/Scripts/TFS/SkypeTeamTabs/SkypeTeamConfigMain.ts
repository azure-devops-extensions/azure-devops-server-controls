import * as Q from 'q';
import * as React from "react";
import * as ReactDOM from "react-dom";
import { initializeIcons } from "VSS/Fonts/fabric-icons";
import { getPageContext } from "VSS/Context";
import { FeatureManagementService } from "VSS/FeatureManagement/Services";

import { ITabConfigViewProps, TabConfigView, FeatureConfig } from "Presentation/Scripts/TFS/SkypeTeamTabs/TabConfigView";
import { IFeatureConfig, IFeatureConfigComponentProps } from "Presentation/Scripts/TFS/SkypeTeamTabs/IFeatureConfig";
import { SkypeTeamTabActions } from "Presentation/Scripts/TFS/SkypeTeamTabs/KanbanBoards/Actions/SkypeTeamTabActions";
import { SkypeTeamTabStore } from "Presentation/Scripts/TFS/SkypeTeamTabs/KanbanBoards/Stores/SkypeTeamTabStore";
import { SkypeTeamTabActionCreator } from "Presentation/Scripts/TFS/SkypeTeamTabs/KanbanBoards/Actions/SkypeTeamTabActionsCreator";
import { SkypeTeamTabDataProvider } from "Presentation/Scripts/TFS/SkypeTeamTabs/KanbanBoards/DataProviders/SkypeTeamTabDataProviders";
import { SkypeTeamTabMapper } from "Presentation/Scripts/TFS/SkypeTeamTabs/KanbanBoards/Models/SkypeTeamTabMapper";
import { SkypeTeamTabRequestCache } from "Presentation/Scripts/TFS/SkypeTeamTabs/KanbanBoards/Actions/ServerRequestCache";
import { TeamSetting } from "Presentation/Scripts/TFS/SkypeTeamTabs/KanbanBoards/Components/TeamSetting";
import { TfsContext } from  "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import * as Resources from "Presentation/Scripts/TFS/Resources/TFS.Resources.Presentation";
import { SkypeTeamTabTelemetry } from "Presentation/Scripts/TFS/SkypeTeamTabs/KanbanBoards/Utils/Telemetry";
import * as DashboardConfig from "Presentation/Scripts/TFS/SkypeTeamTabs/Dashboards/FeatureConfig";
import * as KanbanBoardConfig from "Presentation/Scripts/TFS/SkypeTeamTabs/KanbanBoards/FeatureConfig";
import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";
import { FeatureAvailabilityFlags } from "Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants";
import * as Service from "VSS/Service";
import * as microsoftTeams from "@microsoft/teams-js";

function initialize() {
    microsoftTeams.initialize();

    ReactDOM.render(React.createElement<ITabConfigViewProps>(TabConfigView, setupProps()), $("div.tab-content")[0]);
}

function setupProps(): ITabConfigViewProps {
    const featureConfigs = getFeatureConfigs();

    const featuresMap: IDictionaryStringTo<FeatureConfig> = {};
    for (const featureConfig of featureConfigs) {
        featuresMap[featureConfig.key] = featureConfig;
    }

    return {
        featureConfigs: featuresMap,
        account: TfsContext.getDefault().contextData.account.uri,
        defaultSelection: featureConfigs[0].key
    }
}

function getFeatureConfigs(): FeatureConfig[] {
    const configs: FeatureConfig[] = [DashboardConfig.getConfig()];
    const featureManagementService = Service.getService(FeatureManagementService);
    const includeKanbanBoard = featureManagementService.isFeatureEnabled("ms.vss-work.agile");

    if (includeKanbanBoard) {
        configs.push(KanbanBoardConfig.getConfig());
    }

    return configs;
}


initialize();
