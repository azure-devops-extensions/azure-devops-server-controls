/**
 * ---------------------------------------------------------
 * Generated file, DO NOT EDIT
 * ---------------------------------------------------------
 *
 * See following wiki page for instructions on how to regenerate:
 *   https://aka.ms/azure-devops-client-generation
 *
 * Configuration file:
 *   tfs\client\admin\clientgeneratorconfigs\genclient.json
 */

export interface Default {
    value: string;
}

/**
 * Issue information for feature enablement of a process template.
 */
export interface EnablementIssue {
    /**
     * Severity of the issue.
     */
    level: any;
    /**
     * Message for the issue.
     */
    message: string;
}

/**
 * Exposes information about a feature.
 */
export interface FeatureInfo {
    /**
     * Indicates the state of the feature. 1 = Not configured 2 = Partially configured 3 = Fully configured See ProjectFeatureState enum. We store this as an int since it is only used to hand off to the client.
     */
    featureState: number;
    /**
     * Name of the feature.
     */
    name: string;
}

/**
 * Exposes the state information for all features.
 */
export interface FeaturesState {
    /**
     * Information for each of the features.
     */
    featureList: FeatureInfo[];
    /**
     * Indicates if there are any features that are are enabled.
     */
    partiallyConfigured: boolean;
}

export interface Field {
    description: string;
    id: string;
    name: string;
    pickListId: string;
    properties: FieldProperties;
    type: string;
    usages: FieldUsage[];
}

export interface FieldProperties {
    allowedValues: string[];
    allowGroups: boolean;
    default: Default;
    isInheritedIdentity: boolean;
    isReadOnly: boolean;
    isRequired: boolean;
    isRequiredInParent: boolean;
}

export interface FieldUsage {
    canEditFieldProperties: boolean;
    isBehaviorField: boolean;
    isInherited: boolean;
    isSystem: boolean;
    properties: UsageProperties;
    workItemTypeId: string;
}

export interface IdentityDefault extends Default {
    vsid: string;
}

export interface LayoutGroup {
    id: string;
    label: string;
}

export interface ProcessFieldUsageInfo {
    fields: Field[];
    workItemTypes: WorkItemType[];
}

/**
 * Summary of the feature enablement information for the process template.
 */
export interface ProcessTemplateSummary {
    /**
     * Actions which will be taken to enable the features in the project.
     */
    actions: string[];
    /**
     * Id of the process template.
     */
    id: string;
    /**
     * Indicates whether this process template is recommended for upgrade
     */
    isRecommended: boolean;
    /**
     * Issues associated with the process template which could prevent it from being used to enable features in the project.
     */
    issues: EnablementIssue[];
    /**
     * Indicates if the process template can be used to enable the features in the project.
     */
    isValid: boolean;
    /**
     * Name of the process template.
     */
    name: string;
}

export interface UsageProperties extends FieldProperties {
    helpText: string;
    isVisible: boolean;
}

export interface WorkItemType {
    color: string;
    description: string;
    id: string;
    isCustomType: boolean;
    isDisabled: boolean;
    layout: any;
    layoutGroups: LayoutGroup[];
    name: string;
    parentWorkItemTypeId: string;
}
