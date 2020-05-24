/// <reference types="knockout" />

import ko = require("knockout");

import Admin = require("Admin/Scripts/TFS.Admin");
import AdminDialogFieldContracts = require("Admin/Scripts/TFS.Admin.Dialogs.FieldContracts");
import AdminProcessContracts = require("Admin/Scripts/Contracts/TFS.Admin.Process.Contracts");
import adminResources = require("Admin/Scripts/Resources/TFS.Resources.Admin");
import TFS_Admin_Common = require("Admin/Scripts/TFS.Admin.Common");

import Ajax = require("Presentation/Scripts/TFS/TFS.Legacy.Ajax");
import TFS_Core_Ajax = require("Presentation/Scripts/TFS/TFS.Legacy.Ajax");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import WITConstants = require("Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants");

import ProcessContracts = require("TFS/WorkItemTracking/ProcessContracts");
import ProcessHttpClient = require("TFS/WorkItemTracking/ProcessRestClient");

import Contrib_Contracts = require("VSS/Contributions/Contracts");
import Contrib_Services = require("VSS/Contributions/Services");
import Controls = require("VSS/Controls");
import FormInput_Contracts = require("VSS/Common/Contracts/FormInput");
import Notifications = require("VSS/Controls/Notifications");
import Service = require("VSS/Service");
import Utils_Array = require("VSS/Utils/Array");
import Utils_Date = require("VSS/Utils/Date");
import Utils_String = require("VSS/Utils/String");
import Utils_UI = require("VSS/Utils/UI");
import VSS = require("VSS/VSS");

import { WebSettingsService, WebSettingsScope } from "Presentation/Scripts/TFS/TFS.WebSettingsService";
import TFS_OM_Common = require("Presentation/Scripts/TFS/TFS.OM.Common");
import Telemetry = require("VSS/Telemetry/Services");
import FeatureAvailability_Services = require("VSS/FeatureAvailability/Services");
import TFS_Server_WebAccess_Constants = require("Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants");
import { IAjaxPanelOptions } from "VSS/Controls/Panels";

var tfsContext = TFS_Host_TfsContext.TfsContext.getDefault();
var hostConfig = TFS_Host_TfsContext.TfsContext.getDefault().configuration;
var HostTfsContext = TFS_Host_TfsContext.TfsContext;
var domElem = Utils_UI.domElem;

export module ProcessFieldContracts {
    /*
        // Valid field types but not support for added fields
        adminResources.Identity,
        adminResources.TreePath,
        adminResources.History,
        adminResources.PlainText,
        adminResources.Boolean
    */
    export var FieldTypeLabels: string[] = [
        adminResources.Boolean,
        adminResources.DateTime,
        adminResources.Decimal,
        adminResources.Identity,
        adminResources.Integer,
        adminResources.PicklistString,
        adminResources.PicklistInteger,
        adminResources.String,
        adminResources.HTML,
    ];

    /// Fields that are used in the header of the work item form or the injected parts of the work item.
    /// 
    /// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
    /// Header fields are hard-coded in server side too (LegacyFormDeserializer.cs).
    /// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
    ///
    export var NonCustomizableFields: string[] = [
        WITConstants.CoreFieldRefNames.AreaId,
        WITConstants.CoreFieldRefNames.AttachedFileCount,
        WITConstants.CoreFieldRefNames.ExternalLinkCount,
        WITConstants.CoreFieldRefNames.History,
        WITConstants.CoreFieldRefNames.HyperLinkCount,
        WITConstants.CoreFieldRefNames.Id,
        WITConstants.CoreFieldRefNames.IterationId,
        WITConstants.CoreFieldRefNames.LinkType,
        WITConstants.CoreFieldRefNames.NodeName,
        WITConstants.CoreFieldRefNames.Rev,
        WITConstants.CoreFieldRefNames.RevisedDate,
        WITConstants.CoreFieldRefNames.Tags,
    ];
}

export interface IProcessDataProvider {
    beginGetBehaviors(processTypeId: string, callback: IProcessBehaviorsDataCallback): void;
    beginGetFieldUsage(processTypeId: string, callback: IProcessFieldUsageDataCallback, waitTarget: JQuery): void;
    invalidateCache(processTypeId: string): void;
}

/** Utility class for extracting meta data from fields */
export class ProcessFieldHelper {

    public getWorkItemTypeUsage(usages: AdminProcessContracts.ProcessFieldUsage[], workItemTypeId: string): AdminProcessContracts.ProcessFieldUsage {
        if (usages) {
            for (let i = 0; i < usages.length; ++i) {
                if (usages[i].WorkItemTypeId === workItemTypeId) {
                    return usages[i];
                }
            }
        }
        return null;
    }

    public getFieldProperties(field: AdminProcessContracts.ProcessField, workItemType: ProcessContracts.ProcessWorkItemType): AdminProcessContracts.ProcessFieldProperties {
        if (workItemType) {
            var type: AdminProcessContracts.ProcessFieldUsage = field && this.getWorkItemTypeUsage(field.Usages, workItemType.referenceName);
            return type ? type.Properties : null;
        } else {
            return field.Properties;
        }
    }

    public getIsRequired(field: AdminProcessContracts.ProcessField, workItemType: ProcessContracts.ProcessWorkItemType): boolean {
        var properties: AdminProcessContracts.ProcessFieldProperties = this.getFieldProperties(field, workItemType);
        return (properties != null) // to prevent returning null instead of false
		    && properties.IsRequired;
    }

    public getIsRequiredInParent(field: AdminProcessContracts.ProcessField, workItemType: ProcessContracts.ProcessWorkItemType): boolean {
        var properties: AdminProcessContracts.ProcessFieldProperties = this.getFieldProperties(field, workItemType);
        return properties && properties.IsRequiredInParent;
    }

    public getIsReadOnly(field: AdminProcessContracts.ProcessField, workItemType: ProcessContracts.ProcessWorkItemType): boolean {
        var properties: AdminProcessContracts.ProcessFieldProperties = this.getFieldProperties(field, workItemType);
        return properties && properties.IsReadOnly;
    }

    public getDefaultValue(field: AdminProcessContracts.ProcessField, workItemType: ProcessContracts.ProcessWorkItemType): AdminProcessContracts.IDefault {
        var properties: AdminProcessContracts.ProcessFieldProperties = this.getFieldProperties(field, workItemType);
        var _default: AdminProcessContracts.IDefault = properties ? properties.Default : null;
        _default = _default || { Value: "", Vsid: "" };
        if (_default.Value) {
            if (field.Type === ProcessContracts.FieldType[ProcessContracts.FieldType.DateTime]) {
                if (_default.Value !== adminResources.DateTimeDefaultFromClockToken) {
                    //parse the date string, convert to users timezone, format date to user's locale setting
                    _default.Value = Utils_Date.localeFormat(
                        Utils_Date.parseDateString(
                            _default.Value, /*parseFormat=*/undefined, /*ignoreTimezone=*/true), "d");
                }
            }
            else if (field.Type === ProcessContracts.FieldType[ProcessContracts.FieldType.Boolean]) {
                if (_default.Value === "1" || _default.Value.toUpperCase() === "TRUE") {
                    _default.Value = "True";
                }
                else {
                    _default.Value = "False";
                }
            }
        }
        return _default;
    }

    public getAllowGroups(field: AdminProcessContracts.ProcessField, workItemType: ProcessContracts.ProcessWorkItemType): boolean {
        var properties: AdminProcessContracts.ProcessFieldProperties = this.getFieldProperties(field, workItemType);
        return properties && properties.AllowGroups;
    }

    public getDescription(field: AdminProcessContracts.ProcessField, workItemType: ProcessContracts.ProcessWorkItemType): string {
        var properties: AdminProcessContracts.ProcessFieldProperties = this.getFieldProperties(field, workItemType);
        return properties && properties.HelpText || field.Description;
    }

    public getFieldTypeLabelFromField(field: AdminProcessContracts.ProcessField): string {
        return this._getFieldTypeLabel(field.Type,
            field.PickListId && field.PickListId !== Utils_String.EmptyGuidString);
    }

    public getFieldTypeLabelFromFieldData(field: AdminDialogFieldContracts.FieldData): string {
        var fieldType: string = ProcessContracts.FieldType[field.type];
        return this._getFieldTypeLabel(fieldType,
            field.pickListId && field.pickListId !== Utils_String.EmptyGuidString);
    }

    private _getFieldTypeLabel(fieldType: string, isPicklist: boolean): string {
        if (isPicklist) {
            if (fieldType === ProcessContracts.FieldType[ProcessContracts.FieldType.Integer]) {
                return adminResources.PicklistInteger;
            }
            else if (fieldType === ProcessContracts.FieldType[ProcessContracts.FieldType.String]) {
                return adminResources.PicklistString;
            }
        }
        return this._fieldTypeMap[ProcessContracts.FieldType[fieldType]]
    }

    public getFieldType(fieldType: ProcessContracts.FieldType, isPicklist: boolean): ExtendedFieldType {
        if (isPicklist) {
            switch (fieldType) {
                case ProcessContracts.FieldType.Integer:
                    return { fieldType: ProcessContracts.FieldType.Integer, isPicklist: true };
                case ProcessContracts.FieldType.String:
                    return { fieldType: ProcessContracts.FieldType.String, isPicklist: true };
            }
        }
        return { fieldType: fieldType, isPicklist: false };
    }

    public getFieldTypeFromLabel(fieldTypeLabel: string): ExtendedFieldType {
        if (fieldTypeLabel === adminResources.PicklistInteger) {
            return { fieldType: ProcessContracts.FieldType.Integer, isPicklist: true };
        }
        if (fieldTypeLabel === adminResources.PicklistString) {
            return { fieldType: ProcessContracts.FieldType.String, isPicklist: true };
        }

        for (var key in this._fieldTypeMap) {
            if (Utils_String.equals(this._fieldTypeMap[key], fieldTypeLabel, true)) {
                return { fieldType: parseInt(key), isPicklist: false };
            }
        }

        return { fieldType: ProcessContracts.FieldType.String, isPicklist: false };
    }

    /** Checks is the type is numeric picklist */
    public isNumericTypeForPicklist(type: ProcessContracts.FieldType): boolean {
        return type == ProcessContracts.FieldType.Integer;
    }

    public isCoreField(fieldId: string): boolean {
        return fieldId.toLowerCase().indexOf('system.') === 0;
    }

    public isOobField(fieldId: string): boolean {
        return fieldId.toLowerCase().indexOf('microsoft.vsts.') === 0;
    }

    public isCustomField(fieldId: string): boolean {
        return !this.isCoreField(fieldId) && !this.isOobField(fieldId);
    }

    public isNonCustomizableField(fieldId: string): boolean {
        return ProcessFieldContracts.NonCustomizableFields.indexOf(fieldId) !== -1;
    }

    public isInheritedField(field: AdminProcessContracts.ProcessField, workItemType: ProcessContracts.ProcessWorkItemType): boolean {

        if (this.isCoreField(field.Id)) {
            return true;
        }

        var i, usages = field.Usages;
        for (i = 0; i < usages.length; ++i) {
            if (workItemType && Utils_String.localeIgnoreCaseComparer(usages[i].WorkItemTypeId, workItemType.referenceName) === 0) {
                return usages[i].IsInherited;
            }
        }

        return false;
    }

    public isBehaviorField(field: AdminProcessContracts.ProcessField, workItemType: ProcessContracts.ProcessWorkItemType): boolean {
        var i, usages = field.Usages;
        for (i = 0; i < usages.length; ++i) {
            if (workItemType && Utils_String.localeIgnoreCaseComparer(usages[i].WorkItemTypeId, workItemType.referenceName) === 0) {
                return usages[i].IsBehaviorField;
            }
        }

        return false;
    }

    public canEditFieldProperties(field: AdminProcessContracts.ProcessField, workItemType: ProcessContracts.ProcessWorkItemType): boolean {
        var i, usages = field.Usages;
        for (i = 0; i < usages.length; ++i) {
            if (workItemType && Utils_String.localeIgnoreCaseComparer(usages[i].WorkItemTypeId, workItemType.referenceName) === 0) {
                return usages[i].CanEditFieldProperties;
            }
        }

        return false;
    }

    public isOOBPicklist(field: AdminProcessContracts.ProcessField, workItemType: ProcessContracts.ProcessWorkItemType): boolean {
        if (field.Id && (this.isCoreField(field.Id) || this.isOobField(field.Id))) {
            var allowedValues: string[] = this.getAllowedValues(field, workItemType);
            return allowedValues && allowedValues.length > 0;
        }

        return false;
    }

    public getAllowedValues(field: AdminProcessContracts.ProcessField, workItemType: ProcessContracts.ProcessWorkItemType): string[] {
        var properties: AdminProcessContracts.ProcessFieldProperties = this.getFieldProperties(field, workItemType);
        return properties && properties.AllowedValues && properties.AllowedValues.length > 0 ? properties.AllowedValues : null;
    }

    public isRequiredInParent(field: AdminProcessContracts.ProcessField, workItemType: ProcessContracts.ProcessWorkItemType): boolean {
        if (!this.isInheritedField(field, workItemType)) {
            return false;
        }
        var i, usages = field.Usages;
        // Child WIT might not be created yet
        var parentId: string = workItemType.inherits || workItemType.referenceName;
        for (i = 0; i < usages.length; ++i) {
            if (workItemType && Utils_String.localeIgnoreCaseComparer(usages[i].WorkItemTypeId, parentId) === 0) {
                return usages[i].Properties && usages[i].Properties.IsRequired;
            }
        }
        return false;
    }

    private _fieldTypeMap: IDictionaryStringTo<string> = {
        [ProcessContracts.FieldType.Boolean]: adminResources.Boolean,
        [ProcessContracts.FieldType.DateTime]: adminResources.DateTime,
        [ProcessContracts.FieldType.Double]: adminResources.Decimal,
        [ProcessContracts.FieldType.Html]: adminResources.HTML,
        [ProcessContracts.FieldType.Identity]: adminResources.Identity,
        [ProcessContracts.FieldType.Integer]: adminResources.Integer,
        [ProcessContracts.FieldType.PlainText]: adminResources.PlainText,
        [ProcessContracts.FieldType.String]: adminResources.String,
        [ProcessContracts.FieldType.TreePath]: adminResources.TreePath,
        [ProcessContracts.FieldType.History]: adminResources.History
    };
}

export class ExtendedFieldType {
    public fieldType: ProcessContracts.FieldType;
    public isPicklist: boolean;
}

export class ProcessDescriptorInternalModel {
    public templateTypeId: string;
    public name: string;
    public description: string;
    public isEnabled: boolean;
}

export interface IReplaceUrlFragmentCallback { (processName: string): void };

export interface IProcessDescriptorViewModelOptions {
    templateTypeId: string;
    inherits: string;
    isSystemTemplate: boolean;
    editPermission: boolean;
    name: string;
    referenceName: string;
    description: string;
    isEnabled: boolean;
    isDefault: boolean;
    isInheritedTemplate?: boolean;
    isInherited?: boolean;
}

export class ProcessDescriptorViewModel {
    public processTypeId: string;
    public inherits: string;

    // Commited values. All consumers of this ViewModel should access to the commited fields using this variables
    public name: string;
    public refName: string;
    public description: string;
    public isEnabled: boolean;

    // current* - undo'able values, not yet saved. 
    // Please use current* values only if you need to access to uncommited data
    public currentName: KnockoutObservableBase<string>;
    public currentDescription: KnockoutObservable<string>;
    public currentIsEnabled: KnockoutObservable<boolean>;

    public isSystem: boolean;
    public canEdit: KnockoutObservable<boolean>;
    public isDefault: boolean;
    public isInherited: boolean;

    public currentNameValid: KnockoutObservable<boolean>;
    public currentNameValidationMessage: KnockoutObservable<string>;

    private _errorPane: Notifications.MessageAreaControl;
    private _replaceUrlFragmentCallback: IReplaceUrlFragmentCallback;
    private _processDescriptors: ProcessDescriptorViewModel[];
    private _waitTarget: JQuery;

    public static validateProcessName(processName: string, existingProcesses: ProcessDescriptorViewModel[]) {
        // NOTE:
        // This is pretty much the same logic as TFS_Admin_Common.AdminUIHelper.validateProcessName().
        // However, we can't use that method at the moment because TFS_Admin_Common.AdminUIHelper.validateProcessName() 
        // method is expected collection of ProcessGrid.Process from TFS.Admin.Dialogs, which is currently incompatible with ProcessDescriptorViewModel.
        // If we decide to refactor the logic in order to merge ProcessGrid.Process and ProcessDescriptorViewModel

        if (existingProcesses) {
            for (var i in existingProcesses) {
                if (Utils_String.localeIgnoreCaseComparer(existingProcesses[i].name, processName) === 0) {
                    return adminResources.ProcessNameMustBeUnique;
                }
            }
        }

        if (!TFS_Admin_Common.AdminUIHelper.isNameValid(processName)) {
            return adminResources.IllegalCharacters;
        }
        return null;
    }

    /*
        Params:
        replaceUrlFragmentCallback: callback to redraw the process selection control
        getProcessDescriptors: a function which returns the list of all process descriptors which are currently available in the context. Used for process validation
        errorPane: Panel to display critical or server-side errors
        waitTarget: target UI container to show "Please wait..." box during AJAX calls 
        options: the process initialization values (see constructor implementation for details). Typycally should be this.getElement()
    */
    constructor(replaceUrlFragmentCallback: IReplaceUrlFragmentCallback, processDescriptors: ProcessDescriptorViewModel[], errorPane: Notifications.MessageAreaControl, waitTarget: JQuery, options: IProcessDescriptorViewModelOptions) {
        var that = this;

        this._errorPane = errorPane;
        this._replaceUrlFragmentCallback = replaceUrlFragmentCallback;
        this._processDescriptors = processDescriptors;
        this._waitTarget = waitTarget;

        if (options) {
            this.processTypeId = options.templateTypeId;
            this.inherits = options.inherits;
            this.isSystem = options.isSystemTemplate;
            this.canEdit = ko.observable(options.editPermission);

            this.name = options.name;
            this.refName = options.referenceName;
            this.description = options.description;
            this.isEnabled = options.isEnabled;
            this.isDefault = options.isDefault;
            this.isInherited = options.isInherited || options.isInheritedTemplate;

            this.currentName = ko.observable(this.name);
            this.currentDescription = ko.observable(this.description);
            this.currentIsEnabled = ko.observable(this.isEnabled);

            this.currentNameValid = ko.observable(true);
            this.currentNameValidationMessage = ko.observable("");

            // Validation for name. No need to validate any another fields 
            this.currentName.subscribe(function (newValue) {
                if (newValue === that.name) { return; } // skip validation if name has not changed

                var errorMsg: string = ProcessDescriptorViewModel.validateProcessName(newValue, that._processDescriptors);

                if (errorMsg) {
                    that.currentNameValid(false);
                    that.currentNameValidationMessage(errorMsg);
                }
                else {
                    that.currentNameValid(true);
                }
            });

            this.currentName.subscribe((newValue: string) => that.saveName(newValue));
            this.currentDescription.subscribe((newValue: string) => that.saveDescription(newValue));
            this.currentIsEnabled.subscribe((newValue: boolean) => that.saveIsEnabled(newValue));
        }
    }

    /* 
     * Send update to the server through REST
     * specify actionName = 'SetProcessIsEnabled' to update 'Enable creating new projects using this process' flag
     * specify actionName = 'UpdateProcessInfo' to update process name or description
    */
    private _sendUpdatesToServer(processDescriptor: ProcessDescriptorInternalModel, actionName: string, callback: IResultCallback, errorCallback: IErrorCallback) {
        var that = this;

        TFS_Core_Ajax.setAntiForgeryToken($('.process-overview-form'));

        TFS_Core_Ajax.postHTML(tfsContext.getActionUrl(actionName, 'process', { area: 'api' }),
            processDescriptor,
            (success) => {
                if ($.isFunction(callback)) {
                    callback(success);
                }
            },
            (error) => {
                if ($.isFunction(errorCallback)) {
                    errorCallback(error.message);
                }
            },
            {
                wait: {
                    image: hostConfig.getResourcesFile('big-progress.gif'),
                    message: Utils_String.htmlEncode(adminResources.ProgressPleaseWait),
                    target: that._waitTarget
                }
            }
        );
    }

    // Saves "Enable creating new projects using this process" flag.
    public saveIsEnabled(newValue: boolean) {
        var self = this;

        if (newValue === this.isEnabled) {
            return; //No change, so do nothing
        }

        var processDescriptor = new ProcessDescriptorInternalModel();
        processDescriptor.templateTypeId = this.processTypeId;
        processDescriptor.isEnabled = newValue;

        this._sendUpdatesToServer(processDescriptor, 'SetProcessIsEnabled',
            () => {
                self._errorPane.clear();
                self.isEnabled = self.currentIsEnabled();
            },
            (errorMsg) => {
                self._errorPane.setMessage(errorMsg);
            });
    }

    // Saves process name.
    public saveName(newValue: string) {
        var self = this;

        if (newValue === this.name) {
            return; //No change, so do nothing
        }

        if (ProcessDescriptorViewModel.validateProcessName(newValue, this._processDescriptors)) {
            return;
        }

        var processDescriptor = new ProcessDescriptorInternalModel();
        processDescriptor.templateTypeId = this.processTypeId;
        processDescriptor.name = newValue;
        delete processDescriptor.description;

        this._sendUpdatesToServer(processDescriptor, 'UpdateProcessInfo',
            () => {
                self._errorPane.clear();
                self.name = self.currentName();
                self._replaceUrlFragmentCallback(newValue);
            },
            (errorMsg) => {
                self._errorPane.setMessage(errorMsg);
            });
    }

    // Saves process description
    public saveDescription(newValue: string) {
        var self = this;

        if (newValue === this.description) {
            return; //No change, so do nothing
        }

        var processDescriptor = new ProcessDescriptorInternalModel();
        processDescriptor.templateTypeId = this.processTypeId;
        processDescriptor.description = newValue;
        delete processDescriptor.name;

        this._sendUpdatesToServer(processDescriptor, 'UpdateProcessInfo',
            () => {
                self._errorPane.clear();
                self.description = self.currentDescription();
            },
            (errorMsg) => {
                self._errorPane.setMessage(errorMsg);
            });
    }

    // Attempts to save all current* values, if valid.
    // Restores previous values for invalid values
    public saveAll() {
        this.saveName(this.currentName());
        this.saveDescription(this.currentDescription());
        this.saveIsEnabled(this.currentIsEnabled());

        this.currentName(this.name);
        this.currentDescription(this.description);
        this.currentIsEnabled(this.isEnabled);
    }

    // Revert the current* values (if defined) and update to "real" (name, isEnabled, description) values
    public revertAll() {
        if (this.currentName) {
            if (this.currentName() === this.name) { // If the field is not yet changed, it's still needed to update the field and force notify all subscribers
                this.currentName.notifySubscribers(this.name);
            }
            else { // The value has been changed, but not yet committed, need to revert
                this.currentName(this.name);
            }
        }
        if (this.currentDescription) {
            if (this.currentDescription() === this.description) { // If the field is not yet changed, it's still needed to update the field and force notify all subscribers
                this.currentDescription.notifySubscribers(this.description);
            }
            else { // The value has been changed, but not yet committed, need to revert
                this.currentDescription(this.description);
            }
        }
        if (this.currentIsEnabled) {
            if (this.currentIsEnabled() === this.isEnabled) { // If the field is not yet changed, it's still needed to update the field and force notify all subscribers
                this.currentIsEnabled.notifySubscribers(this.isEnabled);
            }
            else { // The value has been changed, but not yet committed, need to revert
                this.currentIsEnabled(this.isEnabled);
            }
        }
        this.currentNameValid(true); // name is perfectly safe at this point, so clear the validation error message.
    }

    // Gets the inherited process descriptor view model
    public getInheritedProcessViewModel(): ProcessDescriptorViewModel {
        return Utils_Array.first(this._processDescriptors, d => d.processTypeId == this.inherits);
    }
}

export interface IProcessFieldUsageDataCallback {
    (args: AdminProcessContracts.ProcessDefinitionFieldUsageData): void;
}

export interface IProcessBehaviorsDataCallback {
    (args: ProcessContracts.ProcessBehavior[]): void;
}

export module ProcessControlOptions {
    export interface Process extends IAjaxPanelOptions {
        dataProvider: IProcessDataProvider;
        process: ProcessDescriptorViewModel;
        hasManagePermission: boolean;
    }

    export interface WorkItemType {
        workItemType: ProcessContracts.ProcessWorkItemType;
    }

    export interface ProcessAndWorkItemType extends ProcessControlOptions.Process, ProcessControlOptions.WorkItemType {
        addHistoryPoint(data: any): void;
        allProcessFields: AdminProcessContracts.ProcessDefinitionFieldUsageData;
        allBehaviors: ProcessContracts.WorkItemBehavior[];
        beginAddFieldToWorkItemType: (field: ProcessContracts.ProcessWorkItemTypeField, processId: string, witRefName: string) => IPromise<ProcessContracts.ProcessWorkItemTypeField>;
    }

    export enum WorkItemTypesViewMode {
        Enabled = 0, // Display only enabled work item types
        Disabled = 1, // Display only disabled work item types
        Both = 2 // Display both enabled and disabled work item types
    }

    export interface ProcessAndWorkItemTypeView extends ProcessControlOptions.ProcessAndWorkItemType {
        view: string;
        workItemTypesViewMode: WorkItemTypesViewMode;
    }
}

export class WorkItemTypeViewPage extends Controls.BaseControl {
    public refresh(processDescriptor: ProcessDescriptorViewModel, workItemType: ProcessContracts.ProcessWorkItemType, allProcessFields: AdminProcessContracts.ProcessDefinitionFieldUsageData) {
        throw new Error("Not Implemented");
    }
}

export module ProcessBlockingResource {

    export var WorkItemTypesBlockedFromCustomization = [
        "microsoft.vsts.workitemtypes.sharedparameter"
        , "microsoft.vsts.workitemtypes.sharedstep"
        , "microsoft.vsts.workitemtypes.codereviewrequest"
        , "microsoft.vsts.workitemtypes.codereviewresponse"
        , "microsoft.vsts.workitemtypes.feedbackrequest"
        , "microsoft.vsts.workitemtypes.feedbackresponse"];

    export var WorkItemTypesBlockedFromDisabling = [
        "microsoft.vsts.workitemtypes.testcase",
        "microsoft.vsts.workitemtypes.testplan",
        "microsoft.vsts.workitemtypes.testsuite"
    ];

}

interface ILayoutPath {
    layout: ProcessContracts.FormLayout;
    page: ProcessContracts.Page;
    section: ProcessContracts.Section;
    group: ProcessContracts.Group;
}

export class ProcessContributionHelpers {
    public static getControlContributions(): IPromise<Contrib_Contracts.Contribution[]> {
        return Service.getService(Contrib_Services.ExtensionService).getContributionsForTarget(WITConstants.WorkItemFormExtensionsConstants.ContributionTarget_Form, WITConstants.WorkItemFormExtensionsConstants.ContributionType_Control);
    }

    public static getGroupContributions(): IPromise<Contrib_Contracts.Contribution[]> {
        return Service.getService(Contrib_Services.ExtensionService).getContributionsForTarget(WITConstants.WorkItemFormExtensionsConstants.ContributionTarget_Form, WITConstants.WorkItemFormExtensionsConstants.ContributionType_Group);
    }

    public static getPageContributions(): IPromise<Contrib_Contracts.Contribution[]> {
        return Service.getService(Contrib_Services.ExtensionService).getContributionsForTarget(WITConstants.WorkItemFormExtensionsConstants.ContributionTarget_Form, WITConstants.WorkItemFormExtensionsConstants.ContributionType_Page);
    }

    public static getContributionLabel(contribution: Contrib_Contracts.Contribution): string {
        const extensionId = Contrib_Services.ExtensionHelper.getExtensionId(contribution);
        return contribution.properties[WITConstants.WorkItemFormContributionProperties.Name] || extensionId || "";
    }

    public static getContributionIconUri(contribution: Contrib_Contracts.Contribution): string {
        const baseUri = Service.getService(Contrib_Services.ExtensionService).getBaseUri(contribution);
        return `${baseUri}/Microsoft.VisualStudio.Services.Icons.Default`;
    }

    public static getContributionPublisherName(contribution: Contrib_Contracts.Contribution): string {
        const publisherId = Contrib_Services.ExtensionHelper.getPublisherId(contribution);
        const providerDisplayName = Service.getService(Contrib_Services.ExtensionService).getProviderDisplayName(contribution);
        return providerDisplayName || publisherId;
    }

    public static createContributionInputByIdsMap(contributions: Contrib_Contracts.Contribution[]):
        IDictionaryStringTo<IDictionaryStringTo<FormInput_Contracts.InputDescriptor>> {
        let result: IDictionaryStringTo<IDictionaryStringTo<FormInput_Contracts.InputDescriptor>> = {};

        if (contributions != null) {
            contributions.forEach(c => {
                if (c.id == null || c.properties == null || c.properties[WITConstants.WorkItemFormContributionProperties.Inputs] == null) {
                    return;
                }

                let inputs: FormInput_Contracts.InputDescriptor[] = c.properties[WITConstants.WorkItemFormContributionProperties.Inputs];
                if (inputs != null || inputs.length > 0) {
                    if (result[c.id] == null) {
                        result[c.id] = {};
                    }

                    inputs.forEach(input => {
                        if (input.id != null) {
                            result[c.id][input.id] = input;
                        }
                    });
                }
            });
        }

        return result;
    }

    public static isContributionInputWorkItemField(
        contributionInputByIds: IDictionaryStringTo<IDictionaryStringTo<FormInput_Contracts.InputDescriptor>>,
        contributionId: string,
        inputId: string): boolean {
        let inputs: IDictionaryStringTo<FormInput_Contracts.InputDescriptor> = contributionInputByIds[contributionId];
        let input: FormInput_Contracts.InputDescriptor = inputs == null ? null : inputs[inputId];

        if (input == null || input.type == null) {
            return false;
        }

        return Utils_String.equals(input.type, WITConstants.WorkItemFormContributionProperties.InputType_WorkItemField, true);
    }

    public static getContributionInputLowerCasedWorkItemFieldIds(
        inputIdFieldIdMap: IDictionaryStringTo<string>,
        contributionInputByIds: IDictionaryStringTo<IDictionaryStringTo<FormInput_Contracts.InputDescriptor>>,
        contributionId: string): string[] {
        let result: string[] = [];
        let inputs: IDictionaryStringTo<FormInput_Contracts.InputDescriptor> = contributionInputByIds[contributionId];
        if (inputIdFieldIdMap == null || inputs == null) {
            return result;
        }

        for (let inputId in inputIdFieldIdMap) {
            let input: FormInput_Contracts.InputDescriptor = inputs[inputId];

            if (input == null || input.type == null) {
                continue;
            }

            if (Utils_String.equals(input.type, WITConstants.WorkItemFormContributionProperties.InputType_WorkItemField, true)) {
                result.push(inputIdFieldIdMap[inputId]);
            }
        }

        return Utils_Array.unique(result.map(fieldId => fieldId.toLocaleLowerCase()));
    }
}

export namespace ProcessLayoutEvents {
    export const CONTRIBUTIONS_LOADED = "contributions_loaded";
    export interface IContributionLoadedArgs {
        contributions: Contribution[];
        contributionInputByIds: IDictionaryStringTo<IDictionaryStringTo<FormInput_Contracts.InputDescriptor>>;
    };
}

export class ProcessLayoutHelpers {

    public static SealedControls = [WITConstants.WellKnownControlNames.TestStepsControl, WITConstants.WellKnownControlNames.HtmlControl, WITConstants.WellKnownControlNames.WebpageControl, WITConstants.WellKnownControlNames.AssociatedAutomationControl, WITConstants.WellKnownControlNames.LinksControl];
    public static NonFieldControls = [WITConstants.WellKnownControlNames.LinksControl, WITConstants.WellKnownControlNames.LabelControl, WITConstants.WellKnownControlNames.AttachmentsControl, WITConstants.WellKnownControlNames.AssociatedAutomationControl];

    public static pageFromId(layout: ProcessContracts.FormLayout, pageId: string): ProcessContracts.Page {
        var result: ProcessContracts.Page = null;

        if (layout && layout.pages) {
            $.each(layout.pages, (index: number, page: ProcessContracts.Page) => {
                if (page.id == pageId) {
                    result = page;
                    return false;
                }
            });
        }

        return result;
    }

    public static sectionFromId(page: ProcessContracts.Page, sectionId: string): ProcessContracts.Section {
        var section: ProcessContracts.Section = null;

        if (page && page.sections) {
            $.each(page.sections, (index: number, currentSection: ProcessContracts.Section) => {
                if (currentSection.id === sectionId) {
                    section = currentSection;
                    return false;
                }
            });
        }

        return section;
    }

    public static sectionFromGroupId(layout: ProcessContracts.FormLayout, groupId: string): ProcessContracts.Section {
        return this._pathToGroupId(layout, groupId).section;
    }

    public static groupFromId(layout: ProcessContracts.FormLayout, groupId: string): ProcessContracts.Group {
        return this._pathToGroupId(layout, groupId).group;
    }

    public static createControlsByLowerCasedIdMap(
        layout: ProcessContracts.FormLayout,
        contributionInputByIds: IDictionaryStringTo<IDictionaryStringTo<FormInput_Contracts.InputDescriptor>>,
        expandFieldControlsFromContributionControl: boolean = true)
        : IDictionaryStringTo<ProcessContracts.Control[]> {
        let result: IDictionaryStringTo<ProcessContracts.Control[]> = {};

        if (layout == null || layout.pages == null) {
            return result;
        }

        let appendControl = (control: ProcessContracts.Control) => {
            if (control == null || control.id == null) {
                return;
            }

            if (expandFieldControlsFromContributionControl && control.isContribution) {
                if (control.contribution != null) {
                    let fieldIds: string[] = ProcessContributionHelpers.getContributionInputLowerCasedWorkItemFieldIds(
                        control.contribution.inputs, contributionInputByIds, control.contribution.contributionId);

                    fieldIds.forEach(fieldId => {
                        let list: ProcessContracts.Control[] = result[fieldId];
                        if (list == null) {
                            list = result[fieldId] = [];
                        }

                        list.push(control);
                    });
                }

                return;
            }

            let lowerCasedControlId = control.id.toLocaleLowerCase();
            let list: ProcessContracts.Control[] = result[lowerCasedControlId];
            if (list == null) {
                list = result[lowerCasedControlId] = [];
            }

            list.push(control);
        };

        for (let page of layout.pages) {
            if (page == null || page.sections == null) {
                continue;
            }

            for (let section of page.sections) {
                if (section == null || section.groups == null) {
                    continue;
                }

                for (let group of section.groups) {
                    if (group == null || section.groups == null) {
                        continue;
                    }

                    for (let control of group.controls) {
                        appendControl(control);
                    }
                }
            }
        }

        for (let systemControl of layout.systemControls) {
            if (systemControl == null) {
                continue;
            }

            appendControl(systemControl);
        }

        return result;
    }

    public static getControls(layout: ProcessContracts.FormLayout): IDictionaryStringTo<ProcessContracts.Control> {
        var controls: IDictionaryStringTo<ProcessContracts.Control> = {};

        $.each(layout.pages, (i, page) => {
            // Currently works for one page, need to change if multiple pages are supported
            if (page.pageType === ProcessContracts.PageType.Custom) {
                $.each(page.sections, (j, section) => {
                    $.each(section.groups, (k, group) => {
                        $.each(group.controls, (l, control) => {
                            controls[control.id] = control;
                        });
                    });
                });
            }
        });

        return controls;
    }

    public static getGroups(page: ProcessContracts.Page, includeSealedGroups: boolean): ProcessContracts.Group[] {
        let groups: ProcessContracts.Group[] = [];
        for (var section of page.sections) {
            for (var group of section.groups) {
                if (includeSealedGroups || !ProcessLayoutHelpers.isSealedGroup(group)) {
                    groups.push(group);
                }
            }
        }

        return groups;
    }

    public static isEmptyPage(page: ProcessContracts.Page, avoidHtmlGroups: boolean = false): boolean {
        var isEmpty = true;
        $.each(page.sections, (j, section) => {
            if (!avoidHtmlGroups) {
                if (section.groups.length > 0) {
                    isEmpty = false;
                    return false;
                }
            }
            else {
                $.each(section.groups, (k, group) => {
                    if (!ProcessLayoutHelpers.isSealedGroup(group)) {
                        if (section.groups.length > 0) {
                            isEmpty = false;
                            return false;
                        }
                    }
                });
            }
        });

        return isEmpty;
    }

    public static getPages(layout: ProcessContracts.FormLayout, includeContributedPages: boolean): ProcessContracts.Page[] {
        var pages = [];
        $.each(layout.pages, (i, page) => {
            if (page.pageType === ProcessContracts.PageType.Custom && (includeContributedPages || !page.isContribution)) {
                pages.push(page);
            }
        });

        return pages;
    }

    //sealed groups cannot have children added
    public static isSealedGroup(group: ProcessContracts.Group): boolean {
        return group &&
            (group.isContribution ||
                (group.controls && group.controls.length === 1 && Utils_Array.contains(ProcessLayoutHelpers.SealedControls, group.controls[0].controlType, Utils_String.ignoreCaseComparer)));
    }

    public static isNonFieldControl(control: ProcessContracts.Control): boolean {
        return control && Utils_Array.contains(ProcessLayoutHelpers.NonFieldControls, control.controlType, Utils_String.ignoreCaseComparer);
    }

    private static _pathToGroupId(layout: ProcessContracts.FormLayout, groupId: string): ILayoutPath {
        var path: ILayoutPath = {
            layout: layout,
            page: null,
            section: null,
            group: null,
        };

        if (layout && layout.pages) {
            $.each(layout.pages, (index: number, currentPage: ProcessContracts.Page) => {
                $.each(currentPage.sections, (sectionIndex: number, currentSection: ProcessContracts.Section) => {
                    $.each(currentSection.groups, (groupIndex: number, currentGroup: ProcessContracts.Group) => {
                        if (currentGroup.id == groupId) {
                            path.page = currentPage;
                            path.section = currentSection;
                            path.group = currentGroup;
                            return false;
                        }
                    });

                    if (path.group) {
                        return false;
                    }
                });

                if (path.group) {
                    return false;
                }
            });
        }

        return path;
    }

}

export class SectionConstants {
    public static Section1Id = "Section1";
    public static Section2Id = "Section2";
    public static Section3Id = "Section3";
    public static Section4Id = "Section4";
    public static Section1ImageId = "Section1ImageId";
    public static Section2ImageId = "Section2ImageId";
    public static Section3ImageId = "Section3ImageId";
    public static GroupSelectionRadioButtonsName = "section-selection";
}

// TFS plugin model requires this call for each tfs module.
VSS.tfsModuleLoaded("TFS.Admin.Process.Common", exports);
