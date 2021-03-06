export var CreateVariableGroupHelpText = "Create groups of variables that you can share \u003cbr/\u003e across multiple pipelines.";
export var CloneText = "Clone";
export var CloneVariableGroupError = "You do not have permissions to clone the key vault variable group \u0027{0}\u0027. You need to be added as \u0027User\u0027 role for the azure service connection used in the key vault.";
export var DeleteText = "Delete";
export var DescriptionText = "Description";
export var EditText = "Edit";
export var HelpText = "Help";
export var DateModifiedText = "Date modified";
export var LearnMoreAboutVariableGroupsHelpText = "\u003ca  href=\u0027{0}\u0027 target=\u0027_blank\u0027\u003eLearn more about variable groups.\u003c/a\u003e";
export var NameText = "Name";
export var ChooseSecretsTitle = "Choose secrets";
export var ChooseSecretsMessage = "Choose secrets to be included in this variable group";
export var CancelText = "Cancel";
export var OkText = "Ok";
export var FailedToDeleteSecretText = "Failed to delete secret";
export var ARIALabelSecretsTable = "Secrets table";
export var SecretNameText = "Secret name";
export var ContentTypeText = "Content type";
export var StatusText = "Status";
export var ExpiresText = "Expiration date";
export var EnabledText = "Enabled";
export var DisabledText = "Disabled";
export var NeverText = "Never";
export var ChangingVariableGroupTypeTitle = "Variable group";
export var ConfirmText = "Confirm";
export var ChangingVariableGroupToCustomMessage = "Toggling this switch would unlink the Azure key vault from this variable group and would erase all key vault variables previously saved with this variable group. Are you sure you want to continue?";
export var ChangingVariableGroupToKeyVaultMessage = "Toggling this switch would erase all variables previously saved with this variable group. Are you sure you want to continue?";
export var ChangingSelectedSubscriptionMessage = "Changing subscription would erase all selected key vault variables previously saved with this variable group. Are you sure you want to continue?";
export var ChangingSelectedKeyVaultMessage = "Changing key vault name would erase all selected key vault variables previously saved with this variable group. Are you sure you want to continue?";
export var UnSupportedVariableGroupTypeFormat = "Variable group type {0} is not supported.";
export var NewVariableGroupText = "New variable group";
export var SaveText = "Save";
export var ModifiedByText = "Modified by";
export var VariableGroupNameText = "Variable group name";
export var LibraryHubTitle = "Library";
export var VariableGroupsTabTitle = "Variable groups";
export var PropertiesTabTitle = "Properties";
export var VariablesText = "Variables";
export var ValueText = "Value";
export var DeleteVariableGroup = "Delete variable group";
export var DeleteVariableGroupHelpText = "Delete might affect the pipelines using this variable group. \u003cbr/\u003eAre you sure you want to proceed?";
export var InvalidDuplicateVariableName = "Variable Name is already used.";
export var InvalidVariableGroupName = "Variable group name is invalid.";
export var DeleteVariableText = "Delete variable";
export var SecretText = "Secret";
export var VariableGroupMenuItemTitleBar = "Variable group";
export var SecureFilesTabTitle = "Secure files";
export var SearchTextSecureFiles = "Search secure files";
export var UploadSecureFileText = "Upload a secure file";
export var SecureFileText = "Secure file";
export var LearnMoreAboutSecureFilesHelpText = "\u003ca  href=\u0027{0}\u0027 target=\u0027_blank\u0027\u003eLearn more about secure files.\u003c/a\u003e";
export var UploadSecureFileHelpText = "Upload sensitive files such as certificates and signing keys \u003cbr/\u003e and securely use them in your pipelines.";
export var DeleteSecureFile = "Delete secure file";
export var DeleteSecureFileHelpText = "Deleting will affect any build and release pipelines using this secure file. \u003cbr/\u003eAre you sure you want to proceed?";
export var InvalidSecureFileName = "Provide a valid file name for the secure file.";
export var SecureFileNameText = "Secure file name";
export var SecureFilePropertiesHelpText = "Optionally define properties for the secure file.";
export var SecureStringHelpText = "To avoid storing \"secureString\" parameters in plain text, it is recommended that you use secret variables, for example \"$(variableName)\".";
export var SecureStringToolTip = "This parameter is a \u0027secureString\u0027. To avoid storing \u0027secureString\u0027 parameters in plain text, it is recommended that you use secret variables, for example \u0027$(variableName)\u0027.";
export var LoadMoreText = "Load more";
export var CopyScriptToClipboard = "Copy script to clipboard";
export var RefreshKeyVaultsList = "Refresh key vaults list";
export var SelectSecretText = "Select";
export var DeleteSecretText = "Delete";
export var AzureKeyVaultSpnPermissionsScriptFormatPowerShell = "```powershell\r\n{0}\r\n```";
export var AzureKeyVaultSpnPermissionsOnPremErrorText = "Specified Azure service connection needs to have \"Get, List\" secret management permissions on the selected key vault. Set these secret permissions in Azure portal or run the following commands in powershell window.";
export var AzureKeyVaultSpnPermissionsHostedErrorText = "The specified Azure service connection needs to have \"Get, List\" secret management permissions on the selected key vault. Click \"Authorize\" to enable Azure Pipelines to set these permissions or manage secret permissions in the Azure portal.";
export var AzureKeyVaultInfoText = "Toggle this button to link an Azure key vault and map selective vault secrets to this variable group.";
export var LearnMoreText = "Learn more";
export var ManageInAzurePortalText = "Manage";
export var LinkSecretsUsingAzureKeyVaultLabelText = "Link secrets from an Azure key vault as variables";
export var AddText = "Add";
export var AzureKeyVaultSubscriptionLabel = "Azure subscription";
export var AzureKeyVaultNameLabel = "Key vault name";
export var NoSecretsSelectedInfo = "No secrets selected. Click add button to select secrets.";
export var LastRefreshedOnLabelFormat = "Last refreshed: {0}";
export var KeyVaultsNotFoundText = "No key vaults found in the selected subscription.";
export var KeyVaultSecretsNotFoundText = "No secrets found in the selected key vault.";
export var KeyVaultNotFoundText = "Key vault {0} not found in the selected subscription.";
export var InvalidCSMFileURL = "Template path doesn\u0027t point to a valid JSON file";
export var InvalidCSMFile = "Template file provided is invalid. $schema, contentVersion, resources are required elements in your template";
export var InvalidCSMParametersFile = "Template parameters file provided is invalid. Template parameters should either have a reference or a value";
export var InvalidCSMParametersFileURL = "Template parameters path doesn\u0027t point to a valid JSON file";
export var DownloadFailedForCSMParametersFile = "Failed to download the file from template parameters path. This feature requires that CORS rules are enabled at the source. If file is in Azure storage blob, refer to {0} to enable CORS.";
export var extraParametersWarning = "Parameters specified are not found in template and could fail the deployment";
export var DownloadFailedForCSMFile = "Failed to download the file from template path. This feature requires that CORS rules are enabled at the source. If templates are in Azure storage blob, refer to {0} to enable CORS.";
export var CouldNotFetchTemplateParameters = "Error:";
export var TemplateLinkNotSupplied = "Template file path was not provided";
export var InvalidAllowedValuesField = "Allowed Values of a parameter should be of type array";
export var KeyVaultPlaceholder = "Type to override Azure Key Vault reference";
export var Security = "Security";
export var PermissionDeniedMessage = "You do not have permission to manage this item.";
export var SecurityDialogTitle = "Assign security roles for {0}";
export var VariableGroupText = "Variable group";
export var VariableText = "Variable";
export var NotSupportedArtifact = "Cannot fetch the file content of selected source provider / linked artifact. ";
export var SearchText = "Search variable groups";
export var LibraryItemMenuToolTip = "Actions";
export var LibraryItemsAriaLabel = "Library items";
export var IISHostnameLabel = "Hostname";
export var IISHostnameTooltip = "Enter a host name (or domain name) for the website. If a host name is specified, then the clients must use the host name instead of the IP address to access the website.";
export var IISIpAddressLabel = "IP Address";
export var IISIpAddressTooltip = "Provide an IP address that end-users can use to access this website. If \u0027All Unassigned\u0027 is selected, then the website will respond to requests for all IP addresses on the port and for the host name, unless another website on the server has a binding on the same port but with a specific IP address.";
export var IISPortLabel = "Port";
export var IISPortTooltip = "Provide the port, where the Hypertext Transfer Protocol Stack (HTTP.sys) will listen to the website requests.";
export var IISProtocolLabel = "Protocol";
export var IISProtocolTooltip = "Select HTTP for the website to have an HTTP binding, or select HTTPS for the website to have a Secure Sockets Layer (SSL) binding.";
export var IISSniLabel = "Server Name Indication required";
export var IISSniTooltip = "Select the option to set the Server Name Indication (SNI) for the website. SNI extends the SSL and TLS protocols to indicate the host name that the clients are attempting to connect to. It allows, multiple secure websites with different certificates, to use the same IP address.";
export var IISSslThumbprintLabel = "SSL certificate thumbprint";
export var IISSslThumbprintTooltip = "Provide the thumb-print of the Secure Socket Layer certificate that the website is going to use for the HTTPS communication as a 40 character long hexadecimal string. The SSL certificate should be already installed on the Computer, at Local Computer, Personal store.";
export var IISBindingTitle = "Binding";
export var IISMandatoryInputField = "Mandatory input field.";
export var VariableGroupNotFound = "Variable group with id {0} does not exist. Specify a valid id and try again.";
export var IISInavlidSSLThumbprint = "Invalid SSL thumbprint. Length is not 40 characters or contains non-hexadecimal characters.";
export var IISInvalidInputs = "Some input fields are missing or are invalid. Check the bindings.";
export var NewVariableGroupButtonName = "Add new variable group";
export var SearchResultsMessage = "{0} search results were found";
export var WebConfigParametersAppTypeInfoText = "A standard Web.config will be generated and deployed to Azure App Service if the application does not have one. The values in web.config can be edited and vary based on the application framework. For example for node.js application, web.config will have startup file and iis_node module values. And for python web.config will have PYTHONPATH, WSGI_HANDLER etc.";
export var TargetNotFound = "Target input not found";
export var ErrorParsingJson = "Error parsing json";
export var ParameterTypeNotSupported = "Cannot override this parameter type";
export var WebConfigParametersAppTypeText = "Application framework";
export var NotAPartOfTemplateHelpText = "This parameter is not a part of template. Deployment could fail";
export var AddBindingText = "Add Binding";
export var ThisText = " this ";
export var ParameterTypeIs = "This parameter is of \u0027{0}\u0027 type.";
export var ObjectOverrideHelpText = "To override, use stringified JSON objects. For example {\"key\" : \"value\"} or [\"val1\", \"val2\"]";
export var StringOverrideHelpText = "Enclose the value in quotes if there are words seperated with whitespace. For example \"word1 word2\" or \"$(var)\" if variable has whitespace. Use escaped characters if value has a quote, for example \"word\\\"withquote\"";
export var IntegerOverrideHelpText = "Value should be a valid integer";
export var DjangoSettingsModule = "If the ‘settings.py’ file exists, the value will be auto-detected. Value should be provided in the format ‘\u003cfolder containing settings.py\u003e.settings\u0027";
export var Handler = "Handler for node.js application";
export var NodeStartFile = "Startup file for node.js application";
export var PythonPath = "Absolute path for python.exe. Variables set in Output variable of Azure App Service Manage task can be consumed here. Example: $(python_ext_var)/python.exe";
export var PythonWFASTCGIPath = "Absolute path for wfastcgi.py. Variables set in Output variable of Azure App Service Manage task can be consumed here. Example: $(python_ext_var)/wfastcgi.py";
export var StaticFolderPath = "Path to serve static files";
export var WSGIHandlerBottle = "WSGI_HANDLER object for your Bottle application";
export var WSGIHandlerDjango = "WSGI_HANDLER object for your Django application";
export var WSGIHandlerFlask = "WSGI_HANDLER object for your Flask application";
export var AMRAddAlertButtonText = "Add alert rule";
export var AMRAlertNameHelpText = "Display name for Azure monitor alert.";
export var AMRAlertNameLabel = "Alert name";
export var AMRAlertRuleLabelPrefix = "Alert rule";
export var AMRConditionHelpText = "Select condition using which your metric will be evaluated.";
export var AMRConditionLabel = "Condition";
export var AMRInputValidationErrorMessage = "Input validation errors. ";
export var AMRMandatoryInputErrorMessage = "Mandatory input field.";
export var AMRMetricDefinitonsEmpty = "Unable to fetch metric definitions.";
export var AMRMetricsHelpText = "Select the resource metric you want to monitor.";
export var AMRMetricsLabel = "Metrics";
export var AMRPeriodHelpText = "Chose the Period of time that the metric rule must be satisfied before the alert triggers.";
export var AMRPeriodLabel = "Period";
export var AMRResourceIDEmptyError = "Unable to fetch resourceId for the resourceName : {0}. Check if the resource exists in the resource group. ";
export var AMRThresholdHelpText = "Threshold value for metric.";
export var AMRThresholdLabel = "Threshold";
export var AMRDeleteAlertAriaLabel = "Delete alert rule";
export var AMRErrorMessageBarAriaLabel = "Error message bar";
export var GoExeFileName = "Exe file for Go application";
export var ErrorParsingKubernetesSecretArguments = "Error parsing kubernetes secret arguments";
export var OAuthConfigurationAriaLabel = "OAuth configurations";
export var OAuthConfigurationListWindowTitle = "OAuth configurations";
export var OAuthConfigurationsDetailsEndpointTypeColumn = "Service Connection Type";
export var OAuthConfigurationsDetailsModifiedOnColumn = "Date modified";
export var OAuthConfigurationsDetailsNameColumn = "Name";
export var OAuthConfigurationsDetailsUrlColumn = "Url";
export var OAuthConfigurationsHubTitle = "OAuth configurations";
export var OAuthConfigurationsTabTitle = "OAuth configurations";
export var OAuthConfigurationWindowTitle = "OAuth Configuration";
export var ViewOAuthConfigurationToolTip = "View OAuth configuration: {0}";
export var OAuthConfigurationGettingStartedAbout = "OAuth client configurations define underlying settings that are required to set up service connections in your projects";
export var OAuthConfigurationGettingStartedButtonText = "Add OAuth configuration";
export var OAuthConfigurationGettingStartedLearnMore = "Learn more about OAuth client configurations";
export var OAuthConfigurationGettingStartedTitle = "Add OAuth configuration";
export var OAuthConfigurationTitle = "OAuth Configuration";
export var New = "Add";
export var SourceType = "Source Type";
export var ServerUrl = "{0} server URL";
export var ClientId = "Client Id";
export var ClientSecret = "Secret";
export var Create = "Create";
export var InvalidOAuthConfigurationId = "The OAuth Configuration Id is Invalid. It should be a valid GUID";
export var OAuthConfigurationDoesNotExist = "OAuth Configuration with id {0} does not exist. Specify a valid id and try again.";
export var UpdateSecretRequiredText = "You must provide secret to update the OAuth configuration";
export var DeleteOAuthConfiguration = "Delete OAuth configuration";
export var DeleteOAuthConfigurationHelpText = "You are about to delete the configuration {0}.";
export var OAuthConfigurationsDetailsModifiedByColumn = "Modified by";
export var ConfirmNavigation = "Are you sure you want to leave the page?";
export var OAuthConfigurationInvalidUrl = "The Url specified is not valid";
export var UnsavedChanges = "You have unsaved changes.";
export var DownloadFailedForLinkedCSMParametersFile = "Failed to download the template parameters file from the given path \u0027{0}\u0027 with the following error: {1}";
export var DownloadFailedForLinkedCSMFile = "Failed to download the template file from the given path \u0027{0}\u0027 with the following error: {1}";
export var AdditionalOptionsForDeployment = "Specify additional options for deployment of jar package on Azure App Service. For example spring.profiles.active=dev. Do not change -Dserver.port=%HTTP_PLATFORM_PORT% because only HTTP_PLATFORM_PORT is open for Azure App Service. Enclose this value in single quote.";
export var JarPathOnAppService = "Specify jar path on Azure App Service directory. For example D:\\\\home\\\\site\\\\wwwroot\\\\*.jar";
export var CopyText = "Copy";
export var AllowPipelineAccess = "Allow access to all pipelines";
export var VariableGroupPipelinePolicyHeader = "Pipeline policies";
export var VariableGroupPolicyTab = "Policies";
export var ErrorLoadingVGPolicy = "Error loading policy.{0}{1}";
export var ErrorSavingVGPolicy = "There was an error in saving the variable group. Please try again. {0}{1}";
export var ErrorSavingVGPolicyDuringCreation = "Variable group was created successfully.But there was an error in saving policy.{0}{1}";
export var LoadingInProgress = "Loading...";
export var ErrorDeletingVGPolicy = "Error deleting the variable group.Please try again{0}{1}";
export var NotAllPipelineAccess = "Don\u0027t allow access to all pipelines";
export var ErrorDeletingVg = "Error deleting the variable group.Policies for the variable group may have changed.Please try again{0}{1}";
export var AuthorizeForUseInAllPipelines = "Authorize for use in all pipelines";
