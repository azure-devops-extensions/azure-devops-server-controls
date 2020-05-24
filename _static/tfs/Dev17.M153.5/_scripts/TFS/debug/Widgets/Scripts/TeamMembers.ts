import "Admin/Scripts/TFS.Admin.Registration.HostPlugins";
import TFS_Dashboards_Common = require("Dashboards/Scripts/Common");
import Dashboard_Shared_Contracts = require("Dashboards/Scripts/Contracts");
import TFS_Dashboards_Constants = require("Dashboards/Scripts/Generated/Constants");
import ServerConstants = require("Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import Dashboards_Telemetry = require("Dashboards/Scripts/Telemetry");
import * as UserPermissionsHelper from "Dashboards/Scripts/Common.UserPermissionsHelper";
import Dashboards_WidgetContracts = require("TFS/Dashboards/WidgetContracts");
import WidgetHelpers = require("TFS/Dashboards/WidgetHelpers");

import * as React from "react";
import * as ReactDOM from "react-dom";
import Constants_Platform = require("VSS/Common/Constants/Platform");
import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";
import VSS_Service = require("VSS/Service");
import { PersonaCard } from "VSS/Identities/Picker/PersonaCard";
import Picker_Controls = require("VSS/Identities/Picker/Controls");

import { using } from "VSS/VSS";
import Ajax = require("VSS/Ajax");
import Controls = require("VSS/Controls");
import Diag = require("VSS/Diag");
import Events_Action = require("VSS/Events/Action");
import SDK = require("VSS/SDK/Shim");
import Utils_String = require("VSS/Utils/String");
import Utils_UI = require("VSS/Utils/UI");
import VSS_Resources_Common = require("VSS/Resources/VSS.Resources.Common");
import PopupContent = require("VSS/Controls/PopupContent");

import SDK_Shim = require("VSS/SDK/Shim");
import Context = require("VSS/Context");

import TFS_Resources_Widgets = require("Widgets/Scripts/Resources/TFS.Resources.Widgets");
import TFS_Widget_Utilities = require("Widgets/Scripts/TFS.Widget.Utilities");
import VSS_Control_BaseWidget = require("Widgets/Scripts/VSS.Control.BaseWidget");

import Engagement = require("Engagement/Core");
import EngagementDispatcher = require("Engagement/Dispatcher");
import TFS_Members_NoRequire = require("Presentation/Scripts/TFS/TFS.QuickStart.Members");
import GridUtils = require("Presentation/Scripts/TFS/TFS.UI.Controls.Grid.Utils");

import {
    IContributedComponent,
    IInviteUserToProjectDialogState,
    InviteUserToProjectDialogContainerIdType,
    IUserManagementService,
    userManagementServiceContributionId,
} from "Aex/MemberEntitlementManagement/Services";
import { Spinner, ISpinnerProps, SpinnerSize } from "OfficeFabric/Spinner";
import { Overlay, IOverlayProps } from "OfficeFabric/Overlay";
import { IMessageBarProps, MessageBar, MessageBarType } from "OfficeFabric/MessageBar";

export interface MemberInfo {
    id: string;
    isContainer: boolean;
    isActive: boolean;
    displayName: string;
    customDisplayName: string;
    providerDisplayName: string;
    uniqueName: string;
    email: string;
}

export interface MembersResult {
    count: number;
    members: MemberInfo[];
}

export class TeamMembersWidget extends VSS_Control_BaseWidget.BaseWidgetControl<Dashboard_Shared_Contracts.WidgetOptions>
    implements Dashboards_WidgetContracts.IWidget {
    public static MaxMemberResults: number = 100;
    public static MaxMembersToShowForNonAdmin: number = 10;
    //Admin user has the ability to add members to team, to do that 'Invite a friend' and 'Add Member' buttons are displayed for user
    //Invite a friend is displayed only when team doesn't have non-admin users
    //'Add Member' the plus button shows up when team has non-admin users, this will be next to last member displayed in the widget
    //Non-admin users will not see this button and in case where there are 10 members, non-admin user will see all 10 members 
    //but admin user will see 9 members and 'Add Member' button, so that's why -1
    public static MaxMembersToShowForAdmin: number = TeamMembersWidget.MaxMembersToShowForNonAdmin - 1;
    public static DomClass_ManageMembers = "manage-members";
    public static DomClass_Member = "member";
    public static DomClass_MemberCount = "member-count";
    public static DomClass_MembersContainer = "members-container";
    public static DomClass_MembersItem = "members-item";
    public static DomClass_IdentityImage = "identity-picture";
    public static DomClass_InviteAFriendContainer = "invite-a-friend-container";
    public static DomClass_InviteAFriendMessageContainer = "invite-a-friend-message-container";
    public static DomClass_InviteAFriendMessageAligner = "invite-a-friend-message-aligner";
    public static CSSClass_InviteAFriendMessage = "invite-a-friend-message";
    public static CSSClass_InviteAFriendButton = "invite-a-friend-button";
    public static CSSClass_AddMember = "add-team-member";
    public static CSSClass_ViewAll = "view-all-button";
    public static MaxInviteAFriendImages: number = 5;
    private static ImageCaptions: string[] = [
        TFS_Resources_Widgets.TeamMembers_InviteAFriend_Message_Caption_1,
        TFS_Resources_Widgets.TeamMembers_InviteAFriend_Message_Caption_3,
        TFS_Resources_Widgets.TeamMembers_InviteAFriend_Message_Caption_2,
        TFS_Resources_Widgets.TeamMembers_InviteAFriend_Message_Caption_2,
        TFS_Resources_Widgets.TeamMembers_InviteAFriend_Message_Caption_2];


    private chosenImageNumber: number = 0;
    private isManageMembershipDialogOpen = false;
    private lastLoadResult: IPromise<Dashboards_WidgetContracts.WidgetStatus> = null;
    private selectedIndex: number; //identifies the position of the element which recieves keyboard focus, when team members list is active.
    public userIsAdmin: boolean = false;

    private addUserDialogContainer?: HTMLElement;
    private messageBarContainer?: HTMLElement;
    private addUserDialogComponent?: IContributedComponent<IInviteUserToProjectDialogState, InviteUserToProjectDialogContainerIdType>;
    private loadUserDialogPromise?: Promise<void>;
    private finishedUserDialogLoad: boolean = false;


    /**
    * @constructor
    */
    constructor(options?) {
        super(options);
    }

    /**
     * Extends options for control with style enhancements, called by base control during initialization
     * @param {any} options for the control.
     */
    public initializeOptions(options?: any) {
        super.initializeOptions($.extend({
            coreCssClass: "team-members"
        }, options));
    }

    public initialize(): void {
        Diag.logTracePoint("Dashboards.TeamMembersWidget.Start");

        super.initialize();

        this.userIsAdmin = UserPermissionsHelper.CanManagePermissionsForDashboards();
        this.loadUserDialogPromise = this.loadAddUserDialog();
    }

    public preload(state: Dashboards_WidgetContracts.WidgetSettings): IPromise<Dashboards_WidgetContracts.WidgetStatus> {
        // Add the class that enables the widget to take advantage of the styles from the widget sdk
        this.getElement().addClass(TFS_Dashboards_Constants.WidgetDomClassNames.WidgetContainer);

        this._addTitleBar();
        this._addInviteAFriend();

        return WidgetHelpers.WidgetStatusHelper.Success();
    }

    public load(state: Dashboards_WidgetContracts.WidgetSettings): IPromise<Dashboards_WidgetContracts.WidgetStatus> {
        this.lastLoadResult = this._loadTeamMembers();
        this.publishLoadedEvent({});
        return this.lastLoadResult;
    }

    /**
     * Method called by the host when the dashboard is done loading, allowing the widget to perform any 
     * post load operations, in this setting up its quick start behaviour.
     */
    public onDashboardLoaded(): void {
        this.publishTelemetry("isAdmin", !!this.userIsAdmin);
        if (
            !TFS_Host_TfsContext.TfsContext.getDefault().isHosted // members quick start is only applied in hosted environments.
            || !this.lastLoadResult // only run the quickstart if the last widget load state is available.
        ) {
            return;
        }
    }

    private publishTelemetry(property: string, value: any): void {
        var properties = <IDictionaryStringTo<any>>{};

        properties[property] = value;
        properties["DashboardId"] = TFS_Dashboards_Common.DashboardPageExtension.getActiveDashboard();

        Dashboards_Telemetry.DashboardsTelemetryCore.publish("TeamMembersWidget", properties);
    }

    /**
    * Adds a title and member count elements to the widget.
    */
    public _addTitleBar(): void {
        // Add title
        var $titleContainer: JQuery = $("<h2 />")
            .addClass(TFS_Dashboards_Constants.WidgetDomClassNames.Title)
            .text(TFS_Resources_Widgets.TeamMembersWidget_Title)
            .appendTo(this.getElement());

        // Add member count
        $("<span />").addClass(TeamMembersWidget.DomClass_MemberCount).appendTo($titleContainer);

        this._addViewAll($titleContainer);
        this._toggleViewAll(false);
    }

    /**
    * Renders "manage team members" dialog and reloads team members after dialog close.
    * @param {Event} e The click event for the manage link.
    */
    public _onManageMembersClick(e?: Event): void {
        e.preventDefault();

        const pageContext = Context.getPageContext();
        if (FeatureAvailabilityService.isFeatureEnabled(ServerConstants.FeatureAvailabilityFlags.UserManagementProjectDialog, false)
            && pageContext.webAccessConfiguration.isHosted) {
            this.openAddUserDialog();
        } else {
            if (this.isManageMembershipDialogOpen) {
                return;
            }
            this.isManageMembershipDialogOpen = true;
            this._openManageMembershipDialog();
        }
    }

    /**
     * Opens Manage membership dialog
     * Reloads the members if members are modified
     */
    public _openManageMembershipDialog(): void {
        Events_Action.getService().performAction("manage-team-members", {
            teamName: this.teamContext.name,
            teamId: this.teamContext.id,
            callback: (membersModified: boolean) => {
                Diag.logTracePoint("Dashboards.TeamMembersWidget.Managed");
                if (membersModified) {
                    this._loadTeamMembers();
                }
                this.isManageMembershipDialogOpen = false;
            }
        });
    }

    private async loadAddUserDialog(): Promise<void> {
        const umServicePromise = SDK_Shim.VSS.getService<IUserManagementService>(userManagementServiceContributionId);
        const umService = await umServicePromise;
        if (umService) {
            if (!this.addUserDialogContainer) {
                let container = $(".add-to-project-dialog");
                if (!container.length) {
                    container = $("<div/>")
                        .addClass("add-to-project-dialog");
                    $(".team-members").append(container);
                }
                this.addUserDialogContainer = container.get(0);
            }

            if (!this.messageBarContainer) {
                let container = $(".status-message-bar-container");
                if (!container.length) {
                    container = $("<div/>")
                        .addClass("status-message-bar-container");
                    if (TFS_Dashboards_Common.DashboardPageExtension.isNewDashboardExperience()) {
                        $(".team-dashboard-hub").prepend(container);
                    } else {
                        $("#container-with-scroll").prepend(container);
                    }
                }
                this.messageBarContainer = container.get(0);
            }

            this.addUserDialogComponent = umService.getAddUsersToProjectDialogComponent({
                hidden: true,
                onActionComplete: () => {
                    this._loadTeamMembers();
                },
                onDismiss: () => {
                    this.addUserDialogComponent.setState({
                        hidden: true,
                    })
                    this.isManageMembershipDialogOpen = false;
                },
                teamContext: this.teamContext,
            });
            if (this.addUserDialogContainer) {
                this.addUserDialogComponent.renderInContainer(this.addUserDialogContainer, "dialog");
            }
            if (this.messageBarContainer) {
                this.addUserDialogComponent.renderInContainer(this.messageBarContainer, "message-bar");
            }
            this.finishedUserDialogLoad = true;
        }
    }

    private async openAddUserDialog(): Promise<void> {
        if (!this.loadUserDialogPromise) {
            this.loadUserDialogPromise = this.loadAddUserDialog();
        }
        if (!this.finishedUserDialogLoad) {
            this.showOverlayWithSpinner();
            await this.loadUserDialogPromise;
            this.hideOverlayWithSpinner();
        }
        if (this.addUserDialogComponent) {
            this.isManageMembershipDialogOpen = true;
            this.addUserDialogComponent.setState({ hidden: false });
        }
    }

    private showOverlayWithSpinner() {
        let container = $(".team-dashboard-overlay-container");
        if (!container.length) {
            container = $("<div/>")
                .addClass("team-dashboard-overlay-container")
                .css("z-index", 5);;
            $("body").append(container);
        }

        // Create Spinner
        const spinnerProps = {
            size: SpinnerSize.large,
            label: "Loading...",
            ariaLive: "assertive"
        } as ISpinnerProps;
        const spinnerElement = React.createElement(Spinner, spinnerProps);

        // Create Overlay
        const overlayProps = {
            className: "dashboard-overlay",
            isDarkThemed: true
        } as IOverlayProps;
        const overlayElement = React.createElement(Overlay, overlayProps, spinnerElement);

        $("#widgets-container").css("z-index", 0);

        // Show Overlay with Spinner
        ReactDOM.render(
            overlayElement,
            container[0]
        );
    }

    private hideOverlayWithSpinner() {
        const container = $(".team-dashboard-overlay-container");
        if (container.length) {
            ReactDOM.unmountComponentAtNode(container[0]);
        }
    }

    /**
    * Retrieves team member info.
    */
    public _loadTeamMembers(): IPromise<Dashboards_WidgetContracts.WidgetStatus> {
        this.clearPreviouslyLoadedMembers();

        if (this.teamContext.id) {
            var self = this;

            //http://exampleServerName:8080/tfs/DefaultCollection/0dd4cf30-89d8-45a1-b1c8-ab5fb0e9ce8c/a5198a35-5efc-4163-9e12-c22bad356e49/_api/_teams/members?maxResults=101&randomize=true&teamId=a5198a35-5efc-4163-9e12-c22bad356e49

            // Url template: {serviceHost}/{project}/{team}/_{controller}/{action}
            // Required Query Params:
            //     teamId=<guid>
            // Optional Query Params:
            //     maxResults=#
            //     randomize=<bool>
            //     includeGroups=<bool>
            // Note: There seems to be two issues with this endpoint:
            //     1) maxResults doesn't work
            //     2) The results won't be randomized if maxResults is less than the total number of team members

            var tfsContext = TFS_Host_TfsContext.TfsContext.getDefault();
            var queryParams = { area: "api", "maxResults": TeamMembersWidget.MaxMemberResults, randomize: "true", teamId: this.teamContext.id };
            var url = tfsContext.getActionUrl("members", "teams", queryParams);

            // Once the this feature flag is on, we don't include the members within the group so we are only going to include the groups name
            if (FeatureAvailabilityService.isFeatureEnabled(ServerConstants.FeatureAvailabilityFlags.AgileServerTeamServiceAADGroupsBlockExpansion)) {
                queryParams["includeGroups"] = true;
            }
            var ajaxOptions: JQueryAjaxSettings = {
                type: "get",
                data: queryParams,
                dataType: "json",
                timeout: TFS_Dashboards_Common.ClientConstants.WidgetAjaxTimeoutMs
            };
            var promise = Ajax.issueRequest(url, ajaxOptions);

            var fail = (e) => {
                var errorMessage = TFS_Resources_Widgets.TeamMembersWidget_ErrorLoadingMembers + " " + e.toString();
                return WidgetHelpers.WidgetStatusHelper.Failure(errorMessage);
            };

            return promise
                .then((data: MembersResult) => {
                    self._addTeamMembers(data);
                    return WidgetHelpers.WidgetStatusHelper.Success();
                }, fail);
        } else {
            return WidgetHelpers.WidgetStatusHelper.Failure(TFS_Resources_Widgets.TeamMembersWidget_ErrorLoadingTeamId);
        }
    }

    /**
    * Adds team members to the widget.
    * @param {MembersResult} membersResult JSON information about team members.
    */
    public _addTeamMembers(membersResult: MembersResult): void {
        var members: MemberInfo[] = membersResult.members || [];
        var memberCount: number = membersResult.count;

        if (this._isInviteAFriendForAdminDisplayed(memberCount)) {
            this._toggleViewAll(false);
            return;
        }

        var maxMembersToShow = this.userIsAdmin ? TeamMembersWidget.MaxMembersToShowForAdmin : TeamMembersWidget.MaxMembersToShowForNonAdmin;
        members = TeamMembersWidget._getMembersToDisplay(members, maxMembersToShow);

        this.addMembers(members, this.userIsAdmin);
        this._updateTeamMemberCountInTitleBar(members.length, memberCount);
        this._toggleViewAll(memberCount > maxMembersToShow);

        Diag.logTracePoint("Dashboards.TeamMembersWidget.Complete");
    }

    /**
    * Shows invite a friend button if there is only admin user
    * @param {number} memberCount count of members
    * @returns {boolean} FALSE if user is not admin or team has users other than admin
    *                    TRUE if there is only admin user in the team
    */
    public _isInviteAFriendForAdminDisplayed(memberCount: number): boolean {
        if (!this.userIsAdmin) {
            return false;
        }

        var hasLessThanTwoUsers = this.hasLessThanTwoUsers(memberCount);
        this.toggleInviteAFriend(hasLessThanTwoUsers);
        return hasLessThanTwoUsers;
    }

    private addMembers(members: MemberInfo[], withAddMemberButton: boolean): void {
        // Add members
        var $membersContainer = this.getMembersContainer();

        $.each(members, (index: number, member: MemberInfo) => {
            $membersContainer.append(this._createMemberElement(member));
        });

        if (withAddMemberButton) {
            $membersContainer.append(this._renderAddMembersButton());
        }

        var $memberItems = $membersContainer.children()
            .attr("role", "button")
            .attr("tabindex", -1) //Suppress normal tabbing on all elements by default- the container will navigate to it with arrow key handling.
            .attr("aria-selected", "false");

        let $line1 = $("<span>").attr("role", "row").append($memberItems.slice(0, 5));
        let $line2 = $("<span>").attr("role", "row").append($memberItems.slice(5, 10));
        $membersContainer.append($line1);
        $membersContainer.append($line2);

        //Mark the first container as tab focusable
        this.selectedIndex = 0;
        $memberItems.eq(this.selectedIndex)
            .attr("tabindex", 0)
            .attr("aria-selected", "true");

        $memberItems.keydown((e: JQueryEventObject) => {
            this.moveFocus(e, $memberItems);
        });
    }

    private moveFocus(e: JQueryEventObject, $memberItems: JQuery) {
        let oldIndex = this.selectedIndex;
        let newIndex = GridUtils.interpretGridKeyPress(e, this.selectedIndex, 5, $memberItems.length);

        if (newIndex !== null) {
            $memberItems.eq(oldIndex)
                .attr("tabindex", -1)
                .attr("aria-selected", "false");
            $memberItems.eq(newIndex)
                .attr("tabindex", 0)
                .attr("aria-selected", "true")
                .focus();
            this.selectedIndex = newIndex;

            e.preventDefault();
            e.stopPropagation();
        }
    }

    /**
     * Creates a div to contain team members
     * @returns {JQuery} container
     */
    private getMembersContainer(): JQuery {
        var membersContainer = $("<div/>")
            .addClass(TeamMembersWidget.DomClass_MembersContainer)
            .addClass("bowtie")
            .attr("role", "grid")
            .attr("aria-colcount", 5)
            .attr("aria-rowcount", 2);
        membersContainer.appendTo(this.getElement());
        return membersContainer;
    }

    /**
    * Gets only displayable number of members
    * @param {MemberInfo[]} members team members
    * @param {number} maxMembersToShow number of team members that can be displayed
    * @returns {MemberInfo[]} Displayable number of team members
    */
    public static _getMembersToDisplay(members: MemberInfo[], maxMembersToShow: number): MemberInfo[] {
        // Limit the members added to the widget
        if (members.length > maxMembersToShow) {
            members = members.slice(0, maxMembersToShow);
        }
        return members;
    }

    private hasLessThanTwoUsers(memberCount: Number): boolean {
        return memberCount < 2;
    }

    /**
    * Gets the relative path to randomly choosen team member's image
    * @returns {string} Relative path to image
    */
    public _getInviteAFriendImage(): string {
        this.chosenImageNumber = TeamMembersWidget._getRandomIntInclusive(1, TeamMembersWidget.MaxInviteAFriendImages);
        var imageFile = Utils_String.format("teamMembers-{0}.png", this.chosenImageNumber);
        return Utils_String.format("{0}{1}/{2}", TFS_Host_TfsContext.TfsContext.getDefault().configuration.getResourcesPath(), "Widgets", encodeURIComponent(imageFile));
    }

    /**
    * Adds invite a friend image to given container
    * @params {JQuery} Container that holds image
    */
    private addInviteFriendImage(container: JQuery): void {
        var image = $("<img/>")
            .attr("src", this._getInviteAFriendImage());
        container.append(image);
    }

    /**
    * Adds invite a friend message to given container
    * @params {JQuery} Container that holds message
    * @params {messageHtml} A message in trusted html string. Caller is responsible for ensuring the safety of the string.
    */
    private addInviteFriendMessage(container: JQuery, trustedMessageHtml: string): void {
        var caption = $("<div/>")
            .addClass(TeamMembersWidget.CSSClass_InviteAFriendMessage)
            .html(trustedMessageHtml);
        container.append(caption);
    }

    /**
    * Adds invite a friend button to given container
    * Clicking this button will open up Manage members dialog
    * @params {JQuery} Container that holds button
    */
    public _addInviteFriendButton(container: JQuery): void {
        var inviteFriendButton: JQuery = $("<button/>")
            .addClass("cta")
            .addClass(TeamMembersWidget.CSSClass_InviteAFriendButton)
            .text(TFS_Resources_Widgets.TeamMembers_InviteAFriend)
            .click((e: JQueryEventObject) => {
                this.publishTelemetry("Action", "InviteFriend");
                this._onManageMembersClick(e);
            });
        container.append(inviteFriendButton);
    }

    /**
    * Adds invite a friend container with image, message and button
    */
    public _addInviteAFriend(): void {
        if (!this.userIsAdmin) {
            return;
        }

        var inviteMembersContainer = $("<div/>")
            .addClass(TeamMembersWidget.DomClass_InviteAFriendContainer);

        var imageContainer = $("<div/>")
            .appendTo(inviteMembersContainer);
        this.addInviteFriendImage(imageContainer);

        var messageContainer = $("<div/>")
            .addClass("bowtie")
            .addClass(TeamMembersWidget.DomClass_InviteAFriendMessageContainer)
            .appendTo(inviteMembersContainer);
        this.addInviteAFriendAligner(messageContainer);

        this.getElement().append(inviteMembersContainer);
    }

    /**
    * Adds invite a friend message and button, also center them horionzontally
    * so when messages are in single or double line, they are centered
    * @params {JQuery} Container that holds aligner
    */
    private addInviteAFriendAligner(container: JQuery): void {
        var messageAligner = $("<div/>")
            .addClass(TeamMembersWidget.DomClass_InviteAFriendMessageAligner)
            .appendTo(container);

        var htmlMessage = TeamMembersWidget.ImageCaptions[this.chosenImageNumber - 1]; //A set of pre-defined resources with html messages
        this.addInviteFriendMessage(messageAligner, htmlMessage);
        this._addInviteFriendButton(messageAligner);
    }

    /**
    * Toggles display of Invite a friend message
    * @params {boolean} show - if TRUE admin will see invite a friend message and button, it is hidden if FALSE
    */
    private toggleInviteAFriend(show: boolean): void {
        var container = $("." + TeamMembersWidget.DomClass_InviteAFriendContainer);
        container.toggle(show);
    }

    /**
    * Renders add team member button inside the container
    * @params {JQuery} memberContainer - 
    */
    public _renderAddMembersButton(): JQuery {
        var addIcon: JQuery = $("<i/>")
            .addClass("bowtie-icon")
            .addClass("bowtie-math-plus");

        var $addMembersButton: JQuery = $("<button/>")
            .addClass(TeamMembersWidget.CSSClass_AddMember)
            .addClass(TeamMembersWidget.DomClass_MembersItem)
            .addClass("btn-cta")
            .attr("type", "button")
            .attr("aria-label", TFS_Resources_Widgets.TeamMember_ManageAriaLabel)
            .click((e: JQueryEventObject) => {
                this.publishTelemetry("Action", "AddButton");
                this._onManageMembersClick(e);
            })
            .append(addIcon)
            .fadeIn("slow");

        Utils_UI.accessible($addMembersButton);
        PopupContent.RichContentTooltip.add(TFS_Resources_Widgets.TeamMembers_ManageTeamMembers, $addMembersButton);

        return $addMembersButton;
    }

    /**
    * Creates an element representing a member to render in the widget.
    * @param member Information about the member.
    * @returns {JQuery}
    */
    public _createMemberElement(member: MemberInfo): JQuery {
        var memberDetails = Utils_String.format("{0} <{1}>", member.displayName, member.uniqueName);
        var $memberDiv: JQuery = $("<div/>")
            .addClass(TeamMembersWidget.DomClass_Member)
            .addClass(TeamMembersWidget.DomClass_MembersItem)
            .attr("aria-haspopup", "true")
            .attr("aria-expanded", "false")
            .attr("aria-label", memberDetails)
            .fadeIn("slow"); //slow takes 600ms to complete fadeIn animation

        PopupContent.RichContentTooltip.add(memberDetails, $memberDiv);

        var $img: JQuery = $("<img />")
            .addClass(TeamMembersWidget.DomClass_IdentityImage);

        // Create member icon and append to div
        $img.attr("src", this._getMemberImageUrl(member))
            .addClass("identity-" + member.id)
            .attr("alt", memberDetails)
            .appendTo($memberDiv);

        // Attach profile card to avatar
        if (FeatureAvailabilityService.isFeatureEnabled(Constants_Platform.WebPlatformFeatureFlags.ReactProfileCard)) {
            $memberDiv.on("click", () => {
                this.renderProfileCard(member.uniqueName, $memberDiv);
            }).addClass("cursor-hover-card");
            
            // focus for accessibility lands on memberDiv jQuery element
            $memberDiv.keydown((eventObject: JQueryEventObject) => { this.onKeydownHandler(eventObject, member.uniqueName, $memberDiv); })
        }

        return $memberDiv;
    }

    private onKeydownHandler(eventObject: JQueryEventObject, uniqueAttribute: string, anchor: JQuery) {
        if (eventObject.which === Utils_UI.KeyCode.SPACE || eventObject.which === Utils_UI.KeyCode.ENTER) {
            this.renderProfileCard(uniqueAttribute, anchor);
        }
    }

    private renderProfileCard(uniqueAttribute: string, anchor: JQuery) {
        // Get location to render
        const $membersContainer = $(".members-container").eq(0);
        let $cardsContainer = $membersContainer.find('.cards-container');
        anchor.attr("aria-expanded", "true")
        if ($cardsContainer.length === 0) {
            $cardsContainer = $("<div class='cards-container' />")
                .appendTo($membersContainer);
        }

        // Build and render component
        const personaCardElementProperties = {
            uniqueAttribute: uniqueAttribute,
            target: anchor[0],
            entityOperationsFacade: VSS_Service.getService(Picker_Controls.EntityOperationsFacade),
            consumerId: "9377CDB7-F875-448C-9A5D-E1CB5EC09B1B",
            onDismissCallback: () => {
                anchor.attr("aria-expanded", "false")
                ReactDOM.unmountComponentAtNode($cardsContainer[0])
            }
        };

        const personaCardElement = React.createElement(PersonaCard, personaCardElementProperties);
        ReactDOM.render(
            personaCardElement,
            $cardsContainer[0]
        );
    }

    /**
    * Returns a url for getting the member's profile image
    */
    public _getMemberImageUrl(member: MemberInfo): string {
        return TFS_Host_TfsContext.TfsContext.getDefault().getIdentityImageUrl(member.id);
    }

    /**
    * Adds text to the title bar describing the number of team members, but only
    * if the number of people on a team exceeds the number of people shown on the widget.
    * @param shownCount The number of members shown on the widget.
    * @param totalCount The total number of members in the team.
    */
    public _updateTeamMemberCountInTitleBar(shownCount: number, totalCount: number): void {
        if (shownCount > totalCount) {
            throw "The number of members shown on the widget cannot exceed the total number of members on the team";
        }

        var $memberCountElement: JQuery = this.getElement().find("." + TeamMembersWidget.DomClass_MemberCount);

        if ($memberCountElement.length > 0) {
            var text = "";
            if (totalCount > shownCount) {
                text = Utils_String.format(TFS_Resources_Widgets.TeamMembersWidget_ShowingFormat,
                    shownCount,
                    totalCount > TeamMembersWidget.MaxMemberResults ? "100+" : totalCount.toString());
            }

            $memberCountElement.text(text).attr("Title", text);
        }
    }

    /**
    * Adds View all button to title - Clicking this opens Manage Team Members Dialog
    * @params {JQuery} container that holds view all button
    */
    public _addViewAll(container: JQuery): void {
        if (!this.userIsAdmin) {
            return;
        }

        var button: JQuery = $("<button/>").addClass(TeamMembersWidget.CSSClass_ViewAll)
            .text(TFS_Resources_Widgets.TeamMembers_ViewAll)
            .attr("aria-label", TFS_Resources_Widgets.TeamMember_ViewAllAriaLabel)
            .click((e: JQueryEventObject) => {
                this.publishTelemetry("Action", "ViewAll");
                if (this.isManageMembershipDialogOpen) {
                    return;
                }
                this.isManageMembershipDialogOpen = true;
                this._openManageMembershipDialog();
            })
            .appendTo(container);

        Utils_UI.accessible(button);
    }

    /**
    * Toggles display of View all
    * @params {boolean} show - if TRUE admin will see View all, it is hidden if FALSE or it is non-admin user
    */
    public _toggleViewAll(show: boolean): void {
        if (!this.userIsAdmin) {
            return;
        }

        var container = $("." + TeamMembersWidget.CSSClass_ViewAll);
        container.toggle(show);
    }

    /**
    * Removes any member containers and clears the member count text from the widget.
    */
    private clearPreviouslyLoadedMembers(): void {
        // Remove any previously loaded members
        this.getElement().children("." + TeamMembersWidget.DomClass_MembersContainer).remove();

        // Remove any previously set member count text
        this.getElement().find("." + TeamMembersWidget.DomClass_MemberCount).text("");
    }

    //https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/random
    // Returns a random integer between min (included) and max (included)
    // Using Math.round() will give you a non-uniform distribution!
    public static _getRandomIntInclusive(min: number, max: number): number {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
}

SDK.VSS.register("dashboards.teamMembers", () => TeamMembersWidget);
SDK.registerContent("dashboards.teamMembers-init", (context) => {
    return Controls.create(TeamMembersWidget, context.$container, context.options);
});
