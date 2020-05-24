import { CoreFieldRefNames } from "Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants";
import { IPageFilter } from "WorkCustomization/Scripts/Contracts/PageFilter";
import ProcessContracts = require("TFS/WorkItemTracking/ProcessContracts");
import Resources = require("WorkCustomization/Scripts/Resources/TFS.Resources.WorkCustomization");
import { RuleCondition, RuleConditionType } from "TFS/WorkItemTracking/ProcessContracts";

export namespace WorkCustomizationHub {
    export const Name = "work-customization-hub";
}

export namespace SystemProcesses {
    export const AGILE_TYPE_ID = "adcc42ab-9882-485e-a3ed-7678f01f66bc";
    export const SCRUM_TYPE_ID = "6b724908-ef14-45cf-84f8-768b5384da45";
    export const CMMI_TYPE_ID = "27450541-8e31-4150-9947-dc59f998fc01";

    export var WorkItemTypesBlockedFromDisabling = [
        "microsoft.vsts.workitemtypes.testcase",
        "microsoft.vsts.workitemtypes.testplan",
        "microsoft.vsts.workitemtypes.testsuite"
    ];

    export var OutOfBoxProcessIds = [
        AGILE_TYPE_ID,
        SCRUM_TYPE_ID,
        CMMI_TYPE_ID
    ];
}

export namespace NavigationActions {
    export const AllProcesses = "all";
    export const ProcessWorkItemTypes = "workitemtypes";
    export const ProcessBacklogLevels = "backlogs";
    export const WorkItemTypeLayout = "layout";
    export const WorkItemTypeStates = "states";
    export const WorkItemTypeRules = "rules";
    export const ProcessProjects = "projects";
    export const Fields = "fields";
}

export namespace NavigationParameters {
    export const WorkItemTypeId = "type-id";
    export const ProcessName = "process-name";
    export const ProcessId = "process-id";
    //Customization wizard params
    export const LaunchWizard = "launch-wizard";
    export const WizardProjectId = "wizard-project-id";
    export const WizardWitRefName = "wizard-wit-ref-name";
    export const WizardProcessId = "wizard-process-id";
    export const WizardProcessName = "wizard-process-name";
    export const WizardProjectName = "wizard-project-name";
}

export namespace ProcessDialogs {
    export const MaxProcessNameLength = 128;
    export const MaxProcessDescriptionLength = 1024;
}

export namespace WorkItemFieldNamespace {
    export const SystemFieldNameSpace = "System.";
    export const MicrosoftInternalNamespace = "Microsoft.";
}


//TODO: use generated constants from server code
export namespace RuleActionTypes {
    export const MakeRequired = "$makeRequired";
    export const MakeReadOnly = "$makeReadOnly";
    export const SetDefaultValue = "$setDefaultValue";
    export const SetDefaultFromClock = "$setDefaultFromClock";
    export const SetDefaultFromCurrentUser = "$setDefaultFromCurrentUser";
    export const SetDefaultFromField = "$setDefaultFromField";
    export const SetValueToEmpty = "$setValueToEmpty";
    export const CopyValue = "$copyValue";
    export const CopyFromClock = "$copyFromServerClock";
    export const CopyFromCurrentUser = "$copyFromCurrentUser";
    export const CopyFromField = "$copyFromField";
}

export namespace ClientOnlyRuleActionTypes {
    export const SetEmptyValue = "_setValueToEmpty";
}

export namespace ClientOnlyRuleConditionTypes {
    export const WhenStateChangedTo = "_whenStateChangedTo";
    export const WhenStateChangedFromAndTo = "_whenStateChangedFromAndTo";
    export const WhenWorkItemIsCreated = "_whenWorkItemIsCreated";
    export const WhenValueIsDefined = "_whenValueIsDefined";
    export const WhenValueIsNotDefined = "_whenValueIsNotDefined";
}

export namespace RuleConditionTypes {
    export const When = "$when";
    export const WhenWas = "$whenWas";
    export const WhenNot = "$whenNot";
    export const WhenChanged = "$whenChanged";
    export const WhenNotChanged = "$whenNotChanged";
}

export namespace RuleValidationConstants {
    export const MaxFriendlyNameLength = 100;
    export const MaxFieldValueLength = 255;
}

export namespace SecurityConstants {
    export const teamProjectCollectionNamespaceId = "3E65F728-F8BC-4ecd-8764-7E378B19BFA7";
    export const teamProjectCollectionNamespaceToken = "NAMESPACE";
    export const deleteFieldPermission = 1024;
}

export namespace CopyProcessTasks {
    export const getProcessesTask = "getProcessesTask";
    export const finalizeTask = "finalizeTask";
    export const createProcessTask = "createProcessTask";
    export const disableProcessTask = "disableProcessTask";
    export const getInheritedBehaviorsTask = "getInheritedBehaviorsTask";
    export const getWorkItemTypesTask = "getWorkItemTypesTask";
    export const getSourceBehaviorsTask = "getSourceBehaviorsTask";
    export const replaceBehaviorTask = "replaceBehaviorTask";
    export const createBehaviorTask = "createBehaviorTask";
    export const createWorkItemTypeTask = "createWorkItemTypeTask";
    export const getNewInheritedWorkItemTypesTask = "getNewInheritedWorkItemTypesTask";
    export const getFieldsTask = "getFieldsTask";
    export const getNewLayoutTask = "getNewLayoutTask";
    export const getRulesTask = "getRulesTask";
    export const getNewWitBehaviorsTask = "getNewWitBehaviorsTask";
    export const getNewStatesTask = "getNewStatesTask";
    export const updateWorkItemTypeTask = "updateWorkItemTypeTask";
    export const createFieldTask = "createFieldTask";
    export const getWitFieldsTask = "getWitFieldsTask";
    export const getLayoutTask = "getLayoutTask";
    export const createLayoutPageTask = "createLayoutPageTask";
    export const getNewWitLayoutGroupTask = "getNewWitLayoutGroupTask";
    export const createLayoutGroupTask = "createLayoutGroupTask";
    export const editFieldTask = "editFieldTask";
    export const addFieldToLayoutTask = "addFieldToLayoutTask";
    export const setFieldOrderTask = "setFieldOrderTask";
    export const createRuleTask = "createRuleTask";
    export const getOldProcessBehaviorsTask = "getOldProcessBehaviorsTask";
    export const getWitBehaviorsTask = "getWitBehaviorsTask";
    export const createWitBehaviorTask = "createWitBehaviorTask";
    export const getStatesTask = "getStatesTask";
    export const deleteStateTask = "deleteStateTask";
    export const createStateTask = "createStateTask";
    export const hideStateTask = "hideStateTask";
    export const updateStateTask = "updateStateTask";
    export const getNewProcessBehaviorsTask = "getNewProcessBehaviorsTask";
    export const updateGroupNameTask = "updateGroupNameTask";
    export const updateGroupTask = "updateGroupPayloadTask";
    export const updateLayoutPayloadTask = "updateLayoutPayloadTask";
    export const updatePageNameTask = "updatePageNameTask";
    export const updatePageTask = "updatePagePayloadTask";
}


export namespace OobProcessConstants {
    export const AgileOOBProcessName = "Agile";
    export const ScrumOOBProcessName = "Scrum";
    export const CMMIOOBProcessName = "CMMI";
}


export namespace FilterConstants {
    export const filterItemKey = "processadminfilter";
    export const filterEnabledPages: IPageFilter[] = [
        {
            pageAction: NavigationActions.AllProcesses,
            filterPlaceholder: Resources.ProcessesFilterPlaceholder
        },
        {
            pageAction: NavigationActions.ProcessWorkItemTypes,
            filterPlaceholder: Resources.WorkItemTypesPlaceholder
        },
        {
            pageAction:NavigationActions.Fields,
            filterPlaceholder: Resources.FieldsFilterPlaceholder
        },
        {
            pageAction: undefined, // undefined means the root of the hub, so showing the root processes filter
            filterPlaceholder: Resources.ProcessesFilterPlaceholder
        }
    ]
}

export namespace RulesConstants{
    export var RuleConditionEnumToStringMap  = new Map<ProcessContracts.RuleConditionType,string>();
    //TODO : Complete this mapping.... 
    export var RuleConditionStringToEnumMap = new Map<string,ProcessContracts.RuleConditionType>();
    //TODO : Complete this mapping.... 
    export var RuleActionEnumToStringMap  = new Map<ProcessContracts.RuleActionType,string>();
    //TODO : Complete this mapping.... 
    export var RuleActionStringToEnumMap = new Map<string,ProcessContracts.RuleActionType>();
    //TODO : Complete this mapping.... 
}
