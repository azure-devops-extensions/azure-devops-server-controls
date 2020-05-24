
import FSM = require("Engagement/QuickStart/FSM");
import QS = require("Engagement/QuickStart/Core");
import QS_Actions = require("Engagement/QuickStart/Actions");
import QS_UI = require("Engagement/QuickStart/UI");
import QS_Models = require("Engagement/QuickStart/StateModels");
import QS_States = require("Engagement/QuickStart/States");

import Resources = require("TestManagement/Scripts/Resources/TFS.Resources.TestManagement");
import TM_Utils = require("TestManagement/Scripts/TFS.TestManagement.Utils");
import Engagement_PageContexts = require("TestManagement/Scripts/TFS.TestManagement.Engagement.PageContexts");
import Engagement_Interaction = require("Engagement/Interaction/Interaction");

import Utils_String = require("VSS/Utils/String");

/**
 * A QuickStart to prompt user to link requirements to test methods
 */
export class TraceabilityQuickStartModel implements QS.QuickStartModel {

    constructor(pageContext: Engagement_PageContexts.ITraceabilityQuickStartPageContext) {    
        this._pageContext = pageContext;
        this.id = TraceabilityQuickStartModel.Id;
        this.states = this._getStateModels();
    }

    private _getStateModels(): QS.QuickStartStateModel[] {
        return [
            {
                id: TraceabilityQuickStartModel.START,
                type: QS_States.UIState,
                uiType: QS_UI.Bubble,
                uiModel: <QS_UI.BubbleModel>{
                    title: Resources.LinkRequirementStartTitle,
                    content: this._getContent(),
                    buttons: QS_UI.QuickStartControlButtons.OK,
                    okButtonText: Resources.LearnMoreText,
                    position: QS_UI.BubblePosition.RIGHT,
                    calloutOffset: 0,
                    cssClass: "quickstart-traceability",
                    container: this._pageContext.getTestResultsDetailContainer(),
                    target: () => this._pageContext.getAddLinkIcon(),
                },
                exitActions: [
                    Engagement_Interaction.logInteractionQuickStartAction,
                ],
                transitions: [
                    {
                        event: QS_UI.Bubble.OkActionId,
                        state: TraceabilityQuickStartModel.LEARN_MORE
                    },
                    {
                        event: QS_UI.Bubble.CloseActionId,
                        state: TraceabilityQuickStartModel.END
                    },
                ]
            } as QS_Models.UIStateModel,
            {
                id: TraceabilityQuickStartModel.LEARN_MORE,
                entryActions: [
                    <FSM.Action>{
                        action: QS_Actions.openLink,
                        args: <QS_Actions.OpenLinkArgs>{
                            url: TraceabilityQuickStartModel.traceabilityForwardLink
                        }
                    }
                ]
            },
            {   // A sink state so that the bubble can close properly
                id: TraceabilityQuickStartModel.END
            },
        ];
    }

    private _getContent(): string {
        return Utils_String.format(this._getLayout(), Resources.LinkRequirementPromotionText, TM_Utils.getResourcesFile("dashboard-traceability.png"));
    }

    private _getLayout(): string {  
        let layout: string = `<div class='tr-traceability-recommendation' >
                                 <div class='link-requirement-promotion-content'>
                                     <p> {0} </p>
                                 </div>
                                 <div class="quickstart-traceability-image-container">
                                 <img src= {1} >
                                 </div>
                               </div>`;
        return layout;
    }

    public static Id: string = "TraceabilityQuickStart";
    public static START: string = "traceability-promotion-start";
    public id: string;
    public states: QS.QuickStartStateModel[];
    public externalEventBinders: QS.IEventBinder[];
    private static traceabilityForwardLink: string = "https://go.microsoft.com/fwlink/?linkid=827880";
    // Step Id's
    private static END = "traceability-promotion-end";
    private static LEARN_MORE = "traceability-learn-more";
    private _pageContext: Engagement_PageContexts.ITraceabilityQuickStartPageContext;
   
}
