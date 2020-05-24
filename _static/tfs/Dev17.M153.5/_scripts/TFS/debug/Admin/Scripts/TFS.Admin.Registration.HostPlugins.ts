/// <reference types="jquery" />

import Events_Action = require("VSS/Events/Action");
import HostUIActions = require("Presentation/Scripts/TFS/TFS.Host.UI.Actions");
import Menus = require("VSS/Controls/Menus");
import VSS = require("VSS/VSS");
import FeatureAvailability_Services = require("VSS/FeatureAvailability/Services");
import ServerConstants = require("Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import {
IUrlParameters,
MyExperiencesUrls
} from "Presentation/Scripts/TFS/TFS.MyExperiences.UrlHelper";

// Modules for compilation/type support only (no direct require statement)
import TFS_Admin_Resources_NO_REQUIRE = require("Admin/Scripts/Resources/TFS.Resources.Admin");
import TFS_Admin_Controls_NO_REQUIRE = require("Admin/Scripts/TFS.Admin.Controls");
import TFS_Admin_Dialogs_NO_REQUIRE = require("Admin/Scripts/TFS.Admin.Dialogs");
import UserCardCommands = require("Admin/Scripts/TFS.Admin.UserCard.Commands");

import Dialogs_NO_REQUIRE = require("VSS/Controls/Dialogs");
import Q_NO_REQUIRE = require("q");

function showJumpListDialog() {
    VSS.using(["Admin/Scripts/TFS.Admin.Dialogs", "Admin/Scripts/TFS.Admin.Controls", "VSS/Controls/Dialogs"], (_TFS_Admin_Dialogs: typeof TFS_Admin_Dialogs_NO_REQUIRE, _TFS_Admin_Controls_NO_REQUIRE: typeof TFS_Admin_Controls_NO_REQUIRE, _Dialogs: typeof Dialogs_NO_REQUIRE) => {
        _Dialogs.show(_TFS_Admin_Dialogs.JumpListDialog);
        $(window).trigger("browse-dialog-open");
    });
}

Menus.menuManager.attachExecuteCommand(function (sender, args) {
    let defaultContext: TFS_Host_TfsContext.TfsContext = TFS_Host_TfsContext.TfsContext.getDefault();
    switch (args.get_commandName()) {
        case "browseTeams":
        case "browseProjects":
            if (defaultContext.contextData.collection != undefined) {
                MyExperiencesUrls.getMyProjectsUrl(defaultContext.contextData.collection.name).then((url: string) => {
                    window.location.href = url;
                }, (error: Error) => {
                    showJumpListDialog();
                });
                return false;
            }
        case "browseCollections":
            showJumpListDialog();
            return false;
        case "manageUserProfile":
            if (FeatureAvailability_Services.FeatureAvailabilityService.isFeatureEnabled(ServerConstants.FeatureAvailabilityFlags.UseUserDetailsArea)) {
                UserCardCommands.openProfilePage();
            } else {
                VSS.using(["Admin/Scripts/TFS.Admin.Dialogs", "VSS/Controls/Dialogs"], (_TFS_Admin_Dialogs: typeof TFS_Admin_Dialogs_NO_REQUIRE, _Dialogs: typeof Dialogs_NO_REQUIRE) => {
                    _Dialogs.show(_TFS_Admin_Dialogs.UserProfileDialog, {});
                });
            }
            return false;
        case "create-team-project":
            MyExperiencesUrls.getCreateNewProjectUrl(
                defaultContext.navigation.collection.name,
                {
                    source: args._commandSource
                } as IUrlParameters).then((url: string) => {
                    window.location.href = url;
                }, (error: Error) => {
                    VSS.using(["Admin/Scripts/TFS.Admin.Dialogs", "VSS/Controls/Dialogs"], (_TFS_Admin_Dialogs: typeof TFS_Admin_Dialogs_NO_REQUIRE, _Dialogs: typeof Dialogs_NO_REQUIRE) => {
                        _Dialogs.show(_TFS_Admin_Dialogs.CreateProjectDialog, {
                            source: args._commandSource
                        });
                    });
                });
            return false;
        case "create-team":
            VSS.using(["Admin/Scripts/TFS.Admin.Dialogs", "VSS/Controls/Dialogs"], (_TFS_Admin_Dialogs: typeof TFS_Admin_Dialogs_NO_REQUIRE, _Dialogs: typeof Dialogs_NO_REQUIRE) => {
                _Dialogs.show(_TFS_Admin_Dialogs.CreateTeamDialog, {
                    source: args._commandSource,
                    navigateToTeamOnSuccess: true
                });
            });
            return false;
    }
});

var actionSvc = Events_Action.getService();
actionSvc.registerActionWorker(HostUIActions.ACTION_MANAGE_TEAM_MEMBERS, function (actionArgs, next) {
    VSS.using(["Admin/Scripts/TFS.Admin.Dialogs", "VSS/Controls/Dialogs"], (_TFS_Admin_Dialogs: typeof TFS_Admin_Dialogs_NO_REQUIRE, _Dialogs: typeof Dialogs_NO_REQUIRE) => {
        _Dialogs.Dialog.beginExecuteDialogAction(() => {
            _Dialogs.show(_TFS_Admin_Dialogs.ManageTeamMembersDialog, {
                teamName: actionArgs.teamName,
                joinToGroupTfid: actionArgs.teamId,
                dialogClosed: function (membersModified) {
                    if ($.isFunction(actionArgs.callback)) {
                        actionArgs.callback.call(this, membersModified);
                    }
                }
            });
        });
    });
});

actionSvc.registerActionWorker(HostUIActions.ACTION_NEW_PROJECT, function (actionArgs, next) {
    let defaultContext: TFS_Host_TfsContext.TfsContext = TFS_Host_TfsContext.TfsContext.getDefault();
    MyExperiencesUrls.getCreateNewProjectUrl(
        defaultContext.navigation.collection.name,
        {
            source: actionArgs.source
        } as IUrlParameters).then((url: string) => {
            window.location.href = url;
        }, (error: Error) => {
            VSS.using(["Admin/Scripts/TFS.Admin.Dialogs", "VSS/Controls/Dialogs"], (_TFS_Admin_Dialogs: typeof TFS_Admin_Dialogs_NO_REQUIRE, _Dialogs: typeof Dialogs_NO_REQUIRE) => {
                _Dialogs.Dialog.beginExecuteDialogAction(() => {
                    _Dialogs.show(_TFS_Admin_Dialogs.CreateProjectDialog, {
                        tfsContext: actionArgs.tfsContext,
                        source: actionArgs.source
                    });
                });
            });
        });
});

// TFS plugin model requires this call for each tfs module.
VSS.tfsModuleLoaded("TFS.Admin.Registration.HostPlugins", exports);
