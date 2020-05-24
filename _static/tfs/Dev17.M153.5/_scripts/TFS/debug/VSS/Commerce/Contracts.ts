/**
 * ---------------------------------------------------------
 * Generated file, DO NOT EDIT
 * ---------------------------------------------------------
 *
 * See following wiki page for instructions on how to regenerate:
 *   https://aka.ms/azure-devops-client-generation
 *
 * Configuration file:
 *   sps\clients\genclient.json
 */

"use strict";

/**
 * The subscription account namespace. Denotes the 'category' of the account.
 */
export enum AccountProviderNamespace {
    VisualStudioOnline = 0,
    AppInsights = 1,
    Marketplace = 2,
    OnPremise = 3
}

/**
 * Encapsulates azure specific plan structure, using a publisher defined publisher name, offer name, and plan name These are all specified by the publisher and can vary from other meta data we store about the extension internally therefore need to be tracked seperately for purposes of interacting with Azure
 */
export interface AzureOfferPlanDefinition {
    /**
     * Determines whether or not this plan is visible to all users
     */
    isPublic: boolean;
    /**
     * The meter id which identifies the offer meter this plan is associated with
     */
    meterId: number;
    /**
     * The offer / product name as defined by the publisher in Azure
     */
    offerId: string;
    /**
     * The offer / product name as defined by the publisher in Azure
     */
    offerName: string;
    /**
     * The id of the plan, which is usually in the format "{publisher}:{offer}:{plan}"
     */
    planId: string;
    /**
     * The plan name as defined by the publisher in Azure
     */
    planName: string;
    /**
     * The version string which optionally identifies the version of the plan
     */
    planVersion: string;
    /**
     * The publisher of the plan as defined by the publisher in Azure
     */
    publisher: string;
    /**
     * get/set publisher name
     */
    publisherName: string;
    /**
     * The number of users associated with the plan as defined in Azure
     */
    quantity: number;
}

/**
 * These are known offer types to VSTS.
 */
export enum AzureOfferType {
    None = 0,
    Standard = 1,
    Ea = 2,
    Msdn = 3,
    Csp = 4,
    Unsupported = 99
}

/**
 * Represents an azure region, used by ibiza for linking accounts
 */
export interface AzureRegion {
    /**
     * Display Name of the azure region. Ex: North Central US.
     */
    displayName: string;
    /**
     * Unique Identifier
     */
    id: string;
    /**
     * Region code of the azure region. Ex: NCUS.
     */
    regionCode: string;
}

/**
 * The responsible entity/method for billing.
 */
export enum BillingProvider {
    SelfManaged = 0,
    AzureStoreManaged = 1
}

export interface ConnectedServer {
    /**
     * Hosted AccountId associated with the connected server NOTE: As of S112, this is now the CollectionId. Not changed as this is exposed to client code.
     */
    accountId: string;
    /**
     * Hosted AccountName associated with the connected server NOTE: As of S112, this is now the collection name. Not changed as this is exposed to client code.
     */
    accountName: string;
    /**
     * Object used to create credentials to call from OnPrem to hosted service.
     */
    authorization: ConnectedServerAuthorization;
    /**
     * OnPrem server id associated with the connected server
     */
    serverId: string;
    /**
     * OnPrem server associated with the connected server
     */
    serverName: string;
    /**
     * SpsUrl of the hosted account that the onrepm server has been connected to.
     */
    spsUrl: string;
    /**
     * The id of the subscription used for purchase
     */
    subscriptionId: string;
    /**
     * OnPrem target host associated with the connected server.  Typically the collection host id
     */
    targetId: string;
    /**
     * OnPrem target associated with the connected server.
     */
    targetName: string;
}

/**
 * Provides data necessary for authorizing the connecter server using OAuth 2.0 authentication flows.
 */
export interface ConnectedServerAuthorization {
    /**
     * Gets or sets the endpoint used to obtain access tokens from the configured token service.
     */
    authorizationUrl: string;
    /**
     * Gets or sets the client identifier for this agent.
     */
    clientId: string;
    /**
     * Gets or sets the public key used to verify the identity of this connected server.
     */
    publicKey: string;
}

export interface IAzureSubscription {
    anniversaryDay: number;
    created: Date;
    id: string;
    lastUpdated: Date;
    namespace: AccountProviderNamespace;
    offerType: AzureOfferType;
    source: SubscriptionSource;
    status: SubscriptionStatus;
}

export interface ICommerceEvent {
    /**
     * Billed quantity (prorated) passed to Azure commerce
     */
    billedQuantity: number;
    collectionId: string;
    collectionName: string;
    /**
     * Quantity for current billing cycle
     */
    committedQuantity: number;
    /**
     * Quantity for next billing cycle
     */
    currentQuantity: number;
    effectiveDate: Date;
    /**
     * Onpremise or hosted
     */
    environment: string;
    eventId: string;
    eventName: string;
    eventSource: string;
    eventTime: Date;
    galleryId: string;
    includedQuantity: number;
    maxQuantity: number;
    meterName: string;
    organizationId: string;
    organizationName: string;
    previousIncludedQuantity: number;
    previousMaxQuantity: number;
    /**
     * Previous quantity in case of upgrade/downgrade
     */
    previousQuantity: number;
    renewalGroup: string;
    serviceIdentity: string;
    subscriptionId: string;
    trialEndDate: Date;
    trialStartDate: Date;
    userIdentity: string;
    version: string;
}

/**
 * Encapsulates the state of offer meter definitions and purchases
 */
export interface ICommercePackage {
    configuration: { [key: string] : string; };
    offerMeters: OfferMeter[];
    offerSubscriptions: OfferSubscription[];
}

/**
 * Information about a resource associated with a subscription.
 */
export interface IOfferSubscription {
    /**
     * Indicates whether users get auto assigned this license type duing first access.
     */
    autoAssignOnAccess: boolean;
    /**
     * The azure subscription id
     */
    azureSubscriptionId: string;
    /**
     * The azure subscription name
     */
    azureSubscriptionName: string;
    /**
     * The azure subscription state
     */
    azureSubscriptionState: SubscriptionStatus;
    /**
     * Quantity commited by the user, when resources is commitment based.
     */
    committedQuantity: number;
    /**
     * A enumeration value indicating why the resource was disabled.
     */
    disabledReason: ResourceStatusReason;
    /**
     * Uri pointing to user action on a disabled resource. It is based on DisabledReason value.
     */
    disabledResourceActionLink: string;
    /**
     * Quantity included for free.
     */
    includedQuantity: number;
    /**
     * Returns true if paid billing is enabled on the resource. Returns false for non-azure subscriptions, disabled azure subscriptions or explicitly disabled by user
     */
    isPaidBillingEnabled: boolean;
    /**
     * Gets or sets a value indicating whether this instance is in preview.
     */
    isPreview: boolean;
    /**
     * Gets the value indicating whether the puchase is canceled.
     */
    isPurchaseCanceled: boolean;
    /**
     * Gets the value indicating whether current meter was purchased while the meter is still in trial
     */
    isPurchasedDuringTrial: boolean;
    /**
     * Gets or sets a value indicating whether this instance is trial or preview.
     */
    isTrialOrPreview: boolean;
    /**
     * Returns true if resource is can be used otherwise returns false. DisabledReason can be used to identify why resource is disabled.
     */
    isUseable: boolean;
    /**
     * Returns an integer representing the maximum quantity that can be billed for this resource. Any usage submitted over this number is automatically excluded from being sent to azure.
     */
    maximumQuantity: number;
    /**
     * Gets the name of this resource.
     */
    offerMeter: OfferMeter;
    /**
     * Gets the renewal group.
     */
    renewalGroup: ResourceRenewalGroup;
    /**
     * Returns a Date of UTC kind indicating when the next reset of quantities is going to happen. On this day at UTC 2:00 AM is when the reset will occur.
     */
    resetDate: Date;
    /**
     * Gets or sets the start date for this resource. First install date in any state.
     */
    startDate: Date;
    /**
     * Gets or sets the trial expiry date.
     */
    trialExpiryDate: Date;
}

/**
 * The subscription account. Add Sub Type and Owner email later.
 */
export interface ISubscriptionAccount {
    /**
     * Gets or sets the account host type.
     */
    accountHostType: number;
    /**
     * Gets or sets the account identifier. Usually a guid.
     */
    accountId: string;
    /**
     * Gets or sets the name of the account.
     */
    accountName: string;
    /**
     * Gets or sets the account tenantId.
     */
    accountTenantId: string;
    /**
     * get or set purchase Error Reason
     */
    failedPurchaseReason: PurchaseErrorReason;
    /**
     * Gets or sets the geo location.
     */
    geoLocation: string;
    /**
     * Gets or sets a value indicating whether the calling user identity owns or is a PCA of the account.
     */
    isAccountOwner: boolean;
    /**
     * Gets or set the flag to enable purchase via subscription.
     */
    isEligibleForPurchase: boolean;
    /**
     * get or set IsPrepaidFundSubscription
     */
    isPrepaidFundSubscription: boolean;
    /**
     * get or set IsPricingPricingAvailable
     */
    isPricingAvailable: boolean;
    /**
     * Gets or sets the subscription locale
     */
    locale: string;
    /**
     * Gets or sets the Offer Type of this subscription. A value of null means, this value has not been evaluated.
     */
    offerType: AzureOfferType;
    /**
     * Gets or sets the subscription address country display name
     */
    regionDisplayName: string;
    /**
     * Gets or sets the resource group.
     */
    resourceGroupName: string;
    /**
     * Gets or sets the azure resource name.
     */
    resourceName: string;
    /**
     * A dictionary of service urls, mapping the service owner to the service owner url
     */
    serviceUrls: { [key: string] : string; };
    /**
     * Gets or sets the subscription identifier.
     */
    subscriptionId: string;
    /**
     * Gets or sets the azure subscription name
     */
    subscriptionName: string;
    /**
     * get or set object id of subscruption admin
     */
    subscriptionObjectId: string;
    /**
     * get or set subscription offer code
     */
    subscriptionOfferCode: string;
    /**
     * Gets or sets the subscription status.
     */
    subscriptionStatus: SubscriptionStatus;
    /**
     * get or set tenant id of subscription
     */
    subscriptionTenantId: string;
}

/**
 * Information about a resource associated with a subscription.
 */
export interface ISubscriptionResource {
    /**
     * Quantity commited by the user, when resources is commitment based.
     */
    committedQuantity: number;
    /**
     * A enumeration value indicating why the resource was disabled.
     */
    disabledReason: ResourceStatusReason;
    /**
     * Uri pointing to user action on a disabled resource. It is based on DisabledReason value.
     */
    disabledResourceActionLink: string;
    /**
     * Quantity included for free.
     */
    includedQuantity: number;
    /**
     * Returns true if paid billing is enabled on the resource. Returns false for non-azure subscriptions, disabled azure subscriptions or explicitly disabled by user
     */
    isPaidBillingEnabled: boolean;
    /**
     * Returns true if resource is can be used otherwise returns false. DisabledReason can be used to identify why resource is disabled.
     */
    isUseable: boolean;
    /**
     * Returns an integer representing the maximum quantity that can be billed for this resource. Any usage submitted over this number is automatically excluded from being sent to azure.
     */
    maximumQuantity: number;
    /**
     * Gets the name of this resource.
     */
    name: ResourceName;
    /**
     * Returns a Date of UTC kind indicating when the next reset of quantities is going to happen. On this day at UTC 2:00 AM is when the reset will occur.
     */
    resetDate: Date;
}

/**
 * Represents the aggregated usage of a resource over a time span
 */
export interface IUsageEventAggregate {
    /**
     * Gets or sets end time of the aggregated value, exclusive
     */
    endTime: Date;
    /**
     * Gets or sets resource that the aggregated value represents
     */
    resource: ResourceName;
    /**
     * Gets or sets start time of the aggregated value, inclusive
     */
    startTime: Date;
    /**
     * Gets or sets quantity of the resource used from start time to end time
     */
    value: number;
}

/**
 * The meter billing state.
 */
export enum MeterBillingState {
    Free = 0,
    Paid = 1
}

/**
 * Defines meter categories.
 */
export enum MeterCategory {
    Legacy = 0,
    Bundle = 1,
    Extension = 2
}

/**
 * Describes the Renewal frequncy of a Meter.
 */
export enum MeterRenewalFrequecy {
    None = 0,
    Monthly = 1,
    Annually = 2
}

/**
 * The meter state.
 */
export enum MeterState {
    Registered = 0,
    Active = 1,
    Retired = 2,
    Deleted = 3
}

export enum MinimumRequiredServiceLevel {
    /**
     * No service rights. The user cannot access the account
     */
    None = 0,
    /**
     * Default or minimum service level
     */
    Express = 1,
    /**
     * Premium service level - either by purchasing on the Azure portal or by purchasing the appropriate MSDN subscription
     */
    Advanced = 2,
    /**
     * Only available to a specific set of MSDN Subscribers
     */
    AdvancedPlus = 3,
    /**
     * Stakeholder service level
     */
    Stakeholder = 4
}

export interface OfferMeter {
    /**
     * Gets or sets the value of absolute maximum quantity for the resource
     */
    absoluteMaximumQuantity: number;
    /**
     * Gets or sets the user assignment model.
     */
    assignmentModel: OfferMeterAssignmentModel;
    /**
     * Indicates whether users get auto assigned this license type duing first access.
     */
    autoAssignOnAccess: boolean;
    /**
     * Gets or sets the responsible entity/method for billing. Determines how this meter is handled in the backend.
     */
    billingEntity: BillingProvider;
    /**
     * Gets or sets the billing mode of the resource
     */
    billingMode: ResourceBillingMode;
    /**
     * Gets or sets the billing start date. If TrialDays + PreviewGraceDays > then, on 'BillingStartDate' it starts the preview Grace and/or trial period.
     */
    billingStartDate: Date;
    /**
     * Gets or sets the state of the billing.
     */
    billingState: MeterBillingState;
    /**
     * Category.
     */
    category: MeterCategory;
    /**
     * Quantity commited by the user, when resources is commitment based.
     */
    committedQuantity: number;
    /**
     * Quantity used by the user, when resources is pay as you go or commitment based.
     */
    currentQuantity: number;
    /**
     * Gets or sets the map of named quantity varied plans, plans can be purchased that vary only in the number of users included. Null if this offer meter does not support named fixed quantity plans.
     */
    fixedQuantityPlans: AzureOfferPlanDefinition[];
    /**
     * Gets or sets Gallery Id.
     */
    galleryId: string;
    /**
     * Gets or sets the Min license level the offer is free for.
     */
    includedInLicenseLevel: MinimumRequiredServiceLevel;
    /**
     * Quantity included for free.
     */
    includedQuantity: number;
    /**
     * Flag to identify whether the meter is First Party or Third Party based on BillingEntity If the BillingEntity is SelfManaged, the Meter is First Party otherwise its a Third Party Meter
     */
    isFirstParty: boolean;
    /**
     * Gets or sets the value of maximum quantity for the resource
     */
    maximumQuantity: number;
    /**
     * Meter Id.
     */
    meterId: number;
    /**
     * Gets or sets the minimum required access level for the meter.
     */
    minimumRequiredAccessLevel: MinimumRequiredServiceLevel;
    /**
     * Name of the resource
     */
    name: string;
    /**
     * Gets or sets the offer scope.
     */
    offerScope: OfferScope;
    /**
     * Gets or sets the identifier representing this meter in commerce platform
     */
    platformMeterId: string;
    /**
     * Gets or sets the preview grace days.
     */
    previewGraceDays: number;
    /**
     * Gets or sets the Renewak Frequency.
     */
    renewalFrequency: MeterRenewalFrequecy;
    /**
     * Gets or sets the status.
     */
    status: MeterState;
    /**
     * Gets or sets the trial cycles.
     */
    trialCycles: number;
    /**
     * Gets or sets the trial days.
     */
    trialDays: number;
    /**
     * Measuring unit for this meter.
     */
    unit: string;
}

/**
 * The offer meter assignment model.
 */
export enum OfferMeterAssignmentModel {
    /**
     * Users need to be explicitly assigned.
     */
    Explicit = 0,
    /**
     * Users will be added automatically. All-or-nothing model.
     */
    Implicit = 1
}

export interface OfferMeterPrice {
    /**
     * Currency code
     */
    currencyCode: string;
    /**
     * The meter Name which identifies the offer meter this plan is associated with
     */
    meterName: string;
    /**
     * The Name of the plan, which is usually in the format "{publisher}:{offer}:{plan}"
     */
    planName: string;
    /**
     * Plan Price
     */
    price: number;
    /**
     * Plan Quantity
     */
    quantity: number;
    /**
     * Region price is for
     */
    region: string;
}

/**
 * The offer scope.
 */
export enum OfferScope {
    Account = 0,
    User = 1,
    UserAccount = 2
}

/**
 * Information about a resource associated with a subscription.
 */
export interface OfferSubscription {
    /**
     * Indicates whether users get auto assigned this license type duing first access.
     */
    autoAssignOnAccess: boolean;
    /**
     * The azure subscription id
     */
    azureSubscriptionId: string;
    /**
     * The azure subscription name
     */
    azureSubscriptionName: string;
    /**
     * The azure subscription state
     */
    azureSubscriptionState: SubscriptionStatus;
    /**
     * Quantity commited by the user, when resources is commitment based.
     */
    committedQuantity: number;
    /**
     * A enumeration value indicating why the resource was disabled.
     */
    disabledReason: ResourceStatusReason;
    /**
     * Uri pointing to user action on a disabled resource. It is based on DisabledReason value.
     */
    disabledResourceActionLink: string;
    /**
     * Quantity included for free.
     */
    includedQuantity: number;
    /**
     * Returns true if paid billing is enabled on the resource. Returns false for non-azure subscriptions, disabled azure subscriptions or explicitly disabled by user
     */
    isPaidBillingEnabled: boolean;
    /**
     * Gets or sets a value indicating whether this instance is in preview.
     */
    isPreview: boolean;
    /**
     * Gets the value indicating whether the puchase is canceled.
     */
    isPurchaseCanceled: boolean;
    /**
     * Gets the value indicating whether current meter was purchased while the meter is still in trial
     */
    isPurchasedDuringTrial: boolean;
    /**
     * Gets or sets a value indicating whether this instance is trial or preview.
     */
    isTrialOrPreview: boolean;
    /**
     * Returns true if resource is can be used otherwise returns false. DisabledReason can be used to identify why resource is disabled.
     */
    isUseable: boolean;
    /**
     * Returns an integer representing the maximum quantity that can be billed for this resource. Any usage submitted over this number is automatically excluded from being sent to azure.
     */
    maximumQuantity: number;
    /**
     * Gets or sets the name of this resource.
     */
    offerMeter: OfferMeter;
    /**
     * The unique identifier of this offer subscription
     */
    offerSubscriptionId: string;
    /**
     * Gets the renewal group.
     */
    renewalGroup: ResourceRenewalGroup;
    /**
     * Returns a Date of UTC kind indicating when the next reset of quantities is going to happen. On this day at UTC 2:00 AM is when the reset will occur.
     */
    resetDate: Date;
    /**
     * Gets or sets the start date for this resource. First install date in any state.
     */
    startDate: Date;
    /**
     * Gets or sets the trial expiry date.
     */
    trialExpiryDate: Date;
}

/**
 * The Purchasable offer meter.
 */
export interface PurchasableOfferMeter {
    /**
     * Currecny code for meter pricing
     */
    currencyCode: string;
    /**
     * Gets or sets the estimated renewal date.
     */
    estimatedRenewalDate: Date;
    /**
     * Locale for azure subscription
     */
    localeCode: string;
    /**
     * Gets or sets the meter pricing (GraduatedPrice)
     */
    meterPricing: { key: number; value: number }[];
    /**
     * Gets or sets the offer meter definition.
     */
    offerMeterDefinition: OfferMeter;
}

export enum PurchaseErrorReason {
    None = 0,
    MonetaryLimitSet = 1,
    InvalidOfferCode = 2,
    NotAdminOrCoAdmin = 3,
    InvalidRegionPurchase = 4,
    PaymentInstrumentNotCreditCard = 5,
    InvalidOfferRegion = 6,
    UnsupportedSubscription = 7,
    DisabledSubscription = 8,
    InvalidUser = 9,
    NotSubscriptionUser = 10,
    UnsupportedSubscriptionCsp = 11,
    TemporarySpendingLimit = 12,
    AzureServiceError = 13
}

/**
 * Represents a purchase request for requesting purchase by a user who does not have authorization to purchase.
 */
export interface PurchaseRequest {
    /**
     * Name of the offer meter
     */
    offerMeterName: string;
    /**
     * Quantity for purchase
     */
    quantity: number;
    /**
     * Reason for the purchase request
     */
    reason: string;
    /**
     * Response for this purchase request by the approver
     */
    response: PurchaseRequestResponse;
}

/**
 * Type of purchase request response
 */
export enum PurchaseRequestResponse {
    None = 0,
    Approved = 1,
    Denied = 2
}

/**
 * The resource billing mode.
 */
export enum ResourceBillingMode {
    Committment = 0,
    PayAsYouGo = 1
}

/**
 * Various metered resources in VSTS
 */
export enum ResourceName {
    StandardLicense = 0,
    AdvancedLicense = 1,
    ProfessionalLicense = 2,
    Build = 3,
    LoadTest = 4,
    PremiumBuildAgent = 5,
    PrivateOtherBuildAgent = 6,
    PrivateAzureBuildAgent = 7
}

/**
 * The resource renewal group.
 */
export enum ResourceRenewalGroup {
    Monthly = 0,
    Jan = 1,
    Feb = 2,
    Mar = 3,
    Apr = 4,
    May = 5,
    Jun = 6,
    Jul = 7,
    Aug = 8,
    Sep = 9,
    Oct = 10,
    Nov = 11,
    Dec = 12
}

/**
 * Reason for disabled resource.
 */
export enum ResourceStatusReason {
    None = 0,
    NoAzureSubscription = 1,
    NoIncludedQuantityLeft = 2,
    SubscriptionDisabled = 4,
    PaidBillingDisabled = 8,
    MaximumQuantityReached = 16
}

/**
 * The subscription account. Add Sub Type and Owner email later.
 */
export interface SubscriptionAccount {
    /**
     * Gets or sets the account host type.
     */
    accountHostType: number;
    /**
     * Gets or sets the account identifier. Usually a guid.
     */
    accountId: string;
    /**
     * Gets or sets the name of the account.
     */
    accountName: string;
    /**
     * Gets or sets the account tenantId.
     */
    accountTenantId: string;
    /**
     * Purchase Error Reason
     */
    failedPurchaseReason: PurchaseErrorReason;
    /**
     * Gets or sets the geo location.
     */
    geoLocation: string;
    /**
     * Gets or sets a value indicating whether the calling user identity owns or is a PCA of the account.
     */
    isAccountOwner: boolean;
    /**
     * Gets or set the flag to enable purchase via subscription.
     */
    isEligibleForPurchase: boolean;
    /**
     * get or set IsPrepaidFundSubscription
     */
    isPrepaidFundSubscription: boolean;
    /**
     * get or set IsPricingPricingAvailable
     */
    isPricingAvailable: boolean;
    /**
     * Gets or sets the subscription address country code
     */
    locale: string;
    /**
     * Gets or sets the Offer Type of this subscription.
     */
    offerType: AzureOfferType;
    /**
     * Gets or sets the subscription address country display name
     */
    regionDisplayName: string;
    /**
     * Gets or sets the resource group.
     */
    resourceGroupName: string;
    /**
     * Gets or sets the azure resource name.
     */
    resourceName: string;
    /**
     * A dictionary of service urls, mapping the service owner to the service owner url
     */
    serviceUrls: { [key: string] : string; };
    /**
     * Gets or sets the subscription identifier.
     */
    subscriptionId: string;
    /**
     * Gets or sets the azure subscription name
     */
    subscriptionName: string;
    /**
     * object id of subscription admin
     */
    subscriptionObjectId: string;
    /**
     * get or set subscription offer code
     */
    subscriptionOfferCode: string;
    /**
     * Gets or sets the subscription status.
     */
    subscriptionStatus: SubscriptionStatus;
    /**
     * tenant id of subscription
     */
    subscriptionTenantId: string;
}

/**
 * Information about a resource associated with a subscription.
 */
export interface SubscriptionResource {
    /**
     * Quantity commited by the user, when resources is commitment based.
     */
    committedQuantity: number;
    /**
     * A enumeration value indicating why the resource was disabled.
     */
    disabledReason: ResourceStatusReason;
    /**
     * Uri pointing to user action on a disabled resource. It is based on DisabledReason value.
     */
    disabledResourceActionLink: string;
    /**
     * Quantity included for free.
     */
    includedQuantity: number;
    /**
     * Returns true if paid billing is enabled on the resource. Returns false for non-azure subscriptions, disabled azure subscriptions or explicitly disabled by user
     */
    isPaidBillingEnabled: boolean;
    /**
     * Returns true if resource is can be used otherwise returns false. DisabledReason can be used to identify why resource is disabled.
     */
    isUseable: boolean;
    /**
     * Returns an integer representing the maximum quantity that can be billed for this resource. Any usage submitted over this number is automatically excluded from being sent to azure.
     */
    maximumQuantity: number;
    /**
     * Gets or sets the name of this resource.
     */
    name: ResourceName;
    /**
     * Returns a Date of UTC kind indicating when the next reset of quantities is going to happen. On this day at UTC 2:00 AM is when the reset will occur.
     */
    resetDate: Date;
}

export enum SubscriptionSource {
    Normal = 0,
    EnterpriseAgreement = 1,
    Internal = 2,
    Unknown = 3,
    FreeTier = 4
}

/**
 * Azure subscription status
 */
export enum SubscriptionStatus {
    Unknown = 0,
    Active = 1,
    Disabled = 2,
    Deleted = 3,
    Unregistered = 4
}

/**
 * Class that represents common set of properties for a raw usage event reported by TFS services.
 */
export interface UsageEvent {
    /**
     * Gets or sets account id of the event. Note: This is for backward compat with BI.
     */
    accountId: string;
    /**
     * Account name associated with the usage event
     */
    accountName: string;
    /**
     * User GUID associated with the usage event
     */
    associatedUser: string;
    /**
     * Timestamp when this billing event is billable
     */
    billableDate: Date;
    /**
     * Unique event identifier
     */
    eventId: string;
    /**
     * Recieving Timestamp of the billing event by metering service
     */
    eventTimestamp: Date;
    /**
     * Gets or sets the event unique identifier.
     */
    eventUniqueId: string;
    /**
     * Meter Id.
     */
    meterName: string;
    /**
     * Partition id of the account
     */
    partitionId: number;
    /**
     * Quantity of the usage event
     */
    quantity: number;
    /**
     * Gets or sets the billing mode for the resource involved in the usage
     */
    resourceBillingMode: ResourceBillingMode;
    /**
     * Service context GUID associated with the usage event
     */
    serviceIdentity: string;
    /**
     * Gets or sets subscription anniversary day of the subscription
     */
    subscriptionAnniversaryDay: number;
    /**
     * Gets or sets subscription guid of the associated account of the event
     */
    subscriptionId: string;
}

export var TypeInfo = {
    AccountProviderNamespace: {
        enumValues: {
            "visualStudioOnline": 0,
            "appInsights": 1,
            "marketplace": 2,
            "onPremise": 3
        }
    },
    AzureOfferType: {
        enumValues: {
            "none": 0,
            "standard": 1,
            "ea": 2,
            "msdn": 3,
            "csp": 4,
            "unsupported": 99
        }
    },
    BillingProvider: {
        enumValues: {
            "selfManaged": 0,
            "azureStoreManaged": 1
        }
    },
    IAzureSubscription: <any>{
    },
    ICommerceEvent: <any>{
    },
    ICommercePackage: <any>{
    },
    IOfferSubscription: <any>{
    },
    ISubscriptionAccount: <any>{
    },
    ISubscriptionResource: <any>{
    },
    IUsageEventAggregate: <any>{
    },
    MeterBillingState: {
        enumValues: {
            "free": 0,
            "paid": 1
        }
    },
    MeterCategory: {
        enumValues: {
            "legacy": 0,
            "bundle": 1,
            "extension": 2
        }
    },
    MeterRenewalFrequecy: {
        enumValues: {
            "none": 0,
            "monthly": 1,
            "annually": 2
        }
    },
    MeterState: {
        enumValues: {
            "registered": 0,
            "active": 1,
            "retired": 2,
            "deleted": 3
        }
    },
    MinimumRequiredServiceLevel: {
        enumValues: {
            "none": 0,
            "express": 1,
            "advanced": 2,
            "advancedPlus": 3,
            "stakeholder": 4
        }
    },
    OfferMeter: <any>{
    },
    OfferMeterAssignmentModel: {
        enumValues: {
            "explicit": 0,
            "implicit": 1
        }
    },
    OfferScope: {
        enumValues: {
            "account": 0,
            "user": 1,
            "userAccount": 2
        }
    },
    OfferSubscription: <any>{
    },
    PurchasableOfferMeter: <any>{
    },
    PurchaseErrorReason: {
        enumValues: {
            "none": 0,
            "monetaryLimitSet": 1,
            "invalidOfferCode": 2,
            "notAdminOrCoAdmin": 3,
            "invalidRegionPurchase": 4,
            "paymentInstrumentNotCreditCard": 5,
            "invalidOfferRegion": 6,
            "unsupportedSubscription": 7,
            "disabledSubscription": 8,
            "invalidUser": 9,
            "notSubscriptionUser": 10,
            "unsupportedSubscriptionCsp": 11,
            "temporarySpendingLimit": 12,
            "azureServiceError": 13
        }
    },
    PurchaseRequest: <any>{
    },
    PurchaseRequestResponse: {
        enumValues: {
            "none": 0,
            "approved": 1,
            "denied": 2
        }
    },
    ResourceBillingMode: {
        enumValues: {
            "committment": 0,
            "payAsYouGo": 1
        }
    },
    ResourceName: {
        enumValues: {
            "standardLicense": 0,
            "advancedLicense": 1,
            "professionalLicense": 2,
            "build": 3,
            "loadTest": 4,
            "premiumBuildAgent": 5,
            "privateOtherBuildAgent": 6,
            "privateAzureBuildAgent": 7
        }
    },
    ResourceRenewalGroup: {
        enumValues: {
            "monthly": 0,
            "jan": 1,
            "feb": 2,
            "mar": 3,
            "apr": 4,
            "may": 5,
            "jun": 6,
            "jul": 7,
            "aug": 8,
            "sep": 9,
            "oct": 10,
            "nov": 11,
            "dec": 12
        }
    },
    ResourceStatusReason: {
        enumValues: {
            "none": 0,
            "noAzureSubscription": 1,
            "noIncludedQuantityLeft": 2,
            "subscriptionDisabled": 4,
            "paidBillingDisabled": 8,
            "maximumQuantityReached": 16
        }
    },
    SubscriptionAccount: <any>{
    },
    SubscriptionResource: <any>{
    },
    SubscriptionSource: {
        enumValues: {
            "normal": 0,
            "enterpriseAgreement": 1,
            "internal": 2,
            "unknown": 3,
            "freeTier": 4
        }
    },
    SubscriptionStatus: {
        enumValues: {
            "unknown": 0,
            "active": 1,
            "disabled": 2,
            "deleted": 3,
            "unregistered": 4
        }
    },
    UsageEvent: <any>{
    },
};

TypeInfo.IAzureSubscription.fields = {
    created: {
        isDate: true,
    },
    lastUpdated: {
        isDate: true,
    },
    namespace: {
        enumType: TypeInfo.AccountProviderNamespace
    },
    offerType: {
        enumType: TypeInfo.AzureOfferType
    },
    source: {
        enumType: TypeInfo.SubscriptionSource
    },
    status: {
        enumType: TypeInfo.SubscriptionStatus
    }
};

TypeInfo.ICommerceEvent.fields = {
    effectiveDate: {
        isDate: true,
    },
    eventTime: {
        isDate: true,
    },
    trialEndDate: {
        isDate: true,
    },
    trialStartDate: {
        isDate: true,
    }
};

TypeInfo.ICommercePackage.fields = {
    offerMeters: {
        isArray: true,
        typeInfo: TypeInfo.OfferMeter
    },
    offerSubscriptions: {
        isArray: true,
        typeInfo: TypeInfo.OfferSubscription
    }
};

TypeInfo.IOfferSubscription.fields = {
    azureSubscriptionState: {
        enumType: TypeInfo.SubscriptionStatus
    },
    disabledReason: {
        enumType: TypeInfo.ResourceStatusReason
    },
    offerMeter: {
        typeInfo: TypeInfo.OfferMeter
    },
    renewalGroup: {
        enumType: TypeInfo.ResourceRenewalGroup
    },
    resetDate: {
        isDate: true,
    },
    startDate: {
        isDate: true,
    },
    trialExpiryDate: {
        isDate: true,
    }
};

TypeInfo.ISubscriptionAccount.fields = {
    failedPurchaseReason: {
        enumType: TypeInfo.PurchaseErrorReason
    },
    offerType: {
        enumType: TypeInfo.AzureOfferType
    },
    subscriptionStatus: {
        enumType: TypeInfo.SubscriptionStatus
    }
};

TypeInfo.ISubscriptionResource.fields = {
    disabledReason: {
        enumType: TypeInfo.ResourceStatusReason
    },
    name: {
        enumType: TypeInfo.ResourceName
    },
    resetDate: {
        isDate: true,
    }
};

TypeInfo.IUsageEventAggregate.fields = {
    endTime: {
        isDate: true,
    },
    resource: {
        enumType: TypeInfo.ResourceName
    },
    startTime: {
        isDate: true,
    }
};

TypeInfo.OfferMeter.fields = {
    assignmentModel: {
        enumType: TypeInfo.OfferMeterAssignmentModel
    },
    billingEntity: {
        enumType: TypeInfo.BillingProvider
    },
    billingMode: {
        enumType: TypeInfo.ResourceBillingMode
    },
    billingStartDate: {
        isDate: true,
    },
    billingState: {
        enumType: TypeInfo.MeterBillingState
    },
    category: {
        enumType: TypeInfo.MeterCategory
    },
    includedInLicenseLevel: {
        enumType: TypeInfo.MinimumRequiredServiceLevel
    },
    minimumRequiredAccessLevel: {
        enumType: TypeInfo.MinimumRequiredServiceLevel
    },
    offerScope: {
        enumType: TypeInfo.OfferScope
    },
    renewalFrequency: {
        enumType: TypeInfo.MeterRenewalFrequecy
    },
    status: {
        enumType: TypeInfo.MeterState
    }
};

TypeInfo.OfferSubscription.fields = {
    azureSubscriptionState: {
        enumType: TypeInfo.SubscriptionStatus
    },
    disabledReason: {
        enumType: TypeInfo.ResourceStatusReason
    },
    offerMeter: {
        typeInfo: TypeInfo.OfferMeter
    },
    renewalGroup: {
        enumType: TypeInfo.ResourceRenewalGroup
    },
    resetDate: {
        isDate: true,
    },
    startDate: {
        isDate: true,
    },
    trialExpiryDate: {
        isDate: true,
    }
};

TypeInfo.PurchasableOfferMeter.fields = {
    estimatedRenewalDate: {
        isDate: true,
    },
    offerMeterDefinition: {
        typeInfo: TypeInfo.OfferMeter
    }
};

TypeInfo.PurchaseRequest.fields = {
    response: {
        enumType: TypeInfo.PurchaseRequestResponse
    }
};

TypeInfo.SubscriptionAccount.fields = {
    failedPurchaseReason: {
        enumType: TypeInfo.PurchaseErrorReason
    },
    offerType: {
        enumType: TypeInfo.AzureOfferType
    },
    subscriptionStatus: {
        enumType: TypeInfo.SubscriptionStatus
    }
};

TypeInfo.SubscriptionResource.fields = {
    disabledReason: {
        enumType: TypeInfo.ResourceStatusReason
    },
    name: {
        enumType: TypeInfo.ResourceName
    },
    resetDate: {
        isDate: true,
    }
};

TypeInfo.UsageEvent.fields = {
    billableDate: {
        isDate: true,
    },
    eventTimestamp: {
        isDate: true,
    },
    resourceBillingMode: {
        enumType: TypeInfo.ResourceBillingMode
    }
};
