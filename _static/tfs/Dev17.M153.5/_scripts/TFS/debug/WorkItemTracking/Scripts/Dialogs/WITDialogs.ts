import Dialogs = require("VSS/Controls/Dialogs");
import { errorDialogOptions } from "WorkItemTracking/Scripts/Dialogs/CommonOptions";
import * as WorkItemTrackingLinkingDialogs_Async from "WorkItemTracking/Scripts/TFS.WorkItemTracking.Linking.Dialogs";
import * as CreateCopyOfWorkItemDialog_Async from "WorkItemTracking/Scripts/Dialogs/CreateCopyOfWorkItemDialog";
import VSS_Telemetry = require("VSS/Telemetry/Services");
import WITOM = require("WorkItemTracking/Scripts/TFS.WorkItemTracking");
import Diag = require("VSS/Diag");
import TFS_OM_Common = require("Presentation/Scripts/TFS/TFS.OM.Common");
import VSS = require("VSS/VSS");
import { WorkItemManager } from "WorkItemTracking/Scripts/OM/WorkItemManager";
import { LINKED_ARTIFACTS_CUSTOMER_INTELLIGENCE_AREA } from "Presentation/Scripts/TFS/Controls/LinkedArtifacts/Contracts";
import WITConstants = require("Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants");
import WIT_ChangeTypeDialogs_NO_REQUIRE = require("WorkItemTracking/Scripts/TFS.WorkItemTracking.Controls.ChangeTypeDialogs");
import Telemetry = require("VSS/Telemetry/Services");
import CIConstants = require("WorkItemTracking/Scripts/CustomerIntelligence");
import TFS_TeamAwarenessService = require("Presentation/Scripts/TFS/FeatureRef/TFS.TeamAwarenessService");
import { RegisteredLinkTypeNames } from "WorkItemTracking/Scripts/RegisteredLinkTypeNames";
import Artifacts_Services = require("VSS/Artifacts/Services");
import { ProjectProcessConfigurationService, IProjectProcessConfigurationData, ProjectProcessConfiguration } from "Presentation/Scripts/TFS/FeatureRef/TFS.AgileCommon";

import { showWorkItem } from "WorkItemTracking/SharedScripts/WorkItemFormLauncher";
import { requireModules } from "VSS/VSS";
import * as Dialogs_Async from "VSS/Controls/Dialogs";
import { first } from "VSS/Utils/Array";
import { RemoteLinkContext } from "WorkItemTracking/Scripts/OM/WorkItemInterfaces";

const getErrorMessage = VSS.getErrorMessage;

function ensureWorkItem(workItem, options, callback, errorCallback) {
    const tfsContext = options.tfsContext;

    if (workItem instanceof WITOM.WorkItem) {
        callback(workItem);
    } else {
        Diag.Debug.assert(Boolean(tfsContext), "tfs context is expected.");

        // Creating the store
        const store = TFS_OM_Common.ProjectCollection.getConnection(tfsContext).getService<WITOM.WorkItemStore>(WITOM.WorkItemStore);

        // Getting the work item asynchronously
        WorkItemManager.get(store).beginGetWorkItem(workItem,
            function (wi) {
                callback(wi);
            },
            function (err) {
                errorCallback(err);
            });
    }
}

function showErrorInDialog(error, options) {
    Dialogs.show(Dialogs.Dialog, errorDialogOptions($.extend({
        contentText: getErrorMessage(error),
        cssClass: "dialog-error"
    }, options)));
}

function getLinkType(result) {
    if (result.linkTypeEnd && result.linkTypeEnd.immutableName) {
        return result.linkTypeEnd.immutableName;
    } else if (result.linkTypeEnd) {
        return result.linkTypeEnd;
    }
    return result.linkType;
}

function createWorkItemDialog(dialogType,
    workItem: WITOM.WorkItem,
    options: any,
    getFeature: () => string,
    getProperties: (result) => IDictionaryStringTo<Object>,
    callback) {
    function publishTelemetry(workItem, result, isSourceNewLinksControl: boolean) {
        const feature = getFeature && getFeature();
        if (feature) {
            const properties = {
                ...getProperties && getProperties(result),
                "sourceWIT": workItem.workItemType.name
            };
            if (isSourceNewLinksControl) {
                VSS_Telemetry.publishEvent(new VSS_Telemetry.TelemetryEventData(
                    LINKED_ARTIFACTS_CUSTOMER_INTELLIGENCE_AREA, feature, properties
                ));
            } else {
                VSS_Telemetry.publishEvent(new VSS_Telemetry.TelemetryEventData(
                    "workItemTracking", feature, properties
                ));
            }
        }
    }

    options = {
        ...options,
        minWidth: 450,
        minHeight: 600,
        useBowtieStyle: true,
        bowtieVersion: 2,
        resizable: true
    };

    ensureWorkItem(workItem,
        options,
        function (wi) {
            options.workItem = wi;

            options.okCallback = function (result) {
                callback.call(this, wi, result);
                publishTelemetry(wi, result, options.isNewLinksControl);
            };

            Dialogs.show(dialogType, options);
        },
        function (err) {
            // If an error occurs during the get operation of a work item, displaying
            // error message in the dialog
            showErrorInDialog(err, null);
        });
}

function createBulkWorkItemDialog(dialogType, options) {
    Dialogs.show(dialogType, options);
}

export function createCopyOfWorkItem(workItem: any, options?: any, callback?) {
    /// <summary>Shows up the dialog for creating a copy of the specified work item. After selecting the project
    /// and work item type, clicking ok will pop up new work item form with necessary fields filled.</summary>
    /// <param name="workItem" type="any">Work item id or work item itself to be copied</param>
    /// <param name="options" type="object">Options for the dialog
    ///
    ///     tfsContext: if work item id is specified, tfsContext is going to be used
    ///                 to create store and get the work item object.
    /// </param>
    requireModules(["WorkItemTracking/Scripts/Dialogs/CreateCopyOfWorkItemDialog"]).spread((_Dialogs: typeof CreateCopyOfWorkItemDialog_Async) => {
        createWorkItemDialog(_Dialogs.CreateCopyOfWorkItemDialog,
            workItem,
            options,
            () => "addCopyLink",
            (result) => {
                return {
                    "newWIT": result.type
                };
            },
            (workItem: WITOM.WorkItem, result: CreateCopyOfWorkItemDialog_Async.CreateCopyOfWorkItemDialogResult) => {
                workItem.store.beginGetProject(
                    result.project,
                    (project) => {

                        project.beginGetWorkItemType(
                            result.type,
                            (type) => {
                                const copiedWorkItem = workItem.copy(type, result.copyLinks);
                                if ($.isFunction(callback)) {
                                    if (callback.call(copiedWorkItem, copiedWorkItem) === false) {
                                        return;
                                    }
                                }

                                showWorkItem(copiedWorkItem, { saveButton: true });
                            });
                    });
            });
    });
}

export function moveWorkItem(options: WIT_ChangeTypeDialogs_NO_REQUIRE.IChangeTypeDialogOptions) {
    /// <summary>Shows up the dialog for moving the specified work item. After selecting the project,
    /// clicking ok will pop up new work item form with necessary fields filled.</summary>
    /// <param name="options" type="object">Options for the dialog
    ///
    ///     workItem: work item to be moved
    ///     tfsContext: tfs context used get current user identity
    ///
    /// </param>
    VSS.using(["WorkItemTracking/Scripts/TFS.WorkItemTracking.Controls.ChangeTypeDialogs"], (_WIT_WorkitemMoveDialogs: typeof WIT_ChangeTypeDialogs_NO_REQUIRE) => {
        createBulkWorkItemDialog(_WIT_WorkitemMoveDialogs.WorkItemMoveDialog, options);
    });
}

export function changeWorkItemType(options: WIT_ChangeTypeDialogs_NO_REQUIRE.IChangeTypeDialogOptions) {
    /// <summary>Shows up the dialog for changing the specified work item type. After selecting the type,
    /// clicking ok will pop up new work item form with necessary fields filled.</summary>
    /// <param name="options" type="IChangeTypeDialogOptions">Options for the dialog</param>
    VSS.using(["WorkItemTracking/Scripts/TFS.WorkItemTracking.Controls.ChangeTypeDialogs"], (_WIT_ChangeTypeDialogs: typeof WIT_ChangeTypeDialogs_NO_REQUIRE) => {
        createBulkWorkItemDialog(_WIT_ChangeTypeDialogs.ChangeWorkItemTypeDialog,
            options);
    });
}

export function useWorkItemAsATemplate(workItem: any, options?: any, callback?) {
    /// <summary>Creates a new work item using the field values of the specified work item and
    /// shows it up in the work item form.</summary>
    /// <param name="workItem" type="any">Work item id or work item itself to be copied</param>
    /// <param name="options" type="object">Options for the dialog
    ///
    ///     tfsContext: if work item id is specified, tfsContext is going to be used
    ///                 to create store and get the work item object.
    /// </param>

    ensureWorkItem(workItem,
        options,
        function (workItem) {
            const copiedWorkItem = workItem.copy(workItem.workItemType, false, false, true, [WITConstants.CoreField.Title], false);

            if ($.isFunction(callback)) {
                if (callback.call(copiedWorkItem, copiedWorkItem) === false) {
                    return;
                }
            }

            showWorkItem(copiedWorkItem, { saveButton: true });

            Telemetry.publishEvent(new Telemetry.TelemetryEventData(
                CIConstants.WITCustomerIntelligenceArea.WORK_ITEM_TRACKING,
                CIConstants.WITCustomerIntelligenceFeature.CLIENTSIDEOPERATION_WIT_CLONE, { count: 1 }));

        },
        function (err) {
            showErrorInDialog(err, null);
        });
}

export function linkToExistingWorkItem(workItem: WITOM.WorkItem, workItemIds: any[], options?: any) {
    /// <summary>Opens up dialog for linking the base work item to the specified work items.</summary>
    /// <param name="workItem" type="any">Work item id or work item itself to be copied</param>
    /// <param name="workItemIds" type="Array">Ids of work items which will be linked to the base work item</param>
    /// <param name="options" type="object">Options for the dialog
    ///
    ///     tfsContext: if work item id is specified, tfsContext is going to be used
    ///                 to create store and get the work item object.
    /// </param>


    function addLinks(w, linkResult) {
        /// <summary>Adds the specified links to the specified work item</summary>

        const links = [];
        function verifyLink(artifactUri: string, linkType: string): boolean {

            // Artifact uri should be of valid format.
            try {
                Artifacts_Services.LinkingUtilities.decodeUri(artifactUri);
            } catch (ex) {
                return false;
            }

            // Should be a registered LinkType
            const registeredTypesFromExtensions: WITOM.IContributedLinkTypes = w.store.getContributedLinkTypes();
            if (!registeredTypesFromExtensions[linkType]) {
                console.log("Link type " + linkType + " not registered.");
                return false;
            }

            // Seems good..
            return true;
        }

        $.each(linkResult.links, function (ind, link) {
            switch (linkResult.linkType) {
                case "WorkItemLink":
                    links.push(WITOM.WorkItemLink.create(w, linkResult.linkTypeEnd.immutableName, link.id, linkResult.comment || ""));
                    break;
                case RegisteredLinkTypeNames.RemoteWorkItemLink:
                    const remoteLinkContext: RemoteLinkContext = {
                        remoteHostId: linkResult.remoteHostId,
                        remoteHostName: linkResult.remoteHostName,
                        remoteHostUrl: linkResult.remoteHostUrl,
                        remoteProjectId: linkResult.remoteProjectId
                    };
                    links.push(WITOM.WorkItemLink.create(w, linkResult.linkTypeEnd.immutableName, link.id, linkResult.comment || "", false, remoteLinkContext));
                    break;
                case "Hyperlink":
                    links.push(WITOM.Hyperlink.create(w, link.location, linkResult.comment || ""));
                    break;
                case RegisteredLinkTypeNames.Changeset:
                case RegisteredLinkTypeNames.VersionedItem:
                case RegisteredLinkTypeNames.Commit:
                case RegisteredLinkTypeNames.Storyboard:
                case RegisteredLinkTypeNames.Branch:
                case RegisteredLinkTypeNames.Tag:
                case RegisteredLinkTypeNames.PullRequest:
                case RegisteredLinkTypeNames.Build:
                case RegisteredLinkTypeNames.FoundInBuild:
                case RegisteredLinkTypeNames.IntegratedInBuild:
                case RegisteredLinkTypeNames.WikiPage:
                    links.push(WITOM.ExternalLink.create(w, linkResult.linkType, link.artifactUri, linkResult.comment || ""));
                    break;
                case RegisteredLinkTypeNames.GitHubCommitLinkType:
                case RegisteredLinkTypeNames.GitHubPullRequestLinkType:
                    links.push(WITOM.ExternalLink.create(w, linkResult.linkType, link.artifactUri, linkResult.comment || "", linkResult.externalLinkContext));
                    break;
                default:
                    // This link comes from extension. Map it to "ExternalLink"
                    // Since the link data is provided by extension, verify the integrity.
                    if (verifyLink(link.artifactUri, linkResult.linkType)) {
                        links.push(WITOM.ExternalLink.create(w, linkResult.linkType, link.artifactUri, linkResult.comment || ""));
                    }
                    break;
            }
        });

        w.addLinks(links);
    }

    requireModules(["WorkItemTracking/Scripts/TFS.WorkItemTracking.Linking.Dialogs"]).spread((_Dialogs: typeof WorkItemTrackingLinkingDialogs_Async) => {
        createWorkItemDialog(_Dialogs.LinkToExistingDialog,
            workItem,
            $.extend(
                options,
                {
                    multipleTarget: workItemIds.length > 1,
                    workItemIds: workItemIds
                }),
            () => "addExistingLink",
            (result) => {
                const remoteContext: RemoteLinkContext = {
                    remoteHostId: result.remoteHostId,
                    remoteHostName: result.remoteHostName,
                    remoteHostUrl: result.remoteHostUrl,
                    remoteProjectId: result.remoteProjectId
                };
                return {
                    "linkType": getLinkType(result),
                    "targetLinkCount": result.links && result.links.length,
                    "browseDialogUsed": result.browseDialogUsed,
                    "workItemSessionId": workItem.sessionId,
                    "action": "addExistingLink",
                    "remoteLinkContext": remoteContext
                };
            },
            function (wi: WITOM.WorkItem, result) {
                if (!wi.isNew()) {
                    // If the source work item is not new, we're safe to add the links to the specified work items
                    const workItems: WITOM.WorkItem[] = [];
                    let dirtyWorkItemsCount = 0;
                    workItemIds = workItemIds || [];

                    const handleError = (error) => {
                        if (typeof options.errorCallback === "function") {
                            options.errorCallback(error);
                        }
                    };
                    const processResult = () => {
                        if (options.immediateSave === true && dirtyWorkItemsCount === workItemIds.length) {
                            if (typeof options.beforeSave === "function") {
                                options.beforeSave(workItems);
                            }

                            wi.store.beginSaveWorkItemsBatch(workItems,
                                (result: WITOM.IWorkItemsBulkSaveSuccessResult) => {
                                    if (typeof options.afterSave === "function") {
                                        options.afterSave(result);
                                    }
                                }, (error) => handleError(error));
                        }
                    };

                    for (const id of workItemIds) {
                        WorkItemManager.get(wi.store).beginGetWorkItem(id,
                            (currentWI: WITOM.WorkItem) => {
                                addLinks(currentWI, result);
                                workItems.push(currentWI);
                                dirtyWorkItemsCount++;
                                processResult();
                            }, (error) => {
                                dirtyWorkItemsCount++;
                                processResult();
                            });
                    }
                } else {
                    // Work item is new. Adding the links to the newly created work item
                    addLinks(wi, result);
                }
            });
    });
}

export function newLinkedWorkItem(workItem: any, workItemIds: any[], options?: any) {
    /// <summary>Opens up dialog for creating new work item which is linked to the specified work items.</summary>
    /// <param name="workItem" type="any">Work item id or work item itself to be copied</param>
    /// <param name="workItemIds" type="Array">Ids of work items which will be linked to the newly created work item</param>
    /// <param name="options" type="object">Options for the dialog
    ///
    ///     tfsContext: if work item id is specified, tfsContext is going to be used
    ///                 to create store and get the work item object.
    /// </param>

    const launchDialog = (wi: WITOM.WorkItem) => {
        showWorkItem(wi, { saveButton: true });
    };

    requireModules(["WorkItemTracking/Scripts/TFS.WorkItemTracking.Linking.Dialogs"]).spread((_Dialogs: typeof WorkItemTrackingLinkingDialogs_Async) => {
        createWorkItemDialog(_Dialogs.NewLinkedWorkItemDialog,
            workItem,
            $.extend(
                options,
                {
                    multipleTarget: workItemIds.length > 1,
                    workItemIds: workItemIds
                }),
            () => "addNewLink",
            (result) => {
                return {
                    "linkType": getLinkType(result),
                    "newWIT": result.workItemType,
                    "workItemSessionId": workItem.sessionId,
                    "action": "addNewLink"
                };
            },
            function (wi: WITOM.WorkItem, result) {
                wi.project.beginGetWorkItemType(result.workItemType, function (type) {

                    // Creating new work item of the specified type
                    const newWorkItem = WorkItemManager.get(type.store).createWorkItem(type);

                    // Set the title
                    newWorkItem.getField(WITConstants.CoreField.Title).setValue(result.title || "");

                    // Finding the link type end and creating a link of that link type end
                    const linkTypeEnd = type.store.findLinkTypeEnd(result.linkTypeEnd).oppositeEnd;
                    const links: WITOM.WorkItemLink[] = [];
                    for (let i = 0, len = workItemIds.length; i < len; i++) {
                        links[links.length] = WITOM.WorkItemLink.create(newWorkItem, linkTypeEnd, workItemIds[i], result.comment || "");
                    }

                    // Adding links to the work item
                    newWorkItem.addLinks(links);

                    // Copy relevant field values
                    if (workItemIds.length === 1) {
                        newWorkItem.setFieldValue(WITConstants.CoreField.AreaId, wi.getFieldValue(WITConstants.CoreField.AreaId));
                        newWorkItem.setFieldValue(WITConstants.CoreField.IterationId, wi.getFieldValue(WITConstants.CoreField.IterationId));
                        newWorkItem.setFieldValue(WITConstants.CoreField.AssignedTo, wi.getFieldValue(WITConstants.CoreField.AssignedTo));

                        const tfsContext = wi.store.getTfsContext();
                        const processConfigService = TFS_OM_Common.ProjectCollection.getConnection(tfsContext).getService(ProjectProcessConfigurationService);
                        new Promise((resolve, reject) => processConfigService.beginGetProcessSettings(resolve, reject))
                            .then(
                                (processConfiguration: ProjectProcessConfiguration) => {
                                    const teamField = processConfiguration.getTypeField(ProjectProcessConfiguration.FieldType.Team);
                                    if (teamField) {
                                        const teamFieldName = teamField.name;
                                        newWorkItem.setFieldValue(teamField.name, wi.getFieldValue(teamField.name));
                                        launchDialog(newWorkItem);
                                    }
                                },
                                () => {
                                    // Something went wrong, show the form without the teamfield set
                                    launchDialog(newWorkItem);
                                }
                            );
                    } else {
                        // In the bulk linked work items, we don't copy anything, just launch the form
                        launchDialog(newWorkItem);
                    }
                });
            });
    });
}

export function promptMessageDialog(dialogContent: string | JQuery, title: string, buttons?: IMessageDialogButton[], useDefaultContentFormat: boolean = false): IPromise<IMessageDialogResult> {
    return requireModules(["VSS/Controls/Dialogs"]).spread((_Dialogs: typeof Dialogs_Async) => {
        if (typeof (dialogContent) === "string" && !useDefaultContentFormat) {
            dialogContent = $("<div>").css("white-space", "pre-wrap").html(dialogContent);
        }

        return _Dialogs.showMessageDialog(dialogContent,
            {
                title: title,
                noFocusOnClose: true,
                buttons: buttons
            });
    });
}
