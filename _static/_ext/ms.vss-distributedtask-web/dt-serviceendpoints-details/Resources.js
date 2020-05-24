// Copyright (C) Microsoft Corporation. All rights reserved.
define("DistributedTaskUI/ServiceEndpoints/Details/Resources", ["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.NoResourceError = "Resource doesn\u0027t exist";
    exports.NoResourceUsageHeader = "Never Used";
    exports.LearnMoreText = "Learn more";
    exports.NoResourceUsageText = " about how to reference this service connection from your pipeline.";
    exports.DetailsCardTitle = "Details";
    exports.UsageCardTitle = "Usage";
    exports.CreatorTitle = "Creator";
    exports.ConnectionTypeTitle = "Service connection type";
    exports.DescriptionTitle = "Description";
    exports.DeleteDialogTitle = "Delete connection?";
    exports.DeleteDialogMessage = "Are you sure you want to delete this service connection? \n\r You cannot undo this action.";
    exports.DeletePrimaryButtonText = "Delete";
    exports.Cancel = "Cancel";
    exports.EmptyExecutionHistory = "Execution history doesn\u0027t exist";
    exports.EditPanelTitle = "Edit service connection";
    exports.noPermissionsMessage = "No Permission";
    exports.title = "User permissions";
    exports.CreateAzureRMServicePrincipalAutomaticHeading = "Azure Resource Manager using service principal (automatic)";
    exports.CreateAzureRMServicePrincipalManualHeading = "Azure Resource Manager using service principal (manual)";
    exports.CreateAzureRMManagedIdentityHeading = "Azure Resource Manager using managed identity";
});