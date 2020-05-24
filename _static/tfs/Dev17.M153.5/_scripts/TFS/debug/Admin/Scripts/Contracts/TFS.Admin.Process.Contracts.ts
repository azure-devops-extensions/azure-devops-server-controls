import ProcessContracts = require("TFS/WorkItemTracking/ProcessContracts");

export interface ProcessFieldProperties {
    IsReadOnly: boolean;
    IsInheritedIdentity?: boolean;
    IsRequired: boolean;
    IsRequiredInParent?: boolean;
    Default: IDefault;
    AllowGroups?: boolean;
    AllowedValues?: string[];
    HelpText: string;
    IsVisible: boolean;
}

export interface IDefault {
    Vsid: string;
    Value: string;
}

export interface ProcessFieldUsage {
    WorkItemTypeId: string;
    IsSystem: boolean; //If this field is shipped from Microsoft (It is not same as Core field)
    IsInherited: boolean; //If this field is coming from base type
    IsBehaviorField: boolean; //If this field is needed by a referenced behavior
    CanEditFieldProperties?: boolean; //Field properties for this field are editable
    Properties: ProcessFieldProperties;
}

export interface ProcessField {
    Id: string;
    Name: string;
    Type: string;
    Description: string;
    Properties: ProcessFieldProperties;
    PickListId?: string;
    Usages: ProcessFieldUsage[];
}

export interface LayoutGroup {
    Id: string;
    Label: string;
}

export interface ProcessWorkItemType {
    Id: string;
    Name: string;
    Description: string;
    Color: string;
    ParentWorkItemTypeId: string;
    LayoutGroups?: LayoutGroup[];
    Layout?: ProcessContracts.FormLayout;
    IsCustomType: boolean;
    IsDisabled?: boolean;
}

/**
 * @deprecated This should only by used by the two components
 * that directly access the MVC endpoint to get process field usage.
 */
export interface ProcessFieldUsageData {
    Fields: ProcessField[];
    WorkItemTypes: ProcessWorkItemType[];
}

/**
 * Replacement for ProcessFieldUsageData.
 * It represents the WebApi version of the work item types instead of the
 * MVC version of the work item types.
 */
export interface ProcessDefinitionFieldUsageData {
    Fields: ProcessField[];
    WorkItemTypes: ProcessContracts.ProcessWorkItemType[];
}
