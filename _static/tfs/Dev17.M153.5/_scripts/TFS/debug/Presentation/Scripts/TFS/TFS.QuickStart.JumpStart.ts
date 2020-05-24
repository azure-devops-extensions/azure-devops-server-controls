import Utils_String = require("VSS/Utils/String");
import FSM = require("Engagement/QuickStart/FSM");
import QS = require("Engagement/QuickStart/Core");
import QS_Constants = require("Engagement/QuickStart/Constants");
import QS_UI = require("Engagement/QuickStart/UI");
import QS_Utils = require("Engagement/QuickStart/Utils");
import QS_States = require("Engagement/QuickStart/States");
import QS_Models = require("Engagement/QuickStart/StateModels");
import QS_Actions = require("Engagement/QuickStart/Actions");
import QS_Conditions = require("Engagement/QuickStart/Conditions");
import Engagement_Interaction = require("Engagement/Interaction/Interaction");
import PresentationResources = require("Presentation/Scripts/TFS/Resources/TFS.Resources.Presentation");
import VSS_Locations = require("VSS/Locations");
import VSS_Context = require("VSS/Context");

function getResourcesFile(filename: string): string {
    return VSS_Context.getPageContext().webAccessConfiguration.paths.resourcesPath + encodeURIComponent(filename);
}

export class JumpStartModel implements QS.QuickStartModel {
    public static Id = "JumpStart";
    public id = JumpStartModel.Id;
    public states: QS.QuickStartStateModel[] = [];
    public externalEventBinders: QS.IEventBinder[] = [];

    /* Step IDs */
    private static JUMPSTART_DIALOG = "jumpstart-dialog";
    private static GOTO_BOARD = 'jumpstart-backlog-page';
    private static GOTO_CODE = 'jumpstart-version-control-page';
    private static CLOSE_DIALOG = 'jumpstart-fire-event';

    /* Event IDs */
    public static GOTO_BOARD_EVENT = 'jumpstart-go-to-backlog';
    public static GOTO_CODE_EVENT = 'jumpstart-go-to-code';

    private static JUMPSTART_CSS_CLASS = "jumpstart";

    private _projectName: string;

    constructor(projectName: string) {
        this._projectName = projectName;
        this.states = this.getStates();
    }

    public getDialogContent(projectName: string, projectEmpty: boolean = true): string {
        var gotoCodeButtonText = projectEmpty ? PresentationResources.JumpstartGotoCode : PresentationResources.JumpstartViewCode;
        return [
            '<p>' + Utils_String.format(PresentationResources.JumpstartContentWelcome, QS_UI.ContentUtils.strong(projectName)) + '</p>',
            '<div class="jumpstart-columns-container">',
                '<div class="jumpstart-content-column">',
                    '<div class="jumpstart-image-container">',
                        '<img src="' + getResourcesFile('jumpstart-agile.png') + '">',
                    '</div>',
                    '<div class="jumpstart-column-content">',
                        '<p>' + PresentationResources.JumpstartContentAgile + '</p>',
                    '</div>',
                    '<div class="jumpstart-button-container">',
                        '<button class="quickstart-action primary" action-id="' + JumpStartModel.GOTO_BOARD_EVENT + '" id="go-to-backlog-button" tabindex="0">' + PresentationResources.JumpstartGotoBacklog + '</button>',
                    '</div>',
                '</div>',
                '<div class="jumpstart-content-column">',
                    '<div class="jumpstart-image-container">',
                        '<img src="' + getResourcesFile('jumpstart-code.png') + '">',
                    '</div>',
                    '<div class="jumpstart-column-content">',
                        '<p>' + PresentationResources.JumpstartContentCode + '</p>',
                    '</div>',
                    '<div class="jumpstart-button-container">',
                        '<button class="quickstart-action primary" action-id="' + JumpStartModel.GOTO_CODE_EVENT + '" id="go-to-code-button" tabindex="0">' + gotoCodeButtonText + '</button>',
                    '</div>',
                '</div>',
            '</div>',
        ].join('');
    }

    public getStates(): QS.QuickStartStateModel[] {
        return [
            <QS_Models.UIStateModel>{
                type: QS_States.UIState,
                id: JumpStartModel.JUMPSTART_DIALOG,
                exitActions: [Engagement_Interaction.logInteractionQuickStartAction],
                transitions: [
                    {
                        event: JumpStartModel.GOTO_BOARD_EVENT,
                        state: JumpStartModel.GOTO_BOARD
                    },
                    {
                        event: JumpStartModel.GOTO_CODE_EVENT,
                        state: JumpStartModel.GOTO_CODE
                    },
                    {
                        event: QS_UI.QuickStartControl.CloseActionId,
                        state: JumpStartModel.CLOSE_DIALOG
                    },
                ],
                uiType: QS_UI.Dialog,
                uiModel: <QS_UI.DialogModel>{
                    title: PresentationResources.JumpstartTitle,
                    content: this.getDialogContent(this._projectName),
                    cssClass: JumpStartModel.JUMPSTART_CSS_CLASS,
                    showCloseButton: true
                },
            },
            <QS.QuickStartStateModel>{
                id: JumpStartModel.GOTO_BOARD,
                entryActions: [
                    <FSM.Action>{
                        action: QS_Actions.redirection,
                        args: <QS_Actions.RedirectionArgs>{
                            url: QS_Utils.getActionUrlForQuickStart("board", "backlogs", "Kanban")
                        }
                    },
                ],
            },
            <QS.QuickStartStateModel>{
                id: JumpStartModel.GOTO_CODE,
                entryActions: [
                    <FSM.Action>{
                        action: QS_Actions.redirection,
                        args: <QS_Actions.RedirectionArgs>{
                            url: VSS_Locations.urlHelper.getMvcUrl({ action: "", controller: "versioncontrol" })
                        }
                    },
                ],
            },
            <QS.QuickStartStateModel>{
                id: JumpStartModel.CLOSE_DIALOG,
            }
        ];
    }
}