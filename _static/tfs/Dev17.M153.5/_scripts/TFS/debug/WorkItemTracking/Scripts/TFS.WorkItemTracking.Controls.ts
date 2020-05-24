/// <amd-dependency path="jQueryUI/dialog"/>
/// <reference types="jquery" />

import { domElem, accessible, KeyCode } from "VSS/Utils/UI";
import Controls = require("VSS/Controls");
import Diag = require("VSS/Diag");
import Dialogs = require("VSS/Controls/Dialogs");
import * as LinkingUtils from "WorkItemTracking/Scripts/TFS.WorkItemTracking.Linking.Utils";
import Menus = require("VSS/Controls/Menus");
import StatusIndicator = require("VSS/Controls/StatusIndicator");
import VSS_Resources_Platform = require("VSS/Resources/VSS.Resources.Platform");
import VSS = require("VSS/VSS");
import Events_Action = require("VSS/Events/Action");
import Events_Services = require("VSS/Events/Services");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import Utils_Core = require("VSS/Utils/Core");
import TFS_OM_Common = require("Presentation/Scripts/TFS/TFS.OM.Common");
import WITOM = require("WorkItemTracking/Scripts/TFS.WorkItemTracking");
import { WorkItemManager } from "WorkItemTracking/Scripts/OM/WorkItemManager";
import WorkItemTrackingResources = require("WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking");
import Telemetry = require("VSS/Telemetry/Services");
import FormEvents = require("WorkItemTracking/Scripts/Form/Events");
import Performance = require("VSS/Performance");
// Side effect import, to trigger permission initialization together with form code
import "WorkItemTracking/Scripts/Utils/WorkItemPermissionDataHelper";
import { WorkItemActions, openWorkItemInNewTabActionWorker } from "WorkItemTracking/Scripts/Utils/WorkItemControlsActions";
import { PerfScenarioManager } from "WorkItemTracking/Scripts/Utils/PerfScenarioManager";
import { WorkItemChangeType } from "WorkItemTracking/Scripts/OM/WorkItemConstants";
import WitFormMode = require("WorkItemTracking/Scripts/Utils/WitControlMode");
import { InitialValueHelper } from "WorkItemTracking/Scripts/Utils/InitialValueHelper";
import { WorkItemFormView } from "WorkItemTracking/Scripts/Controls/WorkItemFormView";
import { WorkItemForm, IWorkItemFormOptions } from "WorkItemTracking/Scripts/Controls/WorkItemForm";
import { getWorkItemEditorTitle } from "WorkItemTracking/Scripts/Utils/WorkItemTitleUtils";
import CIConstants = require("WorkItemTracking/Scripts/CustomerIntelligence");
import { RichContentTooltip } from "VSS/Controls/PopupContent";
import { CommandEventArgs } from "VSS/Events/Handlers";
import { useWITDialogs } from "WorkItemTracking/Scripts/Utils/UseWitDialog";
import { getService } from "VSS/Service";
import { WorkItemFormUserLayoutSettingsService } from "WorkItemTracking/Scripts/Form/UserLayoutSettings";
import { INavigationHistoryService, getNavigationHistoryService, INavigationPopStateEvent } from "VSS/Navigation/NavigationHistoryService";
import { setClassificationNodesUsingMRU } from "WorkItemTracking/Scripts/Utils/WorkItemClassificationUtils";
import { WatchDogService } from "Presentation/Scripts/TFS/FeatureRef/TFS.WatchDogService";
import { TelemetryUtils } from "WorkItemTracking/Scripts/Utils/TelemetryUtils";

const actionSvc = Events_Action.getService();
const getErrorMessage = VSS.getErrorMessage;
const eventSvc = Events_Services.getService();
const uniqueSessionId = `${Date.now() + Math.random()}`; // A unique number changes when page load/refresh

// Here we make WorkItemActions available to external consumers who expect these actions to be in this module
export { WorkItemActions };

export interface IWorkItemDialogOptions {
    readOnly?: boolean;
    close?: (workItem: WITOM.WorkItem) => void;
    saveButton?: boolean;
    saveCloseButton?: boolean;
    save?: (workItem: WITOM.WorkItem) => void;
    onRenderComplete?: (workItem: WITOM.WorkItem) => void;
}

export namespace WorkItemFormDialog {
    let artificialStateCounter = 0;

    function _showWorkItem(
        getWorkItem: (callback: (workItem: WITOM.WorkItem) => void, errorCallback?: IErrorCallback) => void,
        store: WITOM.WorkItemStore, options: IWorkItemDialogOptions) {

        const openDialogPerfScenario: Performance.IScenarioDescriptor = PerfScenarioManager.startScenario(CIConstants.WITPerformanceScenario.WORKITEM_OPENDIALOG_NEWLAYOUT,
            false);

        getService(WatchDogService, store.getTfsContext().contextData).startWatchScenario(
            CIConstants.WITPerformanceScenario.WORKITEM_OPENDIALOG_NEWLAYOUT,
            false, 10000, CIConstants.WITCustomerIntelligenceArea.WORK_ITEM_TRACKING,
            "WorkItemFormDialog",
            CIConstants.WITCustomerIntelligenceFeature.WIT_WATCHDOG_OPEN_FORM);

        let workItemUserScenarioAction: Performance.IScenarioDescriptor;

        const saveButtonId = "wit-dialog-save" + Controls.getId();
        const saveCloseButtonId = "wit-dialog-save-close" + Controls.getId();
        const closeButtonId = "wit-dialog-close" + Controls.getId();
        let dialogObject: Dialogs.Dialog;
        let changedDelegate: Function;
        let workItem: WITOM.WorkItem;
        let workItemForm: WorkItemForm;
        let saving = false;
        let confirmOnClose = false;
        let maximized: boolean;
        let maximizeButton: JQuery;
        let maximizeIcon: JQuery;

        Diag.Debug.assert($.isFunction(getWorkItem), "A work item provider is expected.");

        // Getting options and setting default option values
        const readOnly = options && options.readOnly === true;
        const closeCallback = options && options.close;

        const saveButton = options ? (typeof (options.saveButton) === "boolean" ? options.saveButton : true) : true;
        const saveCloseButton = options ? (typeof (options.saveCloseButton) === "boolean" ? options.saveCloseButton : true) : true;

        // Creating buttons for the dialog. Cancel button will be always visible.
        // The name of the property in the button object will be the caption of the button.
        const buttons: { [id: string]: JQueryUI.ButtonOptions & { id: string } } = {};
        function updateButtonStates(enabled: boolean) {
            /// <summary>disable the 'save' buttons if 'enabled' is false or the work item is not dirty or
            /// the work item is read only.  Intentionally allowing invalid work items to match the VS behavior.</summary>
            /// <param name="enabled" type="boolean">if 'false', disables all buttons.  If 'true', enables the buttons
            /// that are appropriate.</param>
            let saveEnabled = enabled;

            if (workItem) {
                saveEnabled = enabled &&
                    workItem.isDirty() &&
                    !workItem.isReadOnly() &&
                    !readOnly &&
                    !workItem.isSaving();
                $("#" + closeButtonId).button("option", "label", workItem.isDirty() ? WorkItemTrackingResources.Cancel : WorkItemTrackingResources.DialogCloseButtonText);
                confirmOnClose = workItem.isDirty();
            }

            if (saveButton) {
                $("#" + saveButtonId).button("option", "disabled", !saveEnabled);
            }

            if (saveCloseButton) {
                $("#" + saveCloseButtonId).button("option", "disabled", !saveEnabled);
            }

            $("#" + closeButtonId).button("option", "disabled", !enabled);
        }

        // TODO:
        //   saveHandler is not currently used for new form since it is doing extra work to update the form button states for old work item forms.
        //   Once old work item form is retired, we need to rework on _showWorkItem function to remove unnecessary dialog buttons and cleanup the saveHandler.
        //   After that, we should use saveHandler for saving or save/close work item on new form dialogs.
        function saveHandler(e: JQueryEventObject, args: { sender: JQuery, closeOnSave: boolean }) {

            const closeOnSave = args && args.closeOnSave === true;

            Diag.logTracePoint("WorkItemForm.saveHandler.start");

            // Disabling the buttons as soon as it gets clicked (to prevent successive clicks)
            updateButtonStates(false);

            // Getting invalid fields to check work item is ready to be saved or client rules are violated
            const invalidFields = workItem.getInvalidFields();
            if (invalidFields && invalidFields.length) {
                // If there is invalid fields, don't attempt to save the work item
                // re-enabling buttons.
                updateButtonStates(true);
            } else {
                // There is no invalid fields, saving the work item (although there might be server errors,
                // which are going to be handled in errorCallback of beginSave method)
                saving = true;

                if (closeOnSave) {
                    workItemForm.suppressFieldUpdates(true);
                }

                workItem.beginSave(() => {
                    saving = false;

                    Diag.logTracePoint("WorkItemForm.saveHandler.saveComplete");
                    // Checking to see we should close the dialog
                    if (closeOnSave) {

                        // Setting the dialog result
                        dialogObject.setDialogResult("ok");
                        // Closing dialog
                        dialogObject.close();

                        Diag.logTracePoint("WorkItemForm.saveHandler.saveAndCloseComplete");
                    } else {
                        // Dialog is not closed, so we need to enable save button
                        updateButtonStates(true);
                    }
                }, (error) => {
                    saving = false;

                    if (closeOnSave) {
                        workItemForm.suppressFieldUpdates(false);
                    }

                    // Enabling save button back
                    updateButtonStates(true);

                    // Update the info bar to clear the busy indication, restore refresh/revert icons and display any errors.
                    workItemForm.infoBar.update();
                });
            }
        }

        if (!readOnly) {

            if (saveButton) {
                // Creating save button
                // tslint:disable-next-line:no-string-literal
                buttons["save"] = {
                    text: WorkItemTrackingResources.Save,
                    id: saveButtonId,
                    disabled: true,
                    click: function (this: JQuery, e: JQueryEventObject) { saveHandler(e, { sender: $(this), closeOnSave: false }); }
                };
            }

            if (saveCloseButton) {
                // Creating save & close button
                buttons["save-close"] = {
                    text: WorkItemTrackingResources.SaveAndClose,
                    id: saveCloseButtonId,
                    disabled: true,
                    click: function (this: JQuery, e: JQueryEventObject) { saveHandler(e, { sender: $(this), closeOnSave: true }); }
                };
            }
        }

        // tslint:disable-next-line:no-string-literal
        buttons["cancel"] = {
            // Creating cancel button
            id: closeButtonId,
            text: confirmOnClose ? WorkItemTrackingResources.Cancel : WorkItemTrackingResources.DialogCloseButtonText,
            click: function () {
                dialogObject.close();
            }
        };

        function clearDownloadingTimeout() {
            dialogObject.cancelDelayedFunction("downloading");
        }

        function clearCompleteOpenTimeout() {
            dialogObject.cancelDelayedFunction("completeOpen");
        }

        function maximizeToggle() {
            if (!maximized) {
                maximizeDialog(true);
            }
            else {
                minimizeDialog(true);
            }

            if (workItemForm && workItemForm.currentView) {
                eventSvc.fire(FormEvents.FormEvents.LayoutResizedEvent(workItemForm.currentView.getId()));
            }

            Telemetry.publishEvent(new Telemetry.TelemetryEventData(
                CIConstants.WITCustomerIntelligenceArea.WORK_ITEM_TRACKING,
                "WorkItem.NewFormDialog.DialogViewState",
                {
                    "fullScreen": maximized
                },
                Date.now()));
        }

        function maximizeDialog(saveSetting: boolean) {
            maximized = true;
            maximizeButton.attr("aria-label", VSS_Resources_Platform.ExitFullScreenModeTooltip);
            maximizeIcon.removeClass("bowtie-view-full-screen").addClass("bowtie-view-full-screen-exit");
            RichContentTooltip.add(VSS_Resources_Platform.ExitFullScreenModeTooltip, maximizeButton);
            dialogObject.getElement().parent().addClass("full-screen");
            dialogObject.getElement().dialog("option", "resizable", false);
            dialogObject.getElement().dialog("option", "draggable", false);
            dialogObject.centerDialog();

            if (saveSetting) {
                getService(WorkItemFormUserLayoutSettingsService).setDialogFullscreenState(true);
            }
        }

        function minimizeDialog(saveSetting: boolean) {
            maximized = false;
            maximizeButton.attr("aria-label", VSS_Resources_Platform.EnterFullScreenModeTooltip);
            maximizeIcon.removeClass("bowtie-view-full-screen-exit").addClass("bowtie-view-full-screen");
            RichContentTooltip.add(VSS_Resources_Platform.EnterFullScreenModeTooltip, maximizeButton);
            dialogObject.getElement().parent().removeClass("full-screen");
            dialogObject.getElement().dialog("option", "resizable", true);
            dialogObject.getElement().dialog("option", "draggable", true);

            const wiForm = dialogObject.getElement().data("form");
            if (wiForm && wiForm.infoBar) {
                wiForm.infoBar.getElement().find("a.caption").focus();
            }

            // Re-assign the dialog width and height since its get sets to 0 on window resize.
            const widthPct = dialogObject._options.widthPct;
            const heightPct = dialogObject._options.heightPct;
            const position = dialogObject._options.position;
            dialogObject.getElement().dialog("option", {
                width: $(window).width() * widthPct,
                height: $(window).height() * heightPct
            });
            dialogObject.getElement().dialog("option", { position: position });

            if (saveSetting) {
                getService(WorkItemFormUserLayoutSettingsService).setDialogFullscreenState(false);
            }
        }

        // Displaying host in a dialog
        const showDialog = () => {
            const navHistoryService: INavigationHistoryService = getNavigationHistoryService();

            dialogObject = Dialogs.Dialog.show(Dialogs.Dialog, {
                title: "Work Item Form",
                minWidth: 640,
                minHeight: 480,
                widthPct: 0.9,
                buttons: buttons,
                dialogClass: "workitem-dialog new-workitem-dialog invisible",
                useLegacyStyle: true,
                open: function () {
                    // A firefox bug - When there is a iframe inside a jquery dialog (HTML editor for eg) bug #494985
                    // When we put focus on HTML editor and focus out of it, the dialog will get focus again calling focusin.dialog event
                    // The event handler for this event tries to put focus back to the 1st tabbable element in dialog
                    // So whenever a user hits tab when his current focus is on HTML editor, the dialog will get focus again,
                    // and the focus would be put to the 1st tabbable element in it.
                    // To fix this, we need to override the focusin.dialog event handler to prevent it doing that.
                    // We just want to make this fix for WIT form as this is the most used dialog with a HTML editor inside.
                    // We dont need to unbind this event handler as the jquery dialog does that already as soon as it closes.
                    $(window.document).bind("focusin.dialog", (event) => {
                        event.stopImmediatePropagation();
                    });

                    let workItemReady = false;
                    const $dialogContent = $(this);
                    const startTime: number = Date.now();

                    Utils_Core.delay(this, 0,
                        function () {
                            // try to read layout settings
                            maximized = getService(WorkItemFormUserLayoutSettingsService).isDialogFullscreen;

                            maximizeButton = $("<div>")
                                .attr("role", "button")
                                .addClass("full-screen-button");
                            maximizeIcon = $("<span>").addClass("bowtie-icon");
                            maximizeButton.append(maximizeIcon)
                                .insertAfter($dialogContent.prev(".ui-dialog-titlebar").find(".ui-dialog-title"));

                            if (maximized) {
                                maximizeDialog(false);
                            } else {
                                minimizeDialog(false);
                            }

                            maximizeButton.click(() => {
                                maximizeToggle();
                            });
                            accessible(maximizeButton);

                            // we dont show the dialog until we decide whether we want to show it in full screen mode or not - to prevent any jitteriness in dialog
                            // If we dont do this, then we'll see the dialog opening up in default layout mode and then go in full screen mode after some milliseconds
                            // After showing the dialog, manually set the focus to close button as the dialog wouldnt do it during init if its not visible
                            dialogObject.getElement().parent().removeClass("invisible");

                            getWorkItem(
                                function (wi: WITOM.WorkItem) {
                                    Diag.Debug.assert(wi instanceof WITOM.WorkItem, "workItem is expected to be an instance WorkItem object");
                                    const navigation = wi.store.getTfsContext().navigation;
                                    const navigationJson = navigation ? JSON.stringify({
                                        area: navigation.area,
                                        controller: navigation.currentController,
                                        action: navigation.currentAction,
                                        parameter: navigation.currentParameters
                                    }) : "";

                                    openDialogPerfScenario.addData({
                                        "WorkItemType": "[NonEmail: " + wi.workItemType.name + "]",
                                        "Project": wi.project.name,
                                        "Navigation": navigationJson,
                                        "linkDetails": TelemetryUtils.getWorkItemLinkTelemetryDetails(wi)
                                    });

                                    if (dialogObject.isDisposed()) {
                                        if (openDialogPerfScenario) {
                                            openDialogPerfScenario.abort();
                                        }
                                        getService(WatchDogService, store.getTfsContext().contextData).endWatchScenario(CIConstants.WITPerformanceScenario.WORKITEM_OPENDIALOG_NEWLAYOUT);

                                        // User has closed the dialog prior to the work item retrieval, just return
                                        return;
                                    }

                                    maximized = getService(WorkItemFormUserLayoutSettingsService).isDialogFullscreen;

                                    if (maximized) {
                                        maximizeDialog(false);
                                    } else {
                                        minimizeDialog(false);
                                    }

                                    function updateTitle() {
                                        dialogObject.setTitle(getWorkItemEditorTitle(workItem, 256));
                                    }

                                    function onWorkItemChanged() {
                                        updateTitle();
                                        updateButtonStates(true);
                                    }

                                    changedDelegate = Utils_Core.throttledDelegate(this, 200, onWorkItemChanged, null, Utils_Core.ThrottledDelegateOptions.Immediate | Utils_Core.ThrottledDelegateOptions.QueueNext);

                                    workItem = wi;
                                    workItemReady = true;
                                    workItem.attachWorkItemChanged(changedDelegate);

                                    // Checking to see any dirty work item manager exists in this view
                                    confirmOnClose = workItem.isDirty();

                                    if (confirmOnClose) {
                                        // If exists, changing the text of the close button from "Close" to "Cancel"
                                        $("#" + closeButtonId).button("option", "label", WorkItemTrackingResources.Cancel);
                                    }

                                    clearDownloadingTimeout();
                                    $dialogContent.empty();

                                    // Creating work item form
                                    const wiFormOptions: IWorkItemFormOptions = {
                                        readOnly: readOnly,
                                        toolbar: {
                                            inline: true,
                                            isDialog: true,
                                            closeWorkItemFormDialogDelegate: (disableDefaultConfirmMessage?: boolean) => {
                                                if (disableDefaultConfirmMessage === true) { // Do nothing if parameter is not set or set to false
                                                    confirmOnClose = false; // Set to not confirm on close
                                                }

                                                dialogObject.setDialogResult("ok");
                                                dialogObject.close();
                                            }
                                        },
                                        formViewType: WorkItemFormView,
                                        dialogOptions: {
                                            toggleFullScreen: maximizeToggle
                                        }
                                    };

                                    if (options && $.isFunction(options.save)) {
                                        wiFormOptions.workItemChanged = (args: { change: string, workItem: WITOM.WorkItem }) => {
                                            if (args.change === WorkItemChangeType.Saved) {
                                                options.save(args.workItem);
                                            }
                                        };
                                    }

                                    PerfScenarioManager.addSplitTiming(
                                        CIConstants.PerformanceEvents.WORKITEMDIALOG_CREATEWORKITEMFORM, true);

                                    workItemForm = <WorkItemForm>Controls.BaseControl.createIn(WorkItemForm, $dialogContent, wiFormOptions);

                                    PerfScenarioManager.addSplitTiming(
                                        CIConstants.PerformanceEvents.WORKITEMDIALOG_CREATEWORKITEMFORM, false);

                                    workItemForm._bind("onBind", () => {
                                        // End E2E scenario after binding
                                        if (openDialogPerfScenario) {
                                            openDialogPerfScenario.end();
                                        }
                                        // Start create or edit work item user scenario
                                        workItemUserScenarioAction = PerfScenarioManager.startScenario(
                                            CIConstants.WITUserScenarioActions.WORKITEM_CREATEOREDIT, false);

                                        // Getting focus into first textbox in the form (probably Title)
                                        // The delay is a workaround to make sure the default focus (and thus the tabbing) behavior is consistent among supported browsers.
                                        Utils_Core.delay(this, 200, () => {
                                            // Since this runs after a delay, the form and the infobar may get disposed at this point, if the dialog is closed before this timeout fires
                                            // To catch this case, check whether or not these 2 controls are disposed or not
                                            if (workItemForm && !workItemForm.isDisposed() && workItem.isNew()) {
                                                $("input:visible:not([disabled]):first", workItemForm.getElement()).focus();
                                            } else if (workItemForm && workItemForm.infoBar && !workItemForm.infoBar.isDisposed()) {
                                                workItemForm.infoBar.getElement().find("a.caption").focus();
                                            }
                                        });
                                    });

                                    // Binding the work item to the form
                                    workItemForm.bind(workItem);

                                    // Associating form object with dialog's data
                                    $dialogContent.data("form", workItemForm);

                                    dialogObject.delayExecute("completeOpen", 0, false,
                                        function () {
                                            // Updating title
                                            updateTitle();

                                            if (!readOnly) {
                                                updateButtonStates(true);
                                            }

                                            if (options && $.isFunction(options.onRenderComplete)) {
                                                options.onRenderComplete(workItem);
                                            }

                                            getService(WatchDogService, store.getTfsContext().contextData).endWatchScenario(CIConstants.WITPerformanceScenario.WORKITEM_OPENDIALOG_NEWLAYOUT);

                                            Diag.logTracePoint("WorkItemForm.dialogHost.open.complete");
                                            const eventName = CIConstants.WITPerformanceScenario.WORKITEM_OPEN_NEWFORMDIALOG;
                                            const currentController = wi.store.getTfsContext().navigation.currentController;
                                            const currentAction = wi.store.getTfsContext().navigation.currentAction;
                                            Telemetry.publishEvent(new Telemetry.TelemetryEventData(
                                                CIConstants.WITCustomerIntelligenceArea.WORK_ITEM_TRACKING,
                                                eventName,
                                                {
                                                    "workItemType": "[NonEmail: " + workItem.workItemType.name + "]",
                                                    "project": workItem.project.name,
                                                    "isNew": workItem.isNew(),
                                                    "workItemSessionId": workItem.sessionId,
                                                    "originArea": currentController + "/" + currentAction,
                                                    "workItemId": workItem.id,
                                                    "action": workItem.isNew() ? "Create" : "Edit"
                                                },
                                                startTime));
                                        });
                                },
                                function (err: TfsError) {
                                    if (openDialogPerfScenario) {
                                        openDialogPerfScenario.abort();
                                    }
                                    getService(WatchDogService, store.getTfsContext().contextData).endWatchScenario(CIConstants.WITPerformanceScenario.WORKITEM_OPENDIALOG_NEWLAYOUT);

                                    if (workItemUserScenarioAction) {
                                        workItemUserScenarioAction.abort();
                                    }

                                    clearDownloadingTimeout();

                                    if (dialogObject.isDisposed()) {
                                        // User has closed the dialog prior to the work item retrieval, just return
                                        return;
                                    }
                                    $dialogContent.empty();
                                    $dialogContent.append($(domElem("div", "error-work-item-download")).text(getErrorMessage(err) || "Unknown error happened while accessing work item."));
                                });

                            if (!workItemReady) {
                                dialogObject.delayExecute("downloading", 100, false, function () {
                                    const statusControl = <StatusIndicator.StatusIndicator>Controls.BaseControl.createIn(StatusIndicator.StatusIndicator, $dialogContent, { center: true, throttleMinTime: 0, imageClass: "big-status-progress", message: VSS_Resources_Platform.Loading });
                                    statusControl.start();
                                });
                            }

                            dialogZindex = Number(dialogObject.getElement().parent(".ui-dialog").css("zIndex"));
                        });
                },
                beforeClose: (function () {
                    /**
                     * Force close is requried because Dialogs.showMessageDialog is asynchronous.
                     * First time through the confirmation is triggered and then those close is canceled.
                     * If the confirmation is successful then the dialog executes a 2nd close.
                     * During the 2nd close the confirmation prompt would show again if forceClose was not flipped.
                     */
                    let forceClose: boolean = false;
                    return function (e: JQueryEventObject & { closedByNavigation?: boolean }, ui: JQuery) {
                        if (saving) {
                            return false;
                        }
                        // If e.closedByNavigation===true, the dialog is closed by XHR navigation. If this is the case, at this point we have
                        // another warning message already shown to user by Document.ts which listens to Events_Action.CommonActions.ACTION_WINDOW_UNLOAD
                        // We don't want to show duplicate warning messages, so we skip the following message.
                        if (!forceClose && confirmOnClose && !e.closedByNavigation && workItem && workItem.isDirty(true)) {
                            Dialogs.MessageDialog.showMessageDialog(WorkItemTrackingResources.UnsavedWorkItemPrompt).then(() => {
                                forceClose = true;
                                dialogObject.close();
                            }, () => {
                                if (closeCalledInNavigation) {
                                    // user cancelled the confirmation dialog during a navigation - hook up popstate handler again
                                    window.history.forward();
                                    closeCalledInNavigation = false;
                                }
                            });
                            return false;
                        }
                        return true;
                    };
                })(),
                close: function (e: JQueryEventObject & { closedByNavigation?: boolean }) {
                    clearDownloadingTimeout();
                    clearCompleteOpenTimeout();

                    if (changedDelegate) {
                        workItem.detachWorkItemChanged(changedDelegate);
                    }

                    workItem.resetContributionErrorStatuses();

                    // Unbinding the form
                    if (workItemForm) {
                        workItemForm.dispose();
                    }

                    // Checking the dialog result
                    if (dialogObject.getDialogResult() !== "ok" || e.keyCode === KeyCode.ESCAPE) {
                        if (confirmOnClose && workItem) {
                            // Resetting work item
                            workItem.reset();
                            workItem.discardIfNew();
                            if (workItemUserScenarioAction) {
                                workItemUserScenarioAction.abort();
                            }
                        }
                    }

                    // If a closeCallback is provided
                    if (closeCallback) {
                        // Executing closeCallback
                        closeCallback(workItem);
                    }

                    // Clear any RichContentTooltips
                    RichContentTooltip.hide();

                    // Detach listener callback for state popping since at this point dialog has been disposed and closed
                    navHistoryService.unsubscribe(popStateListener);

                    // Decount artificial state counter no matter how the dialog was closed
                    artificialStateCounter--;
                    localArtificialStateCounter--;

                    // Avoid recursion of 'navigate back' and 'close dialog', and navigation triggered by XHR navigation
                    // If closeCalledInNavigation===true, the dialog is closed by browser navigation
                    // If e.closedByNavigation===true, the dialog is closed by XHR navigation
                    if (!closeCalledInNavigation && !e.closedByNavigation) {
                        // pop the artificial state history created on dialog open
                        window.history.back();
                    } else {
                        const dialogIsNotOnTop = dialogZindex && $(".ui-widget-overlay").toArray().some(widget => Number(widget.style.zIndex) > dialogZindex);

                        Telemetry.publishEvent(
                            new Telemetry.TelemetryEventData(
                                CIConstants.WITCustomerIntelligenceArea.WORK_ITEM_TRACKING, "WorkItemDialog",
                                {
                                    action: "Close",
                                    closedByBrowserNavigation: closeCalledInNavigation,
                                    closedByXHRNavigation: e.closedByNavigation,
                                    error: dialogIsNotOnTop ? "User navigated on work item dialog when another dialog is on the top" : undefined
                                }),
                            true);
                    }
                }
            });

            let localArtificialStateCounter = ++artificialStateCounter;

            // Push the artifical state to handle navigation
            navHistoryService.pushState({
                ...navHistoryService.getState(),
                sessionId: uniqueSessionId,
                artificialState: localArtificialStateCounter.toString()
            }, window.location.href, null, null, true);

            let closeCalledInNavigation = false;
            let dialogZindex: number;
            const popStateListener = (e: INavigationPopStateEvent) => {
                if (!e.newState || !e.newState.state.artificialState ||
                    parseInt(e.newState.state.artificialState) < localArtificialStateCounter || // skip handle the forward event by cancellation of confirmation dialog
                    e.newState.state.sessionId !== uniqueSessionId) { // if sessionid changed, it can't be a cancellation of confirmation dialog and should close
                    if (!dialogObject.isDisposed()) {
                        closeCalledInNavigation = true;
                        dialogObject.close();
                    }
                }
            };

            navHistoryService.subscribe(popStateListener);
        };

        // Make sure we know if we are rendering old or new form before launching the dialog
        // If this deferred errors we are ok since we will assume old
        WitFormMode.WitFormModeUtility.ensureWitFormModeLoaded().then(showDialog, showDialog);
    }

    /**
     * Opens up the specified work item in a dialog
     * @param workItem Work item to show
     * @param options (Optional) Display options for the dialog.
     *                The list of options:
     *                    - readOnly (Boolean, default false): makes the controls in the form read-only
     *                    - save : callback fired when the work item in the dialog is successfully saved. The work item is passed to the callback
     *                    - close : callback fired when the dialog is closing.  This will always be called regardless if the save, cancel,
     *                              close, or escape key is pressed. The work item is passed to the callback.
     *                    - saveButton (Boolean, default false): display the save button
     *                    - saveCloseButton (Boolean, default true): display the save & close button
     *
     *                Example:
     *                    // This will pop up a readonly dialog
     *                    WorkItemForm.showWorkItem(myWorkItem, {'readOnly':true});
     *
     *                    // This will pop up a dialog and call itemUpdated when the user saves the changes
     *                    WorkItemForm.showWorkItem(myWorkItem, {'save':function (workItem) { ... do work ... } });
     */
    export function showWorkItem(workItem: WITOM.WorkItem, options?: IWorkItemDialogOptions) {
        _showWorkItem(function (callback: IResultCallback, errorCallback: IErrorCallback) {
            callback(workItem);
        }, workItem.store, options);
    }

    /**
     * Opens up a work item with a specified id in a dialog
     * @param id Work item id to show
     * @param tfsContext Current TFS context that has important URL information that work item belongs to
     * @param options (Optional) Display options for the dialog.
     *                The list of options:
     *                    - readOnly (Boolean, default false): makes the controls in the form read-only
     *                    - save : callback fired when the work item in the dialog is successfully saved. The work item is passed to the callback
     *                    - close : callback fired when the dialog is closing.  This will always be called regardless if the save, cancel,
     *                              close, or escape key is pressed. The work item is passed to the callback.
     *                    - saveButton (Boolean, default false): display the save button
     *                    - saveCloseButton (Boolean, default true): display the save & close button
     *                    - onRenderComplete (workitem): callback fired when the work item form has loaded the work item and is able to be interacted with
     *
     *                Example:
     *                    // This will pop up a readonly dialog
     *                    WorkItemForm.showWorkItem(myWorkItem, {'readOnly':true});
     *
     *                    // This will pop up a dialog and call itemUpdated when the user saves the changes
     *                    WorkItemForm.showWorkItem(myWorkItem, {'save':function (workItem) { ... do work ... } });
     * @param tryGetLatest Attempts to gets the latest version of the work item. If the work item is dirty or pinned it will not get the latest.
     */
    export function showWorkItemById(id: number, tfsContext: TFS_Host_TfsContext.TfsContext, options?: IWorkItemDialogOptions, tryGetLatest?: boolean) {
        Diag.logTracePoint("WorkItemForm.showWorkItemById.start");

        // Creating the store
        const store = TFS_OM_Common.ProjectCollection.getConnection(tfsContext).getService<WITOM.WorkItemStore>(WITOM.WorkItemStore);

        _showWorkItem(function (callback: IResultCallback, errorCallback: IErrorCallback) {
            PerfScenarioManager.addSplitTiming(CIConstants.PerformanceEvents.WORKITEMFORM_GETWORKITEM, true);
            Diag.Debug.assert(tfsContext !== null && typeof tfsContext !== "undefined", "tfs context is expected.");

            // Getting the work item asynchronously
            WorkItemManager.get(store).beginGetWorkItem(id, (wi) => {
                PerfScenarioManager.addSplitTiming(CIConstants.PerformanceEvents.WORKITEMFORM_GETWORKITEM, false);
                callback(wi);
            }, errorCallback, undefined, tryGetLatest ? -1 : undefined);
        }, store, options);
    }
}

interface IOpenWorkItemDialogOptions {
    id: number;
    tfsContext: TFS_Host_TfsContext.TfsContext;
    options: IWorkItemDialogOptions;
    tryGetLatest?: boolean;
}

function openWorkItemDialog(
    actionArgs: IOpenWorkItemDialogOptions,
    next: (args: IOpenWorkItemDialogOptions) => void,
) {
    let tfsContext: TFS_Host_TfsContext.TfsContext;

    Diag.Debug.assertParamIsObject(actionArgs, "actionArgs");
    Diag.Debug.assertParamIsNotNull(actionArgs.id, "actionArgs.id");

    tfsContext = actionArgs.tfsContext || TFS_Host_TfsContext.TfsContext.getDefault();

    WorkItemFormDialog.showWorkItemById(actionArgs.id, tfsContext, actionArgs.options, actionArgs.tryGetLatest);
}

interface IOpenNewWorkItemDialogArgs {
    workItemTypeName: string;
    tfsContext: TFS_Host_TfsContext.TfsContext;
    project?: WITOM.Project;
    projectName?: string;
    initialValues?: { [fieldName: string]: string };
    options: IWorkItemDialogOptions;
}
function openNewWorkItemDialog(
    actionArgs: IOpenNewWorkItemDialogArgs,
    next: (args: IOpenNewWorkItemDialogArgs) => void
) {
    Diag.Debug.assertParamIsObject(actionArgs, "actionArgs");
    Diag.Debug.assertParamIsNotNull(actionArgs.workItemTypeName, "actionArgs.workItemTypeName");

    const tfsContext = actionArgs.tfsContext || TFS_Host_TfsContext.TfsContext.getDefault();

    let projectName: string;
    if (!actionArgs.project) {
        projectName = actionArgs.projectName || tfsContext.navigation.project;

        Diag.Debug.assertParamIsNotNull(projectName, "actionArgs.projectName");
    } else {
        projectName = actionArgs.project.name;
    }

    const store = TFS_OM_Common.ProjectCollection.getConnection(tfsContext).getService<WITOM.WorkItemStore>(WITOM.WorkItemStore);

    store.beginGetProject(projectName, (project: WITOM.Project) => {
        project.beginGetWorkItemType(
            actionArgs.workItemTypeName,
            function (wit: WITOM.WorkItemType) {
                const workItem = WorkItemManager.get(store).createWorkItem(wit);
                const showWorkItem = function () {
                    if (actionArgs.initialValues) {
                        const initialValues = {};
                        for (const fieldName in actionArgs.initialValues) {
                            initialValues["[" + fieldName + "]"] = actionArgs.initialValues[fieldName];
                        }
                        InitialValueHelper.assignInitialValues(workItem, initialValues);
                    }

                    WorkItemFormDialog.showWorkItem(workItem, { ...actionArgs.options, saveButton: true });
                };

                setClassificationNodesUsingMRU(workItem, project.guid).then(
                    () => {
                        workItem.resetManualFieldChanges();
                        showWorkItem();
                    },
                    (error: TfsError) => {
                        // Swallow error and open work item form
                        showWorkItem();
                    }
                );
            }
        );
    });
}

actionSvc.registerActionWorker(WorkItemActions.ACTION_WORKITEM_OPEN, openWorkItemDialog);

actionSvc.registerActionWorker(WorkItemActions.ACTION_WORKITEM_OPEN_DIALOG, openWorkItemDialog);

actionSvc.registerActionWorker(WorkItemActions.ACTION_WORKITEM_OPEN_IN_NEW_TAB, openWorkItemInNewTabActionWorker);

actionSvc.registerActionWorker(WorkItemActions.ACTION_WORKITEM_NEW, openNewWorkItemDialog);

actionSvc.registerActionWorker(WorkItemActions.ACTION_WORKITEM_NEW_DIALOG, openNewWorkItemDialog);

Menus.menuManager.attachExecuteCommand(function (sender: Menus.IMenuManager, args: CommandEventArgs) {
    const commandArgs = args.get_commandArgument();
    if (!commandArgs) {
        return;
    }

    const tfsContext = commandArgs.tfsContext || TFS_Host_TfsContext.TfsContext.getDefault();

    switch (args.get_commandName()) {
        case WorkItemActions.ACTION_WORKITEM_OPEN:
            actionSvc.performAction(WorkItemActions.ACTION_WORKITEM_OPEN, commandArgs);
            return false;

        case WorkItemActions.ACTION_WORKITEM_OPEN_IN_NEW_TAB:
            actionSvc.performAction(WorkItemActions.ACTION_WORKITEM_OPEN_IN_NEW_TAB, commandArgs);
            return false;

        case "new-work-item":
            actionSvc.performAction(WorkItemActions.ACTION_WORKITEM_NEW, commandArgs);
            return false;

        case LinkingUtils.ACTIONS_LINK_TO_NEW:
            let linkToNewOptions = $.extend({}, { tfsContext: tfsContext }, commandArgs.options);
            useWITDialogs().then(WITDialogs => WITDialogs.newLinkedWorkItem(commandArgs.baseId, commandArgs.selectedIds, linkToNewOptions));
            return false;

        case LinkingUtils.ACTIONS_LINK_TO_EXISTING:
            let linkToExistingOptions = $.extend({}, { tfsContext: tfsContext }, commandArgs.options);
            useWITDialogs().then(WITDialogs => WITDialogs.linkToExistingWorkItem(commandArgs.baseId, commandArgs.selectedIds, linkToExistingOptions));
            return false;

        case "create-copy":
            useWITDialogs().then(WITDialogs => WITDialogs.createCopyOfWorkItem(commandArgs.workItemId, { tfsContext: tfsContext }));
            return false;

        case "use-as-a-template":
            useWITDialogs().then(WITDialogs => WITDialogs.useWorkItemAsATemplate(commandArgs.workItemId, { tfsContext: tfsContext }));
            return false;
    }
});

// Register legacy enhancement
Controls.Enhancement.registerEnhancement(WorkItemForm, ".work-item-form");

// TFS plugin model requires this call for each tfs module.
VSS.tfsModuleLoaded("TFS.WorkItemTracking.Controls", exports);
