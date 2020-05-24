/// <reference types="jquery" />

import VSS = require("VSS/VSS");
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import Diag = require("VSS/Diag");
import VSS_Resources_Platform = require("VSS/Resources/VSS.Resources.Platform");
import Ajax = require("Presentation/Scripts/TFS/TFS.Legacy.Ajax");
import Controls = require("VSS/Controls");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import TFS_NotificationEventNames = require("Presentation/Scripts/TFS/TFS.NotificationEventNames");
import Validation = require("VSS/Controls/Validation");
import Search = require("VSS/Search");
import TFS_OM = require("Presentation/Scripts/TFS/TFS.OM.Common");
import TFS_WebSettingsService = require("Presentation/Scripts/TFS/TFS.WebSettingsService");
import Utils_UI = require("VSS/Utils/UI");
import StatusIndicator = require("VSS/Controls/StatusIndicator");
import Dialogs = require("VSS/Controls/Dialogs");
import Notifications = require("VSS/Controls/Notifications");
import TFS_Server_WebAccess_Constants = require("Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants");
import PresentationResources = require("Presentation/Scripts/TFS/Resources/TFS.Resources.Presentation");
import DiscussionResources = require("Presentation/Scripts/TFS/Resources/TFS.Resources.Discussion");
import DiscussionConstants = require("Presentation/Scripts/TFS/Generated/TFS.Discussion.Constants");
import Service = require("VSS/Service");
import Events_Action = require("VSS/Events/Action");
import Events_Services = require("VSS/Events/Services");
import Utils_Html = require("VSS/Utils/Html");
import Telemetry = require("VSS/Telemetry/Services");

var delegate = Utils_Core.delegate;
var domElem = Utils_UI.domElem;

/**
 * Interface representing dismissable notification settings, to be kept in sync with AgilePortfolioManagementNotificationViewModel.cs
 */
export interface IDismissableNotificationSettings {
    className: string;
    closeable: boolean;
    message: INotificationMessage;
    clientDismissable: boolean;
}

/**
 * Interface representing a notification message, to be kept in sync with NotificationMessageModel.cs
 */
export interface INotificationMessage {
    id: string;
    scope: TFS_WebSettingsService.WebSettingsScope;
    type: number;
    header: string;
    content: string;
}

export class DismissableMessageAreaControl extends Controls.BaseControl {

    private _messageArea: any;
    private _dismissDelegate: (...args: any[]) => any;

    /**
     * A message area control that displays a message to a user until they dismiss it.
     */
    constructor(options?) {
        super(options);
    }

    /**
     * Initialize the control, creating the message area and binding to the dismiss event
     */
    public initialize() {

        if (this._isDismissedOnClient()) {
            // Do not create at all if dismissed
            return;
        }

        super.initialize();

        this._initializeMessageAreaOptions();
        this._messageArea = <Notifications.MessageAreaControl>Controls.Enhancement.enhance(Notifications.MessageAreaControl, this.getElement(), this._options);

        this._dismissDelegate = delegate(this, this._dismissMessage);
        this._bind(Notifications.MessageAreaControl.EVENT_DISPLAY_CLEARED, this._dismissDelegate);
    }

    /**
     * Reconfigure the control, updating the message displayed in the message area
     * 
     * @param options Updated set of options to set on the control
     */
    public reconfigure(options: IDismissableNotificationSettings) {
        $.extend(this._options, options);
        this._initializeMessageAreaOptions();

        // NOTE: We unbind our dismiss handler during reconfigure to ensure that clearing the message
        // area during the update doesn't get incorrectly handled as the user clicking "dismiss".
        this._unbind(Notifications.MessageAreaControl.EVENT_DISPLAY_CLEARED, this._dismissDelegate);

        if (this._isDismissedOnClient()) {
            this._messageArea.clear();

            return;
        }

        if (this._options.message) {
            this._messageArea.setMessage(this._options.message);
        }
        else {
            this._messageArea.clear();
        }

        this._bind(Notifications.MessageAreaControl.EVENT_DISPLAY_CLEARED, this._dismissDelegate);
    }

    /**
     * Checks local storage to see if the given message has been dismissed before in the given scope
     * 
     * @param messageId The guid that identifies the message
     * @param scope The scope of the message
     */
    public static isDismissedOnClient(messageId: string, scope: TFS_WebSettingsService.WebSettingsScope): boolean {
        var storedValue = Service.getApplicationService(TFS_WebSettingsService.WebSettingsService)
            .readLocalSetting(TFS_Server_WebAccess_Constants.Messages.DismissNotificationRegistryPath + messageId, scope, false);
        return storedValue === "true";
    }

    private _isDismissedOnClient(): boolean {
        if (this._options
            && this._options.clientDismissable
            && this._options.message && this._options.message.id) {
            return DismissableMessageAreaControl.isDismissedOnClient(this._options.message.id, this._options.message.scope);
        }
    }

    private _initializeMessageAreaOptions() {
        var messageAreaOptions: any = this._options;

        if (!messageAreaOptions) {
            return;
        }

        // Allow raw HTML to be passed as the message and pass it into the DOM unescaped.
        if (messageAreaOptions.message && typeof messageAreaOptions.message.header === "string") {
            messageAreaOptions.message.header = $(domElem("span")).html(messageAreaOptions.message.header);
        }
        if (messageAreaOptions.message && typeof messageAreaOptions.message.content === "string") {
            messageAreaOptions.message.content = $(domElem("span")).html(messageAreaOptions.message.content);
        }

        return;
    }

    public _dismissMessage(source, args?) {
        if (this._options && this._options.message && this._options.message.id) {
            var eventIdentifier = this._options.clientDismissable
                ? TFS_NotificationEventNames.EventNames.ClientNotificationDismissed : TFS_NotificationEventNames.EventNames.NotificationDismissed;

            Events_Services.getService().fire(eventIdentifier, this._options.message.id, this._options.message.scope);
        }
    }
}

Controls.Enhancement.registerEnhancement(DismissableMessageAreaControl, ".tfs-host-notifications");

export interface IAccountTrialMode {
    StartDate: string;
    EndDate: string;
    IsAccountInTrialMode: boolean;
    IsAccountEligibleForTrialMode: boolean;
    IsAccountTrialModeExpired: boolean;
    DaysLeftOnTrialMode: number;
    TrialFeatureUrl: string;
    EndDateIfTrialStarted: string;
}

interface IErrorMessage { type: string; message: string }

export interface AccountTrialDialogOptions extends IAccountTrialMode, Dialogs.IModalDialogOptions {
    mainTitle?: string;
    contentHeader?: string;
    contentDescription?: string;
}

export class AccountTrialDialog extends Dialogs.ModalDialogO<AccountTrialDialogOptions> {
    private _$data: any;
    private _$dataDiv: any;
    private _$trialTextDiv: any;
    private _$waitControl: any;
    private _$errorMessageImg: any;
    private _$errorMessageText: any;
    private _$errorMessageDiv: any;
    private _$errorMessageImgDiv: any;

    constructor(options?: IAccountTrialMode) {
        super(options);
    }

    public initializeOptions(options?: IAccountTrialMode) {

        super.initializeOptions($.extend({
            width: 450,
            minWidth: 450,
            height: 260,
            minHeight: 260,
            allowMultiSelect: false,
            contentHeader: VSS_Resources_Platform.TrialHeader,
            contentDescription: VSS_Resources_Platform.TrialStartToday,
            buttons: {
                saveButton: {
                    id: 'ok',
                    text: VSS_Resources_Platform.StartTrial,
                    click: delegate(this, this._onSaveClick)
                },
                cancelButton: {
                    id: 'cancel',
                    text: VSS_Resources_Platform.ModalDialogCancelButton,
                    click: delegate(this, this.onCancelClick)
                }
            }
        }, options));
    }

    public initialize() {
        super.initialize();
        this.buildDialogElements();
    }

    private buildDialogElements() {
        /// This will create the UX layout and display all the elements and text.

        this._$data = $('<div>')
            .addClass('trial-account-dialog');

        var wrapper = $('<div>')
            .append(this._$data)
            .addClass('admin-dialog')
            .css('height', '100%');

        this.getElement().append(wrapper);

        this._$waitControl = Controls.create(StatusIndicator.WaitControl, this.getElement(), <StatusIndicator.IWaitControlOptions>{
            target: this._$data,
            cancellable: false,
            message: VSS_Resources_Platform.DefaultWaitMessage
        });

        var headerSection = $('<div>').appendTo(this._$data)
            .addClass('trial-account-header-section');

        // add the main header
        if (this._options.mainTitle) {
            $('<div>').appendTo(headerSection)
                .addClass('dialog-header')
                .text(this._options.mainTitle);
        }

        // add the header
        this.setTitle(this._options.contentHeader);

        this._$dataDiv = $('<div>').appendTo(this._$data)
            .attr('id', 'main-context');

        // add the trial text
        this._$trialTextDiv = $('<div>').appendTo(this._$dataDiv).addClass('message-trial');

        this._createTrialHeader();

        // error messages
        this._createErrorFooter();
        this._hideError();
    }

    private _updateTrialButtons(enabled: boolean) {
        this.updateOkButton(enabled);
    }

    private _onCloseClick(e?: JQueryEventObject) {
        this.close();
    }

    private _onCancelClick(e?: JQueryEventObject) {
        this.close();
    }

    private _onSaveClick(e?: JQueryEventObject) {
        this._hideError();

        this._updateTrialButtons(false);
        this._$waitControl.startWait();

        // make ajax call to submit the data.
        Ajax.postMSJSON(TFS_Host_TfsContext.TfsContext.getDefault().getActionUrl('EnableAccountTrialMode', 'account', { area: 'api' }),
            null,
            // handle success.
            delegate(this, this._postTrialSuccess),
            //handle error
            delegate(this, this._postTrialFailure)
        );
    }

    private _postTrialSuccess(data: { Status: boolean }) {
        this._$waitControl.endWait();
        Events_Action.getService().performAction(Events_Action.CommonActions.ACTION_WINDOW_RELOAD);
    }

    private _postTrialFailure(error: IErrorMessage) {
        this._$waitControl.endWait();

        switch (error.type) {
            case "Microsoft.VisualStudio.Services.Account.AccountTrialException":
                this._showError(error.message);
                break;
            default:
                this._showError(VSS_Resources_Platform.StartTrialFail);
        }
    }

    private _showError(e: string) {
        this._$errorMessageDiv.show();
        this._$errorMessageText.text(e);
    }

    private _hideError() {
        this._$errorMessageDiv.hide();
    }

    private _createErrorFooter() {
        this._$errorMessageDiv = $('<div>').appendTo($('#main-context'))
            .attr('id', 'account-error-trial')
            .addClass("error-message-div-trial");

        this._$errorMessageImgDiv = $('<div>').appendTo(this._$errorMessageDiv)
            .addClass('trial-err-footer-img');

        this._$errorMessageImg = $('<span/>').appendTo(this._$errorMessageImgDiv)
            .addClass('trial-error-message-icon')
            .addClass('trial-error-message-img');

        this._$errorMessageText = $('<div>').appendTo(this._$errorMessageDiv)
            .addClass('error-message-account-trial');
    }

    private _createTrialHeader() {

        var trialWarningHeaderDiv = $('<div>').appendTo(this._$trialTextDiv)
            .addClass('trial-text-header-div');

        var $trialDiv = $('<div>').appendTo(this._$trialTextDiv).addClass('trial-text-header-div');
        $trialDiv.addClass('description-trial').html(Utils_String.format(this._options.contentDescription, this._options.EndDateIfTrialStarted));

        var $trialDivDetail = $('<div>').appendTo(this._$trialTextDiv).addClass('trial-text-header-div');
        $trialDivDetail.addClass('description-frature-trial-once').html(VSS_Resources_Platform.PutAccountTrialOnce);

        var $trialDivDetail = $('<div>').appendTo(this._$trialTextDiv).addClass('trial-text-header-div');
        $trialDivDetail.addClass('detail-feature-trial').html(Utils_String.format(VSS_Resources_Platform.AllFeaturesEnableDuringTrial, this._options.TrialFeatureUrl));
    }
}

export interface ICommentFeedbackDialogOptions extends Dialogs.IModalDialogOptions {
    thread: DiscussionConstants.DiscussionThread;
}

export class CommentFeedbackDialog extends Dialogs.ModalDialogO<ICommentFeedbackDialogOptions> {
    private _$commentFeedbackInput: JQuery;
    private _$wrongWordCheckbox: JQuery;
    private _$wrongWordLabel: JQuery;

    private _thread: any;

    constructor(options?: ICommentFeedbackDialogOptions) {
        super(options);
        this._thread = options.thread || null;
    }

    public initializeOptions(options?: ICommentFeedbackDialogOptions) {
        super.initializeOptions($.extend({
            coreCssClass: "comment-feedback-dialog",
            title: DiscussionResources.CommentFeedbackDialog_Title,
            okText: DiscussionResources.CommentFeedbackDialog_OkText,
            resizable: false,
            draggable: true,
            useBowtieStyle: true,
            bowtieVersion: 2,
            width: 560
        }, options));
    }

    public initialize() {
        var commentFeedbackInputId = "commentFeedbackInput" + Controls.getId();
        var commentFeedbackCheckboxId = "commentFeedbackCheckbox" + Controls.getId();
        var $commentFeedbackInputDiv: JQuery = $(domElem("div", "form-section")).appendTo(this._element);

        $(domElem("label"))
            .attr("for", commentFeedbackInputId)
            .text(DiscussionResources.CommentFeedbackDialog_SecondaryText)
            .appendTo($commentFeedbackInputDiv);

        this._$commentFeedbackInput = $(domElem("textarea", "comment-feedback-dialog-input"))
            .attr("type", "text")
            .attr("id", commentFeedbackInputId)
            .height(100)
            .appendTo($commentFeedbackInputDiv);

        var $checkBoxDiv: JQuery = $(domElem("div", "form-section")).appendTo(this._element);
        var $wrongWordCheckboxPair = $(domElem("div", "checkbox-pair")).appendTo($checkBoxDiv);

        this._$wrongWordCheckbox = $(domElem("input"))
            .addClass("checkbox-input comment-feedback-dialog-wrong-word-checkbox")
            .attr("type", "checkbox")
            .attr("id", commentFeedbackCheckboxId)
            .appendTo($wrongWordCheckboxPair);

        this._$wrongWordLabel = $(domElem("label"))
            .attr("for", commentFeedbackCheckboxId)
            .addClass("checkbox-label comment-feedback-dialog-wrong-word-label-text")
            .text(DiscussionResources.CommentFeedbackDialog_WrongWordLabelText)
            .appendTo($wrongWordCheckboxPair);

        super.initialize();
        this.updateOkButton(true);
    }

    public onOkClick(e?: JQueryEventObject): any {
        var commentFeedbackContent = this._$commentFeedbackInput.val();
        var wrongWordWasChecked = this._$wrongWordCheckbox && this._$wrongWordCheckbox.is(":checked");

        if (this._thread && this._thread.firstComparingIteration && this._thread.secondComparingIteration) {
            var commentFeedbackEvent = new Telemetry.TelemetryEventData("CommentTracking", "CommentFeedbackDialog", {
                "threadId": this._thread.id,
                "artifactUri": this._thread.artifactUri,
                "itemPath": this._thread.itemPath,
                "originalFirstIteration": this._thread.firstComparingIteration,
                "originalSecondIteration": this._thread.secondComparingIteration,
                "trackedFirstIteration": this._thread.trackingCriteria.firstComparingIteration,
                "trackedSecondIteration": this._thread.trackingCriteria.secondComparingIteration,
                "feedbackContent": commentFeedbackContent,
                "wrongWordBoxWasChecked": wrongWordWasChecked
            });
            Telemetry.publishEvent(commentFeedbackEvent);
        }

        this.close();
    }
}

/**
 * The responsive grid is a layout control which changes its width depending on the screen of the user.
 * The responsive grid comprises of 3 sections.
 * Section 1 is a fix sized section of width 640px.
 * Section 2 is a grid of width 320px.
 * Section 3 is a grid of width 320px.
 * When the screen resolution is >= 1280 section 1, section2 and section 3 appear side by side on the same line.
 * When the screen resolution is > 960 and < 1280. Section 3 floats under section 1 or section 2 and wraps around.
 * When the screen resolution is < 960 section 2 and section 3 float under section 1.
 */
export class ResponsiveGrid {
    private _gridElement;
    private static _instance: ResponsiveGrid;
    private static cellSize = 160;

    constructor() {
        this._gridElement = $('.responsive-grid:first');

        // This is a special case scenario where we might decide to not put any element in section 3
        // in which case the smallest resolution on the grid i.e 640 px should stack section 1 and section 2
        // below each other both with widths of 640px.
        if (this._gridElement.length === 1) {
            this._adjustGridSections();
            $(window).resize(() => {
                this._adjustGridSections();
            });
        }
    }
    private _adjustGridSections() {
        this._adjustGridWidth();
        this._adjustSection3Top();
    }

    private _adjustGridWidth() {
        if (this._gridElement.width() === 640 && this.getSection(3).children().length === 0) {
            this.getSection(2).css({ 'width': '640px' });
        }
        else {
            this.getSection(2).css({ 'width': '320px' });
        }
    }

    private _adjustSection3Top() {
        var items = $('.grid-cell', this.getSection(3));
        var section3 = this.getSection(3);

        if (this._gridElement.width() === 960 && (this.getSection(2).height() - this.getSection(1).height() >= 160)) {
            if (section3.width() === 960) {
                section3.css({ "width": "640px" });
            }
            items.css({ 'top': this.getSection(1).height() - this.getSection(2).height() + 'px' });
        }
        else if (this._gridElement.width() === 960 && (this.getSection(2).height() == this.getSection(1).height())) {
            if (section3.width() === 640) {
                section3.css({ "width": "960px" });
                items.css({ 'top': '' });
            }
        }
        else {
            section3.css({ "width": "" });
            items.css({ 'top': '' });
        }
    }

    public static GetInstance(): ResponsiveGrid {
        if (!this._instance) {
            this._instance = new ResponsiveGrid();
        }
        return this._instance;
    }

    /**
     * Scans the html for grid items and adds them to the grid.
     */
    public scanViewImports(): void {
        $(() => {
            var gridItems = $('.grid-view-item');

            $.each(gridItems, (index, item) => {
                var section = parseInt($(item).attr("data-grid-cell-section"));
                var columns = parseInt($(item).attr("data-grid-cell-columns"));
                var rows = parseInt($(item).attr("data-grid-cell-rows"));
                var adjustHeight = $(item).attr("data-grid-cell-adjustHeight").toLowerCase() === 'true' ? true : false;

                $(item).remove();
                this.addControlInGrid(section, rows, columns, adjustHeight, item);
                $(item).removeClass("grid-item-hidden").removeClass("grid-view-item");
            });
            this._adjustGridSections();
        });
    }

    public getElement() {
        return this._gridElement;
    }

    /**
     * @param sectionNumber The section in grid.
     */
    public getSection(sectionNumber: number): JQuery {   /// <summary>Gets the section corresponsding to the section number.</summary>
        return $('.section' + sectionNumber, this._gridElement);
    }

    /**
     * Adds the control in the grid.
     * 
     * @param sectionNumber The section in which the control should be put.
     * @param rows The number of rows the control will use.
     * @param columns The number of columns the control will use.
     * @param adjustHeight A value indicating whether the height of the control in the grid
     * should be adjusted to fit the control.
     * @param control The control string or html element.
     * @return The container containing the control.
     */
    public addControlInGrid(sectionNumber: number, rows: number, columns: number, adjustHeight: boolean, control?): JQuery {

        var container = this.createContainer(sectionNumber, rows, columns);

        if (control) {
            $(container).append(control);
            if (adjustHeight) {
                var height = this._getAdjustedContainerHeight(control) + 'px';

                $(container).css({ 'height': height });
            }
        }

        this._adjustGridSections();
        return container;
    }

    /**
     * Creates a container in the grid.
     * 
     * @param sectionNumber The section in which the control should be put.
     * @param rows The number of rows the control will use.
     * @param columns The number of columns the control will use.
     */
    public createContainer(sectionNumber: number, rows: number, columns: number): JQuery {
        var section = this.getSection(sectionNumber);
        var container = $('<div class="grid-cell"></div>');
        $(section).append(container);
        var width = columns * ResponsiveGrid.cellSize + 'px';
        var height = rows * ResponsiveGrid.cellSize + 'px';
        $(container).css({ 'width': width, 'height': height });
        this._adjustGridSections();

        return container;
    }

    /**
     * Creates the control in the grid.
     * 
     * @param sectionNumber The section in which the control should be put.
     * @param rows The number of rows the control will use.
     * @param columns The number of columns the control will use.
     * @param type The control type.
     * @param options The options for the control.
     * @return 
     */
    public createInGrid(sectionNumber: number, rows: number, columns: number, type?, options?): Controls.BaseControl {

        var container = this.addControlInGrid(sectionNumber, rows, columns, false);
        this._adjustGridSections();
        return Controls.BaseControl.createIn(type, container, options)
    }

    /**
     * Expands or contracts the height of the control container inside the grid.
     * 
     * @param controlElement The element containing the control.
     */
    public adjustHeight(controlElement): void {
        var container = $(controlElement).parent('.grid-cell');
        if (container.length > 0) {
            var height = this._getAdjustedContainerHeight(container) + 'px';
            $(container).css({ 'height': height });
        }
        this._adjustGridSections();
    }

    public removeContainer(controlElement): void {
        $(controlElement).parent('.grid-cell').remove();
        this._adjustGridSections();
    }

    public getContainer(controlElement): JQuery {
        return $(controlElement).parent('.grid-cell');
    }

    private _getAdjustedContainerHeight(container): number {
        $(container).css({ 'height': 'auto' });
        var controlHeight = $(container).height();

        if (controlHeight <= 0) {
            controlHeight = 0;
        }
        else {
            controlHeight = Math.ceil(controlHeight / ResponsiveGrid.cellSize) * ResponsiveGrid.cellSize;
        }

        return controlHeight;
    }
}

$(() => {
    ResponsiveGrid.GetInstance().scanViewImports();
});

export class CommonMenuItems {

    public static ADD_TO_MY_FAVORITES_ACTION: string = "add-to-my-favorites";
    public static ADD_TO_TEAM_FAVORITES_ACTION: string = "add-to-team-favorites";
    public static REMOVE_FROM_MY_FAVORITES_ACTION: string = "remove-from-my-favorites";
    public static REMOVE_FROM_TEAM_FAVORITES_ACTION: string = "remove-from-team-favorites";
    public static PIN_TO_HOMEPAGE_ACTION: string = "pin-to-homepage";
    public static UNPIN_FROM_HOMEPAGE_ACTION: string = "unpin-from-homepage";
    public static ITEM_SECURITY_ACTION: string = "item-security";

    public static addToMyFavs() {
        return {
            id: CommonMenuItems.ADD_TO_MY_FAVORITES_ACTION,
            text: PresentationResources.AddToMyFavoritesTitle,
            title: PresentationResources.AddToMyFavoritesTooltipText,
            icon: "bowtie-icon bowtie-favorite",
            groupName: "favorites"
        };
    }

    public static addToTeamFavs(disabled?: boolean) {
        return {
            id: CommonMenuItems.ADD_TO_TEAM_FAVORITES_ACTION,
            text: PresentationResources.AddToTeamFavoritesTitle,
            title: PresentationResources.AddToTeamFavoritesTooltipText,
            disabled: (disabled === null || disabled === undefined) ? false : disabled,
            groupName: "favorites"
        };
    }

    public static removeFromMyFavs() {
        return {
            id: CommonMenuItems.REMOVE_FROM_MY_FAVORITES_ACTION,
            text: PresentationResources.RemoveFromMyFavoritesTitle,
            title: PresentationResources.RemoveFromMyFavoritesTooltipText,
            icon: "bowtie-icon bowtie-favorite-outline",
            groupName: "favorites"
        };
    }

    public static removeFromTeamFavs(disabled?: boolean) {
        return {
            id: CommonMenuItems.REMOVE_FROM_TEAM_FAVORITES_ACTION,
            text: PresentationResources.RemoveFromTeamFavoritesTitle,
            title: PresentationResources.RemoveFromTeamFavoritesTooltipText,
            disabled: (disabled === null || disabled === undefined) ? false : disabled,
            groupName: "favorites"
        };
    }

    public static security() {
        return {
            id: CommonMenuItems.ITEM_SECURITY_ACTION,
            text: PresentationResources.ItemSecurityTitle,
            title: PresentationResources.ItemSecurityTooltipText,
            icon: "bowtie-icon bowtie-security ",
            groupName: "security"
        };
    }

    public static pinToHomePage(disabled?: boolean) {
        return {
            id: CommonMenuItems.PIN_TO_HOMEPAGE_ACTION,
            text: PresentationResources.PinToHomepageTitle,
            title: PresentationResources.PinToHomepageTooltipText,
            icon: "icon-pin",
            disabled: (disabled === null || disabled === undefined) ? false : disabled,
            groupName: "pinning"
        };
    }

    public static unpinFromHomePage(disabled?: boolean) {
        return {
            id: CommonMenuItems.UNPIN_FROM_HOMEPAGE_ACTION,
            text: PresentationResources.UnpinFromHomepageTitle,
            title: PresentationResources.UnpinFromHomepageTooltipText,
            icon: "icon-unpin",
            disabled: (disabled === null || disabled === undefined) ? false : disabled,
            groupName: "pinning"
        };
    }

    constructor() {
    }
}

export class IFrameControl extends Controls.BaseControl {

    public static CORE_CSS_CLASS = "iframe-control";

    constructor(options?) {
        Diag.Debug.assertParamIsString(options.contentUrl, "options.contentUrl");

        super(options);
    }

    public initialize() {
        var iframe = $("<iframe " + this._getSandboxAttributes() + ">")
            .attr("src", this._options.contentUrl);

        this.getElement().append(iframe);
    }

    private _getSandboxAttributes() {
        if (Utils_UI.BrowserCheckUtils.isFirefox()) {
            // UPDATE: TODO: I think we can remove this as this firefox bug has been resolved and closed but it requires testing.
            // Firefox doesn't support the allow-popups value yet so all of the links in this iframe wont open at all.  
            // There is a bug open against Firefox: https://bugzilla.mozilla.org/show_bug.cgi?id=766282
            // We should pull this out once the firefox bug is fixed.
            return "";
        } else {
            return "sandbox='allow-scripts allow-popups allow-same-origin '";
        }
    }
}

Controls.Enhancement.registerEnhancement(IFrameControl, "." + IFrameControl.CORE_CSS_CLASS);
