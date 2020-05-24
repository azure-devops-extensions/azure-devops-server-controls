
import Engagement_Interaction = require("Engagement/Interaction/Interaction");
import FSM = require("Engagement/QuickStart/FSM");
import QS = require("Engagement/QuickStart/Core");
import QS_Actions = require("Engagement/QuickStart/Actions");
import QS_Models = require("Engagement/QuickStart/StateModels");
import QS_States = require("Engagement/QuickStart/States");
import QS_UI = require("Engagement/QuickStart/UI");

import PresentationResources = require("Presentation/Scripts/TFS/Resources/TFS.Resources.Presentation");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");

import Navigation_Services = require("VSS/Navigation/Services");
import Utils_Core = require("VSS/Utils/Core");
import VSS_Context = require("VSS/Context");
import VSS_Locations = require("VSS/Locations");


let delegate = Utils_Core.delegate;
let tfsContext = TFS_Host_TfsContext.TfsContext.getDefault();

function getResourcesFile(filename: string): string {
    return VSS_Context.getPageContext().webAccessConfiguration.paths.resourcesPath + encodeURIComponent(filename);
}

export class QuickStartTestHubModel implements QS.QuickStartModel {
    public static Id = "TestManagement";
    public id = QuickStartTestHubModel.Id;
    public states: QS.QuickStartStateModel[] = [];
    public externalEventBinders: QS.IEventBinder[] = [];

    /* State IDs */
    private static QUICKSTART_TEST_HUB_DIALOG = "test-hub-dialog";
    private static GOTO_MANUAL_TESTING = "test-hub-page";
    private static GOTO_AUTOMATE_TESTING = "build-hub-page";
    private static GOTO_LOAD_TESTING = "load-test-page";
    private static DISABLE_QUICKSTART_TEST_HUB = "quickstart-disable";
    private static STOP_STATE = "quickstart-stop";
   
    /* Event IDs */
    public static GOTO_MANUAL_TEST_EVENT = "test-hub-go-to-manual-testing";
    public static GOTO_AUTOMATE_TEST_EVENT = "test-hub-go-to-automate-testing";
    public static GOTO_LOAD_TEST_EVENT = "test-hub-go-to-load-testing";

    private static QUICKSTART_TEST_HUB_CSS_CLASS = "jumpstart";
   
    constructor() {
        this.states = this.getStates();
    }

    public getDialogContent(): string {
     
        return [
            "<p>" + PresentationResources.TestHubContentWelcome + "</p>",
            "<div class=\"quickstart-test-hub-columns-container\">",
            "<div class=\"quickstart-test-hub-content-column\">",
            "<div class=\"quickstart-test-hub-image-container\">",
            "<img src=\"" + getResourcesFile("manual-test.png") + "\">",
            "</div>",
            "<div class=\"quickstart-test-hub-column-content\">",
            "<p>" + PresentationResources.TestHubManualTestContent + "</p>",
            "</div>",
            "<div class=\"quickstart-test-hub-button-container\">",
            "<button class=\"quickstart-action primary\" action-id=\"" + QuickStartTestHubModel.GOTO_MANUAL_TEST_EVENT + "\" id=\"manual-test-button\" tabindex=\"1\">" + PresentationResources.ManualTestButtonText + "</button>",
            "</div>",
            "</div>",
            "<div class=\"quickstart-test-hub-content-column\">",
            "<div class=\"quickstart-test-hub-image-container\">",
            "<img src=\"" + getResourcesFile("automated-test.png") + "\">",
            "</div>",
            "<div class=\"quickstart-test-hub-column-content\">",
            "<p>" + PresentationResources.TestHubAutomateTestContent + "</p>",
            "</div>",
            "<div class=\"quickstart-test-hub-button-container quickstart-automated-test-button\">",
            "<button class=\"quickstart-action primary\" action-id=\"" + QuickStartTestHubModel.GOTO_AUTOMATE_TEST_EVENT + "\" id=\"automated-test-button\" tabindex=\"2\">" + PresentationResources.AutomateTestButtonText + "</button>",
            "</div>",
            "</div>",
            "<div class=\"quickstart-test-hub-content-column\">",
            "<div class=\"quickstart-test-hub-image-container\">",
            "<img src=\"" + getResourcesFile("load-test.png") + "\">",
            "</div>",
            "<div class=\"quickstart-test-hub-column-content\">",
            "<p>" + PresentationResources.TestHubLoadTestContent + "</p>",
            "</div>",
            "<div class=\"quickstart-test-hub-button-container\">",
            "<button class=\"quickstart-action primary\" action-id=\"" + QuickStartTestHubModel.GOTO_LOAD_TEST_EVENT + "\" id=\"load-test-button\" tabindex=\"3\">" + PresentationResources.LoadTestButtonText + "</button>",
            "</div>",
            "</div>",
            "</div>",
        ].join("");
    }

    public getStates(): QS.QuickStartStateModel[] {
        let dialogTransitions = [
            {
                event: QuickStartTestHubModel.GOTO_MANUAL_TEST_EVENT,
                state: QuickStartTestHubModel.GOTO_MANUAL_TESTING
            },
            {
                event: QuickStartTestHubModel.GOTO_AUTOMATE_TEST_EVENT,
                state: QuickStartTestHubModel.GOTO_AUTOMATE_TESTING
            },
            {
                event: QuickStartTestHubModel.GOTO_LOAD_TEST_EVENT,
                state: QuickStartTestHubModel.GOTO_LOAD_TESTING
            },
            {
                event: QS_UI.QuickStartControl.CloseActionId,
                state: QuickStartTestHubModel.DISABLE_QUICKSTART_TEST_HUB
            },
        ];

        return [
            <QS_Models.UIStateModel>{
                type: QS_States.UIState,
                id: QuickStartTestHubModel.QUICKSTART_TEST_HUB_DIALOG,
     
                transitions: dialogTransitions,
                uiType: QS_UI.Dialog,
                uiModel: <QS_UI.DialogModel>{
                    title: PresentationResources.TestHubContentTitle,
                    content: this.getDialogContent(),
                    cssClass: QuickStartTestHubModel.QUICKSTART_TEST_HUB_CSS_CLASS,
                }
            },
            <QS.QuickStartStateModel>{
                id: QuickStartTestHubModel.GOTO_MANUAL_TESTING,
                entryActions: [
                    Engagement_Interaction.logInteractionQuickStartAction,
                ],
                transitions: [
                    {
                        event: FSM.State.STATE_READY,
                        state: QuickStartTestHubModel.STOP_STATE,
                    },
                ]
            },
            <QS.QuickStartStateModel>{
                id: QuickStartTestHubModel.GOTO_AUTOMATE_TESTING,
                entryActions: [
                    Engagement_Interaction.logInteractionQuickStartAction,
                ],
                transitions: [
                    {
                        event: FSM.State.STATE_READY,
                        state: QuickStartTestHubModel.STOP_STATE,
                    },
                ],
                exitActions: [
                    <FSM.Action>{
                        action: QS_Actions.redirection,
                        args: <QS_Actions.RedirectionArgs>{
                            url: tfsContext.getActionUrl(null, null, {
                                project: tfsContext.navigation.project, area: "build"
                            }) + Navigation_Services.getHistoryService().getFragmentActionLink("simple-process", { "newBuildDefn": 1 })
                        }
                    },                    
                ]
            },
            <QS.QuickStartStateModel>{
                id: QuickStartTestHubModel.GOTO_LOAD_TESTING,
                entryActions: [
                    Engagement_Interaction.logInteractionQuickStartAction,
                ],
                transitions: [
                    {
                        event: FSM.State.STATE_READY,
                        state: QuickStartTestHubModel.STOP_STATE,
                    },
                ],
                exitActions: [
                    <FSM.Action>{
                        action: QS_Actions.redirection,
                        args: <QS_Actions.RedirectionArgs>{
                            url: VSS_Locations.urlHelper.getMvcUrl({ action: "", controller: "apps/hub/ms.vss-cloudloadtest-web.hub-loadtest-test" })
                        }
                    },                    
                ]
            },
            <QS.QuickStartStateModel>{
                id: QuickStartTestHubModel.DISABLE_QUICKSTART_TEST_HUB,
                entryActions: [
                    Engagement_Interaction.logInteractionQuickStartAction,
                ],
            },
            <QS.QuickStartStateModel>{
                id: QuickStartTestHubModel.STOP_STATE,
            }
        ];
    }
}
