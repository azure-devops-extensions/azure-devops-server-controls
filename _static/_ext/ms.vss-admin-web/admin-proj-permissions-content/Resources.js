// Copyright (C) Microsoft Corporation. All rights reserved.
define("TFS/Admin/Views/ProjectPermissions/Resources", ["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.NameColumnName = "Name";
    exports.PermissionColumnName = "Permissions";
    exports.TypeColumnName = "Type";
    exports.ProjectPermissionsSubHeader = "Members";
    exports.AddMembersSuccess = "We successfully assigned permission level to \u003cb\u003e{0}\u003c/b\u003e members.";
    exports.AddMembersPartialSuccess = "We successfully assigned permission level to \u003cb\u003e{0}\u003c/b\u003e members and failed to assign permissions level to \u003cb\u003e{1}\u003c/b\u003e members. Please try again at a later time.";
    exports.AddMembersFailed = "We are unable to assign permission level at this time. Please try again at a later time or contact support for help.";
    exports.PermissionsTitleDescription = "Set the permissions in your project by groups and people.";
    exports.Groups = "groups";
    exports.EmptyMembersHeading = "No members found at this time";
    exports.EmptyMembersBody = "{0} does not have any members.";
    exports.FilterZeroDataMessage = "No {0} match your filter";
    exports.Loading = "Loading...";
    exports.DataProviderError = "We are unable to load project permissions settings at this time.  Please try again later.";
    exports.AddPanelTitle = "Add Users \u0026 Groups";
    exports.AddPanelDescription = "Assigning permission level to users";
    exports.PeoplePickerLabel = "Add Users \u0026 Groups";
});