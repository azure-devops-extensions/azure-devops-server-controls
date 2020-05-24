
//----------------------------------------------------------
// Generated file, DO NOT EDIT.
// To regenerate this file, run "GenerateConstants.cmd" .

// Generated data for the following assemblies:
// Microsoft.TeamFoundation.Server.WebAccess.Platform
// Microsoft.VisualStudio.Services.ExtensionManagement.Sdk.Server
//----------------------------------------------------------


export module ContributedServiceContextData {
    /**
    * The data provider key for contributed service contexts
    */
    export var ContributedServiceContextDataKey = "WebPlatform.ContributedServices";
    /**
    * The dataType property value used for ContributedServiceContext data providers
    */
    export var ContributedServiceDataProviderType = "ServiceContext";
}

export module DataProviderConstants {
    /**
    * The full contribution type id for data providers
    */
    export var DataProviderContributionTypeId = "ms.vss-web.data-provider";
    /**
    * The contribution property name for the registered name of the data provider
    */
    export var ContributionNameProperty = "name";
    /**
    * The contribution property name for the service instance type id
    */
    export var ContributionInstanceTypeProperty = "serviceInstanceType";
    /**
    * The resolution property is optional and defines how the resolution of this data provider should be treated.  Values: Server (default) - The Server will try and resolve the data provider during the initial data provider execution process. If it fails, it will include error details about the failure, and will also include details about how the data provider can be resolved from the client.  ServerOnly - Same as Server except upon failure, only failure details are returned and no information about how to resolve the dataprovider from the client. This may be used for a number of reasons, like security, or accessibility of the target.  Client - The Server will just serialize the data needed to resolve the data provider and leave it up to the client to resolve it when the client requires the data. This is common when the data is either optional or we dont want the request to wait for this data provider to be resolved.
    */
    export var ContributionResolutionProperty = "resolution";
    export var ContributionResolutionServer = "Server";
    export var ContributionResolutionServerOnly = "ServerOnly";
    export var ContributionResolutionClient = "Client";
    /**
    * If the contribution wants specific properties available in the providerContext it can provide the name of a propertyProvider that will get be run. This is particularly useful when the data provider is a remote data provider and wants to gather data from the incoming request to forward to the remote service.
    */
    export var ContributionPropertyProviderProperty = "propertyProvider";
    /**
    * The contribution property name for the "data type" property which consumers can use to classify the type of data being returned by this provider.
    */
    export var ContributionDataTypeProperty = "dataType";
}

export module HtmlProviderConstants {
    /**
    * The full contribution type id for html providers
    */
    export var ContributionType = "ms.vss-web.html-provider";
    /**
    * The contribution property name for the registered name of the html provider
    */
    export var ContributionNameProperty = "name";
}

export module PropertyProviderConstants {
    /**
    * The full contribution type id for property providers
    */
    export var ContributionType = "ms.vss-web.property-provider";
    /**
    * The contribution property name for the registered name of the property provider
    */
    export var ContributionNameProperty = "name";
}

/**
* Constants used to report customer intelligence area data
*/
export module WebAccessCustomerIntelligenceConstants {
    export var Area = "Microsoft.TeamFoundation.WebAccess";
    export var WebSettingsStoreSettingFeature = "StoreSetting";
    export var FullScreenModeFeature = "FullScreenMode";
    export var InvalidLicenseExceptionFeature = "InvalidLicenseException";
}

/**
* Constants used for mobile
*/
export module WebAccessMobileConstants {
    export var BypassMobileCookieName = "VstsBypassMobile";
}

/**
* Constants used for VSSF\WebPlatform Feature Availability flags Note: This should only be flags consumed in platform-level typescript code or controllers.
*/
export module WebPlatformFeatureFlags {
    export var VisualStudioServicesContributionUnSecureBrowsers = "VisualStudio.Services.Contribution.EnableOnPremUnsecureBrowsers";
    export var ClientSideErrorLogging = "VisualStudio.Service.WebPlatform.ClientErrorReporting";
    export var UseGalleryCdn = "Microsoft.VisualStudio.Services.Gallery.Client.UseCdnAssetUri";
    export var MarkdownRendering = "VisualStudio.Services.WebAccess.MarkdownRendering";
    export var SubresourceIntegrity = "VisualStudio.Services.WebAccess.SubresourceIntegrity";
    export var ReactProfileCard = "VisualStudio.Services.IdentityPicker.ReactProfileCard";
    export var UseNewBranding = "VisualStudio.Services.WebPlatform.UseNewBranding";
}

