import { VariableGroup } from "TFS/DistributedTask/Contracts";

export interface IScope {
    // key of the scope
    key: number;

    // value of the scope
    value: string;

    // is default scope
    isDefault?: boolean;

    // is scope disabled
    isDisabled?: boolean;
}

export interface IDefinitionVariable {

    // value of the variable
    value: string;

    // is variable secret
    isSecret?: boolean;

    // allow override of the variable
    allowOverride?: boolean;

    // scope for the variable
    scope?: IScope;

    // has variable's secret value been reset (ex. clone or import scenario)
    hasSecretValueBeenReset?: boolean;

    // has variable properties [name, value, secret and scope] been changed atleast once by user
    hasVariableBeenUpdatedByUser?: boolean;
}

export interface IVariable extends IDefinitionVariable {
    name: string;
    isSystemVariable?: boolean;
    disableDelete?: boolean;
    disableSecretConversion?: boolean;
    disableSecretVariableName?: boolean;
    disableVariable?: boolean;
}

export interface IDefinitionVariableReference {
    name: string;
    variable: IDefinitionVariable;
}

export type VariableList = IDefinitionVariableReference[];

export interface IProcessVariablesOptions {
    settableAtQueueTime: boolean;
    supportScopes: boolean;
    supportGridView: boolean;
    disableSorting?: boolean;
    hideDelete?: boolean;
    hideError?: boolean;
    hideSecret?: boolean;
    defaultScopeKey?: number;
    onPublishTelemetry?: (arg: IPublishTelemetryArg) => void;

    // ColumnOptions: is a key value pair dictionary where
    //     key: Is a wellknown variables column key. (VariableColumnKeys)
    //     value: Is of type IProcessVariablesColumnOptions
    columnOptionOverrides?: IDictionaryStringTo<IProcessVariablesColumnOptions>;
}

export interface IProcessVariablesColumnOptions {
    headerName?: string;
    minWidth?: number;
    maxWidth?: number;
    isReadOnly?: boolean;
}

export interface IPublishTelemetryArg {
    variablesTelemetryFeatureType: VariablesTelemetryFeatureType; // Type of fature telelmetry to publish
    variablesViewType?: string; // List or Grid view
    variablesItemType?: string; // Process variable item or Variable group item
}

export enum VariablesTelemetryFeatureType {
    VariablesView = 1,
    VariablesDefaultFilterChanged,
    VariablesItem
}

export interface IDefinitionVariableGroup extends VariableGroup {
    scopes: IScope[];
}

export interface IVariableGroupReference {
    groupId: number;
    scope?: IScope;
}

export interface IVariableGroupOptions {
    supportScopes: boolean;
    onPublishTelemetry?: (arg: IPublishTelemetryArg) => void;
}