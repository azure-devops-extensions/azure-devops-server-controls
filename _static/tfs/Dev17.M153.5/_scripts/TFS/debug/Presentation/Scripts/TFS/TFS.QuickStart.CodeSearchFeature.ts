// <copyright file="TFS.QuickStart.CodeSearch.js" company="Microsoft">
// Copyright (c) 2016 All Rights Reserved, http://microsoft.com/
// All other rights reserved.
// </copyright>
// <summary>Implementation of Search Promotion Quick Start, which prompts the user to use code search</summary>

import FSM = require("Engagement/QuickStart/FSM");
import QS = require("Engagement/QuickStart/Core");
import QS_UI = require("Engagement/QuickStart/UI");
import QS_States = require("Engagement/QuickStart/States");
import QS_Models = require("Engagement/QuickStart/StateModels");
import QS_Actions = require("Engagement/QuickStart/Actions");
import QS_Conditions = require("Engagement/QuickStart/Conditions");
import EngagementInteraction = require("Engagement/Interaction/Interaction");
import PresentationResources = require("Presentation/Scripts/TFS/Resources/TFS.Resources.Presentation");

export interface ICodeSearchFeatureQuickStartPageContext {
    /**
     * Gets the L1 search box for code
     */
    getL1CodeSearchBox(): JQuery;

    /**
     * Gets the input element of search box for code
     */
    getSearchText(): JQuery;

    /**
     * Checks if L1 search box for code is shown or not
     */
    isL1SearchBoxShown(): boolean;
}

export class CodeSearchFeatureQuickStartPageContext implements ICodeSearchFeatureQuickStartPageContext {
    /**
     * Gets the L1 search box for code
     */
    public getL1CodeSearchBox(): JQuery {
        return $(".global-search-adapter");
    }

    /**
     * Gets the input element of search box for code
     */
    public getSearchText(): JQuery {
        return $(".global-search-adapter .search-text");
    }

    /**
     * Checks if L1 search box for code is shown or not
     */
    public isL1SearchBoxShown(): boolean {
        return ($(".code-search-unavailable").length === 0
            && this.getL1CodeSearchBox().length) ? true : false;
    }
}

/**
 * A QuickStart to prompt the users to use code search
 */
export class CodeSearchFeatureQuickStartModel implements QS.QuickStartModel {
    public static Id: string = "CodeSearchFeature";

    public id: string;
    public states: QS.QuickStartStateModel[];
    public externalEventBinders: QS.IEventBinder[];

    // Step Id's
    private static WELCOME = "code-search-feature-welcome";
    private static WAIT_FOR_L1_SEARCH_BOX = "code-search-feature-wait-for-l1-search-box";
    private static END = "code-search-feature-end";

    // Event Id's
    private static L1_SEARCH_BOX_CLICKED_EVENT = "l1-search-box-clicked-event";

    private _pageContext: ICodeSearchFeatureQuickStartPageContext;

    constructor(pageContext: ICodeSearchFeatureQuickStartPageContext) {
        this._pageContext = pageContext;

        this.id = CodeSearchFeatureQuickStartModel.Id;
        this.states = this._getStateModels();
        this.externalEventBinders = this._getUIEvents();
    }

    private _getUIEvents() {
        return [
            new QS.UIEventBinder(CodeSearchFeatureQuickStartModel.L1_SEARCH_BOX_CLICKED_EVENT, this._pageContext.getSearchText(), "click"),
        ];
    }

    private _getStateModels(): QS.QuickStartStateModel[] {
        return [
            {
                id: CodeSearchFeatureQuickStartModel.WAIT_FOR_L1_SEARCH_BOX,
                entryActions: [
                    {
                        action: QS_Actions.waitFor,
                        args: <QS_Actions.WaitForArgs>{
                            condition: () => this._pageContext.isL1SearchBoxShown(),
                            checkInterval: 200,
                        },
                    }
                ],
                transitions: [
                    {
                        event: FSM.State.STATE_READY,
                        state: CodeSearchFeatureQuickStartModel.WELCOME
                    },
                ]
            },
            <QS_Models.UIStateModel>{
                id: CodeSearchFeatureQuickStartModel.WELCOME,
                type: QS_States.UIState,
                uiType: QS_UI.Bubble,
                uiModel: <QS_UI.BubbleModel>{
                    title: PresentationResources.CodeSearchQuickStartTitle,
                    content: PresentationResources.CodeSearchQuickStartContent,
                    position: QS_UI.BubblePosition.BOTTOM,
                    alignment: QS_UI.BubbleAlignment.LEFT,
                    calloutAlignment: QS_UI.BubbleAlignment.LEFT,
                    calloutOffset: 0,
                    css: { "margin-right": "20px" },
                    container: $(document.body),
                    target: () => this._pageContext.getL1CodeSearchBox(),
                },
                transitions: [
                    {
                        event: CodeSearchFeatureQuickStartModel.L1_SEARCH_BOX_CLICKED_EVENT,
                        state: CodeSearchFeatureQuickStartModel.END
                    },
                    {
                        event: QS_UI.Bubble.CloseActionId,
                        state: CodeSearchFeatureQuickStartModel.END
                    },
                ]
            },
            {   // A sink state so that the bubble can close properly
                id: CodeSearchFeatureQuickStartModel.END,
                entryActions: [
                    EngagementInteraction.logInteractionQuickStartAction,
                ],
            },
        ]
    }
}