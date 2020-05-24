import AdminBowtieControls = require("Admin/Scripts/Common/BowtieControls");
import AdminCommonLoadingOverlay = require("Admin/Scripts/Common/LoadingOverlay");
import AdminResources = require("Admin/Scripts/Resources/TFS.Resources.Admin");
import Controls = require("VSS/Controls");
import Dialogs = require("VSS/Controls/Dialogs");
import Notifications = require("VSS/Controls/Notifications");
import Utils_Array = require("VSS/Utils/Array");
import Utils_Core = require("VSS/Utils/Core");
import * as NavigationServices from "VSS/Navigation/Services";

var delegate = Utils_Core.delegate;

export enum WorkItemDialogBaseMode {
    Add = 0,
    Edit = 1,
    View = 2
}

export interface IWorkItemDialogBaseOptions<TModel> extends Dialogs.IModalDialogOptions {
    model?: TModel;
    className?: string;
    confirmUnsaveChanges?: boolean;
    okCallback?: (
        dialog: WorkItemDialogBase<TModel, IWorkItemDialogBaseOptions<TModel>>,
        value: TModel,
        loadOverlay: AdminCommonLoadingOverlay.ILoadingOverlay,
        errorMessageArea: Notifications.MessageAreaControl,
        succeeded: boolean) => void;
    mode?: WorkItemDialogBaseMode;
}

/**
 *  Base work item dialog for creating any sort of items
 */
export abstract class WorkItemDialogBase<TModel, TOptions extends IWorkItemDialogBaseOptions<TModel>>
    extends Dialogs.ModalDialogO<TOptions> {

    public static BASE_DIALOG_CLASS_NAME: string = "work-item-dialog";

    protected _model: TModel;
    protected _originalModel: TModel;
    protected _errorMessageArea: Notifications.MessageAreaControl;
    protected _loadingOverlay: AdminCommonLoadingOverlay.ILoadingOverlay;

    protected _$contentContainerElement: JQuery;

    private _$okButton: JQuery;
    private _navDelegate: IArgsFunctionR<any>;
    private _controlWithErrorMessageList: AdminBowtieControls.IErrorMessageControl[];

    constructor(options?: TOptions) {
        super(options);
    }

    public get mode(): WorkItemDialogBaseMode {
        return this._options.mode;
    }

    protected abstract _validate(model: TModel, setErrorMessage: boolean): boolean;

    public initializeOptions(options?: TOptions) {
        options = $.extend(
            <IWorkItemDialogBaseOptions<TModel>>{
                minWidth: 640,
                minHeight: 425,
                okText: AdminResources.Create,
                confirmUnsaveChanges: false,
                beforeClose: delegate(this, this.beforeClose)
            },
            options);

        if (options.model != null) {
            this._originalModel = options.model;
            this._model = $.extend(true, {}, options.model);
        }

        super.initializeOptions(options);
    }

    public initialize() {
        super.initialize();

        this._navDelegate = Utils_Core.delegate(this, this.dispose);
        NavigationServices.getHistoryService().attachNavigate("*", this._navDelegate, true);

        var $thisElement = this.getElement().addClass(WorkItemDialogBase.BASE_DIALOG_CLASS_NAME);
        this.updateOkButton(false);
        this._$okButton = $thisElement.parent().find("#ok");

        this._errorMessageArea = <Notifications.MessageAreaControl>Controls.BaseControl.createIn(Notifications.MessageAreaControl, $thisElement);
        this._createContainer($thisElement);
        this._loadingOverlay = new AdminCommonLoadingOverlay.LoadingOverlay(this);
        this._controlWithErrorMessageList = [];
    }


    public dispose() {
        let varHist = NavigationServices.getHistoryService();
        varHist.detachNavigate("*", this._navDelegate);
        super.dispose();
    }
    /**
     * Handle onOkClick event
     * @param e
     */
    public onOkClick(e?: JQueryEventObject) {
        this.updateOkButton(false);

        if (!this._validate(this._model, true)) {
            return;
        }

        if ($.isFunction(this._options.okCallback)) {
            this._loadingOverlay.show();
            this._options.okCallback(this, this._model, this._loadingOverlay, this._errorMessageArea, true);
        }
        else {
            this.close();
        }
    }

    /**
     * Updates the enabled state of the ok button. Don't specify enabled parameter or pass null to determine enabled by checking if registered controls have error messages.
     *
     * @param enabled True for enabled, false for disabled, or default/null to determine enabled via registered IErrorMessageControl's.
     * @publicapi
     */
    public updateOkButton(enabled: boolean = null) {
        // if any control still has error, don't enable OK button (only enable if no error on all registered controls)
        super.updateOkButton(enabled == null ?
            Utils_Array.first(this._controlWithErrorMessageList, c => c.hasErrorMessage()) == null : enabled);
    }

    protected _registerIErrorMessageControl(errorMessageControl: AdminBowtieControls.IErrorMessageControl) {
        if (errorMessageControl != null) {
            this._controlWithErrorMessageList.push(errorMessageControl);
        }
    }

    protected beforeClose(): boolean {
        if (this._options.confirmUnsaveChanges && !this._$okButton.is(":disabled")) {
            return confirm(AdminResources.UnsavedChangesPrompt);
        }

        return true;
    }

    /**
     * Adds a container for fields
     * @param $element
     */
    private _createContainer($element: JQuery) {
        this._$contentContainerElement = $('<div class="work-item-dialog-container bowtie">')
            .addClass(this._options.className);
        $element.append(this._$contentContainerElement);
    }
}
