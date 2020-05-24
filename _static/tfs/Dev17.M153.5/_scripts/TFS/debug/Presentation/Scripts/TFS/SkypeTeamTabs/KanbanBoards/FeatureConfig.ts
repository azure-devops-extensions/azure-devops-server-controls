import * as Resources from "Presentation/Scripts/TFS/Resources/TFS.Resources.Presentation";
import { IFeatureConfig } from "Presentation/Scripts/TFS/SkypeTeamTabs/IFeatureConfig";
import { SkypeTeamTabRequestCache } from "Presentation/Scripts/TFS/SkypeTeamTabs/KanbanBoards/Actions/ServerRequestCache";
import { SkypeTeamTabActions } from "Presentation/Scripts/TFS/SkypeTeamTabs/KanbanBoards/Actions/SkypeTeamTabActions";
import { ISkypeTeamTabActionCreator, SkypeTeamTabActionCreator } from "Presentation/Scripts/TFS/SkypeTeamTabs/KanbanBoards/Actions/SkypeTeamTabActionsCreator";
import { TeamSetting, ITeamSettingProps } from "Presentation/Scripts/TFS/SkypeTeamTabs/KanbanBoards/Components/TeamSetting";
import { SkypeTeamTabDataProvider } from "Presentation/Scripts/TFS/SkypeTeamTabs/KanbanBoards/DataProviders/SkypeTeamTabDataProviders";
import { ITeamSettingData } from "Presentation/Scripts/TFS/SkypeTeamTabs/KanbanBoards/Models/SkypeTeamTabInterfaces";
import { SkypeTeamTabMapper } from "Presentation/Scripts/TFS/SkypeTeamTabs/KanbanBoards/Models/SkypeTeamTabMapper";
import { SkypeTeamTabStore } from "Presentation/Scripts/TFS/SkypeTeamTabs/KanbanBoards/Stores/SkypeTeamTabStore";
import { SkypeTeamTabTelemetry } from "Presentation/Scripts/TFS/SkypeTeamTabs/KanbanBoards/Utils/Telemetry";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";


/** Returns the description of the feature config that will be used by the tab config view */
export function getConfig(): IFeatureConfig<ISkypeTeamTabActionCreator, ITeamSettingData, ITeamSettingProps> {
    const actions = new SkypeTeamTabActions();
    const store = new SkypeTeamTabStore(actions);
    const dataProvider = new SkypeTeamTabDataProvider(new SkypeTeamTabMapper());
    const actionsCreator = new SkypeTeamTabActionCreator(dataProvider, actions, new SkypeTeamTabRequestCache());

    actionsCreator.initializeStore();

    return {
        store: store,
        actionCreator: actionsCreator,
        key: "kanban",
        displayName: Resources.MSTeamsVSTSConfig_AddKanbanRadioButton,
        description: Resources.MSTeamsVSTSConfig_KanbanDescription,
        learnMoreText: Resources.MSTeamsVSTSConfig_KanbanLinkText,
        learnMoreUrl: "https://go.microsoft.com/fwlink/?linkid=872903",
        configComponent: TeamSetting,
        onSave: (saveEvent: microsoftTeams.settings.SaveEvent) => {
            SkypeTeamTabTelemetry.onCreateTab(store.getValue().backlogLevel.name);
            saveEvent.notifySuccess();
        }
    }
}