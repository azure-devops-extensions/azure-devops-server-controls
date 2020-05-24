import VSS = require("VSS/VSS");
import Context = require("VSS/Context");
import Controls = require("VSS/Controls");
import Dialogs = require("VSS/Controls/Dialogs");
import Navigation = require("VSS/Controls/Navigation");
import Navigation_HubsService = require("VSS/Navigation/HubsService");
import Navigation_Location = require("VSS/Navigation/Location");
import PopupContent = require("VSS/Controls/PopupContent");
import Service = require("VSS/Service");
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import Utils_UI = require("VSS/Utils/UI");

import AdminResources = require("Admin/Scripts/Resources/TFS.Resources.Admin");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import TFS_Admin_Common = require("Admin/Scripts/TFS.Admin.Common");
import TFS_Admin_Dialogs = require("Admin/Scripts/TFS.Admin.Dialogs");


var TfsContext = TFS_Host_TfsContext.TfsContext;
var tfsContext = TFS_Host_TfsContext.TfsContext.getDefault();
var delegate = Utils_Core.delegate;

class TeamAdminsControl extends Controls.BaseControl {
    public static enhancementTypeName: string = "tfs.admin.TeamAdminsControl";

    private _identityListControl: any;

    constructor(options?) {
        super(options);
    }

    public initialize() {
        super.initialize();

        this._identityListControl = <TFS_Admin_Common.IdentityListControl>Controls.BaseControl.createIn(TFS_Admin_Common.IdentityListControl, this.getElement(), {
            beforeRemove: delegate(this, this._onRemoveTeamAdmin)
        });
        this.refresh();
    }

    public refresh() {
        this._identityListControl.quickClear();

        if (!this._options.admins) {
            return;
        }

        for (var i = 0; i < this._options.admins.length; i++) {
            var identity = this._options.admins[i];
            this._identityListControl.addIdentity(identity.DisplayName, identity.DisplayName, identity.TeamFoundationId, identity.SubHeader);
        }
    }

    private _onRemoveTeamAdmin(params?) {
        var tfid = params.tfid, adminName = params.name;

        Dialogs.show(TFS_Admin_Dialogs.RemoveTeamAdminDialog, {
            teamTfId: this._options.currentIdentity.TeamFoundationId,
            tfid: tfid,
            text: Utils_String.format(AdminResources.RemoveTeamAdmin, adminName, this._options.currentIdentity.FriendlyDisplayName),
            successCallback: delegate(this, this._onAdminRemoved)
        });

        // Prevent removing from list
        return false;
    }

    private _onAdminRemoved(params?) {
        var tfid = params.tfid;
        this._identityListControl.removeIdentity(tfid);
        this._fire('admin-removed');
    }
}

VSS.initClassPrototype(TeamAdminsControl, {
    _identityListControl: null
});

Controls.Enhancement.registerEnhancement(TeamAdminsControl, '.team-admins-list')

enum MembershipQuery {
    None = 0,
    Direct = 1,
    Expanded = 2,
}

class TeamOverviewMembersControl extends TFS_Admin_Common.MembershipControl {
    public static enhancementTypeName: string = 'tfs.admin.TeamOverviewMembersControl';

    private _filter: any;

    constructor(options?) {
        super($.extend({
            isTeam: true
        }, options));
    }

    public initialize() {
        super.initialize();
        TFS_Admin_Dialogs.ManageGroupMembersDialog.bindIdentityGridOpenGroup(this.getElement());
    }

    public _setupActions($header) {
        // Create actions
        var actionsControlElement = super._setupActions($header),
            membershipItems = [],
            that = this;

        // Setup the membership filter
        membershipItems.push({ value: "direct", text: AdminResources.Direct });
        membershipItems.push({ value: "expanded", text: AdminResources.Expanded });
        this._filter = <Navigation.PivotFilter>Controls.BaseControl.createIn(Navigation.PivotFilter, actionsControlElement, {
            text: AdminResources.Membership,
            items: membershipItems,
            change: function (item) {
                that._prepareInitialize();
                that.refreshIdentityGrid();
                return false;
            }
        });

        return actionsControlElement;
    }

    public _prepareInitialize() {
        var actionParams = this._prepareActionParams();
        this._options.gridOptions = {
            identityListAction: actionParams.actionUrl,
            searchParams: actionParams.params,
            preventEdit: actionParams.params.scopedMembershipQuery === MembershipQuery.Expanded,
            host: this.getElement(),
            initialSelection: false
        };
    }

    public _prepareActionParams(): { actionUrl: string; params: any; } {
        var membershipQuery = MembershipQuery.Direct;
        if (this._filter) {
            membershipQuery = this._filter.getSelectedItem().value === 'direct' ? MembershipQuery.Direct : MembershipQuery.Expanded;
        }
        return {
            actionUrl: this._options.tfsContext.getActionUrl('ReadGroupMembers', 'identity', { area: 'api' }),
            params: {
                scope: this._options.joinToGroupTfid,
                readMembers: this._options.editMembers,
                scopedMembershipQuery: membershipQuery
            }
        };
    }

    public show() {
        this.getElement().show();
    }

    public hide() {
        this.getElement().hide();
    }
}

VSS.initClassPrototype(TeamOverviewMembersControl, {
    _filter: null
});

VSS.classExtend(TeamOverviewMembersControl, TfsContext.ControlExtensions);

class TeamOverviewControl extends Controls.BaseControl {
    public static enhancementTypeName: string = 'tfs.admin.TeamOverviewControl';

    private _teamAdminsControl: any;
    private _teamMembersGrid: TeamOverviewMembersControl;
    private _$membersHeader: JQuery;

    constructor(options?) {
        super(options);
    }

    public initialize() {
        super.initialize();

        var $element = this.getElement();

        const $profilePicture = $element.find(".profile-picture a");
        PopupContent.RichContentTooltip.add(AdminResources.ClickToChangeImage, $profilePicture);
        $profilePicture.find("img").removeAttr("title").addClass("identity-" + this._options.currentIdentity.TeamFoundationId);

        $profilePicture
            .keydown((ev: any) => {
                Utils_UI.buttonKeydownHandler(ev);
            })
            .click(delegate(this, this._onChangeProfileImage));
        this._teamAdminsControl = <TeamAdminsControl>Controls.BaseControl.createIn(TeamAdminsControl, $('.team-admins', $element), this._options);

        $('.add-team-admin', $element)
            .keydown((ev: any) => {
                Utils_UI.buttonKeydownHandler(ev);
            })
            .click(delegate(this, this._onAddTeamAdmin));

        this._populateTeamSettingsLinks($('.team-links-section'));

        $('.hub-title', this.getElement()).attr("role", "heading").attr("aria-level", 1);

        this._$membersHeader = $('.fixed-header', $element);

        // Set up vertical fill layout after header is created and before grid is created
        Controls.Enhancement.enhance(TFS_Admin_Common.VerticalFillLayout, $('.content', $element));

        this._teamMembersGrid = <TeamOverviewMembersControl>Controls.Enhancement.enhance(TeamOverviewMembersControl, $('.membership-control', $element), {
            joinToGroupTfid: this._options.currentIdentity.TeamFoundationId,
            height: '100%',
            editMembers: true,
            includeSearch: false,
            showAddAadMembers: (tfsContext.isHosted && tfsContext.isAADAccount) ? true : false
        });

        this._showTeamMembersGrid();

        $element.bind('member-count-changed', delegate(this, this._onRefresh));
    }

    private _populateTeamSettingsLinks($container: JQuery) {
        if ($container.length) {
            this._addSettingLink($container.find(".notifications-settings-link"), "notifications");
            this._addSettingLink($container.find(".dashboards-settings-link"), "dashboards");
            const $workSettingsLink = $container.find(".work-settings-link");

            if($workSettingsLink)
            {
                this._addSettingLink($workSettingsLink, "work-team", "ms.vss-work-web.work-hub-group");
            }            
        }
    }

    private _addSettingLink($link: JQuery, pivotName: string, app?: string) {

        const locationService = Service.getLocalService(Navigation_Location.LocationService);
        const projectName = Context.getDefaultWebContext().project.name;
        const teamId = Context.getDefaultWebContext().team.id;
        const url = locationService.routeUrl("ms.vss-admin-web.project-admin-hub-route", { project: projectName, adminPivot: pivotName, teamId: teamId, app: app });

        const hubsService = Service.getLocalService(Navigation_HubsService.HubsService);
        $link.click(hubsService.getHubNavigateHandler("ms.vss-admin-web.project-admin-hub", url)).keydown(Utils_UI.buttonKeydownHandler).attr("href", url);
    }
    
    private _showTeamMembersGrid(): void {
        this._$membersHeader.show();
        this._teamMembersGrid.show();
        $(window).trigger('resize');
    }

    private _onChangeProfileImage() {
        Dialogs.show(TFS_Admin_Dialogs.ChangeImageDialog, { tfid: this._options.currentIdentity.TeamFoundationId, isGroup: true });

        // Prevent navigating to #
        return false;
    }

    private _onAddTeamAdmin() {
        var currentIdentity = this._options.currentIdentity;

        Dialogs.Dialog.show<Dialogs.Dialog>(
            TFS_Admin_Common.AdminUIHelper.isAdminUiFeatureFlagEnabled() ? TFS_Admin_Dialogs.IdentityPickerTeamAdminDialog : TFS_Admin_Dialogs.AddTeamAdminDialog,
            {
                joinToGroupName: currentIdentity.FriendlyDisplayName,
                joinToGroupTfid: currentIdentity.TeamFoundationId,
                mainTitle: currentIdentity.FriendlyDisplayName,
                contentHeader: AdminResources.AddTeamAdministrator,
                successCallback: delegate(this, this._onTeamAdminsAdded)
            });
        // Prevent navigating to #
        return false;
    }

    private _onTeamAdminsAdded(admins) {
        this._teamAdminsControl._options.admins = admins;
        this._teamAdminsControl.refresh();
        this._teamMembersGrid.refreshIdentityGrid();
    }

    private _onRefresh(args?, params?) {
        var memberCount = params.MemberCount;
        $('.member-count', this.getElement()).text(memberCount);
    }
}

Controls.Enhancement.registerEnhancement(TeamOverviewControl, '.team-overview-control')
