// Copyright (C) Microsoft Corporation. All rights reserved.
define("Environments/ProviderCreateDetails/Kubernetes/Resources", ["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.AcceptUntrustedCertificates = "Accept untrusted certificates";
    exports.AvailabelAzureSubscriptionsTitle = "Available Azure subscriptions";
    exports.AvailableAzureConnectionsTitle = "Available Azure service connections";
    exports.AzureKubernetesService = "Azure Kubernetes Service";
    exports.Cluster = "Cluster";
    exports.ClusterName = "Cluster name";
    exports.ClusterCredentials = "Cluster credentials";
    exports.Existing = "Existing";
    exports.KubectlSecret = "Kubectl secret";
    exports.KubectlSecretLabel = "Secret";
    exports.KubectlSecretError = "Invalid kubectl secret provided. Please ensure that it is a valid JSON with \"{0}\" and \"{1}\" fields.";
    exports.KubernetesCustomProvider = "Generic provider (existing service account)";
    exports.Namespace = "Namespace";
    exports.New = "New";
    exports.ProviderLabel = "Provider";
    exports.ServerURLError = "Please check the syntax of URL";
    exports.ServerUrl = "Server URL";
    exports.ServiceAccount = "Service account";
    exports.ServiceAccountName = "Service account name";
    exports.Subscription = "Subscription";
    exports.ServerUrlSuggestionFormat = "Run {0} in your local shell to get server URL";
    exports.ServiceAccountSecretSuggestionHeading = "Run following sequential commands to get the secret value:";
    exports.ServiceAccountSuggestionFormat = "1. Get service account secret names by running {0}";
    exports.ServiceAccountSecretSuggestionFormat = "2. Use the output in {0}";
    exports.CreateNamespace = "Create new namespace";
    exports.SelectNamespace = "Select namespace";
    exports.NewNamespaceName = "Name of new namespace";
    exports.LoadingNamespaces = "Loading namespaces";
    exports.LoadingClusters = "Loading clusters";
    exports.CopyCommand = "Copy command to clipboard";
    exports.CreatingResource = "Validating and creating resource...";
    exports.SavingResource = "Validating and saving resource...";
    exports.SubscriptionLabel = "Azure subscription";
    exports.KubernetesResourceTitle = "Kubernetes resource";
    exports.NoClustersMessage = "No kubernetes clusters found";
    exports.ValidateCreate = "Validate and create";
    exports.ValidateSave = "Validate and save";
    exports.InvalidNamespace = "Namespace should contain only lowercase alphanumeric characters and hyphens, and start and end with an alphanumeric characters";
    exports.NamespaceExists = "Namespace already exists";
    exports.LoadingMore = "Loading more ...";
    exports.Loading = "Loading";
    exports.ValidateEndpointNotFound = "A service connection associated with this kubernetes resource could not be found. You may need to delete and reconfigure.";
    exports.ValidationDialogHeader = "Error in validations";
    exports.ValidationDialogMessage = "There were validation errors while processing the kubernetes resource. Please review the issues listed below";
    exports.ContinueAnywayButton = "Continue anyway";
    exports.StopButton = "Stop";
    exports.ValidationPollTimeoutMessage = "Timed out waiting for service connection to reach ready state. Make sure that the connection is ready before running the pipeline";
    exports.ServiceAccoutResourceCreationAborted = "Service account validation had errors and resource creation was aborted";
    exports.ServiceConnectionNotFound = "Service connection not found.";
});