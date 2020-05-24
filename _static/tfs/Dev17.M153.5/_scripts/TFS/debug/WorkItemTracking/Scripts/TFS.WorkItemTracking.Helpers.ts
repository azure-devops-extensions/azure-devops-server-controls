/// <reference types="jquery" />

import Controls = require("VSS/Controls");
import VSS = require("VSS/VSS");
import Identities_RestClient = require("VSS/Identities/Picker/RestClient");
import Identities_Services = require("VSS/Identities/Picker/Services");
import Utils_String = require("VSS/Utils/String");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import IdentityPicker = require("VSS/Identities/Picker/Controls");
import Locations = require("VSS/Locations");
import WITOM = require("WorkItemTracking/Scripts/TFS.WorkItemTracking");
import * as WorkItemTrackingResources from "WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking";
import { WitIdentityImages } from "WorkItemTracking/Scripts/Utils/WitIdentityImages";
import FeatureAvailability_Services = require("VSS/FeatureAvailability/Services");
import ServerConstants = require("Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants");
import { WorkItemStateColorsProvider } from "Presentation/Scripts/TFS/FeatureRef/WorkItemStateColorsProvider";
import { WorkItemStateCellRenderer } from "Presentation/Scripts/TFS/FeatureRef/WorkItemStateCellRenderer";
import { WITIdentityHelpers } from "TfsCommon/Scripts/WITIdentityHelpers";
import { CommonErrorDialog } from "WorkItemTracking/Scripts/Dialogs/CommonErrorDialog";
import { AttachmentsControlCIEvents } from "WorkItemTracking/Scripts/Utils/WorkItemTrackingCIEventHelper";
import { WitFormModeUtility } from "WorkItemTracking/Scripts/Utils/WitControlMode";
import * as WITWebApi from "WorkItemTracking/Scripts/TFS.WorkItemTracking.WebApi";
import * as WITConstants from "Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants";
import { ProgressAnnouncer } from "VSS/Utils/Accessibility";
import * as Utils_UI from "VSS/Utils/UI";

var TfsContext = TFS_Host_TfsContext.TfsContext;
const _attachmentChunkSize: number = 5000000; //5MB
const _fileThrottleCount: number = 20;

/**
    * Helpers for Common identity control
**/
export class WITIdentityControlHelpers {

    public static readonly IdentityPickerConsumerId = "1D08AC59-C802-43AD-B040-DF2E624C194D";
    public static readonly IdentityDisplayControlConsumerId = "944005B7-E27F-465B-B112-619B98DD4A16";

    /**
    * Returns identity picker options using given parameters
    * 
    * @param isMultiSelectControl A boolean suggesting whether its a multi select control
    * @param enableUsers A boolean suggesting whether searching users is enabled by the control
    * @param enableAAD A boolean suggesting whether AAD search is enabled by control
    * @param initialValues A list of initial entity objects for the control
    * @param nonIdentityValues Either a list of non identity values or a callback that returns non identity values
    * @param onItemSelect A callback function to be called when an item is selected from the control
    */
    public static setupCommonIdentityPickerOptions(isMultiSelectControl: boolean,
        enableUsers: boolean,
        enableAAD: boolean,
        allowedNonIdentityValues: () => string[],
        onItemSelect: (entity: Identities_RestClient.IEntity) => void,
        getPrefix: () => string,
        getFilterByScope: () => WITOM.WorkItemIdentityScope): IdentityPicker.IIdentityPickerSearchOptions {

        let commonIdentityPickerOptions: IdentityPicker.IIdentityPickerSearchOptions = {
            operationScope: {
                IMS: true,
                Source: enableAAD
            },
            identityType: <Identities_Services.IEntityType>{
                User: enableUsers,
                Group: true
            },
            multiIdentitySearch: isMultiSelectControl,
            showMruTriangle: !isMultiSelectControl,
            showTemporaryDisplayName: true,
            showMru: true,
            loadOnCreate: true,
            highlightResolved: true,
            size: IdentityPicker.IdentityPickerControlSize.Small,
            callbacks: {
                onItemSelect: (entity: Identities_RestClient.IEntity) => {
                    onItemSelect(entity);
                },
                getCustomTooltip: () => {
                    return WITIdentityControlHelpers.getCustomTooltip(getFilterByScope());

                }
            },
            getFilterByScope: getFilterByScope,
            consumerId: WITIdentityControlHelpers.IdentityPickerConsumerId
        };

        commonIdentityPickerOptions.callbacks.preDropdownRender = (entityList: Identities_RestClient.IEntity[]) => {

            var additionalEntities: Identities_RestClient.IEntity[] = [];
            var nonIdentityValues;
            let filteredEntityList = entityList;
            let filterByScope: WITOM.WorkItemIdentityScope;
            if (getFilterByScope) {
                filterByScope = getFilterByScope();
            }

            if (filterByScope) {
                if (filterByScope.nonIdentities) {
                    nonIdentityValues = filterByScope.nonIdentities;
                }
                if (filterByScope.excludeGroups) {
                    filteredEntityList = entityList.filter(e => !Utils_String.equals(e.entityType, Identities_Services.ServiceHelpers.GroupEntity, true));
                }
            }
            else if ($.isFunction(allowedNonIdentityValues)) {
                nonIdentityValues = allowedNonIdentityValues();
            }

            if (enableUsers) {
                if (nonIdentityValues && nonIdentityValues.length > 0) {
                    let prefix = getPrefix();
                    $.each(nonIdentityValues, (i: number, value: any) => {
                        var entity: Identities_RestClient.IEntity = IdentityPicker.EntityFactory.createStringEntity(value,
                            TfsContext.getDefault().configuration.getResourcesFile('notassigned-user.svg'));

                        if (prefix !== undefined && entity.displayName && entity.displayName.trim().toLowerCase().indexOf(prefix) == 0) {
                            additionalEntities.push(entity);
                        }
                    });
                }
            }

            return filteredEntityList.concat(additionalEntities);
        }

        return commonIdentityPickerOptions;
    }

    public static getCustomTooltip(scope: WITOM.WorkItemIdentityScope): string {
        return scope && Utils_String.format(scope.displayNames.length <= 10 ?
            WorkItemTrackingResources.ScopedIdentityTooltip :
            WorkItemTrackingResources.ScopedIdentityTooltipWithSuffix, scope.displayNames.join(', '));
    }

    public static parseIdentityListString(listString: string): string[] {
        if (listString === "") {
            return [];
        }
        // Look for the first non double quote characters group surrounded by double quotes
        const match: RegExpMatchArray | null = listString.match(/\"([^\"]*)\"/i);
        if (match === null) {
            return listString.split(",");
        } else {
            // If there is a match, extract identity and parse the remaining
            return this.parseIdentityListString(listString.substr(0, match.index - 1))
                .concat([match[1]])
                .concat(this.parseIdentityListString(listString.substr(match.index + match[0].length + 1)));
        }
    }

    public static toIdentityListString(list: string[]) {
        return list.map(v => `"${v}"`).join(",");
    }

    public static getIdentityDisplayControl(identity: string, container: JQuery, enableAad: boolean): JQuery {
        var entity = WITIdentityHelpers.parseUniquefiedIdentityName(identity);
        var isStringEntity = false;

        if (!entity) {
            entity = IdentityPicker.EntityFactory.createStringEntity(WorkItemTrackingResources.AssignedToEmptyText, WitIdentityImages.UnassignedImageUrl);
            isStringEntity = true;
        }
        else if (IdentityPicker.EntityFactory.isStringEntityId(entity.entityId)) {
            isStringEntity = true;
        }

        if (entity) {
            var entityIdentifier = WITIdentityHelpers.getEntityIdentifier(entity, true);

            let options: IdentityPicker.IIdentityDisplayOptions = {
                identityType: { User: true },
                operationScope: { IMS: true, Source: enableAad }, // i.e., Query for the user in whichever source is appropriate for the account (AD, AAD, MSA, IMS, etc.).
                item: isStringEntity ? entity : entityIdentifier,
                friendlyDisplayName: entity.displayName, // Display this name until the identity is asynchronously resolved.
                size: IdentityPicker.IdentityPickerControlSize.Large, // 32px
                turnOffHover: true,
                consumerId: WITIdentityControlHelpers.IdentityDisplayControlConsumerId,
            };
            var control = Controls.BaseControl.create(IdentityPicker.IdentityDisplayControl, container, options);
            return control.getElement();
        }

        return null;
    }

}

/**
 * Helpers for State circle colors
**/
export interface IStateCircleColors {
    borderColor: string,
    backgroundColor: string
}

export class WITStateCircleColors {

    public static getStateColors(state: string, workItemType: WITOM.WorkItemType): IStateCircleColors {
        var stateColors: IStateCircleColors;

        if (workItemType && workItemType.stateColors && state) {
            var color = workItemType.stateColors[state];

            if (color && color !== Utils_String.empty && Utils_String.ignoreCaseComparer(color, "#ffffff") !== 0) {
                stateColors = {
                    borderColor: color,
                    backgroundColor: color,
                }
            }
        }

        if (!stateColors) {
            // No color defined, use the defaults.
            stateColors = {
                borderColor: WorkItemStateCellRenderer.STATES_DEFAULT_COLOR,
                backgroundColor: WorkItemStateColorsProvider.DEFAULT_STATE_COLOR,
            }
        }

        return stateColors;
    }

    public static getSpanForState(state: string, workItemType: WITOM.WorkItemType): string {
        let stateColors = WITStateCircleColors.getStateColors(state, workItemType);

        return Utils_String.format("<span class='state-circle' style='border-color: {0}; background-color: {1};'></span>", stateColors.borderColor, stateColors.backgroundColor);
    }

    public static setStateColorsOnElement(stateCircle: JQuery, state: string, workItemType: WITOM.WorkItemType) {
        var stateColors = WITStateCircleColors.getStateColors(state, workItemType);

        stateCircle.css("border-color", stateColors.borderColor);
        stateCircle.css("background-color", stateColors.backgroundColor);
    }
}

export class WITFileHelper {

    public static getExtensionName(filename: string): string {

        if (!filename) {
            return Utils_String.empty;
        }

        var extNameIndex = filename.lastIndexOf(".");
        return extNameIndex >= 0 ? filename.substring(extNameIndex + 1).toLowerCase() : Utils_String.empty;
    }

    public static getExtensionNames(filenames: string[]): string[] {

        var fileExtNames: string[] = [];

        if (filenames && filenames.length > 0) {
            for (let filename of filenames) {
                let fileExtName = WITFileHelper.getExtensionName(filename);
                if (fileExtNames.indexOf(fileExtName) < 0) {
                    fileExtNames.push(fileExtName);
                }
            }
        }

        return fileExtNames;
    }

    public static getExtensionNamesFromFileList(fileList: FileList): string[] {

        var fileExtNames: string[] = [];

        if (fileList && fileList.length > 0) {
            var filenames: string[] = [];
            for (let index = 0; index < fileList.length; index++) {
                filenames.push(fileList[0].name);
            }

            fileExtNames = WITFileHelper.getExtensionNames(filenames);
        }

        return fileExtNames;
    }

    public static getMatchingIcon(filename: string): string {

        var ext = WITFileHelper.getExtensionName(filename);

        var icon = "bowtie-icon ";
        switch (ext) {
            case "jpg":
            case "jpeg":
            case "jif":
            case "jfif":
            case "jpx":
            case "fpx":
            case "pcd":
            case "bmp":
            case "img":
            case "eps":
            case "psd":
            case "wmf":
            case "png": icon += "bowtie-image"; break;
            case "gif":
            case "mp4":
            case "flv":
            case "mng":
            case "avi":
            case "qt":
            case "wmv":
            case "yuv":
            case "asf":
            case "rm":
            case "amv":
            case "m4p":
            case "m4v":
            case "mpg":
            case "mpeg":
            case "mpv":
            case "m4v":
            case "svi":
            case "f4v":
            case "mov": icon += "bowtie-video"; break;
            case "msg": icon += "bowtie-mail-message"; break;
            default: icon += "bowtie-file-content"; break;
        }

        return icon;
    }

    public static uploadFiles(files: FileList, workItem: WITOM.WorkItem): Promise<void> {
        return new Promise((resolve, reject) => {
            let attachmentsToProcessCount = files.length;
            const failedFileNames: string[] = [];
            const oversizedFileNames: string[] = [];
            const attachedFiles: WITOM.Attachment[] = [];
            const publishDropEvent = () => {
                AttachmentsControlCIEvents.publishEvent(
                    AttachmentsControlCIEvents.ACTIONS_ADD,
                    {
                        isDragDrop: true,
                        numOfFilesDropped: files.length,
                        numOfFilesAttached: attachedFiles.length,
                        numOfOversizedFiles: oversizedFileNames.length,
                        numOfRejectedFiles: failedFileNames.length,
                        oversizedFileExtNames: WITFileHelper.getExtensionNames(oversizedFileNames),
                        rejectedFileExtNames: WITFileHelper.getExtensionNames(failedFileNames),
                        inputFileExtNames: WITFileHelper.getExtensionNamesFromFileList(files),
                        workItemSessionId: workItem.sessionId
                    }
                );
            };

            if (Utils_UI.BrowserCheckUtils.isIE()) {
                if (files.length === 0) {
                    CommonErrorDialog.showDialog(
                        WorkItemTrackingResources.AttachmentUploadFailDialogTitle,
                        Utils_String.format(WorkItemTrackingResources.AttachmentUploadFailMessage, failedFileNames.join(", ")));
                    reject();
                    return;
                }
            }

            if (files && files.length > _fileThrottleCount) {
                for (let i = 0; i < files.length; i++) {
                    failedFileNames.push(files[i].name);
                }
                CommonErrorDialog.showDialog(
                    WorkItemTrackingResources.FileThrottleDialogTitle,
                    Utils_String.format(WorkItemTrackingResources.FileThrottleMessage, _fileThrottleCount)
                );
                publishDropEvent();
                reject();
                return;
            }

            const uploadAnnouncer: ProgressAnnouncer = new ProgressAnnouncer({
                announceStartMessage: WorkItemTrackingResources.AttachmentUploadingStart,
                announceEndMessage: WorkItemTrackingResources.AttachmentUploadingEnd,
                announceErrorMessage: WorkItemTrackingResources.AttachmentUploadingError,
                announceStartDelay: 0
            });

            const attachmentUploadCallback = (result: WITWebApi.IAttachmentReference, file: File, attachment: WITOM.Attachment) => {
                if (file.lastModified) {
                    attachment.resolvePlaceholder(result.id, null, new Date(file.lastModified));
                } else {
                    // File.lastModifiedDate is deprecated (https://developer.mozilla.org/en-US/docs/Web/API/File/lastModifiedDate#Browser_compatibility),
                    // but Edge (as of 42.17134.1.0) returns null for File.lastModified
                    attachment.resolvePlaceholder(result.id, null, file.lastModifiedDate);
                }
                attachedFiles.push(attachment);
                tryFinish();
            };

            const attachmentUploadErrorCallback = (error: TfsError & ProgressEvent, file: File, attachment: WITOM.Attachment) => {
                failedFileNames.push(file.name);
                attachment.remove();
                tryFinish(error && error.status);
            };

            const tryFinish = (statusCode?: string) => {
                attachmentsToProcessCount--;
                if (attachmentsToProcessCount === 0) {
                    if (failedFileNames.length > 0) {
                        uploadAnnouncer.announceError();
                        reject();
                        // If statusCode is 403 we know its a permission issue versus an issue with the files
                        CommonErrorDialog.showDialog(
                            WorkItemTrackingResources.AttachmentUploadFailDialogTitle,
                            Number(statusCode) === 403 ?
                                WorkItemTrackingResources.AttachmentUploadFailPermissionsMessage :
                                Utils_String.format(WorkItemTrackingResources.AttachmentUploadFailMessage, failedFileNames.join(", ")));
                    } else {
                        uploadAnnouncer.announceCompleted();
                        if (attachedFiles.length > 0) {
                            resolve();
                        } else {
                            reject();
                        }
                    }
                    publishDropEvent();
                }
            };

            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                if (file.size > WitFormModeUtility.maxAttachmentSize) {
                    oversizedFileNames.push(file.name);
                    // alert user about files that are too large
                    const maxAttachmentSize = (WitFormModeUtility.maxAttachmentSize / 1048576).toFixed(2);
                    CommonErrorDialog.showDialog(
                        WorkItemTrackingResources.AttachmentsOversizedDialogTitle,
                        Utils_String.format(
                            WorkItemTrackingResources.FilesUploadedExceedMaxMb,
                            maxAttachmentSize,
                            oversizedFileNames.join(", ")
                        ));
                    tryFinish();
                } else {
                    const attachment = WITOM.Attachment.create(workItem, file.name, "", "", file.size, null, null, true);
                    workItem.addLink(attachment);
                    const httpClient = workItem.store.tfsConnection.getHttpClient<WITWebApi.WorkItemTrackingHttpClient>(WITWebApi.WorkItemTrackingHttpClient);

                    const result = workItem.getComputedFieldValue(WITConstants.CoreField.AreaPath);
                    let areaPath = "";
                    if (result && result.value) {
                        areaPath = result.value;
                    }
                    if (file.size > _attachmentChunkSize && (file.slice instanceof Function)) {
                        httpClient.beginAttachmentUpload(workItem.project.guid, file, areaPath, _attachmentChunkSize, () => { return !workItem.isReset() }, file.name).then(
                            (attachmentRef: WITWebApi.IAttachmentReference) => {
                                attachmentUploadCallback(attachmentRef, file, attachment);
                            },
                            (error) => {
                                attachmentUploadErrorCallback(error, file, attachment);
                            }
                        );
                    } else {
                        httpClient.beginAttachmentUploadSimple(workItem.project.guid, file, areaPath, file.name).then(
                            (attachmentRef: WITWebApi.IAttachmentReference) => {
                                attachmentUploadCallback(attachmentRef, file, attachment);
                            },
                            (error) => {
                                attachmentUploadErrorCallback(error, file, attachment);
                            }
                        );
                    }
                }
            }
        });
    }
}

VSS.tfsModuleLoaded("TFS.WorkItemTracking.Helpers", exports);
