// <copyright file="TFS.QuickStart.CodeSearchPromotion.js" company="Microsoft">
// Copyright (c) 2016 All Rights Reserved, http://microsoft.com/
// All other rights reserved.
// </copyright>
// <summary>Implementation of Search Promotion Quick Start, which prompts the user to install code search extension</summary>

import FSM = require("Engagement/QuickStart/FSM");
import QS = require("Engagement/QuickStart/Core");
import QS_UI = require("Engagement/QuickStart/UI");
import QS_States = require("Engagement/QuickStart/States");
import QS_Models = require("Engagement/QuickStart/StateModels");
import QS_Actions = require("Engagement/QuickStart/Actions");
import QS_Conditions = require("Engagement/QuickStart/Conditions");
import EngagementInteraction = require("Engagement/Interaction/Interaction");
import PresentationResources = require("Presentation/Scripts/TFS/Resources/TFS.Resources.Presentation");

export interface ICodeSearchPromotionQuickStartPageContext {
    getMarketPlaceIcon(): JQuery;
}

export class CodeSearchPromotionQuickStartPageContext implements ICodeSearchPromotionQuickStartPageContext {

    public getMarketPlaceIcon(): JQuery {
        return $(".bowtie-shop");
    }
}

/**
 * A QuickStart to prompt the users to install code search extension
 */
export class CodeSearchPromotionQuickStartModel implements QS.QuickStartModel {
    public static Id: string = "CodeSearchPromotion";

    public id: string;
    public states: QS.QuickStartStateModel[];
    public externalEventBinders: QS.IEventBinder[];

    private static codeSearchForwardLink: string = "https://go.microsoft.com/fwlink/?LinkId=698628";

    // Step Id's
    private static WELCOME = "search-promotion-welcome";
    private static CHECK_SHOW_CONDITIONS = "search-promotion-check-show-conditions";
    private static INSTALL_CODE_SEARCH_LINK = "search-promotion-install-code-search-link";
    private static END = "search-promotion-end";

    private _pageContext: ICodeSearchPromotionQuickStartPageContext;

    constructor(pageContext: ICodeSearchPromotionQuickStartPageContext) {
        this._pageContext = pageContext;

        this.id = CodeSearchPromotionQuickStartModel.Id;
        this.states = this._getStateModels();
    }

    private _getStateModels(): QS.QuickStartStateModel[] {
        return [
            <QS_Models.ConditionStateModel>{
                id: CodeSearchPromotionQuickStartModel.CHECK_SHOW_CONDITIONS,
                type: QS_States.ConditionalState,
                condition: {
                    condition: QS_Conditions.or,
                    args: [
                        QS_Conditions.checkForceShow,
                        {
                            condition: QS_Conditions.abTest,
                            args: {
                                abSplitValue: 0
                            }
                        }
                    ]
                },
                transitions: [
                    {
                        event: QS_States.ConditionalState.TRUE_EVENT,
                        state: CodeSearchPromotionQuickStartModel.WELCOME
                    },
                ]
            },
            <QS_Models.UIStateModel>{
                id: CodeSearchPromotionQuickStartModel.WELCOME,
                type: QS_States.UIState,
                uiType: QS_UI.Bubble,
                uiModel: <QS_UI.BubbleModel>{
                    title: PresentationResources.CodeSearchPromotionQuickStartTitle,
                    content: PresentationResources.CodeSearchPromotionQuickStartContent,
                    buttons: QS_UI.QuickStartControlButtons.OK | QS_UI.QuickStartControlButtons.Cancel,
                    okButtonText: PresentationResources.CodeSearchPromotionQuickStartOkButtonContent,
                    cancelButtonText: PresentationResources.CodeSearchPromotionQuickStartCancelButtonContent,
                    position: QS_UI.BubblePosition.BOTTOM,
                    alignment: QS_UI.BubbleAlignment.CENTER,
                    calloutAlignment: QS_UI.BubbleAlignment.CENTER,
                    calloutOffset: 0,
                    css: { "margin-right": "16px" },
                    container: $(document.body),
                    target: () => this._pageContext.getMarketPlaceIcon(),
                },
                exitActions: [
                    EngagementInteraction.logInteractionQuickStartAction,
                ],
                transitions: [
                    {
                        event: QS_UI.Bubble.OkActionId,
                        state: CodeSearchPromotionQuickStartModel.INSTALL_CODE_SEARCH_LINK
                    },
                    {
                        event: QS_UI.Bubble.CloseActionId,
                        state: CodeSearchPromotionQuickStartModel.END
                    },
                ]
            },
            {
                id: CodeSearchPromotionQuickStartModel.INSTALL_CODE_SEARCH_LINK,
                entryActions: [
                    <FSM.Action>{
                        action: QS_Actions.redirection,
                        args: <QS_Actions.RedirectionArgs>{
                            url: CodeSearchPromotionQuickStartModel.codeSearchForwardLink
                        }
                    },
                ],
            },
            {   // A sink state so that the bubble can close properly
                id: CodeSearchPromotionQuickStartModel.END,
            },
        ]
    }
}