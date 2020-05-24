// Copyright (C) Microsoft Corporation. All rights reserved.
define("VSS/Features/Subscriptions/Resources", ["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.NewAzureSubscription = "New Azure subscription";
    exports.NewAzureSubscriptionAriaLabel = "Redirect to create a new azure subscription";
    exports.NoAzureSubscriptionsMessage = "No Azure subscription found.";
    exports.SubscriptionPickerTitle = "Select an Azure subscription";
    exports.LoadingSubscriptions = "Loading subscriptions ...";
    exports.CannotSetOrganizationSubscription = "Failed to set organization subscription.";
    exports.FailedSetNoSubscriptionFound = "The selected subscription was not found.";
    exports.FailedSetSubscriptionInvalid = "The selected subscription is not a valid subscription to be linked to the organization.";
    exports.ValidatingSubscription = "Validating subscription ...";
    exports.WaitingToValidate = "Waiting for subscription to validate ...";
    exports.SubscriptionValid = "Subscription is valid";
    exports.SubscriptionInvalid = "Subscription is not valid";
    exports.SubscriptionCannotBeUsedForPurchases = "This subscription cannot be used for purchases.";
    exports.SubscriptionHasSpendingLimit = "This subscription has a spending limit and cannot be used for purchases.";
    exports.NeedsToBeAdminOrCoAdminOnSubscription = "Requestor must be a service admin or service co-admin on the subscription which is required to be used for purchases";
    exports.SubscriptionNotAvailableInRegion = "This subscription is not valid for Azure DevOps organizations this organization\u0027s current region.";
    exports.SubscriptionNeedsCreditCard = "This subscription cannot be used because it does not have a credit card on file.";
    exports.SubscriptionNoLongerActive = "This subscription is no longer active.";
    exports.SubscriptionDeprecatedBilling = "This subscription is on a deprecated billing system and cannot be used for purchases.";
    exports.SubscriptionThroughCloudSolutionProvider = "This subscription was created through the Cloud Solution Provider program and cannot be used for purchases.";
    exports.SubscriptionTempSpendingLimit = "This subscription has a temporary spending limit for this billing cycle. A subscription with a spending limit cannot be used for purchases.";
});