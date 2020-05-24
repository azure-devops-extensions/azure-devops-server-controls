import Utils_String = require("VSS/Utils/String");
import VSS_Locations = require("VSS/Locations");
import VCResources = require("VersionControl/Scripts/Resources/TFS.Resources.VersionControl");

import FSM = require("Engagement/QuickStart/FSM");
import QS = require("Engagement/QuickStart/Core");
import QS_UI = require("Engagement/QuickStart/UI");
import QS_States = require("Engagement/QuickStart/States");
import QS_Models = require("Engagement/QuickStart/StateModels");
import QS_Actions = require("Engagement/QuickStart/Actions");
import QS_Conditions = require("Engagement/QuickStart/Conditions");
import PresentationResources = require("Presentation/Scripts/TFS/Resources/TFS.Resources.Presentation");
import QS_Constants = require("Engagement/QuickStart/Constants");
import QS_Utils = require("Engagement/QuickStart/Utils");
import EngagementInteraction = require("Engagement/Interaction/Interaction");

export interface IPullRequestQuickStartPageContext {
    getOverviewTab(): JQuery;
    getFilesTab(): JQuery;
    getCommitsTab(): JQuery;
    getIterationSelector(): JQuery;
    getVoteControl(): JQuery;
}

export class PullRequestQuickStartPageContext implements IPullRequestQuickStartPageContext {

    public getOverviewTab(): JQuery {
        return $('[data-id="overview"]');
    }

    public getFilesTab(): JQuery {
        return $('[data-id="files"]');
    }

    public getCommitsTab(): JQuery {
        return $('[data-id="commits"]');
    }

    public getIterationSelector(): JQuery {
        return $('.vc-iteration-selector');
    }

    public getVoteControl(): JQuery {
        const $voteControl = $('.vote-control-container');
        return $voteControl.length ? $voteControl : $('.vc-pullrequest-reviewers-list');
    }
}

export class PullRequestQuickStartModel implements QS.QuickStartModel {
    public static Id: string = "PullRequestQuickStart";

    public id: string;
    public states: QS.QuickStartStateModel[];
    public externalEventBinders: QS.IEventBinder[];

    // Step IDs
    private static CHECK_SHOW_CONDITIONS = "pullrequest-check-show-conditions";
    private static WELCOME = "pullrequest-welcome";
    private static FILES = "pullrequest-files";
    private static WAIT_FOR_ITERATIONS = "pullrequest-wait-for-iterations";
    private static ITERATIONS = "pullrequest-iterations";
    private static VOTE = "pullrequest-vote";
    private static END = "pullrequest-end";

    // Event IDs
    public static FILES_CLICKED_EVENT = "pullrequest-files-clicked";
    public static VOTE_CLICKED_EVENT = "pullrequest-vote-clicked";
    public static COMMITS_CLICKED_EVENT = "pullrequest-commits-clicked";
    public static OVERVIEW_CLICKED_EVENT = "pullrequest-overview-clicked";

    private _pageContext: IPullRequestQuickStartPageContext;

    constructor(pageContext: IPullRequestQuickStartPageContext) {
        this._pageContext = pageContext;

        this.id = PullRequestQuickStartModel.Id;
        this.states = this._getStateModels();
        this.externalEventBinders = this._getUIEvents();
    }

    private _getUIEvents() {
        return [
            new QS.UIEventBinder(PullRequestQuickStartModel.FILES_CLICKED_EVENT, () => this._pageContext.getFilesTab(), "click.PullRequestQuickStartModel"),
            new QS.UIEventBinder(PullRequestQuickStartModel.VOTE_CLICKED_EVENT, () => this._pageContext.getVoteControl(), "click.PullRequestQuickStartModel"),
            new QS.UIEventBinder(PullRequestQuickStartModel.COMMITS_CLICKED_EVENT, () => this._pageContext.getCommitsTab(), "click.PullRequestQuickStartModel"),
            new QS.UIEventBinder(PullRequestQuickStartModel.OVERVIEW_CLICKED_EVENT, () => this._pageContext.getOverviewTab(), "click.PullRequestQuickStartModel"),
        ];
    }

    //This builds our state machine. Currently this is a completely linear state chain
    //(check for show) -> (welcome buble, directs users to files) -> (wait for iteration picker) -> (files bubble, directs users to iteration picker) -> (vote bubble, directs users to vote) -> (done)
    private _getStateModels(): QS.QuickStartStateModel[] {

        //set up a click event on the overview tab instead of just a url so that the quickstart framework responds to the event
        const overviewLink = `<a href="#" onClick="$('[data-id=overview] > a')[0].click()" >` + VCResources.PullRequest_QuickStart_Features_OverviewLink + `</a>`;

        return [
            {
                id: PullRequestQuickStartModel.WELCOME,
                type: QS_States.UIState,
                uiType: QS_UI.Bubble,
                uiModel: <QS_UI.BubbleModel>{
                    title: VCResources.PullRequest_QuickStart_Overview_Title,
                    content: VCResources.PullRequest_QuickStart_Overview_Desc,
                    buttons: QS_UI.QuickStartControlButtons.OK | QS_UI.QuickStartControlButtons.Cancel,
                    okButtonText: VCResources.PullRequest_QuickStart_Overview_OK,
                    cancelButtonText: VCResources.PullRequest_QuickStart_Overview_Cancel,
                    position: QS_UI.BubblePosition.RIGHT,
                    alignment: QS_UI.BubbleAlignment.CENTER,
                    calloutAlignment: QS_UI.BubbleAlignment.CENTER,
                    container: $(document.body),
                    target: () => this._pageContext.getOverviewTab(),
                },
                exitActions: [
                    EngagementInteraction.logInteractionQuickStartAction,
                ],
                transitions: [
                    {
                        event: QS_UI.Bubble.OkActionId,
                        state: PullRequestQuickStartModel.FILES
                    },
                    {
                        event: QS_UI.Bubble.CloseActionId,
                        state: PullRequestQuickStartModel.END
                    },
                ],
            } as QS_Models.UIStateModel,
            {
                id: PullRequestQuickStartModel.FILES,
                type: QS_States.UIState,
                uiType: QS_UI.Bubble,
                uiModel: <QS_UI.BubbleModel>{
                    title: VCResources.PullRequest_QuickStart_Files_Title,
                    content: Utils_String.format(VCResources.PullRequest_QuickStart_Files_Desc, QS_UI.ContentUtils.strong(VCResources.PullRequest_QuickStart_Files_Name)),
                    position: QS_UI.BubblePosition.RIGHT,
                    alignment: QS_UI.BubbleAlignment.CENTER,
                    calloutAlignment: QS_UI.BubbleAlignment.CENTER,
                    container: $(document.body),
                    target: () => this._pageContext.getFilesTab(),
                },
                transitions: [
                    {
                        event: PullRequestQuickStartModel.FILES_CLICKED_EVENT,
                        state: PullRequestQuickStartModel.WAIT_FOR_ITERATIONS
                    },
                    {
                        event: PullRequestQuickStartModel.OVERVIEW_CLICKED_EVENT,
                        state: PullRequestQuickStartModel.END
                    },
                    {
                        event: QS_UI.Bubble.CloseActionId,
                        state: PullRequestQuickStartModel.END
                    },
                ],
            },
            {
                //Ensure that the files tab has loaded and the iteration picker exists before creating the iteration bubble
                id: PullRequestQuickStartModel.WAIT_FOR_ITERATIONS,
                entryActions: [
                    {
                        action: QS_Actions.waitFor,
                        args: <QS_Actions.WaitForArgs>{
                            condition: () => this._pageContext.getIterationSelector().length > 0,
                            checkInterval: 200,
                        },
                    }
                ],
                transitions: [
                    {
                        event: FSM.State.STATE_READY,
                        state: PullRequestQuickStartModel.ITERATIONS
                    },
                ]
            },
            {
                id: PullRequestQuickStartModel.ITERATIONS,
                type: QS_States.UIState,
                uiType: QS_UI.Bubble,
                uiModel: <QS_UI.BubbleModel>{
                    title: VCResources.PullRequest_QuickStart_Iterations_Title,
                    content: VCResources.PullRequest_QuickStart_Iterations_Desc,
                    buttons: QS_UI.QuickStartControlButtons.OK,
                    okButtonText: VCResources.PullRequest_QuickStart_Iterations_OK,
                    position: QS_UI.BubblePosition.RIGHT,
                    alignment: QS_UI.BubbleAlignment.CENTER,
                    calloutAlignment: QS_UI.BubbleAlignment.CENTER,
                    container: $(document.body),
                    target: () => this._pageContext.getIterationSelector(),
                },
                transitions: [
                    {
                        event: QS_UI.Bubble.OkActionId,
                        state: PullRequestQuickStartModel.VOTE
                    },
                    {
                        event: PullRequestQuickStartModel.OVERVIEW_CLICKED_EVENT,
                        state: PullRequestQuickStartModel.END
                    },
                    {
                        event: PullRequestQuickStartModel.COMMITS_CLICKED_EVENT,
                        state: PullRequestQuickStartModel.END
                    },
                    {
                        event: QS_UI.Bubble.CloseActionId,
                        state: PullRequestQuickStartModel.END
                    },
                ],
            },
            {
                id: PullRequestQuickStartModel.VOTE,
                type: QS_States.UIState,
                uiType: QS_UI.Bubble,
                uiModel: <QS_UI.BubbleModel>{
                    title: VCResources.PullRequest_QuickStart_Vote_Title,
                    content: QS_UI.ContentUtils.paragraphs(VCResources.PullRequest_QuickStart_Vote_Desc,
                        Utils_String.format(VCResources.PullRequest_QuickStart_Vote_Desc_2, overviewLink)),
                    position: QS_UI.BubblePosition.BOTTOM,
                    alignment: QS_UI.BubbleAlignment.CENTER,
                    calloutAlignment: QS_UI.BubbleAlignment.CENTER,
                    container: $(document.body),
                    target: () => this._pageContext.getVoteControl(),
                },
                transitions: [
                    {
                        event: PullRequestQuickStartModel.VOTE_CLICKED_EVENT,
                        state: PullRequestQuickStartModel.END
                    },
                    {
                        event: PullRequestQuickStartModel.FILES_CLICKED_EVENT,
                        state: PullRequestQuickStartModel.END
                    },
                    {
                        event: PullRequestQuickStartModel.OVERVIEW_CLICKED_EVENT,
                        state: PullRequestQuickStartModel.END
                    },
                    {
                        event: PullRequestQuickStartModel.COMMITS_CLICKED_EVENT,
                        state: PullRequestQuickStartModel.END
                    },
                    {
                        event: QS_UI.Bubble.CloseActionId,
                        state: PullRequestQuickStartModel.END
                    },
                ],
            },
            {   // A sink state so that the bubble can close properly
                id: PullRequestQuickStartModel.END,
            },
        ];
    }
}