// <copyright file="TFS.Search.FileViewerCapabilities.QuickStart.js" company="Microsoft">
// Copyright (c) 2016 All Rights Reserved, http://microsoft.com/
// All other rights reserved.
// </copyright>
// <summary>Implementation of Search Quick Start, which helps a user find different features of File viewer of Code Search</summary>

import Utils_String = require("VSS/Utils/String");
import VSS_Locations = require("VSS/Locations");

import FSM = require("Engagement/QuickStart/FSM");
import QS = require("Engagement/QuickStart/Core");
import QS_UI = require("Engagement/QuickStart/UI");
import QS_States = require("Engagement/QuickStart/States");
import QS_Models = require("Engagement/QuickStart/StateModels");
import QS_Actions = require("Engagement/QuickStart/Actions");
import QS_Conditions = require("Engagement/QuickStart/Conditions");
import QS_Constants = require("Engagement/QuickStart/Constants");
import QS_Utils = require("Engagement/QuickStart/Utils");
import Engagement_Interaction = require("Engagement/Interaction/Interaction");
import Events_Services = require("VSS/Events/Services");
import Search_Resources = require("Search/Scripts/Resources/TFS.Resources.Search");

var eventSvc = Events_Services.getService();

export interface ISearchQuickStartPageContext {
    /**
     * Gets the Annotations block
     */
    getAnnotationsBlock(): JQuery;

    /**
     * Gets the File Name
     */
    getFileName(): JQuery;

    /**
     * Checks if the Annotations block is shown or not
     */
    isAnnotationsShown(): boolean;

    /**
     * Checks if the file Name is shown or not
     */
    isFileNameShown(): boolean;
}

export class SearchQuickStartPageContext implements ISearchQuickStartPageContext {

    /**
     * Gets the Annotations block
     */
    public getAnnotationsBlock(): JQuery {
        return $(".bowtie-comment-urgent");
    }

    /**
     * Gets the File Name
     */
    public getFileName(): JQuery {
        return $("#fileName");
    }
    /**
     * Checks if the Annotations block is shown or not
     */
    public isAnnotationsShown(): boolean {
        return this.getAnnotationsBlock().length ? true : false;
    }

    /**
     * Checks if the file Name is shown or not
     */
    public isFileNameShown(): boolean {
        return this.getFileName().length ? true : false;
    }
}

/**
 * A QuickStart to navigate users through code search features
 */
export class SearchQuickStartModel implements QS.QuickStartModel {
    public static Id: string = "CodeSearchFileViewerCapabilities";

    public id: string;
    public states: QS.QuickStartStateModel[];
    public externalEventBinders: QS.IEventBinder[];

    // Step Id's
    private static WAIT_FOR_ANNOTATIONS = "code-search-file-viewer-capabilities-wait-for-annotations";
    private static SHOW_ANNOTATIONS = "code-search-file-viewer-capabilities-show-annotations";
    private static WAIT_FOR_UPARROW = "code-search-file-viewer-capabilities-wait-for-uparrow";
    private static SHOW_UPARROW = "code-search-file-viewer-capabilities-show-uparrow";
    private static WAIT_FOR_CONTEXT_MENU = "code-search-file-viewer-capabilities-wait-for-context-menu";
    private static SHOW_CONTEXT_MENU = "code-search-file-viewer-capabilities-show-context-menu";
    private static WAIT_FOR_FILE_NAME = "code-search-file-viewer-capabilities-wait-for-file-name";
    private static SHOW_FILE_NAME = "code-search-file-viewer-capabilities-show-file-name";
    private static END = "code-search-file-viewer-capabilities-end";

    // Event Id's
    private static EXECUTE_SEARCH_EVENT = "execute-search";

    private _executeSearchEventHandler: IEventHandler;

    private _pageContext: ISearchQuickStartPageContext;

    constructor(pageContext: ISearchQuickStartPageContext) {
        this._pageContext = pageContext;

        this.id = SearchQuickStartModel.Id;
        this.states = this._getStateModels();
        this.externalEventBinders = this._getUIEvents();
    }

    /**
     * Binds the "execute search" event, which is fired when a query is fired through any of the ways
     * (like filter selection or right click search etc i.e. whenever executeSearch function gets executed)
     * to fire the internal quickStart event on which the transitions are defined on the states so that 
     * whichever is the present state a transition is made to the previous state (where it is defined to wait for the bubble to be shown).
     *
     * This is done to redraw the bubble (whichever is being shown at that point of time)
     * when the user does a re-search which would redraw the results grid and preview pane
     * without cancelling the quickStart
     */
    private _getUIEvents() {
        return [
            <QS.IEventBinder>{
                id: SearchQuickStartModel.EXECUTE_SEARCH_EVENT,
                bind: (fire: QS.FireDelegate) => {
                    this._executeSearchEventHandler = () => {
                        fire();
                    };
                    eventSvc.attachEvent("execute-search-box", this._executeSearchEventHandler);
                },
                unbind: () => {
                    eventSvc.detachEvent("execute-search-box", this._executeSearchEventHandler);
                }
            },
        ];
    }

    private _getStateModels(): QS.QuickStartStateModel[] {
        return [
            {
                id: SearchQuickStartModel.WAIT_FOR_ANNOTATIONS,
                entryActions: [
                    {
                        action: QS_Actions.waitFor,
                        args: <QS_Actions.WaitForArgs>{
                            condition: () => this._pageContext.isAnnotationsShown(),
                            checkInterval: 200,
                        },
                    }
                ],
                transitions: [
                    {
                        event: FSM.State.STATE_READY,
                        state: SearchQuickStartModel.SHOW_ANNOTATIONS
                    },
                ],
            },
            {
                id: SearchQuickStartModel.SHOW_ANNOTATIONS,
                type: QS_States.UIState,
                uiType: QS_UI.Bubble,
                uiModel: <QS_UI.BubbleModel>{
                    title: Search_Resources.CSFeaturesQuickStartAnnotationsTitle,
                    content: Search_Resources.CSFeaturesQuickStartAnnotationsContent,
                    buttons: QS_UI.QuickStartControlButtons.OK,
                    okButtonText: Search_Resources.CSFeaturesQuickStartOkButtonContent,
                    position: QS_UI.BubblePosition.BOTTOM,
                    alignment: QS_UI.BubbleAlignment.CENTER,
                    calloutAlignment: QS_UI.BubbleAlignment.CENTER,
                    calloutOffset: 0,
                    css: { "margin-right": "16px"},
                    container: $(document.body),
                    target: () => this._pageContext.getAnnotationsBlock(),
                },
                transitions: [
                    {
                        event: QS_UI.Bubble.OkActionId,
                        state: SearchQuickStartModel.WAIT_FOR_CONTEXT_MENU
                    },
                    {
                        event: SearchQuickStartModel.EXECUTE_SEARCH_EVENT,
                        state: SearchQuickStartModel.WAIT_FOR_ANNOTATIONS
                    },
                    {
                        event: QS_UI.Bubble.CloseActionId,
                        state: SearchQuickStartModel.END
                    },
                ]
            } as QS_Models.UIStateModel,
            {
                id: SearchQuickStartModel.WAIT_FOR_CONTEXT_MENU,
                entryActions: [
                    {
                        action: QS_Actions.waitFor,
                        args: <QS_Actions.WaitForArgs>{
                            condition: () => this._pageContext.isAnnotationsShown(),
                            checkInterval: 200,
                        },
                    }
                ],
                transitions: [
                    {
                        event: FSM.State.STATE_READY,
                        state: SearchQuickStartModel.SHOW_CONTEXT_MENU
                    },
                ],
            },
            {
                id: SearchQuickStartModel.SHOW_CONTEXT_MENU,
                type: QS_States.UIState,
                uiType: QS_UI.Bubble,
                uiModel: <QS_UI.BubbleModel>{
                    title: Search_Resources.CSFeaturesQuickStartContextMenuTitle,
                    content: Search_Resources.CSFeaturesQuickStartContextMenuContent,
                    buttons: QS_UI.QuickStartControlButtons.OK,
                    okButtonText: Search_Resources.CSFeaturesQuickStartOkButtonContent,
                    position: QS_UI.BubblePosition.BOTTOM,
                    alignment: QS_UI.BubbleAlignment.CENTER,
                    css: { "margin-right": "16px", "margin-left": "-20px" },
                    showCallout: false,
                    container: $(document.body),
                    target: () => this._pageContext.getAnnotationsBlock(),
                },
                entryActions: [
                    Engagement_Interaction.logInteractionQuickStartAction,
                ],
                transitions: [
                    {
                        event: QS_UI.Bubble.OkActionId,
                        state: SearchQuickStartModel.WAIT_FOR_FILE_NAME
                    },
                    {
                        event: SearchQuickStartModel.EXECUTE_SEARCH_EVENT,
                        state: SearchQuickStartModel.WAIT_FOR_CONTEXT_MENU
                    },
                    {
                        event: QS_UI.Bubble.CloseActionId,
                        state: SearchQuickStartModel.END
                    },
                ]
            },
            {
                id: SearchQuickStartModel.WAIT_FOR_FILE_NAME,
                entryActions: [
                    {
                        action: QS_Actions.waitFor,
                        args: <QS_Actions.WaitForArgs>{
                            condition: () => this._pageContext.isFileNameShown(),
                            checkInterval: 200,
                        },
                    }
                ],
                transitions: [
                    {
                        event: FSM.State.STATE_READY,
                        state: SearchQuickStartModel.SHOW_FILE_NAME
                    },
                ],
            },
            {
                id: SearchQuickStartModel.SHOW_FILE_NAME,
                type: QS_States.UIState,
                uiType: QS_UI.Bubble,
                uiModel: <QS_UI.BubbleModel>{
                    title: Search_Resources.CSFeaturesQuickStartFileNameTitle,
                    content: Search_Resources.CSFeaturesQuickStartFileNameContent,
                    buttons: QS_UI.QuickStartControlButtons.OK,
                    okButtonText: Search_Resources.CSFeaturesQuickStartFinalOkButtonContent,
                    position: QS_UI.BubblePosition.RIGHT,
                    alignment: QS_UI.BubbleAlignment.TOP,
                    calloutAlignment: QS_UI.BubbleAlignment.TOP,
                    container: $(document.body),
                    target: () => this._pageContext.getFileName(),
                },
                transitions: [
                    {
                        event: QS_UI.Bubble.OkActionId,
                        state: SearchQuickStartModel.END
                    },
                    {
                        event: SearchQuickStartModel.EXECUTE_SEARCH_EVENT,
                        state: SearchQuickStartModel.WAIT_FOR_FILE_NAME
                    },
                    {
                        event: QS_UI.Bubble.CloseActionId,
                        state: SearchQuickStartModel.END
                    },
                ]
            },
            {   // A sink state so that the bubble can close properly
                id: SearchQuickStartModel.END,
                entryActions: [
                    Engagement_Interaction.logInteractionQuickStartAction,
                ],
            },
        ]
    }
}