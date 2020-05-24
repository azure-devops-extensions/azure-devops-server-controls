// Copyright (C) Microsoft Corporation. All rights reserved.
define("TFS/Admin/Groups/Pivots/Settings/Resources", ["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.GroupName = "Group name";
    exports.GroupDescription = "Description";
    exports.GroupProfileImage = "Group profile image";
    exports.EmptyGroupNameError = "Group name must not be empty";
    exports.GroupNameTooLargeError = "Group name must not contain more than 256 characters";
    exports.GroupNameEndingInPeriodError = "Group name must not end in a period (.)";
    exports.ReservedGroupNameError = "Invalid group name, please choose a different name";
    exports.NonPrintableCharactersNameError = "Group name must not include nonprintable characters in the ASCII value range of 1-31";
    exports.IllegalCharactersNameError = "Group name must not include the following characters: , \" / \\ [ ] : | \u003c \u003e + = ; ? *";
    exports.SaveButton = "Save";
    exports.SpinnerText = "Saving changes";
    exports.UploadImageAria = "Upload image";
    exports.AvatarAndNameSectionTitle = "Avatar and Name";
    exports.GroupAvatarTitle = "Group avatar";
    exports.DeleteGroupSettingsCardTitle = "Delete Group";
    exports.DeleteGroupSettingsCardText = "This action will affect all group members and cannot be undone.";
    exports.DeleteGroupButton = "Delete Group";
    exports.DeleteGroupDialogTitle = "Delete Group";
    exports.DeleteGroupConfirmationMessage = "Are you sure you want to delete the \"{0}\" group?";
    exports.DeleteGroupWarning = "This action will affect all group members and cannot be undone.";
    exports.MemberOf = "Member of";
});