// Copyright (C) Microsoft Corporation. All rights reserved.
define("TFS/Admin/Views/OrganizationAad/Resources", ["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.OrganizationAadHeading = "Azure Active Directory";
    exports.Cancel = "Cancel";
    exports.AadConnectDescription = "Connect your organization to Azure Active Directory. This action maps existing Azure DevOps users in this organization to their corresponding identities in Azure AD. No content or history will be deleted.";
    exports.AadConnectLearnMore = "Follow steps and learn more.";
    exports.AadConnectLearnMoreUrl = "https://docs.microsoft.com/en-us/azure/devops/organizations/accounts/connect-organization-to-azure-ad?view=azure-devops";
    exports.AadConnectedDescription = "Your organization is connected to the \u003cb\u003e{0}\u003c/b\u003e directory.";
    exports.AadConnectButton = "Connect directory";
    exports.AadDisconnectButton = "Disconnect directory";
    exports.TenantId = "Tenant Id: {0}";
    exports.AadConnectSuccessLink = "\u003cb\u003e{0} member(s)\u003c/b\u003e ";
    exports.AadConnectSuccessDescriptionSecond = "of the \u003cb\u003e{0}\u003c/b\u003e organization in the \u003cb\u003e{1}\u003c/b\u003e Azure Active Directory because they aren\u0027t a member of the target directory. Once you sign out, you will have the opportunity to map these users to their new identities in the {1} directory, or to invite them as a guest into the {1} directory. ";
    exports.AadConnectedBannerDescription = "of the \u003cb\u003e{0}\u003c/b\u003e organization ";
    exports.AadConnectedBannerUnableToLogin = "can\u0027t sign in because they\u0027re not in the \u003cb\u003e{0}\u003c/b\u003e Azure Active Directory. ";
    exports.AadConnectedDeleteUsers = "Delete any unwanted users in Organization settings, and then \u003cb\u003eResolve\u003c/b\u003e for remaining members.";
    exports.DisconnectedUsersDialogTitle = "Disconnected users";
    exports.ConnectedResolveIssue = "to resolve this issue.";
    exports.AadConnectedDeleteUnwantedUsers = "You can delete any unwanted users via Organization settings. ";
    exports.AadConnectedToLearnMore = "To learn more, click ";
    exports.Here = "here.";
    exports.Resolve = "Resolve";
    exports.MappingLoadingMessage = "Mapping {0} users to {1} Azure Active Directory";
    exports.InviteLoadingMessage = "Inviting {0} users to {1} Azure Active Directory";
    exports.UserResolveActionSuccessMessage = "{0} organization member(s) mapped and {1} organization member(s) invited to the {2} Azure Active directory. Advise invited users to accept email invitations to gain access. ";
    exports.UserMappingSuccessMessage = "{0} organization member(s) mapped successfully. No further action needed at this time!";
    exports.UserInviteSuccessMessage = "{0} organization member(s) invited successfully to the {1} Azure Active directory. Advise invited users to accept email invitations to gain access. ";
    exports.UserResolveActionFailureMessage = "{0} organization member(s) failed to get mapped, and {1} organization member(s) failed to get invited to the Azure Active Directory. Please try again later and ";
    exports.UserInviteActionFailureLink = "\u003cb\u003e{0} organization member(s)\u003c/b\u003e ";
    exports.UserInviteActionFailureMessage = "failed to get invited to the Azure Active Directory. Please try again later and ";
    exports.UserResolveReviewDocumentation = "review the documentation ";
    exports.ResolvePanelUserMappingSuccess = "{0} organization member(s) mapped successfully. Resolve remaining disconnected members by inviting them to the Azure Active Directory.";
    exports.AadMainPageUserNoTenant = "You are not a member of any Azure Active Directories. Please request the Active Directory admin to add you as a member before proceeding to connect your Azure DevOps organization to an Azure Active Directory.";
    exports.AadConnectedLearnHowTo = "Learn how to {0}.";
    exports.AadConnectedLearnHowToSwitchTenant = "switch your connection from one Azure AD to another";
    exports.AadConnectedLearnHowToSwitchTenantLink = "https://aka.ms/azure-devops-change-aad";
    exports.AadConnectedLearnCheckOut = "Check out {0}.";
    exports.AadConnectedLearnFaq = "other frequently asked questions";
    exports.AadConnectedLearnHowToFaqLink = "https://aka.ms/azure-devops-faq-connectaad";
    exports.AadMappingUserErrorDialogTitlte = "Failed User Mappings";
});