import Q = require("q");
import VSSError = require("VSS/Error");
import Contributions_Contracts = require("VSS/Contributions/Contracts");
import Contributions_RestClient = require("VSS/Contributions/RestClient");
import Combos = require("VSS/Controls/Combos");
import Controls = require("VSS/Controls");
import Diag = require("VSS/Diag");
import Dialogs = require("VSS/Controls/Dialogs");
import FeatureAvailability_Services = require("VSS/FeatureAvailability/Services");
import Notifications = require("VSS/Controls/Notifications");
import RichEditor = require("VSS/Controls/RichEditor");
import ServerConstants = require("Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants");
import Service = require("VSS/Service");
import Settings = require("VSS/Settings");
import Telemetry = require("VSS/Telemetry/Services");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import TFS_OM_Common = require("Presentation/Scripts/TFS/TFS.OM.Common");
import Utils_Core = require("VSS/Utils/Core");
import Utils_UI = require("VSS/Utils/UI");
import Utils_String = require("VSS/Utils/String");
import WITConstants = require("Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants");
import WITOM = require("WorkItemTracking/Scripts/TFS.WorkItemTracking");
import { IPageData } from "WorkItemTracking/Scripts/OM/QueryInterfaces";
import { WorkItemManager } from "WorkItemTracking/Scripts/OM/WorkItemManager";
import { PageSizes } from "WorkItemTracking/Scripts/OM/WorkItemConstants";
import WorkItemTrackingResources = require("WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking");
import VSS = require("VSS/VSS");
import WorkItemUtility = require("WorkItemTracking/Scripts/Controls/WorkItemForm/Utils");
import TreeView = require("VSS/Controls/TreeView");
import { OpenDropDownOnFocusCombo, IOpenDropDownOnFocusComboOptions } from "Presentation/Scripts/TFS/TFS.UI.Controls.OpenDropDownCombo";
import { DiscussionEditorControl, IDiscussionEditorControlOptions } from "WorkItemTracking/Scripts/Controls/WorkItemForm/TFS.Social.Discussion";
import { announce } from "VSS/Utils/Accessibility";

import Bulk_Edit_NO_REQUIRE = require("WorkItemTracking/Scripts/TFS.WorkItemTracking.Controls.BulkEdit");
import { WorkItemRichTextHelper } from "WorkItemTracking/Scripts/Utils/WorkItemRichTextHelper";

import CustomerIntelligenceConstants = require("WorkItemTracking/Scripts/CustomerIntelligence");
import { Dictionary } from "Presentation/Scripts/TFS/TFS.Core.Utils";
import { ProjectVisibility } from "TFS/Core/Contracts";

const delegate = Utils_Core.delegate;
const witCiFeature = CustomerIntelligenceConstants.WITCustomerIntelligenceFeature;

export interface IChangeTypeDialogOptions extends Dialogs.IModalDialogOptions {
    /** @property workItems ids of the workitems to change */
    workItemIds: number[];
    /** @property tfs context */
    tfsContext?: TFS_Host_TfsContext.TfsContext;
    /** @property container the container to show saving overlay for heavy bulk operations */
    container?: JQuery;
    /** @property saveOnClose indicates whether to attempt saving work items on close or to just leave work items dirtied/unsaved */
    saveOnClose?: boolean;
    /** @property errorHandler optional handler for additional error processing */
    errorHandler?: IErrorCallback;
    /** @property beforeSave optional handler invoked before save. Note that it will be invoked before saving one page of items. */
    beforeSave?: Function;
    /** @property afterSave optional handler invoked after save. Note that it will be invoked after saving one page of items. */
    afterSave?: Function;
    /** @property onClose optional handler invoked on close */
    onClose?: Function;
    /** @property Flag indicate if the sender was requested to move/change work items from different projects. If undefined, default to false. */
    moveAcrossProjects?: boolean;
}

interface IProjectAreaIteration {
    /** @property project name */
    project: string;
    /** @property area name */
    area: string;
    /** @property iteration name */
    iteration: string;
}

export interface IWorkItemTypeChangeInfo {
    /** @property identifier for the field (string or enum) */
    fieldName: any;
    /** @property value for the update */
    value: any;
}

interface IWorkItemTypeNamesResult {
    /** @property validWorkItemNames work item types that can be moved in this project */
    validWorkItemNames: string[];
    /** @property invalidWorkItemNames work item types that are blocked from moving in this project */
    invalidWorkItemNames: string[];
}

namespace Storage {
    export namespace Keys {
        export let MoveSingle = "WorkItemMoveSingleMRU";
        export let MoveBulk = "WorkItemMoveBulkMRU";
        export let ChangeType = "WorkItemChangeTypeMRU";
    }

    export function write<T>(key: string, data: T) {
        Service.getLocalService(Settings.LocalSettingsService).write(key, data, Settings.LocalSettingsScope.Project);
    }

    export function read<T>(key: string, defaultValue: T = undefined): T {
        return Service.getLocalService(Settings.LocalSettingsService).read<T>(key, defaultValue, Settings.LocalSettingsScope.Project);
    }
}

/** This dialog is to faciliate moving work item(s) */
export class WorkItemMoveDialog extends Dialogs.ModalDialogO<IChangeTypeDialogOptions> {
    public static enhancementTypeName: string = "MoveWorkItemDialog";
    private static MOVE_DIALOG_WIDTH = "600px";
    private static TEXT_CONTROL_HEIGHT = "48px";
    private static NODE_PATH_SEPARATOR = "\\";
    private static VALIDATE_THROTTLED_DELAY_TIME = 150;

    private _projectPicker: Combos.Combo;
    private _areaPathPicker: Combos.Combo;
    private _iterationPathPicker: Combos.Combo;
    private _$projectPicker: JQuery;
    private _$areaPathPicker: JQuery;
    private _$iterationPathPicker: JQuery;
    private _workItemIds: number[];
    private _discussionControl: DiscussionEditorControl;
    private _$projectErrorTip: JQuery;
    private _$typeErrorTip: JQuery;
    private _$areaPathErrorTip: JQuery;
    private _$iterationPathErrorTip: JQuery;
    private _getContributionPromise: IPromise<Contributions_Contracts.DataProviderResult>;
    private _errorMessagePane: Notifications.MessageAreaControl;
    private _hasAttemptedMove = false;
    private _hasTypeErrorInBulkMove = false;
    private _hasHiddenTypeErrorInBulkMove = false;
    private _typePicker: OpenDropDownOnFocusCombo;
    private _isChangeWorkItemTypeEnabled: boolean;
    private _validateThrottledDelegate: IArgsFunctionR<any>;
    private _validateThrottledDelegateForProject: Function;
    private _sourceProjectIndex: number;
    private _sourceProjectName: string;
    private _sourceProjectDisplayName: string;
    private _sourceWorkItemTypeName: string;
    private _projectVisibilityMap: IDictionaryStringTo<ProjectVisibility>; // key: project name, value: ProjectVisibility
    /** Flag indicate if the wit type is allowed to move */
    private _isMoveableType: boolean = true;
    private _store: WITOM.WorkItemStore;
    private _firstWorkItem: WITOM.WorkItem;
    private _sourceProjectId: string;
    private _$container: JQuery;
    private _selectedArea: string;
    private _selectedIteration: string;
    private _hiddenTypeName: string;
    private _startTime: number;
    private _elapsedTime: number;
    private _targetProject: WITOM.Project;
    private _workItemTypeBuckets: IDictionaryStringTo<number[]>;
    /** Flag indicate if this dialog has done initialize */
    private _isInitialized: boolean = false;

    constructor(options?: IChangeTypeDialogOptions) {
        super(options);
        this._$container = options.container;
        this._workItemIds = options.workItemIds;
        this._projectVisibilityMap = {};
    }

    public initializeOptions(options?: IChangeTypeDialogOptions) {
        /// START: override common options
        (<any>options).width = WorkItemMoveDialog.MOVE_DIALOG_WIDTH;
        /// END: override common options
        super.initializeOptions($.extend({
            title: WorkItemTrackingResources.MoveWorkItemDialogTitle,
            bowtieVersion: 2,
            defaultButton: "ok"
        }, options));
    }

    public initialize() {
        super.initialize();

        // Check if the type change will be enabled on the dialog
        this._isChangeWorkItemTypeEnabled = FeatureAvailability_Services.FeatureAvailabilityService.isFeatureEnabled(ServerConstants.FeatureAvailabilityFlags.WorkItemTrackingChangeWorkItemType);
        this._store = TFS_OM_Common.ProjectCollection.getConnection(this._options.tfsContext).getService<WITOM.WorkItemStore>(WITOM.WorkItemStore);

        // Request the contribution for the move permission to be loaded
        WorkItemManager.get(this._store).beginGetWorkItem(this._workItemIds[0], (workItem: WITOM.WorkItem) => {
            this._firstWorkItem = workItem;
            this._sourceProjectId = workItem.project.guid;
            this._sourceProjectName = this._firstWorkItem.getOriginalWorkItemType().project.name;
            this._sourceProjectDisplayName = this._sourceProjectName;
            if (!this._isBulkOperationAcrossProject()) {
                this._sourceProjectDisplayName = this._sourceProjectName.concat(" ", WorkItemTrackingResources.MoveWorkItemDialogCurrentProjLabel);
            }
            this._sourceWorkItemTypeName = this._firstWorkItem.getOriginalWorkItemType().name;

            const areaId = workItem.getFieldValue(WITConstants.CoreField.AreaId);
            const contributionsClient = TFS_OM_Common.ProjectCollection.getConnection(this._options.tfsContext).getHttpClient(Contributions_RestClient.ContributionsHttpClient);
            const query: Contributions_Contracts.DataProviderQuery = {
                context: {
                    properties: {
                        "areaId": areaId
                    }
                },
                contributionIds: ["ms.vss-work-web.work-item-move-permissions-data-provider"]
            };
            this._getContributionPromise = contributionsClient.queryDataProviders(query);
            this._validateThrottledDelegate = Utils_Core.throttledDelegate(this, WorkItemMoveDialog.VALIDATE_THROTTLED_DELAY_TIME, this._validate);
            this._validateThrottledDelegateForProject = Utils_Core.throttledDelegate(this, WorkItemMoveDialog.VALIDATE_THROTTLED_DELAY_TIME, this._validateProject);

            this._decorate();
            this._disableWorkitemMovePickers();
            const callback = () => {
                // Re-position the dialog after we created the content.
                this.getElement().dialog("option", "position", { my: "center", at: "center", of: window });
                this._enableWorkitemMovePickers();
                this._isInitialized = true;
            };
            this._beginPopulatePickers().then(callback, callback);
        });
    }

    private _isBulkOperation(): boolean {
        return this._workItemIds && this._workItemIds.length > 1;
    }

    private _setErrorMessage(error: TfsError) {
        this._enableWorkitemMovePickers();
        this._errorMessagePane.setMessage(error.message, Notifications.MessageAreaType.Error);
        announce(error.message);
        VSSError.publishErrorToTelemetry(error);
    }

    private _setChangeTypeError(error: TfsError) {
        if (this._isChangeWorkItemTypeEnabled) {
            this._setErrorMessage(error);
        } else {
            const errorText = Utils_String.format(WorkItemTrackingResources.MoveWorkItemTypeError, this._sourceWorkItemTypeName, this._projectPicker.getText());
            this._setProjectErrorState(errorText);
            this.updateOkButton(false);
            VSSError.publishErrorToTelemetry(error);
        }
    }

    private _hasPermission(data: any): boolean {
        if (!(data && data.workItemMovePermission && data.workItemMovePermission.hasPermission)) {
            this._errorMessagePane.setMessage(WorkItemTrackingResources.MoveWorkItemPermissionError,
                Notifications.MessageAreaType.Warning);
            announce(WorkItemTrackingResources.MoveWorkItemPermissionError);
            this._publishCI(witCiFeature.CLIENTSIDEOPERATION_WIT_MOVE_PERMISSIONS_ERROR);
            return false;
        }
        return true;
    }

    private _startMove() {
        const targetProjectName = this._getSelectedProjectName();
        const dialogDiscussionText = this._discussionControl.getMessageEntryControl().getValue();
        const fieldsToFetch = [WITConstants.CoreFieldRefNames.Id, WITConstants.CoreFieldRefNames.WorkItemType];
        let targetTypeName: string;

        // If change type is enabled, use the selected type.  Otherwise targetTypeName is null, signaling that the types will stay the same.
        if (this._typePicker) {
            const selectedType = this._typePicker.getText();
            targetTypeName = !this._isTypeNameKeepSourceType(selectedType) ? selectedType : null;
        }

        this._store.beginGetProject(targetProjectName, (targetProject: WITOM.Project) => {
            this._targetProject = targetProject;


            const validTypesPromise = this._getValidTypeNames(targetProject);
            const pageDataPromise = PagingHelper.fetchPageData(this._workItemIds, targetProject.store, fieldsToFetch);

            validTypesPromise.then((workItemTypeNames) => {
                pageDataPromise.then((workItemsFieldInfo) => {
                    // Organize all work items based on their type
                    this._workItemTypeBuckets = this._getTypeBuckets(workItemsFieldInfo);

                    // Check to make sure all types are valid for move
                    const validBulkMove = this.validateBulkMove(this._workItemTypeBuckets, workItemTypeNames.validWorkItemNames, workItemTypeNames.invalidWorkItemNames, targetProject.name, targetTypeName);

                    if (validBulkMove) {
                        this._startBulkOperation(targetProject, dialogDiscussionText, this._workItemTypeBuckets, targetTypeName).then(() => {
                            // Store the project name to local storage, so that we can use it as default selection for subsequent uses
                            const mruData: IProjectAreaIteration = { project: targetProject.name, area: this._selectedArea, iteration: this._selectedIteration };
                            Storage.write(this._isBulkOperation() ? Storage.Keys.MoveBulk : Storage.Keys.MoveSingle, mruData);

                            const telemetryData: IDictionaryStringTo<any> = {};
                            telemetryData["commentFieldUsed"] = dialogDiscussionText !== "";

                            if (this._options.saveOnClose && this._isBulkOperation() && this._elapsedTime) {
                                telemetryData["elapsedTime"] = this._elapsedTime;
                            }

                            if (this._typePicker) {
                                const typeName = this._typePicker.getText();
                                if (this._isTypeNameKeepSourceType(typeName)) {
                                    telemetryData["isTypeChanged"] = false;
                                } else {
                                    telemetryData["isTypeChanged"] = true;
                                    telemetryData["targetType"] = typeName;
                                }
                            }

                            this._publishCI(witCiFeature.CLIENTSIDEOPERATION_WIT_MOVE_SUCCESS, telemetryData);

                            this.onClose();
                        }, () => {
                            // If saveOnClose is true, the errors have already been attached to the work items,
                            // so close the dialog and let the users fix the errors on the form,
                            // else enable the pickers, so that they can try the move again.
                            this._options.saveOnClose ? this.onClose() : this._enableWorkitemMovePickers();
                        });
                    }
                }, delegate(this, this._setErrorMessage));
            }, delegate(this, this._setErrorMessage));
        }, delegate(this, this._setErrorMessage));
    }

    private _getValidTypeNames(targetProject: WITOM.Project): Q.IPromise<IWorkItemTypeNamesResult> {
        const deferred = Q.defer<any>();
        targetProject.beginGetValidWorkItemTypeNames((validWorkItemNames: string[], invalidWorkItemNames: string[]) => {
            deferred.resolve({ validWorkItemNames: validWorkItemNames, invalidWorkItemNames: invalidWorkItemNames });
        }, (error) => { deferred.reject(error); });
        return deferred.promise;
    }

    private _getSourceTypes(): IDictionaryStringTo<number> {
        const result: IDictionaryStringTo<number> = {};
        if (this._workItemTypeBuckets) {
            for (const key in this._workItemTypeBuckets) {
                if (this._workItemTypeBuckets.hasOwnProperty(key)) {
                    result[key] = this._workItemTypeBuckets[key].length;
                }
            }
        }
        return result;
    }

    public onOkClick(e?: JQueryEventObject) {
        this._disableWorkitemMovePickers();
        this._hasAttemptedMove = true;
        this._startTime = Date.now();

        this._getContributionPromise.then(
            (contributionDataResult: Contributions_Contracts.DataProviderResult) => {
                if (this._hasPermission(contributionDataResult.data["ms.vss-work-web.work-item-move-permissions-data-provider"])) {
                    this._startMove();
                }
            },
            () => {
                // On failing to retrieve permissions, let the user continue and do the check later, while saving.
                this._startMove();
            });
    }

    /**
     * Validate the Bulk Move
     * @param workItemTypeBuckets The work item type to ids dictionary
     * @param validWorkItemNames The valid work item names
     * @param invalidWorkItemNames The invalid work item
     * @param targetProjectName The target project name
     * @param targetTypeName The target type name
     * @return True if it is valid bulk move, otherwise false.
     */
    public validateBulkMove(workItemTypeBuckets: IDictionaryStringTo<number[]>, validWorkItemNames: string[], invalidWorkItemNames: string[], targetProjectName: string, targetTypeName: string): boolean {
        const invalidTypeNames: string[] = [];

        for (const typeName in workItemTypeBuckets) {
            if (workItemTypeBuckets.hasOwnProperty(typeName)) {
                const isHiddenType = invalidWorkItemNames.indexOf(typeName) >= 0;
                const isValidType = validWorkItemNames.indexOf(typeName) >= 0;

                // Hidden types can never move. Set error immediatly.  It blocks everything else.
                if (isHiddenType) {
                    this._errorMessagePane.setMessage(Utils_String.format(WorkItemTrackingResources.MoveWorkItemBlockedCase, typeName, targetProjectName), Notifications.MessageAreaType.Warning);
                    this._hiddenTypeName = typeName;
                    this.updateOkButton(false);
                    this._isMoveableType = false;
                    this._hasHiddenTypeErrorInBulkMove = true;
                    return false;
                } else if (!isValidType) {
                    invalidTypeNames.push(typeName);
                }
            }
        }

        // Set error that type does not exist in target project
        if (invalidTypeNames.length > 0 && !targetTypeName) {
            this._errorMessagePane.setMessage(Utils_String.format(WorkItemTrackingResources.MoveWorkItemBulkTypeError, invalidTypeNames.join(", "), targetProjectName),
                Notifications.MessageAreaType.Warning);
            this.updateOkButton(false);
            this._hasTypeErrorInBulkMove = true;
            this._enableWorkitemMovePickers();
            return false;
        }

        return true;
    }

    private _startBulkOperation(project: WITOM.Project, historyValue: string, workItemTypeBuckets: IDictionaryNumberTo<number[]>, targetType: string): Q.IPromise<any> {
        const deferred = Q.defer<any>();
        const types = targetType ? [targetType] : Object.keys(workItemTypeBuckets);
        this._getFieldUpdatesForTypes(project, types, historyValue).then((changesDictionary: IDictionaryStringTo<IWorkItemTypeChangeInfo[]>) => {
            this.bulkMove(changesDictionary, targetType).then(() => {
                deferred.resolve(null);
            }, deferred.reject);
        }, deferred.reject);
        return deferred.promise;
    }

    private _getFieldUpdatesForTypes(project: WITOM.Project, types: string[], historyValue: string): Q.IPromise<IDictionaryStringTo<IWorkItemTypeChangeInfo[]>> {
        const result: IDictionaryStringTo<IWorkItemTypeChangeInfo[]> = {};
        const deferred = Q.defer<IDictionaryStringTo<IWorkItemTypeChangeInfo[]>>();

        project.beginGetWorkItemTypes(types, (workItemTypes: WITOM.WorkItemType[]) => {
            workItemTypes.forEach((workItemType: WITOM.WorkItemType) => {
                result[workItemType.name] = this.getUpdatesByType(project, workItemType, historyValue);
            });
            deferred.resolve(result);
        }, (error: TfsError) => {
            this._setChangeTypeError(error);
        });
        return deferred.promise;
    }

    /**
     * Get the field Updates for passed in type.
     * @param project The target project
     * @param workItemType The Types we need get field Updates for
     * @param historyValue The value we want to set for historyValue
     * @return The updates for the passed in work item type
     */
    public getUpdatesByType(project: WITOM.Project, workItemType: WITOM.WorkItemType, historyValue: string): IWorkItemTypeChangeInfo[] {
        const changes: IWorkItemTypeChangeInfo[] = [];

        changes.push({ fieldName: WITConstants.CoreFieldRefNames.WorkItemType, value: workItemType }, //  Verify why type and not name
            { fieldName: WITConstants.CoreFieldRefNames.State, value: workItemType.getInitialState() },
            { fieldName: WITConstants.CoreFieldRefNames.TeamProject, value: project });

        if (this._isBulkOperation()) {
            if (!this._selectedArea || !this._selectedIteration) {
                this._selectedArea = this._areaPathPicker.getText();
                this._selectedIteration = this._iterationPathPicker.getText();
            }
        } else {
            // Replace the area/iteration paths
            const areaPath = this._firstWorkItem.getFieldValue(WITConstants.CoreField.AreaPath);
            const iterationPath = this._firstWorkItem.getFieldValue(WITConstants.CoreField.IterationPath);
            this._selectedArea = this._getTargetPath(project.name, areaPath);
            this._selectedIteration = this._getTargetPath(project.name, iterationPath);
        }

        changes.push({ fieldName: WITConstants.CoreFieldRefNames.AreaPath, value: this._selectedArea },
            { fieldName: WITConstants.CoreFieldRefNames.IterationPath, value: this._selectedIteration });

        if (historyValue && historyValue.trim().length > 0) {
            changes.push({ fieldName: WITConstants.CoreField.History, value: historyValue });
        }
        return changes;
    }

    /**
     * Set the options and execute the bulk move
     * @param changesDictionary changes for the move
     * @param targetType targe type for work itmes in the move (null indicates type(s) will be kept the same)
     */
    public bulkMove(changesDictionary: IDictionaryStringTo<IWorkItemTypeChangeInfo[]>, targetType: string): Q.IPromise<any> {
        const deferred = Q.defer<any>();

        VSS.using(["WorkItemTracking/Scripts/TFS.WorkItemTracking.Controls.BulkEdit"], (bulkEdit: typeof Bulk_Edit_NO_REQUIRE) => {
            // When we require a bulk experience that requires save, we need to set these options to
            // ensure a long running operation, otherwise the update will be synchronous.
            let count = 0;
            const options: any = this._options.saveOnClose ? {
                container: this._$container,
                immediateSave: this._options.saveOnClose,  // This addresses the backlog's experience to save immediately.
                beforeSave: this._options.beforeSave,
                afterSave: (workItems, changes) => {
                    if ($.isFunction(this._options.afterSave)) {
                        this._options.afterSave(workItems, changes);
                    }

                    count += workItems.length;
                    if (this._options.saveOnClose && count >= this._workItemIds.length) {
                        this._elapsedTime = Date.now() - this._startTime;
                        deferred.resolve(null);
                    }
                },
            } : {};

            let changes: IWorkItemTypeChangeInfo[] = [];
            if (targetType) {
                changes = changesDictionary[targetType];
            } else {
                // No target type means we keep the types the same and need to pass in the bulk changes dictionary
                options.bulkMoveChanges = changesDictionary;
            }

            bulkEdit.bulkUpdateWorkItems(this._options.tfsContext, this._workItemIds, changes, options, deferred.reject);

            // If we do not require an immediate save, we can synchronously resolve this promise, because bulkUpdateWorkItems will
            // synchronously set the field value updates.
            if (!this._options.saveOnClose) {
                deferred.resolve(null);
            }
        });

        return deferred.promise;
    }

    private _getTargetPath(newPrefix: string, path: string) {
        const parts = Utils_String.singleSplit(path, WorkItemMoveDialog.NODE_PATH_SEPARATOR);
        let result = newPrefix;
        if (parts.part2) {
            result = result.concat(WorkItemMoveDialog.NODE_PATH_SEPARATOR, parts.part2);
        }
        return result;
    }

    private _getTypeBuckets(workItemsFieldInfo: IPageData): IDictionaryStringTo<number[]> {
        const workItemTypeBuckets: IDictionaryStringTo<number[]> = {};
        const workItemPageData = workItemsFieldInfo.rows;

        for (let i = 0, l = workItemPageData.length; i < l; i++) {
            const currentWorkItem = workItemPageData[i];
            const currentID = currentWorkItem[0];
            const currentTypeName = currentWorkItem[1];

            const idArray = workItemTypeBuckets[currentTypeName] || [];
            idArray.push(currentID);

            workItemTypeBuckets[currentTypeName] = idArray;
        }

        return workItemTypeBuckets;
    }

    // Use the variable e to determine where the onOkClick method is called
    // If the method is called in onOkClick, then the e is undefined, because no parameter was passed in
    // If it's called by clicking cancel or X button, e is not undefined
    public onClose(e?: JQueryEventObject) {
        if (this._hasAttemptedMove && this._hasHiddenTypeErrorInBulkMove && e) {
            this._publishCI(witCiFeature.CLIENTSIDEOPERATION_WIT_MOVE_CANCEL_AFTER_HIDDEN_TYPE_FAILED);
        } else if (this._hasAttemptedMove && this._hasTypeErrorInBulkMove && e) {
            this._publishCI(witCiFeature.CLIENTSIDEOPERATION_WIT_MOVE_CANCEL_AFTER_TYPE_FAILED);
        } else if (this._hasAttemptedMove && this._hasTypeErrorInBulkMove) {
            this._publishCI(witCiFeature.CLIENTSIDEOPERATION_WIT_MOVE_SUCCEED_AFTER_TYPE_FAILED);

        } else if (!this._hasAttemptedMove && e) {
            this._publishCI(witCiFeature.CLIENTSIDEOPERATION_WIT_MOVE_CANCEL);
        }

        if (this._options.onClose && $.isFunction(this._options.onClose)) {
            this._options.onClose();
        }

        super.onClose(e);
    }

    public dispose() {
        if (this._discussionControl) {
            this._discussionControl.dispose();
            this._discussionControl = null;
        }
        super.dispose();
    }

    private _decorate() {
        const $element = this.getElement();
        $element.addClass("move-item-dialog");

        // Permission error information
        const $messageAreaContainer = $("<div>").addClass("form-section");
        this._errorMessagePane = Controls.Control.create(Notifications.MessageAreaControl, $messageAreaContainer, { showIcon: true });
        $element.append($messageAreaContainer);

        // Creating the destination project drop down
        const $destinationProjContainer = $("<div>").addClass("form-section destination-project bowtie");
        $destinationProjContainer.append("<div><label for='destinationProject'>" + WorkItemTrackingResources.MoveWorkItemDestinationLabel + "</label><input id='destinationProject' name='destinationProject' type='text' aria-required='true' /></div>").click((e: JQueryEventObject) => {
            e.preventDefault();
            e.stopImmediatePropagation();
        });
        this._$projectPicker = $destinationProjContainer.find("input[name='destinationProject']")
            .click(() => {
                if (this._projectPicker.getText() === Utils_String.empty) {
                    Utils_UI.Watermark(this._$projectPicker, { watermarkText: Utils_String.empty });
                }
            })
            .focusout(() => {
                if (this._projectPicker.getText() === Utils_String.empty) {
                    Utils_UI.Watermark(this._$projectPicker, { watermarkText: WorkItemTrackingResources.MoveWorkItemProjectWatermark });
                }
            });
        this._projectPicker = <OpenDropDownOnFocusCombo>Controls.Enhancement.enhance(OpenDropDownOnFocusCombo, this._$projectPicker, {
            allowEdit: true,
            indexChanged: delegate(this, this._onProjectChange),
            change: this._validateThrottledDelegateForProject,
            disableOpenOnKeyboardFocus: true
        } as IOpenDropDownOnFocusComboOptions);
        this._$projectErrorTip = $("<div>").addClass("input-error-tip");
        $destinationProjContainer.append(this._$projectErrorTip);
        this._$projectErrorTip.hide();
        $element.append($destinationProjContainer);

        if (this._isBulkOperation()) {
            // Creating area path drop down
            const $areaPathContainer = $("<div>").addClass("form-section area-path bowtie");
            $areaPathContainer.append("<div><label for='areaPath'>" + WorkItemTrackingResources.MoveWorkItemAreaPathLabel + "</label><input id='areaPath' name='areaPath' type='text' /></div>").click((e: JQueryEventObject) => {
                e.preventDefault();
                e.stopImmediatePropagation();
            });
            this._$areaPathPicker = $areaPathContainer.find("input[name='areaPath']")
                .click(() => {
                    if (this._areaPathPicker.getText() === Utils_String.empty) {
                        Utils_UI.Watermark(this._$areaPathPicker, { watermarkText: Utils_String.empty });
                    }
                })
                .focusout(() => {
                    if (this._areaPathPicker.getText() === Utils_String.empty) {
                        Utils_UI.Watermark(this._$areaPathPicker, { watermarkText: WorkItemTrackingResources.MoveWorkItemAreaPathWatermark });
                    }
                });
            this._areaPathPicker = <OpenDropDownOnFocusCombo>Controls.Enhancement.enhance(OpenDropDownOnFocusCombo, this._$areaPathPicker, {
                allowEdit: true, change: this._validateThrottledDelegate, type: "treeSearch", initialLevel: 2, sepChar: "\\", disableOpenOnKeyboardFocus: true
            } as IOpenDropDownOnFocusComboOptions);
            this._$areaPathErrorTip = $("<div>").addClass("input-error-tip");
            this._$areaPathErrorTip.hide();
            $areaPathContainer.append(this._$areaPathErrorTip);
            $element.append($areaPathContainer);

            // Creating iteration path drop down
            const $iterationPathContainer = $("<div>").addClass("form-section iteration-path bowtie");

            $iterationPathContainer.append("<div><label for='iterationPath'>" + WorkItemTrackingResources.MoveWorkItemIterationPathLabel + "</label><input id='iterationPath' name='iterationPath' type='text' /></div>").click((e: JQueryEventObject) => {
                e.preventDefault();
                e.stopImmediatePropagation();
            });
            this._$iterationPathPicker = $iterationPathContainer.find("input[name='iterationPath']")
                .click(() => {
                    if (this._iterationPathPicker.getText() === Utils_String.empty) {
                        Utils_UI.Watermark(this._$iterationPathPicker, { watermarkText: Utils_String.empty });
                    }
                })
                .focusout(() => {
                    if (this._iterationPathPicker.getText() === Utils_String.empty) {
                        Utils_UI.Watermark(this._$iterationPathPicker, { watermarkText: WorkItemTrackingResources.MoveWorkItemIterationPathWatermark });
                    }
                });
            this._iterationPathPicker = <OpenDropDownOnFocusCombo>Controls.Enhancement.enhance(OpenDropDownOnFocusCombo, this._$iterationPathPicker, {
                allowEdit: true,
                change: this._validateThrottledDelegate,
                type: "treeSearch",
                initialLevel: 2,
                sepChar: "\\",
                disableOpenOnKeyboardFocus: true
            } as IOpenDropDownOnFocusComboOptions);
            this._$iterationPathErrorTip = $("<div>").addClass("input-error-tip");
            this._$iterationPathErrorTip.hide();
            $iterationPathContainer.append(this._$iterationPathErrorTip);
            $element.append($iterationPathContainer);
        }
        // Creating drop down for the available types
        if (this._isChangeWorkItemTypeEnabled) {
            const $typeSelectorContainer = $("<div>").addClass("form-section type-selector bowtie");
            $typeSelectorContainer.append("<div><label for='availableTypes'>" + WorkItemTrackingResources.ChangeTypeLabel + "</label><input id='availableTypes' name='availableTypes' type='text' aria-required='true' /></div>");
            const $typePicker = $typeSelectorContainer.find("input[name='availableTypes']")
                .click(() => {
                    if (this._typePicker.getText() === Utils_String.empty) {
                        Utils_UI.Watermark($typePicker, { watermarkText: Utils_String.empty });
                    }
                })
                .focusout(() => {
                    if (this._typePicker.getText() === Utils_String.empty) {
                        Utils_UI.Watermark($typePicker, { watermarkText: WorkItemTrackingResources.MoveWorkItemChangeTypeWatermark });
                    }
                });
            this._typePicker = <OpenDropDownOnFocusCombo>Controls.Enhancement.enhance(OpenDropDownOnFocusCombo, $typePicker, {
                allowEdit: true,
                enabled: true,
                indexChanged: this._validateThrottledDelegate,
                change: this._validateThrottledDelegate,
                disableOpenOnKeyboardFocus: true
            });

            this._$typeErrorTip = $("<div>").addClass("input-error-tip");
            $typeSelectorContainer.append(this._$typeErrorTip);
            this._$typeErrorTip.hide();
            $element.append($typeSelectorContainer);
        }

        // set watermark for all pickers.
        if (this._$projectPicker) {
            Utils_UI.Watermark(this._$projectPicker, { watermarkText: WorkItemTrackingResources.MoveWorkItemProjectWatermark });
        }
        if (this._$areaPathPicker) {
            Utils_UI.Watermark(this._$areaPathPicker, { watermarkText: WorkItemTrackingResources.MoveWorkItemAreaPathWatermark });
        }
        if (this._$iterationPathPicker) {
            Utils_UI.Watermark(this._$iterationPathPicker, { watermarkText: WorkItemTrackingResources.MoveWorkItemIterationPathWatermark });
        }

        // Creating a discussion editor control and label.
        const $textEditorArea = $("<div>").addClass("form-section");
        $textEditorArea.append("<div><label>" + WorkItemTrackingResources.MoveWorkItemDiscussionLabel);
        const controlOptions = <IDiscussionEditorControlOptions>{
            createAvatar: delegate(this, () => { return $("<div>"); }),
            currentIdentity: this._options.tfsContext.currentIdentity,
            messageEntryControlType: RichEditor.RichEditor,
            messageEntryControlOptions: {
                waterMark: FeatureAvailability_Services.FeatureAvailabilityService.isFeatureEnabled(ServerConstants.FeatureAvailabilityFlags.WebAccessVersionControlPullRequestsMentions, false) ?
                    WorkItemTrackingResources.WorkItemDiscussionAddWithPRComment : WorkItemTrackingResources.WorkItemDiscussionAddComment,
                helpText: FeatureAvailability_Services.FeatureAvailabilityService.isFeatureEnabled(ServerConstants.FeatureAvailabilityFlags.WebAccessVersionControlPullRequestsMentions, false) ?
                    WorkItemTrackingResources.WorkItemDiscussionAddWithPRCommentHelpText : WorkItemTrackingResources.WorkItemDiscussionAddCommentHelpText,
                ariaLabel: WorkItemTrackingResources.MoveWorkItemDiscussionLabel,
                pageHtml: WorkItemRichTextHelper.getPageHtml(this._options.tfsContext),
                fireOnEveryChange: true,
                height: WorkItemMoveDialog.TEXT_CONTROL_HEIGHT,
                noToolbar: true,
                internal: true,
            },
            hideAvatar: true,
        };
        this._discussionControl = Controls.Control.create(DiscussionEditorControl, $textEditorArea, controlOptions);
        $element.append($textEditorArea);

        const $link = $("<a />", {
            href: "https://go.microsoft.com/fwlink/p/?LinkID=746668",
            text: WorkItemTrackingResources.MoveWorkItemMessage,
            target: "_blank",
            rel: "noopener noreferrer"
        });
        $link.append($("<span />").addClass("bowtie-icon bowtie-navigate-external"));
        $element.append($link);

        if (Utils_UI.BrowserCheckUtils.isFirefox()) {
            // Firefox/jquery dialogs do not seem to handle iframe tab events properly.  Pressing 'tab'
            // when focus is in the iframe results in the previous control being focused, so
            // we need to override it here and handle tabbing manually.
            const $discussioncontainer = $(".richeditor-container", this._discussionControl.getElement());
            $discussioncontainer.keydown((e) => {
                if (e.keyCode === Utils_UI.KeyCode.TAB && !e.altKey && !e.ctrlKey) {
                    if (!e.shiftKey) {
                        $link.focus();
                    } else if (e.shiftKey) {
                        if (this._typePicker) {
                            this._typePicker.focus();
                        } else if (this._$iterationPathPicker) {
                            this._$iterationPathPicker.focus();
                        } else {
                            this._$projectPicker.focus();
                        }
                    }

                    e.preventDefault();
                    e.stopPropagation();
                }
            });
        }
    }

    /**
     * Populate all pickers for the dialog and return promise when completed.
     */
    private _beginPopulatePickers(): IPromise<void> {
        const deferred = Q.defer<void>();
        const errorCallback = (error: TfsError) => {
            this._setErrorMessage(error);
            deferred.reject(error);
        };

        // Loading projects first
        this._store.beginGetProjects((projects: WITOM.Project[]) => {
            const projectSource = SortingHelper.sortProjectsForMove(projects);
            this._sourceProjectIndex = projectSource.indexOf(this._sourceProjectName);
            if (this._sourceProjectIndex !== -1) {
                // Replace "ProjectName" with "ProjectName (current project)" label in the drop down
                projectSource.splice(this._sourceProjectIndex, 1, this._sourceProjectDisplayName);
            }

            // build projects map
            projects.forEach(p => this._projectVisibilityMap[p.name] = p.visibility);

            // Setting source of the project combo
            this._projectPicker.setSource(projectSource);

            // If there are no target projects, disable the OK button and do not populate the target types
            if (!projectSource[0]) {
                this._disableWorkitemMovePickers();
                this.updateOkButton(false);
                deferred.resolve(null);
            } else {
                const storage = this._getProjectAreaIterationStorage();
                const projectName = storage ? storage.project : null;
                if (projectName) {
                    this._setDefaultProject(projectName, projectSource);
                    const projectName2 = this._getSelectedProjectName();
                    const successCallback = () => {
                        this._validate();
                        deferred.resolve(null);
                        Diag.logTracePoint("MoveWorkItemDialog._beginPopulatePickers.complete");
                    };
                    this._beginPopulateTypeAreaIterationPickers(projectName2, storage ? storage.area : null, storage ? storage.iteration : null)
                        .then(successCallback, errorCallback);
                } else {
                    this._setDefaultTypePickerText();
                    deferred.resolve(null);
                }
            }
        }, errorCallback);

        return deferred.promise;
    }

    private _beginGetProject(projectName: string): IPromise<WITOM.Project> {
        const deferred = Q.defer<WITOM.Project>();
        const errorCallback = (error) => {
            deferred.reject(error);
        };
        this._store.beginGetProject(projectName, (selectedProject: WITOM.Project) => {
            if (Utils_String.ignoreCaseComparer(selectedProject.name, projectName) === 0) {
                deferred.resolve(selectedProject);
            } else {
                deferred.reject("Failed to get project.");
            }
        }, errorCallback);
        return deferred.promise;
    }

    private _beginPopulateTypes(projectName: string): IPromise<void> {
        return this._beginGetProject(projectName).then((selectedProject: WITOM.Project) => {
            // Loading type names based on the selected project
            return this._getValidTypeNames(selectedProject).then((value: IWorkItemTypeNamesResult) => {
                const includedWitNames = value.validWorkItemNames;
                const invalidTypeNames = value.invalidWorkItemNames;
                if (includedWitNames.length > 0) {
                    this._typePicker.setEnabled(true);
                    // Sorting types according to the name alphabetically
                    includedWitNames.sort((w1, w2) => {
                        return w1.localeCompare(w2);
                    });

                    // If we are doing a bulk move, "Keep current types" is an option
                    if (this._isBulkOperation()) {
                        includedWitNames.unshift(WorkItemTrackingResources.MoveWorkItemKeepType);
                    }

                    this._typePicker.setSource(includedWitNames);
                }

                const currentType = this._typePicker.getText();

                // If the work item type is included in the list of unsupported types, we show a special error
                this._isMoveableType = invalidTypeNames.indexOf(this._sourceWorkItemTypeName) === -1;

                if (!currentType) {
                    // if no type selected, set to the original work item type.
                    if (this._isBulkOperation()) {
                        this._typePicker.setText(WorkItemTrackingResources.MoveWorkItemKeepType);
                    } else {
                        this._typePicker.setText(this._sourceWorkItemTypeName);
                    }
                }
            });
        });
    }

    private _setDefaultTypePickerText() {
        if (this._isChangeWorkItemTypeEnabled) {
            // show the current workitem type or bulk "Keep current types" as text in the disabled combo
            if (this._isBulkOperation()) {
                this._typePicker.setText(WorkItemTrackingResources.MoveWorkItemKeepType);
            } else {
                this._typePicker.setText(this._sourceWorkItemTypeName);
            }
        }
    }

    private _beginPopulateAreaAndIteration(projectName: string, area?: string, iteration?: string): IPromise<void> {
        const deferred = Q.defer<void>();
        const errorCallback = (error: TfsError) => {
            deferred.reject(error);
        };

        this._beginGetProject(projectName).then((selectedProject: WITOM.Project) => {
            selectedProject.nodesCacheManager.beginGetNodes().then(() => {
                const areaNodes: TreeView.TreeNode = WorkItemUtility.populateUINodes(selectedProject.nodesCacheManager.getAreaNode(true), null, 1);
                areaNodes.text = projectName;
                this._areaPathPicker.setMode("drop");
                this._areaPathPicker.setSource([areaNodes]);

                const iterationNodes: TreeView.TreeNode = WorkItemUtility.populateUINodes(selectedProject.nodesCacheManager.getIterationNode(true), null, 1);
                iterationNodes.text = projectName;
                this._iterationPathPicker.setMode("drop");
                this._iterationPathPicker.setSource([iterationNodes]);

                this._areaPathPicker.setText(area || projectName);
                this._iterationPathPicker.setText(iteration || projectName);
                deferred.resolve(null);
            }, errorCallback);
        }, errorCallback);
        return deferred.promise;
    }

    private _enableWorkitemMovePickers() {
        this._projectPicker.setEnabled(true);
        if (this._isBulkOperation()) {
            this._areaPathPicker.setEnabled(true);
            this._iterationPathPicker.setEnabled(true);
        }
        if (this._isChangeWorkItemTypeEnabled) {
            this._typePicker.setEnabled(true);
        }
    }

    private _disableWorkitemMovePickers() {
        this._projectPicker.setEnabled(false);
        if (this._isBulkOperation()) {
            this._areaPathPicker.setEnabled(false);
            this._iterationPathPicker.setEnabled(false);
        }
        if (this._isChangeWorkItemTypeEnabled) {
            this._typePicker.setEnabled(false);
        }
    }

    private _getProjectAreaIterationStorage(): IProjectAreaIteration {
        return Storage.read<IProjectAreaIteration>(this._isBulkOperation() ? Storage.Keys.MoveBulk : Storage.Keys.MoveSingle, null);
    }

    private _setDefaultProject(projectName: string, items: string[]) {
        if (projectName) {
            // If the stored name is the current project, manually set its index (won't be found in string compare due to addition of "(current project)" label)
            let previousSelection: number;
            if (this._isSourceProject(projectName)) {
                previousSelection = this._sourceProjectIndex;
            } else {
                previousSelection = items.indexOf(projectName);
            }

            if (previousSelection >= 0) {
                // the project exist in the selection.
                this._projectPicker.setSelectedIndex(previousSelection);
                this.updateOkButton(true);
            }
        }
    }

    private _onProjectChange(selectedIndex: number) {
        const successCallback = () => {
            this._validate();
            this._enableWorkitemMovePickers();
        };
        const errorCallback = (error) => {
            this._setErrorMessage(error);
        };
        this._disableWorkitemMovePickers();
        const projectName = this._getSelectedProjectName();
        this._beginPopulateTypeAreaIterationPickers(projectName).then(successCallback, errorCallback);

        if (this._isNewProject() && this._isPublicProject(projectName)) {
            this._showPublicProjectVisibilityMessage();
        }
        else {
            this._errorMessagePane.clear();
        }
    }

    private _showPublicProjectVisibilityMessage() {
        const $message = $("<span />").text(WorkItemTrackingResources.MoveWorkItemToPublicProjectMessage)
            .append($("<a />").attr(
                {
                    href: WorkItemTrackingResources.WorkItemPublicVisibilityLearnMoreLink,
                    target: "_blank",
                    rel: "noopener noreferrer"
                })
                .text(WorkItemTrackingResources.WorkItemMoveCopyPublicVisibilityLearnMoreLinkText));

        this._errorMessagePane.setMessage($message, Notifications.MessageAreaType.Info);
    }

    /**
     * Populate pickers in the dialog, and validate.
     */
    private _beginPopulateTypeAreaIterationPickers(projectName: string, area?: string, iteration?: string): IPromise<void> {
        const deferred = Q.defer<void>();
        if (this._isBulkOperation() && this._isChangeWorkItemTypeEnabled) {
            return this._beginPopulateAreaAndIteration(projectName, area, iteration).then(() => {
                return this._beginPopulateTypes(projectName);
            });
        } else if (this._isBulkOperation() && !this._isChangeWorkItemTypeEnabled) {
            return this._beginPopulateAreaAndIteration(projectName, area, iteration);
        } else if (!this._isBulkOperation() && this._isChangeWorkItemTypeEnabled) {
            return this._beginPopulateTypes(projectName);
        } else {
            deferred.resolve(null);
        }
        return deferred.promise;
    }

    private _resetProjectErrorState() {
        if (this._projectPicker) {
            this._projectPicker.getElement().removeClass("invalid");
            this._$projectErrorTip.hide();
        }
    }

    private _setProjectErrorState(errorText?: string) {
        if (this._projectPicker) {
            this.updateOkButton(false);
            this._projectPicker.getElement().addClass("invalid");
            const currentProject = this._getSelectedProjectName();
            if (!errorText) {
                errorText = currentProject ? Utils_String.format(WorkItemTrackingResources.ProjectDoesNotExist, currentProject) : WorkItemTrackingResources.ProjectNameRequired;
            }
            this._$projectErrorTip.text(errorText);
            this._$projectErrorTip.show();
            announce(errorText);
        }
    }

    private _resetTypeErrorState() {
        if (this._typePicker) {
            this._typePicker.getElement().removeClass("invalid");
            this._$typeErrorTip.hide();
        }
    }

    private _setPickerError(currentPicker: Combos.Combo, errorTip: JQuery) {
        currentPicker.getElement().addClass("invalid");
        errorTip.text(WorkItemTrackingResources.MoveWorkItemPathInvalid);
        errorTip.show();
        this.updateOkButton(false);
        announce(WorkItemTrackingResources.MoveWorkItemPathInvalid);
    }

    private _removePickerError(currentPicker: Combos.Combo, errorTip: JQuery) {
        currentPicker.getElement().removeClass("invalid");
        errorTip.hide();
    }

    private _setTypeErrorState() {
        // If it is an unmovable test type, we show an error at the top instead of the tool tip error
        if (this._typePicker && this._isMoveableType) {
            this.updateOkButton(false);
            this._typePicker.getElement().addClass("invalid");
            const currentType = this._typePicker.getText();
            const currentProject = this._getSelectedProjectName();
            const errorText = currentType ? Utils_String.format(WorkItemTrackingResources.WorkItemTypeDoesNotExist, currentType, currentProject) : WorkItemTrackingResources.WorkItemTypeNameRequired;
            this._$typeErrorTip.text(errorText);
            this._$typeErrorTip.show();
            announce(errorText);
        } else if (!this._isMoveableType) {
            const currentProject = this._getSelectedProjectName();
            this._errorMessagePane.setMessage(Utils_String.format(WorkItemTrackingResources.MoveWorkItemBlockedCase, this._hiddenTypeName ? this._hiddenTypeName : this._sourceWorkItemTypeName, currentProject), Notifications.MessageAreaType.Warning);
            this.updateOkButton(false);
            this._publishCI(witCiFeature.CLIENTSIDEOPERATION_WIT_MOVE_CANCEL_AFTER_HIDDEN_TYPE_FAILED);
        }
    }

    private _validate() {
        const isProjectValid = this._validateProject();
        if (isProjectValid) {
            const isTypeValid = this._validateType();
            const isAreaIterationValid = this._validateAreaAndIteration();
            const isChanged = this._hasProjectOrTypeChanged();
            // Ensuring that both project and type pickers contain valid input, the destination project or type has changed, and that the type is moveable. Only then is the change button enabled
            if (isTypeValid && isChanged && this._isMoveableType && isAreaIterationValid) {
                this.updateOkButton(true);
                if (this._isBulkOperation() && (this._areaPathPicker.getText() === Utils_String.empty || this._iterationPathPicker.getText() === Utils_String.empty)) {
                    this.updateOkButton(false);
                }
            } else {
                this.updateOkButton(false);
            }
        } else {
            this._resetTypeErrorState();
        }
    }

    private _isInputEmpty(picker: Combos.Combo): boolean {
        return picker ? picker.getText() === Utils_String.empty : false;
    }

    private _validateProject(): boolean {
        let isProjectValid = true;
        if (this._projectPicker) {
            // project picker is valid iff the selected project is in the dropdown list
            // or if project picker text is empty for the first time initialized.
            isProjectValid = this._projectPicker.getSelectedIndex() >= 0 || (!this._isInitialized && this._isInputEmpty(this._projectPicker));
            if (!isProjectValid) {
                this._setProjectErrorState();
            } else {
                this._resetProjectErrorState();
            }
        }
        return isProjectValid;
    }

    private _validateType(): boolean {
        // If there is no type picker, then the type is always valid as nothing is selected
        let isTypeValid = true;
        if (this._typePicker) {
            // type picker is valid iff the selected type is in the dropdown list
            // or if project picker text is empty for the first time initialized.
            isTypeValid = this._typePicker.getSelectedIndex() >= 0
                || (!this._isInitialized && this._isInputEmpty(this._projectPicker))
                || this._isTypeNameKeepSourceType(this._typePicker.getText());
        }
        isTypeValid = isTypeValid && this._isMoveableType;

        if (!isTypeValid) {
            this._setTypeErrorState();
        } else {
            this._resetTypeErrorState();
        }

        return isTypeValid;
    }

    private _validateAreaAndIteration(): boolean {
        if (this._isBulkOperation()) {
            const isAreaValid = this._isPickerSelectionValid(this._areaPathPicker, this._$areaPathErrorTip);
            const isIterationValid = this._isPickerSelectionValid(this._iterationPathPicker, this._$iterationPathErrorTip);
            return isAreaValid && isIterationValid;
        }
        // If there are no pickers, the area/iteration are automatically valid
        return true;
    }

    private _isPickerSelectionValid(currentPicker: Combos.Combo, errorTip: JQuery): boolean {
        const isValid = currentPicker.getSelectedIndex() >= 0 || this._isInputEmpty(currentPicker);
        if (isValid) {
            this._removePickerError(currentPicker, errorTip);
        } else {
            this._setPickerError(currentPicker, errorTip);
        }
        return isValid;
    }

    private _getSelectedProjectName(): string {
        // If the current project is selected, use the original name because the picker string includes "(current project)" label
        if (this._projectPicker.getSelectedIndex() === this._sourceProjectIndex) {
            return this._sourceProjectName;
        } else {
            return this._projectPicker.getText();
        }
    }

    private _isPublicProject(projectName: string): boolean {
        return this._projectVisibilityMap.hasOwnProperty(projectName) && this._projectVisibilityMap[projectName] === ProjectVisibility.Public;
    }

    private _isNewProject(): boolean {
        return this._projectPicker.getSelectedIndex() !== this._sourceProjectIndex;
    }

    private _isSourceProject(projectName: string): boolean {
        return Utils_String.ignoreCaseComparer(projectName, this._sourceProjectName) === 0 || Utils_String.ignoreCaseComparer(projectName, this._sourceProjectDisplayName) === 0;
    }

    private _isTypeNameKeepSourceType(type: string): boolean {
        return Utils_String.ignoreCaseComparer(type, WorkItemTrackingResources.MoveWorkItemKeepType) === 0;
    }

    private _isBulkOperationAcrossProject(): boolean {
        return this._options.moveAcrossProjects && this._isBulkOperation();
    }

    private _hasProjectOrTypeChanged(): boolean {
        if (this._isBulkOperationAcrossProject()) {
            return true;
        }

        let isNewType: boolean;
        const isNewProject = this._projectPicker.getSelectedIndex() !== this._sourceProjectIndex;
        const typeName = this._typePicker ? this._typePicker.getText() : null;
        if (this._isBulkOperation()) {
            isNewType = typeName ? !this._isTypeNameKeepSourceType(typeName) : false;
        } else {
            isNewType = typeName ? Utils_String.ignoreCaseComparer(typeName, this._sourceWorkItemTypeName) !== 0 : false;
        }
        return isNewProject || isNewType;
    }

    private _publishCI(feature: string, data?: any) {
        let source: string;
        if (!this._options.container) {
            source = "workItemForm";
        } else if (this._options.container.hasClass("query-result-grid")) {
            source = "queryResultGrid";
        } else if (this._options.container.hasClass("productbacklog-grid-results")) {
            source = "backlog";
        }

        const sourceTypes = this._getSourceTypes();

        const ciData = $.extend({
            source: source,
            itemCount: this._workItemIds.length,
            sourceProjectId: this._sourceProjectId,
            targetProjectId: this._targetProject ? this._targetProject.guid : "",
            sourceTypes: sourceTypes,
            sourceTypesCount: Object.keys(sourceTypes).length,
            acrossProject: !!this._options.moveAcrossProjects
        }, data || {});

        Telemetry.publishEvent(new Telemetry.TelemetryEventData(
            CustomerIntelligenceConstants.WITCustomerIntelligenceArea.WORK_ITEM_TRACKING, feature, ciData));
    }
}

interface IInvalidSourceTypeInfo {
    isValidType: boolean;
    invalidTypeName: string;
}

export class ChangeWorkItemTypeDialog extends Dialogs.ModalDialogO<IChangeTypeDialogOptions> {
    public static enhancementTypeName: string = "ChangeWorkItemTypeDialog";
    private static CHANGE_DIALOG_WIDTH = "600px";
    private static TEXT_CONTROL_HEIGHT = "48px";
    private static VALIDATE_THROTTLED_DELAY_TIME = 150;

    private _workItemIds: number[];
    private _project: WITOM.Project;
    private _errorMessagePane: Notifications.MessageAreaControl;
    private _typePicker: OpenDropDownOnFocusCombo;
    private _discussionControl: DiscussionEditorControl;
    private _$container: JQuery;
    private _$typeErrorTip: JQuery;
    private _validateThrottledDelegate: Function;
    private _hasAttemptedChange: boolean;
    private _isChangeableTypeInfo: IInvalidSourceTypeInfo;
    private _invalidTypeNames: string[];

    constructor(options?: IChangeTypeDialogOptions) {
        super(options);
        this._$container = options.container;
        this._workItemIds = options.workItemIds;
    }

    public initializeOptions(options?: IChangeTypeDialogOptions) {
        super.initializeOptions($.extend({
            title: WorkItemTrackingResources.ChangeTypeDialogTitle,
            bowtieVersion: 2,
            width: ChangeWorkItemTypeDialog.CHANGE_DIALOG_WIDTH,
            defaultButton: "ok"
        }, options));
    }

    public initialize() {
        super.initialize();
        this._validateThrottledDelegate = Utils_Core.throttledDelegate(this, ChangeWorkItemTypeDialog.VALIDATE_THROTTLED_DELAY_TIME, this._validate);
        this._decorate();
        this._populateTypes();
    }

    private _isBulkOperation(): boolean {
        return this._workItemIds && this._workItemIds.length > 1;
    }

    private _setErrorMessage(error: TfsError) {
        this._errorMessagePane.setMessage(error.message, Notifications.MessageAreaType.Error);
        announce(error.message);

        VSSError.publishErrorToTelemetry(error);
    }

    public onOkClick(e?: JQueryEventObject) {
        this._hasAttemptedChange = true;
        const dialogDiscussionText = this._discussionControl.getMessageEntryControl().getValue();
        const selectedType = this._typePicker.getText();

        const store = TFS_OM_Common.ProjectCollection.getConnection(this._options.tfsContext).getService<WITOM.WorkItemStore>(WITOM.WorkItemStore);
        this._project.beginGetWorkItemType(selectedType, (targetWorkItemType: WITOM.WorkItemType) => {
            // Check to make sure all selected Work item types can be changed.  Batch the page data if necessary.
            PagingHelper.fetchPageData(this._workItemIds, store, [WITConstants.CoreFieldRefNames.WorkItemType]).then((workItemsFieldInfo) => {
                const workItemsTypeInfo = workItemsFieldInfo.rows;
                for (let i = 0, l = workItemsTypeInfo.length; i < l; i++) {
                    const currentWorkItemInfo = workItemsTypeInfo[i];

                    const isValidType = this._invalidTypeNames.indexOf(currentWorkItemInfo[0]) === -1;
                    if (!isValidType) {
                        this._isChangeableTypeInfo.isValidType = false;
                        this._isChangeableTypeInfo.invalidTypeName = currentWorkItemInfo;
                        this._validate();
                        return;
                    }
                }

                VSS.using(["WorkItemTracking/Scripts/TFS.WorkItemTracking.Controls.BulkEdit"], (bulkEdit: typeof Bulk_Edit_NO_REQUIRE) => {
                    const changes: any = [{ fieldName: WITConstants.CoreFieldRefNames.WorkItemType, value: targetWorkItemType }];

                    const data: IDictionaryStringTo<any> = {};

                    if (dialogDiscussionText !== "") {
                        changes.push({ fieldName: WITConstants.CoreFieldRefNames.History, value: dialogDiscussionText });
                    }

                    data["commentFieldUsed"] = dialogDiscussionText !== "";

                    bulkEdit.bulkUpdateWorkItems(
                        this._options.tfsContext,
                        this._workItemIds,
                        changes,
                        { container: this._$container, immediateSave: this._options.saveOnClose },
                        this._options.errorHandler
                    );

                    // Store the type name to the local storage, so that we can use it as default selection for subsequent uses
                    Storage.write(Storage.Keys.ChangeType, selectedType);

                    this._publishCI(witCiFeature.CLIENTSIDEOPERATION_WIT_TYPE_CHANGE_SUCCESS, data);

                    this.onClose();
                });
            }, delegate(this, this._setErrorMessage));
        }, delegate(this, this._setErrorMessage));

    }

    public dispose() {
        if (this._discussionControl) {
            this._discussionControl.dispose();
            this._discussionControl = null;
        }
        super.dispose();
    }

    public onClose(e?: JQueryEventObject) {
        // Capture when user closes dialog (via button) after experiencing a dialog error
        if (this._hasAttemptedChange && e) {
            this._publishCI(witCiFeature.CLIENTSIDEOPERATION_WIT_TYPE_CHANGE_CANCEL_AFTER_FAIL);
        } else if (e) {
            this._publishCI(witCiFeature.CLIENTSIDEOPERATION_WIT_TYPE_CHANGE_CANCEL_AFTER_OPEN);
        }
        super.onClose(e);
    }

    private _decorate() {
        const $element = this.getElement();
        $element.addClass("change-type-dialog");

        // Permission error information
        const $messageAreaContainer = $("<div>").addClass("form-section");
        this._errorMessagePane = Controls.Control.create(Notifications.MessageAreaControl, $messageAreaContainer, {});
        $element.append($messageAreaContainer);

        // Creating drop down for the available types
        const $typeSelectorContainer = $("<div>").addClass("form-section type-selector bowtie");
        $typeSelectorContainer.append("<div><label for='availableTypes'>" + WorkItemTrackingResources.ChangeTypeLabel + "</label><input id='availableTypes' name='availableTypes' type='text' aria-required='true' /></div>").click((e: JQueryEventObject) => {
            e.preventDefault();
            e.stopImmediatePropagation();
        });
        const $pickerElement = $typeSelectorContainer.find("input[name='availableTypes']")
            .click(() => {
                if (this._typePicker.getText() === Utils_String.empty) {
                    Utils_UI.Watermark($pickerElement, { watermarkText: Utils_String.empty });
                }
            })
            .focusout(() => {
                if (this._typePicker.getText() === Utils_String.empty) {
                    Utils_UI.Watermark($pickerElement, { watermarkText: WorkItemTrackingResources.MoveWorkItemChangeTypeWatermark });
                }
            });

        this._typePicker = <OpenDropDownOnFocusCombo>Controls.Enhancement.enhance(OpenDropDownOnFocusCombo, $pickerElement, {
            allowEdit: true,
            enabled: true,
            change: this._validateThrottledDelegate,
            disableOpenOnKeyboardFocus: true
        } as IOpenDropDownOnFocusComboOptions);

        Utils_UI.Watermark($pickerElement, { watermarkText: WorkItemTrackingResources.MoveWorkItemChangeTypeWatermark });
        this._$typeErrorTip = $("<div>").addClass("input-error-tip");
        $typeSelectorContainer.append(this._$typeErrorTip);
        this._$typeErrorTip.hide();
        $element.append($typeSelectorContainer);

        // Creating a discussion control and label.
        const $textEditorArea = $("<div>").addClass("form-section");

        $textEditorArea.append("<div><label>" + WorkItemTrackingResources.ChangeTypeDiscussionLabel);
        const controlOptions = <IDiscussionEditorControlOptions>{
            createAvatar: delegate(this, () => { return $("<div>"); }),
            currentIdentity: this._options.tfsContext.currentIdentity,
            messageEntryControlType: RichEditor.RichEditor,
            messageEntryControlOptions: {
                waterMark: FeatureAvailability_Services.FeatureAvailabilityService.isFeatureEnabled(ServerConstants.FeatureAvailabilityFlags.WebAccessVersionControlPullRequestsMentions, false) ?
                    WorkItemTrackingResources.WorkItemDiscussionAddWithPRComment : WorkItemTrackingResources.WorkItemDiscussionAddComment,
                helpText: FeatureAvailability_Services.FeatureAvailabilityService.isFeatureEnabled(ServerConstants.FeatureAvailabilityFlags.WebAccessVersionControlPullRequestsMentions, false) ?
                    WorkItemTrackingResources.WorkItemDiscussionAddWithPRCommentHelpText : WorkItemTrackingResources.WorkItemDiscussionAddCommentHelpText,
                ariaLabel: WorkItemTrackingResources.ChangeTypeDiscussionLabel,
                pageHtml: WorkItemRichTextHelper.getPageHtml(this._options.tfsContext),
                fireOnEveryChange: true,
                height: ChangeWorkItemTypeDialog.TEXT_CONTROL_HEIGHT,
                noToolbar: true,
                internal: true
            },
            hideAvatar: true,
        };

        this._discussionControl = Controls.Control.create(DiscussionEditorControl, $textEditorArea, controlOptions);
        $element.append($textEditorArea);

        const $link = $("<a />", {
            href: "https://go.microsoft.com/fwlink/p/?LinkID=746670",
            text: WorkItemTrackingResources.ChangeTypeMessage,
            target: "_blank",
            rel: "noopener noreferrer"
        });
        $link.append($("<span />").addClass("bowtie-icon bowtie-navigate-external"));
        $element.append($link);

        if (Utils_UI.BrowserCheckUtils.isFirefox()) {
            // Firefox/jquery dialogs do not seem to handle iframe tab events properly.  Pressing 'tab'
            // when focus is in the iframe results in the previous control being focused, so
            // we need to override it here and handle tabbing manually.
            const $discussioncontainer = $(".richeditor-container", this._discussionControl.getElement());
            $discussioncontainer.keydown((e) => {
                if (e.keyCode === Utils_UI.KeyCode.TAB) {
                    if (!e.shiftKey) {
                        $link.focus();
                    } else if (e.shiftKey) {
                        this._typePicker.focus();
                    }

                    e.preventDefault();
                    e.stopPropagation();
                }
            });
        }
    }

    private _populateTypes() {
        this.updateOkButton(false);
        this._typePicker.setEnabled(false);

        const store = TFS_OM_Common.ProjectCollection.getConnection(this._options.tfsContext).getService<WITOM.WorkItemStore>(WITOM.WorkItemStore);
        WorkItemManager.get(store).beginGetWorkItem(this._workItemIds[0], (workItem: WITOM.WorkItem) => {
            workItem.project.beginGetValidWorkItemTypeNames((validWitNames: string[], invalidWitNames: string[]) => {
                // Set the project and invalid names when we have access to them
                this._project = workItem.project;
                this._invalidTypeNames = invalidWitNames;

                const sortedWitItems = SortingHelper.sortTypesForChange(validWitNames, this._isBulkOperation() ? null : workItem.workItemType.name);

                // Setting source of type combo
                this._typePicker.setSource(sortedWitItems);

                // Enable the target dropdown, if there is at least one target type
                if (sortedWitItems[0]) {
                    this._typePicker.setEnabled(true);
                    this._setDefaultType(sortedWitItems);
                }

                this._isChangeableTypeInfo = {
                    isValidType: true,
                    invalidTypeName: ""
                };

                // If the work item type appears in the list of unsupported types, we show a special dialog error
                // On bulk move we will show an unsupported error in the work item form, not the dialog
                if (this._workItemIds.length === 1) {
                    const currentTypeName = workItem.workItemType.name;
                    if (invalidWitNames.indexOf(currentTypeName) >= 0) {
                        this._isChangeableTypeInfo.isValidType = false;
                        this._isChangeableTypeInfo.invalidTypeName = currentTypeName;
                        this._validate();
                    }
                }

                Diag.logTracePoint("ChangeWorkItemType._populateTypes.complete");
            }, delegate(this, this._setErrorMessage));
        }, delegate(this, this._setErrorMessage));
    }

    private _setDefaultType(items: string[]) {
        const selectedType = Storage.read<string>(Storage.Keys.ChangeType);
        const previousSelection = items.indexOf(selectedType);
        if (previousSelection >= 0) {
            this._typePicker.setSelectedIndex(previousSelection);
            this.updateOkButton(true);
        } else {
            const picker = this._typePicker.getElement().find("input[name='availableTypes']");
            Utils_UI.Watermark(picker, { watermarkText: WorkItemTrackingResources.MoveWorkItemChangeTypeWatermark });
        }
    }

    private _validate() {
        if (!this._isChangeableTypeInfo.isValidType) {
            this._errorMessagePane.setMessage(Utils_String.format(WorkItemTrackingResources.ChangeTypeBlockedCase, this._isChangeableTypeInfo.invalidTypeName), Notifications.MessageAreaType.Warning);
            this.updateOkButton(false);
        } else if (this._typePicker.getSelectedIndex() === -1) {
            this.updateOkButton(false);
            this._typePicker.getElement().addClass("invalid");
            const currentType = this._typePicker.getText();
            const errorText = currentType ? Utils_String.format(WorkItemTrackingResources.WorkItemTypeDoesNotExist, currentType) : WorkItemTrackingResources.WorkItemTypeNameRequired;
            this._$typeErrorTip.text(errorText);
            this._$typeErrorTip.show();
            announce(errorText);
        } else {
            this.updateOkButton(true);
            this._typePicker.getElement().removeClass("invalid");
            this._$typeErrorTip.hide();
        }
    }

    private _publishCI(feature: string, data?: any) {
        let source: string;
        if (!this._options.container) {
            source = "workItemForm";
        } else if (this._options.container.hasClass("query-result-grid")) {
            source = "queryResultGrid";
        } else if (this._options.container.hasClass("productbacklog-grid-results")) {
            source = "backlog";
        }

        const ciData = $.extend({
            source: source,
            itemCount: this._workItemIds.length,
            projectId: this._project ? this._project.guid : ""
        }, data || {});

        Telemetry.publishEvent(new Telemetry.TelemetryEventData(
            CustomerIntelligenceConstants.WITCustomerIntelligenceArea.WORK_ITEM_TRACKING, feature, ciData));
    }

}

export namespace PagingHelper {
    /**
     * Get the specifed work item fields for all work items selected.  Page through to send all in correctly sized batches.
     * @param workItemIds work items we want data for
     * @param store the store to get the work item data from
     * @param fieldsToFetch the fields requested
     */
    export function fetchPageData(workItemIds: number[], store: WITOM.WorkItemStore, fieldsToFetch: string[]): Q.IPromise<IPageData> {
        let currentPage = 0;
        const pageSize = PageSizes.QUERY;
        const deferred = Q.defer<any>();
        let workItemsFieldInfo: IPageData;

        while (currentPage * pageSize < workItemIds.length) {
            const pageIds = workItemIds.slice(currentPage * pageSize, currentPage * pageSize + pageSize);
            currentPage++;

            store.beginPageWorkItems(pageIds, fieldsToFetch, (pageData: IPageData) => {
                if (workItemsFieldInfo) {
                    workItemsFieldInfo.rows = workItemsFieldInfo.rows.concat(pageData.rows);
                } else {
                    workItemsFieldInfo = pageData;
                }

                // When all of the work items have been fetched, return the data
                if (workItemIds.length === workItemsFieldInfo.rows.length) {
                    deferred.resolve(workItemsFieldInfo);
                }
            }, deferred.reject);
        }

        return deferred.promise;
    }
}

export namespace SortingHelper {
    /**
     * Sorts the provided projects into alphabetical order.
     * @param {WITOM.Project[]} projects - The list of projects to sort
     */
    export function sortProjectsForMove(projects: WITOM.Project[]): string[] {
        const results = projects.map(p => p.name);

        // Sorting projects according to the name alphabetically
        results.sort((p1, p2) => {
            return p1.localeCompare(p2);
        });

        return results;
    }

    /**
     * Sorts the provided work item types into alphabetical order. Removes the current work item's type from the list.
     * @param {string[]} types - The list of type names to sort
     * @param {string} currentType - This work item's type.
     */
    export function sortTypesForChange(types: string[], currentType: string): string[] {
        // Sorting types according to the name alphabetically
        const results = types.slice(0);

        results.sort((w1, w2) => {
            return w1.localeCompare(w2);
        });

        const indexOfCurrentType = results.indexOf(currentType);
        if (indexOfCurrentType !== -1) {
            results.splice(indexOfCurrentType, 1);
        }

        return results;
    }
}
