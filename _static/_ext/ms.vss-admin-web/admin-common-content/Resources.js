// Copyright (C) Microsoft Corporation. All rights reserved.
define("TFS/Admin/Common/Resources", ["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.Agreement = "By uploading a file you certify that you have the right to distribute this picture and you agree to the {0}, {1}, and {2}.";
    exports.TermsOfService = "Terms of Service";
    exports.PrivacyStatement = "Privacy Statement";
    exports.CodeOfConduct = "Code of Conduct";
    exports.SelectImageLabel = "Select an image file on your computer (2.5MB max):";
    exports.ProfileImageLabel = "Profile avatar";
    exports.SaveButton = "Save";
    exports.ImageAlt = "Profile Avatar";
    exports.ChooseImage = "Choose image";
    exports.ResetLabel = "Reset";
    exports.DeleteButton = "Delete";
    exports.CancelButton = "Cancel";
    exports.FileSizeError = "Uploaded file exceeds maximum size.";
    exports.FileTypeError = "Allowed file extensions are {0}.";
    exports.Cancel = "Cancel";
    exports.RenameButton = "Save";
    exports.CloseButton = "Close";
    exports.CurrentName = "Current name:";
    exports.NewNameMessage = "Please retype the new name {0}";
    exports.LearnMore = "Learn more";
    exports.AriaRenameText = "Retype new name";
    exports.suggesstionsContainerAriaLabel = "Select users or groups";
    exports.Close = "Close";
    exports.DefaultTitle = "Users List";
    exports.OrganizationAlreadyLinked = "This organization is already connected to an Azure Active Directory tenant. Disconnect it from the Azure AD before attempted to connect it to a different Azure AD.";
    exports.OrganizationNotYetLinked = "This organization is not connected with an Azure Active Directory tenant. It must be connected before attempting to disconnect it from an Azure AD tenant.";
    exports.ErrorOccurredPleaseTryAgain = "An error occurred. Please refresh the page and try again.";
    exports.UserNotAuthorized = "The user is not authorized to access this resource. Please check with your organization admin for the action.";
    exports.AadMapExistingMembershipError = "We cannot map the current email to this identity because it is or has been a member of the Azure DevOps organization. Choose an identity that does not exist in the Azure DevOps organization.";
});