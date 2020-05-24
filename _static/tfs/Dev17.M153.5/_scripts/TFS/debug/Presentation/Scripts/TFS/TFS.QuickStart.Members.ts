// <copyright file="TFS.TeamHomeView.QuickStart.Members.js" company="Microsoft">
// Copyright (c) 2015 All Rights Reserved, http://microsoft.com/
// All other rights reserved.
// </copyright>
// <summary>Implementation of Members Quick Start, which helps a user add more members to the project</summary>

import Utils_String = require("VSS/Utils/String");
import VSS_Locations = require("VSS/Locations");

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
import Engagement_Interaction = require("Engagement/Interaction/Interaction");

export interface IMembersQuickStartPageContext {
    /**
     * Counts the number of members in the manage members panel
     */
    getMemberCount(): number;

    /**
     * Gets the "Manage..." link
     */
    getManageMembersLink(): JQuery;

    /**
     * Gets the JQuery selector for the Manage Members dialog
     */
    getManageMembersDialog(): JQuery;

    /**
     * Checks if the Manage Members dialog is currently shown
     */
    isManageMembersDialogShown(): boolean;

    /**
     * Gets the "Add" button on the Manage Members dialog
     */
    getManageMembersAddButton(): JQuery;

    /**
     * Gets the "Close" button on the Manage Members dialog
     */
    getManageMembersCloseButton(): JQuery;

    /**
     * Gets the Add User dialog
     */
    getAddUserDialog(): JQuery;

    /**
     * Checks if the Add user dialog is currently shown
     */
    isAddUserDialogShown(): boolean;

    /**
     * Gets the "Identities" input box
     */
    getAddUserIdentitiesBox(): JQuery;

    /**
     * Checks if a member has been added in the Add User dialog
     */
    isAnyMemberAdded(): boolean;

    /**
     * Gets the "Save changes" button on the Add User dialog
     */
    getAddUserSaveChangesButton(): JQuery;

    /**
     * Gets the "Close" button on the Add User dialog
     */
    getAddUserCancelButton(): JQuery;
}

export class MembersWidgetQuickStartPageContext implements IMembersQuickStartPageContext {
    private _membersTile: JQuery;
    private _manageMembersDialog: JQuery;

    private getMembersTile(): JQuery {
        if (!this._membersTile) {
            this._membersTile = $(".team-members");
        }
        return this._membersTile;
    }

    public doesMembersWidgetExist(): boolean {
        return this.getMembersTile().length > 0;
    }
    /**
     * Counts the number of members in the manage members panel
     */
    public getMemberCount(): number {
        return this.getMembersTile().find('.members-container > .member').length;
    }

    /**
     * Gets the "Invite a friend" button
     */
    public getManageMembersLink(): JQuery {
        return this.getMembersTile().find(".invite-a-friend-button");
    }

    /**
     * Gets the JQuery selector for the Manage Members dialog
     */
    public getManageMembersDialog(): JQuery {
        return $(".team-members-container");
    }

    /**
     * Checks if the Manage Members dialog is currently shown
     */
    public isManageMembersDialogShown(): boolean {
        return this.getManageMembersDialog().length ? true : false;
    }

    /**
     * Gets the "Add" button on the Manage Members dialog
     */
    public getManageMembersAddButton(): JQuery {
        return $(".membership-control-actions .menu-item[command='add-identity-picker-identities']", this.getManageMembersDialog());
    }

    /**
     * Gets the "Close" button on the Manage Members dialog
     */
    public getManageMembersCloseButton(): JQuery {
        return $("#manage-team-members-close-button");
    }

    /**
     * Gets the Add User dialog
     */
    public getAddUserDialog(): JQuery {
        return $(".add-identity-dialog");
    }

    /**
     * Checks if the Add user dialog is currently shown
     */
    public isAddUserDialogShown(): boolean {
        return this.getAddUserDialog().length ? true : false;
    }

    /**
     * Gets the "Identities" input box
     */
    public getAddUserIdentitiesBox(): JQuery {
        return $(".identity-picker-search-box .identity-picker-input");
    }

    /**
     * Checks if a member has been added in the Add User dialog
     */
    public isAnyMemberAdded(): boolean {
        return $(".identity-picker-search-box .identity-picker-resolved").length ? true : false;
    }

    /**
     * Gets the "Save changes" button on the Add User dialog
     */
    public getAddUserSaveChangesButton(): JQuery {
        return $("#add-identity-dialog-main-ok-button");
    }

    /**
     * Gets the "Close" button on the Add User dialog
     */
    public getAddUserCancelButton(): JQuery {
        return $("#add-identity-dialog-main-cancel-button");
    }
}

/**
 * A QuickStart to help user invite users to the project
 */
export class MembersQuickStartModel implements QS.QuickStartModel {
    public static Id: string = "Members";

    public id: string;
    public states: QS.QuickStartStateModel[];
    public externalEventBinders: QS.IEventBinder[];

    // Step IDs
    private static CHECK_SHOW_CONDITIONS = "members-check-show-conditions";
    private static WELCOME = "members-welcome";
    private static CLICK_MEMBERS_LINK = "members-click-members-link";
    private static WAIT_FOR_MANAGE_DIALOG = "members-wait-for-manage-dialog";
    private static ADD_BUTTON = "members-add-button";
    private static WAIT_FOR_ADD_USER_DIALOG = "members-wait-for-add-user-dialog";
    private static ADD_IDENTITY1 = "members-identity1";
    private static WAIT_FOR_SAVE_CHANGES = "members-wait-for-save-changes";
    private static WAIT_FOR_ADD_USER_DIALOG_CLOSED = "members-wait-for-add-user-dialog-closed";
    private static FINISH = "members-finish";
    private static REDIRECT_BACKLOG = "members-goto-work";
    private static DISABLE_AND_CLICK_LINK = "members-disable-click-link";
    private static DISABLE_AND_CONTINUE = "members-disable-continue";
    private static DISABLE_AND_END = "members-disable-end";
    private static END = "members-end";

    // Event IDs
    public static MANAGE_USERS_CLICKED_EVENT = "members-manage-users-clicked";
    public static MANAGE_DIALOG_SHOWN_EVENT = "members-manage-dialog-shown";
    public static MANAGE_DIALOG_CLOSED_EVENT = "members-manage-dialog-closed";
    public static ADD_USER_CLICKED_EVENT = "members-add-user-clicked";
    public static ADD_USER_CANCELED_EVENT = "members-add-user-dialog-canceled";
    public static ADD_USER_SAVE_EVENT = "members-add-user-save-changes";
    public static IDENTITIES_BOX_KEY_ENTERED = "members-identities-keyentered";

    private _pageContext: IMembersQuickStartPageContext;

    constructor(pageContext: IMembersQuickStartPageContext) {
        this._pageContext = pageContext;

        this.id = MembersQuickStartModel.Id;
        this.states = this._getStateModels();
        this.externalEventBinders = this._getUIEvents();
    }

    private _getUIEvents() {
        return [
            new QS.UIEventBinder(MembersQuickStartModel.MANAGE_USERS_CLICKED_EVENT, () => this._pageContext.getManageMembersLink(), "click.MembersQuickStart"),
            new QS.UIEventBinder(MembersQuickStartModel.MANAGE_DIALOG_CLOSED_EVENT, () => this._pageContext.getManageMembersCloseButton(), "click.MembersQuickStart"),
            new QS.UIEventBinder(MembersQuickStartModel.ADD_USER_CANCELED_EVENT, () => this._pageContext.getAddUserCancelButton(), "click.MembersQuickStart"),
            new QS.UIEventBinder(MembersQuickStartModel.ADD_USER_SAVE_EVENT, () => this._pageContext.getAddUserSaveChangesButton(), "click.MembersQuickStart"),
            new QS.UIEventBinder(MembersQuickStartModel.IDENTITIES_BOX_KEY_ENTERED, () => this._pageContext.getAddUserIdentitiesBox(), "keypress.MembersQuickStart"),
            <QS.IEventBinder>{  // binding multiple UI events to a QuickStart event
                id: MembersQuickStartModel.ADD_USER_CLICKED_EVENT,
                bind: (fireDelegate) => {
                    this._pageContext.getManageMembersAddButton().bind("click.MembersQuickStart", () => fireDelegate());
                },
                unbind: () => {
                    this._pageContext.getManageMembersAddButton().unbind("click.MembersQuickStart");
                }
            },
        ];
    }

    private _getStateModels(): QS.QuickStartStateModel[] {
        return [
            <QS_Models.ConditionStateModel>{
                id: MembersQuickStartModel.CHECK_SHOW_CONDITIONS,
                type: QS_States.ConditionalState,
                condition: {
                    condition: QS_Conditions.or,
                    args: [
                        QS_Conditions.checkForceShow,
                        () => this._pageContext.getMemberCount() <= 1
                    ]
                },
                transitions: [
                    {
                        event: QS_States.ConditionalState.TRUE_EVENT,
                        state: MembersQuickStartModel.WELCOME
                    },
                ]
            },
            {
                id: MembersQuickStartModel.WELCOME,
                type: QS_States.UIState,
                uiType: QS_UI.Bubble,
                uiModel: <QS_UI.BubbleModel>{
                    title: PresentationResources.MembersWelcomeTitle,
                    content: PresentationResources.MembersWelcomeContent,
                    buttons: QS_UI.QuickStartControlButtons.OK | QS_UI.QuickStartControlButtons.Cancel,
                    okButtonText: PresentationResources.MembersWelcomeOkButton,
                    cancelButtonText: PresentationResources.MembersWelcomeCancelButton,
                    position: QS_UI.BubblePosition.RIGHT,
                    alignment: QS_UI.BubbleAlignment.CENTER,
                    calloutAlignment: QS_UI.BubbleAlignment.CENTER,
                    container: $(document.body),
                    target: () => this._pageContext.getManageMembersLink(),
                },
                exitActions: [
                    Engagement_Interaction.logInteractionQuickStartAction,
                ],
                transitions: [
                    {
                        event: QS_UI.Bubble.OkActionId,
                        state: MembersQuickStartModel.CLICK_MEMBERS_LINK
                    },
                    {
                        event: MembersQuickStartModel.MANAGE_USERS_CLICKED_EVENT,
                        state: MembersQuickStartModel.WAIT_FOR_MANAGE_DIALOG
                    },
                    {
                        event: QS_UI.Bubble.CloseActionId,
                        state: MembersQuickStartModel.END
                    },
                ],
            } as QS_Models.UIStateModel,
            {
                id: MembersQuickStartModel.CLICK_MEMBERS_LINK,
                entryActions: [
                    {
                        action: QS_Actions.clickUI,
                        args: <QS_Actions.ClickUIArgs>{
                            clickTarget: () => this._pageContext.getManageMembersLink(),
                        },
                    }
                ],
                transitions: [
                    {
                        event: FSM.State.STATE_READY,
                        state: MembersQuickStartModel.WAIT_FOR_MANAGE_DIALOG
                    },
                ],
            },
            {
                id: MembersQuickStartModel.WAIT_FOR_MANAGE_DIALOG,
                entryActions: [
                    {
                        action: QS_Actions.waitFor,
                        args: <QS_Actions.WaitForArgs>{
                            condition: () => this._pageContext.isManageMembersDialogShown(),
                            checkInterval: 200,
                        },
                    }
                ],
                transitions: [
                    {
                        event: FSM.State.STATE_READY,
                        state: MembersQuickStartModel.ADD_BUTTON
                    },
                ],
            },
            {
                id: MembersQuickStartModel.ADD_BUTTON,
                type: QS_States.UIState,
                uiType: QS_UI.Bubble,
                uiModel: <QS_UI.BubbleModel>{
                    title: PresentationResources.MembersAddButtonTitle,
                    content: QS_UI.ContentUtils.paragraphs(
                        PresentationResources.MembersAddButtonContent1,
                        Utils_String.format(PresentationResources.MembersAddButtonContent2, QS_UI.ContentUtils.strong(PresentationResources.MembersManageDialogAdd), QS_UI.ContentUtils.strong(PresentationResources.MembersManageDialogAddUser))),
                    position: QS_UI.BubblePosition.RIGHT,
                    container: $(document.body),
                    target: () => this._pageContext.getManageMembersAddButton(),
                },
                transitions: [
                    {
                        event: MembersQuickStartModel.ADD_USER_CLICKED_EVENT,
                        state: MembersQuickStartModel.WAIT_FOR_ADD_USER_DIALOG
                    },
                    {
                        event: MembersQuickStartModel.MANAGE_DIALOG_CLOSED_EVENT,
                        state: MembersQuickStartModel.END
                    },
                ],
            },
            {
                id: MembersQuickStartModel.WAIT_FOR_ADD_USER_DIALOG,
                entryActions: [
                    {
                        action: QS_Actions.waitFor,
                        args: <QS_Actions.WaitForArgs>{
                            condition: () => this._pageContext.isAddUserDialogShown(),
                            checkInterval: 200,
                        }
                    }
                ],
                transitions: [
                    {
                        event: FSM.State.STATE_READY,
                        state: MembersQuickStartModel.ADD_IDENTITY1
                    },
                ],
            },
            {
                id: MembersQuickStartModel.ADD_IDENTITY1,
                type: QS_States.UIState,
                uiType: QS_UI.Bubble,
                uiModel: <QS_UI.BubbleModel>{
                    title: PresentationResources.MembersAddIdentity1Title,
                    content: QS_UI.ContentUtils.paragraphs(
                        Utils_String.format(PresentationResources.MembersAddIdentity1Content1, QS_UI.ContentUtils.strong(PresentationResources.MembersAddIdentitySeparationKey)),
                        Utils_String.format(PresentationResources.MembersAddIdentity1Content2, QS_UI.ContentUtils.strong(PresentationResources.MembersAddUserDialogSaveChanges))),
                    position: QS_UI.BubblePosition.BOTTOM,
                    container: $(document.body),
                    target: () => this._pageContext.getAddUserIdentitiesBox(),
                },
                transitions: [
                    {
                        event: MembersQuickStartModel.IDENTITIES_BOX_KEY_ENTERED,
                        state: MembersQuickStartModel.WAIT_FOR_SAVE_CHANGES
                    },
                    {
                        event: MembersQuickStartModel.ADD_USER_SAVE_EVENT,
                        state: MembersQuickStartModel.WAIT_FOR_ADD_USER_DIALOG_CLOSED
                    },
                    {
                        event: MembersQuickStartModel.ADD_USER_CANCELED_EVENT,
                        state: MembersQuickStartModel.ADD_BUTTON
                    },
                ],
            },
            {
                id: MembersQuickStartModel.WAIT_FOR_SAVE_CHANGES,
                transitions: [
                    {
                        event: MembersQuickStartModel.ADD_USER_SAVE_EVENT,
                        state: MembersQuickStartModel.WAIT_FOR_ADD_USER_DIALOG_CLOSED
                    },
                    {
                        event: MembersQuickStartModel.ADD_USER_CANCELED_EVENT,
                        state: MembersQuickStartModel.ADD_BUTTON
                    },
                ],
            },
            {
                id: MembersQuickStartModel.WAIT_FOR_ADD_USER_DIALOG_CLOSED,
                entryActions: [{
                    action: QS_Actions.waitFor,
                    args: <QS_Actions.WaitForArgs>{
                        condition: () => !this._pageContext.isAddUserDialogShown(),
                        checkInterval: 200
                    }
                }],
                transitions: [
                    {
                        event: FSM.State.STATE_READY,
                        state: MembersQuickStartModel.FINISH
                    },
                ],
            },
            {
                id: MembersQuickStartModel.FINISH,
                type: QS_States.UIState,
                uiType: QS_UI.Bubble,
                uiModel: <QS_UI.BubbleModel>{
                    title: PresentationResources.MembersFinishTitle,
                    content: PresentationResources.MembersFinishContent,
                    position: QS_UI.BubblePosition.BOTTOM | QS_UI.BubblePosition.RIGHT,
                    buttons: QS_UI.QuickStartControlButtons.OK | QS_UI.QuickStartControlButtons.Cancel,
                    okButtonText: PresentationResources.MembersFinishOkButton,
                    cancelButtonText: PresentationResources.MembersFinishCancelButton,
                    container: $(document.body),
                },
                transitions: [
                    {
                        event: QS_UI.Bubble.OkActionId,
                        state: MembersQuickStartModel.REDIRECT_BACKLOG
                    },
                    {
                        event: MembersQuickStartModel.MANAGE_DIALOG_CLOSED_EVENT,
                        state: MembersQuickStartModel.END
                    },
                ],
            },
            {
                id: MembersQuickStartModel.REDIRECT_BACKLOG,
                entryActions: [{
                    action: QS_Actions.redirection,
                    args: <QS_Actions.RedirectionArgs>{
                        url: QS_Utils.getActionUrlForQuickStart("", "backlogs", "Scrum"),
                    }
                }]
            },
            {   // A sink state so that the bubble can close properly
                id: MembersQuickStartModel.END,
            },
        ];
    }
}
