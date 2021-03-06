// Copyright (C) Microsoft Corporation. All rights reserved.
define("ServiceHooks/Web/Admin/Resources", ["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.BladeActionActionLabel = "Perform this action";
    exports.BladeActionTitle = "Action";
    exports.BladeActionSubtitle = "Select and configure the action to perform";
    exports.BladeActionSettings = "Settings";
    exports.BladeServiceTitle = "Service";
    exports.BladeServiceSubtitle = "Select a service to integrate with.";
    exports.BladeServiceSupportedEvents = "Supported events:";
    exports.BladeServiceSupportedActions = "Supported actions:";
    exports.BladeServiceLearnMoreLink = "Learn more about this service";
    exports.BladeServiceAllEvents = "All events";
    exports.BladeManagedElsewhereBody = "Subscriptions for this service are managed by the consumer service. To create a new subscripton visit ";
    exports.BladeTriggerTitle = "Trigger";
    exports.BladeTriggerSubtitle = "Select an event to trigger on and configure any filters.";
    exports.BladeTriggerVisibilityBlurb = "Remember that selected events are visible to users of the target service, even if they don\u0027t have permission to view the related artifact.";
    exports.BladeTriggerEventTypeLabel = "Trigger on this type of event";
    exports.BladeTriggerFilters = "Filters";
    exports.ButtonBackText = "Back";
    exports.ButtonCancelText = "Cancel";
    exports.ButtonCloseText = "Close";
    exports.ButtonConfirmText = "Confirm";
    exports.ButtonCreateText = "Create";
    exports.ButtonFinishText = "Finish";
    exports.ButtonHistoryText = "History";
    exports.ButtonNextText = "Next";
    exports.ButtonRefreshText = "Refresh";
    exports.ButtonTestText = "Test";
    exports.DataActionName = "Action";
    exports.DataBy = "by";
    exports.DataConsumerName = "Consumer";
    exports.DataEventName = "Event";
    exports.DataModifiedAt = "Last modified";
    exports.DataNotification = "Notification";
    exports.DataOwnerName = "Owner";
    exports.DataStateName = "State";
    exports.DialogDiscardChangesTitle = "Discard changes?";
    exports.DialogDiscardChangesBody = "Any changes to this subscription will be lost if you cancel. Do you want to continue?";
    exports.ErrorMessageDataProviderFailed = "There was a problem loading your service hooks information; please refresh the page to try again.";
    exports.ErrorMessageNoViewPermissions = "You do not have permissions to view service hooks for this project";
    exports.HeaderTitle = "Service Hooks";
    exports.HeaderDescription = "Integrate with your favorite services by notifying them when events happen in your project";
    exports.HistoryFilterDaysBackPlaceholder = "Days back";
    exports.HistoryFilterDaysBackOneDay = "1 day";
    exports.HistoryFilterDaysBackTwoDays = "2 days";
    exports.HistoryFilterDaysBackOneWeek = "7 days";
    exports.HistoryTableSentAtHeader = "Sent at";
    exports.HistoryTableStatusHeader = "Status";
    exports.ResourceVersionLatest = "[Latest]";
    exports.StatusFailed = "Failed";
    exports.StatusProcessing = "Processing";
    exports.StatusSucceeded = "Succeeded";
    exports.SubscriptionStatusEnabled = "Enabled";
    exports.SubscriptionStatusOnProbation = "On probation";
    exports.SubscriptionStatusDisabledByUser = "Disabled by user";
    exports.SubscriptionStatusDisabledBySystem = "Disabled by system";
    exports.SubscriptionStatusDisabledByInactiveIdentity = "Disabled by inactive identity";
    exports.Table7DayStatusName = "7 Day Status";
    exports.Table7DayStatusNone = "Nothing yet";
    exports.TableMenuDisable = "Disable";
    exports.TableMenuEnable = "Enable";
    exports.TableMenuDelete = "Delete";
    exports.TableMenuEdit = "Edit";
    exports.TableMenuHistory = "History";
    exports.TestSubscriptionDialogTitle = "Test subscription";
    exports.TestSubscriptionTabSummaryTitle = "Summary";
    exports.TestSubscriptionTabSummaryStatus = "Status";
    exports.TestSubscriptionTabSummarySentAt = "Sent at:";
    exports.TestSubscriptionTabSummaryMessage = "Message";
    exports.TestSubscriptionTabRequestTitle = "Request";
    exports.TestSubscriptionTabResponseTitle = "Response";
    exports.TestSubscriptionTabEventTitle = "Event";
    exports.Unknown = "Unknown";
    exports.ZeroDataPrimaryText = "There\u0027s nothing here";
    exports.ZeroDataSecondaryText = "Looks like this project doesn\u0027t have any service hooks set up. Create one to get started!";
    exports.ErrorMatchURL = "Value must be a URL";
    exports.ErrorMatchGuid = "Value must be a GUID";
    exports.ErrorLengthTooShort = "Value must be at least {0} characters long";
    exports.ErrorLengthTooLong = "Value must be less than {0} characters long";
    exports.ErrorRequired = "Value is required";
    exports.ErrorMatchPatten = "Value must match the pattern \"{0}\"";
    exports.FormInputOptional = "Optional";
    exports.FormInputRequired = "Required";
    exports.Loading = "Loading";
});