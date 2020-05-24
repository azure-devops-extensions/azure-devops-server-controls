import Utils_Core = require("VSS/Utils/Core");
import Utils_UI = require("VSS/Utils/UI");
import WITOM = require("WorkItemTracking/Scripts/TFS.WorkItemTracking");
import Navigation_Services = require("VSS/Navigation/Services");
import { IInPlaceMaximizableControl } from "WorkItemTracking/Scripts/Form/FormGroup";
import { UndoableWorkItemControl } from "WorkItemTracking/Scripts/Controls/WorkItemForm/UndoableWorkItemControl";
import Telemetry = require("VSS/Telemetry/Services");

import CIConstants = require("WorkItemTracking/Scripts/CustomerIntelligence");

const historySvc = Navigation_Services.getHistoryService();
const delegate = Utils_Core.delegate;

function restoreDialogPositionAndSize($dialogContent: JQuery, position: number[], width: any, height: any) {
    $dialogContent.dialog("option", "position", position);
    $dialogContent.dialog("option", "width", width);
    $dialogContent.dialog("option", "height", height);
}

export class MaximizableWorkItemControl extends UndoableWorkItemControl implements IInPlaceMaximizableControl {
    private _navigateHandler;
    private _originalControl: MaximizableWorkItemControl;
    private _maximizedControl: MaximizableWorkItemControl;

    public _createMaximizedWorkItemControl($target: JQuery, options: any, workItemType: WITOM.WorkItemType): MaximizableWorkItemControl {
        throw new Error("MaximizableWorkItemControl._createMaximizedWorkItemControl is abstract and must be overridden by derived class");
    }

    public _onMaximized() {
    }

    public _onRestored() {
    }

    public _onBeforeRestore() {
    }

    public focus() {
    }

    public unbind(isDisposing?: boolean) {
        if (this._maximizedControl) {
            this._maximizedControl._restore(false);
        }

        super.unbind(isDisposing);
    }

    public restore(dialogClosing?: boolean): void {
        if (this._maximizedControl) {
            this._maximizedControl._restore(dialogClosing);
        }
        else {
            this._restore(dialogClosing);
        }
    }

    public restoreOrMaximizeControl() {
        if (!this.isMaximized()) {
            this._maximize();
        } else {
            this._restore();
        }
    }

    public isMaximized(): boolean {
        return (this._options && this._options.isMaximized === true) // For this == originalControl.maximizedControl
            || (this._originalControl == null && this._maximizedControl != null); // For this == originalControl
    }

    public maximize() {
        this._maximize();
    }

    // Maximizes the editor, by creating a new maximized HtmlFieldControl
    private _maximize() {
        if (!this.isMaximized()) {
            var maximizedControlOptions = {
                "fieldName": this._fieldName,
                "readOnly": this._options.readOnly,
                "isMaximized": true
            };

            // Create the new work item control and bind to the workitem
            var $maximizedControlContainer = $("<div></div>").addClass("workitem-control-maximized-container");
            $maximizedControlContainer.addClass("witform-maximized-container");

            var $maximizedControlElement = $("<div></div>").addClass("workitemcontrol-maximized").appendTo($maximizedControlContainer);
            $maximizedControlElement.height("100%");

            var maximizedControl = this._createMaximizedWorkItemControl($maximizedControlElement, maximizedControlOptions, this._workItemType);
            maximizedControl.bind(this._workItem);
            maximizedControl._originalControl = this;
            this._maximizedControl = maximizedControl;

            // Adding a hidden focusable element into the container before the current control is being hidden.
            // This is a workaround for IE/Edge since the focus of original html control cannot be contained by editor which causes trouble.
            // By adding below hiddent element, focus will be moved to it so it will not appear somewhere unpredictable and the new maximized control will set its focus when initialized.
            var hiddenElement = $("<input/>").addClass("disabled").attr("tabindex", 0).attr("readonly", "readonly").appendTo(this._container);
            hiddenElement.focus();
            hiddenElement.remove();

            // Get the body and main container
            var $body = $(document.body);
            var $main = $(".main-container .main");
            if (!$main.length) {
                return;
            }

            $(".work-item-form-main-core").css("display", "none");
            $(".form-body").css("display", "none");
            this._container.parents(".witform-layout").append($maximizedControlContainer);

            // Add an escape event handler.  Bind to body since page fullscreen mode already bound to window before us.
            $body.on("keydown.maximizedControl", (e) => {
                // There may be another escape keydown that didn't stop propagation (e.g. InsertImage or "My Profile" in a modal dialog)
                // We don't want to restore the editor if such an event already occurred.
                var isDefaultPrevented = true;
                if (e instanceof jQuery.Event) {
                    isDefaultPrevented = e.isDefaultPrevented();
                } else if (e as any instanceof KeyboardEvent) {
                    isDefaultPrevented = (e as KeyboardEvent).defaultPrevented;
                }

                if (e.keyCode === Utils_UI.KeyCode.ESCAPE && !isDefaultPrevented) {
                    this._restore.call(maximizedControl);
                    $body.unbind(e);
                    return false; // Don't propagate
                }
            });

            // Always restore the maximized control on navigation change.  Put the navigate handler on the maximized control.
            maximizedControl._navigateHandler = delegate(maximizedControl, maximizedControl._onNavigate);
            historySvc.attachNavigate(maximizedControl._navigateHandler);

            maximizedControl._onMaximized();

            // Publish to telemetry service
            var ciData: any = {
                "MaximizedFieldName": this._fieldName,
                "WorkItemTypeName": this._workItemType.name
            };

            Telemetry.publishEvent(new Telemetry.TelemetryEventData(
                CIConstants.WITCustomerIntelligenceArea.WORK_ITEM_TRACKING,
                CIConstants.WITCustomerIntelligenceFeature.CLIENTSIDEOPERATION_MAXIMIZE_RICH_EDITOR,
                ciData));
        }
    }

    private _onNavigate(sender, state) {
        this._restore();
    }

    // Restores the workitem control, by removing its maximized UI control
    private _restore(dialogClosing?: boolean) {
        // Remove the maximized control container
        var $maximizedContainer = this._container.parents(".workitem-control-maximized-container");
        if ($maximizedContainer.length !== 0) {
            if (this._maximizedControl) {
                this._maximizedControl._onBeforeRestore();
            }
            else {
                this._onBeforeRestore();
            }

            var $body = $(document.body);

            var $parentDialog = $(this._container).parents(".ui-dialog-content");

            // Unbind from the workitem
            this.unbind();

            //Using "" here to unset the inline display style
            $(".work-item-form-main-core").css("display", "");
            $(".form-body").css("display", "");
            this._container.parents(".witform-layout").detach(".workitem-control-maximized-container");

            if ($maximizedContainer.length) {
                // Unbind all keydown events
                $maximizedContainer.off("keydown");

                // Workaround for IE bug: http://bugs.jqueryui.com/ticket/9122
                var $iframesRemoving = $maximizedContainer.find("iframe");
                if ($iframesRemoving.length) {
                    $iframesRemoving.attr("src", "about:blank");
                }
                $maximizedContainer.remove();
            }

            // Unset the maximized mode class from body (non-dialog mode)
            $body.removeClass("workitem-control-maximized-mode"); // Will only be set if not in a dialog
            $body.off("keydown.maximizedControl");

            historySvc.detachNavigate(this._navigateHandler);

            // Check for and remove any hidden dialogs
            var $hiddenDialog = $(".workitem-control-maximized-hidden-dialog");
            if ($hiddenDialog.length) {
                $hiddenDialog.removeClass("workitem-control-maximized-hidden-dialog");
            }

            $(".witform-layout").resize();

            if (!$parentDialog.length) {
                // If we're using new form or not in a dialog, call onRestored now.
                // This is because we only set up dialog for old form.
                this._originalControl._maximizedControl = null;
                this._originalControl._onRestored();
            }
        }
    }

    public maximizeInPlace(top: number) {
        this._container.find(".richeditor-container").css("top", top);
        this.focus();
    }

    public restoreInPlace() {
        // The richeditor-container style is for the old editor and the workitem-richtexteditor is for the new editor
        // Once the old editor is gone we can remove that style
        this._container.find(".richeditor-container").css("top", "");
        this.focus();
    }
}
