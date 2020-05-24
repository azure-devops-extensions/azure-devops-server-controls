// Copyright (C) Microsoft Corporation. All rights reserved.
define("TFS/Admin/Views/GitHubConnection/Resources", ["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.GitHubConnectTitle = "GitHub";
    exports.GitHubConnectBody = "Your organization is not currently linked with any GitHub organization.";
    exports.GitHubDisconnectBody = "This organization is currently connected to a GitHub organization.";
    exports.GitHubConnectButtonLabel = "Connect";
    exports.GitHubDisconnectButtonLabel = "Disconnect";
    exports.GitHubDisconnectCancelButtonLabel = "Cancel";
    exports.GitHubConnectorUrl = "https://github.com/apps/azure-devops-connector/installations/new";
    exports.GitHubConnectInviteToggleLabel = "Allow users to invite users from GitHub";
    exports.Loading = "Loading";
    exports.GitHubOrganizationSubtitle = "GitHub Users Invitation";
    exports.GitHubConnectSubtitle = "Connect your GitHub Organization";
    exports.GitHubDisconnectTtitle = "Disconnect GitHub Organization";
    exports.GitHubDisconnectSubtitle = "GitHub Organization";
    exports.On = "On";
    exports.Off = "Off";
    exports.Toggle = "Toggle";
    exports.DisconnectDialogTitle = "Disconnect organization";
    exports.DisconnectDialogPrefixBody = "Are you sure you want to disconnect this Azure DevOps organization from the ";
    exports.DisconnectDialogSuffixBody = " organization?";
    exports.DisconnectDialogTermsBody = " This action will remove the free pipeline offer from this Azure DevOps organization. It does NOT uninstall the application from your Github organization.";
});