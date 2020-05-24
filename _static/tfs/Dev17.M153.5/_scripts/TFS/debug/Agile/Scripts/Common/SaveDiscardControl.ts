/// <reference types="jquery" />

import Diag = require("VSS/Diag");
import Utils_Core = require("VSS/Utils/Core");
import Ajax = require("Presentation/Scripts/TFS/TFS.Legacy.Ajax");
import Events_Document = require("VSS/Events/Document");
import Events_Handlers = require("VSS/Events/Handlers");
import AgileControlsResources = require("Agile/Scripts/Resources/TFS.Resources.AgileControls");

export class SaveDiscardControl {

    public static EVENT_ON_BEFORE_SAVE: string = "on-before-save";
    public static EVENT_ON_CANCEL: string = "on-cancel";
    public static EVENT_ON_AJAX_COMPLETE: string = "on-ajax-complete";
    public static MODE_AJAXPOST: string = "ajaxPost";
    public static MODE_FORMPOST: string = "formPost";

    /**
     * Create and return a save discard control in a container
     *
     * @param container The html element to create the control in
     * @param options OPTIONAL: The options to customize/configure this control
     */
    public static createIn(container: any, options?: any) {
        Diag.Debug.assertParamIsObject(container, "container");

        var $container = $(container),
            data,
            config,
            mode;

        // Default to MODE_FORMPOST if no option specified
        mode = (options && options.mode) ? options.mode : SaveDiscardControl.MODE_FORMPOST;

        switch (mode) {
            case SaveDiscardControl.MODE_FORMPOST:
                data = $("script", $container).eq(0).html();
                if (data) {
                    $container.empty();
                    config = Utils_Core.parseMSJSON(data, false);
                    $.extend(config, { mode: mode });
                }
                else {
                    config = $.extend(options, { mode: mode });
                }
                break;
            case SaveDiscardControl.MODE_AJAXPOST:
                config = options;
                break;
            default:
                Diag.Debug.fail("Specified mode is not valid");
                break;
        }

        return new SaveDiscardControl($container, config);
    }

    private _mode: string;
    private _$container: JQuery;
    private _$saveButton: JQuery;
    private _$cancelButton: JQuery;
    private _saveValue: any;
    private _events: Events_Handlers.NamedEventCollection<any, any>;
    private _isDirty: boolean;
    private _submitting: boolean;
    private _pendingSaveEnablement: boolean;
    private _actionUrl: string;
    private _$formValue: JQuery;
    private _$userActionValue: JQuery;

    /**
     * Create a new save discard control
     *
     * @param container The container to use in drawing the controls.
     * @param options Options to configure the control
     */
    constructor(container: JQuery, options?: any) {

        Diag.Debug.assertParamIsObject(container, "container");
        Diag.Debug.assertParamIsObject(options, "options");

        this._mode = options.mode; //|| SaveDiscardControl.MODE_FORMPOST;
        this._$container = $(container);
        this._actionUrl = options.url;

        this._events = new Events_Handlers.NamedEventCollection();

        this._createControl();
    }

    /**
     * Indicates whether the control is dirty
     *
     * @return True if control should be considered dirty, false otherwise
     */
    public isDirty(): boolean {
        return this._isDirty && !this._submitting;
    }

    /**
     * Indicates whether the control is currently in a submitting state. E.g. during an AJAX request
     *
     * @return True if control is submitting, false otherwise
     */
    public isSubmitting(): boolean {
        return this._submitting;
    }

    /**
     * Enable or disable the save button.
     *
     * @param enabled Enabled flag.
     */
    public setSaveEnabled(enabled: boolean) {
        Diag.Debug.assertParamIsBool(enabled, "enabled");

        // If we are in the process of an AJAX submission then don't allow the save button to be enabled until after the response is received
        if (this._submitting && enabled) {
            this._pendingSaveEnablement = true;
            return;
        }

        this._pendingSaveEnablement = false;
        (<any>this._$saveButton).attr("disabled", !enabled);
    }

    /**
     * Enable or disable the discard button.
     *
     * @param enabled Enabled flag.
     */
    public setDiscardEnabled(enabled: boolean) {
        Diag.Debug.assertParamIsBool(enabled, "enabled");
        this._isDirty = enabled;
        (<any>this._$cancelButton).attr("disabled", !enabled);
    }

    /**
     * The value which will be sent when the save button is clicked.
     *
     * @param saveValue Value that will be sent to the server when save is clicked.
     */
    public setSaveValue(saveValue: any) {

        this._saveValue = saveValue;
    }

    /**
     *     Attach a handler for the on before save event.  This event will
     *     be raised just prior submiting the save value to the server.
     *     The event handler will be invoked with this save/discard control
     *     as its only argument.
     *
     * @param handler The handler to attach
     */
    public attachOnBeforeSave(handler: IEventHandler) {
        Diag.Debug.assert($.isFunction(handler), "The handler must be a function.");

        this._events.subscribe(SaveDiscardControl.EVENT_ON_BEFORE_SAVE, <any>handler);
    }

    /**
     * Remove a handler for the on before save event
     *
     * @param handler The handler to remove
     */
    public detachOnBeforeSave(handler: IEventHandler) {
        Diag.Debug.assert($.isFunction(handler), "The handler must be a function.");

        this._events.unsubscribe(SaveDiscardControl.EVENT_ON_BEFORE_SAVE, <any>handler);
    }

    /**
     *     Attach a handler for the on cancel event.  This event will
     *     be raised whenever the cancel button has been pressed.
     *
     * @param handler The handler to attach
     */
    public attachOnCancel(handler: IEventHandler) {
        Diag.Debug.assert($.isFunction(handler), "The handler must be a function.");

        this._events.subscribe(SaveDiscardControl.EVENT_ON_CANCEL, <any>handler);
    }

    /**
     * Remove a handler for the on cancel event
     *
     * @param handler The handler to remove
     */
    public detachOnCancel(handler: IEventHandler) {
        Diag.Debug.assert($.isFunction(handler), "The handler must be a function.");

        this._events.unsubscribe(SaveDiscardControl.EVENT_ON_CANCEL, <any>handler);
    }

    /**
     *     Attach a handler for the on Ajax complete event.  This event will
     *     be raised whenever the pending Ajax request has completed. The callback
     *     will be passed as object like:
     *     {
     *         result: Boolean
     *     }
     *
     * @param handler The handler to attach
     */
    public attachOnSaveComplete(handler: IEventHandler) {
        Diag.Debug.assert($.isFunction(handler), "The handler must be a function.");

        this._events.subscribe(SaveDiscardControl.EVENT_ON_AJAX_COMPLETE, <any>handler);
    }

    /**
     * Remove a handler for the on Ajax complete event
     *
     * @param handler The handler to remove
     */
    public detachOnSaveComplete(handler: IEventHandler) {
        Diag.Debug.assert($.isFunction(handler), "The handler must be a function.");

        this._events.unsubscribe(SaveDiscardControl.EVENT_ON_AJAX_COMPLETE, <any>handler);
    }

    /**
     * Creates the necessary controls to operate in AJAX mode
     */
    private _createAjaxControl() {
        var $div = $("<div/>");

        this._createButtons();

        $div.append(this._$saveButton);
        $div.append(this._$cancelButton);

        this._$container.append($div);
    }

    /**
     * Creates the necessary controls to operate in Form mode
     */
    private _createFormControl() {
        var $form;

        // Create the save/discard form
        $form = $("<form method='post' action='" + this._actionUrl + "' />");
        this._$formValue = $("<input name='saveData' type='hidden' value=''>");
        this._$userActionValue = $("<input name='userAction' type='hidden' value=''>");
        this._createButtons();

        $form.append(this._$formValue);
        $form.append(this._$userActionValue);
        $form.append(this._$saveButton);
        $form.append(this._$cancelButton);

        Ajax.setAntiForgeryToken($form);

        this._$container.append($form);
    }

    /**
     * Creates the save and discard buttons
     */
    private _createButtons() {

        // Note: These lines are repeated instead of simply adding the type attribute if the mode is MODE_FORMPOST because
        //       jQuery does not allow setting the type attribute due to problems in IE
        switch (this._mode) {
            case SaveDiscardControl.MODE_AJAXPOST:
                this._$saveButton = $("<button id='saveButton' class='form-button save-discard-save-button'>" + AgileControlsResources.SaveDiscard_SaveButton + "</button>");
                this._$cancelButton = $("<button id='cancelButton' class='form-button'>" + AgileControlsResources.SaveDiscard_DiscardButton + "</button>");
                break;
            case SaveDiscardControl.MODE_FORMPOST:
                this._$saveButton = $("<button id='saveButton' class='form-button save-discard-save-button' type='submit'>" + AgileControlsResources.SaveDiscard_SaveButton + "</button>");
                this._$cancelButton = $("<button id='cancelButton' class='form-button' type='submit'>" + AgileControlsResources.SaveDiscard_DiscardButton + "</button>");
                break;
        }
    }

    /**
     * The handler for clicking the Save button
     */
    private _onSaveClick() {
        this._submitting = true;

        // Only set the save button disabled when using Ajax otherwise it will block the posting of the form
        if (this._mode === SaveDiscardControl.MODE_AJAXPOST) {
            this.setSaveEnabled(false);
        }

        this._raiseOnBeforeSave();

        switch (this._mode) {
            case SaveDiscardControl.MODE_AJAXPOST:
                this._postSaveValue();
                break;
            case SaveDiscardControl.MODE_FORMPOST:
                this._$userActionValue.val("Save");
                this._updateObjectJson();
                break;
        }
    }

    /**
     * The handler for clicking the Cancel button
     */
    private _onCancelClick() {
        this._submitting = true;

        switch (this._mode) {
            case SaveDiscardControl.MODE_AJAXPOST:
                location.reload(/**force*/true);
                break;
            case SaveDiscardControl.MODE_FORMPOST:
                this._$userActionValue.val("Cancel");
                this._$formValue.val("");
                break;
        }
    }

    /**
     * Create the the form
     */
    private _createControl() {
        switch (this._mode) {
            case SaveDiscardControl.MODE_AJAXPOST:
                this._createAjaxControl();
                break;
            case SaveDiscardControl.MODE_FORMPOST:
                this._createFormControl();
                break;
        }

        this._$saveButton.click(Utils_Core.delegate(this, this._onSaveClick));
        this._$cancelButton.click(Utils_Core.delegate(this, this._onCancelClick));

        this.setSaveEnabled(false);
        this.setDiscardEnabled(false);

        Events_Document.getRunningDocumentsTable().add("SaveDiscardControl", this);
    }

    /**
     * Update the json value on the config field for post
     */
    private _postSaveValue() {
        Diag.logTracePoint("SaveDiscardControl.postMSJSON.start");

        Ajax.postMSJSON(this._actionUrl,
            {
                saveData: Utils_Core.stringifyMSJSON(this._saveValue), // Note that recipient actions need to accept a parameter of name "saveData"
                userAction: "Save"
            },
            Utils_Core.delegate(this, this._onRequestSuccess),
            Utils_Core.delegate(this, this._onRequestFail));
    }

    /**
     * Handler for successful Ajax response
     */
    private _onRequestSuccess(result) {
        this._submitting = false;

        Diag.Debug.assert(result.success, "Expected result to be successful in success handler");

        this.setSaveEnabled(false);
        this.setDiscardEnabled(false);

        this._handleRequestComplete(result);

        location.reload(/**force*/true);
    }

    /**
     * Handler for unsuccessful Ajax response
     */
    private _onRequestFail(result) {
        this._submitting = false;
        this._handleRequestComplete(result);
    }

    /**
     * Manages object concerns when the Ajax request has been completed regardless of fail or success state
     */
    private _handleRequestComplete(result) {
        // If, while we were waiting for the Ajax response, the consumer attempted to enable the save button then enable it
        if (this._pendingSaveEnablement) {
            this._pendingSaveEnablement = false;
            this.setSaveEnabled(true);
        }
        this._raiseOnSaveComplete(result);

        Diag.logTracePoint("SaveDiscardControl.postMSJSON.complete");
    }

    /**
     * Update the json value on the config field for post
     */
    private _updateObjectJson() {
        this._$formValue.val(Utils_Core.stringifyMSJSON(this._saveValue));
    }

    /**
     * Notifies listeners that a save is about to occur.
     */
    private _raiseOnBeforeSave() {
        this._events.invokeHandlers(SaveDiscardControl.EVENT_ON_BEFORE_SAVE, this);
    }

    /**
     * Notifies the listeners when an Ajax complete operation has occurred
     */
    private _raiseOnSaveComplete(result) {
        this._events.invokeHandlers(SaveDiscardControl.EVENT_ON_AJAX_COMPLETE, result);
    }
}
