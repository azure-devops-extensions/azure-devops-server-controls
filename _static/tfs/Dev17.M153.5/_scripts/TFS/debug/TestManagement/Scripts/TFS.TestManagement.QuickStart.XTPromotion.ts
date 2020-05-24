// <copyright file="TFS.TestManagement.QuickStart.XTPromotion.js" company="Microsoft">
// Copyright (c) 2016 All Rights Reserved, http://microsoft.com/
// All other rights reserved.
// </copyright>
// <summary>Implementation of XT Promotion Quick Start, which prompts the user to install xt extension</summary>

import FSM = require("Engagement/QuickStart/FSM");
import QS = require("Engagement/QuickStart/Core");
import QS_UI = require("Engagement/QuickStart/UI");
import QS_States = require("Engagement/QuickStart/States");
import QS_Models = require("Engagement/QuickStart/StateModels");
import QS_Actions = require("Engagement/QuickStart/Actions");
import QS_Conditions = require("Engagement/QuickStart/Conditions");
import Engagement_Interaction = require("Engagement/Interaction/Interaction");
import Engagement_PageContexts = require("TestManagement/Scripts/TFS.TestManagement.Engagement.PageContexts");
import PresentationResources = require("Presentation/Scripts/TFS/Resources/TFS.Resources.Presentation");

/**
 * A QuickStart to prompt the users to install xt extension
 */
export class XTPromotionQuickStartModel implements QS.QuickStartModel {
    constructor(pageContext: Engagement_PageContexts.IXTPromotionQuickStartPageContext) {
        this._pageContext = pageContext;

        this.id = XTPromotionQuickStartModel.Id;
        this.states = this._getStateModels();
    }

    private _getStateModels(): QS.QuickStartStateModel[] {
        return [
            <QS_Models.ConditionStateModel>{
                id: XTPromotionQuickStartModel.CHECK_SHOW_CONDITIONS,
                type: QS_States.ConditionalState,
                condition: {
                    condition: QS_Conditions.or,
                    args: [
                        QS_Conditions.checkForceShow,
                        {
                            condition: QS_Conditions.abTest,
                            args: {
                                abSplitValue: 0.67
                            }
                        }
                    ]
                },
                transitions: [
                    {
                        event: QS_States.ConditionalState.TRUE_EVENT,
                        state: XTPromotionQuickStartModel.WELCOME
                    },
                ]
            },
            <QS_Models.UIStateModel>{
                id: XTPromotionQuickStartModel.WELCOME,
                type: QS_States.UIState,
                uiType: QS_UI.Bubble,
                uiModel: <QS_UI.BubbleModel>{
                    title: PresentationResources.XTPromotionQuickStartTitle,
                    content: PresentationResources.XTPromotionQuickStartContent,
                    buttons: QS_UI.QuickStartControlButtons.OK | QS_UI.QuickStartControlButtons.Cancel,
                    okButtonText: PresentationResources.XTPromotionQuickStartOkButtonContent,
                    cancelButtonText: PresentationResources.XTPromotionQuickStartCancelButtonContent,
                    position: QS_UI.BubblePosition.BOTTOM,
                    alignment: QS_UI.BubbleAlignment.CENTER,
                    calloutAlignment: QS_UI.BubbleAlignment.CENTER,
                    calloutOffset: 0,
                    css: { "margin-right": "16px" },
                    container: $(document.body),
                    target: () => this._pageContext.getMarketPlaceIcon(),
                },
                exitActions: [
                    Engagement_Interaction.logInteractionQuickStartAction,
                ],
                transitions: [
                    {
                        event: QS_UI.Bubble.OkActionId,
                        state: XTPromotionQuickStartModel.INSTALL_XT_LINK
                    },
                    {
                        event: QS_UI.Bubble.CloseActionId,
                        state: XTPromotionQuickStartModel.END
                    },
                ]
            } as QS_Models.UIStateModel,
            {
                id: XTPromotionQuickStartModel.INSTALL_XT_LINK,
                entryActions: [
                    <FSM.Action>{
                        action: QS_Actions.openLink,
                        args: <QS_Actions.OpenLinkArgs>{
                            url: XTPromotionQuickStartModel.xtForwardLink
                        }
                    }
                ]
            },
            {   // A sink state so that the bubble can close properly
                id: XTPromotionQuickStartModel.END
            }
        ];
    }

    public static Id: string = "XTPromotion";
    public id: string;
    public states: QS.QuickStartStateModel[];
    public externalEventBinders: QS.IEventBinder[];
    private static xtForwardLink: string = "https://aka.ms/xtlearn";
    // Step Id's
    private static WELCOME = "xt-promotion-welcome";
    private static CHECK_SHOW_CONDITIONS = "xt-promotion-check-show-conditions";
    private static INSTALL_XT_LINK = "xt-promotion-install-xt-link";
    private static END = "xt-promotion-end";
    private _pageContext: Engagement_PageContexts.IXTPromotionQuickStartPageContext;
}
