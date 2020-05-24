//*********************************************************************************************
// TFS.WorkItemTracking.Extensions.Service.ts
//   Implementation of the WorkItemFormService which is a service that is accessible
//   from extensions.
//*********************************************************************************************
import * as VSS from "VSS/VSS";
import * as Service from "VSS/Service";
import * as Events_Document from "VSS/Events/Document";
import * as SDK_Shim from "VSS/SDK/Shim";
import { TfsService } from "Presentation/Scripts/TFS/TFS.Service";
import * as WITConstants from "Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants";
import { IWorkItemFormNavigationService, WorkItemFormNavigationService } from "TFS/WorkItemTracking/Services";
import { Contributions } from "WorkItemTracking/Scripts/Extensions/TFS.WorkItemTracking.Extensions";
import { Link, Hyperlink, ExternalLink, Field, WorkItemLink, WorkItem } from "WorkItemTracking/Scripts/TFS.WorkItemTracking";
import { IWorkItemLinkTypeEnd, RemoteLinkContext } from "WorkItemTracking/Scripts/OM/WorkItemInterfaces";
import { resolveIdentityRefToWorkItemIdentityRef, isIdentityRef } from "WorkItemTracking/Scripts/Utils/WorkItemIdentityHelper";
import * as  WorkItemTrackingResources from "WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking";
import * as Utils_String from "VSS/Utils/String";
import * as Diag from "VSS/Diag";
import * as Telemetry from "VSS/Telemetry/Services";
import * as WITDialogShim from "WorkItemTracking/SharedScripts/WorkItemDialogShim";
import * as Dialogs_Async from "VSS/Controls/Dialogs";
import { FieldUsages } from "WorkItemTracking/Scripts/OM/WorkItemConstants";
import { IWorkItemFormService } from "TFS/WorkItemTracking/Services";
import { WorkItem as WorkItemContract, WorkItemRelation, WorkItemRelationType, WorkItemField, FieldUsage, FieldType } from "TFS/WorkItemTracking/Contracts";
import { WorkItemOptions } from "TFS/WorkItemTracking/UIContracts";
import { IdentityRef } from "VSS/WebApi/Contracts";
import { getRemoteWorkItemByUrl, IRemoteWebApiWorkItemData } from "WorkItemTracking/Scripts/OM/RemoteWorkItemProviderDataSource";

async function getIdentityFieldValue(field: Field, returnOriginalValue: boolean): Promise<IdentityRef> {
    if (field && field.fieldDefinition.isIdentity) {
        const identityRef = field.getIdentityValue(returnOriginalValue);
        const workItemIdentityRef = await resolveIdentityRefToWorkItemIdentityRef(identityRef);

        return workItemIdentityRef && workItemIdentityRef.identityRef;
    }
}

async function convertPotentialIdentityRefToWorkItemIdentityRef(value: Object): Promise<Object> {
    if (isIdentityRef(value)) {
        return await resolveIdentityRefToWorkItemIdentityRef(value);
    } else {
        return value;
    }
}

export class WorkItemFormService implements IWorkItemFormService {
    private static _serviceInstances: IDictionaryStringTo<WorkItemFormService> = {};

    constructor(private _contributionId: string, private _contributionInstanceId: string) {
    }

    /**
     * Factory method for creating/getting an instance of the work item form service.
     *
     * @param contributionId The id of the contribution
     * @param contributionInstanceId The instance id of the contribution
     */
    public static getInstance(contributionId: string, contributionInstanceId: string): WorkItemFormService {
        const serviceInstanceKey = `${contributionId}-${contributionInstanceId}`;
        let serviceInstance = WorkItemFormService._serviceInstances[serviceInstanceKey];
        if (!serviceInstance) {
            serviceInstance = new WorkItemFormService(contributionId, contributionInstanceId);
            WorkItemFormService._serviceInstances[serviceInstanceKey] = serviceInstance;
        }

        return serviceInstance;
    }

    public getId(): Promise<number> {
        return Promise.resolve(this._getWorkItem().id);
    }

    public getRevision(): Promise<number> {
        return Promise.resolve(this._getWorkItem().revision);
    }

    public getFields(): Promise<WorkItemField[]> {
        return Promise.resolve(this._getWorkItem().fields.map((field) => this._mapWorkItemFieldToFieldContract(field)));
    }

    public async getFieldValue(fieldReferenceName: string, options?: WorkItemOptions): Promise<Object>;
    public async getFieldValue(fieldReferenceName: string, returnOriginalValue?: boolean): Promise<Object>;
    public async getFieldValue(fieldReferenceName: string, flagOrOptions?: boolean | WorkItemOptions): Promise<Object> {
        const { returnOriginalValue } = this._getFieldOptions(flagOrOptions);
        const workItem = this._getWorkItem();

        return workItem.getFieldValue(fieldReferenceName, returnOriginalValue);
    }

    public async getIdentityFieldValue(fieldReferenceName: string, options?: WorkItemOptions): Promise<IdentityRef> {
        const { returnOriginalValue } = this._getFieldOptions(options);
        const workItem = this._getWorkItem();
        const field = workItem.getField(fieldReferenceName);

        return await getIdentityFieldValue(field, returnOriginalValue);
    }

    public async getFieldValues(fieldReferenceNames: string[], options?: WorkItemOptions): Promise<IDictionaryStringTo<Object>>;
    public async getFieldValues(fieldReferenceNames: string[], returnOriginalValue?: boolean): Promise<IDictionaryStringTo<Object>>;
    public async getFieldValues(fieldReferenceNames: string[], flagOrOptions?: boolean | WorkItemOptions): Promise<IDictionaryStringTo<Object>> {
        const { returnOriginalValue } = this._getFieldOptions(flagOrOptions);
        const workItem = this._getWorkItem();
        const fieldValues: IDictionaryStringTo<Object> = {};
        if (fieldReferenceNames instanceof Array) {
            fieldReferenceNames.forEach((fieldName) => {
                fieldValues[fieldName] = workItem.getFieldValue(fieldName, returnOriginalValue);
            });
        }

        return fieldValues;
    }

    public async setFieldValue(fieldReferenceName: string, value: Object): Promise<boolean> {
        const workItem = this._getWorkItem();
        if (workItem.isReadOnly()) {
            return false;
        }

        const fieldValue = await convertPotentialIdentityRefToWorkItemIdentityRef(value);
        return workItem.setFieldValue(fieldReferenceName, fieldValue, /*setByRule*/null, /*fireIdentityEagerValidation*/true);
    }

    public async setFieldValues(fields: IDictionaryStringTo<Object>): Promise<IDictionaryStringTo<boolean>> {
        const workItem = this._getWorkItem();
        const success: IDictionaryStringTo<boolean> = {};
        const readonly = this._getWorkItem().isReadOnly();
        if (fields) {
            for (const field in fields) {
                if (readonly) {
                    success[field] = false;
                } else {
                    const fieldValue = await convertPotentialIdentityRefToWorkItemIdentityRef(fields[field]);
                    success[field] = workItem.setFieldValue(field, fieldValue, false, true);
                }
            }
        }

        return success;
    }

    public getAllowedFieldValues(fieldReferenceName: string): Promise<Object[]> {
        const workItem = this._getWorkItem();
        const fieldDefinition = workItem.store.getFieldDefinition(fieldReferenceName);
        const allowedValues = [];

        return workItem.store.getAllowedValues(
            fieldReferenceName,
            workItem.project.guid,
            workItem.workItemType.name).then((values) => {
                values.forEach((value) => {
                    const valueStatus = Field.convertValueToInternal(workItem.store, value, fieldDefinition.type);
                    if (!valueStatus.error) {
                        allowedValues.push(valueStatus.value);
                    }
                });

                return allowedValues;
            });
    }

    public isDirty(): Promise<boolean> {
        return Promise.resolve(this._getWorkItem().isDirty());
    }

    public isNew(): Promise<boolean> {
        return Promise.resolve(this._getWorkItem().isNew());
    }

    public isValid(): Promise<boolean> {
        return Promise.resolve(this._getWorkItem().isValid());
    }

    public setError(errorMessage: string): Promise<void> {
        if (this._getWorkItem().isReadOnly()) {
            return Promise.reject(WorkItemTrackingResources.WorkItemFormIsReadonly);
        }

        const error = errorMessage || Utils_String.format(WorkItemTrackingResources.ContributionBlockingWITSave, this._contributionId);
        this._getWorkItem().setContributionErrorStatus(this._contributionInstanceId, false, error);

        return Promise.resolve(null);
    }

    public clearError(): Promise<void> {
        this._getWorkItem().setContributionErrorStatus(this._contributionInstanceId, true);

        return Promise.resolve(null);
    }

    public save(): Promise<void> {
        if (this._getWorkItem().isReadOnly()) {
            return Promise.reject(WorkItemTrackingResources.WorkItemFormIsReadonly);
        }
        return new Promise((resolve, reject) => {
            this.beginSaveWorkItem(resolve, reject);
        });
    }

    public refresh(): Promise<void> {
        return new Promise((resolve, reject) => {
            const activeWorkItem = this._getWorkItem();
            if (activeWorkItem.isNew()) {
                reject(WorkItemTrackingResources.ErrorExtensionService_CannotRefreshWorkItem);
                return;
            }

            const refreshCommand = () => { this._getWorkItem().beginRefresh(() => { resolve(null); }, (error: Error) => { reject(error); }); };

            if (activeWorkItem.isDirty()) {
                VSS.using(["VSS/Controls/Dialogs"], (_Dialogs: typeof Dialogs_Async) => {
                    _Dialogs.MessageDialog.showMessageDialog(WorkItemTrackingResources.ConfirmWorkItemRefresh).then(
                        () => {
                            refreshCommand();
                        }, (result) => {
                            reject(result);
                        });
                });
            } else {
                refreshCommand();
            }
        });
    }

    public reset(): Promise<void> {
        if (this._getWorkItem().isReadOnly()) {
            return Promise.reject(WorkItemTrackingResources.WorkItemFormIsReadonly);
        }

        return new Promise((resolve, reject) => {
            const activeWorkItem = this._getWorkItem();

            if (!activeWorkItem.isDirty() || activeWorkItem.isNew() || activeWorkItem.isSaving()) {
                reject(WorkItemTrackingResources.ErrorExtensionService_CannotRevertWorkItem);
                return;
            }

            VSS.using(["VSS/Controls/Dialogs"], (_Dialogs: typeof Dialogs_Async) => {
                _Dialogs.MessageDialog.showMessageDialog(WorkItemTrackingResources.ConfirmWorkItemRevert).then(
                    () => {
                        this._getWorkItem().reset();
                        resolve(null);
                    }, (result) => {
                        reject(result);
                    });
            });
        });
    }

    public getInvalidFields(): Promise<WorkItemField[]> {
        return Promise.resolve(this._getWorkItem().getInvalidFields().map((field) => this._mapWorkItemFieldToFieldContract(field)));
    }

    public getDirtyFields(includeSystemChanges?: boolean): Promise<WorkItemField[]> {
        return Promise.resolve(this._getWorkItem().getDirtyFields(!includeSystemChanges).map((field) => this._mapWorkItemFieldToFieldContract(field)));
    }

    public async addWorkItemRelations(workItemRelations: WorkItemRelation[]): Promise<void> {
        if (this._getWorkItem().isReadOnly()) {
            return null;
        }

        if (workItemRelations instanceof Array) {
            const activeWorkItem = this._getWorkItem();
            for (const workItemRelation of workItemRelations) {
                const comment = workItemRelation.attributes ? workItemRelation.attributes["comment"] : null;

                if (this._isResourceLinkTypeFromRelation(workItemRelation)) {
                    const registeredLinkType = workItemRelation.attributes ? workItemRelation.attributes["name"] : null;
                    let resourceLink: Link;
                    switch (workItemRelation.rel) {
                        case WITConstants.WorkItemLinkConstants.HYPERLINKLINKTYPE:
                            resourceLink = Hyperlink.create(activeWorkItem, workItemRelation.url, comment);
                            break;
                        case WITConstants.WorkItemLinkConstants.ARTIFACTLINKTYPE:
                            resourceLink = ExternalLink.create(activeWorkItem, registeredLinkType, workItemRelation.url, comment);
                            break;
                        default:
                            break;
                    }

                    if (resourceLink) {
                        activeWorkItem.addLink(resourceLink);
                    } else {
                        throw new Error(WorkItemTrackingResources.AttachmentsNotSupported);
                    }
                } else if (this._isRemoteLinkType(workItemRelation)) {
                    try {
                        await this._addRemoteWorkItemRelation(workItemRelation);
                    } catch (error) {
                        throw error;
                    }
                } else {
                    const targetWorkItemId = this._getWorkItemIdFromUrl(workItemRelation.url);
                    activeWorkItem.addLink(WorkItemLink.create(activeWorkItem, workItemRelation.rel, targetWorkItemId, comment));
                }
            }
        }

        return null;
    }

    private async _addRemoteWorkItemRelation(workItemRelation: WorkItemRelation): Promise<void> {
        const activeWorkItem = this._getWorkItem();
        const comment = workItemRelation.attributes && workItemRelation.attributes.comment;
        const targetWorkItemId = this._getWorkItemIdFromUrl(workItemRelation.url);
        let dataProviderData: IRemoteWebApiWorkItemData;
        try {
            dataProviderData = await getRemoteWorkItemByUrl(workItemRelation.url);
        } catch (error) {
            throw new Error(WorkItemTrackingResources.LinkFormWorkItemNotFound);
        }

        if (!dataProviderData) {
            throw new Error(WorkItemTrackingResources.LinkFormWorkItemNotFound);
        }

        const remoteLinkContext: RemoteLinkContext = {
            remoteHostId: dataProviderData["work-item-host-id"],
            remoteHostName: dataProviderData["work-item-host-name"],
            remoteHostUrl: dataProviderData["work-item-host-url"],
            remoteProjectId: dataProviderData["work-item-project-id"]
        };
        const link = WorkItemLink.create(activeWorkItem, workItemRelation.rel, targetWorkItemId, comment, false, remoteLinkContext);

        if (activeWorkItem.doesLinkAlreadyExist(link)) {
            throw new Error(WorkItemTrackingResources.LinksControlDuplicateRemoteLink);
        }

        activeWorkItem.addLink(link);
    }

    public removeWorkItemRelations(workItemRelations: WorkItemRelation[]): Promise<void> {
        if (this._getWorkItem().isReadOnly()) {
            return Promise.resolve(null);
        }

        if (!(workItemRelations instanceof Array)) {
            throw new Error(WorkItemTrackingResources.InvalidArgumentExpectingArray);
        }

        const activeWorkItem = this._getWorkItem();
        const links: Link[] = [];
        const existingLinks = activeWorkItem.allLinks;

        for (const workItemRelation of workItemRelations) {
            const linkType = this._getRelationLinkTypeFromRelation(workItemRelation);
            let workItemId: number;
            if (linkType === WITConstants.DalFields.AttachedFiles) {
                throw new Error(WorkItemTrackingResources.AttachmentsNotSupported);
            }

            if (linkType === WITConstants.DalFields.RelatedLinks) {
                workItemId = this._getWorkItemIdFromUrl(workItemRelation.url);
            }

            for (const existingLink of existingLinks) {
                if (!existingLink.isRemoved() && linkType === existingLink.linkData.FldID) {
                    if (existingLink.linkData.FldID === WITConstants.DalFields.RelatedLinks) {
                        const workItemLink = <WorkItemLink>existingLink;
                        const linkTypeEnd: IWorkItemLinkTypeEnd = workItemLink.getLinkTypeEnd();

                        if (workItemRelation.rel.toUpperCase() === linkTypeEnd.immutableName.toUpperCase() &&
                            workItemId === existingLink.linkData.ID) {
                            links.push(existingLink);
                            break;
                        }
                    } else {
                        if (workItemRelation.url.toUpperCase() === existingLink.linkData.FilePath.toUpperCase()) {
                            links.push(existingLink);
                            break;
                        }
                    }
                }
            }
        }

        activeWorkItem.removeLinks(links);

        return Promise.resolve(null);
    }

    public getWorkItemRelations(): Promise<WorkItemRelation[]> {
        const activeWorkItem = this._getWorkItem();
        return Promise.resolve(activeWorkItem.getWorkItemRelations());
    }

    public getWorkItemResourceUrl(workItemId: number): Promise<string> {
        return Promise.resolve(WorkItem.getResourceUrl(this._getWorkItem().store.getTfsContext(), workItemId));
    }

    public getWorkItemRelationTypes(): Promise<WorkItemRelationType[]> {
        const workItemRelationTypes: WorkItemRelationType[] = [];
        const workItemLinkTypes = this._getWorkItem().store.getLinkTypes();

        for (const workItemLinkType of workItemLinkTypes) {
            workItemRelationTypes.push({
                attributes: {
                    [WITConstants.WorkItemLinkConstants.ATTRIBUTES_USAGE]: WITConstants.WorkItemLinkConstants.WORKITEMLINKUSAGE,
                    [WITConstants.WorkItemLinkConstants.ATTRIBUTES_EDITABLE]: workItemLinkType.canEdit,
                    [WITConstants.WorkItemLinkConstants.ATTRIBUTES_ENABLED]: workItemLinkType.isActive,
                    [WITConstants.WorkItemLinkConstants.ATTRIBUTES_ACYCLIC]: workItemLinkType.isNonCircular,
                    [WITConstants.WorkItemLinkConstants.ATTRIBUTES_DIRECTIONAL]: workItemLinkType.isDirectional,
                    [WITConstants.WorkItemLinkConstants.ATTRIBUTES_SINGLETARGET]: workItemLinkType.isOneToMany,
                    [WITConstants.WorkItemLinkConstants.ATTRIBUTES_TOPOLOGY]: workItemLinkType.topology
                },
                referenceName: workItemLinkType.forwardEnd.immutableName,
                name: workItemLinkType.forwardEnd.name,
                url: null,
                _links: null
            });

            if (workItemLinkType.forwardEnd.isForwardLink !== workItemLinkType.reverseEnd.isForwardLink) {
                workItemRelationTypes.push({
                    attributes: {
                        [WITConstants.WorkItemLinkConstants.ATTRIBUTES_USAGE]: WITConstants.WorkItemLinkConstants.WORKITEMLINKUSAGE,
                        [WITConstants.WorkItemLinkConstants.ATTRIBUTES_EDITABLE]: workItemLinkType.canEdit,
                        [WITConstants.WorkItemLinkConstants.ATTRIBUTES_ENABLED]: workItemLinkType.isActive,
                        [WITConstants.WorkItemLinkConstants.ATTRIBUTES_ACYCLIC]: workItemLinkType.isNonCircular,
                        [WITConstants.WorkItemLinkConstants.ATTRIBUTES_DIRECTIONAL]: workItemLinkType.isDirectional,
                        [WITConstants.WorkItemLinkConstants.ATTRIBUTES_SINGLETARGET]: workItemLinkType.isOneToMany,
                        [WITConstants.WorkItemLinkConstants.ATTRIBUTES_TOPOLOGY]: workItemLinkType.topology
                    },
                    referenceName: workItemLinkType.reverseEnd.immutableName,
                    name: workItemLinkType.reverseEnd.name,
                    url: null,
                    _links: null
                });
            }
        }

        for (const resourceLink of WITConstants.WorkItemLinkConstants.RESOURCELINKTYPES) {
            workItemRelationTypes.push({
                attributes: {
                    [WITConstants.WorkItemLinkConstants.ATTRIBUTES_USAGE]: WITConstants.WorkItemLinkConstants.RESOURCELINKUSAGE,
                    [WITConstants.WorkItemLinkConstants.ATTRIBUTES_EDITABLE]: false,
                    [WITConstants.WorkItemLinkConstants.ATTRIBUTES_ENABLED]: true
                },
                referenceName: resourceLink,
                name: null,
                url: null,
                _links: null
            });
        }

        return Promise.resolve(workItemRelationTypes);
    }

    public hasActiveWorkItem(): Promise<boolean> {
        return Promise.resolve(this._hasActiveWorkItem());
    }

    // This is deprecated in favor of the save method. Leaving here to support back compat.
    public async beginSaveWorkItem(successCallback: () => void, errorCallback: (error: Error) => void): Promise<void> {
        if (await this.isDirty() && await this.isValid()) {
            if (this._getWorkItem().isReadOnly()) {
                errorCallback(new Error(WorkItemTrackingResources.WorkItemFormIsReadonly));
            }
            this._getWorkItem().beginSave(
                () => {
                    successCallback();
                    Telemetry.publishEvent(new Telemetry.TelemetryEventData(
                        "WIT",
                        "SaveWorkItemFromExtension",
                        {}
                    ));
                    Diag.logTracePoint("WorkItemExtension.saveComplete");
                },
                errorCallback);
        } else {
            errorCallback(new Error(WorkItemTrackingResources.WorkItemNotSaveable));
        }
    }

    protected _getActiveDocument(): any {
        return Events_Document.getService().getActiveDocument();
    }

    private _hasActiveWorkItem(): boolean {
        return this._getActiveDocument() ? true : false;
    }

    private _getWorkItem(): WorkItem {
        if (!this._hasActiveWorkItem()) {
            throw new Error(WorkItemTrackingResources.NoActiveWorkItem);
        }

        const activeDocument = this._getActiveDocument();
        return activeDocument._workItem;
    }

    private _getWorkItemIdFromUrl(url: string): number {
        if (url) {
            url = url.trim();
            const slashIndex = url.lastIndexOf("/");
            if (slashIndex !== -1 && slashIndex < url.length - 1) {
                const workItemIdString = url.substring(slashIndex + 1);
                const workItemId = parseInt(workItemIdString);
                if (!isNaN(workItemId)) {
                    return workItemId;
                }
            }
        }

        throw new Error(Utils_String.format(WorkItemTrackingResources.InvalidWorkItemUrl, url));
    }

    private _isResourceLinkTypeFromRelation(workItemRelation: WorkItemRelation): boolean {
        const linkFieldID = this._getRelationLinkTypeFromRelation(workItemRelation);
        return this._isResourceLinkType(linkFieldID);
    }

    private _isResourceLinkType(linkFieldID: number): boolean {
        switch (linkFieldID) {
            case WITConstants.DalFields.BISURI:
            case WITConstants.DalFields.AttachedFiles:
            case WITConstants.DalFields.LinkedFiles:
                return true;
            default:
                return false;
        }
    }

    private _isRemoteLinkType(workItemRelation: WorkItemRelation): boolean {
        const relType: string = workItemRelation.rel.toUpperCase();
        const store = this._getWorkItem().store;

        // findLinkType will throw if relType is not valid
        const linkTypeEnd = store.findLinkTypeEnd(relType);
        return linkTypeEnd.linkType.isRemote;
    }

    private _getRelationLinkTypeFromRelation(workItemRelation: WorkItemRelation): number {
        const relType: string = workItemRelation.rel.toUpperCase();

        switch (relType) {
            case WITConstants.WorkItemLinkConstants.ATTACHEDLINKTYPE.toUpperCase():
                return WITConstants.DalFields.AttachedFiles;
            case WITConstants.WorkItemLinkConstants.HYPERLINKLINKTYPE.toUpperCase():
                return WITConstants.DalFields.LinkedFiles;
            case WITConstants.WorkItemLinkConstants.ARTIFACTLINKTYPE.toUpperCase():
                return WITConstants.DalFields.BISURI;
            default:
                // Check to see if this is really a work item link type
                const store = this._getWorkItem().store;

                // findLinkType will throw if relType is not valid
                if (store.findLinkTypeEnd(relType)) {
                    return WITConstants.DalFields.RelatedLinks;
                }
                break;
        }
    }

    private _getUsage(field: Field): FieldUsage {
        switch (field.fieldDefinition.usages) {
            case FieldUsages.Tree:
                return FieldUsage.Tree;
            case FieldUsages.WorkItem:
                return FieldUsage.WorkItem;
            case FieldUsages.WorkItemLink:
                return FieldUsage.WorkItemLink;
            case FieldUsages.WorkItemTypeExtension:
                return FieldUsage.WorkItemTypeExtension;
            default:
                return FieldUsage.None;
        }
    }

    private _mapWorkItemFieldToFieldContract(field: Field): WorkItemField {
        return {
            name: field.fieldDefinition.name,
            referenceName: field.fieldDefinition.referenceName,
            readOnly: field.isReadOnly(),
            canSortBy: field.fieldDefinition.canSortBy(),
            isQueryable: field.fieldDefinition.isQueryable(),
            description: field.fieldDefinition.helpText,
            type: this._mapWorkItemFieldType(field.fieldDefinition.type),
            supportedOperations: null,
            _links: null,
            url: null,
            isIdentity: field.fieldDefinition.isIdentity,
            isPicklist: null,
            isPicklistSuggested: null,
            picklistId: null,
            usage: this._getUsage(field)
        };
    }

    private _mapWorkItemFieldType(fieldType: WITConstants.FieldType): FieldType {
        switch (fieldType) {
            case WITConstants.FieldType.Boolean:
                return FieldType.Boolean;
            case WITConstants.FieldType.DateTime:
                return FieldType.DateTime;
            case WITConstants.FieldType.Double:
                return FieldType.Double;
            case WITConstants.FieldType.Guid:
                return FieldType.Guid;
            case WITConstants.FieldType.History:
                return FieldType.History;
            case WITConstants.FieldType.Html:
                return FieldType.Html;
            case WITConstants.FieldType.Integer:
                return FieldType.Integer;
            case WITConstants.FieldType.Internal:
                return null;
            case WITConstants.FieldType.PlainText:
                return FieldType.PlainText;
            case WITConstants.FieldType.String:
                return FieldType.String;
            case WITConstants.FieldType.TreePath:
                return FieldType.TreePath;
            default:
                return null;
        }
    }

    private _isWorkItemOptions(flagOrOptions: boolean | WorkItemOptions): flagOrOptions is WorkItemOptions {
        if (flagOrOptions) {
            const options = (<WorkItemOptions>flagOrOptions);
            return options.returnOriginalValue !== undefined;
        } else {
            return false;
        }
    }

    private _getFieldOptions(flagOrOptions?: boolean | WorkItemOptions): { returnOriginalValue: boolean } {
        let returnOriginalValue: boolean = false;
        if (this._isWorkItemOptions(flagOrOptions)) {
            ({ returnOriginalValue } = { ...flagOrOptions });
        } else {
            returnOriginalValue = flagOrOptions === true;
        }

        return { returnOriginalValue };
    }
}

// Fully qualified path for work item form service
SDK_Shim.VSS.register(Contributions.WORKITEM_FORM_CONTRIBUTION_SERVICE, (context: IDefaultGetServiceContext) => {
    const instanceId = (context.hostManagementServiceOptions.initialConfig && context.hostManagementServiceOptions.initialConfig.instanceId) || context.hostManagementServiceOptions.contributionId;
    return WorkItemFormService.getInstance(context.hostManagementServiceOptions.contributionId, instanceId);
});

/**
 * Host service for opening work items
 */
class WorkItemFormNavigationServiceImpl extends TfsService implements IWorkItemFormNavigationService {
    /**
     * Open the specified work item. The host page will display the work item in a dialog,
     * or it may update the current page view, depending on the current page.
     *
     * @param workItemId The id of the work item to open
     * @param openInNewTab If true, open the work item in a new tab
     * @returns {Promise<WorkItemContract>} A promise that returns a work item when the work item dialog is closed. If openInNewTab is true, the promise will return null
     */
    public openWorkItem(workItemId: number, openInNewTab: boolean = false): Promise<WorkItemContract> {
        return new Promise((resolve, reject) => {
            if (openInNewTab) {
                WITDialogShim.showWorkItemByIdInNewTab(workItemId, this.getTfsContext());
                resolve(null);
            } else {
                WITDialogShim.showWorkItemDialogById(workItemId, this.getTfsContext(), {
                    close: (workItem: WorkItem) => {
                        resolve(workItem ? workItem.getWorkItemContract() : null);
                    }
                }, true);
            }
        });
    }

    /**
     * Open a new work item of the specified type. The host page will display the new work item in a dialog,
     * or it may update the current page view, depending on the current page.
     *
     * @param workItemTypeName The name of the work item type to open
     * @param initialValues (Optional) A dictionary of any initial field values to set after opening the new work item.
     * @returns {Promise<WorkItemContract>} A promise that returns a work item when the work item dialog is closed. If the workitem was not saved before closing the dialog, the promise will return null
     */
    public async openNewWorkItem(workItemTypeName: string, initialValues?: { [fieldName: string]: any }): Promise<WorkItemContract> {
        const processedInitialValues = {};
        if (initialValues) {
            for (const fieldName in initialValues) {
                if (initialValues.hasOwnProperty(fieldName)) {
                    const fieldValue = initialValues[fieldName];
                    processedInitialValues[fieldName] = await convertPotentialIdentityRefToWorkItemIdentityRef(fieldValue);
                }
            }
        }

        return new Promise<WorkItemContract>((resolve, reject) => {
            WITDialogShim.showNewWorkItemDialog(workItemTypeName, processedInitialValues, this.getTfsContext(), {
                close: (workItem: WorkItem) => {
                    resolve(workItem.getWorkItemContract());
                }
            });
        });
    }
}

// Fully qualified path for work item navigation service
SDK_Shim.VSS.register(WorkItemFormNavigationService.contributionId, (context: IDefaultGetServiceContext) => {
    return Service.getCollectionService(WorkItemFormNavigationServiceImpl, context.webContext);
});
