import AdminResources = require("Admin/Scripts/Resources/TFS.Resources.Admin");
import AdminProcessContracts = require("Admin/Scripts/Contracts/TFS.Admin.Process.Contracts");
import ProcessContracts = require("TFS/WorkItemTracking/ProcessContracts");
import Utils_Array = require("VSS/Utils/Array");
import Utils_String = require("VSS/Utils/String");

// This can be removed when US#628807 is completed
export const BACKLOG_FIELD_REMOVAL_ENABLED: boolean = false;

export interface IBacklogSelectionData {
    id: string;
    behaviorId: string;
    color: string;
    title: string;
    includedFields: IDictionaryStringTo<string[]>;
}

export module BacklogGroups {
    export const PLANNING_LAYOUT_GROUP_ID: string = "System.WorkItemType.Planning"; // TODO: US#628807 (final ID depends on Layout from WIT IQ)
}

export module BacklogSelectionConstants {
    export const SELECTION_ID_PREFIX: string = "backlog-";
    export const SELECTION_NONE_ID: string = SELECTION_ID_PREFIX + "none";

    export const RADIO_BUTTON_NAME = "backlog-name-selection";
}

export module Constants {
    export const SYSTEM_ORDERED_BEHAVIOR_REF_NAME: string = "System.OrderedBehavior"; // we're agnostic about all other behaviors
}

export function createBacklogSelectionGroup(behaviors: ProcessContracts.ProcessBehavior[]): IBacklogSelectionData[] {
    var result: IBacklogSelectionData[] = [];
    var reverseRankOrderBehaviors = behaviors.slice(0).sort((left, right) => {
        if (left.rank === right.rank) {
            return left.name.localeCompare(right.name);
        }

        return (left.rank > right.rank) ? -1 : 1;
    });
    reverseRankOrderBehaviors.forEach(b => {
        // if behaviors inherits from System.OrderedBehavior, they are backlogs
        // Note: these checks can go away once we have an backlog specific API
        if (!(b.referenceName === Constants.SYSTEM_ORDERED_BEHAVIOR_REF_NAME)) {
            var behaviorDetails: FieldUtility.IBehaviorDetails = FieldUtility.getBehaviorDetails(b, behaviors);
            if (Utils_String.equals(behaviorDetails.levels[0], Constants.SYSTEM_ORDERED_BEHAVIOR_REF_NAME)) {
                result.push(<IBacklogSelectionData>{
                    id: BacklogSelectionConstants.SELECTION_ID_PREFIX + b.referenceName.replace(/\W/g, '-'), // make sure to form a valid DOM element ID
                    behaviorId: b.referenceName,
                    color: '#' + b.color,
                    includedFields: FieldUtility.createFieldsInfo(behaviorDetails.fields),
                    title: b.name
                });
            }
        }
    });

    result.push(
        <IBacklogSelectionData>{
            id: BacklogSelectionConstants.SELECTION_NONE_ID,
            behaviorId: null,
            color: null,
            title: AdminResources.DoNotShowOnBacklogsOrBoards
        });

    return result;
}

export interface IChangeMessages {
    infoSummary: string;
    info: string[];
    postSaveInfo: string[];
    warnings: string[];
    messageForLayoutPage: string;
}

export function getChangeMessages(
    workItemType: ProcessContracts.ProcessWorkItemType,
    fromSelection: IBacklogSelectionData,
    toSelection: IBacklogSelectionData,
    getFieldName: (fieldId: string) => string): IChangeMessages {

    var fieldChanges: FieldUtility.IFieldChanges = FieldUtility.getFieldChanges(fromSelection.includedFields, toSelection.includedFields);
    var result = <IChangeMessages>{ info: [], postSaveInfo: [], warnings: [], messageForLayoutPage: null };
    var workItemTypeName = workItemType.name;

    result.infoSummary = (toSelection.id === BacklogSelectionConstants.SELECTION_NONE_ID) ?
        Utils_String.format(AdminResources.BacklogChangeHideInfo, workItemTypeName, fromSelection.title) :
        Utils_String.format(AdminResources.BacklogChangeBasicInfo, workItemTypeName, toSelection.title);

    function createMessage(fields: string[], singularMessageTemplate: string, pluralMessageTemplate: string) {
        var len: number = fields.length;
        if (len > 0) {
            return (len === 1 ?
                Utils_String.format(singularMessageTemplate, getFieldName(fields[0])) :
                Utils_String.format(
                    pluralMessageTemplate, fields.slice(0, -1).map(fId => getFieldName(fId)).join(', '), getFieldName(fields[len - 1])));
        }

        return null;
    }

    var fieldIdsAdded = fieldChanges.fieldIdsAdded.filter(fId => !FieldUtility.isFieldOnFormLayout(fId, workItemType.layout));
    if (fieldIdsAdded.length > 0) {
        result.info.push(createMessage(
            fieldIdsAdded, AdminResources.BacklogChangeAddingFieldInfo, AdminResources.BacklogChangeAddingMultipleFieldsInfo));
        result.postSaveInfo.push(createMessage(
            fieldIdsAdded, AdminResources.BacklogChangeAddedFieldInfo, AdminResources.BacklogChangeAddedMultipleFieldsInfo));
    }

    if (BACKLOG_FIELD_REMOVAL_ENABLED && fieldChanges.fieldIdsRemoved.length > 0) {
        result.info.push(createMessage(
            fieldChanges.fieldIdsRemoved, AdminResources.BacklogChangeRemovingFieldInfo, AdminResources.BacklogChangeRemovingMultipleFieldsInfo));
        result.postSaveInfo.push(createMessage(
            fieldChanges.fieldIdsRemoved, AdminResources.BacklogChangeRemovedFieldInfo, AdminResources.BacklogChangeRemovedMultipleFieldsInfo));
    }

    result.messageForLayoutPage = createMessage(
        fieldIdsAdded,
        AdminResources.BacklogChangeToLayoutAddingFieldInfo,
        AdminResources.BacklogChangeToLayoutAddingMultipleFieldsInfo);

    GroupUtility.getGroupsWithCustomFields(fieldChanges.fieldsRemoved, fieldChanges.groupIdsRemoved, workItemType.layout)
        .forEach(gId => result.warnings.push(
            Utils_String.format(AdminResources.BacklogChangeRemovingGroupWithCustomFieldWarning, GroupUtility.formatGroup(gId))));

    return result;
}

export namespace FieldUtility {
    export interface IFieldChanges {
        fieldsAdded: IDictionaryStringTo<string[]>;
        fieldsRemoved: IDictionaryStringTo<string[]>;

        // cache for quick access to Id's (fieldsAdded and fieldsRemoved would have this info also)
        groupIdsAdded: string[];
        groupIdsRemoved: string[];
        fieldIdsAdded: string[];
        fieldIdsRemoved: string[];
    }

    export function createFieldsInfo(fields: ProcessContracts.ProcessBehaviorField[]): IDictionaryStringTo<string[]> {
        var result: IDictionaryStringTo<string[]> = {};
        result[BacklogGroups.PLANNING_LAYOUT_GROUP_ID] = fields.map(f => f.referenceName);
        return result;
    }

    export interface IBehaviorDetails {
        fields: ProcessContracts.ProcessBehaviorField[];
        levels: string[]; // 0 is oldest ancestor, n-2 is immediate parent, n - 1 is the original behavior
    }

    export function getBehaviorDetails(behavior: ProcessContracts.ProcessBehavior, allBehaviors: ProcessContracts.ProcessBehavior[]): IBehaviorDetails {
        if (behavior == null) {
            return null;
        }

        var result = <IBehaviorDetails>{ fields: [], levels: [] };
        let _core = (bh: ProcessContracts.ProcessBehavior) => {
            if (bh.inherits != null) {
                _core(Utils_Array.first(allBehaviors, b => b.referenceName === bh.inherits.behaviorRefName));
            }
            result.levels.push(bh.referenceName);
            bh.fields.forEach(f => result.fields.push(f));
        }

        _core(behavior);
        return result;
    }
    
    export function isFieldOnFormLayout(fieldId: string, layout: ProcessContracts.FormLayout): boolean {
        return GroupUtility.readFormLayoutGroup(layout, group =>
            group.controls != null && Utils_Array.arrayContains(fieldId, group.controls, (fId, c) => Utils_String.equals(fId, c.id, true)));
    }

    export function getFieldChanges(from: IDictionaryStringTo<string[]>, to: IDictionaryStringTo<string[]>): IFieldChanges {
        var result = <IFieldChanges>{
            fieldsAdded: {},
            fieldsRemoved: {},
            groupIdsAdded: [],
            groupIdsRemoved: [],
            fieldIdsAdded: [],
            fieldIdsRemoved: []
        };

        function computeDelta(
            left: IDictionaryStringTo<string[]>,
            right: IDictionaryStringTo<string[]>,
            delta: IDictionaryStringTo<string[]>,
            keyDelta: string[],
            valueDelta: string[]): boolean {

            var changed: boolean = false;
            for (var key in left) {
                if (right[key] == null) {
                    delta[key] = left[key];
                    keyDelta.push(key);
                    left[key].forEach(v => valueDelta.push(v));
                    changed = true;
                } else {
                    var values = left[key];
                    for (var i in values) {
                        if (right[key].indexOf(values[i]) < 0) {
                            if (delta[key] == null) {
                                delta[key] = [];
                            }
                            delta[key].push(values[i]);
                            valueDelta.push(values[i]);
                            changed = true;
                        }
                    }
                }
            }

            return changed;
        }

        from = from == null ? {} : from;
        to = to == null ? {} : to;
        computeDelta(from, to, result.fieldsRemoved, result.groupIdsRemoved, result.fieldIdsRemoved);
        computeDelta(to, from, result.fieldsAdded, result.groupIdsAdded, result.fieldIdsAdded);

        return result;
    }
}

export namespace GroupUtility {
    // TODO: US#628807 (group name lookup depends on Layout from WIT IQ)
    export function formatGroup(groupId: string): string {
        if (groupId === BacklogGroups.PLANNING_LAYOUT_GROUP_ID) {
            return 'Planning';
        }

        return groupId;
    }

    export function getGroupsWithCustomFields(
        fieldsRemoved: IDictionaryStringTo<string[]>, groupIdsRemoved: string[], layout: ProcessContracts.FormLayout): string[] {
        var groupsWithOtherFields: string[] = [];
        var result = readFormLayoutGroup(layout, group => {
            var groupId = Utils_Array.first(groupIdsRemoved, gId => Utils_String.equals(gId, group.id, true));
            if (groupId != null) {
                var controls = group.controls || [];
                for (var c in controls) {
                    var control = controls[c];
                    if (!Utils_Array.contains(fieldsRemoved[groupId], control.id, Utils_String.ignoreCaseComparer)) {
                        groupsWithOtherFields.push(groupId);
                    }
                }
            }

            return false; // false to continue
        });

        return groupsWithOtherFields;
    }

    export function readFormLayoutGroup(
        layout: ProcessContracts.FormLayout, readGroupFunc: (group: ProcessContracts.Group) => boolean): boolean {
        var groupsWithOtherFields: string[] = [];
        if (layout == null) {
            return false;
        }

        var pages = layout.pages || [];
        for (var p in pages) {
            var sections = pages[p].sections || [];
            for (var s in sections) {
                var groups = sections[s].groups || [];
                for (var g in groups) {
                    var group = groups[g];
                    if (group == null) {
                        continue;
                    }

                    if (readGroupFunc(group)) {
                        return true;
                    }
                }
            }
        }

        return false;
    }
}
