import WITConstants = require("Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants");
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import Q = require("q");
import { WebApiTeam } from "TFS/Core/Contracts";
import { CoreHttpClient } from "TFS/Core/RestClient";
import WITContracts = require("TFS/WorkItemTracking/Contracts");
import { getDefaultWebContext } from "VSS/Context";
import Dialogs = require("VSS/Controls/Dialogs");
import Diag = require("VSS/Diag");
import Service = require("VSS/Service");
import Templates = require("WorkItemTracking/Scripts/Dialogs/WorkItemTemplates/WorkItemTemplateEditDialog");
import { WorkItemManager } from "WorkItemTracking/Scripts/OM/WorkItemManager";
import WITResources = require("WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking");
import { WorkItemTemplateService } from "WorkItemTracking/Scripts/Services/WorkItemTemplateService";
import { WorkItem, WorkItemStore } from "WorkItemTracking/Scripts/TFS.WorkItemTracking";
import { WorkItemStoreMultiEditDataProvider } from "WorkItemTracking/Scripts/TFS.WorkItemTracking.Controls.BulkEdit";
import { TagUtils } from "WorkItemTracking/Scripts/Utils/TagUtils";
import { WorkItemTemplatesHelper } from "WorkItemTracking/Scripts/Utils/WorkItemTemplateUtils";

export interface ITemplatesMenuContext {
    tfsContext: TfsContext;

    // selected work item ids
    workItemIds: number[];

    workItemTypes: string[];

    // perform immediate save when applying the template (true on backlogs, false on queries)
    immediateSave: boolean;

    // context menu group id
    groupId: string;

    // context menu rank (position)
    rank: number;

    ciFeatureName: string;
    ciSourceAreaName: string;

    workItem?: WorkItem;

    //Work Item Id to project name
    projectNames: IDictionaryNumberTo<string>;
}

export function launchCaptureWorkItemTemplateDialog(menuProperties: ITemplatesMenuContext, showTeamPicker?: boolean): void {
    Diag.Debug.assert(menuProperties.workItem !== null || menuProperties.workItemIds.length === 1, "Expected one work item passed in");
    const { workItemIds, workItemTypes } = menuProperties;
    const workItemStore = Service.getService<WorkItemStore>(WorkItemStore);
    const workItem: WorkItem = menuProperties.workItem || WorkItemManager.get(workItemStore).getWorkItem(workItemIds[0]);
    const deferred = Q.defer<WITContracts.WorkItemTemplate>();
    const manuallySetFieldRefNames: string[] = [];
    const projectId = getDefaultWebContext().project.id;

    const template: WITContracts.WorkItemTemplate = {
        id: null,
        name: null,
        description: null,
        fields: {},
        workItemTypeName: workItemTypes[0],
        url: null,
        _links: null
    };

    const convertFieldValueToString = (fieldValue: any) => (fieldValue == null ? "" : "" + fieldValue);

    const processWorkItemAndUpdateTemplate = (item: WorkItem) => {
        const editableFields = item.fields.filter((f) =>
            f.fieldDefinition.id !== WITConstants.CoreField.Tags &&
            !WorkItemStoreMultiEditDataProvider.isExcludedFromBulkEdit(f.fieldDefinition) &&
            !template.fields[f.fieldDefinition.referenceName]);

        for (const editableField of editableFields) {
            const fieldId = editableField.fieldDefinition.id;
            const fieldValue = convertFieldValueToString(item.getFieldValue(fieldId));
            if (fieldValue) {
                template.fields[editableField.fieldDefinition.referenceName] = fieldValue;
            }
        }
    };

    if (!workItem) {
        // Workitem doesn't exist in the store, so make a server call to fetch the workitem and then resolve the template promise
        WorkItemManager.get(workItemStore).beginGetWorkItem(
            workItemIds[0],
            (item: WorkItem) => {
                processWorkItemAndUpdateTemplate(item);
                deferred.resolve(template);
            },
            (error: Error) => {
                deferred.reject(error);
            });
    } else {
        // Grab current changes from work item
        for (const field of workItem.getDirtyFields(true)) {
            const fieldDefinition = field.fieldDefinition;
            if (fieldDefinition.id !== WITConstants.CoreField.Tags) {
                template.fields[fieldDefinition.referenceName] = convertFieldValueToString(field.getValue());
                manuallySetFieldRefNames.push(fieldDefinition.referenceName);
            }
        }

        if (!workItem.isNew()) {
            processWorkItemAndUpdateTemplate(workItem);
        }

        // Grab tags changes
        const tagsDelta = TagUtils.getTagPseudoFieldValues(workItem);
        for (const refName in tagsDelta) {
            template.fields[refName] = tagsDelta[refName];
        }

        const addedRemoved = TagUtils.areTagsAddedRemoved(workItem);
        if (addedRemoved.added) {
            manuallySetFieldRefNames.push(TagUtils.AddTagsPseudoRefName);
        }

        if (addedRemoved.removed) {
            manuallySetFieldRefNames.push(TagUtils.RemoveTagsPseudoRefName);
        }
        deferred.resolve(template);
    }

    // Setup project type mapping for data provider
    const projectTypeMapping: IDictionaryStringTo<string[]> = {};
    const projectName = workItem ? workItem.project.name : getDefaultWebContext().project.name;
    projectTypeMapping[projectName] = [workItemTypes[0]];

    const restClient = Service.getClient(CoreHttpClient);
    const getTeamsPromise: IPromise<WebApiTeam[]> = showTeamPicker ? restClient.getTeams(projectId, /* $mine */ true): null;

    const getTemplateOwnerId = (teamId?: string): string => {
        if (showTeamPicker) {
            Diag.Debug.assertIsString(teamId, "WorkItemTemplateEditDialog: TeamId cannot be null/undefined");
            return teamId;
        } else {
            const team = menuProperties.tfsContext.contextData.team;
            Diag.Debug.assertIsObject(team, "WorkItemTemplateEditDialog: Team cannot be null/undefined");                
            return team.id;
        }
    };

    // Setup options
    const options: Templates.WorkItemTemplateEditDialogOptions = {
        title: WITResources.WorkItemTemplates_CaptureTemplateDialogTitle,
        dataProvider: new WorkItemStoreMultiEditDataProvider(menuProperties.tfsContext, projectTypeMapping),
        showTeamPicker: showTeamPicker,
        teams: getTeamsPromise,
        initialTemplate: deferred.promise,
        saveCallback: (template: WITContracts.WorkItemTemplate, teamId?: string) => {
            Diag.Debug.assertIsObject(template, "WorkItemTemplateEditDialog: Dialog result cannot be null/undefined");

            const ownerId = getTemplateOwnerId(teamId);
            const service = Service.getService<WorkItemTemplateService>(WorkItemTemplateService);

            if (template.id) {
                return service.replaceWorkItemTemplate(projectId, ownerId, template.id, template).then((t) => { return t.id; });
            } else {
                return service.createWorkItemTemplate(projectId, ownerId, template).then((t) => { return t.id; });
            }
        },
        allowRemoveUnmodified: !workItem || !workItem.isNew(), //If the workItem is not cached (means it is and existing workitem, or it is not new)
        manuallySetFieldRefNames: manuallySetFieldRefNames,
        attachResize: true,
        getNewWorkItemFromTemplateUrl: (template: WITContracts.WorkItemTemplate, teamId: string) => {
            return WorkItemTemplatesHelper.generateTemplateUrl(
                template.workItemTypeName,
                getTemplateOwnerId(teamId),
                template.id,
                menuProperties.tfsContext
            );
        }
    };

    Dialogs.show(Templates.WorkItemTemplateEditDialog, options);
};
