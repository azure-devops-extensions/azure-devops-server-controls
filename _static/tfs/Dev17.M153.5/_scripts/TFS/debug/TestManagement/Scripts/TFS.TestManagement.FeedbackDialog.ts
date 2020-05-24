import Controls = require("VSS/Controls");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import Dialogs = require("VSS/Controls/Dialogs");
import Utils_Core = require("VSS/Utils/Core");
import Notifications = require("VSS/Controls/Notifications");
import FeedbackResources = require("Requirements/Scripts/Resources/TFS.Resources.RequirementsFeedback");
import StatusIndicator = require("VSS/Controls/StatusIndicator");
import Diag = require("VSS/Diag");
import TFS_Requirements_Utils = require("Requirements/Scripts/TFS.Requirements.Utils");
import FeedbackRequestViewModel = require("TestManagement/Scripts/TFS.TestManagement.FeedbackRequestViewModel");
import FeedbackRequestControl = require("TestManagement/Scripts/TFS.TestManagement.FeedbackRequestControl");
import FeedbackPreviewControl = require("TestManagement/Scripts/TFS.TestManagement.FeedbackPreviewControl");
import TCMTelemetry = require("TestManagement/Scripts/TFS.TestManagement.Telemetry");
import WITConstants = require("Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants");

let TelemetryService = TCMTelemetry.TelemetryService;
let RequestViewModel = FeedbackRequestViewModel.RequestViewModel;
let delegate = Utils_Core.delegate;
let RequestControl = FeedbackRequestControl.RequestControl;
let PreviewControl = FeedbackPreviewControl.PreviewControl;

export interface IPageControl {
    activated();
    handleErrors(errors: any);
    getRootElement(): JQuery;
}

export interface IFeedbackDialogOptions extends Dialogs.IModalDialogOptions {
    fieldData: { [fieldId: string]: any };
    team: string;
}

export class FeedbackDialog extends Dialogs.ModalDialogO<Dialogs.IModalDialogOptions> {
    public model: FeedbackRequestViewModel.RequestViewModel;

    private _content: JQuery;
    private _messagePane: Notifications.MessageAreaControl;
    private _$previewButton: JQuery;
    private _$backButton: JQuery;
    private _$sendButton: JQuery;
    private _$container: JQuery;
    private _$pageElement: JQuery;
    private _pageControls: IPageControl[];
    private _longRunningOperation: StatusIndicator.LongRunningOperation;
    private _diaglogOptions: IFeedbackDialogOptions;

    constructor(options?) {
        super(options);
        TFS_Requirements_Utils.CommonIdentityPickerHelper.featureFlagEnabled = true;
    }

    public initializeOptions(options?: IFeedbackDialogOptions) {
        this._diaglogOptions = $.extend({
            resizable: false,
            title: FeedbackResources.DialogTitle,
            buttons: this._getDialogButtons(),
            width: 800
        }, options);
        super.initializeOptions(this._diaglogOptions);
    }

    private _getDialogButtons() {
        return [
            {
                id: "send-button",
                text: FeedbackResources.SendButtonLabel,
                click: delegate(this, this._buttonHandler)
            },
            {
                id: "back-button",
                text: FeedbackResources.BackButtonLabel,
                click: delegate(this, this._buttonHandler)
            },
            {
                id: "preview-button",
                text: FeedbackResources.PreviewButtonLabel,
                click: delegate(this, this._buttonHandler)
            }
        ];
    }
    
    public initialize() {
        super.initialize();
        this._pageControls = [];
        this._$container = this.getElement();
        this._$pageElement = $("<div/>");
        this._$previewButton = $("#preview-button");
        this._$backButton = $("#back-button");
        this._$sendButton = $("#send-button");
        let $messageAreaContainer = $("<div>")
            .addClass("feedback-form-control-container")
            .addClass("messagearea-container");
        this._messagePane = <Notifications.MessageAreaControl>Controls.BaseControl.createIn(Notifications.MessageAreaControl, $messageAreaContainer);
        this._$container.append($messageAreaContainer);
        this._$container.append(this._$pageElement);
        this._initializeState();

        this.setInitialFocus();
    }

    private _initializeState() {
        let tfsContext = TFS_Host_TfsContext.TfsContext.getDefault();
        this._longRunningOperation = new StatusIndicator.LongRunningOperation(this);

        this.model = new FeedbackRequestViewModel.RequestViewModel({
            defaultErrorHandler: delegate(this, this.handleError),
            fieldData: this._diaglogOptions.fieldData,
            team: this._diaglogOptions.team
        });
        this.model.attachPageChanged(delegate(this, this._handlePageChanged));
        this.model.attachModelValidated(delegate(this, this._handleErrors));
        this.model.attachBeginOperation(delegate(this, this._handleBeginOperation));

        this._setPage(this.model.getPageIndex());

        if (!tfsContext.configuration.getMailSettings().enabled) {
            this._$pageElement.hide();
            TelemetryService.publishEvents(TelemetryService.featureRequestFeedbackMailNotConfigured, {});
            this.handleError(FeedbackResources.Error_TfsEmailNotConfigured);
            return;
        }
    }

    private _handleErrors() {
        let i, l,
            pageControl,
            errors = this.model.getErrors();

        if (!errors.hasErrors()) {
            this._messagePane.clear();
        }

        this._updateButtonState();

        for (i = 0, l = this._pageControls.length; i < l; i += 1) {
            pageControl = this._pageControls[i];

            if (pageControl && $.isFunction(pageControl.handleErrors)) {
                pageControl.handleErrors.call(pageControl, errors);
            }
        }
    }

    private _handlePageChanged(args?) {
        this._clearErrors();
        this._setPage(this.model.getPageIndex());
    }

    private _clearErrors() {
        this._messagePane.clear();
    }

    public handleError(error, options?: any) {
        this._longRunningOperation.endOperation();

        if (!error) {
            return;
        }

        let msg = (error.message ? error.message : error);

        this._updateButtonState();

        if (error.isNonFatal) {
            window.alert(msg);
            this.close();
        }
        else {
            this._messagePane.clear();

            if (msg) {
                this._messagePane.setError({
                    header: msg,
                });
            }
        }
    }

    private _handleBeginOperation() {
        /// <summary>Handles the "begin operation" event raised from the view model.</summary>

        this._updateButtonState();
    }

    private _updateButtonState() {
        this._enableButton(this._$previewButton, this.model.canMoveForward());
        this._enableButton(this._$backButton, this.model.canMoveBackward());
        this._enableButton(this._$sendButton, this.model.canFinish());
    }

    private _enableButton($button: JQuery, isEnabled: boolean) {
        $button.button("option", "disabled", !isEnabled);
    }

    private _setPage(pageIndex: number) {
        let newPageControl = this._pageControls[pageIndex];

        if (!newPageControl) {
            newPageControl = this._createPage(pageIndex);

            if (newPageControl) {
                this._pageControls[pageIndex] = newPageControl;
                this._$pageElement.append(newPageControl.getRootElement());
            }
            else {
                throw FeedbackResources.CannotCreatePage;
            }
        }

        switch (pageIndex) {
            case FeedbackRequestViewModel.RequestViewModel.PAGE_INDEX_REQUEST:
                this._$backButton.hide();
                this._$previewButton.show();
                break;
            case FeedbackRequestViewModel.RequestViewModel.PAGE_INDEX_PREVIEW:
                this._$previewButton.hide();
                this._$backButton.show();
                this._$sendButton.focus();
                break;
            default:
                break;
        }

        this._$pageElement.children().hide();
        newPageControl.getRootElement().fadeIn("fast");
        this._updateButtonState();

        if ($.isFunction(newPageControl.activated)) {
            newPageControl.activated();
        }
    }

    public getLongRunningOperation() {
        return this._longRunningOperation;
    }

    private _createPage(pageIndex) {
        let pageControl;

        switch (pageIndex) {
            case FeedbackRequestViewModel.RequestViewModel.PAGE_INDEX_REQUEST:
                pageControl = new RequestControl(this, this._diaglogOptions.fieldData[WITConstants.CoreField.Title]);
                break;
            case FeedbackRequestViewModel.RequestViewModel.PAGE_INDEX_PREVIEW:
                pageControl = new PreviewControl(this);
                break;
            default:
                break;
        }

        return pageControl;
    }

    private _buttonHandler(event) {
        Diag.Debug.assertParamIsObject(event, "event");
        Diag.Debug.assert(event.currentTarget, "currentTarget");

        let that = this;
        let pageIndex = this.model.getPageIndex();

        if (pageIndex === RequestViewModel.PAGE_INDEX_REQUEST) {
            let pageControl = this._pageControls[pageIndex] as FeedbackRequestControl.RequestControl;
            this.model.setValue(RequestViewModel.IDENTITIES_FIELD, pageControl.getSelectedIdentities());
            this.model.setValue(RequestViewModel.INVALID_IDENTITIES_FIELD, pageControl.getInvalidIdentities());
        }

        switch (event.currentTarget.id) {
            case "preview-button":
                TelemetryService.publishEvents(TelemetryService.featureViewRequestFeedbackPreview, {});
                this._longRunningOperation.beginOperation(function () {
                    that.model.beginNavigateForward(delegate(that, function () {
                        Diag.logVerbose("Completion callback for Navigate forward");
                        that._longRunningOperation.endOperation();
                    }), delegate(that, that.handleError));
                });
                break;
            case "back-button":
                this.model.navigateBackward();
                break;
            case "send-button":
                if (this.model.canFinish()) {
                    this._longRunningOperation.beginOperation(function () {
                        that.model.beginFinish(delegate(that, function () {
                            that._longRunningOperation.endOperation();
                            that.close();
                        }), delegate(that, that.handleError));
                    });
                }
                break;
            default:
                Diag.Debug.fail("Unknown button ID");
                break;
        }
    }
}
