import Controls = require("VSS/Controls");
import Service = require("VSS/Service");
import Utils_Array = require("VSS/Utils/Array");
import Tfs_Admin_Controls_TeamSettings = require("Agile/Scripts/Admin/TeamSettings");

import Agile = require("Agile/Scripts/Common/Agile");
import AgileControls = require("Agile/Scripts/Common/Controls");
import AgileControlsResources = require("Agile/Scripts/Resources/TFS.Resources.AgileControls");
import Configurations = require("Presentation/Scripts/TFS/TFS.Configurations");
import BoardsSettingsControls = require("Agile/Scripts/Board/BoardsSettingsControls");
import Boards = require("Agile/Scripts/TFS.Agile.Boards");
import CardAnnotationCustomizationView = require("Agile/Scripts/Card/CardCustomizationAnnotationView");
import CardTestsCustomizationView = require("Agile/Scripts/Card/CardCustomizationTestsView");
import CardStyleCustomization_NO_REQUIRE = require("Agile/Scripts/Card/CardCustomizationStyle");
import CardStyleCustomizationView = require("Agile/Scripts/Card/CardCustomizationStyleView");
import CardTagColorCustomizationView = require("Agile/Scripts/Card/CardCustomizationTagColorView");

import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import TFS_TeamAwarenessService = require("Presentation/Scripts/TFS/FeatureRef/TFS.TeamAwarenessService");
import TFS_OM_Common = require("Presentation/Scripts/TFS/TFS.OM.Common");
import TeamServices = require("TfsCommon/Scripts/Team/Services");
import { BacklogConfigurationService } from "Presentation/Scripts/TFS/FeatureRef/BacklogConfiguration/Service";

import Tfs_Work_WebApi = require("TFS/Work/RestClient");

export module CommonSettingsConfigurationUtils {
    export function registerBacklogSettingsForBacklogLevel(
        teamId: string,
        boardSettingsOptions: BoardsSettingsControls.IBoardSettingTabOptions,
        currentUserTeamPermissions: TeamServices.ITeamPermissions) {
        registerChartSettings(boardSettingsOptions);
        registerGeneralSettings(teamId, currentUserTeamPermissions, /* showBacklogVisibilitiesTab */ true);
    }

    export function registerKanbanSettingsForBacklogLevel(
        teamId: string,
        boardSettingsOptions: BoardsSettingsControls.IBoardSettingTabOptions,
        currentUserTeamPermissions: TeamServices.ITeamPermissions,
        fieldOptions?: BoardsSettingsControls.IFieldSettingsControlOptions,
        styleOptions?: CardStyleCustomization_NO_REQUIRE.ICardStyleSettingsCSCControlInitOptions,
        tagOptions?: CardStyleCustomization_NO_REQUIRE.ICardStyleSettingsCSCControlInitOptions,
        annotationOptions?: CardStyleCustomization_NO_REQUIRE.ICardStyleSettingsCSCControlInitOptions) {

        registerCardSettings(fieldOptions, styleOptions, tagOptions, annotationOptions);
        registerBoardSettings(boardSettingsOptions);
        registerChartSettings(boardSettingsOptions);
        registerGeneralSettings(teamId, currentUserTeamPermissions, /* showBacklogVisibilitiesTab */ true);
    }

    export function registerKanbanSettingsForEmbeddedBacklogLevel(
        boardSettingsOptions: BoardsSettingsControls.IBoardSettingTabOptions,
        fieldOptions: BoardsSettingsControls.IFieldSettingsControlOptions,
        styleOptions: CardStyleCustomization_NO_REQUIRE.ICardStyleSettingsCSCControlInitOptions,
        tagOptions: CardStyleCustomization_NO_REQUIRE.ICardStyleSettingsCSCControlInitOptions,
        annotationOptions?: CardStyleCustomization_NO_REQUIRE.ICardStyleSettingsCSCControlInitOptions) {

        registerCardSettings(fieldOptions, styleOptions, tagOptions, annotationOptions);
        registerBoardSettings(boardSettingsOptions);
    }

    export function registerTaskboardSettingsForIterationLevel(
        teamId: string,
        currentUserTeamPermissions: TeamServices.ITeamPermissions,
        showBacklogVisibilitiesTab: boolean,
        fieldOptions?: BoardsSettingsControls.IFieldSettingsControlOptions,
        styleOptions?: CardStyleCustomization_NO_REQUIRE.ICardStyleSettingsCSCControlInitOptions,
        tagOptions?: CardStyleCustomization_NO_REQUIRE.ICardStyleSettingsCSCControlInitOptions) {

        registerCardSettings(fieldOptions, styleOptions, tagOptions);
        registerGeneralSettings(teamId, currentUserTeamPermissions, showBacklogVisibilitiesTab);
    }

    export function registerGeneralSettingsForIterationLevel(
        teamId: string,
        currentUserTeamPermissions: TeamServices.ITeamPermissions,
        showBacklogVisibilitiesTab: boolean) {
        registerGeneralSettings(teamId, currentUserTeamPermissions, showBacklogVisibilitiesTab);
    }

    function registerCardSettings(fieldOptions: BoardsSettingsControls.IFieldSettingsControlOptions,
        styleOptions: CardStyleCustomization_NO_REQUIRE.ICardStyleSettingsCSCControlInitOptions,
        tagOptions: CardStyleCustomization_NO_REQUIRE.ICardStyleSettingsCSCControlInitOptions,
        annotationOptions?: CardStyleCustomization_NO_REQUIRE.ICardStyleSettingsCSCControlInitOptions) {

        if (!fieldOptions && !styleOptions && !tagOptions && !annotationOptions) {
            return;
        }

        Configurations.TabControlsRegistration.registerTabGroup({
            tabControlId: Agile.TabControlsRegistrationConstants.COMMON_CONFIG_SETTING_INSTANCE_ID,
            id: Agile.TabControlsRegistrationConstants.CARDS_GROUP_ID,
            title: Agile.TabControlsRegistrationConstants.CARDS_GROUP_TITLE,
            order: 10
        });

        if (fieldOptions) {
            registerCardFieldSettingsTab(fieldOptions);
        }
        if (styleOptions) {
            registerCardsStylesSettingTab(styleOptions);
        }
        if (tagOptions) {
            registerCardsTagColorSettingTab(tagOptions);
        }

        if (annotationOptions) {
            registerCardsAnnotationSettingTab(annotationOptions);
            registerCardsTestsTab(annotationOptions);
        }
    }

    function registerCardFieldSettingsTab(fieldOptions: BoardsSettingsControls.IFieldSettingsControlOptions) {
        var cardFieldRegistrationOptions: Configurations.ITabRegistration<BoardsSettingsControls.IFieldSettingsControlOptions> = {
            groupId: Agile.TabControlsRegistrationConstants.CARDS_GROUP_ID,
            id: Agile.TabControlsRegistrationConstants.FIELDS_TAB_ID,
            title: Agile.TabControlsRegistrationConstants.FIELDS_TAB_TITLE,
            tabContent: BoardsSettingsControls.FieldSettingsControl,
            tabContentOptions: fieldOptions,
            order: 10
        };

        Configurations.TabControlsRegistration.registerTab(cardFieldRegistrationOptions);
    }

    function registerCardsAnnotationSettingTab(annotationOptions: CardStyleCustomization_NO_REQUIRE.ICardStyleSettingsCSCControlInitOptions) {
        var cardAnnotationRegistrationOptions: Configurations.ITabRegistration<CardStyleCustomization_NO_REQUIRE.ICardStyleSettingsCSCControlInitOptions> = {
            groupId: Agile.TabControlsRegistrationConstants.CARDS_GROUP_ID,
            id: Agile.TabControlsRegistrationConstants.CARDS_ANNOTATION_TAB_ID,
            title: Agile.TabControlsRegistrationConstants.CARDS_ANNOTATION_TAB_TITLE,
            tabContent: CardAnnotationCustomizationView.ConfigureAnnotationsCSCControl,
            tabContentOptions: annotationOptions,
            order: 40
        };

        Configurations.TabControlsRegistration.registerTab(cardAnnotationRegistrationOptions);
    }

    function registerCardsTestsTab(annotationOptions: CardStyleCustomization_NO_REQUIRE.ICardStyleSettingsCSCControlInitOptions) {
        let shouldRegister = false;
        $.each(annotationOptions.styleRules, (index, rule: CardStyleCustomization_NO_REQUIRE.IBaseStyleRule) => {
            if (rule.name === Boards.BoardAnnotationsIdentifier.TestAnnotation) {
                shouldRegister = true;
            }
        });

        if (!shouldRegister) {
            return;
        }

        var cardTestsRegistrationOptions: Configurations.ITabRegistration<CardStyleCustomization_NO_REQUIRE.ICardStyleSettingsCSCControlInitOptions> = {
            groupId: Agile.TabControlsRegistrationConstants.CARDS_GROUP_ID,
            id: Agile.TabControlsRegistrationConstants.CARDS_TESTS_TAB_ID,
            title: Agile.TabControlsRegistrationConstants.CARDS_TESTS_TAB_TITLE,
            tabContent: CardTestsCustomizationView.ConfigureTestsCSCControl,
            tabContentOptions: annotationOptions,
            order: 50
        };

        Configurations.TabControlsRegistration.registerTab(cardTestsRegistrationOptions);
    }

    function registerCardsTagColorSettingTab(cardOptions: CardStyleCustomization_NO_REQUIRE.ICardStyleSettingsCSCControlInitOptions) {
        var cardTabColorRegistrationOptions: Configurations.ITabRegistration<CardStyleCustomization_NO_REQUIRE.ICardStyleSettingsCSCControlInitOptions> = {
            groupId: Agile.TabControlsRegistrationConstants.CARDS_GROUP_ID,
            id: Agile.TabControlsRegistrationConstants.CARDS_TAGCOLOR_TAB_ID,
            title: Agile.TabControlsRegistrationConstants.CARDS_TAGCOLOR_TAB_TITLE,
            tabContent: CardTagColorCustomizationView.ConfigureTagColorsCSCControl,
            tabContentOptions: cardOptions,
            order: 30
        };

        Configurations.TabControlsRegistration.registerTab(cardTabColorRegistrationOptions);
    }

    function registerCardsStylesSettingTab(cardOptions: CardStyleCustomization_NO_REQUIRE.ICardStyleSettingsCSCControlInitOptions) {
        var cardStylesRegistrationOptions: Configurations.ITabRegistration<CardStyleCustomization_NO_REQUIRE.ICardStyleSettingsCSCControlInitOptions> = {
            groupId: Agile.TabControlsRegistrationConstants.CARDS_GROUP_ID,
            id: Agile.TabControlsRegistrationConstants.CARDS_STYLES_TAB_ID,
            title: Agile.TabControlsRegistrationConstants.CARDS_STYLES_TAB_TITLE,
            tabContent: CardStyleCustomizationView.ConfigureStylesCSCControl,
            tabContentOptions: cardOptions,
            order: 20
        };

        Configurations.TabControlsRegistration.registerTab(cardStylesRegistrationOptions);
    }

    function registerBoardSettings(tabContentOptions: BoardsSettingsControls.IBoardSettingTabOptions) {
        if (tabContentOptions) {
            Configurations.TabControlsRegistration.registerTabGroup({
                tabControlId: Agile.TabControlsRegistrationConstants.COMMON_CONFIG_SETTING_INSTANCE_ID,
                id: Agile.TabControlsRegistrationConstants.BOARDS_GROUP_ID,
                title: Agile.TabControlsRegistrationConstants.BOARD_GROUP_TITLE,
                order: 20
            });

            registerSwimlaneSettingsTab(tabContentOptions);
            registerColumnSettingsTab(tabContentOptions);
            registerCardReorderingTab(tabContentOptions);
        }
    }

    function registerChartSettings(tabContentOptions: BoardsSettingsControls.IBoardSettingTabOptions) {
        if (tabContentOptions) {
            Configurations.TabControlsRegistration.registerTabGroup({
                tabControlId: Agile.TabControlsRegistrationConstants.COMMON_CONFIG_SETTING_INSTANCE_ID,
                id: Agile.TabControlsRegistrationConstants.CHARTS_GROUP_ID,
                title: Agile.TabControlsRegistrationConstants.CHARTS_GROUP_TITLE,
                order: 25
            });

            registerCFDSettingsTab(tabContentOptions);
        }
    }

    function registerGeneralSettings(
        teamId: string,
        currentUserTeamPermissions: TeamServices.ITeamPermissions,
        showBacklogVisibilitiesTab: boolean) {

        // register group
        Configurations.TabControlsRegistration.registerTabGroup({
            tabControlId: Agile.TabControlsRegistrationConstants.COMMON_CONFIG_SETTING_INSTANCE_ID,
            id: Agile.TabControlsRegistrationConstants.GENERAL_GROUP_ID,
            title: Agile.TabControlsRegistrationConstants.GENERAL_GROUP_TITLE,
            order: 30
        });

        // register tabs
        const teamAwareness = TFS_OM_Common.ProjectCollection.getDefaultConnection().getService(TFS_TeamAwarenessService.TeamAwarenessService);
        const teamSettings = teamAwareness.getTeamSettings(teamId);

        var contextData = TFS_Host_TfsContext.TfsContext.getDefault();
        var httpClient = new Service.VssConnection(contextData.contextData).getHttpClient<Tfs_Work_WebApi.WorkHttpClient>(Tfs_Work_WebApi.WorkHttpClient);
        var backlogConfiguration = BacklogConfigurationService.getBacklogConfiguration();

        if (showBacklogVisibilitiesTab) {
            // Register BugVisibilitiesSettings Tab
            var bugVisibilitiesTabOptions: BoardsSettingsControls.ITeamSettingTabOptions = {
                workHttpClient: httpClient,
                teamSettings,
                backlogConfiguration: backlogConfiguration,
                editable: currentUserTeamPermissions.currentUserHasTeamAdminPermission,
                currentUserTeamPermissions: currentUserTeamPermissions,
                controlType: Tfs_Admin_Controls_TeamSettings.BacklogVisibilitiesTeamSettingControl,
                displayNoPermissionsMessage: true
            };

            var generalSettingsRegistrationOptions: Configurations.ITabRegistration<any> = {
                groupId: Agile.TabControlsRegistrationConstants.GENERAL_GROUP_ID,
                id: Agile.TabControlsRegistrationConstants.BACKLOGS_TAB_ID,
                title: AgileControlsResources.BacklogVisibilities_Tab_Title,
                tabContent: BoardsSettingsControls.TeamSettingTabContent,
                tabContentOptions: bugVisibilitiesTabOptions,
                order: 10
            };

            Configurations.TabControlsRegistration.registerTab(generalSettingsRegistrationOptions);
        }

        // Register bugBehavior, weekdays ONLY if requirement level is visible
        if (!Utils_Array.contains(BacklogConfigurationService.getBacklogConfiguration().hiddenBacklogs, BacklogConfigurationService.getBacklogConfiguration().requirementBacklog.id)) {
            // Register WorkingDaysSettings Tab
            var workingDaysTabOptions: BoardsSettingsControls.ITeamSettingTabOptions = {
                workHttpClient: httpClient,
                teamSettings,
                backlogConfiguration: backlogConfiguration,
                editable: currentUserTeamPermissions.currentUserHasTeamAdminPermission,
                currentUserTeamPermissions: currentUserTeamPermissions,
                controlType: Tfs_Admin_Controls_TeamSettings.WorkingDaysTeamSettingControl,
                displayNoPermissionsMessage: true
            };

            var generalSettingsRegistrationOptions: Configurations.ITabRegistration<any> = {
                groupId: Agile.TabControlsRegistrationConstants.GENERAL_GROUP_ID,
                id: Agile.TabControlsRegistrationConstants.WORKINGDAYS_TAB_ID,
                title: AgileControlsResources.WorkingDays_Tab_Title,
                tabContent: BoardsSettingsControls.TeamSettingTabContent,
                tabContentOptions: workingDaysTabOptions,
                order: 20
            };

            Configurations.TabControlsRegistration.registerTab(generalSettingsRegistrationOptions);

            // Register BugBehaviorSettings Tab
            var bugsBehaviorTabOptions: BoardsSettingsControls.ITeamSettingTabOptions = {
                workHttpClient: httpClient,
                teamSettings,
                backlogConfiguration: backlogConfiguration,
                editable: currentUserTeamPermissions.currentUserHasTeamAdminPermission,
                currentUserTeamPermissions: currentUserTeamPermissions,
                controlType: Tfs_Admin_Controls_TeamSettings.BugsBehaviorTeamSettingControl,
                displayNoPermissionsMessage: true
            };

            generalSettingsRegistrationOptions = {
                groupId: Agile.TabControlsRegistrationConstants.GENERAL_GROUP_ID,
                id: Agile.TabControlsRegistrationConstants.BUGBEHAVIOR_TAB_ID,
                title: AgileControlsResources.BugBehavior_Tab_Title,
                tabContent: BoardsSettingsControls.TeamSettingTabContent,
                tabContentOptions: bugsBehaviorTabOptions,
                order: 30
            };

            Configurations.TabControlsRegistration.registerTab(generalSettingsRegistrationOptions);
        }
    }

    function registerColumnSettingsTab(tabContentOptions: BoardsSettingsControls.IBoardSettingTabOptions) {
        Configurations.TabControlsRegistration.registerTab({
            groupId: Agile.TabControlsRegistrationConstants.BOARDS_GROUP_ID,
            id: Agile.TabControlsRegistrationConstants.COLUMNS_TAB_ID,
            title: AgileControlsResources.Board_Settings_Columns,
            tabContent: BoardsSettingsControls.ColumnSettingsControl,
            tabContentOptions: <BoardsSettingsControls.IColumnSettingsControlOptions>tabContentOptions,
            dependentOn: [Agile.TabControlsRegistrationConstants.SWIMLANES_TAB_ID],
            order: 10
        });
    }

    function registerSwimlaneSettingsTab(tabContentOptions: BoardsSettingsControls.IBoardSettingTabOptions) {
        Configurations.TabControlsRegistration.registerTab({
            groupId: Agile.TabControlsRegistrationConstants.BOARDS_GROUP_ID,
            id: Agile.TabControlsRegistrationConstants.SWIMLANES_TAB_ID,
            title: AgileControlsResources.Board_Settings_Swimlanes,
            tabContent: BoardsSettingsControls.SwimlaneSettingsControl,
            tabContentOptions: <BoardsSettingsControls.ISwimlaneSettingsControlOptions>tabContentOptions,
            order: 20
        });
    }

    function registerCardReorderingTab(tabContentOptions: any) {
        if (tabContentOptions.boardSettings && typeof tabContentOptions.boardSettings.cardReorderingFeatureEnabled === "boolean" && tabContentOptions.boardSettings.cardReorderingFeatureEnabled) {
            Configurations.TabControlsRegistration.registerTab({
                groupId: Agile.TabControlsRegistrationConstants.BOARDS_GROUP_ID,
                id: Agile.TabControlsRegistrationConstants.KANBAN_DRAG_BEHAVIOR_ID,
                title: AgileControlsResources.Board_Settings_Card_Reordering,
                tabContent: BoardsSettingsControls.CardReorderingTabContent,
                tabContentOptions: tabContentOptions,
                order: 30
            });
        }
    }

    function registerCFDSettingsTab(tabContentOptions: BoardsSettingsControls.IBoardSettingTabOptions) {
        var cfdChartControl = <AgileControls.CumulativeFlowChartControl>Controls.Enhancement.getInstance(AgileControls.CumulativeFlowChartControl, $(".cumulative-flow-chart"));

        Configurations.TabControlsRegistration.registerTab({
            groupId: Agile.TabControlsRegistrationConstants.CHARTS_GROUP_ID,
            id: Agile.TabControlsRegistrationConstants.CFD_TAB_ID,
            title: AgileControlsResources.Charts_Settings_Cfd_Title,
            tabContent: AgileControls.CumulativeFlowSettingsControl,
            tabContentOptions: <AgileControls.ICumulativeFlowSettingsControl>
                {
                    boardIdentity: tabContentOptions.boardIdentity,
                    isEditable: tabContentOptions.isEditable,
                    cfdChartControl: cfdChartControl,
                    teamId: tabContentOptions.team.id
                }
        });
    }
}
