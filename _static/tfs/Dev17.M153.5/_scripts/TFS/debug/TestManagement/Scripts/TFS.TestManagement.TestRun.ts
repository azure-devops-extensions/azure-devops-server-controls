//Auto converted from TestManagement/Scripts/TFS.TestManagement.TestRun.debug.js

/// <reference types="jquery" />

import TfsCommon_Shortcuts = require("TfsCommon/Scripts/KeyboardShortcuts");
import TCMConstants = require("Presentation/Scripts/TFS/Generated/TFS.TestManagement.Constants");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import TFS_OM_Common = require("Presentation/Scripts/TFS/TFS.OM.Common");
import TFS_WebSettingsService = require("Presentation/Scripts/TFS/TFS.WebSettingsService");
import WITConstants = require("Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants");
import TFS_AgileCommon = require("Presentation/Scripts/TFS/FeatureRef/TFS.AgileCommon");
import AddToExistingBub_LAZY_LOAD = require("TestManagement/Scripts/TFS.TestManagement.AddToExistingBug");
import Resources = require("TestManagement/Scripts/Resources/TFS.Resources.TestManagement");
import SystemInfoCollectionHelper = require("TestManagement/Scripts/TFS.TestManagement.SystemInfoCollectionHelper");
import TestsOM = require("TestManagement/Scripts/TFS.TestManagement");
import TCMLicenseAndFeatureFlagUtils = require("TestManagement/Scripts/Utils/TFS.TestManagement.LicenseAndFeatureFlagUtils");
import TMUtils = require("TestManagement/Scripts/TFS.TestManagement.Utils");
import TCMTelemetry = require("TestManagement/Scripts/TFS.TestManagement.Telemetry");
import TcmService = require("TestManagement/Scripts/TFS.TestManagement.Service");

import Controls = require("VSS/Controls");
import StatusIndicator = require("VSS/Controls/StatusIndicator");
import Diag = require("VSS/Diag");
import Events_Action = require("VSS/Events/Action");
import Events_Handlers = require("VSS/Events/Handlers");
import Menus = require("VSS/Controls/Menus");
import { RichContentTooltip } from "VSS/Controls/PopupContent";
import Utils_Array = require("VSS/Utils/Array");
import Utils_Core = require("VSS/Utils/Core");
import Utils_Culture = require("VSS/Utils/Culture");
import Utils_Date = require("VSS/Utils/Date");
import Utils_Html = require("VSS/Utils/Html");
import Utils_String = require("VSS/Utils/String");
import Utils_UI = require("VSS/Utils/UI");
import VSS = require("VSS/VSS");
import VSS_Artifacts_Services = require("VSS/Artifacts/Services");
import Dialogs = require("VSS/Controls/Dialogs");
import WITControls = require("WorkItemTracking/Scripts/TFS.WorkItemTracking.Controls");
import BuildContracts = require("TFS/Build/Contracts");

import WITOM = require("WorkItemTracking/Scripts/TFS.WorkItemTracking");
import { Exceptions } from "WorkItemTracking/Scripts/OM/WorkItemConstants";
import { WorkItemManager } from "WorkItemTracking/Scripts/OM/WorkItemManager";
import WindowSelectorControl_LAZY_LOAD = require("TestManagement/Scripts/TFS.TestManagement.WindowSelectorControl");
import FileInputDialog_LAZY_LOAD = require("TestManagement/Scripts/TFS.TestManagement.FileInputDialog");
import { RegisteredLinkTypeNames } from "WorkItemTracking/Scripts/RegisteredLinkTypeNames";
import { DesktopTestRunHelper, DTRCloseEventHandler, DesktopTestRunConstants } from "TestManagement/Scripts/TFS.TestManagement.DesktopTestRunHelper";
let delegate = Utils_Core.delegate;
let domElem = Utils_UI.domElem;
let TfsContext = TFS_Host_TfsContext.TfsContext;
let HtmlNormalizer = Utils_Html.HtmlNormalizer;
let StringUtils = Utils_String;
let WITUtils = TMUtils.WorkItemUtils;
let ImgZoomUtil = TMUtils.ImageZoomUtil;
let DAUtils = TestsOM.DAUtils;
let TelemetryService = TCMTelemetry.TelemetryService;
let ExternalLink = WITOM.ExternalLink;
let LinkingUtilities = VSS_Artifacts_Services.LinkingUtilities;
let LicenseAndFeatureFlagUtils = TCMLicenseAndFeatureFlagUtils.LicenseAndFeatureFlagUtils;
let BrowserResourceStringHelper = TMUtils.BrowserResourceStringHelper;

const verifyBugInfo = "verifyBugInfo";
const teamId = "teamId";
const one = 1;

declare function unescape(s: string): string;

enum RecorderState {
    NotStarted,
    Starting,
    InProgress,
    Stopping,
    Completed,
    Cancelled,
    Error
}

enum RecorderStoppedReason {
    BugFiled,
    IterationMove,
    SaveAndClose,
    Stopped,
    None,
}

export class DataCollectorStoppingWithProgressMessage extends StatusIndicator.LongRunningOperation {
}


export class TestDataCollectorMessageDialog extends Dialogs.ModalDialogO<Dialogs.IModalDialogOptions> {
    private _content: JQuery;

    constructor(options?) {
        super(options);
    }

    public initializeOptions(options?: any) {
        /// <param name="options" type="any" />

        super.initializeOptions($.extend({
            resizable: true,
            title: Resources.XTMessageDialogHeader,
            okText: Resources.XTMessageDialogInstallText,
            cancelText: Resources.XTMessageDialogCancelText,
            width: 374,
        }, options));
    }

    public initialize() {
        super.initialize();
        this._decorate();
        super.updateOkButton(true);
    }

    public onOkClick() {
        window.open(BrowserResourceStringHelper.GetXtInstallPath(), "", "top=0,left=0,width=1000,height=800");
        this.setDialogResult(true);
        super.onOkClick();
        this.close();
        TelemetryService.publishEvents(TelemetryService.featureInstallXTExtension, {});
    }

    private _decorate() {
        let element = this._element;
        this._content = this.constructDialogContent();
        element.append(this._content);
    }

    private constructDialogContent(): JQuery {
        let $container = $(domElem("div", "test-data-collector-message-dialog"));
        $container.append($(domElem("div", "dialog-heading")).html(BrowserResourceStringHelper.GetResourceXTMessageDialogHeadingText()));
        $container.append(this._constructXtContentDom());
        // return container
        return $container;
    }

    private _constructXtContentDom(): JQuery {
        let $diaglogContent = $(domElem("div", "dialog-content"));
        $diaglogContent.append(this._constructXtContentInfoDOM());
        $diaglogContent.append(this._constructMoreInfoDOM());
        return $diaglogContent;
    }

    private _constructXtContentInfoDOM(): JQuery {
        let $diaglogContentInfo = $(domElem("div", "dialog-content-info"));
        let $diaglogContentInfoIcon = $(domElem("div", "dialog-content-info-icon"));
        $diaglogContentInfoIcon.addClass("bowtie-icon bowtie-status-info");
        let $diaglogContentInfoText = $(domElem("div", "dialog-content-info-text")).html(Utils_String.format(Resources.XTMessageDialogContextText, "dialog-content-info-link"));
        $diaglogContentInfoText.find(".dialog-content-info-link").click(function () {
            if ($(".dialog-content-more-info").is(":visible")) {
                $(this).text(Resources.XTMessageDialogViewMore);
                $(".dialog-content-more-info").hide();
            } else {
                $(this).text(Resources.XTMessageDialogViewLess);
                $(".dialog-content-more-info").show();
            }
        });
        $diaglogContentInfo.append($diaglogContentInfoIcon);
        $diaglogContentInfo.append($diaglogContentInfoText);
        return $diaglogContentInfo;
    }

    private _constructMoreInfoDOM(): JQuery {
        let $diaglogContentMoreInfo = $(domElem("div", "dialog-content-more-info"));
        let $diaglogContentMoreInfo1Icon = $(domElem("div", "dialog-content-more-info-1-icon")).html("&#9679;");
        let $diaglogContentMoreInfo1Text = $(domElem("div", "dialog-content-more-info-1-text")).html(Resources.XTMessageDialogIncongnitoText);
        let $diaglogContentMoreInfo2Icon = $(domElem("div", "dialog-content-more-info-2-icon")).html("&#9679;");
        let $diaglogContentMoreInfo2Text = $(domElem("div", "dialog-content-more-info-2-text")).html(BrowserResourceStringHelper.GetResourceXTMessageDialogExtensionDisabledText());
        if (Utils_UI.BrowserCheckUtils.isChrome()) {
            //Add Incognito message only if it is chrome browser
            $diaglogContentMoreInfo.append($diaglogContentMoreInfo1Icon);
            $diaglogContentMoreInfo.append($diaglogContentMoreInfo1Text);
        }
        $diaglogContentMoreInfo.append($diaglogContentMoreInfo2Icon);
        $diaglogContentMoreInfo.append($diaglogContentMoreInfo2Text);
        $diaglogContentMoreInfo.hide();
        return $diaglogContentMoreInfo;
    }
}

VSS.initClassPrototype(TestDataCollectorMessageDialog, {});

export interface IUpdateVerifyBugMessageDialogOptions extends Dialogs.IModalDialogOptions {
    isVerifyMode: boolean;
    verifyBugInfo: TestsOM.VerifyBugInfo;
    setVerifyBugWindowOpened: () => void;
    getVerifyBugWindowOpened: () => boolean;
    openWorkItem: (bugId: any) => void;
    tryCallHandlePageUnload: () => void;
}

// VerifyMode exit Dialog box

export class VerifyBugPromptDialog extends Dialogs.ModalDialogO<IUpdateVerifyBugMessageDialogOptions>{
    private _content: JQuery;

    constructor(options?) {
        super(options);
    }

    public initializeOptions(options?: any) {
        /// <param name="options" type="any" />

        super.initializeOptions($.extend({
            resizable: false,
            title: Resources.UpdateVerifyBugTitle,
            okText: Resources.UpdateVerifyBugConfirmationText,
            cancelText: Resources.UpdateVerifyBugCancelText,
            width: 500,
        }, options));
    }

    public initialize() {
        super.initialize();
        this._decorate();
        super.updateOkButton(true);
    }

    public onOkClick() {
        TelemetryService.publishEvents(TelemetryService.featureVerifyBugDialogBox_ClickedYes, {});

        this._options.setVerifyBugWindowOpened();
        this._options.openWorkItem(this._options.verifyBugInfo.id);
        this.setDialogResult(true);
        super.onOkClick();
        this.close();
    }

    public onCancelClick() {
        TelemetryService.publishEvents(TelemetryService.featureVerifyBugDialogBox_ClickedNo, {});

        this.close();
    }

    public onClose() {
        if (!this._options.getVerifyBugWindowOpened()) {
            this._options.tryCallHandlePageUnload();
            window.close();
        }
    }

    private _decorate() {
        let element = this._element;
        this._content = this._constructDialogContent();
        element.append(this._content);
    }

    private _constructDialogContent(): JQuery {
        let bugDetailsText = this._getBugDetailsText();
        let $container = $(domElem("div", "verify-bug-details-message-dialog"));
        let $subTitle = $(domElem("div", "dialog-subtitle")).html(Resources.UpdateVerifyBugSubTitle);
        let $bugDetails = $(domElem("div", "dialog-details")).html(bugDetailsText);
        RichContentTooltip.addIfOverflow(bugDetailsText, $bugDetails);
        $container.append($subTitle);
        $container.append($bugDetails);
        return $container;
    }

    private _getBugDetailsText() {
        let verifyBugIdVerifyBugTitle = Utils_String.format(Resources.UpdateVerifyBugDetails, this._options.verifyBugInfo.id, this._options.verifyBugInfo.title);
        return verifyBugIdVerifyBugTitle;
    }
}


export class XTRelaunchDialog extends Dialogs.ModalDialogO<Dialogs.IModalDialogOptions> {
    private _content: JQuery;
    constructor(options?) {
        super(options);
    }

    public initializeOptions(options?: any) {
        /// <param name="options" type="any" />

        super.initializeOptions($.extend({
            resizable: true,
            title: Resources.XTRelaunchDialogTitle,
            okText: Resources.XTRelaunchDialogOkText,
            cancelText: Resources.XTMessageDialogCancelText,
            width: 374,
        }, options));
    }

    public initialize() {
        super.initialize();
        this._decorate();
        super.updateOkButton(true);
    }

    public onOkClick() {
        this.setDialogResult(true);
        super.onOkClick();
        this.close();
        TelemetryService.publishEvents(TelemetryService.featureRelaunchWebRunner, {});
    }

    private _decorate() {
        let element = this._element;
        this._content = this.constructDialogContent();
        element.append(this._content);
    }

    private constructDialogContent(): JQuery {
        let $container = $(domElem("div", "relaunch-message-dialog"));
        let $diaglogContentInfoIcon = $(domElem("div", "info-icon"));
        $diaglogContentInfoIcon.addClass("bowtie-icon bowtie-status-info");
        let $reopenGuidance = $(domElem("div", "reopen-guidance")).text(Resources.XTRelaunchGuidance);
        let $relaunchGuidance = $(domElem("div", "relaunch-guidance")).text(Resources.XTRelaunchQuestion);
        $container.append($diaglogContentInfoIcon);
        $container.append($reopenGuidance);
        $container.append($relaunchGuidance);
        // return container
        return $container;
    }
}

VSS.initClassPrototype(XTRelaunchDialog, {});

export interface GuidanceDialogOptions extends Dialogs.IModalDialogOptions {
    guidanceText?: string;
}

export class GuidanceDialog extends Dialogs.ModalDialogO<GuidanceDialogOptions> {
    private _content: JQuery;
    constructor(options?) {
        super(options);
    }

    public initializeOptions(options?: any) {
        /// <param name="options" type="any" />

        super.initializeOptions($.extend({
            resizable: true,
            okText: Resources.OkText,
            cancelText: Resources.CancelText,
            width: 374,
        }, options));
    }

    public initialize() {
        super.initialize();
        this._decorate();
        super.updateOkButton(true);
    }

    public onOkClick() {
        this.setDialogResult(true);
        super.onOkClick();
        this.close();
    }

    private _decorate() {
        let element = this._element;
        this._content = this.constructDialogContent();
        element.append(this._content);
    }

    private constructDialogContent(): JQuery {
        let $container = $(domElem("div", "guidance-message-dialog"));
        let $diaglogContentInfoIcon = $(domElem("div", "info-icon"));
        $diaglogContentInfoIcon.addClass("bowtie-icon bowtie-status-info");
        let actionLogGuidanceText: string = this._options.guidanceText;
        let $guidanceText = $(domElem("div", "guidance-data")).text(actionLogGuidanceText);
        $container.append($diaglogContentInfoIcon);
        $container.append($guidanceText);
        return $container;
    }
}

VSS.initClassPrototype(GuidanceDialog, {});

export interface ITestRunnerAboutDialogOptions extends Dialogs.IModalDialogOptions {
    aboutText?: string;
    version?: string;
}

export class TestRunnerAboutConstants {
    public static showEULAFileCommand = "show-eula-file-v1";
    public static privacyLink = "https://go.microsoft.com/fwlink/?LinkID=824704";
}

export class TestRunnerAboutDialog extends Dialogs.ModalDialogO<ITestRunnerAboutDialogOptions> {
    private _content: JQuery;
    constructor(options?) {
        super(options);
    }

    public initializeOptions(options?: any) {
        super.initializeOptions($.extend({
            resizable: true,
            okText: Resources.OkText,
            buttons: [
                {
                    text: Resources.OkText,
                    click: function () {
                        $(this).dialog("close");
                    }
                }
            ]
        }, options));
    }

    public initialize() {
        super.initialize();
        this._decorate();
    }

    private _decorate() {
        let element = this._element;
        this._content = this.constructDialogContent();
        element.append(this._content);
    }

    private constructDialogContent(): JQuery {
        let $container = $(domElem("div", "testrunner-about-dialog"));
        let aboutText: string = this._options.aboutText;
        let $aboutText = $(domElem("div", "about-data")).text(aboutText);
        let versionText = "Version: " + DesktopTestRunHelper.getTestRunnerVersion();
        let $versionTextDiv = $(domElem("div", "version-data")).text(versionText);
        let ownerText = "Owner: Microsoft Corporation";
        let $ownerTextDiv = $(domElem("div", "owner-data")).text(ownerText);

        let $eulaTag = $(domElem("div", "anchor-tag")).append(
                    $("<a/>").text(Resources.EulaText)
                    .attr("href","#")
                    .attr("title", Resources.EulaText)
                    .attr("target", "_blank")
                    .attr("rel", "nofollow noopener noreferrer")
                    .on("click", (e) => {
                        e.preventDefault();
                        window.postMessage({
                            communicationProtocolVersion: DesktopTestRunConstants.communicationProtocolVersion,
                            type: TestRunnerAboutConstants.showEULAFileCommand
                        }, "*");
                    }));

        let $privacyTag = $(domElem("div", "anchor-tag")).append(
                $("<a/>").text(Resources.PrivacyText)
                .attr("title", Resources.PrivacyText)
                .attr("href", TestRunnerAboutConstants.privacyLink)
                .attr("target", "_blank")
                .attr("rel", "nofollow noopener noreferrer")
                );

        $container.append($aboutText);
        $container.append($versionTextDiv);
        $container.append($ownerTextDiv);
        $container.append($eulaTag);
        $container.append($privacyTag);

        return $container;
    }
}

VSS.initClassPrototype(TestRunnerAboutDialog, {});

export class VideoConstants {
    public static startVideoCommand = "xtPage-start-video-capture-v1";
    public static startVideoCommandResponse = "xtPage-start-video-capture-response-v1";
    public static captureVideoCommandCancelled = "xtPage-video-capture-cancelled-v1";
    public static captureVideoCommandStarted = "xtPage-video-capture-started-v1";
    public static captureVideoCommandErrored = "xtPage-video-capture-error-v1";
    public static captureVideoCommandCompleted = "xtPage-video-capture-completed-v1";
    public static stopVideoCommand = "xtPage-stop-video-capture-v1";
}

export class VideoDataCollection {
    public static timeout: number = 2000;  //in ms
    public static startVideo(videoCapturePayload: ICaptureVideoPayload, callBack: IResultCallback, errorCallBack: IErrorCallback) {
        let delayFunc = Utils_Core.delay(null, this.timeout, () => {
            window.removeEventListener("message", handleStartVideoCommandResponse);
            errorCallBack(Resources.WebXTExntesionInstallRequired);
        });

        function onResponse(): void {
            window.removeEventListener("message", handleStartVideoCommandResponse);
            if (delayFunc) {
                delayFunc.cancel();
            }
        }

        function handleStartVideoCommandResponse(event: any) {
            if (event.data.type && event.data.type === VideoConstants.startVideoCommandResponse) {
                onResponse();
                callBack(event.data.data);
            }
        }

        window.addEventListener("message", handleStartVideoCommandResponse);

        window.postMessage({
            communicationProtocolVersion: DesktopTestRunConstants.communicationProtocolVersion,
            type: VideoConstants.startVideoCommand,
            videoCapturePayload: videoCapturePayload
        }, "*");
    }

    public static listenForVideoStartingEvent(callBack: IResultCallback, errorCallBack: IErrorCallback) {
        function onVideoCompleteResponse(): void {
            window.removeEventListener("message", handleVideoStartingEvent);
        }

        function handleVideoStartingEvent(event: any) {
            if (event.data.type && event.data.type === VideoConstants.captureVideoCommandStarted) {
                onVideoCompleteResponse();
                callBack(event.data.data);
            } else if (event.data.type && event.data.type === VideoConstants.captureVideoCommandCancelled) {
                onVideoCompleteResponse();
                errorCallBack(null);
            } else if (event.data.type && event.data.type === VideoConstants.captureVideoCommandErrored) {
                onVideoCompleteResponse();
                errorCallBack(event.data.data);
            }
        }

        window.addEventListener("message", handleVideoStartingEvent);
    }

    public static listenForVideoCompleteEvent(callBack: IResultCallback, errorCallBack: IErrorCallback) {
        function onVideoCompleteResponse(): void {
            window.removeEventListener("message", handleVideoCompletedEvent);
        }

        function handleVideoCompletedEvent(event: any) {

            if (event.data.type && event.data.type === VideoConstants.captureVideoCommandCompleted) {
                onVideoCompleteResponse();
                callBack(event.data.data);
            } else if (event.data.type && event.data.type === VideoConstants.captureVideoCommandErrored) {
                onVideoCompleteResponse();
                errorCallBack(event.data.data);
            }
        }

        window.addEventListener("message", handleVideoCompletedEvent);
    }

    public static stopVideo() {
        window.postMessage({
            communicationProtocolVersion: DesktopTestRunConstants.communicationProtocolVersion,
            type: VideoConstants.stopVideoCommand
        }, "*");
    }
}

export class ActionLogConstants {
    public static captureCommand = "xtPage-start-capture-action-v1";
    public static captureCommandCompleted = "xtPage-start-capture-action-response-v1";
    public static stopActionLogCommand = "xtPage-stop-capture-action-v1";
    public static generateActionLogCommand = "xtPage-generate-inprogress-action-v1";
    public static actionLogCompleted = "xtPage-capture-action-upload-completed-v1";
    public static actionLogError = "xtPage-capture-action-error-v1";
    public static actionLogContainerCreated = "xtPage-capture-action-container-created-v1";
}

export class ActionLogDataCollection {

    public static startActionLog(capturePayload: IStartCaptureActionLogPayload, callBack: IResultCallback, errorCallBack: IErrorCallback) {
        window.postMessage({
            communicationProtocolVersion: DesktopTestRunConstants.communicationProtocolVersion,
            type: ActionLogConstants.captureCommand,
            startActionLogPayload: capturePayload
        }, "*");

        function onResponse(): void {
            window.removeEventListener("message", handleCaptureActionLogResponse);
        }

        function handleCaptureActionLogResponse(event: any) {
            if (event.data.type && event.data.type === ActionLogConstants.actionLogContainerCreated) {
                onResponse();
                callBack(event.data.data);
            } else if (event.data.type && event.data.type === ActionLogConstants.actionLogError) {
                onResponse();
                errorCallBack(event.data.data);
            }
        }

        window.addEventListener("message", handleCaptureActionLogResponse);
    }

    public static listenForActionLogContainerCreatedEvent(callBack: IResultCallback, errorCallBack: IErrorCallback) {

        function onActionLogContainerCompleteResponse(): void {
            window.removeEventListener("message", handleActionLogContainerCreatedEvent);
        }

        function handleActionLogContainerCreatedEvent(event: any) {
            if (event.data.type && event.data.type === ActionLogConstants.actionLogContainerCreated) {
                onActionLogContainerCompleteResponse();
                callBack(event.data.data);
            } else if (event.data.type && event.data.type === ActionLogConstants.actionLogError) {
                onActionLogContainerCompleteResponse();
                errorCallBack(event.data.data);
            }

        }

        window.addEventListener("message", handleActionLogContainerCreatedEvent);
    }

    public static stopActionLog(payload?: IActionLogPayLoad, callBack?: IResultCallback, errorCallBack?: IErrorCallback) {
        window.postMessage({
            communicationProtocolVersion: DesktopTestRunConstants.communicationProtocolVersion,
            type: ActionLogConstants.stopActionLogCommand,
            actionLogPayload: payload
        }, "*");

        function onResponse(): void {
            window.removeEventListener("message", handleActionLogCompletedResponse);
        }

        function handleActionLogCompletedResponse(event: any) {
            if (event.data.type && event.data.type === ActionLogConstants.actionLogCompleted) {
                onResponse();
                callBack(event.data.data);
            } else if (event.data.type && event.data.type === ActionLogConstants.actionLogError) {
                onResponse();
                errorCallBack(event.data.data);
            }
        }

        if (callBack && errorCallBack) {
            window.addEventListener("message", handleActionLogCompletedResponse);
        }
    }

    public static generateActionLog(payload: IActionLogPayLoad, callBack?: IResultCallback, errorCallBack?: IErrorCallback) {
        window.postMessage({
            communicationProtocolVersion: DesktopTestRunConstants.communicationProtocolVersion,
            type: ActionLogConstants.generateActionLogCommand,
            actionLogPayload: payload
        }, "*");

        function onResponse(): void {
            window.removeEventListener("message", handleActionLogCompletedResponse);
        }

        function handleActionLogCompletedResponse(event: any) {
            if (event.data.type && event.data.type === ActionLogConstants.actionLogCompleted) {
                onResponse();
                if (callBack) {
                    callBack(event.data.data);
                }
            } else if (event.data.type && event.data.type === ActionLogConstants.actionLogError) {
                onResponse();
                if (errorCallBack) {
                    errorCallBack(event.data.data);
                }
            }
        }

        window.addEventListener("message", handleActionLogCompletedResponse);
    }
}

export class BaseRecordingControl extends Controls.BaseControl {

    constructor(options?) {
        super($.extend({
            coreCssClass: "testRun-recording-toolbar-control"
        }, options));
    }

    public initialize(): void {
        this._element.append(this._getRecordingStatusDOM());
        if (this._options.includeStopContainer) {
            this._element.append(this._getStopContainerDOM());
        }
        this._element.hide();
        super.initialize();
    }

    public onStarting(): void {
        let stopRecording: JQuery = $(".stop-recording-container", this._element);
        if (stopRecording && !stopRecording.hasClass("disabled")) {
            stopRecording.addClass("disabled");
        }
        this._element.show();
    }

    public onStart(): void {
        let stopRecording: JQuery = $(".stop-recording-container", this._element);
        if (stopRecording) {
            stopRecording.removeClass("disabled");
        }
    }

    public onEnd(): void {
        this._element.hide();
    }

    private _getStopContainerDOM(): JQuery {
        let $stopRecordingButton = $(domElem("button")).addClass("stop-recording-container disabled").text(" " + Resources.Stop).prepend($(domElem("span")).addClass("bowtie-icon bowtie-status-stop-outline"));
        $stopRecordingButton.attr("tabindex", "0");
        $stopRecordingButton.click(() => {
            this._onStopButtonClicked();
        });
        $stopRecordingButton.bind("keypress", (e: JQueryEventObject) => {
            if (e.keyCode === Utils_UI.KeyCode.ENTER) {
                return TMUtils.handleEnterKey(e, delegate(this, this._onStopButtonClicked));
            }
            else if (e.keyCode === Utils_UI.KeyCode.SPACE) {
                return TMUtils.handleSpaceKey(e, delegate(this, this._onStopButtonClicked));
            }
        });
        return $stopRecordingButton;
    }

    private _onStopButtonClicked() {
        if (!$(".stop-recording-container", this._element).hasClass("disabled")) {
            $(".stop-recording-container", this._element).addClass("disabled");
            if (this._options.onStopped) {
                this._options.onStopped();
            }
        }
    }

    private _getRecordingStatusDOM(): JQuery {
        let $recordingStatus = $(domElem("div")).html(this.getRecordingStatusGuidanceHtml());
        $recordingStatus.addClass("recording-info");
        return $recordingStatus;
    }

    public getRecordingStatusGuidanceHtml(): string {

        let guidanceText = Resources.Recording;
        if (this._options.recordingStatusGuidanceText) {
            guidanceText = this._options.recordingStatusGuidanceText;
        }

        return Utils_String.format("<span style='color:#3F9AD9'>{0}</span>", guidanceText);
    }
}

export class RecordingTimerControl extends BaseRecordingControl {
    private _maxRecordingDuration: number = 10 * 60;
    private _recordingTimer: any;

    constructor(options?) {
        super(options);
    }

    public initialize(): void {
        super.initialize();
    }

    public onStarting(): void {
        $(".recording-info .recording-timer", this._element).text(Utils_String.format("{0}{1}{2}{3}{4}", Resources.Zero, Resources.Zero, Resources.TimeSeparator, Resources.Zero, Resources.Zero));
        super.onStarting();
    }

    public onStart(): void {
        this._startTimer();
        super.onStart();
    }

    public stopTimer(): void {
        if (this._recordingTimer) {
            this._recordingTimer.cancel();
        }
    }

    public onEnd(): void {
        this.stopTimer();
        super.onEnd();
    }

    public getRecordingStatusGuidanceHtml(): string {
        let currentTime: string = Utils_String.format("{0}{1}{2}{3}{4}", Resources.Zero, Resources.Zero, Resources.TimeSeparator, Resources.Zero, Resources.Zero);
        let currentTimeGuidance = Utils_String.format("<span style='color:#3F9AD9'>{0}{1} </span> <span class='recording-timer'>{2}</span> {3} {4}", Resources.Recording, Resources.TimeSeparator, currentTime, Resources.Separator, Resources.VideoTimeout);
        return currentTimeGuidance;
    }

    private _startTimer(): void {
        let duration = this._maxRecordingDuration;
        let that = this;
        function startTimer(timer: number) {
            that._recordingTimer = Utils_Core.delay(null, 1000, function () {
                that._updateTime(timer);
                if (timer < duration) {
                    startTimer(++timer);
                }
            });
        }

        startTimer(0);
    }

    private _updateTime(timer: number): void {
        let timerElement = $(".recording-info .recording-timer", this._element);
        timerElement.text(this._getFormattedTime(timer));
    }

    private _getFormattedTime(timer: number): string {
        let minutes = this._getFormattedMinutes(timer);
        let seconds = this._getFormattedSeconds(timer);
        return Utils_String.format("{0}{1}{2}", minutes, Resources.TimeSeparator, seconds);
    }

    private _getFormattedMinutes(timer: number): string {
        let minutes = parseInt((timer / 60).toString(), 10);
        return minutes < 10 ? Resources.Zero + minutes : minutes.toString();
    }

    private _getFormattedSeconds(timer: number): string {
        let seconds = parseInt((timer % 60).toString(), 10);
        return seconds < 10 ? Resources.Zero + seconds : seconds.toString();
    }
}

export class ListView extends Controls.BaseControl {

    public static enhancementTypeName: string = "tfs.testManagement.listview";
    private prevSelectedIndex: number = -1;

    public _itemsContainer: any;
    public _dataSource: any;
    public _selectedIndex: number;
    private _selectionStart: number;
    private _selectedItemIndices: any;
    private _selectionCount: number;
    private _isFocusInside: boolean;
    public _popupMenu: Menus.Menu<any>;

    constructor(options?) {

        super(options);
    }

    public initialize() {

        this._itemsContainer = $(domElem("ul", "items")).attr("tabindex", 0);
        this._attachEvents();
        this._element.append(this._itemsContainer);

        this._selectionStart = -1;
        this._isFocusInside = false;
        this._selectionCount = 0;
        super.initialize();
    }

    public setSource(dataSource) {
        this._dataSource = dataSource || [];
        this.update();
    }

    public getSelectedItemIndices() {
        return this._selectedItemIndices;
    }

    public getSelectionCount() {
        return this._selectionCount;
    }

    public getHighestSelectedIndex() {
        let index, highestSelectedIndex: number = -1, num;

        for (index in this._selectedItemIndices) {
            if (this._selectedItemIndices.hasOwnProperty(index)) {
                num = parseInt(index, 10);
                if (num > highestSelectedIndex) {
                    highestSelectedIndex = num;
                }
            }
        }

        return highestSelectedIndex;
    }

    public update() {
        let count;
        count = this._dataSource.length;

        if (this._selectedIndex >= 0) {
            this._selectedIndex = Math.min(this._selectedIndex, count - 1);
        }

        this._drawItems();
    }

    public drawItemContent(index) {
        let $itemContent = $("<div></div>").text(this._dataSource[index]);
        return $itemContent;
    }

    public getAriaLabelledbyValue(index: number): string {
        return "";
    }

    public postDrawItemContent(index: number) {
    }

    public _onClick(e?): any {
        //li tags were not raising focus event in ie on clicking , so had to handle click event as  well
        let itemIndex = this._getClosestListItemIndex(e);

        if (itemIndex !== null) {
            this._selectItem(itemIndex, {
                ctrl: e.ctrlKey,
                shift: e.shiftKey,
                isItemFocussed: true
            });
        }
        return false;
    }

    public _selectItem(itemIndex: number, options?: any) {
        if (itemIndex < 0 || itemIndex >= this._dataSource.length) {
            return;
        }
        let ctrl = options && options.ctrl,
            shift = options && options.shift,
            isItemFocussed = options && options.isItemFocussed;

        this.prevSelectedIndex = this._selectedIndex;
        if (ctrl) {
            // If ctrl key is pressed, selecting or deselecting only the row at rowIndex
            this._addSelection(itemIndex, isItemFocussed);
        }
        else if (shift) {
            // If shift key is pressed, selecting the rows starting from selection start until the row at rowIndex
            this._clearSelection(false);
            this._addSelectionRange(this._selectionStart, itemIndex);
        }
        else {

            // Just selecting the single row at rowIndex
            this._clearSelection(false);
            this._addSelection(itemIndex, isItemFocussed);
        }
        if (this.getSelectionCount() === 1 && this.prevSelectedIndex === itemIndex) {
            // Already selected Index
            return;
        }
        this.onSelectionChanged(itemIndex, this.prevSelectedIndex);
    }

    public getPinAndFocusElementForContextMenu($focusedItem: JQuery): { pinElement: JQuery; focusElement: JQuery; } {
        return { pinElement: null, focusElement: null };
    }

    private _attachEvents() {
        this._bind(this._itemsContainer, "keydown", delegate(this, this._onKeyDown));
        this._bind(this._itemsContainer, "focusout", delegate(this, this._onFocusout));
        this._bind(this._itemsContainer, "focusin", delegate(this, this._onFocusIn));
        if (this._options.contextMenu) {
            this._bind("contextmenu", delegate(this, this._onContextMenu));
        }
    }

    private _onContextMenu(e?: JQueryEventObject): any {
        /// <param name="e" type="JQueryEvent" optional="true"/>
        /// <returns type="any" />
        let commentArea: JQuery,
            itemIndex: number,
            focusedRow: JQuery;
        commentArea = $(e.target).closest(".step-comment-textarea");
        if (commentArea.length === 0) {
            focusedRow = $(e.target).closest("li");
            itemIndex = this._getClosestListItemIndex(e);
            if (itemIndex && !(itemIndex.toString() in this._selectedItemIndices)) {
                this._selectItem(itemIndex, { ctrl: e.ctrlKey, shift: e.shiftKey, isItemFocussed: true });
            }
            if (focusedRow.length > 0) {
                this._showContextMenu(focusedRow);
                return false;
            }
        }

    }

    private _clearSelection(updateStyles?: boolean) {
        this._selectedItemIndices = null;
        this._selectedIndex = -1;
        this._selectionCount = 0;
        if (updateStyles) {
            this._updateSelectionStyles();
        }
    }

    private _addSelection(itemIndex: number, isItemFocussed?: boolean) {
        /// <param name="options" type="object" optional="true">Specifies options such as:
        ///     - toggle: Toggles the row in the selection

        let add,
            toggle = true;

        if (!this._selectedItemIndices) {
            this._selectedItemIndices = {};
        }

        if (itemIndex >= 0) {
            add = true;

            if (toggle && itemIndex.toString() in this._selectedItemIndices) {
                // If the row already exists in the selection and toggle is enabled
                // removing it from the selection
                add = false;
                if (this._selectionCount > 0) {
                    this._selectionCount--;
                }
                delete this._selectedItemIndices[itemIndex];
            }

            if (add) {
                this._selectedItemIndices[itemIndex] = itemIndex;
                this._selectionStart = itemIndex;
                this._selectedIndex = itemIndex;
                this._selectionCount++;
            }
        }
        else {
            this._selectedIndex = -1;
        }

        this._updateSelectionStyles(isItemFocussed);
    }

    private _updateSelectionStyles(isItemFocussed?: boolean) {

        let selectedItemIndices = this._selectedItemIndices,
            $item,
            i: number,
            itemIndex,
            focusIndex = this._selectedIndex;

        for (i = 0; i < this._dataSource.length; i++) {
            $item = this.getItemAtIndex(i);
            //this is for disbaling the shift cick text selection and is differntly handled for firefox because
            //firefox does not support selecstrt event, for detailed behaviour see "selectart" event handler comment
            $item.addClass("mozilla-text-selection-blocker");
            if (selectedItemIndices && selectedItemIndices.hasOwnProperty(i.toString())) {
                $item.addClass("grid-row-selected");
                if (i === focusIndex) {
                    $item.addClass("grid-row-current");
                    if (this._selectionCount === 1) {
                        $item.removeClass("mozilla-text-selection-blocker");
                    }
                }
            }
            else {
                $item.removeClass("grid-row-selected-blur");
                $item.removeClass("grid-row-selected");
                $item.removeClass("grid-row-current");
            }
        }
        if (!isItemFocussed) {
            this._focusSelectedIndex();
        }
    }

    private _addSelectionRange(startIndex: number, endIndex: number) {

        let start: number = Math.min(startIndex, endIndex),
            end: number = Math.max(startIndex, endIndex),
            i: number;

        if (!this._selectedItemIndices) {
            this._selectedItemIndices = {};
        }
        for (i = start; i <= end; i++) {
            this._selectedItemIndices[i] = i;
            this._selectionCount++;
        }

        // Setting selected index to index of last selected row
        this._selectedIndex = endIndex;

        this._updateSelectionStyles();
    }

    public _onListItemfocussed(e?) {

        let itemIndex = this._getClosestListItemIndex(e),
            $item = this.getItemAtIndex(itemIndex);
        //this part is specifically for  selectionthrough tab to work
        if ($item && !$item.data("mouseDown")) {
            if (!this._selectedItemIndices.hasOwnProperty(itemIndex)) {
                this._selectItem(itemIndex);
            }
        }
    }

    public onSelectionChanged(newIndex: number, prevIndex: number) {

    }

    public getItemAtIndex(index: number): JQuery {
        return this._itemsContainer.children().eq(index);
    }

    public _onFocusout(e?) {
        let itemIndex = this._getClosestListItemIndex(e),
            index,
            $item;

        this._isFocusInside = false;

        this.delayExecute("updateSelectionStyles", 50, true, () => {
            if (!this._isFocusInside) {
                for (index in this._selectedItemIndices) {
                    if (this._selectedItemIndices.hasOwnProperty(index)) {
                        $item = this.getItemAtIndex(index);
                        if ($item) {
                            $item.addClass("grid-row-selected-blur");
                            $item.removeClass("grid-row-selected");
                        }
                    }
                }
            }
        });
    }

    public _onFocusIn(e?: JQueryEventObject) {
        this._isFocusInside = true;
    }

    public _onKeyDown(e?: JQueryEventObject): any {
        /// <param name="e" type="JQueryEvent" />
        /// <returns type="any" />

        let keyCode = Utils_UI.KeyCode,
            lastIndex = this._dataSource.length - 1;

        if (e.keyCode === keyCode.DOWN) {
            if (e.ctrlKey) {
                this._selectItem(lastIndex);
            }
            else {
                this._selectItem(this._selectedIndex + 1, {
                    shift: e.shiftKey,
                });
            }

            return false;
        }
        else if (e.keyCode === keyCode.UP) {
            if (e.ctrlKey) {
                this._selectItem(0);
            }
            else {
                this._selectItem(this._selectedIndex - 1, {
                    shift: e.shiftKey,
                });
            }

            return false;
        }
        else if (e.keyCode === keyCode.HOME) {
            this._selectItem(0);
        }
        else if (e.keyCode === keyCode.END) {
            this._selectItem(this._dataSource.length - 1);
        }
        else if (e.keyCode === 65 && e.ctrlKey) {
            //ctrl A pressed
            this._selectionStart = 0;
            this._selectItem(this._dataSource.length - 1, {
                shift: e.ctrlKey
            });
            return false;
        }
    }

    public selectNext(index?: number): boolean {
        ///<param name="page" type="boolean" optional="true" />
        ///<returns type="boolean" />
        if (index) {
            this.setSelectedIndex(index);
        }
        let selectedIndex = this._selectedIndex < this._dataSource.length - 1 ?
            this._selectedIndex + 1 :
            this._selectedIndex;
        this._selectItem(selectedIndex);
        return true;
    }

    public setAndFocusSelectedIndex(index: number, retryCount?: number, isInitialization?: boolean) {
        this._selectItem(index, { isItemFocussed: isInitialization });

        // Focus the selected element if not initialization.
        if (!isInitialization) {
            this._focusSelectedIndex(retryCount);
        }
    }

    public setSelectedIndex(selectedIndex) {
        if (this._selectedIndex !== selectedIndex &&
            selectedIndex >= 0 &&
            selectedIndex < this._dataSource.length) {

            this._selectedIndex = selectedIndex;
        }
    }

    public getSelectedIndex(): number {
        return this._selectedIndex;
    }

    public _showContextMenu($listItem: JQuery) {
        let item,
            pinElement: JQuery,
            pinAndFocusElement,
            focusElement: JQuery;

        if (this._popupMenu) {
            this._popupMenu.dispose();
            this._popupMenu = null;
        }

        this._popupMenu = <Menus.PopupMenu>Controls.BaseControl.createIn(Menus.PopupMenu, $listItem[0], $.extend(
            {
                align: "left-bottom"
            },
            {
                items: [{ childItems: this._getContextMenuItems() }],
                executeAction: delegate(this, this._onContextMenuItemClick)
            }));
        pinAndFocusElement = this.getPinAndFocusElementForContextMenu($listItem);
        pinElement = pinAndFocusElement.pinElement;
        focusElement = pinAndFocusElement.focusElement;
        // Displaying the popup
        // Grid set tries to set focus on container mouse down event with a timeout
        // This behavior causes our popup menu item to close immediately since it loses focus.
        // Lets popup our menu in another epoch
        Utils_Core.delay(this, 10, function () {
            this._popupMenu.popup(focusElement, pinElement);
        });
    }

    private _createItem(index: number) {

        let $itemContent = this.drawItemContent(index);
        return $(domElem("li", this._options.itemCss))
            .attr("tabindex", 0)
            .attr("aria-labelledby", this.getAriaLabelledbyValue(index))
            .append($itemContent);
    }

    private _postCreateItem(index: number) {
        this.postDrawItemContent(index);
    }

    public _drawItems() {
        let i,
            end = 0,
            createItem = this._createItem,
            item;

        this._itemsContainer.empty();
        if (this._dataSource && this._dataSource.length) {
            end = this._dataSource.length;
            for (i = 0; i < end; i++) {
                item = createItem.call(this, i);
                item.data("index", i);
                item.find("*").data("index", i);
                this._bindEvents(item);
                this._itemsContainer.append(item);
                this._postCreateItem(i);
            }
        }
    }

    public _getContextMenuItems() {
    }

    public _onContextMenuItemClick(e?: any) {
    }

    private _onMouseDown(e?) {
        let index = this._getClosestListItemIndex(e),
            $item = this.getItemAtIndex(index);
        if ($item) {
            $item.data("mouseDown", true);
        }
    }

    private _onMouseUp(e?) {
        let index = this._getClosestListItemIndex(e),
            $item = this.getItemAtIndex(index);
        if ($item) {
            $item.data("mouseDown", false);
        }
    }

    private _bindEvents(item) {
        this._bind(item, "focusin", delegate(this, this._onListItemfocussed));
        this._bind(item, "click", delegate(this, this._onClick));
        this._bind(item, "mousedown", delegate(this, this._onMouseDown));
        this._bind(item, "mouseup", delegate(this, this._onMouseUp));
        this._bind(item, "selectstart", delegate(this, this._onSelectionStart));
    }

    public _onSelectionStart(e) {
        //since IE on ctrl click and shift click selects text which is not looking good
        //we enable selection of text only when a single row is selected Bug 1159922	
        let index = this._getClosestListItemIndex(e),
            $item = this.getItemAtIndex(index);
        if (this._selectionCount === 1 && this._selectedIndex === index) {
            return true;
        }
        e.stopPropagation();
        e.preventDefault();
        return false;
    }

    public _getClosestListItemIndex(e?) {
        let $target = $(e.target), itemIndex = null, $li;
        $li = $target.closest(".items > li");
        if ($li.length) {
            itemIndex = $li.data("index");
        }
        return itemIndex;
    }

    private _focusSelectedIndex(retryCount?: number) {
        let $item = this._itemsContainer.children().eq(this._selectedIndex);
        if (this._selectedIndex >= 0 && this._selectedIndex < this._dataSource.length && $item && !$item.is(":focus")) {
            if (retryCount) {
                Utils_UI.tryFocus($item, retryCount);
            }
            else {
                Utils_UI.tryFocus($item);
            }
        }
    }
}

VSS.initClassPrototype(ListView, {
    _itemsContainer: null,
    _dataSource: null,
    _selectedIndex: -1,
    _popupMenu: null
});

/* This comment size should be in sync with server side actionResult table column size. */
const MAX_ERROR_COMMENT_SIZE = 512;
export class TestStepsList extends ListView {

    private _setStepResultOutComeEvent: (actionResult: TestsOM.TestActionResult, outcome: TCMConstants.TestOutcome) => any;
    private _setStepCommentEvent: (actionResult: TestsOM.TestActionResult, stepComment: string) => any;
    private _setStepResultAttachmentEvent: (actionResult: TestsOM.TestActionResult, attachments) => string;
    private _getActiveIterationResultEvent: () => TestsOM.TestIterationResult;
    private _commentClassSelector: string;
    private _stepActionClassSelector: string;
    private _stepExpectedResultClassSelector: string;
    private _stepActionParametersClassSelector: string;
    private _stepExpectedResultParametersClassSelector: string;
    private _expectedResultHeaderSelector: string;
    private _inlineEditToolbarSelector: string;
    private _editErrorSelector: string;
    private _stepParameterValueClassSelector: string;
    private _stepParameterNameClassSelector: string;
    private _stepParameterValueInputClassSelector: string;
    private _toolbarItemsIds: any;
    private _commentManager: CommentBoxManager;
    private _isEditingEnabled: boolean;
    private _imageZoomUtil: TMUtils.ImageZoomUtil;
    private _attachmentsList: any[];
    private _lastFocusedParamElement: JQuery;
    private _commentHeaderId = "comment-header-id";
    private _passTestStepClass = "pass-test-step";
    private _failTestStepClass = "fail-test-step";

    public static TestStepMovedDirection = {
        UP: "UP",
        DOWN: "DOWN"
    };

    public selectionChanged: (newIndex: number) => void;
    public actionChanged: (actionId: number, parentActionId: number, newValue: string) => void;
    public expectedResultChanged: (actionId: number, parentActionId: number, newValue: string) => void;
    public paramValueChanged: (stepResults: TestsOM.TestStepResult[], paramName: string, paramValue: string) => void;
    public stepMoved: (stepResult: TestsOM.TestActionResult, direction: string) => void;
    public deleteStep: (actionId: number, parentActionId: number) => void;
    public insertStep: (actionId: number, parentActionId: number) => void;
    public IsParamDataReadOnly: () => boolean;

    constructor(options?) {

        super(options);
    }

    public initializeOptions(options?: any) {
        /// <param name="options" type="any" />

        super.initializeOptions($.extend({
            coreCssClass: "test-steps-list-view",
            contextMenu: true
        }, options));
    }

    public initialize() {
        super.initialize();
        this._commentManager = new CommentBoxManager(".step-comment-textarea", ".step-comment-container", -1, false);
        this._commentManager._fireCommentChangeEvent = (commentText) => {
            this._fireSetStepCommentEvent(commentText);
            this._repositionInlineEditError();
        };

        this._bind(this._itemsContainer, "keyup", delegate(this._commentManager, this._commentManager._onKeyUp));
        this._bind(this._itemsContainer, "paste", delegate(this._commentManager, this._commentManager._onPaste));

        if (LicenseAndFeatureFlagUtils.AreAdvancedTestManagementFeaturesEnabled()) {

            this._bind(this._itemsContainer, "dblclick", delegate(this, this._onDoubleClick));
            Diag.logVerbose("[TestStepsList: initialize] Advance feature enabled - dblclick event binding done.");
        } else {
            Diag.logVerbose("[TestStepsList: initialize] Advance feature disabled - dblclick event not binded.");
        }

        // initialize image zoom util
        this._attachmentsList = [];
        this._imageZoomUtil = new TMUtils.ImageZoomUtil($(".test-steps-list-view .items"), "div");
    }

    public blockInlineEditing() {
        this._isEditingEnabled = false;
    }

    public enableInlineEditing() {
        this._isEditingEnabled = true;
    }

    public _drawItems() {
        super._drawItems();
        this._element.css("padding-top", "0px");
    }

    public _onFocusout(e?) {
        /// <summary>Override the _onFocusout of ListView </summary>
        let $selectedItem,
            $commentText;

        super._onFocusout(e);
        if (this._commentManager._isTargetElementCommentTextArea(e)) {
            $selectedItem = this.getItemAtIndex(this._selectedIndex);
            $commentText = $selectedItem.find($(this._commentClassSelector));
            $commentText.addClass("step-comment-textarea-focusout");
            this._commentManager.resizeTextArea($commentText[0]);
            this._fireSetStepCommentEvent($commentText.val());
        }
    }

    public _onFocusIn(e?) {
        let stepIndex: number,
            $item: JQuery;
        if (this._commentManager._isTargetElementCommentTextArea(e)) {
            stepIndex = this._getClosestListItemIndex(e);
            $item = this.getItemAtIndex(stepIndex);
            $item.find($(this._commentClassSelector)).removeClass("step-comment-textarea-focusout");
            if (stepIndex >= 0) {
                this._selectItem(stepIndex, {
                    isItemFocussed: true
                });
            }
        }
    }

    public onSelectionChanged(newIndex: number, prevIndex: number) {
        let $item = this.getItemAtIndex(prevIndex),
            $newItem: JQuery,
            stepResult: TestsOM.TestStepResult;

        if (newIndex !== prevIndex) {
            this._makeNonEditable($item, prevIndex);
        }

        if (this.getSelectionCount() === 1) {
            $newItem = this.getItemAtIndex(newIndex);
            if ($newItem) {
                if (this.selectionChanged) {
                    this.selectionChanged(newIndex);
                }

                if (this._dataSource[newIndex] instanceof TestsOM.TestStepResult) {
                    stepResult = <TestsOM.TestStepResult>this._dataSource[newIndex];
                    if (stepResult.hasError()) {
                        this._showEditErrorDiv($newItem, stepResult.getError());
                        this._editStep($newItem, stepResult);
                    }
                }
            }
        }
    }

    public getItem(index: number): any {
        return this._dataSource[index];
    }

    public setSource(dataSource) {
        // need to re-initialize the attachment list array
        this._attachmentsList = [];
        super.setSource(dataSource);
    }

    public getPinAndFocusElementForContextMenu($focusedItem: JQuery): { pinElement: JQuery; focusElement: JQuery; } {
        return {
            pinElement: $focusedItem.find(".stepResults-index-column"), focusElement: $focusedItem
        };
    }

    private _makeNonEditable($row: JQuery, stepIndex: number) {
        let step = this._dataSource[stepIndex],
            $lines: JQuery,
            $paramValueSpan: JQuery;

        $row.removeClass("inline-edit-mode");

        if (step) {
            $row.find("a").attr("target", "_blank").attr("rel", "nofollow noopener noreferrer");
            $row.find(this._stepActionClassSelector + "," + this._stepExpectedResultClassSelector).removeClass("title-edit-div").attr("contentEditable", "false").unbind("drop keyup paste");
            if (step instanceof TestsOM.TestStepResult) {
                if ($(TestsOM.HtmlUtils.wrapInDiv(step.getExpectedResult())).text().trim() === "") {
                    $row.find(this._expectedResultHeaderSelector + "," + this._stepExpectedResultClassSelector).hide();
                }
            }
            if ($(TestsOM.HtmlUtils.wrapInDiv(step.getAction())).text().trim() === "") {
                $row.find(this._stepActionClassSelector).hide();
            }
            $row.find(this._stepParameterValueInputClassSelector).each(function () {
                $paramValueSpan = $("<span />").addClass("test-step-parameter-value")
                    .text($(this).val());
                $(this).replaceWith($paramValueSpan);
            });
            $row.find(this._inlineEditToolbarSelector).hide();
            $row.find(this._editErrorSelector).fadeOut(500);
            if (stepIndex === 0) {
                this._element.css("padding-top", "0px");
            }

            // Since new content is html, it is not needed to wrap in div. But validate for simple text.
            $lines = $row.find(this._stepActionClassSelector).find("p");
            TestsOM.HtmlUtils.replaceEmptyParagraphTagsWithNbsp($lines);

            $lines = $row.find(this._stepExpectedResultClassSelector).find("p");
            TestsOM.HtmlUtils.replaceEmptyParagraphTagsWithNbsp($lines);
        }
    }

    private getIndexColumnId(index: number): string {
        return "stepResults-index-column-id_" + index;
    }

    private getDetailColumnId(index: number): string {
        return "stepResults-detail-column-id_" + index;
    }

    public getAriaLabelledbyValue(index: number): string {
        return this.getIndexColumnId(index) + " " + this.getDetailColumnId(index);
    }

    public drawItemContent(index) {

        let indexColumnId = this.getIndexColumnId(index);

        let step = this._dataSource[index] || "",
            $indexColumn = $("<div class='stepResults-index-column'></div>"),
            $inlineEditColumn: JQuery,
            $containerDiv = $("<div class='stepResultTable'></div>"),
            $actionColumn,
            isSharedStep = step instanceof TestsOM.SharedStepResult;

        // Creating index column
        $indexColumn.text(step.indexString);
        $indexColumn.attr("id", indexColumnId);
        $containerDiv.append($indexColumn);

        $inlineEditColumn = this._createInlineEditColumn();
        $indexColumn.append($inlineEditColumn);

        $actionColumn = this._createStepDetailColumn(index, step, isSharedStep);

        //creating step data column
        $containerDiv.append($actionColumn);

        $containerDiv.append(this._createPassFailButtonsColumn(index, step));
        if (isSharedStep) {
            $actionColumn.css("font-weight", "bold");
        }

        this._bindDeleteAttachmentEventOnRedraw(step.attachments, $containerDiv, index);

        return $containerDiv;
    }

    public _getContextMenuItems(): any {
        let items: any[] = [],
            isMultipleSelection: boolean = this.getSelectionCount() > 1;
        if (!isMultipleSelection && LicenseAndFeatureFlagUtils.AreAdvancedTestManagementFeaturesEnabled()) {
            items.push({
                id: this._toolbarItemsIds.editStep,
                text: Resources.EditTestStepText,
                icon: "bowtie-icon bowtie-edit"
            });
        }
        items.push({
            id: this._toolbarItemsIds.passStep,
            text: Resources.PassStepResultText,
            icon: "bowtie-icon bowtie-status-success"
        });
        items.push({
            id: this._toolbarItemsIds.failStep,
            text: Resources.FailStepResultText,
            icon: "bowtie-icon bowtie-status-failure"
        });
        // not showing add comment option for shared step
        if (!isMultipleSelection && (this._dataSource[this.getSelectedIndex()] instanceof TestsOM.TestStepResult)) {
            items.push({
                id: this._toolbarItemsIds.addComment,
                text: Resources.AddCommentText,
                icon: "bowtie-icon bowtie-comment-add"
            });
            items.push({
                id: this._toolbarItemsIds.addAttachment,
                text: Resources.AddAttachmentDialogTitle,
                icon: "bowtie-icon bowtie-attach"
            });
        }
        return items;
    }

    public _onContextMenuItemClick(e?: any) {
        /// <summary>Handles the execution of the toolbar items</summary>
        /// <param name="e" type="Object">The execution event</param>
        let command = e.get_commandName();

        if (command === this._toolbarItemsIds.editStep) {
            this._handleEditAction();
        }
        else if (command === this._toolbarItemsIds.passStep) {
            this.updateStepOutcome(TCMConstants.TestOutcome.Passed);
        }
        else if (command === this._toolbarItemsIds.failStep) {
            this.updateStepOutcome(TCMConstants.TestOutcome.Failed);
        }
        else if (command === this._toolbarItemsIds.addComment) {
            this._handleCommentAction();
        }
        else if (command === this._toolbarItemsIds.addAttachment) {
            this._handleAttachmentAction();
        }
    }

    private _handleEditAction() {
        let stepIndex: number = this.getSelectedIndex(),
            $row: JQuery = this.getItemAtIndex(stepIndex),
            stepResult: TestsOM.TestActionResult;

        DAUtils.trackAction("EditStep", "/Execution");
        if (this._isEditingEnabled) {
            stepResult = this._dataSource[stepIndex];
            this._editStep($row, stepResult, false);
        }
    }

    private _handleCommentAction() {
        let selectedIndex: number = this.getSelectedIndex(),
            $step: JQuery;
        if (selectedIndex >= 0) {
            DAUtils.trackAction("AddTestStepComment", "/Execution");
            $step = this.getItemAtIndex(selectedIndex);
            this._commentManager._showAndFocusCommentSection($step);
        }
    }

    // opens up the Add Attachment form
    private _handleAttachmentAction() {
        let iterationResult: TestsOM.TestIterationResult = this._getActiveIterationResultEvent();
        if (iterationResult) {
            VSS.using(["TestManagement/Scripts/TFS.TestManagement.FileInputDialog"],
                (FileInputDialog: typeof FileInputDialog_LAZY_LOAD) => {
                    Dialogs.show(FileInputDialog.FileInputDialog, {
                        attachedEvent: delegate(this, this._onFileAttached),
                        title: Resources.AddAttachmentDialogTitle,
                        runId: iterationResult.id.testRunId,
                        resultId: iterationResult.id.testResultId,
                        iterationId: iterationResult.iterationId,
                        actionPath: this.getActionPath()
                    });
                });
        }
    }

    private _bindDeleteAttachmentEventOnRedraw(attachments, $containerDiv: JQuery, index: number) {
        let attachmentDivs = $containerDiv.find(".test-step-attachment");

        if (attachmentDivs && attachmentDivs.length > 0) {
            for (let i = 0; i < attachmentDivs.length; i++) {
                let divId = attachmentDivs[i].id;
                if (divId) {
                    let attachmentId = parseInt(divId);
                    let matchingAttachment = attachments.filter(function (a) {
                        return a.Id === attachmentId;
                    });

                    if (matchingAttachment && matchingAttachment.length > 0) {
                        let attachmentName = matchingAttachment[0].Name;

                        let $deleteIcon = $(attachmentDivs[i]).find(".bowtie-edit-delete");
                        let that = this;
                        if ($deleteIcon) {
                            $deleteIcon.on("click", { id: attachmentId, name: attachmentName, index: index }, function (event?) {
                                that._attachmentsList[index].deleteAttachmentEvent(event);
                            });
                        }
                    }
                }
            }
        }
    }

    private getActionPath(): string {
        let index = this.getSelectedIndex();
        let stepResult = this._dataSource[index];

        if (!stepResult) {
            return "";
        }

        let actionPath = TestsOM.ActionPathHelper.prepend(null, stepResult.actionId);
        if (stepResult.parentId) {
            actionPath = TestsOM.ActionPathHelper.prepend(actionPath, stepResult.parentId);
        }
        return actionPath;
    }

    // On Ok click in Add addatchment form, we create attachmen on the server for the action
    private _attachFileFormAction(callbackName: string): string {
        let iterationResult: TestsOM.TestIterationResult = this._getActiveIterationResultEvent();

        return TMUtils.getTestResultManager().getApiLocation("UploadAttachment", {
            callback: callbackName,
            testRunId: iterationResult.id.testRunId,
            testResultId: iterationResult.id.testResultId,
            iterationId: iterationResult.iterationId,
            actionPath: this.getActionPath()
        });
    }

    // After server side creation of test result attachment, we need to 
    // 1. Show it on UI
    // 2. Add it to the step result
    // 3. Mark test case as dirty
    private _onFileAttached(attachedFile: any) {
        if (!attachedFile) {
            return;
        }
        DAUtils.trackAction("AddAttachment", "/Execution");
        let index = this.getSelectedIndex();
        let stepResult = this._dataSource[index];

        this._addStepResultAttachment(attachedFile, index, stepResult.isSubStep);

        stepResult.attachments.push({
            Id: attachedFile.Id,
            Name: attachedFile.Name,
            Size: attachedFile.Size
        });

        this._setStepResultAttachmentEvent(stepResult, stepResult.attachments);

        TelemetryService.publishEvents(TelemetryService.featureAddTestResultAttachment, {});
    }

    // Add attachment in step result after adding container if needed
    private _addStepResultAttachment(attachedFile, index, isSubStep) {
        let $step: JQuery = this._itemsContainer.children().eq(index), $attachmentListContainer: JQuery;

        // If no attachment exist, we need to create the AttachmentList control
        if (!this._attachmentsList[index]) {
            let $attachmentsListContainerDiv: JQuery = $("<div class='attachment-list-container'></div>");

            this._attachmentsList[index] = Controls.BaseControl.createIn(AttachmentList, $attachmentsListContainerDiv, {
                attachments: [],
                imageZoomUtil: this._imageZoomUtil
            });

            // Define delete action for the attachment
            this._attachmentsList[index].deleteAttachmentEvent = (event: JQueryEventObject) => {
                if (event && event.data) {
                    this._deleteStepResultAttachment(event.data.id, event.data.name, event.data.index);
                }
            };

            if (isSubStep) {
                $step.find(".subStepResults-detail-column").append($attachmentsListContainerDiv);
            }
            else {
                $step.find(".stepResults-detail-column").append($attachmentsListContainerDiv);
            }
        }

        $attachmentListContainer = $step.find(".attachment-list-container");

        this._addStepResultAttachmentInUI(attachedFile, $attachmentListContainer, this._attachmentsList[index], index);
    }

    // Add attachment in step result UI
    private _addStepResultAttachmentInUI(attachedFile, $attachmentListContainer: JQuery, attachmentsList: AttachmentList, index: number) {

        let params = {
            attachmentId: attachedFile.Id
        };
        let url: string = TMUtils.getTestResultManager().getApiLocation("DownloadAttachment", params);
        let attachmentSizeString: string = Utils_String.format(Resources.TestStepAttachmentSizeFormat, Math.ceil(attachedFile.Size / 1024));

        attachmentsList.appendAttachment(attachedFile.Id, attachedFile.Name, attachmentSizeString, url, $attachmentListContainer, index);
    }

    // Deletion of added step result attachment
    private _deleteStepResultAttachment(attachmentId: number, attachmentName: string, index: number) {
        let stepResult = this._dataSource[index];
        let $step: JQuery = this._itemsContainer.children().eq(index), $attachmentListContainer: JQuery = $step.find(".attachment-list-container");

        if (confirm(Utils_String.format(Resources.ConfirmAttachmentDeletion, attachmentName))) {
            this._deleteAttachmentFromServer(attachmentId, () => {

                this._attachmentsList[index].removeAttachment(attachmentId, attachmentName, $attachmentListContainer);
                stepResult.attachments = stepResult.attachments
                    .filter(function (a) {
                        return a.Id !== attachmentId;
                    });
                this._setStepResultAttachmentEvent(stepResult, stepResult.attachments);
            },
                (error) => {
                    alert(VSS.getErrorMessage(error));
                });
        }
    }

    // Deletion of added step result attachment from the service
    private _deleteAttachmentFromServer(attachmentId: number, successCallback?: IResultCallback, errorCallback?: IErrorCallback): void {
        let iterationResult: TestsOM.TestIterationResult = this._getActiveIterationResultEvent();
        TMUtils.getTestResultManager().deleteAttachment(attachmentId, iterationResult.id.testRunId, iterationResult.id.testResultId, successCallback, errorCallback);
    }

    public postDrawItemContent(index: number) {
        if (this._attachmentsList[index] !== null) {
            this._attachmentsList[index].postInitialize();
        }
    }

    private _createStepDetailColumn(index, step, isSharedStep) {
        /// <summary>Creates the Action column for the test step</summary>
        /// <param name="data" type="Object">The Action string</param>
        let $column: JQuery,
            title = isSharedStep ? StringUtils.htmlEncode(step.getAction()) : HtmlNormalizer.normalize(step.getAction()),
            expectedResult = isSharedStep ? "" : HtmlNormalizer.normalize(step.getExpectedResult()),
            $commentContainerDiv = $("<div class='step-comment-container'></div>"),
            $attachmentsListContainerDiv = $("<div class='attachment-list-container'></div>"),
            data,
            paramName,
            $expectedHeaderDiv = $("<div class='expectedResult-header'>" + Resources.ExpectedResultHeadingString + "</div>"),
            $expectedResultDiv: JQuery,
            $actionDiv,
            attachmentList: AttachmentList = null,
            $expectedHeaderDivId = "expected-header-div-id";

        let detailColumnId = this.getDetailColumnId(index);

        if (step.isSubStep) {
            $column = $("<div class='subStepResults-detail-column'></div>");
        }
        else {
            $column = $("<div class='stepResults-detail-column'></div>");
        }
        $column.attr("id", detailColumnId);

        title = title ? HtmlNormalizer.normalize(title) : "";
        if (!step.isFormatted() && !isSharedStep) {
            title = TestsOM.HtmlUtils.replaceNewLineWithBr(title);
            expectedResult = TestsOM.HtmlUtils.replaceNewLineWithBr(expectedResult);
        }

        $expectedHeaderDiv.attr("id", $expectedHeaderDivId);
        $actionDiv = $("<div class='stepResults-action'>" + title + "</div>");
        $expectedResultDiv = $("<div class='stepResults-expectedResult'>" + expectedResult + "</div>");
        $expectedResultDiv.attr("aria-labelledby", $expectedHeaderDivId);
        if ($actionDiv.text().trim() === "") {
            $actionDiv.hide();
        }
        data = $actionDiv[0].outerHTML;

        //parameters for step title
        if (step.actionParameters) {
            data = data.concat(this._createParametersDiv("stepResults-actionParameters", step.actionParameters));
        }

        if (!isSharedStep) {
            if ($expectedResultDiv.text().trim() === "") {
                $expectedHeaderDiv.hide();
                $expectedResultDiv.hide();
            }

            data = data.concat($expectedHeaderDiv[0].outerHTML);
            data = data.concat($expectedResultDiv[0].outerHTML);
        }

        //parameters for step expected result
        if (step.expectedResultParameters) {
            data = data.concat(this._createParametersDiv("stepResults-expectedResultParameters", step.expectedResultParameters));
        }

        // Create the comment section which is not visible by default
        // disabling comment section for sharedstep
        if (!isSharedStep) {
            let commentHeaderDiv = $("<div class='comment-header'>" + Resources.TestRunStepCommentHeadingString + "</div>");
            commentHeaderDiv.attr("id", this._commentHeaderId);
            $commentContainerDiv.append(commentHeaderDiv);
            this._commentManager.createCommentTextArea($commentContainerDiv, "step-comment-textarea", step.errorMessage, this._commentHeaderId, null, MAX_ERROR_COMMENT_SIZE);
            if (!step.errorMessage) {
                $commentContainerDiv.hide();
            }

            data = data.concat($commentContainerDiv[0].outerHTML);
        }

        let stepResultAttachments = step.attachments;

        if ((!isSharedStep && step.getAttachments() && step.getAttachments().length > 0) || (stepResultAttachments && stepResultAttachments.length > 0)) {

            let stepAttachments = step.getAttachments() || [];

            attachmentList = <AttachmentList>Controls.BaseControl.createIn(AttachmentList, $attachmentsListContainerDiv, {
                attachments: stepAttachments,
                imageZoomUtil: this._imageZoomUtil
            });

            attachmentList.deleteAttachmentEvent = (event: JQueryEventObject) => {
                if (event && event.data) {
                    this._deleteStepResultAttachment(event.data.id, event.data.name, event.data.index);
                }
            };

            if (stepResultAttachments && stepResultAttachments.length > 0) {
                for (let i = 0, length = stepResultAttachments.length; i < length; i++) {
                    this._addStepResultAttachmentInUI(stepResultAttachments[i], $attachmentsListContainerDiv, attachmentList, index);
                }
            }

            data = data.concat($attachmentsListContainerDiv[0].outerHTML);
        }

        this._attachmentsList[index] = attachmentList;

        $column = this._fixCommentIfNeeded($column.html(data), ".step-comment-textarea", step.errorMessage);
        return $column;
    }

    private _fixCommentIfNeeded($container: JQuery, commentClassName: string, expectedValue: string): JQuery {
        let $commentTextArea = $container.find(commentClassName);
        if ($commentTextArea && expectedValue && expectedValue !== $commentTextArea.val()) {
            // Handle the IE11 bug due to which the outerHTML of a serialized text area does not contain the underlying text.
            $commentTextArea.val(expectedValue);
        }

        return $container;
    }

    private _createInlineEditColumn() {
        let items: any[] = [],
            $column = $("<div class='stepResults-inlineedit-column'></div>");

        if (LicenseAndFeatureFlagUtils.AreAdvancedTestManagementFeaturesEnabled()) {
            items.push(this._getEditStepToolbarItem());
        }

        <Menus.MenuBar>Controls.BaseControl.createIn(Menus.MenuBar, $column, {
            items: items,
            executeAction: delegate(this, this._handleInlineEditCommand)
        });
        return $column;
    }

    private _getEditStepToolbarItem(): any {
        return {
            id: this._toolbarItemsIds.editStep,
            title: Resources.EditTestStepText,
            cssClass: "edit-test-step",
            showText: false,
            icon: "bowtie-icon bowtie-edit"
        };
    }

    private _handleInlineEditCommand(e?: any) {
        let inlineEditButton = e._commandSource._element[0],
            stepIndex = this._getClosestListItemIndex($.extend({}, { target: inlineEditButton })),
            stepResult: TestsOM.TestActionResult;

        if (this._isEditingEnabled) {
            stepResult = this._dataSource[stepIndex];
            this.showStepResultInEditMode(stepResult, true);
        }
        else {
            this.setAndFocusSelectedIndex(stepIndex, 10);
            this._showBlockedEditingErrorForStep(stepIndex);
        }
    }

    private _createParametersDiv(className: string, parameters: any) {
        let $div,
            paramName,
            index = 0;

        $div = $(Utils_String.format("<div class = '{0}' />", className));
        for (paramName in parameters) {
            if (parameters.hasOwnProperty(paramName)) {
                if (index !== 0) {
                    $div.append("<br>");
                }
                $div = $div.append(Utils_String.format("<span class = 'test-step-parameter'><span class = 'test-step-parameter-name'><b>{0}</b></span> = <span class = 'test-step-parameter-value'>{1}</span></span>", StringUtils.htmlEncode(paramName), StringUtils.htmlEncode(parameters[paramName])));
                index++;
            }
        }

        return $div.prop("outerHTML");
    }

    private _createPassFailButtonsColumn(stepIndex: any, actionResult: TestsOM.TestActionResult) {
        /// <summary>Creates the column containing pass/fail buttons for the test step</summary>
        /// <param name="stepIndex" type="Object">The index for the step based on the data source of the table</param>
        /// <param name="stepIndex" type="Object">The value of outcome present in the test step result</param>
        let $column = $("<div class='stepResults-buttons-column'></div>"),
            $toolBarItems,
            outcome = actionResult.outcome;

        <Menus.MenuBar>Controls.BaseControl.createIn(Menus.MenuBar, $column, {
            items: this._createToolbarItems(actionResult),
            executeAction: delegate(this, this._onToolbarButtonClick)
        });

        // Update the class names for the buttons as they will be needed for updating the styles on setting of the outCome for the stepResults
        $toolBarItems = $column.find(".menu-item");
        $toolBarItems.eq(0).addClass(this._passTestStepClass);
        $toolBarItems.eq(1).addClass(this._failTestStepClass);

        $toolBarItems.eq(0).attr("aria-checked", "false").attr("role", "menuitemradio");
        $toolBarItems.eq(1).attr("aria-checked", "false").attr("role", "menuitemradio");
        // Update the toolbar Icons on hover
        $toolBarItems.find(".menu-item-icon").hover(this._onToolBarItemHoverIn, this._onToolBarItemHoverOut);
        // In case of refresh of the TestRunner window, there could be some stepResults already having some outcome set,
        // so update the style of the buttons based on the outcome.
        this._updateToolBarStyles(outcome, $column);
        return $column;
    }

    private _createToolbarItems(actionResult: TestsOM.TestActionResult): any {
        /// <summary>Creates the items list for the toolbar</summary>
        /// <returns type="Object">Items list for the toolbar</returns>
        let items = [],
            stepResult: TestsOM.TestStepResult;
        items.push({
            id: this._toolbarItemsIds.passStep,
            title: Utils_String.format(Resources.TooltipTitleShortcutFormat, Resources.PassStepResultText, Resources.PassStepResultShortcut),
            showText: false,
            icon: "icon bowtie-icon bowtie-status-success-outline"
        });
        items.push({
            id: this._toolbarItemsIds.failStep,
            title: Utils_String.format(Resources.TooltipTitleShortcutFormat, Resources.FailStepResultText, Resources.FailStepResultShortcut),
            showText: false,
            icon: "icon bowtie-icon bowtie-status-failure-outline"
        });

        return items;
    }

    private _updateToolBarStyles(outcome: TCMConstants.TestOutcome, $toolbar: any) {
        /// <summary>Update the style of the pass and fail button based on the outcome that is to be set</summary>
        /// <param name="outcome" type="TCMConstants.TestOutcome">Passed or Failed</param>
        /// <param name="$toolbar" type="Object">The toolbar containing the pass and fail buttons.</param>
        let $passButtonIcon = $toolbar.find(".pass-test-step > .menu-item-icon"),
            $failButtonIcon = $toolbar.find(".fail-test-step > .menu-item-icon");

        if ($passButtonIcon && $failButtonIcon) {
            if (outcome === TCMConstants.TestOutcome.Passed) {

                $passButtonIcon.removeClass("bowtie-status-success-outline").addClass("bowtie-status-success active");
                $failButtonIcon.removeClass("bowtie-status-failure active").addClass("bowtie-status-failure-outline");

                this._setAriaCheckedAttribute($toolbar.find("." + this._passTestStepClass), true);
                this._setAriaCheckedAttribute($toolbar.find("." + this._failTestStepClass), false);
            }

            else if (outcome === TCMConstants.TestOutcome.Failed) {
                $passButtonIcon.removeClass("bowtie-status-success active").addClass("bowtie-status-success-outline");
                $failButtonIcon.removeClass("bowtie-status-failure-outline").addClass("bowtie-status-failure active");

                this._setAriaCheckedAttribute($toolbar.find("." + this._passTestStepClass), false);
                this._setAriaCheckedAttribute($toolbar.find("." + this._failTestStepClass), true);
            }
        }
    }

    private _setAriaCheckedAttribute(element: JQuery, isChecked: boolean) {
        element.attr("aria-checked", isChecked.toString());
    }

    private _onToolBarItemHoverIn(e?: any) {
        /// <summary>changes the icons of test step results on hover in</summary>
        if ($(this).hasClass("bowtie-status-success-outline")) {
            $(this).removeClass("bowtie-status-success-outline").addClass("bowtie-status-success");
        }

        else if ($(this).hasClass("bowtie-status-failure-outline")) {
            $(this).removeClass("bowtie-status-failure-outline").addClass("bowtie-status-failure");
        }
    }

    private _onToolBarItemHoverOut(e?: any) {
        /// <summary>restores the changes to the icons of test step results on hover out</summary>
        if (!$(this).hasClass("active")) {
            if ($(this).hasClass("bowtie-status-success")) {
                $(this).removeClass("bowtie-status-success").addClass("bowtie-status-success-outline");
            }

            else if ($(this).hasClass("bowtie-status-failure")) {
                $(this).removeClass("bowtie-status-failure").addClass("bowtie-status-failure-outline");
            }
        }
    }

    private _onToolbarButtonClick(e?: any) {
        /// <summary>Handles the execution of the toolbar items</summary>
        /// <param name="e" type="Object">The execution event</param>
        let command = e.get_commandName(),
            $toolButton = e._commandSource._element,
            $row,
            selectedItemIndices = this.getSelectedItemIndices(),
            outCome,
            stepIndex;

        if ($toolButton && $.isFunction(this._setStepResultOutComeEvent)) {
            $row = $toolButton.closest("li");
            if ($row) {
                stepIndex = $row.data("index");
                if (!selectedItemIndices.hasOwnProperty(stepIndex)) {
                    // Select the step.
                    this._selectItem(stepIndex);
                }

                // Execute the specific Menu command
                if (command === this._toolbarItemsIds.passStep) {
                    outCome = TCMConstants.TestOutcome.Passed;
                }
                else if (command === this._toolbarItemsIds.failStep) {
                    outCome = TCMConstants.TestOutcome.Failed;
                }

                this.updateStepOutcome(outCome);
            }
        }
    }

    public showStepResultInEditMode(stepResult: TestsOM.TestActionResult, selectStep?: boolean) {
        if (stepResult) {
            let stepIndex: number = this._getStepIndexForStepResult(stepResult),
                stepElement: JQuery;

            if (stepIndex >= 0) {
                if (selectStep) {
                    this.setAndFocusSelectedIndex(stepIndex, 10);
                }
                stepElement = this.getItemAtIndex(stepIndex);
                this._editStep(stepElement, stepResult);
            }
        }
    }

    public showErrorDivForParameterizedSteps(stepResults: TestsOM.TestActionResult[]) {
        let stepResult: TestsOM.TestActionResult,
            stepIndex: number,
            isStepSelected: boolean,
            stepResultsCount: number = stepResults.length,
            $stepElement: JQuery,
            i: number = 0;

        for (i = 0; i < stepResultsCount; i++) {
            stepResult = stepResults[i];
            if (stepResult.hasActionError() || stepResult.hasExpectedResultError()) {

                stepIndex = this._getStepIndexForStepResult(stepResult);
                if (stepIndex >= 0) {
                    $stepElement = this.getItemAtIndex(stepIndex);
                    isStepSelected = stepIndex === this.getSelectedIndex() ? true : false;

                    if (stepResult.hasActionError()) {
                        this._showErrorHighlightForRow($stepElement, this._stepActionClassSelector);
                    }
                    if (stepResult.hasExpectedResultError()) {
                        this._showErrorHighlightForRow($stepElement, this._stepExpectedResultClassSelector);
                    }
                    if (isStepSelected) {
                        this._showEditErrorDiv($stepElement, stepResult.getError());
                    }
                }
            }
        }
    }

    public updateStepOutcome(outcome: TCMConstants.TestOutcome) {
        let index,
            stepResult,
            $step,
            highestSelectedIndex = this.getHighestSelectedIndex(),
            selectedItemIndices = this.getSelectedItemIndices(),
            iSelectionMultiple = this.getSelectionCount() > 1,
            $toolBarContainer;

        DAUtils.trackAction("UpdateStepOutcome", "/Execution", { outcome: outcome });

        for (index in selectedItemIndices) {
            if (selectedItemIndices.hasOwnProperty(index)) {

                stepResult = this._dataSource[index];
                $step = this.getItemAtIndex(index);
                $toolBarContainer = $step.find(".stepResults-buttons-column");

                this._setStepResultOutComeEvent(stepResult, outcome);
                if (highestSelectedIndex === selectedItemIndices[index] && outcome === TCMConstants.TestOutcome.Failed) {
                    if (!iSelectionMultiple) {
                        this._commentManager._showAndFocusCommentSection($step);
                    }
                }
                this._updateToolBarStyles(outcome, $toolBarContainer);
            }
        }
        TelemetryService.publishEvents(TelemetryService.featureMarkTestStepOutcome, {});
        if (outcome === TCMConstants.TestOutcome.Passed) {
            this.selectNextStep();
        }
    }

    private _editStep($row: JQuery, stepResult: TestsOM.TestActionResult, focusExpectedResult?: boolean) {
        let $focusableSection: JQuery, lines: JQuery,
            stepElementSelector: string;

        $row.addClass("inline-edit-mode");

        if (stepResult.canEditAction() || stepResult.hasActionError()) {
            this._makeEditable($row, stepResult, this._stepActionClassSelector, this.actionChanged);
        }

        if (stepResult.canEditExpectedResult() || stepResult.hasExpectedResultError()) {
            this._makeEditable($row, stepResult, this._stepExpectedResultClassSelector, this.expectedResultChanged);
        }

        if (stepResult instanceof TestsOM.TestStepResult) {
            if (!(this.IsParamDataReadOnly && this.IsParamDataReadOnly())) {
                this._makeParamValueEditable($row, stepResult, this._stepParameterValueClassSelector, this.paramValueChanged);
            }
        }

        $focusableSection = this._getEditableSectionElement($row, focusExpectedResult);

        if (!$focusableSection) {
            //In case no editable and focussable element is found, focus on the row itself. 
            $focusableSection = $row;
        }

        if ($focusableSection) {
            Utils_UI.tryFocus($focusableSection, 10);
            lines = $focusableSection.find("p");
            if (lines.length > 0 && lines[0].childNodes) {
                TMUtils.setCaretPosition(lines[0], lines[0].childNodes.length);
            }
        }

        this._createAndShowInlineEditToolbar($row, stepResult);

        TelemetryService.publishEvents(TelemetryService.featureEditTestStep, {});
    }

    private _getStepIndexForStepResult(stepResult: TestsOM.TestActionResult): number {
        let actionResult: TestsOM.TestActionResult,
            itemsCount: number = this._dataSource.length,
            i: number;

        for (i = 0; i < itemsCount; i++) {
            actionResult = this._dataSource[i];
            if (actionResult.actionId === stepResult.actionId && actionResult.parentId === stepResult.parentId) {
                return i;
            }
        }
        return -1;
    }

    private _showBlockedEditingError(e?: JQueryEventObject) {
        // e can be a mouse or key event on any item of the TestStepList
        let stepIndex: number;

        if (!this._commentManager._isTargetElementCommentTextArea(e)) {
            stepIndex = this._getClosestListItemIndex(e);
            this._showBlockedEditingErrorForStep(stepIndex);
        }
    }

    private _showBlockedEditingErrorForStep(stepIndex: number) {
        let $row: JQuery;
        if (stepIndex !== null && stepIndex !== undefined) {
            $row = this.getItemAtIndex(stepIndex);
        }
        if ($row) {
            this._showEditErrorDiv($row, Resources.BlockedEditingError);
        }
    }

    private _showEditErrorDiv($row: JQuery, errorString: string) {
        let stepIndex: number = $row.data("index"),
            inlineEditErrorDiv: JQuery = $row.find(this._editErrorSelector),
            inlineEditToolbar: JQuery,
            spaceFromTop: number;

        if (inlineEditErrorDiv.length === 0) {
            $row.append("<div class='inline-edit-error'>" + errorString + "</div>");
            inlineEditErrorDiv = $row.find(this._editErrorSelector);
        }

        if (stepIndex === 0 || stepIndex === 1) {
            inlineEditErrorDiv.css("top", $row.outerHeight(true));
        }
        else {
            inlineEditToolbar = $row.find(this._inlineEditToolbarSelector);
            spaceFromTop = inlineEditErrorDiv.outerHeight(true) + 1;
            if (inlineEditToolbar.length > 0) {
                spaceFromTop = spaceFromTop + Math.abs(parseInt(inlineEditToolbar.css("top"), 10));
            }
            inlineEditErrorDiv.css("top", (-spaceFromTop + "px"));
        }

        $row.find(this._editErrorSelector).fadeIn(500);
    }

    public showError($row: JQuery, sectionSelector: string, errorString: string) {
        this._showErrorHighlightForRow($row, sectionSelector);
        this._showEditErrorDiv($row, errorString);
    }

    private _showErrorHighlightForRow($row: JQuery, sectionSelector: string) {
        let $rowSection: JQuery = $row.find(sectionSelector);
        $rowSection.addClass("test-step-invalid");
    }

    public removeError($row: JQuery, sectionSelector: string) {
        let $actionSection: JQuery = $row.find(this._stepActionClassSelector),
            $expectedResultSection: JQuery = $row.find(this._stepExpectedResultClassSelector);

        $row.find(sectionSelector).removeClass("test-step-invalid");

        if (!$actionSection.hasClass("test-step-invalid") && !$expectedResultSection.hasClass("test-step-invalid")) {
            $row.find(this._editErrorSelector).fadeOut(500);
        }
    }

    private _createAndShowInlineEditToolbar($row: JQuery, stepResult: TestsOM.TestActionResult) {
        let menuBar: Menus.MenuBar,
            stepIndex: number = this._getClosestListItemIndex($.extend({}, { target: $row[0] })),
            areParametersPresent: boolean = stepResult.hasParameters();

        if ($row.find(this._inlineEditToolbarSelector).length === 0) {
            $row.find(".stepResults-buttons-column").before("<div class='inline-edit-toolbar'></div>");
            this._createInlineEditToolbar($row.find(this._inlineEditToolbarSelector), stepResult);
        }
        menuBar = <Menus.MenuBar>Controls.Enhancement.getInstance(Menus.MenuBar, $row.find(this._inlineEditToolbarSelector).children());
        if (menuBar) {
            this._updateInlineToolbarCommandStates(menuBar, stepResult);
        }

        if (stepIndex === 0) {
            this._element.css("padding-top", "28px");
        }
        // We want to show the error only on double click of shared step having parameters. On double click of non-shared step having we dont want to show an error.
        if ((stepResult instanceof TestsOM.SharedStepResult) && areParametersPresent) {
            this._showEditErrorDiv($row, stepResult.getError());
        }
        $row.find(this._inlineEditToolbarSelector).show();
    }

    private _updateInlineToolbarCommandStates(menuBar: Menus.MenuBar, stepResult: TestsOM.TestActionResult) {
        menuBar.updateCommandStates(
            [
                {
                    id: TestsOM.InlineEditCommands.moveStepDown,
                    disabled: !this._canMoveStepDown(stepResult)
                },
                {
                    id: TestsOM.InlineEditCommands.moveStepUp,
                    disabled: !this._canMoveStepUp(stepResult)
                },
                {
                    id: TestsOM.InlineEditCommands.deleteStep,
                    disabled: !this._canDeleteStep(stepResult)
                }
            ]);
    }

    private _createInlineEditToolbar($container: JQuery, stepResult: TestsOM.TestActionResult) {
        <Menus.MenuBar>Controls.BaseControl.createIn(Menus.MenuBar, $container, {
            items: this._createInlineEditToolbarItems(stepResult),
            executeAction: delegate(this, this._onInlineEditToolbarClick, stepResult)
        });
    }

    private _createInlineEditToolbarItems(stepResult: TestsOM.TestActionResult): any {
        /// <summary>Creates the items list for the toolbar</summary>
        /// <returns type="Object">Items list for the toolbar</returns>
        let items = [];
        items.push({ id: TestsOM.InlineEditCommands.insertStep, showText: false, title: Resources.InsertStep, icon: "bowtie-icon bowtie-step bowtie-icon-small bowtie-white-fill" });
        items.push({ id: TestsOM.InlineEditCommands.deleteStep, disabled: !this._canDeleteStep(stepResult), showText: false, title: Resources.DeleteStep, icon: "bowtie-icon bowtie-edit-delete bowtie-icon-small bowtie-white-fill" });
        items.push({ separator: true });
        items.push({ id: TestsOM.InlineEditCommands.moveStepUp, disabled: !this._canMoveStepUp(stepResult), showText: false, title: Resources.MoveStepUp, icon: "bowtie-icon bowtie-arrow-up bowtie-icon-small bowtie-white-fill" });
        items.push({ id: TestsOM.InlineEditCommands.moveStepDown, disabled: !this._canMoveStepDown(stepResult), showText: false, title: Resources.MoveStepDown, icon: "bowtie-icon bowtie-arrow-down bowtie-icon-small bowtie-white-fill" });
        return items;
    }

    private _canDeleteStep(stepResult: TestsOM.TestActionResult) {
        return stepResult.canDelete();
    }

    private _canMoveStepUp(stepResult): boolean {
        let stepsCollection: TestsOM.TestActionResult[] = stepResult.owner.getItems(),
            index = Utils_Array.indexOf(stepsCollection, stepResult);

        return ((index !== -1) && (index > 0));
    }

    private _canMoveStepDown(stepResult): boolean {
        let stepsCollection: TestsOM.TestActionResult[] = stepResult.owner.getItems(),
            index = Utils_Array.indexOf(stepsCollection, stepResult);

        return ((index !== -1) && (index < (stepsCollection.length - 1)));
    }

    private _onInlineEditToolbarClick(e: any, stepResult: TestsOM.TestActionResult) {
        /// <summary>Handles the execution of the toolbar items</summary>
        /// <param name="e" type="Object">The execution event</param>
        let command = e.get_commandName();
        switch (command) {
            case TestsOM.InlineEditCommands.moveStepDown:
                this.stepMoved(stepResult, TestStepsList.TestStepMovedDirection.DOWN);
                break;
            case TestsOM.InlineEditCommands.moveStepUp:
                this.stepMoved(stepResult, TestStepsList.TestStepMovedDirection.UP);
                break;
            case TestsOM.InlineEditCommands.deleteStep:
                if (confirm(Resources.DeleteStepConfirmation)) {
                    if (this.deleteStep) {
                        this.deleteStep(stepResult.actionId, stepResult.parentId);
                    }
                }
                break;
            case TestsOM.InlineEditCommands.insertStep:
                if (this.insertStep) {
                    this.insertStep(stepResult.actionId, stepResult.parentId);
                }
                break;
        }
    }

    private _makeEditable($row: JQuery,
        stepResult: TestsOM.TestActionResult,
        selector: string,
        changedEvent: (id: number, parentId: number, content: string) => void): void {
        let $editableDiv: JQuery = $row.find(selector),
            oldContent: string = $editableDiv.html(),
            lines: JQuery = $editableDiv.find("p"),
            numberOfLines: number = lines.length,
            newContent: string, celltext: string;
        // If there are no p tags then put one because without any p tag some browsers add divs instead of p tags for newlines.
        if (numberOfLines === 0) {
            if ($editableDiv.text().trim().length === 0) {
                celltext = "&nbsp;";
            }
            else {
                celltext = $editableDiv.html();
            }
            $editableDiv.html("<p>" + celltext + "</p>");
        }
        else { //replace empty  <p> tags with line breaks as each p tag corresponds to a new line and empty p tag do not cause line break
            TestsOM.HtmlUtils.replaceEmptyParagraphTagsWithNbsp(lines);
        }

        oldContent = $editableDiv.html();

        $editableDiv.attr("contentEditable", "true")
            .addClass("title-edit-div")
            .bind("blur drop keyup paste", (e) => {
                if (e.type === "drop") {
                    e.stopPropagation();
                    e.preventDefault();
                }
                else if (changedEvent) {
                    newContent = $(e.target).html();
                    if (oldContent !== newContent) {
                        oldContent = newContent;
                        changedEvent(stepResult.actionId, stepResult.parentId, newContent);
                        this._handleError($row, stepResult, selector);
                        this._repositionInlineEditError();
                    }
                }
            });

        $row.find(this._stepActionClassSelector + "," + this._expectedResultHeaderSelector + "," + this._stepExpectedResultClassSelector).show();
    }

    private _makeParamValueEditable($row: JQuery,
        stepResult: TestsOM.TestActionResult,
        selector: string,
        changedEvent: (stepResults: TestsOM.TestStepResult[], paramName: string, paramValue: string) => void) {
        let $paramValueInput: JQuery,
            $paramValueSpan: JQuery = $row.find(selector),
            oldContent: TestsOM.TestParameterCollection,
            newContent: string,
            paramName: string,
            stepResults: TestsOM.TestStepResult[] = [],
            $rowsToBeUpdated: JQuery[] = [],
            rowsAndResultsToBeUpdated = {},
            paramIndex: number;

        rowsAndResultsToBeUpdated = this._getStepResultsAndRowsToBeUpdated(<TestsOM.TestStepResult>stepResult);
        stepResults = rowsAndResultsToBeUpdated["stepResultsToBeUpdated"];
        $rowsToBeUpdated = rowsAndResultsToBeUpdated["rowsToBeUpdated"];
        oldContent = (<TestsOM.TestStepResult>stepResult).parameters;

        $paramValueSpan.each(function () {
            $paramValueInput = $("<input type=\"text\" />").addClass("test-step-parameter-value-input")
                .val($(this).text());
            $(this).replaceWith($paramValueInput);
        });

        $row.find(this._stepParameterValueInputClassSelector).bind("drop change keydown paste", (e) => {
            if (e.type === "drop") {
                e.stopPropagation();
                e.preventDefault();
            }
            else if (changedEvent) {
                this._lastFocusedParamElement = $row.find(this._stepParameterValueInputClassSelector);
                if (e.type === "keydown" && (e.keyCode !== 83 || !e.ctrlKey)) {
                    // only handle ctrl + s
                    return;
                }
                newContent = $(e.target).val();
                paramName = $(e.target).siblings(this._stepParameterNameClassSelector).eq(0).text();
                paramIndex = oldContent.getIndexFromCollection(paramName);
                if (paramIndex !== -1 && oldContent.getItems()[paramIndex].expected !== newContent) {
                    this._updateRowsContainingModifiedParameter($rowsToBeUpdated, paramName, newContent);
                    changedEvent(stepResults, paramName, newContent);
                }
            }
        }).show();
    }

    private _updateRowsContainingModifiedParameter(rows: JQuery[], paramName: string, paramValue: string) {
        let i = 0,
            numRows = rows.length;

        for (i = 0; i < numRows; i++) {
            rows[i].find(this._stepParameterNameClassSelector).each(
                function () {
                    if (Utils_String.ignoreCaseComparer($(this).text(), paramName) === 0) {
                        $(this).siblings(this._stepParameterValueClassSelector).eq(0).text(paramValue);
                        $(this).siblings(this._stepParameterValueInputClassSelector).eq(0).val(paramValue);
                    }
                }
            );
        }
    }

    public preSave() {
        if (this._lastFocusedParamElement) {
            this._lastFocusedParamElement.trigger("change");
        }
    }

    private _getStepResultsAndRowsToBeUpdated(stepResult: TestsOM.TestStepResult) {
        let parameters: TestsOM.TestResultParameter[] = stepResult.parameters.getItems(),
            testStepsCount = this._dataSource.length,
            i = 0,
            testStepResult: TestsOM.TestStepResult,
            stepResults: TestsOM.TestStepResult[] = [],
            $rows: JQuery[] = [];

        for (i = 0; i < testStepsCount; i++) {
            if (this._dataSource[i] instanceof TestsOM.TestStepResult) {
                testStepResult = this._dataSource[i];
                if (this._stepContainsGivenParameters(parameters, testStepResult)) {
                    stepResults.push(testStepResult);
                    $rows.push(this.getItemAtIndex(i));
                }
            }
        }

        return {
            stepResultsToBeUpdated: stepResults,
            rowsToBeUpdated: $rows
        };
    }

    private _stepContainsGivenParameters(parameters: TestsOM.TestResultParameter[], stepResult: TestsOM.TestStepResult) {
        let numParameters: number = parameters.length,
            j = 0;

        for (j = 0; j < numParameters; j++) {
            if (stepResult.parameters.getIndexFromCollection(parameters[j].parameterName) !== -1) {
                return true;
            }
        }

        return false;
    }

    private _handleError($row: JQuery, stepResult: TestsOM.TestActionResult, sectionSelector: string) {
        if (sectionSelector === this._stepActionClassSelector) {
            this._updateErrorForSection($row, sectionSelector, stepResult.hasActionError(), stepResult.getError());
        }
        else if (sectionSelector === this._stepExpectedResultClassSelector) {
            this._updateErrorForSection($row, sectionSelector, stepResult.hasExpectedResultError(), stepResult.getError());
        }
    }

    private _updateErrorForSection($row: JQuery, sectionSelector: string, hasError: boolean, errorMessage: string) {
        if (hasError) {
            this.showError($row, sectionSelector, errorMessage);
        }
        else {
            this.removeError($row, sectionSelector);
        }
    }

    public _onDoubleClick(e?: JQueryEventObject): any {
        if (this._isEditingEnabled) {
            this._makeCurrentStepEditable(e);
        }
        else {
            this._showBlockedEditingError(e);
        }
    }

    private _makeCurrentStepEditable(e?: JQueryEventObject): any {
        // e can be a mouse or key event on any item of the TestStepList
        if (this.getSelectionCount() === 1) {
            let $row: JQuery,
                stepIndex: number,
                stepResult: TestsOM.TestActionResult,
                focusExpectedResult = false;

            // In case the click happens on ExpectedResult and it is editable, we focus on expected result else on action.
            if ($(e.target).closest(this._stepExpectedResultClassSelector).length > 0 ||
                $(e.target).closest(this._stepExpectedResultParametersClassSelector).length > 0 ||
                $(e.target).closest(this._expectedResultHeaderSelector).length > 0) {
                focusExpectedResult = true;
            }
            if (!this._commentManager._isTargetElementCommentTextArea(e) && !this._isTargetElementTitleInEditMode(e)) {
                stepIndex = this._getClosestListItemIndex(e);
                if (stepIndex !== null && stepIndex !== undefined) {
                    $row = this.getItemAtIndex(stepIndex);
                }
                if ($row) {
                    stepResult = this._dataSource[stepIndex];
                    this._editStep($row, stepResult, focusExpectedResult);
                }
            }
        }
    }

    private _getEditableSectionElement($row: JQuery, focusExpectedResult?: boolean): JQuery {
        let $editableElement = $row.find(this._stepExpectedResultClassSelector);

        if (focusExpectedResult) {
            if ($editableElement.length > 0 && ($editableElement.attr("contenteditable") === "true")) {
                return $editableElement.first();
            }
            else {
                $editableElement = $row.find(this._stepExpectedResultParametersClassSelector + " " + this._stepParameterValueInputClassSelector);
                if ($editableElement.length > 0) {
                    return $editableElement.first();
                }
            }
        }
        // If we dont want to focus on ExpectedResult section explicitly, then try focsing all the editable elements order wise.
        $editableElement = $row.find(this._stepActionClassSelector);
        if ($editableElement.length > 0 && ($editableElement.attr("contenteditable") === "true")) {
            return $editableElement.first();
        }
        $editableElement = $row.find(this._stepActionParametersClassSelector + " " + this._stepParameterValueInputClassSelector);
        if ($editableElement.length > 0) {
            return $editableElement.first();
        }
        $editableElement = $row.find(this._stepExpectedResultClassSelector);
        if ($editableElement.length > 0 && ($editableElement.attr("contenteditable") === "true")) {
            return $editableElement.first();
        }
        $editableElement = $row.find(this._stepParameterValueInputClassSelector);
        if ($editableElement.length > 0) {
            return $editableElement.first();
        }
    }

    public _onKeyDown(e?: JQueryEventObject): any {
        /// <param name="e" type="JQueryEvent" />
        /// <returns type="any" />
        // TODO: Define F2 in Utils_UI.KeyCode and FI from Q11w to TCMWebMini
        let $gridRow: JQuery,
            $item = this.getItemAtIndex(this._selectedIndex);

        if (e.which === 113) {
            if (this._isEditingEnabled) {
                this._makeCurrentStepEditable(e);
            }
            else {
                this._showBlockedEditingError(e);
            }
        }
        if (e.which === Utils_UI.KeyCode.ESCAPE) { // Escape key will take out of the edit mode and focus will be shifted to next step.
            if (this._isTargetElementTitleInEditMode(e) && this._selectedIndex < this._dataSource.length - 1) {
                this.selectNext();
            }
            else {
                this.onSelectionChanged(this._selectedIndex, this._selectedIndex);
                this._makeNonEditable($item, this._selectedIndex);
            }
        }
        else if (!this._commentManager._isTargetElementCommentTextArea(e) && !this._isTargetElementTitleInEditMode(e)) {
            return super._onKeyDown(e);
        }

    }

    public selectNextStep(): boolean {
        let i: number,
            stepResult: TestsOM.TestActionResult,
            arrayLength: number = this._dataSource.length,
            selectedIndex: number = this.getHighestSelectedIndex();

        if (this._dataSource[selectedIndex] instanceof TestsOM.SharedStepResult) {
            for (i = selectedIndex + 1; i < arrayLength; i++) {
                stepResult = this._dataSource[i];
                if (stepResult.isSubStep) {
                    continue;
                }
                else {
                    selectedIndex = i;
                    break;
                }
            }
            this.setAndFocusSelectedIndex(selectedIndex);
            return true;
        }
        else {
            return super.selectNext(selectedIndex);
        }
    }

    public _onClick(e?): any {
        /// <summary>Override the onClick of ListView. Call the base if the click is not on Comment TextArea</summary>
        if (!this._commentManager._isTargetElementCommentTextArea(e) && !this._isTargetElementTitleInEditMode(e)) {
            super._onClick(e);
        }

        return true;
    }

    private _isTargetElementTitleInEditMode(e) {
        let $closestTitleElement = $(e.target).closest(this._stepActionClassSelector + "," + this._stepExpectedResultClassSelector),
            $editableParamValueInput = $(e.target).closest(this._stepParameterValueInputClassSelector);
        if (($closestTitleElement.length > 0 && $closestTitleElement[0].contentEditable === "true") ||
            $editableParamValueInput.length > 0) {
            return true;
        }

        return false;
    }

    public _onListItemfocussed(e?) {
        /// <summary>Override the _onListItemfocussed of ListView </summary>
        let $selectedItem,
            $textArea;
        super._onListItemfocussed(e);

        $selectedItem = this._itemsContainer.children().eq(this._selectedIndex);
        if (this._commentManager._isTargetElementCommentTextArea(e)) {
            if (Utils_UI.BrowserCheckUtils.isLessThanOrEqualToIE8()) {
                $textArea = $(e.target).closest(this._commentClassSelector);
                TMUtils.setTextSelection($textArea[0], 0, 0);
            }
        }
    }

    private _fireSetStepCommentEvent(commentText) {
        let stepResult;
        if ($.isFunction(this._setStepCommentEvent)) {
            stepResult = this._dataSource[this._selectedIndex];
            this._setStepCommentEvent(stepResult, commentText);
        }
    }

    private _repositionInlineEditError() {
        let stepIndex = this._selectedIndex,
            $row = this.getItemAtIndex(stepIndex),
            inlineEditErrorDiv: JQuery = $row.find(this._editErrorSelector);

        if (inlineEditErrorDiv.length > 0) {
            if (stepIndex === 0 || stepIndex === 1) {
                inlineEditErrorDiv.css("top", $row.outerHeight(true));
            }
        }
    }
}

VSS.initClassPrototype(TestStepsList, {
    _setStepResultOutComeEvent: null,
    _setStepCommentEvent: null,
    _setStepAttachmentEvent: null,
    _commentManager: null,
    _commentClassSelector: ".step-comment-textarea",
    _stepActionClassSelector: ".stepResults-action",
    _stepExpectedResultClassSelector: ".stepResults-expectedResult",
    _stepExpectedResultParametersClassSelector: ".stepResults-expectedResultParameters",
    _stepActionParametersClassSelector: ".stepResults-actionParameters",
    _expectedResultHeaderSelector: ".expectedResult-header",
    _inlineEditToolbarSelector: ".inline-edit-toolbar",
    _editErrorSelector: ".inline-edit-error",
    _stepParameterValueClassSelector: ".test-step-parameter-value",
    _stepParameterNameClassSelector: ".test-step-parameter-name",
    _stepParameterValueInputClassSelector: ".test-step-parameter-value-input",
    _isEditingEnabled: true,
    _toolbarItemsIds: {
        editStep: "edit-step",
        addComment: "add-comment",
        passStep: "pass-step",
        failStep: "fail-step",
        addAttachment: "add-attachment"
    } //TODO: Dangerous member initialization on prototype. Get rid of it.

});

export class CommentBoxManager {
    private _commentClassSelector: string;
    private _commentClassContainerSelector: string;
    private _maxHeight: number;
    private _hasWatermark: boolean;
    public _fireCommentChangeEvent: (comment: string) => void;

    constructor(commentClassSelector: string, commentClassContainerSelector: string, maxHeight: number, hasWatermark: boolean) {
        this._commentClassSelector = commentClassSelector;
        this._commentClassContainerSelector = commentClassContainerSelector;
        this._maxHeight = maxHeight;
        this._hasWatermark = hasWatermark;
    }

    public _showAndFocusCommentSection($container: JQuery) {
        /// <summary>Show the comment area present in the element $container and take focus to comment text area</summary>
        $container.find($(this._commentClassContainerSelector)).show();
        $container.find($(this._commentClassSelector)).focus();
        this.resizeTextArea($container.find($(this._commentClassSelector))[0]);
    }

    public createCommentTextArea($commentContainer: JQuery, commentClass: string, commentText: string, textAreaLabelBy: string, textAreaLabel: string, maxCommmentLength: number) {
        /// <summary>Creates the text area inside the given $commentContainer</summary>
        let textAreaDiv = $(Utils_String.format("<textarea class='{0}'>{1}</textarea>", commentClass, commentText));
        if (this._hasWatermark) {
            textAreaDiv.attr("placeholder", Resources.CommentsWatermark);
        }

        if (textAreaLabelBy) {
            textAreaDiv.attr("aria-labelledby", textAreaLabelBy);
        }
        else if (textAreaLabel) {
            textAreaDiv.attr("aria-label", textAreaLabel);
        }
        textAreaDiv.attr("maxlength", maxCommmentLength);
        $commentContainer.append(textAreaDiv);
    }

    private _focusCommentSection(e: JQueryEventObject, $container: JQuery) {
        $container.find($(this._commentClassSelector)).focus();
    }

    public _onPaste(e?: JQueryEventObject) {
        /// <param name="e" type="JQueryEvent" />
        /// <returns type="any" />

        let textArea;
        if (this._isTargetElementCommentTextArea(e)) {
            textArea = $(e.target).closest(this._commentClassSelector)[0];

            Utils_Core.delay(this, 100, function () {
                if (textArea.clientHeight !== textArea.scrollHeight) {
                    this.resizeTextArea(textArea);
                }
            });

            if ($.isFunction(this._fireCommentChangeEvent)) {
                this._fireCommentChangeEvent(textArea.value);
            }
        }
    }

    public _onKeyUp(e?: JQueryEventObject) {
        let keyCode = Utils_UI.KeyCode,
            textArea;

        if (this._isTargetElementCommentTextArea(e)) {
            textArea = $(e.target).closest(this._commentClassSelector)[0];

            if (e.keyCode !== keyCode.DELETE && e.keyCode !== keyCode.BACKSPACE) {
                if (textArea.clientHeight !== textArea.scrollHeight) {
                    this.resizeTextArea(textArea);
                }
            }
            if ($.isFunction(this._fireCommentChangeEvent)) {
                this._fireCommentChangeEvent(textArea.value);
            }
        }
    }

    public _onFocusOut(e?: JQueryEventObject) {
        let textArea;

        if (this._isTargetElementCommentTextArea(e)) {
            textArea = $(e.target).closest(this._commentClassSelector)[0];
            this.resizeTextArea(textArea);
            if ($.isFunction(this._fireCommentChangeEvent)) {
                this._fireCommentChangeEvent(textArea.value);
            }
        }
    }

    public resizeTextArea(textArea: HTMLElement) {
        if (!textArea) {
            return;
        }

        let oldHeight = $(textArea).height(),
            newHeight,
            fontSizeForTextArea = 20;
        if ($(textArea).css("font-size")) {
            fontSizeForTextArea = parseInt($(textArea).css("font-size"), 10);
        }
        if (Utils_UI.BrowserCheckUtils.isIE()) {
            textArea.style.height = (textArea.scrollHeight + fontSizeForTextArea + "px");
        }
        else {
            if (textArea.scrollHeight === textArea.clientHeight) {
                textArea.style.height = fontSizeForTextArea + "px";
            }
            newHeight = Math.max(textArea.scrollHeight, textArea.clientHeight);
            if (newHeight > textArea.clientHeight) {
                textArea.style.height = newHeight + fontSizeForTextArea + "px";
            }
        }
        if (this._maxHeight && this._maxHeight !== -1) {
            // In case the text area's height is more than the max height of the comment box, scrollbar should be displayed otherwise it should be hidden
            if (parseInt(textArea.style.height, 10) > this._maxHeight) {
                $(textArea).css("overflow-y", "auto");
            }
            else {
                $(textArea).css("overflow-y", "hidden");
            }
        }

        $(textArea).trigger("TextAreaResized");
    }

    public _isTargetElementCommentTextArea(e?) {
        /// <summary>Return true if the event triggered from comment textarea</summary>
        let isCommentTextClicked = $(e.target).closest(this._commentClassSelector).length;
        if (isCommentTextClicked > 0) {
            return true;
        }
        return false;
    }
}

VSS.initClassPrototype(CommentBoxManager, {
    _commentClassSelector: "",
    _commentClassContainerSelector: "",
    _maxHeight: -1,
    _hasWatermark: false
});

class AttachmentList extends Controls.BaseControl {

    public static enhancementTypeName: string = "tfs.testManagement.AttachmentList";
    public deleteAttachmentEvent: (event: JQueryEventObject) => any;
    private static _stepsImagesSelector: string = ".stepResultTable .attachment-list-container .test-step-attachment-images";
    private static _stepsImageSelector: string = ".test-step-attachment-image";

    private _attachments: WITOM.Attachment[];
    private _imagesCount: number;
    private _imagesLoaded: number;

    constructor(options?: any) {
        /// <summary>Create a new AttachmentList</summary>
        /// <param name="options" type="Object">the options for this control</param>
        super(options);
    }

    public initialize() {
        /// <summary></summary>
        super.initialize();
        this._imagesCount = 0;
        this._imagesLoaded = 0;
        this._createAttachmentList();
    }

    public postInitialize() {
        this._setRedrawLayoutOnImageLoadEvent();
    }

    public getImagesCount() {
        return this._imagesCount;
    }

    public appendAttachment(attachmentId: number, attachmentName: string, attachmentSizeString: string, attachmentUri: string, $attachmentListContainer, index: number) {
        let image_extensions: RegExp = TMUtils.ImageHelper.getImageExtensionRegex();
        if (image_extensions.test(attachmentName)) {
            let $imagesDiv = $attachmentListContainer.find(".test-step-attachment-images");
            this._addImageLink(attachmentName, attachmentUri, $imagesDiv, index, true, attachmentId);
            this._onImageLoad();
            this._imagesCount++;
        }
        else {
            let $linksDiv = $attachmentListContainer.find(".test-step-attachment-links");
            this._addAttachmentLink(attachmentName, attachmentSizeString, attachmentUri, $linksDiv, index, true, attachmentId);
        }
    }

    public removeAttachment(attachmentId: number, attachmentName: string, $attachmentListContainer) {
        let image_extensions: RegExp = TMUtils.ImageHelper.getImageExtensionRegex();
        if (image_extensions.test(attachmentName)) {
            let $imagesDiv = $attachmentListContainer.find(".test-step-attachment-images");
            let $attachment = $imagesDiv.find("#" + attachmentId);
            $attachment.remove();
            this._imagesCount--;
        }
        else {
            let $linksDiv = $attachmentListContainer.find(".test-step-attachment-links");
            let $attachment = $linksDiv.find("#" + attachmentId);
            $attachment.remove();
        }
    }

    private _createAttachmentList() {
        let i: number,
            attachmentName: string,
            attachmentSize: number,
            attachmentSizeString: string,
            attachmentUri: string,
            image_extensions: RegExp,
            $imagesDiv = $("<div class='test-step-attachment-images'></div>"),
            $linksDiv = $("<div class='test-step-attachment-links'></div>");

        image_extensions = TMUtils.ImageHelper.getImageExtensionRegex();

        if (this._options.attachments) {
            for (i = 0; i < this._options.attachments.length; i++) {
                attachmentName = this._options.attachments[i].getName();
                attachmentSize = this._options.attachments[i].getLength();
                attachmentSizeString = Utils_String.format(Resources.TestStepAttachmentSizeFormat, Math.ceil(attachmentSize / 1024));
                attachmentUri = this._options.attachments[i].getUri(true);

                if (image_extensions.test(attachmentName)) {
                    // All the images will be shown after the list of links for non-image attachments.
                    this._addImageLink(attachmentName, attachmentUri, $imagesDiv);
                    this._imagesCount++;
                }
                else {
                    this._addAttachmentLink(attachmentName, attachmentSizeString, attachmentUri, $linksDiv);
                }
            }
            this._element.append($linksDiv);
            this._element.find(".test-step-attachment-links").after($imagesDiv);
        }
    }

    private _addImageLink(attachmentName: string, attachmentUri: string, $imagesDivContainer: JQuery, index: number = -1, addDeleteIcon: boolean = false, attachmentId: number = 0) {
        let $imageLink: JQuery,
            $imageLinkContent: JQuery,
            $attachmentDiv: JQuery,
            isIE8 = Utils_UI.BrowserCheckUtils.isLessThanOrEqualToIE8();

        $attachmentDiv = $("<div class='test-step-attachment'></div>");
        $imageLink = $("<a></a>").attr("href", attachmentUri).appendTo($attachmentDiv);
        // Fix for Bug 1112108:[IE8]Bottom band is greater than the thumbnail image shown in the MTR for test steps with Attachments
        // Removed the margin between the images, so that the image name band seems contiguous for all images and appears fine for IE8.
        if (isIE8) {
            $imageLink.css("margin-right", "0px");
        }
        $imageLinkContent = $("<div></div>");
        $("<image class='test-step-attachment-image'>").attr("src", attachmentUri).appendTo($imageLinkContent);
        // For showing the name of the image at the bottom of the image, added a div which will be placed on an absolute position inside the container div.
        let $testStepImageName = $("<div class='test-step-attachment-image-name'></div>").text(attachmentName).appendTo($imageLinkContent);
        RichContentTooltip.addIfOverflow(attachmentName, $testStepImageName);
        $imageLink.append($imageLinkContent);

        if (addDeleteIcon === true) {
            this._addDeleteIcon($attachmentDiv, attachmentId, attachmentName, index);
        }

        $imagesDivContainer.append($attachmentDiv);
    }

    private _addAttachmentLink(attachmentName: string, attachmentSizeString: string, attachmentUri: string, $linksDivContainer: JQuery, index: number = -1, addDeleteIcon: boolean = false, attachmentId: number = 0) {
        let $attachmentDiv: JQuery,
            $temp: JQuery;

        $attachmentDiv = $("<div class='test-step-attachment'></div>");
        $attachmentDiv.append("<span class='bowtie-icon bowtie-attach'></span>");
        $temp = $("<a class='test-step-attachment-name'></a>").text(attachmentName).attr("href", attachmentUri);
        $attachmentDiv.append($temp);
        $temp = $("<span class='test-step-attachment-size'></span>").text(" " + attachmentSizeString);
        $attachmentDiv.append($temp);

        if (addDeleteIcon === true) {
            this._addDeleteIcon($attachmentDiv, attachmentId, attachmentName, index);
        }

        $linksDivContainer.append($attachmentDiv);
    }

    private _addDeleteIcon($attachmentDiv: JQuery, attachmentId: number, attachmentName: string, index: number) {
        $attachmentDiv.attr("id", attachmentId);
        let $deleteIcon = $("<span class='bowtie-icon bowtie-edit-delete bowtie-icon-small'></span>").attr("tabindex", "0").css("margin-left", "30px");
        $attachmentDiv.append($deleteIcon);

        let that = this;
        $deleteIcon.on("click", { id: attachmentId, name: attachmentName, index: index }, function (event?) {
            that.deleteAttachmentEvent(event);
        });

        $deleteIcon.on("keydown", { id: attachmentId, name: attachmentName, index: index }, function (event?) {
            if (event.which === Utils_UI.KeyCode.ENTER
                && !event.shiftKey && !event.ctrlKey && !event.altKey) {
                that.deleteAttachmentEvent(event);
            }
        });
    }

    // TODO: Check if this can be done on pageload instead of image load.
    // This will be fired for all images and we need to redraw layout just once. So do it with page load if possible
    private _setRedrawLayoutOnImageLoadEvent() {
        let imageElement: HTMLImageElement;

        this._element.find("img.test-step-attachment-image").each((i, item) => {
            imageElement = <HTMLImageElement>$(item)[0];
            //See if element is in the cache
            if (imageElement.complete) {
                this._imagesLoaded++;
            }
            else {
                this._bind(item, "load", delegate(this, this._onImageLoad));
            }

        });

        if (this._imagesLoaded >= this._imagesCount) {
            this._onAllImagesLoaded();
        }
    }

    private _onImageLoad(e?: JQueryEventObject) {
        this._imagesLoaded++;
        if (this._imagesLoaded >= this._imagesCount) {
            this._onAllImagesLoaded();
        }
    }

    private _onAllImagesLoaded() {
        let userAgent = window.navigator.userAgent.toLowerCase(),
            self = this,
            idImageAttachmentSelector = "#" + this.getId() + " " + AttachmentList._stepsImageSelector;

        if (userAgent.indexOf("chrome") !== -1 || Utils_UI.BrowserCheckUtils.isFirefox()) {
            // In Chrome and Firefox, while drawing the layout, browser fixes and allocates space for the images to be placed based on the height and min-width properties, etc.
            // After the images get downloaded, the layout is not redrawn and the images appear to be clipped.
            // So, just for Chrome, putting this hack to redraw the layout after the images have been downloaded.
            // This forces re-layout - we also need to touch the height property for this to work
            $(AttachmentList._stepsImagesSelector).css("display", "none").height();
            $(AttachmentList._stepsImagesSelector).css("display", "block");
        }

        // initialize attachment images for zoom
        $(idImageAttachmentSelector).each((i, item) => {
            this._options.imageZoomUtil.initializeImageForZoom($(item));
        });
    }
}

VSS.classExtend(AttachmentList, TfsContext.ControlExtensions);

VSS.initClassPrototype(AttachmentList, {
    _attachments: null,
    _layoutRedrawn: false
});

export class TestCaseNavigator extends Controls.BaseControl {

    public static enhancementTypeName: string = "tfs.testManagement.TestCaseNavigator";

    private _testCaseResults: TestsOM.TestCaseResult[];
    private _activeTestResultIndex: number;
    private _testCaseNavigationToolbar: any;
    private _toolbarItemsIds: any;

    public movePrevEvent: any;
    public moveNextEvent: any;
    public moveToTestCaseAndIterationEvent: any;
    public canMovePrevDelegate: () => boolean;
    public canMoveNextDelegate: () => boolean;
    public getActiveTestResultIndexDelegate: () => number;
    public getActiveTestIterationIndexDelegate: () => number;

    constructor(options?: any) {
        /// <summary>Create a new TestCaseNavigator</summary>
        /// <param name="options" type="Object">the options for this control</param>
        super(options);
    }

    public initialize() {
        /// <summary></summary>
        super.initialize();
        this._testCaseResults = this._options.testCaseResults;
        this._createNavigationMenuBar();
    }

    private _createNavigationMenuBar() {
        let toolbarElementContainer;

        this._element.append("<div class='toolbar'></div>");
        // Creating the menu bar
        this._testCaseNavigationToolbar = <Menus.MenuBar>Controls.BaseControl.createIn(Menus.MenuBar, this._element.find(".toolbar"),
            {
                items: this._getMenuItems(),
                executeAction: Utils_Core.delegate(this, this._onMenubarItemClick)
            });

        // Hack for IE10. In the case of IE10 in some resolutions, the sub-menu shows up as transparent.
        // This seems like a bug in IE10. The following code is written to workaround that issue.
        $(".mtr-navigation-dropdown").click(() => {
            this.delayExecute("setOpacityOnSubMenu", 300, true, () => {
                $(".mtr-navigation-dropdown .sub-menu:visible").css("opacity", "0");
                $(".mtr-navigation-dropdown .sub-menu:visible").css("opacity", "1");
            });
        });

        toolbarElementContainer = this.getElement();
        $(toolbarElementContainer).css("min-width", this._getRequiredMinWidth());
        this._updateStyleForTestCaseDropDown();
    }

    private _createTestCaseMenuItems() {
        let testCaseMenuItems = [],
            that = this,
            j,
            iterationNum;

        $.each(that._testCaseResults, function (i, testCaseResult) {
            testCaseMenuItems.push({
                id: that._toolbarItemsIds.testCase,
                text: Utils_String.format(Resources.TestRunnerTestCaseDropdownTitle, testCaseResult.testCaseId, testCaseResult.testCaseTitle, testCaseResult.configurationName),
                cssClass: i > 0 ? "test-case-" + i : "selected-iteration-text test-case-" + i,
                "arguments": { testResultIndex: i, iterationIndex: 0 }
            });

            for (j = 0; j < testCaseResult.dataRowCount; j++) {
                iterationNum = j + 1;
                testCaseMenuItems.push({
                    id: that._toolbarItemsIds.testCase,
                    text: Utils_String.format(Resources.TestRunnerTestCaseIterationTitle, iterationNum),
                    cssClass: "iteration-test-case test-case-" + i + "-" + j,
                    "arguments": { testResultIndex: i, iterationIndex: j }
                });
            }
        });

        return testCaseMenuItems;
    }
    private _createNavigationMenuTitle() {
        let title = Utils_String.format(Resources.TestCaseNavigationTitle, this._activeTestResultIndex + 1, this._testCaseResults.length),
            iterationNum = 1;

        if (this._testCaseResults[this._activeTestResultIndex].isDataDriven()) {
            // While first time creation the below delegate does not get initialized
            if ($.isFunction(this.getActiveTestIterationIndexDelegate)) {
                iterationNum = this.getActiveTestIterationIndexDelegate() + 1;
            }

            title = Utils_String.format(Resources.TestCaseNavigationTitleWithIteration, title, iterationNum);
        }
        return title;
    }

    private _getMenuItems() {
        let menuItems = [];

        menuItems.push({
            id: this._toolbarItemsIds.prev,
            text: Resources.Previous,
            title: Utils_String.format(Resources.TooltipTitleShortcutFormat, Resources.PreviousTestCaseTooltip, Resources.PreviousTestCaseShortcut),
            icon: "bowtie-icon bowtie-triangle-left",
            cssClass: "mtr-prev"
        });

        menuItems.push({
            id: this._toolbarItemsIds.testCasesDropDown,
            idIsAction: false,
            text: this._createNavigationMenuTitle(),
            noIcon: true,
            icon: "bowtie-icon bowtie-triangle-down",
            childItems: this._createTestCaseMenuItems(),
            cssClass: "mtr-navigation-dropdown"
        });

        menuItems.push({
            id: this._toolbarItemsIds.next,
            title: Utils_String.format(Resources.TooltipTitleShortcutFormat, Resources.NextTestCaseTooltip, Resources.NextTestCaseShortcut),
            text: Resources.Next,
            icon: "bowtie-icon bowtie-triangle-right",
            cssClass: "mtr-next"
        });

        return menuItems;
    }

    private _getRequiredMinWidth() {
        let minWidth = 0,
            i,
            width,
            menuItem,
            menuElement,
            prevButtonWidth = 0,
            nextButtonWidth = 0,
            $tempElement,
            titleString = Utils_String.format(Resources.TestCaseNavigationTitleWithIteration,
                Utils_String.format(Resources.TestCaseNavigationTitle, 0, 1),
                "1");

        for (i = 0; i < this._testCaseNavigationToolbar._menuItems.length; i++) {
            menuItem = this._testCaseNavigationToolbar._menuItems[i];
            menuElement = menuItem.getElement();
            width = menuElement.outerWidth();

            if (menuElement.hasClass("mtr-navigation-dropdown")) {
                //bugfix 997454
                //this calculation of min width happens only during the first load and if the first testcase has no iteraions
                // and others do, we dont take care into account the width due to iterations text
                $tempElement = $("<span/>").text(titleString).hide();
                menuElement.append($tempElement);
                width = width + $tempElement.width() - menuElement.children(".text").width();
                $tempElement.remove();
            }

            if (menuElement.hasClass("mtr-prev")) {
                prevButtonWidth = width;
            }
            if (menuElement.hasClass("mtr-next")) {
                nextButtonWidth = width;
            }
            minWidth += width;
        }

        //adding this since the navigation drop down is center aligned, the difference in width of both buttons' text can cause overlap
        minWidth += Math.abs(nextButtonWidth - prevButtonWidth);
        return minWidth;
    }

    private _updateTestCaseDropDownTitle() {
        /// <summary>Updates the title of the TestCaseDropdown based on the active result and iteration </summary>
        let title,
            $testIterationDropdownElement: JQuery,
            testResultIndex: number,
            iterationIndex: number,
            navigationDropDown;

        if ($.isFunction(this.getActiveTestResultIndexDelegate)) {

            this._activeTestResultIndex = this.getActiveTestResultIndexDelegate();
            testResultIndex = this._activeTestResultIndex;
            iterationIndex = this.getActiveTestIterationIndexDelegate();
            if (this._activeTestResultIndex >= 0 && this._activeTestResultIndex < this._testCaseResults.length) {
                title = this._createNavigationMenuTitle();

                // update the title for the test case drop down
                navigationDropDown = this._testCaseNavigationToolbar._menuItems[1];
                navigationDropDown.updateTitle(title);
                navigationDropDown.updateText(title);

                // remove bold style from previous test case
                $testIterationDropdownElement = $(this._testCaseNavigationToolbar._element.find(".selected-iteration-text"));
                $testIterationDropdownElement.removeClass("selected-iteration-text");

                //find iteration element in dropdown
                $testIterationDropdownElement = $(this._testCaseNavigationToolbar._element.find(".test-case-" + testResultIndex + "-" + iterationIndex));

                // if no iteration found find the test case element
                if ($testIterationDropdownElement.length === 0) {
                    $testIterationDropdownElement = $(this._testCaseNavigationToolbar._element.find(".test-case-" + testResultIndex));
                }

                $testIterationDropdownElement.addClass("selected-iteration-text");
            }
        }
    }

    private _updateNavigationToolbarCommandStates() {
        /// <summary>Updates the states of toolbar buttons </summary>
        this._testCaseNavigationToolbar.updateCommandStates(
            [
                {
                    id: this._toolbarItemsIds.prev,
                    disabled: !($.isFunction(this.canMovePrevDelegate) ? this.canMovePrevDelegate() : true)
                },
                {
                    id: this._toolbarItemsIds.next,
                    disabled: !($.isFunction(this.canMoveNextDelegate) ? this.canMoveNextDelegate() : true)
                }
            ]);
    }

    private _updateOutcomeInTestCaseDropDown(testResultIndex: number, iterationIndex: number, outcome: TCMConstants.TestOutcome) {
        /// <summary>Updates the icon for the testResult OutCome in the testCase dropdown</summary>
        let icon: string,
            $testOutcomeStatusElement: JQuery;

        icon = TMUtils.getCssClassNameForOutcomeIcon(outcome);

        // Find the right test case or iteration of test case
        $testOutcomeStatusElement = $(this._testCaseNavigationToolbar._element.find(".test-case-" + testResultIndex + "-" + iterationIndex));
        // if no iteration found find the test case
        if ($testOutcomeStatusElement.length === 0) {
            $testOutcomeStatusElement = $(this._testCaseNavigationToolbar._element.find(".test-case-" + testResultIndex));
        }
        $testOutcomeStatusElement = $testOutcomeStatusElement.find(".icon");

        // Remove any status that was previously set.
        $testOutcomeStatusElement.removeClass().addClass("icon");
        // Set the required status
        $testOutcomeStatusElement.addClass(icon);
    }

    private _onMenubarItemClick(e?) {
        let command = e.get_commandName();

        // Checking to see if the command we can handle is executed
        switch (command) {
            case this._toolbarItemsIds.prev:
                this.moveToPrev();
                break;

            case this._toolbarItemsIds.next:
                this.moveToNext();
                break;

            case this._toolbarItemsIds.testCase:
                if ($.isFunction(this.moveToTestCaseAndIterationEvent)) {
                    this.moveToTestCaseAndIterationEvent(e.get_commandArgument().testResultIndex, e.get_commandArgument().iterationIndex, () => { this._updateToolbarUI(); });
                }
                break;
        }
    }

    public moveToNext() {
        if ($.isFunction(this.moveNextEvent)) {
            this.moveNextEvent(() => { this._updateToolbarUI(); });
        }
    }

    public moveToPrev() {
        if ($.isFunction(this.movePrevEvent)) {
            this.movePrevEvent(() => { this._updateToolbarUI(); });
        }
    }

    private _updateToolbarUI() {
        /// <summary>Updates the Navigation toolbar depending on the active testResult and iteration. </summary>
        this._updateTestCaseDropDownTitle();
        this._updateNavigationToolbarCommandStates();
    }

    private _updateOutcomes() {
        let iterationResults, j, numIterations;
        $.each(this._testCaseResults, (i, testCaseResult) => {
            if (testCaseResult.iterations && testCaseResult.iterations.getItems().length > 0) {
                this._updateOutcomeInTestCaseDropDown(i, -1, testCaseResult.outcome);
                iterationResults = testCaseResult.iterations.getItems();
                numIterations = iterationResults.length;
                for (j = 0; j < numIterations; j++) {
                    this._updateOutcomeInTestCaseDropDown(i, j, iterationResults[j].outcome);
                }
            }
        });
    }

    private _updateStyleForTestCaseDropDown() {

        let dropDownMenu = this._testCaseNavigationToolbar._menuItems[1];

        // For updating the style of the submenu so that the icons appear on right we need that the submenu should be populated in the menu-item.
        // By showing and hiding teh sub-menu, the submenu will be populated in the DOM and we can change the style. 
        // Also the whenever the result outcome is changed from outside, _updateTestOutcomeStatus will be called which will update the icons only if the sub-menu has already been populated. 
        dropDownMenu.tryShowSubMenu({ immediate: true });
        dropDownMenu.hideSubMenu({ immediate: true });

        //our menu will be populated by now, update outcomes if we have
        this._updateOutcomes();
        //because of the above the drop down menu is highlighted which swe dont want
        dropDownMenu.removeHighlight();
        dropDownMenu.removeFocus();
    }
}

VSS.initClassPrototype(TestCaseNavigator, {
    _testCaseResults: null,
    _activeTestResultIndex: 0,
    _testCaseNavigationToolbar: null,
    movePrevEvent: null,
    moveNextEvent: null,
    moveToTestCaseAndIterationEvent: null,
    canMovePrevDelegate: null,
    canMoveNextDelegate: null,
    getActiveTestResultIndexDelegate: null,
    getActiveTestIterationIndexDelegate: null,
    _toolbarItemsIds: {
        prev: "prev-test-case",
        testCasesDropDown: "test-cases-dropdown",
        next: "next-test-case",
        testCase: "test-case"
    } //TODO: Dangerous member initialization on prototype. Get rid of it.

});

VSS.classExtend(TestCaseNavigator, TfsContext.ControlExtensions);

export class TestStepListController {

    constructor(testStepsListView: TestStepsList) {
        this._testStepsListView = testStepsListView;
        this._initializeEvents();
    }

    public stepChanged: (id: number, parentId: number) => void;
    public stepMoved: (stepResult: TestsOM.TestActionResult, direction: string) => void;
    public stepDeleted: (id: number, parentId: number) => void;
    public stepInserted: (id: number, parentId: number, newStepId: number) => void;
    public getActiveTestIterationIndexDelegate: () => number;
    public getActiveTestIterationResultDelegate: () => TestsOM.TestIterationResult;

    public setCurrentTestCase(testCase: TestsOM.TestCase) {
        this._testCase = testCase;
    }

    private _initializeEvents() {

        this._testStepsListView.actionChanged = (id: number, parentId: number, content: string) => {
            this._handleActionChanged(id, parentId, content);
        };

        this._testStepsListView.expectedResultChanged = (id: number, parentId: number, content: string) => {
            this._handleExpectedResultChanged(id, parentId, content);
        };

        this._testStepsListView.paramValueChanged = (stepResults: TestsOM.TestStepResult[], paramName: string, paramValue: string) => {
            this._handleParamValueChanged(stepResults, paramName, paramValue);
        };

        this._testStepsListView.stepMoved = (stepResult: TestsOM.TestActionResult, direction: string) => {
            this.stepMoved(stepResult, direction);
        };

        this._testStepsListView.deleteStep = (id: number, parentId: number) => {
            this._handleDeleteStep(id, parentId);
        };

        this._testStepsListView.insertStep = (id: number, parentId: number) => {
            this._handleInsertStep(id, parentId);
        };

        this._testStepsListView.IsParamDataReadOnly = (): boolean => {
            return this._testCase.isUsingSharedParameters();
        };
    }

    private _handleDeleteStep(id, parentId) {
        let deleted: boolean = this._testCase.removeStep(id, parentId);
        if (deleted) {
            if (this.stepDeleted) {
                this.stepDeleted(id, parentId);
            }
        }
    }

    private _handleInsertStep(id, parentId) {
        let insertedStepId: number = this._testCase.insertStep(id, parentId);
        if (insertedStepId !== 0) {
            if (this.stepInserted) {
                this.stepInserted(id, parentId, insertedStepId);
            }
        }
    }

    private _handleActionChanged(id: number, parentId: number, content: string): void {
        let changed = this._testCase.setAction(id, parentId, content);
        if (changed) {
            if (this.stepChanged) {
                this.stepChanged(id, parentId);
            }
        }
    }

    private _handleExpectedResultChanged(id: number, parentId: number, content: string): void {
        let changed = this._testCase.setExpectedResult(id, parentId, content);
        if (changed) {
            if (this.stepChanged) {
                this.stepChanged(id, parentId);
            }
        }
    }

    private _handleParamValueChanged(stepResults: TestsOM.TestStepResult[], paramName: string, paramValue: string): void {
        // find param name with proper casing
        let actualParamName = this._testCase.getParameterByName(paramName);

        // update test case
        this._testCase.updateParameterValue(actualParamName, paramValue, this.getActiveTestIterationIndexDelegate());

        // update iteration result
        this._updateParamValuesInIterationResult(actualParamName, paramValue);

        // update step result
        this._updateParamValuesInStepResults(stepResults, actualParamName, paramValue);

        // update the steps
        this._updateModifiedSteps(stepResults);
    }

    private _updateParamValuesInIterationResult(paramName: string, paramValue: string) {
        let iterationResult: TestsOM.TestIterationResult = this.getActiveTestIterationResultDelegate(),
            parameterIndex = iterationResult.parameters.getIndexFromCollection(paramName);

        if (parameterIndex !== -1) {
            iterationResult.parameters.getItems()[parameterIndex].expected = paramValue;
            iterationResult.parameters.getItems()[parameterIndex].setIsDirty(true);
        }
    }

    private _updateModifiedSteps(stepResults: TestsOM.TestStepResult[]) {
        let resultsCount = stepResults.length,
            i = 0;

        for (i = 0; i < resultsCount; i++) {
            if (this.stepChanged) {
                this.stepChanged(stepResults[i].actionId, stepResults[i].parentId);
            }
        }
    }

    private _updateParamValuesInStepResults(stepResults: TestsOM.TestStepResult[], paramName: string, paramValue: string) {
        let stepResultsCount = stepResults.length,
            i = 0,
            isIterationPaused = this.getActiveTestIterationResultDelegate().outcome === TCMConstants.TestOutcome.Paused ? true : false;

        for (i = 0; i < stepResultsCount; i++) {
            TMUtils.ParametersHelper.updateParamValuesInStepResult(stepResults[i],
                paramName,
                paramValue,
                this._testCase.getData(),
                this.getActiveTestIterationIndexDelegate(),
                isIterationPaused);
        }
    }

    private _testStepsListView: TestStepsList;
    private _testCase: TestsOM.TestCase;
}

class TestRunWindowSize {
    public width: number;
    public height: number;
}

/**
 * Defines the shortcuts for the TestRuns
 */
export class TestRunShortcutGroup extends TfsCommon_Shortcuts.ShortcutGroupDefinition {

    constructor(private view: TestRunView) {
        super(Resources.TestRunKeyboardShortcutGroup);
        this.testRunsView = view;

        this.registerShortcut(
            "c b",
            {
                description: Resources.CreateBugKeyboardShortcutText,
                action: () => this.testRunsView.createBug()
            });
        this.registerShortcut(
            "t f",
            {
                description: Resources.FailTestStepKeyboardShortcutText,
                action: () => this.testRunsView.updateStepOutcome(TCMConstants.TestOutcome.Failed)
            });
        this.registerShortcut(
            "t p",
            {
                description: Resources.PassTestStepKeyboardShortcutText,
                action: () => this.testRunsView.updateStepOutcome(TCMConstants.TestOutcome.Passed)
            });
    }

    private testRunsView: TestRunView;
}

/* This comment size should be in sync with TestResultsCommentMaxSize in Tfs\Includes\TestManagement\CommonConstants.cs */
const MAX_RESULT_COMMENT_SIZE = 1000;
export class TestRunView extends Controls.BaseControl {

    public static enhancementTypeName: string = "tfs.testManager.TestRunView";
    //We use this class in the selector for JQuery when we need to update the outcome icon in the testrunner window
    private static CssClass_outcomeIcon: string = "testrun-outcome-icon-class";
    private _isExtensionInstalled: boolean;
    private _testRunAndResult: any;
    private _testSuite: TestsOM.ITestSuiteModel;
    private _testCasesNavigator: any;
    private _testStepsControl: any;
    private _testCases: any;
    private _sharedStepCache: { [id: number]: TestsOM.SharedStepWorkItem; };
    private _showNavigationPrompt: boolean;
    private _mailToLinkClick: boolean;
    private _toolbarItemsIds: any;
    private _saveResultToolbarItemsIds: any;
    private _footerSectionItemsIds: any;
    private _activeTestCaseResultIndex: number;
    private _activeIterationResultIndex: number;
    private _idToTestCaseMap: { [id: number]: TestsOM.TestCase; };
    private _$errorDiv: any;
    private _bugCategoryTypeName: any;
    private _runWindowSize: TestRunWindowSize;
    private _borderSize: any;
    private _windowNeedsRestore: boolean;
    private _workItemSaved: boolean;
    private _footerBar: Menus.MenuBar;
    private _isFooterBarCreated: boolean;
    private _windowWidthRequiredToFitAll: number;
    private _menuBar: any;
    private _commentManager: CommentBoxManager;
    private _$testResultCommentContainer: JQuery;
    private _$testResultCommentTextArea: JQuery;
    private _testCaseDescriptionButtonTooltip: RichContentTooltip;
    private _testRunTitleTooltip: RichContentTooltip;
    private _testConfigurationTooltip: RichContentTooltip;
    private _$testCaseDescriptionContainer: JQuery;
    private _$testCaseDescriptionTextArea: JQuery;
    private _saveResultToolbar: Menus.MenuBar;
    private _testStepListController: TestStepListController;
    private _isEditingEnabledInResume: boolean;
    private _isResumeFlow: boolean;
    private _commandQueue: TestsOM.CommandQueue;
    private _webSettingsService: TFS_WebSettingsService.WebSettingsService;
    private _isVerifyMode: boolean;
    private _isUpdateVerifyBugWindowOpened: boolean;
    private _bugUnderVerificationClosed: boolean;
    private _verifyBugInfo: TestsOM.VerifyBugInfo;
    private _isSaveAndCloseClicked: boolean;
    // video private variables
    private _videoStoppedReason: RecorderStoppedReason;
    private _stopVideoProgressIndicator: number;
    private _videoAttachmentContainer: any;
    private _actionLogAttachmentContainer: IAttachmentInfo;
    private _videoState: RecorderState;
    private _actionLogState: RecorderState;
    private _maxLengthOfAttachmentNameShownInFooter: number = 35;
    private _videoRecordingControl: RecordingTimerControl;
    private _actionRecordingControl: BaseRecordingControl;
    private _stoppingDataCollectorControl: DataCollectorStoppingWithProgressMessage;
    private _postAutoStopCollectorsCallback: Function;
    private _teamId: string;
    private _isHandlePageUnloadProcessed: boolean;

    constructor(options?: any) {
        /// <summary>Construct the TestRunView object.</summary> 
        /// <param name="options" type="Object">the options for this control</param>
        super(options);
    }

    public initialize() {
        /// <summary>Initalilizes the control. Shows title of Test Run and options to mark pass and fail</summary>
        Diag.logTracePoint("TestRunView.initialize.start");
        let start: { testIndex: number; iterationIndex: number; },
            sessionStore;
        super.initialize();

        if (Utils_UI.BrowserCheckUtils.isLessThanOrEqualToIE9()) {
            sessionStore = window.sessionStorage;
        }
        else {
            sessionStore = window.opener.sessionStorage;
        }

        // updating min-width css to avoid white space issue when docking is enabled and resolution of machine is less then 1800px
        // bug id : 1429317
        this._updateCSSForTestRunnerScenario();

        // Check if runner is opened in Verify Mode.		
        if (sessionStore[verifyBugInfo]) {
            this._isVerifyMode = true;
            let verifyInfo = JSON.parse(sessionStore[verifyBugInfo]);
            this._verifyBugInfo = {
                id: verifyInfo.id,
                title: verifyInfo.title
            };
            this._isUpdateVerifyBugWindowOpened = false;
            this._bugUnderVerificationClosed = false;
            this._isSaveAndCloseClicked = false;
        }
        else {
            this._isVerifyMode = false;
        }

        //check If runner is needed team context to setup
        if (sessionStore[teamId]) {
            this._teamId = sessionStore[teamId];
        } else {
            this._teamId = Utils_String.empty;
        }

        // Obtain the TestRunAndResult object from the SessionStorage.
        if (sessionStore["testRun"]) {

            this._testRunAndResult = JSON.parse(sessionStore["testRun"]);

            this._testSuite = JSON.parse(sessionStore["testSuite"]);

            this._webSettingsService = TFS_OM_Common.ProjectCollection.getDefaultConnection().getService<TFS_WebSettingsService.WebSettingsService>(TFS_WebSettingsService.WebSettingsService);

            this._testRunAndResult = TestsOM.TestRunManager.createLocalObject(this._testRunAndResult);

            if (this._testRunAndResult.testPointToResume) {
                this._isResumeFlow = true;
            }

            this._commandQueue = new TestsOM.CommandQueue();

            // We will have different window size based on whether content is fitting. We calculate border size based on the default initial sizes. So we need to calculate border size before we call creation of SaveCloseToolbar.
            this._populateBorderSize(TMUtils.getDefaultSizeForTestRunWindow().width, TMUtils.getDefaultSizeForTestRunWindow().height);

            this._createSaveToolbar(this._testRunAndResult.bugCategoryName);

            // Create toolbar for providing pass and fail test buttons.
            this._createMenuBar();

            this._createStepsControl();

            start = this.findStartingIterationResult();

            this._saveCurrentAndSetActiveTestCaseAndIteration(start.testIndex, start.iterationIndex, () => {
                this._endLoadTestRunPerfScenario();
            }, true);

            // create test case navigator.
            this._createTestCasesNavigator();

            //if this is a single test case run, hide the navigation bar and make some other adjustments
            this._hideNavigationbarIfSingleTestCaseAndIteration();

            // The state of the prev, next buttons should be updated initially according to the current test/iteration and the total number of test/iteration.
            this._testCasesNavigator._updateNavigationToolbarCommandStates();

            this._createFooterSection();

            // Initialize Events.
            this._initializeEvents();

            if (TMUtils.isDataCollectionEnabled()) {
                // Initialize error section
                this._createInfoSection();

                // Initialize video section
                this._constructVideoControl();

                //Initialize action Log section
                this._constructActionLogControl();
            }

            new TestRunShortcutGroup(this);

            this._setMaxHeightOfStepControl();
        }
        else { // If the session storage variable testRun is not available. THe case is when the url of test run window has been copied and opened in some other window or tab.
            this._showError(Resources.CannotOpenTestRunError);
        }

        Diag.logTracePoint("TestRunView.initialize.complete");
    }

    private _updateCSSForTestRunnerScenario() {

        if (DesktopTestRunHelper.isRequestFromDtr()) {
            // update test run view 
            $(".test-run-view").css("min-width", "450px");

            // update footer section
            $(".test-run-footer").css({
                "min-width": "450px",
                "width": "100%"
            });
        }
    }

    private _setVerifyBugWindowOpened(): void {
        this._isUpdateVerifyBugWindowOpened = true;
    }

    private _getVerifyBugWindowOpened(): boolean {
        return this._isUpdateVerifyBugWindowOpened;
    }

    private _closeWindowOnBugVerification(): void {
        if (this._isUpdateVerifyBugWindowOpened && this._bugUnderVerificationClosed) {
            this._tryCallHandlePageUnload();
            window.close();
        }
    }

    private _createInfoSection(): void {
        let messageHeaderIcon: JQuery = $(domElem("div")).addClass("message-header-icon").append($(domElem("span")).addClass("bowtie-icon  bowtie-status-info"));
        let messageHeaderText: JQuery = $(domElem("div")).addClass("message-header-text").append($(domElem("span")).addClass("message-header-content"));
        let messageHeader: JQuery = $(domElem("div")).addClass("message-header");
        messageHeader.append(messageHeaderIcon);
        messageHeader.append(messageHeaderText);
        let closeIcon: JQuery = $(domElem("div")).addClass("close-action bowtie-icon bowtie-edit-delete propagate-keydown-event").attr("tabIndex", 0);
        closeIcon.click((event: JQueryEventObject) => {
            messageAreaControl.hide();
        });
        closeIcon.bind("keypress", (e: JQueryEventObject) => {
            return TMUtils.handleEnterKey(e, delegate(this, () => { messageAreaControl.hide(); }));
        });

        let messageAreaControl: JQuery = $(domElem("div")).addClass("runner-message-area-control closeable info-message");
        messageAreaControl.append(messageHeader);
        messageAreaControl.append(closeIcon);
        messageAreaControl.hide();
        $(".runner-message-holder").append(messageAreaControl);
    }

    private _showInfo(message): void {
        $(".runner-message-holder .runner-message-area-control .message-header-content").text(message);
        $(".runner-message-holder .runner-message-area-control").show();
    }

    private _cancelInfo(): void {
        $(".runner-message-holder .runner-message-area-control .message-header-content").text("");
        $(".runner-message-holder .runner-message-area-control").hide();
    }

    private _endLoadTestRunPerfScenario() {
        if (window.opener && window.opener.document) {
            let $parentWindowDocument = $(window.opener.document);

            let loadManualTestsPerfMarker = $parentWindowDocument.find("." + TMUtils.TcmPerfScenarios.LoadManualTestsPerfMarkerClass);

            if (loadManualTestsPerfMarker) {
                loadManualTestsPerfMarker.click();
            }
        }
    }

    private findStartingIterationResult(): { testIndex: number; iterationIndex: number; } {

        let i,
            iterationIndex: number,
            testCaseResult: TestsOM.TestCaseResult,
            testPoint: TestsOM.ITestPointModel = this._testRunAndResult.testPointToResume;

        if (!testPoint) {
            return { testIndex: 0, iterationIndex: 0 };
        }
        for (i = 0; i < this._testRunAndResult.testCaseResults.length; i++) {
            testCaseResult = this._testRunAndResult.testCaseResults[i];
            if (testCaseResult.configurationId === testPoint.configurationId &&
                testCaseResult.testCaseId === testPoint.testCaseId) {
                if (testCaseResult.iterations.getItems().length > 0) {
                    iterationIndex = this._findFirstActiveIterationIndex(testCaseResult);
                }
            }

            if (iterationIndex >= 0) {
                return { testIndex: i, iterationIndex: iterationIndex };
            }
        }
        return { testIndex: 0, iterationIndex: 0 };
    }

    private resumeIfPaused() {
        let testCaseResult = this._getActiveTestResult(),
            testResultOutcome,
            iterationResult = this._getActiveIterationResult();

        if (iterationResult.outcome === TCMConstants.TestOutcome.Paused) {
            TMUtils.setIterationResultOutcomeLocally(iterationResult, TCMConstants.TestOutcome.Unspecified);
            testResultOutcome = this.calculateTestResultFromIterationResults(testCaseResult.iterations);
            TMUtils.setTestResultOutcomeLocally(testCaseResult, testResultOutcome);
            this._onActiveTestResultOutComeUpdated(TCMConstants.TestOutcome.Unspecified);
            if (testCaseResult.isDataDriven()) {
                this._testCasesNavigator._updateOutcomeInTestCaseDropDown(this.getActiveTestResultIndex(), -1, testResultOutcome);
            }
        }
    }

    private _findFirstActiveIterationIndex(testCaseResult: TestsOM.TestCaseResult): number {
        let i: number,
            iteration;

        for (i = 0; i < testCaseResult.iterations.getItems().length; i++) {
            iteration = testCaseResult.iterations.getItems()[i];
            if (iteration.outcome !== TCMConstants.TestOutcome.Failed &&
                iteration.outcome !== TCMConstants.TestOutcome.Passed &&
                iteration.outcome !== TCMConstants.TestOutcome.Aborted &&
                iteration.outcome !== TCMConstants.TestOutcome.Blocked &&
                iteration.outcome !== TCMConstants.TestOutcome.NotApplicable) {
                return i;
            }
        }
        return -1;
    }

    public isAbortRequired() {

        let testCaseResults = this._testRunAndResult.testCaseResults,
            testCaseResult,
            i,
            areTherePausedTests = false,
            areThereIncompleteTests = false;

        for (i = 0; i < testCaseResults.length; i++) {
            testCaseResult = testCaseResults[i];
            if (testCaseResult.state === TCMConstants.TestResultState.Paused) {
                areTherePausedTests = true;
            }
            else if (testCaseResult.state !== TCMConstants.TestResultState.Completed) {
                areThereIncompleteTests = true;
            }
        }

        if (areTherePausedTests) {
            return false;
        }

        if (areThereIncompleteTests) {
            return true;
        }

        return false;
    }

    public initializeStepsListDataSource(flatStepResults: TestsOM.TestActionResult[]) {
        this._testStepsControl.setSource(flatStepResults);
    }

    public cacheSharedStepsWit(wits: TestsOM.SharedStepWorkItem[]): void {
        let i: number,
            len: number;

        for (i = 0, len = wits.length; i < len; i++) {
            // Caching work item data on key id
            this._sharedStepCache[wits[i].getId()] = wits[i];
        }
    }

    public showWorkItem(workItem, options?, preShowFunc?, postShowFunc?) {
        if ($.isFunction(preShowFunc)) {
            preShowFunc();
        }

        // Show work item.
        WITControls.WorkItemFormDialog.showWorkItem(workItem, options);

        if ($.isFunction(postShowFunc)) {
            postShowFunc();
        }
    }

    public isLastIterationInTestCaseResult() {
        let activeTestCaseResult = this._getActiveTestResult(),
            isLastIteration;

        isLastIteration = (this.getActiveTestIterationResultIndex() === (activeTestCaseResult.getIterationCount() - 1));
        return isLastIteration;
    }

    public isFirstIterationInTestCaseResult() {
        return (this.getActiveTestIterationResultIndex() === 0);
    }

    public isLastTestCaseResult() {
        let isLastTestCaseResult;

        isLastTestCaseResult = this.getActiveTestResultIndex() === (this._testRunAndResult.testCaseResults.length - 1);

        return isLastTestCaseResult;

    }

    public isFirstTestCaseResult() {
        return (this.getActiveTestResultIndex() === 0);
    }

    public getActiveTestResultIndex() {
        return this._activeTestCaseResultIndex;
    }

    public getActiveTestIterationResultIndex() {
        return this._activeIterationResultIndex;
    }

    public refreshUI(keepSelection?: boolean, isInitialization?: boolean) {
        let activeTestCaseResult = this._getActiveTestResult(),
            currentIteration,
            stepResults,
            that = this,
            selectedIndex = this._testStepsControl.getSelectedIndex();

        if (activeTestCaseResult && activeTestCaseResult.isReady) {
            currentIteration = this._getActiveIterationResult();
            stepResults = currentIteration.actionResults;

            this._updateTitle();

            this._updateTestResultOutComeToolBarStyle(currentIteration.outcome);

            this._displayTestResultCommentBoxIfNeeded();

            this._showDescriptionIfNeeded();

            this.initializeStepsListDataSource(TMUtils.getFlatSteps(stepResults.getItems()));

            if (this._testRunAndResult.testPointToResume && (!this._isEditingEnabledInResume || !this._getActiveTestResult().getIsLatestRevision())) {
                this._testStepsControl.blockInlineEditing();
            }
            else {
                this._testStepsControl.enableInlineEditing();
            }

            this._resizeCommentAreas();

            this._prepareAnchorTags();

            this._updateFooterInfo();

            if (keepSelection) {
                selectedIndex = (selectedIndex < 0) ? 0 : selectedIndex;
            }
            else {
                selectedIndex = 0;
            }
            this._testStepsControl.setAndFocusSelectedIndex(selectedIndex, 10, isInitialization);

            this._setMaxHeightOfStepControl();
        }
    }

    public updateStepOutcome(outcome: TCMConstants.TestOutcome) {
        if (this._testStepsControl) {
            this._testStepsControl.updateStepOutcome(outcome);
        }
    }

    /**
     * Open the search dialog box where we can select the bug to which we can update.
     */
    public addToExistingBug() {
        VSS.using(["TestManagement/Scripts/TFS.TestManagement.AddToExistingBug"], (Module: typeof AddToExistingBub_LAZY_LOAD) => {
            let testCase = this._getActiveTestCase();
            if (testCase === undefined) { return; }
            this._resizeWindowsToTheSizeOfAddToExistingBugDialog(Module.AddToExistingBugDialog.DIALOG_WIDTH, Module.AddToExistingBugDialog.DIALOG_HEIGHT);
            Dialogs.show(Module.AddToExistingBugDialog, $.extend(
                {
                    width: Module.AddToExistingBugDialog.DIALOG_WIDTH,
                    height: Module.AddToExistingBugDialog.DIALOG_HEIGHT,
                    minWidth: Module.AddToExistingBugDialog.DIALOG_WIDTH,
                    minHeight: Module.AddToExistingBugDialog.DIALOG_HEIGHT,
                    maxWidth: Module.AddToExistingBugDialog.MAX_DIALOG_WIDTH_RATIO * Module.AddToExistingBugDialog.DIALOG_WIDTH,
                    maxHeight: Module.AddToExistingBugDialog.MAX_DIALOG_HEIGHT_RATIO * Module.AddToExistingBugDialog.DIALOG_HEIGHT,
                    resizable: true,
                    cssClass: "add-to-existing-bug-dialogue",
                    areaPath: testCase.getAreaPath(),
                    populateWorkItemDelegate: delegate(this, this._populateWorkItem),
                    getBugDataDelegate: delegate(this, this._getBugData),
                    uploadSystemInfo: delegate(this, this._uploadSystemInformation),
                    resizeWindowDelegate: delegate(this, this._resizeWindowForBugForm),
                    getWorkItemOptions: delegate(this, this._getCreateBugOptions),
                    bugCategoryTypeName: this._bugCategoryTypeName
                }));
        });
    }

    public createBug() {
        let options,
            bugData = this._getBugData();

        DAUtils.trackAction("CreateBug", "/Execution");
        if (this._getActiveTestCase().hasError()) {
            alert(Resources.InvalidStepsErrorString);
            return;
        }

        options = this._getCreateBugOptions();

        // Create bug can be called only after the initialization of the Save/Close/CreateBug toolbar. 
        // So we can safely use the this._bugCategoryTypeName fetched at the time of creation of the SaveCloseCreateBug toobar.
        if (TMUtils.isDataCollectionEnabled()) {
            //Currently reusing the feature flag. Will discuss and change the name if required.
            this._createAndShowWorkItemWithSystemInfo(this._bugCategoryTypeName, options, bugData);
        }
        else {
            this._createAndShowWorkItem(this._bugCategoryTypeName, options, bugData);
        }
    }

    private _getCreateBugOptions() {
        return {
            save: () => {
                this._workItemSaved = true;
                this._stopVideo(RecorderStoppedReason.BugFiled);
                this._initiateActionLogUpload();
            },

            close: (workItem) => {
                this._restoreWindowSize();
                if (this._workItemSaved) {
                    this._onBugFiled(workItem);
                    this._workItemSaved = false;
                }
                else {
                    this.currentSystemInfoAttachment = null;
                }
            }
        };
    }

    private currentSystemInfoAttachment = null;

    private _createAndShowWorkItemWithSystemInfo(workItemTypeName, options?, bugData?, callback?) {
        SystemInfoCollectionHelper.SystemInformationDataCollection.getSystemInfo((systemInfo: any) => {
            if (systemInfo) {
                let localisedSysteInfo = SystemInfoCollectionHelper.SystemInfoHelper.getLocalisedSystemInfo(systemInfo);
                bugData[TestsOM.BugWITFields.SystemInfo] = SystemInfoCollectionHelper.SystemInfoHelper.getSysInfoHtml(localisedSysteInfo);
                try {
                    this._uploadSystemInformation(localisedSysteInfo);
                }
                catch (err) {
                    // Incase some error occurred in capturing system info from extension then lets nt break bug creation 
                    // hence catching it and setting currentSystemInfoAttachment = null;
                    Diag.logInfo("[uploadSystemInfo]: failed with error" + err);
                    this.currentSystemInfoAttachment = null;
                }
            }
            else {
                this.currentSystemInfoAttachment = null;
            }
            this._createAndShowWorkItem(this._bugCategoryTypeName, options, bugData);
        }, (error) => {
            //TODO: Add trace that SystemInfo capture failed this may be due to extension is not installed
            this._createAndShowWorkItem(this._bugCategoryTypeName, options, bugData);
        });
    }

    private _uploadSystemInformation(systemInfo: any) {

        if (systemInfo && systemInfo.id && systemInfo.content) {
            // encode URI component is required since in Japense build the base64encoder throws error. Refer
            //https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/btoa

            let systemInfoData = unescape(encodeURIComponent(systemInfo.content));
            let attachmentDetails = { attachmentType: "GeneralAttachment", comment: "", fileName: systemInfo.id, stream: Utils_String.base64Encode(systemInfoData) };
            let testRunId = this._getActiveTestResult().id.testRunId;
            let testResultId = this._getActiveTestResult().id.testResultId;
            let iterationId = this._getActiveIterationResult().iterationId;
            TMUtils.getTestResultManager().createTestIterationResultAttachment(attachmentDetails,
                testRunId,
                testResultId,
                iterationId,
                null,
                (attachment) => {
                    if (attachment) {
                        attachment.artifactUri = Utils_String.format("vstfs:///TestManagement/TcmResultAttachment/{0}.{1}.{2}", testRunId, testResultId, attachment.id);
                        this.currentSystemInfoAttachment = attachment;
                    }
                    else {
                        this.currentSystemInfoAttachment = null;
                    }
                },
                (error) => {
                    this.currentSystemInfoAttachment = null;
                });
        }
    }

    public saveActiveTestCaseAndResult(callback?: IResultCallback) {
        /// <summary>Update the active testCaseResult</summary>
        /// <param name="callback" type="IResultCallback" optional="true" >Function to be called after the saving is complete</param>
        let testCaseResult = this._getActiveTestResult(),
            iterationResult = this._getActiveIterationResult(),
            testCase: TestsOM.TestCase,
            isTestCaseDirty: boolean,
            dirtyTestCaseResults: TestsOM.TestCaseResult[] = [];

        if (testCaseResult) {
            this._testStepsControl.preSave();
            testCase = this._getActiveTestCase();
            isTestCaseDirty = testCase.getIsDirty();
            testCase.save(() => {

                // This is the scenarios when the test case result has been saved atleast once by the user. After that any change to test case
                // should save the result because the version of the test case changes with every successful save. The version will be picked
                // automatically from test case when the test case result is saved. This is just ensuring that the test case result is set to dirty so
                // the save indeed happens.
                if (testCaseResult.doesExistOnServer() && isTestCaseDirty) {
                    testCaseResult.setIsDirty(true);
                }
                if (isTestCaseDirty) {
                    // On saving of inline edit changes to the test case, we want to update the stepResults of all the iterations according to the new testcase version.
                    dirtyTestCaseResults = this._updateTestCaseResultsForAllConfigs(testCaseResult.testCaseId, testCaseResult.configurationId, this._getActiveIterationResult().iterationId);
                }

                //First save the current testCaseResult so that UI is updated. Then save for other configurations.
                this._saveTestCaseResult(testCaseResult, iterationResult, () => {
                    this.onActiveResultUpdated();
                    if (callback) {
                        callback();
                    }
                    if (isTestCaseDirty) {
                        // There is a possibility that saving the test case can cause the underlying data to be updated but the UI is not updated.
                        // In the case of textual changes, the only scneario is when we have same shared steps added multiple times in a test case.
                        // In that case, modifying one shared step should show the updated shared step. While this does seem corner now, this will
                        // be needed when we add support for adding/deleting steps. Instead of adding a complicated check to see if a test case has
                        // duplicate shared steps, have added code to refresh UI all the time when the test case changes.
                        this.refreshUI(true);
                    }
                    if (dirtyTestCaseResults.length > 0) {
                        this._saveTestCaseResults(dirtyTestCaseResults);
                    }
                });
            },
                (error) => {
                    let errors = [], errorText;
                    if (error) {
                        if (error.name === Exceptions.WorkItemBulkSaveException) {
                            $.each(error.results, function () {
                                if (this.error) {
                                    errors.push(Utils_String.format(Resources.TestCaseSaveErrorReasonFormat, VSS.getErrorMessage(this.error)));
                                }
                            });

                            if (confirm(Utils_String.format(Resources.TestCaseSaveError, errors.join("\r\n")))) {
                                this._refreshTest();
                            }
                        }
                        else {
                            alert(VSS.getErrorMessage(error));
                        }
                    }
                });
        }
        else {
            if (callback) {
                callback();
            }
        }
    }

    private _prepareAnchorTags(): void {
        $("a").attr("target", "_blank").attr("rel", "nofollow noopener noreferrer");

        $("a[href^=\"mailto:\"]").hover(
            (e) => {
                this._mailToLinkClick = true;
            },
            (e) => {
                this._mailToLinkClick = false;
            });
    }

    private _beginSaveRunWindowSize(runWindowSize: TestRunWindowSize, callback?: IResultCallback, errorCallback?: IErrorCallback) {
        let settingKey = this._getSettingKey();
        this._webSettingsService.beginWriteSetting(settingKey, Utils_Core.stringifyMSJSON(runWindowSize), TFS_WebSettingsService.WebSettingsScope.User, callback, errorCallback);
    }

    private _beginGetRunWindowSize(callback: IResultCallback, errorCallback?: IErrorCallback) {
        let settingKey = this._getSettingKey(),
            runWindowSize: TestRunWindowSize = null;

        this._webSettingsService.beginReadSetting(settingKey, TFS_WebSettingsService.WebSettingsScope.User, (runWindowSizeObject) => {
            let runWindowSizeString: string;
            if (callback && runWindowSizeObject) {
                runWindowSizeString = runWindowSizeObject.value;
                try {
                    runWindowSize = runWindowSizeString ? Utils_Core.parseMSJSON(runWindowSizeString, false) : null;
                }
                catch (e) {
                    runWindowSize = null;
                }

                callback(runWindowSize);
            }
        }, errorCallback);
    }

    private _getSettingKey(): string {
        return "/TestManagement/TestRunnerSize";
    }

    private _initializeEvents() {
        let index = 0,
            testCaseResult;

        // This handles cases of showing prompt when closing a dirty test result.                                                      
        if (DesktopTestRunHelper.isRequestFromDtr()) {
            DTRCloseEventHandler.registerForCloseEvent(delegate(this, this._beforePageUnload));
            DTRCloseEventHandler.registerForceCloseEvent(delegate(this, this._handlePageUnload));
        }
        else {
            $(window).bind("beforeunload", delegate(this, this._beforePageUnload));

            $(window).bind("unload", delegate(this, this._handlePageUnload));
        }
        $(window).bind("keydown", delegate(this, this._onKeyDown));
        $(window).bind("resize", delegate(this, this._onWindowResize));

        for (index = 0; index < this._testRunAndResult.testCaseResults.length; index++) {
            testCaseResult = this._testRunAndResult.testCaseResults[index];
            testCaseResult.attachEvent(TestsOM.TestCaseResult.EVENT_DIRTY_CHANGED, delegate(this, this._updateTitle));
        }
    }

    private _onWindowResize(e?: JQueryEventObject) {
        let runWindowSize = this._getWindowSize();
        this._setMaxHeightOfStepControl();
        this.cancelDelayedFunction("saveRunWindowSize");
        this.delayExecute("saveRunWindowSize", 100, true, () => {
            // _closeWindowOnBugVerification is callback executed only when Bug under verification is closed and the test runner also has to be closed.
            this._beginSaveRunWindowSize(runWindowSize, delegate(this, this._closeWindowOnBugVerification), $.noop);
        });
    }

    // Non chrome browser donot have good support for flex. So adding this fallback code which will calculate the
    // height of steps control and will be used in showing scroll bar when steps overflow height
    private _setMaxHeightOfStepControl(): void {
        if (!Utils_UI.BrowserCheckUtils.isChrome()) {
            let maxTop;
            let $commentContainer: JQuery = $(".test-result-comment-container");
            let $descriptionContainer: JQuery = $(".test-case-description-container");
            if ($descriptionContainer.is(":visible")) {
                maxTop = $descriptionContainer.position().top + $descriptionContainer.outerHeight();
            } else if ($commentContainer.is(":visible")) {
                maxTop = $commentContainer.position().top + $commentContainer.outerHeight();
            } else {
                let $testRunTitleContainer: JQuery = $(".testRunTitle");
                maxTop = $testRunTitleContainer.position().top + $testRunTitleContainer.outerHeight();
            }

            let $footerContainer = $(".test-run-footer");
            let maxBottom = $footerContainer.position().top;

            let $stepContainer = $(".test-run-steps-list");
            let maxHeight = (maxBottom - maxTop).toString();
            $stepContainer.css("max-height", maxHeight + "px");
        }
    }

    private _onKeyDown(e?: JQueryEventObject) {

        switch (e.keyCode) {
            case Utils_UI.KeyCode.LEFT:
                if (e.altKey) {
                    this._testCasesNavigator.moveToPrev();
                }
                break;

            case Utils_UI.KeyCode.RIGHT:
                if (e.altKey) {
                    this._testCasesNavigator.moveToNext();
                }
                break;

            case 66: // B
                if (e.altKey && e.shiftKey) {
                    this._updateActiveResultOutcome(TCMConstants.TestOutcome.Blocked);
                }
                break;

            case 70: //F
                if (e.altKey && e.shiftKey) {
                    this._updateActiveResultOutcome(TCMConstants.TestOutcome.Failed);
                }
                break;

            case 78: //N
                if (e.altKey && e.shiftKey) {
                    this._updateActiveResultOutcome(TCMConstants.TestOutcome.NotApplicable);
                }
                break;

            case 80: //P
                if (e.altKey && e.shiftKey) {
                    this._updateActiveResultOutcome(TCMConstants.TestOutcome.Passed);
                }
                break;

            case 83: //S
                if (Utils_UI.KeyUtils.isExclusivelyCtrl(e)) {
                    this.saveActiveTestCaseAndResult();
                    return false;
                }
                break;

            case 85: //U
                if (e.altKey && e.shiftKey) {
                    this._updateActiveResultOutcome(TCMConstants.TestOutcome.Paused);
                }
                break;
        }

    }

    private _handlePageUnload() {
        if (this._isHandlePageUnloadProcessed) {
            return;
        }

        if (this._isVideoInProgress()) {
            TelemetryService.publishEvents(TelemetryService.featureClosedRunnerDuringScreenRecording, {});
        }

        let ajaxOption = { async: false };

        TMUtils.getTestRunManager().end(this._testRunAndResult.testRun, $.noop, $.noop, ajaxOption);
        if (this.resumeTestSessionAfterClose) {
            if (Utils_UI.BrowserCheckUtils.isLessThanOrEqualToIE9()) {
                window.sessionStorage.setItem("resumeTestSessionAfterClose", "true");
            }
            else {
                window.opener.sessionStorage.setItem("resumeTestSessionAfterClose", "true");
            }
        }

        this._refreshTestPointsInParentWindow();
        if (Utils_UI.BrowserCheckUtils.isLessThanOrEqualToIE9()) {
            window.sessionStorage.removeItem("testRun");
            window.sessionStorage.removeItem("verifyBugInfo");
        }
        else {
            window.opener.sessionStorage.removeItem("testRun");
            window.opener.sessionStorage.removeItem("verifyBugInfo");
        }

        if (this._isVerifyMode && !this._isSaveAndCloseClicked) {
            if (this._verifyBugInfo.id) {
                let alertMessageText = Utils_String.format(Resources.PromptUpdateAfterBugVerificationComplete, this._verifyBugInfo.id);
                window.opener.alert(alertMessageText);
            }
        }

    }

    private _refreshTestPointsInParentWindow() {
        let $parentWindowDocument: JQuery,
            $menuItem: JQuery;
        if (window.opener && window.opener.document) {
            $parentWindowDocument = $(window.opener.document);

            // Kludge: This is dependent on the implementation of menu item. We are using the exact dom element type because if
            // we do not specify that then the search can be very slow. Now it is limited to list items containing the attribute.
            $menuItem = TMUtils.getRefreshMenuItem($parentWindowDocument);
            if ($menuItem) {
                $menuItem.click();
            }

            // Following the same approach what we have today in Test Hub
            let $testAnnotationRefresh = $parentWindowDocument.find(".test-list");
            if ($testAnnotationRefresh && this._testSuite) {
                window.opener.sessionStorage["requirementId"] = this._testSuite.requirementId;
                $testAnnotationRefresh.click();
            }
        }
    }

    private _beforePageUnload(event: any) {
        let confirmationMessage: string;
        let testCaseResult = this._getActiveTestResult(),
            testCase = this._getActiveTestCase();

        if (!this._mailToLinkClick) {

            if (this._actionLogState === RecorderState.InProgress) {
                TelemetryService.publishEvents(TelemetryService.featureClosingRunnerDuringActionRecording, {});
            }

            if (this._isVideoInProgress()) {
                TelemetryService.publishEvents(TelemetryService.featureClosingRunnerDuringScreenRecording, {});
            }

            if (this._areDataCollectorsInProgress()) {
                if (testCaseResult.getIsDirty() || testCase.getIsDirty()) {
                    confirmationMessage = Resources.UnSavedDataAndRecording;
                }
                else {
                    confirmationMessage = Resources.UnSavedRecording;
                }
            }
            else if (testCaseResult.getIsDirty() || testCase.getIsDirty()) {
                confirmationMessage = Resources.UnsavedChanges;
            }
        }
        if (DesktopTestRunHelper.isRequestFromDtr()) {
            if (confirmationMessage) {
                DTRCloseEventHandler.triggerBeforePageUnloadConfirmation(confirmationMessage);
            } else {
                DTRCloseEventHandler.triggerCloseFromTestRunner(delegate(this, this._handlePageUnload), true);
            }

        } else {
            event.returnValue = confirmationMessage;
        }
        return confirmationMessage;
    }

    private _hideNavigationbarIfSingleTestCaseAndIteration() {
        if (this._testRunAndResult.testCaseResults.length === 1 && !this._testRunAndResult.testCaseResults[0].isDataDriven()) {
            this._testCasesNavigator.hideElement();
            this._setMaxHeightOfStepControl();
        }
    }

    private _createTestCasesNavigator() {
        let i;
        this._testCasesNavigator = <TestCaseNavigator>Controls.Enhancement.enhance(TestCaseNavigator, ".test-case-navigator", { testCaseResults: this._testRunAndResult.testCaseResults });

        this._testCasesNavigator.movePrevEvent = (callback) => {
            this._moveToPrevious(callback);
        };

        this._testCasesNavigator.moveNextEvent = (callback) => {
            this._moveToNext(callback);
        };

        this._testCasesNavigator.canMovePrevDelegate = () => {
            return this._canMoveToPrevious();
        };

        this._testCasesNavigator.canMoveNextDelegate = () => {
            return this._canMoveToNext();
        };

        this._testCasesNavigator.moveToTestCaseAndIterationEvent = (testResultIndex, testIterationIndex, callback) => {
            this._moveToTestCaseAndIteration(testResultIndex, testIterationIndex, callback);
        };

        this._testCasesNavigator.getActiveTestResultIndexDelegate = () => {
            return this.getActiveTestResultIndex();
        };

        this._testCasesNavigator.getActiveTestIterationIndexDelegate = () => {
            return this.getActiveTestIterationResultIndex();
        };

        this._testCasesNavigator._updateToolbarUI();
        this._registerToResize(".test-case-navigator");

        this._beginGetRunWindowSize((runWindowSize: TestRunWindowSize) => {
            if (runWindowSize === null || runWindowSize.width <= 0 || runWindowSize.height <= 0) {
                this._resizeWindowIfToolbarsDoesNotFit();
            }
            else {
                let newHeight = runWindowSize.height;
                let newWidth = runWindowSize.width;
                // adding this check to fit the size of window so that all toolbar options are visible 
                if (newWidth < this._windowWidthRequiredToFitAll) {
                    newWidth = this._windowWidthRequiredToFitAll;
                }

                window.resizeTo(newWidth, newHeight);
            }
        },
            () => {
                this._resizeWindowIfToolbarsDoesNotFit();
            });

    }

    private _resizeWindowIfToolbarsDoesNotFit() {
        /// <summary>Resizes the window so that all the registered toolbar are completely visible</summary>
        /// <param name="toolbarSelector" type="Object">The toolbar class name which can be used as selector name</param>
        let userAgent = window.navigator.userAgent.toLowerCase();
        if ($(window).width() < this._windowWidthRequiredToFitAll) {
            window.resizeTo(this._windowWidthRequiredToFitAll, window.screen.availHeight);

            // There is an issue in IE where the border size change on change of width. So re-populating the border size after changing the size of the window. 
            // And in chrome the problem is opposite. So the border size should not be repopulated in Chrome.
            if (userAgent.indexOf("chrome") === -1) {
                this._populateBorderSize(this._windowWidthRequiredToFitAll, window.screen.availHeight);
            }
        }

    }

    private _registerToResize(toolbarClassSelector) {
        /// <summary>registers the toolbar so that it will be visible when _resizeWindowIfToolbarsDoesNotFit is called </summary>
        /// <param name="toolbarSelector" type="Object">The toolbar which needs to be registered to resizing if its getting cut</param>
        let toolbar = $(toolbarClassSelector),
            toolBarItems = $(toolbar).find(".menu-item"),
            numberOfbuttons = toolBarItems.length,
            lastButton,
            lastButtonLeftPos,
            lastButtonWidth,
            rightPosForToolbar,
            toolbarMinWidth = parseInt($(toolbar).css("min-width"), 10);

        if (numberOfbuttons) {
            if (toolbarMinWidth) {
                rightPosForToolbar = toolbarMinWidth;
            }
            else {

                lastButton = $(toolbar).find(".menu-item")[numberOfbuttons - 1];
                lastButtonLeftPos = $(lastButton).position().left;
                lastButtonWidth = $(lastButton).outerWidth();

                rightPosForToolbar = lastButtonLeftPos + lastButtonWidth;
            }

            // 30 px for leaving space visible after the toolbar
            rightPosForToolbar += 30;
            if (this._windowWidthRequiredToFitAll < rightPosForToolbar) {
                this._windowWidthRequiredToFitAll = rightPosForToolbar;
            }
        }

    }

    private _createTestResultCommentBox() {
        if (!this._commentManager) {
            //Initialize the comment manager and create the comment text area 
            this._commentManager = new CommentBoxManager(".test-result-comment-textarea", ".test-result-comment-container", 95, true);
            this._$testResultCommentContainer = this._element.find(".test-result-comment-container");
            this._commentManager.createCommentTextArea(this._$testResultCommentContainer, "test-result-comment-textarea", this._getActiveIterationResult().comment, null, Resources.TestResultCommentContainer, MAX_RESULT_COMMENT_SIZE);
            this._$testResultCommentContainer.hide();
            this._$testResultCommentTextArea = this._$testResultCommentContainer.find(".test-result-comment-textarea");

            //Bind the events for keyup, paste, fireCommentChange and resize for the Comment text area
            this._commentManager._fireCommentChangeEvent = (commentText) => {
                this._setTestCaseCommentEvent(commentText);
            };
            this._bind(this._$testResultCommentContainer, "keyup", delegate(this._commentManager, this._commentManager._onKeyUp));
            this._bind(this._$testResultCommentContainer, "paste", delegate(this._commentManager, this._commentManager._onPaste));
            this._bind(this._$testResultCommentTextArea, "TextAreaResized", delegate(this, this._onTestResultCommentResized));
            this._bind(this._$testResultCommentContainer, "focusout", delegate(this._commentManager, this._commentManager._onFocusOut));
            this._bind(this._$testResultCommentTextArea, "drop", delegate(this, this._onTextDropOverTestResultCommentBox));
        }
    }

    private _onTextDropOverTestResultCommentBox(e?: JQueryEventObject) {
        e.stopPropagation();
        e.preventDefault();
    }

    private _onTestResultCommentResized(e?: any) {
        if (this._$testResultCommentContainer.is(":visible")) {
            this._setMaxHeightOfStepControl();
        }
    }

    private _setTestCaseCommentEvent(commentText: string) {
        let activeIterationResult = this._getActiveIterationResult();
        if (activeIterationResult && activeIterationResult.comment !== commentText) {
            activeIterationResult.comment = commentText;
            activeIterationResult.setIsDirty(true);
            // Update the title to shoow the testResult dirty status
            this.onActiveResultUpdated();
        }
    }

    public onActiveResultUpdated() {
        this._updateTitle();
        let testCaseResult = this._getActiveTestResult();
        if (testCaseResult.getIsDirty()) {
            this.resumeIfPaused();
        }
    }

    private _displayTestResultCommentBoxIfNeeded() {
        if (!this._getActiveIterationResult().comment) {
            this._clearTestResultCommentBoxContents();
            this._hideTestResultCommentBox();
        }
        else {
            this._showTestResultCommentBox();
        }
    }

    private _showTestResultCommentBox() {
        if (this._$testResultCommentTextArea && this._$testResultCommentContainer) {
            this._$testResultCommentTextArea.val(this._getActiveIterationResult().comment);
            this._$testResultCommentContainer.show();
            // On the resize of the text area, the TextAreaResized event handler takes care of the layout.
            this._commentManager.resizeTextArea(this._$testResultCommentTextArea[0]);
        }
    }

    private _showAndFocusTestResultCommentBox() {
        DAUtils.trackAction("AddTestResultComment", "/Execution");
        this._showTestResultCommentBox();
        this._$testResultCommentTextArea.focus();
        TelemetryService.publishEvents(TelemetryService.featureAddTestResultComment, {});
    }

    private _hideTestResultCommentBox() {
        let stepsControlTopPosition;
        if (this._$testResultCommentTextArea && this._$testResultCommentContainer) {
            if (this._$testResultCommentContainer.is(":visible")) {
                this._$testResultCommentContainer.hide();
                this._setMaxHeightOfStepControl();
            }
        }
    }

    private _clearTestResultCommentBoxContents() {
        if (this._$testResultCommentTextArea && this._$testResultCommentContainer) {
            this._$testResultCommentTextArea.val("");
        }
    }
    private _createDescriptionToggleButton() {
        let $separator: JQuery = this._element.find(".testcase-title-separator-icon");
        let $descriptionToggleButton: JQuery = this._element.find(".testcase-description-toggle-btn");

        $separator.addClass("icon bowtie-icon bowtie-separator");
        $descriptionToggleButton.html("<span class=\"icon bowtie-icon bowtie-file-content testcase-description-toggle-icon\" > </span>");
    }

    private _createDescriptionBox() {
        this._createDescriptionToggleButton();

        this._$testCaseDescriptionContainer = this._element.find(".test-case-description-container");
        this._$testCaseDescriptionContainer.hide();
        this._$testCaseDescriptionTextArea = this._element.find(".testcase-description-text-area");

        let $testcaseDescriptionLabel = this._element.find(".testcase-description-label");
        $testcaseDescriptionLabel.first().text(Resources.TestCaseDescriptionLabel);
        let $descriptionToggleButton = this._element.find(".testcase-description-toggle-btn");
        $descriptionToggleButton.attr("aria-pressed", "false").attr("aria-label", Resources.ShowDescriptionText);

        this._unbind($descriptionToggleButton, "click");
        this._bind($descriptionToggleButton, "click", delegate(this, this._toggleShowingDescriptionBox));
        this._bind($descriptionToggleButton, "keypress", (e: JQueryEventObject) => {
            return TMUtils.handleEnterKey(e, delegate(this, this._toggleShowingDescriptionBox));
        });
        this._testCaseDescriptionButtonTooltip = RichContentTooltip.add(Resources.ShowDescriptionText, $descriptionToggleButton[0]);
    }

    private _toggleShowingDescriptionBox() {
        let $descriptionToggleButton = this._element.find(".testcase-description-toggle-btn");
        if ($descriptionToggleButton.hasClass("active")) {
            this._hideDescriptionBox();
        } else {
            this._showDescriptionBox();
        }
        this._setMaxHeightOfStepControl();
    }

    private _showDescriptionBox() {
        let $descriptionToggleButton = this._element.find(".testcase-description-toggle-btn");
        if (this._$testCaseDescriptionTextArea && this._$testCaseDescriptionContainer) {
            this._fillDescriptionBox();
            this._$testCaseDescriptionContainer.show();
            $descriptionToggleButton.addClass("active");
            $descriptionToggleButton.attr("aria-pressed", "true").attr("aria-label", Resources.HideDescriptionText);
            this._testCaseDescriptionButtonTooltip.setTextContent(Resources.HideDescriptionText);
        }
        TelemetryService.publishEvents(TelemetryService.featureViewDescriptionInWebRunner, {});
    }

    private _hideDescriptionBox() {
        let $descriptionToggleButton = this._element.find(".testcase-description-toggle-btn");
        if (this._$testCaseDescriptionTextArea && this._$testCaseDescriptionContainer) {
            if (this._$testCaseDescriptionContainer.is(":visible")) {
                this._$testCaseDescriptionContainer.hide();
                $descriptionToggleButton.removeClass("active");
                $descriptionToggleButton.attr("aria-pressed", "false").attr("aria-label", Resources.ShowDescriptionText);
                this._testCaseDescriptionButtonTooltip.setTextContent(Resources.ShowDescriptionText);
            }
        }
    }

    private _fillDescriptionBox() {
        let testCase = this._getActiveTestCase();
        let testcaseDescription = HtmlNormalizer.normalize(testCase.getDescription());
        if (!testcaseDescription || testcaseDescription === "") {
            let $noDescriptionWaterMark = $("<div class='description-watermark'> </div>");
            $noDescriptionWaterMark.text(Resources.NoDescriptionText);
            this._$testCaseDescriptionTextArea.empty().append($noDescriptionWaterMark);
        } else {
            this._$testCaseDescriptionTextArea.html(testcaseDescription);
        }
    }

    private _showDescriptionIfNeeded() {
        let $descriptionToggleButton = this._element.find(".testcase-description-toggle-btn");
        if ($descriptionToggleButton.hasClass("active")) {
            this._showDescriptionBox();
        } else {
            this._hideDescriptionBox();
        }
    }

    private _createStepsControl() {
        this._testStepsControl = <TestStepsList>Controls.Enhancement.enhance(TestStepsList, ".test-run-steps-list");

        this._testStepsControl.selectionChanged = (newIndex: number) => {
            this.selectionChanged(newIndex);
        };

        this._testStepsControl._getActiveIterationResultEvent = () => {
            return this._getActiveIterationResult();
        };

        this._testStepsControl._setStepResultOutComeEvent = (stepResult, outCome) => {
            this._setStepResultOutCome(stepResult, outCome);
        };
        this._testStepsControl._setStepCommentEvent = (stepResult, stepComment) => {
            this._setStepComment(stepResult, stepComment);
        };
        this._testStepsControl._setStepResultAttachmentEvent = (stepResult, attachments) => {
            this._setStepResultAttachment(stepResult, attachments);
        };

        this._testStepListController = new TestStepListController(this._testStepsControl);
        this._testStepListController.stepChanged = (id: number, parentId: number) => {
            this._onStepChanged(id, parentId);
        };
        this._testStepListController.stepMoved = (stepResult, direction) => {
            this._onStepMoved(stepResult, direction);
        };
        this._testStepListController.stepDeleted = (id: number, parentId: number) => {
            this._onStepDeleted(id, parentId);
        };
        this._testStepListController.stepInserted = (id: number, parentId: number, newStepId: number) => {
            this._onStepInsert(id, parentId, newStepId);
        };
        this._testStepListController.getActiveTestIterationIndexDelegate = () => {
            return this.getActiveTestIterationResultIndex();
        };
        this._testStepListController.getActiveTestIterationResultDelegate = () => {
            return this._getActiveIterationResult();
        };
    }

    private selectionChanged(newIndex: number): void {
        let step = this._testStepsControl.getItem(newIndex);
        if (step instanceof TestsOM.TestStepResult) {
            this._updateMenuItemState(this._saveResultToolbarItemsIds.captureScreenShot, false);
        } else {
            this._updateMenuItemState(this._saveResultToolbarItemsIds.captureScreenShot, true);
        }
    }

    private _moveStep(stepResult: TestsOM.TestActionResult, direction: string): TestsOM.MoveCommand {
        let currentIteration: TestsOM.TestIterationResult = this._getActiveIterationResult(),
            stepResults: TestsOM.TestActionResultCollection = currentIteration.actionResults,
            index: number,
            toIndex: number,
            stepsSwapped: boolean,
            testCase: TestsOM.TestCase = this._getActiveTestCase(),
            testCaseResult: TestsOM.TestCaseResult = this._getActiveTestResult(),
            iterationResult: TestsOM.TestIterationResult = this._getActiveIterationResult(),
            command: TestsOM.MoveCommand;

        index = stepResults.getStepResultIndex(stepResult);

        if (index !== -1) {
            toIndex = (direction === TestStepsList.TestStepMovedDirection.UP) ? index - 1 : index + 1;
            stepsSwapped = testCase.swapTestSteps(index, toIndex, stepResult.parentId);
            if (stepsSwapped) {
                command = new TestsOM.MoveCommand(index, toIndex, stepResult.parentId);
                testCaseResult.swapTestSteps(index, toIndex, stepResult.parentId, iterationResult.iterationId);
                return command;
            }
        }
    }

    private _onStepMoved(stepResult, direction) {
        let command = this._moveStep(stepResult, direction);
        this._onStepResultModified(command, stepResult);
    }

    private _onStepDeleted(id: number, parentId: number) {
        let command = new TestsOM.DeleteCommand(id, parentId);
        this._removeStepResult(id, parentId);
        this._onStepResultModified(command);
    }

    private _onStepChanged(id: number, parentId: number) {
        let iterationId: number = this._getActiveIterationResult().iterationId,
            command: TestsOM.EditSharedStepCommand;

        if (parentId && parentId > 0) {
            command = new TestsOM.EditSharedStepCommand(id, parentId);
            this._getActiveTestResult().handleStepChanged(id, parentId, iterationId);
            if (!this._commandQueue.contains(command)) {
                this._commandQueue.insert(command);
            }
        }
        this.onActiveResultUpdated();
    }

    private _onStepInsert(id: number, parentId: number, newStepId: number) {
        let command = new TestsOM.InsertCommand(id, parentId, newStepId),
            stepResult: TestsOM.TestActionResult;
        this._insertStepResult(id, parentId, newStepId);
        stepResult = TMUtils.getTestActionResult(this._getActiveIterationResult(), newStepId, parentId);
        this._onStepResultModified(command, stepResult);
    }

    private _insertStepResult(actionId: number, parentId: number, newStepId: number) {
        let iterationId: number = this._getActiveIterationResult().iterationId;
        this._getActiveTestResult().insertStepResult(iterationId, actionId, parentId, newStepId);
    }

    private _removeStepResult(actionId: number, parentId: number) {
        let iterationId: number = this._getActiveIterationResult().iterationId;
        this._getActiveTestResult().removeStepResult(iterationId, actionId, parentId);
    }

    private _onStepResultModified(command: TestsOM.Command, stepResult?: TestsOM.TestActionResult) {
        this._commandQueue.insert(command);
        this._refreshTestStepListUI(command, stepResult);
        this.onActiveResultUpdated();
    }

    private _refreshTestStepListUI(command?: TestsOM.Command, stepResult?: TestsOM.TestActionResult) {
        let stepResults: TestsOM.TestStepResult[] = this._getActiveIterationResult().actionResults.getItems(),
            selectedIndex: number,
            commandArgs: any,
            flatStepResults: TestsOM.TestActionResult[],
            flatStepResultsCount;

        selectedIndex = this._testStepsControl.getSelectedIndex();

        flatStepResults = TMUtils.getFlatSteps(stepResults);
        flatStepResultsCount = flatStepResults.length;
        this.initializeStepsListDataSource(flatStepResults);
        this._prepareAnchorTags();
        selectedIndex = (selectedIndex < 0) ? 0 : selectedIndex;
        selectedIndex = (selectedIndex >= flatStepResultsCount) ? flatStepResultsCount - 1 : selectedIndex;

        this._resizeCommentAreas();

        if (command && !(command instanceof TestsOM.DeleteCommand)) {
            this._testStepsControl.showStepResultInEditMode(stepResult, true);
        }
        else {
            this._testStepsControl.setAndFocusSelectedIndex(selectedIndex, 10);
        }

        this._testStepsControl.showErrorDivForParameterizedSteps(flatStepResults);
    }

    private _resizeCommentAreas() {
        let that = this;

        this._element.find(this._testStepsControl._commentClassSelector)
            .each(function (i, item) {
                that._testStepsControl._commentManager.resizeTextArea(item);
            });
    }

    private _beginFetchTestCase(testCaseId: number, testCaseResult: TestsOM.TestCaseResult, callback: (testCase: TestsOM.TestCase) => void) {
        if (!this._idToTestCaseMap[testCaseId]) {
            this._beginGetTestCase(testCaseId, testCaseResult.testCaseRevision, (testCase: TestsOM.TestCase) => {

                this._beginFetchSharedStepsInTestCase(testCase, testCaseResult, (testCase) => {
                    // Cache it for future use.
                    this._idToTestCaseMap[testCaseId] = testCase;
                    callback(testCase);
                });
            },
                (error) => {
                    this._showError(VSS.getErrorMessage(error));
                });
        }
        else {
            callback(this._idToTestCaseMap[testCaseId]);
        }
    }

    private _beginGetTestCase(testCaseId: number, testCaseRevision: number, callback: (testCase: TestsOM.TestCase) => void, errorCallback: IErrorCallback) {
        if (!this._isResumeFlow) {

            TMUtils.TestCaseUtils.beginGetTestCases([testCaseId], [], (testCases) => {
                if (callback) {
                    callback(testCases[0]);
                }
            },
                errorCallback);
        }
        else {
            let fields = TestsOM.TestBase.TestCaseCoreFields;
            fields.push(WITConstants.CoreFieldRefNames.AreaPath);
            // We need to make 2 calls here to get the latest version and to get workitem by revision. The reason behind this is to compare 
            // whether we are working on the stale copy of work item or the latest.
            WITUtils.getWorkItemStore().beginGetWorkItems([testCaseId], (workItems) => {
                WITUtils.getWorkItemStore().beginPageWorkItemsByIdRev([testCaseId], [testCaseRevision], fields, (pagedData) => {
                    if (pagedData) {
                        TMUtils.TestCaseUtils.beginParseTestCaseDataFromPayload(pagedData.rows, pagedData.columns, (testcases) => {
                            if (callback && testcases && testcases.length > 0) {
                                let testcase: TestsOM.TestCase = testcases[0];
                                testcase.setWorkItemWrapper(new TestsOM.WorkItemWrapper(workItems[0]));
                                callback(testcases[0]);
                            }
                        });
                    }
                },
                    errorCallback);
            }, errorCallback);
        }
    }

    private _beginFetchSharedStepsInTestCase(testCase: TestsOM.TestCase, testCaseResult: TestsOM.TestCaseResult, callback: (testCase: TestsOM.TestCase) => any) {
        let rows,
            sharedStepIdAndRevs: TestsOM.IdAndRevision[],
            sharedStepIdAndRevsToFetch: TestsOM.IdAndRevision[],
            ids: number[];

        // Load all the shared steps that are in the test cases that are loaded.
        sharedStepIdAndRevs = TMUtils.TestCaseResultUtils.getSharedStepIdAndRevs(testCase, testCaseResult);
        sharedStepIdAndRevsToFetch = this.getSharedStepIdAndRevsToFetch(sharedStepIdAndRevs);
        ids = TMUtils.getIdsFromIdAndRevs(sharedStepIdAndRevs);
        if (sharedStepIdAndRevsToFetch.length > 0) {
            return this.fetchSharedSteps(sharedStepIdAndRevsToFetch, () => {
                this.mergeSharedStepParametersAndData(testCase, ids);
                testCase.setSharedStepWorkItemInTestCase(this._sharedStepCache);
                if (callback) {
                    callback(testCase);
                }
            });
        }
        else {
            if (sharedStepIdAndRevs.length > 0) {
                this.mergeSharedStepParametersAndData(testCase, ids);
                testCase.setSharedStepWorkItemInTestCase(this._sharedStepCache);
            }

            if (callback) {
                callback(testCase);
            }
        }
    }

    private mergeSharedStepParametersAndData(testCase: TestsOM.TestCase, sharedStepList: number[]) {
        let testCaseId,
            i = 0,
            parametersData,
            sharedStep;

        // For each test case that has shared step with parameters, merge the shared step 
        // parameters with test case parameters and reparse the parameter data.
        if (sharedStepList) {
            for (i = 0; i < sharedStepList.length; i++) {
                sharedStep = this._sharedStepCache[sharedStepList[i]];
                TMUtils.SharedStepUtils.mergeSharedStepParamDataWithTestCase(testCase, sharedStep);
            }
        }
    }

    private getSharedStepIdAndRevsToFetch(sharedStepIdAndRevs: TestsOM.IdAndRevision[]): TestsOM.IdAndRevision[] {
        let sharedStepIdsToFetch: TestsOM.IdAndRevision[] = [];
        if (sharedStepIdAndRevs) {
            $.each(sharedStepIdAndRevs, (index, item) => {
                if (!this._sharedStepCache[item.id]) {
                    sharedStepIdsToFetch.push(item);
                }
            });
        }

        return sharedStepIdsToFetch;
    }

    private fetchSharedSteps(sharedStepIdAndRevs: TestsOM.IdAndRevision[], callback: () => any) {
        let ids: number[] = TMUtils.getIdsFromIdAndRevs(sharedStepIdAndRevs);

        if (ids.length > 0) {
            this._beginGetSharedSteps(ids, sharedStepIdAndRevs, () => {
                if (callback) {
                    callback();
                }
            },
                (error) => {
                    this._showError(VSS.getErrorMessage(error));
                });
        }
        else {
            if (callback) {
                callback();
            }
        }
    }

    private _beginGetSharedSteps(idsToFetch: number[], sharedStepIdAndRevs: TestsOM.IdAndRevision[], callback: () => any, errorCallback: IErrorCallback) {

        if (!this._isResumeFlow) {
            TMUtils.TestCaseUtils.beginGetSharedSteps(idsToFetch, (wits: TestsOM.SharedStepWorkItem[]) => {
                this.cacheSharedStepsWit(wits);
                if (callback) {
                    callback();
                }
            },
                errorCallback);
        }
        else {
            let fields = TestsOM.TestBase.SharedStepCoreFields;
            let revisions: number[] = TMUtils.getRevisionsFromIdAndRevs(sharedStepIdAndRevs);
            WITUtils.getWorkItemStore().beginGetWorkItems(idsToFetch, (workitems: WITOM.WorkItem[]) => {
                WITUtils.getWorkItemStore().beginPageWorkItemsByIdRev(idsToFetch, revisions, fields, (pagedData) => {
                    if (pagedData) {
                        let sharedSteps: TestsOM.SharedStepWorkItem[] = TMUtils.SharedStepUtils.parseSharedStepDataFromPayload(pagedData.rows, pagedData.columns);
                        for (let i = 0; i < sharedSteps.length; i++) {
                            for (let j = 0; j < workitems.length; j++) {
                                if (sharedSteps[i].getId() === workitems[j].id) {
                                    sharedSteps[i].setWorkItemWrapper(new TestsOM.WorkItemWrapper(workitems[j]));
                                    break;
                                }
                            }
                        }
                        this.cacheSharedStepsWit(sharedSteps);
                        if (callback) {
                            callback();
                        }
                    }
                },
                    errorCallback);
            }, errorCallback);
        }

    }

    private _prepareTestCaseResultsForCompletedConfigs(testCase: TestsOM.TestCase) {
        // For all the configs of the testcase which were loaded in the run and exist on the server(the ones which were completed during pause session) prepare the testCaseResults.
        let testCaseResults: TestsOM.TestCaseResult[],
            i: number, length: number,
            testCaseResult: TestsOM.TestCaseResult;

        testCaseResults = this._getTestCaseResultsForAllConfigurations(testCase.getId());
        length = testCaseResults.length;
        for (i = 0; i < length; i++) {
            testCaseResult = testCaseResults[i];
            if (!testCaseResult.isReady && testCaseResult.doesExistOnServer()) {
                // In Resume, the testcaseResults which were fetched from the server but are not yet ready, populate iterations and stepResults so that these can be updated according to the new test case. 
                this._createIterationResults(testCaseResult, testCase);
            }
        }
    }

    private _beginCreateIterationResultsIfNotCreated(testCaseResult: TestsOM.TestCaseResult, callback: () => void) {
        if (!testCaseResult.isReady) {

            // This means the test case is not yet fetched for this test case result and iterations are not created.
            this._beginFetchTestCase(testCaseResult.testCaseId, testCaseResult, (testCase: TestsOM.TestCase) => {
                this._createIterationResults(testCaseResult, testCase);
                if (this._isResumeFlow) {
                    this._prepareTestCaseResultsForCompletedConfigs(testCase);
                }
                callback();
            });
        }
        else {
            callback();
        }
    }

    private _createIterationResults(testCaseResult: TestsOM.TestCaseResult, testCase: TestsOM.TestCase) {

        this._prepareIterationResultsAndStepResults(testCaseResult, testCase);

        testCaseResult.setTestCase(testCase);

        // Create test result comment box.
        this._createTestResultCommentBox();

        // Create test case description box
        this._createDescriptionBox();

        Diag.logTracePoint("TestRunView.Load.Complete");

        this._cacheBugArtifacts();
    }

    private _cacheBugArtifacts() {
        try {
            let TfsContext = TFS_Host_TfsContext.TfsContext.getDefault(),
                witStore = WITUtils.getWorkItemStore();

            witStore.beginGetProject(TfsContext.navigation.projectId, (project: WITOM.Project) => {
                project.beginGetWorkItemType(this._bugCategoryTypeName, function (wit) {
                    witStore.beginGetLinkTypes(function () {
                    });
                });
            });
        }
        catch (e) {
            // Just used for caching. Eat all exceptions here.
        }
    }

    private _prepareIterationResultsAndStepResults(testCaseResult: TestsOM.TestCaseResult, testCase: TestsOM.TestCase) {
        /// <summary>Creates iterations and stepResults for the testCaseResults for the current Run</summary>
        let iterationResult,
            stepResult,
            i, iter,
            step,
            steps = testCase.getTestSteps(),
            numIterations,
            testCaseData = testCase.getData();

        if (testCaseResult.iterations.getItems().length === 0) {

            numIterations = testCase.getData().length;
            if (numIterations === 0) {
                numIterations = 1;
            }
            for (iter = 0; iter < numIterations; iter++) {
                iterationResult = testCaseResult.createIteration(iter + 1);
                iterationResult.dateStarted = new Date();

                if (steps) {
                    for (i = 0; i < steps.length; i++) {
                        step = steps[i];
                        if (step instanceof TestsOM.TestStep) {
                            stepResult = iterationResult.createStepResult(step.id);
                        }
                        else {
                            stepResult = iterationResult.createSharedStepResult(step.id, step.ref);
                        }
                        iterationResult.actionResults.add(stepResult);
                    }
                }
                // Add the parameters data in iterationResult
                this.addParametersDataInIterationResult(testCase.getParameters(), testCase.getData(), iterationResult, iter);
                testCaseResult.iterations.add(iterationResult);

                TMUtils.TestCaseResultUtils.prepareStepResults(testCaseResult, testCase, iter, this._sharedStepCache, (data) => { this._isEditingEnabledInResume = data; });
            }
        }
        else {
            //must be resume,so we hvae iterations and stepresults we need to populate data from test case
            let iterations = testCaseResult.iterations.getItems();
            for (iter = 0; iter < iterations.length; iter++) {
                TMUtils.TestCaseResultUtils.prepareStepResults(testCaseResult, testCase, iter, this._sharedStepCache, (data) => { this._isEditingEnabledInResume = data; });
            }
        }
        testCaseResult.isReady = true;
    }

    private addParametersDataInIterationResult(parameters: string[], parametersData: Array<{ [index: string]: string; }>, iterationResult: TestsOM.TestIterationResult, iterationIndex: number) {
        let testParameter,
            dataRow,
            paramValue = "",
            paramName,
            index,
            i;
        if (parameters && parametersData) {
            // Add the parameters data in iterationResult
            for (i = 0; i < parameters.length; i++) {
                paramName = parameters[i];
                dataRow = parametersData[iterationIndex];
                if (dataRow) {
                    paramValue = TMUtils.getParameterValueFromDataRow(dataRow, paramName);
                }

                index = iterationResult.parameters.getIndexFromCollection(paramName);
                if (index === -1) {
                    testParameter = new TestsOM.TestResultParameter(paramName);
                    testParameter.expected = paramValue;
                    testParameter.dataType = 0;
                    iterationResult.parameters.add(testParameter);
                }
                else //update the param value if the entry already exists 
                {
                    testParameter = iterationResult.parameters.getItems()[index];
                    testParameter.expected = paramValue;
                }
            }
        }
    }

    private _updateTitle() {
        let testCaseResult = this._getActiveTestResult(),
            testCase = this._getActiveTestCase(),
            testCaseId,
            isDirty,
            title;

        isDirty = testCaseResult.getIsDirty() || testCase.getIsDirty();

        testCaseId = testCaseResult.testCaseId + (isDirty ? "*" : "");

        title = Utils_String.format(Resources.TestRunnerTestCaseTitle, testCaseId, testCaseResult.testCaseTitle);

        let $testRunTitleDiv = $(".testRunTitle div").first().text(title);

        if (testCaseResult.configurationName) {
            if (this._testRunTitleTooltip) {
                this._testRunTitleTooltip.setTextContent(Utils_String.format(Resources.TestRunnerTitleTooltip, title, testCaseResult.configurationName));
            } else {
                this._testRunTitleTooltip = RichContentTooltip.add(Utils_String.format(Resources.TestRunnerTitleTooltip, title, testCaseResult.configurationName), $testRunTitleDiv);
            }
            let $testRunConfiguration = $(".testrun-testcase-configuration").text(testCaseResult.configurationName);
            if (this._testConfigurationTooltip) {
                this._testConfigurationTooltip.setTextContent(Utils_String.format(Resources.TestConfigurationTooltipFormat, testCaseResult.configurationName));
            } else {
                this._testConfigurationTooltip = RichContentTooltip.add(Utils_String.format(Resources.TestConfigurationTooltipFormat, testCaseResult.configurationName), $testRunConfiguration, { setAriaDescribedBy: true });
            }
        }
        else {
            if (this._testRunTitleTooltip) {
                this._testRunTitleTooltip.resetContent();
            }
        }
    }

    private _createSaveToolbar(bugCategoryTypeName: string) {
        if (bugCategoryTypeName) {
            this._bugCategoryTypeName = bugCategoryTypeName;
            this._createSaveResultToolbar(bugCategoryTypeName);
            this._registerToResize(".testRun-SaveClose-toolbar");
            // On the first time loading of sub menu, there is some issue in the highlighting of the dropdown. So, in the beginning itself load the submenu.
            this._loadSubMenu(this._saveResultToolbar.getItem(this._saveResultToolbarItemsIds.add));
        }
    }

    private _loadSubMenu(dropDownMenu: any) {

        dropDownMenu.tryShowSubMenu({ immediate: true });
        dropDownMenu.hideSubMenu({ immediate: true });

        //because of the above the drop down menu is highlighted which swe dont want
        dropDownMenu.removeHighlight();
        dropDownMenu.removeFocus();
    }

    private _createSaveResultToolbar(bugCategoryTypeName) {
        /// <summary>Creates the Save And Save&Close Results toolbar</summary>
        let _$toolbarHost = this._element.find(".testRun-SaveClose-toolbar");

        this._saveResultToolbar = <Menus.MenuBar>Controls.BaseControl.createIn(Menus.MenuBar, _$toolbarHost, {
            items: this._createSaveResultToolbarItems(bugCategoryTypeName),
            executeAction: delegate(this, this._onSaveResultToolbarClick)
        });

    }

    private _createSaveResultToolbarItems(bugCategoryTypeName: string): any {
        /// <summary>Creates the items list for the toolbar</summary>
        /// <returns type="Object">Items list for the toolbar</returns>
        let items = [];
        let createBugText = Utils_String.format(Resources.CreateWorkItemText, bugCategoryTypeName.toLowerCase());

        items.push({ id: this._saveResultToolbarItemsIds.saveTestResult, text: Resources.SaveText, title: Resources.SaveText, showText: false, icon: "bowtie-icon bowtie-save bowtie-white-fill" });
        items.push({ id: this._saveResultToolbarItemsIds.saveAndCloseTestResult, text: Resources.SaveAndCloseText, showText: true, icon: "bowtie-icon bowtie-save-close bowtie-white-fill" });
        items.push({ separator: true });
        items.push({
            id: this._saveResultToolbarItemsIds.createBug, text: createBugText,
            title: Utils_String.format(Resources.TooltipTitleShortcutFormat, createBugText, Resources.CreateBugShortcut),
            showText: true, icon: "bowtie-icon bowtie-file-bug bowtie-white-fill",
            childItems: this._createBugSubMenu(bugCategoryTypeName),
            splitDropOptions: {
                title: Resources.MoreOptions,
                noIcon: true,
                extraOptions: {
                    align: "left-bottom"
                }
            }
        });

        if (TMUtils.isDataCollectionEnabled()) {
            items.push({ separator: true });
            items.push({ id: this._saveResultToolbarItemsIds.captureScreenShot, text: Resources.ScreenShotText, title: Resources.ScreenShotText, showText: false, icon: "bowtie-icon bowtie-camera" });
            items.push({ id: this._saveResultToolbarItemsIds.captureActions, text: Resources.CaptureActions, title: Resources.CaptureActions, showText: false, icon: "bowtie-icon bowtie-image-action-log" });
            let isChrome: boolean = Utils_UI.BrowserCheckUtils.isChrome();
            if (isChrome) {
                items.push({
                    id: this._saveResultToolbarItemsIds.captureVideo, text: Resources.RecordScreen, title: Resources.RecordScreen, showText: false, icon: "bowtie-icon bowtie-video"
                });
            }
        }

        items.push({
            id: this._saveResultToolbarItemsIds.add, text: Resources.TestRunAddInfoTooltip, showText: false, icon: "bowtie-icon bowtie-ellipsis",
            title: Resources.TestRunAddInfoTooltip, childItems: this._createAddSubMenu(), hideDrop: true, idIsAction: false
        });

        if (DesktopTestRunHelper.isRequestFromDtr()) {
            items.push({
                id: this._saveResultToolbarItemsIds.testRunnerInfoButton, text: "Info", showText: false, icon: "bowtie-icon bowtie-status-help-outline",
                title: "Info", childItems: this._createInfoSubMenu(), hideDrop: true, idIsAction: false, cssClass: "test-runner-info"
            });
        }

        return items;
    }

    private _createInfoSubMenu() {
        let testRunnerInfoSubMenuItems = [];

        testRunnerInfoSubMenuItems.push({ id: this._saveResultToolbarItemsIds.testRunnerHelpButton, text: Resources.Help, showText: true, icon: "bowtie-icon bowtie-status-help-outline" });
        testRunnerInfoSubMenuItems.push({ id: this._saveResultToolbarItemsIds.testRunnerAboutButton, text: Resources.About, showText: true, icon: "bowtie-icon bowtie-status-info" });
        testRunnerInfoSubMenuItems.push({ id: this._saveResultToolbarItemsIds.testRunnerSignout, text: Resources.SignOut, showText: true });

        return testRunnerInfoSubMenuItems;
    }

    private _createAddSubMenu() {
        let addSubMenuItems = [];
        addSubMenuItems.push({ id: this._saveResultToolbarItemsIds.addComment, text: Resources.AddComment, showText: true, icon: "bowtie-icon bowtie-comment-add" });
        addSubMenuItems.push({ id: this._saveResultToolbarItemsIds.addAttachment, text: Resources.AddAttachmentDialogTitle, icon: "bowtie-icon bowtie-attach" });

        if (DesktopTestRunHelper.isRequestFromDtr() || (Utils_UI.BrowserCheckUtils.isChrome())) {
            addSubMenuItems.push({
                id: this._saveResultToolbarItemsIds.captureVideoWithAudio,
                text: Resources.RecordScreenWithAudio,
                icon: "bowtie-icon bowtie-video",
                showText: true
            });
        }
        return addSubMenuItems;
    }

    private _createBugSubMenu(bugCategoryTypeName: string): any[] {
        let items: any[] = [];

        let addToExistingBugs = Utils_String.format(Resources.AddToExistingBugText, bugCategoryTypeName.toLowerCase());
        items.push({
            id: this._saveResultToolbarItemsIds.addToExistingBug,
            text: addToExistingBugs,
            showText: true,
            showIcon: true,
            icon: "bowtie-icon bowtie-file-bug"
        });

        return items;
    }

    private _createRecordScreenSubMenu() {
        let items: any[] = [];
        items.push({
            id: this._saveResultToolbarItemsIds.captureVideoWithAudio,
            text: Resources.RecordScreenWithAudio,
            showText: true
        });

        return items;
    }

    private _onCaptureSuccessful(attachment: any, numberOfActiveTabs: number): void {
        if (!attachment) {
            // cancelled screenshot.
            return;
        }

        let actionPath = this._testStepsControl.getActionPath();
        if (actionPath) {
            this._testStepsControl._onFileAttached(attachment);
        } else {
            this._onFileAttached(attachment);
        }

        let properties: { [key: string]: any; } = {};
        properties["numberOfActiveTabs"] = numberOfActiveTabs;
        TelemetryService.publishEvents(TelemetryService.featureCaptureScreenshot, properties);
    }

    private _onCaptureError(error: IError): void {
        if (error.id === 0) {
            alert(error.errorMessage);
        } else {
            alert(this._getErrorMessage(error.id));
        }
    }

    private _getErrorMessage(errorId): string {
        switch (errorId) {
            case ErrorCode.TFS_CONNECTION_FAILED:
                return Resources.TfsConnectionError;
            case ErrorCode.TFS_AUTH_FAILED:
                return Resources.TfsAuthenticationError;
            case ErrorCode.WINDOW_NOT_FOUND:
                return Resources.XTWindowNotFound;
            case ErrorCode.ACTIONLOG_ALREADY_INPROGRESS:
                return Resources.ActionLogInProgressError;
            case ErrorCode.TAB_NOT_REACHABLE:
                return Resources.TabNotReachable;
            case ErrorCode.MICROPHONE_NOTFOUND:
                return Resources.MicrophoneNotAvailable;
            default:
                break;
        }
    }

    private _constructVideoPayload(includeAudio: boolean): ICaptureVideoPayload {
        let webContext = TFS_Host_TfsContext.TfsContext.getDefault().contextData;
        return {
            tfsContext: {
                url: webContext.collection.uri,
                projectName: webContext.project.name
            },
            testRunData: {
                runId: this._getActiveIterationResult().id.testRunId,
                resultId: this._getActiveIterationResult().id.testResultId,
                iterationId: this._getActiveIterationResult().iterationId,
                actionPath: ""
            },
            includeAudio: includeAudio
        };
    }

    private _constructActionLogWindowPayload(activeWindowInfo: IActiveTabMetaData): IStartCaptureActionLogPayload {
        let windowPayload: ICaptureWindowPayload = this._constructWindowPayload(activeWindowInfo);
        windowPayload.testRunData.actionPath = "";

        let resources: { [id: string]: string } = {};
        resources["Actions"] = Resources.ActionLogActionsText;
        resources["Steps"] = Resources.ActionLogStepsText;
        resources["Image"] = Resources.ActionLogFullScreenText;
        resources["Full screen image"] = Resources.ActionLogFullScreenText;

        let actionLogPayload: IStartCaptureActionLogPayload = { windowId: windowPayload.windowId, tfsContext: windowPayload.tfsContext, testRunData: windowPayload.testRunData, propertyBag: resources };
        return actionLogPayload;
    }

    private _constructWindowPayload(activeWindowInfo: IActiveTabMetaData): ICaptureWindowPayload {
        let webContext = TFS_Host_TfsContext.TfsContext.getDefault().contextData;
        let actionPath = this._testStepsControl.getActionPath();
        if (activeWindowInfo) {
            return { windowId: activeWindowInfo.windowId, tfsContext: { url: webContext.collection.uri, projectName: webContext.project.name }, testRunData: { runId: this._getActiveIterationResult().id.testRunId, resultId: this._getActiveIterationResult().id.testResultId, iterationId: this._getActiveIterationResult().iterationId, actionPath: actionPath } };
        }
        else {
            return { tfsContext: { url: webContext.collection.uri, projectName: webContext.project.name }, testRunData: { runId: this._getActiveIterationResult().id.testRunId, resultId: this._getActiveIterationResult().id.testResultId, iterationId: this._getActiveIterationResult().iterationId, actionPath: actionPath } } as ICaptureWindowPayload;
        }
    }

    private _constructActionLogPayload(): IActionLogPayLoad {
        let webContext = TFS_Host_TfsContext.TfsContext.getDefault().contextData;
        return {
            attachment: this._actionLogAttachmentContainer,
            stepInfo: this._getStepInfoForActionLog(),
            tfsContext: {
                url: webContext.collection.uri,
                projectName: webContext.project.name
            },
            testRunData: {
                runId: this._getActiveIterationResult().id.testRunId,
                resultId: this._getActiveIterationResult().id.testResultId,
                iterationId: this._getActiveIterationResult().iterationId,
                actionPath: ""
            }
        };
    }

    private _onSaveResultToolbarClick(e?: any) {
        /// <summary>Handles the execution of the toolbar items</summary>
        /// <param name="e" type="Object">The execution event</param>
        let command = e.get_commandName();

        // cancel any info on execution of any command from toolbar
        this._cancelInfo();

        //Execute the specific Menu command
        if (command === this._saveResultToolbarItemsIds.saveTestResult) {
            this.saveActiveTestCaseAndResult();
        }
        else if (command === this._saveResultToolbarItemsIds.saveAndCloseTestResult) {
            this._stopCollectors(RecorderStoppedReason.SaveAndClose);
            this._saveAndCloseTestResult();
        }
        else if (command === this._saveResultToolbarItemsIds.createBug) {
            Diag.logTracePoint("TestRunView.FileBug.start");
            this.createBug();
            TelemetryService.publishEvents(TelemetryService.featureTestResultCreateBug, {});
        }
        else if (command === this._saveResultToolbarItemsIds.addToExistingBug) {
            this.addToExistingBug();
            TelemetryService.publishEvents(TelemetryService.featureTestResultAddToExistingBug, {});
        }
        else if (command === this._saveResultToolbarItemsIds.refresh) {
            this._refreshTest();
        }
        else if (command === this._saveResultToolbarItemsIds.addComment) {
            this._showAndFocusTestResultCommentBox();
        }
        else if (command === this._saveResultToolbarItemsIds.addAttachment) {
            let testResult = this._getActiveTestResult();
            if (testResult && testResult.id) {
                VSS.using(["TestManagement/Scripts/TFS.TestManagement.FileInputDialog"],
                    (FileInputDialog: typeof FileInputDialog_LAZY_LOAD) => {
                        Dialogs.show(FileInputDialog.FileInputDialog, {
                            attachedEvent: delegate(this, this._onFileAttached),
                            title: Resources.AddAttachmentDialogTitle,
                            runId: testResult.id.testRunId,
                            resultId: testResult.id.testResultId,
                            iterationId: this._getActiveIterationResult().iterationId,
                            actionPath: null
                        });
                    });
            }
        }
        else if (command === this._saveResultToolbarItemsIds.captureScreenShot) {
            this._handleCaptureClick(command);

        }
        else if (command === this._saveResultToolbarItemsIds.captureVideo ||
            command === this._saveResultToolbarItemsIds.captureVideoWithAudio) {
            if (this._isExtensionInstalled === false) {
                // if extension is not installed show guidance dialog
                this.showXTInstallationGuidance();
            } else {
                this._actionRecordingControl.hideElement();
                if (this._videoState && this._videoState === RecorderState.InProgress || this._videoState === RecorderState.Stopping || this._videoState === RecorderState.Starting) {
                    this._videoRecordingControl.showElement();
                }
                else {
                    let startVideoProgressIndicator: number = VSS.globalProgressIndicator.actionStarted("startVideo", true);
                    this._initializeVideo();
                    let includeAudio = command === this._saveResultToolbarItemsIds.captureVideoWithAudio;
                    TelemetryService.publishEvents(TelemetryService.featureRecordScreen, {});
                    VideoDataCollection.startVideo(this._constructVideoPayload(includeAudio), (response) => {
                        VSS.globalProgressIndicator.actionCompleted(startVideoProgressIndicator);
                        this._videoInProgress();
                        VideoDataCollection.listenForVideoStartingEvent(Utils_Core.delegate(this, this._onVideoStarted), Utils_Core.delegate(this, this._handleErrorDuringVideoStart));
                    }, (error) => {
                        VSS.globalProgressIndicator.actionCompleted(startVideoProgressIndicator);
                        this.showXTInstallationGuidance();
                    });
                }
            }
        }
        else if (command === this._saveResultToolbarItemsIds.captureActions) {
            this._videoRecordingControl.hideElement();
            if (this._actionLogState && this._actionLogState === RecorderState.InProgress) {
                this._actionRecordingControl.showElement();
            }
            else {
                this._handleCaptureClick(command);
            }
        }
        else if (command === this._saveResultToolbarItemsIds.testRunnerHelpButton) {
            // navigate to the help url
            window.open("https://aka.ms/ATPTestRunnerLearnMore", "_blank");
        }
        else if (command === this._saveResultToolbarItemsIds.testRunnerAboutButton) {
            // launch the about dialog inside the Test Runner
            Dialogs.Dialog.show<Dialogs.Dialog>(TestRunnerAboutDialog, {
                aboutText: Resources.TestRunnerAboutDialogText,
                title: Resources.TestRunnerAboutDialogTitle
            });
        }
        else if (command === this._saveResultToolbarItemsIds.testRunnerSignout) {
            // Signout the user from Test Runner
            DesktopTestRunHelper.triggerSignoutFromTestRunner();
        }
    }

    private _handleCaptureClick(command) {
        if (this._isExtensionInstalled === false) {
            // if extension is not installed show guidance dialog
            this.showXTInstallationGuidance();
        }
        else {
            let control: any;
            let progressIndicatorId: string;
            let captureDelegate: IArgsFunctionR<any>;
            let windowSelectionGuidanceTextResource: string;
            let $filterContainer: JQuery;

            switch (command) {
                case this._saveResultToolbarItemsIds.captureScreenShot:
                    if (Utils_UI.BrowserCheckUtils.isChrome()) {
                        this._captureDesktopScreenShot();
                        return;
                    }
                    else {
                        control = this._screenshotSelectorControl;
                        progressIndicatorId = "captureScreen";
                        captureDelegate = Utils_Core.delegate(this, this._captureScreenShot);
                        windowSelectionGuidanceTextResource = Resources.ScreenshotSelectWindowGuidance;
                        $filterContainer = $(".testRun-screenshot-window-list");
                    }
                    break;

                case this._saveResultToolbarItemsIds.captureActions:

                    if (DesktopTestRunHelper.isRequestFromDtr()) {
                        this._captureActionLogWindow(null, 0);
                        return;
                    } else {
                        control = this._actionLogWindowSelectorControl;
                        progressIndicatorId = "captureActionLog";
                        captureDelegate = Utils_Core.delegate(this, this._captureActionLogWindow);
                        windowSelectionGuidanceTextResource = Resources.ActionLogSelectWindowGuidance;
                        $filterContainer = $(".testRun-actionLog-window-list");
                    }
                    break;
            }

            if (!$filterContainer.hasClass("tcm-window-list")) {
                $filterContainer.addClass("tcm-window-list");
            }

            let captureProgressId: number = VSS.globalProgressIndicator.actionStarted(progressIndicatorId, true);
            VSS.using(["TestManagement/Scripts/Tfs.TestManagement.WindowSelectorControl"], (WindowSelectorControl: typeof WindowSelectorControl_LAZY_LOAD) => {
                if (!control) {
                    ActiveWindowDataCollection.getActiveWindowsInfo((activeWindowsInfo: IActiveTabMetaData[]) => {
                        this._logTelemetryForActiveWindows(activeWindowsInfo, command);
                        this._isExtensionInstalled = true;
                        control = <WindowSelectorControl_LAZY_LOAD.WindowSelectorControl>Controls.BaseControl.createIn(WindowSelectorControl.WindowSelectorControl, $filterContainer, {
                            onItemChanged: captureDelegate,
                            initialWindows: activeWindowsInfo,
                            getWindows: Utils_Core.delegate(this, this._getWindows, command),
                            windowSelectionGuidanceText: windowSelectionGuidanceTextResource,
                            onPopupClosed: Utils_Core.delegate(this, this._unselectCaptureMenu, command),
                            onPopupOpened: Utils_Core.delegate(this, this._selectCaptureMenu, command),
                        });

                        this._updateSelectorControl(control, command);
                        this._positionAndShowWindowPopup(command, control);
                        VSS.globalProgressIndicator.actionCompleted(captureProgressId);

                    }, (error: any) => {
                        //launch xt guidance dialog over here
                        VSS.globalProgressIndicator.actionCompleted(captureProgressId);
                        this.showXTInstallationGuidance();
                    });
                }
                else {
                    this._positionAndShowWindowPopup(command, control, true);
                    VSS.globalProgressIndicator.actionCompleted(captureProgressId);
                }
            });
        }
    }

    private _updateSelectorControl(control, command) {
        if (command === this._saveResultToolbarItemsIds.captureScreenShot) {
            this._screenshotSelectorControl = control;
        }
        else if (command === this._saveResultToolbarItemsIds.captureActions) {
            this._actionLogWindowSelectorControl = control;
        }
    }

    private _initializeVideo(): void {
        this._videoState = RecorderState.NotStarted;
        this._videoStoppedReason = RecorderStoppedReason.None;
    }

    //TODO: refactor this so that Actionlog data collector and Video data collector stop in a generic way

    private _stopVideo(videoStoppedReason: RecorderStoppedReason = RecorderStoppedReason.None): void {
        if (this._isVideoInProgress()) {
            this._videoStoppedReason = videoStoppedReason;
            this._videoState = RecorderState.Stopping;
            VideoDataCollection.stopVideo();
        }

        this._logVideoTelemetryOnStop(videoStoppedReason);
    }

    private _logVideoTelemetryOnStop(videoStoppedReason: RecorderStoppedReason) {
        if (videoStoppedReason === RecorderStoppedReason.Stopped) {
            TelemetryService.publishEvents(TelemetryService.featureStopRecordScreen, {});
        }
        else if (videoStoppedReason === RecorderStoppedReason.BugFiled) {
            TelemetryService.publishEvents(TelemetryService.featureBugCreatedDuringScreenRecording, {});
        }
        else if (videoStoppedReason === RecorderStoppedReason.IterationMove) {
            TelemetryService.publishEvents(TelemetryService.featureIterationMoveDuringScreenRecording, {});
        }
    }

    private _stopCollectors(collectorStoppedReason: RecorderStoppedReason = RecorderStoppedReason.None, callback?: Function): void {
        this._postAutoStopCollectorsCallback = callback;
        this._stopVideo(collectorStoppedReason);
        this._stopActionLog(collectorStoppedReason);
    }

    private _stopActionLog(collectorStoppedReason: RecorderStoppedReason) {
        if (this._actionLogState === RecorderState.InProgress) {
            ActionLogDataCollection.stopActionLog(this._constructActionLogPayload(), (attachment) => {
                this._onStopActionLog(collectorStoppedReason, attachment);
                if (this._postAutoStopCollectorsCallback) {
                    this._postAutoStopCollectorsCallback();
                }
            }, (error) => {
                this._handleErrorActionLog(error);
                if (this._postAutoStopCollectorsCallback) {
                    this._postAutoStopCollectorsCallback();
                }
            });
        }
    }


    private _initiateActionLogUpload(): void {
        if (this._actionLogState === RecorderState.InProgress) {
            ActionLogDataCollection.generateActionLog(this._constructActionLogPayload());
            ActionLogDataCollection.listenForActionLogContainerCreatedEvent((attachment: IAttachmentInfo) => {
                this._actionLogAttachmentContainer = attachment;
            }, (error) => {
                this._handleErrorActionLog(error);
            });

            TelemetryService.publishEvents(TelemetryService.featureBugCreatedDuringActionRecording, {});
        }
    }

    private _handleErrorActionLog(error: any): void {
        this._onStopActionLog();

        if (error.id === ErrorCode.TAB_NOT_REACHABLE) {
            TelemetryService.publishEvents(TelemetryService.featureActionLogRefreshWindowDialog, {});
            Dialogs.Dialog.show<Dialogs.Dialog>(GuidanceDialog, {
                guidanceText: Resources.RefreshActionLogMessage,
                title: Resources.RefreshActionLogDialogTitle
            });
        }
        else if (error.id === ErrorCode.ACTIONLOG_FEATURE_DISABLED) {
            TelemetryService.publishEvents(TelemetryService.featureActionLogDisabledFromExtension, {});
            Dialogs.Dialog.show<Dialogs.Dialog>(GuidanceDialog, {
                guidanceText: Resources.EnableActionLogGuidanceText,
                title: Resources.EnableActionLogDialogTitle
            });
        }
        else {
            this._parseAndShowCollectorError(error);
        }
    }

    private _handleErrorDuringVideoStart(error: any): void {
        this._videoCompleted(null);

        if (!error) {
            //cancellation
            this._videoState = RecorderState.Cancelled;
            TelemetryService.publishEvents(TelemetryService.featureCancelRecordScreen, {});
            return;
        }

        this._parseAndShowCollectorError(error);
    }

    private _parseAndShowCollectorError(error: any): void {
        if (error.id === 0) {
            alert(error.errorMessage);
        } else {
            alert(this._getErrorMessage(error.id));
        }
    }

    private _handleErrorOnVideoCompletion(error: any): void {
        this._videoCompleted(null);
        this._parseAndShowCollectorError(error);
    }

    private showXTInstallationGuidance(): void {
        this._isExtensionInstalled = false;
        Dialogs.Dialog.show<Dialogs.Dialog>(TestDataCollectorMessageDialog, {
            okCallback: Utils_Core.delegate(this, this._onInstallExtension)
        });
    }

    private showVerifyBugPrompt(): void {
        Dialogs.Dialog.show<Dialogs.Dialog>(VerifyBugPromptDialog, {
            isVerifyMode: this._isVerifyMode,
            verifyBugInfo: this._verifyBugInfo,
            setVerifyBugWindowOpened: Utils_Core.delegate(this, this._setVerifyBugWindowOpened),
            getVerifyBugWindowOpened: Utils_Core.delegate(this, this._getVerifyBugWindowOpened),
            openWorkItem: Utils_Core.delegate(this, this._openWorkItem),
            tryCallHandlePageUnload: Utils_Core.delegate(this, this._tryCallHandlePageUnload)
        });
    }

    private _onVideoStarted(attachment: any): void {
        this._videoRecordingControl.onStart();

        this._videoAttachmentContainer = attachment;

        //show red icon on video menu bar
        this._showDataCollectorInProgressIndicatorOnMenuItem(this._saveResultToolbar.getItem(this._saveResultToolbarItemsIds.captureVideo).getElement());

        this._videoState = RecorderState.InProgress;
        VideoDataCollection.listenForVideoCompleteEvent(Utils_Core.delegate(this, this._videoCompleted), Utils_Core.delegate(this, this._handleErrorOnVideoCompletion));
    }

    private _isVideoInProgress(): boolean {
        return this._videoState === RecorderState.InProgress;
    }

    private _areDataCollectorsInProgress(): boolean {
        return this._isVideoInProgress() || this._videoState === RecorderState.Stopping || this._actionLogState === RecorderState.InProgress;
    }

    private _videoInProgress() {

        //hiding the actionRecording Control
        this._actionRecordingControl.hideElement();

        // show video bar
        this._videoRecordingControl.onStarting();

        this._videoState = RecorderState.Starting;
    }

    private _videoCompleted(attachment: any) {
        if (attachment) {
            this._onFileAttached(attachment);
            TelemetryService.publishEvents(TelemetryService.featureRecordScreenCompleted, {});
            this._showVideoInfo();
        }

        this._videoAttachmentContainer = null;

        // hide the video bar
        this._videoRecordingControl.onEnd();

        // hide the red icon on video menu bar
        this._removeDataCollectorInProgressIndicatorFromMenuItem(this._saveResultToolbar.getItem(this._saveResultToolbarItemsIds.captureVideo).getElement());

        if (this._stopVideoProgressIndicator) {
            VSS.globalProgressIndicator.actionCompleted(this._stopVideoProgressIndicator);
            this._stopVideoProgressIndicator = null;
        }

        this._videoState = RecorderState.Completed;

        // callback which needs to be executed post all collectors are stopped.
        if (this._postAutoStopCollectorsCallback) {
            this._postAutoStopCollectorsCallback();
        }
    }

    private _showVideoInfo(): void {
        //if the video is autostopped because of iteration Move then we will skip showing the info bar
        if (this._videoStoppedReason !== RecorderStoppedReason.IterationMove) {
            let dateString = Utils_Date.localeFormat(new Date(), Utils_Culture.getDateTimeFormat().FullDateTimePattern, true);
            let message = Utils_String.format(Resources.DataCollectionComplete, Resources.ScreenRecordingText, dateString);
            if (this._videoStoppedReason === RecorderStoppedReason.BugFiled) {
                message = Utils_String.format(Resources.ScreenRecordingCompleteAndAttachedToBug, dateString);
            }
            this._showInfo(message);
        }
    }

    private _removeDataCollectorInProgressIndicatorFromMenuItem(element: JQuery): void {
        element.find(".dataCollector-recording-icon").remove();
        element.removeClass("dataCollector-inprogress");
    }

    private _showDataCollectorInProgressIndicatorOnMenuItem(element: JQuery): void {
        element.addClass("dataCollector-inprogress");
        let $circleDiv = $(domElem("div")).addClass("dataCollector-recording-icon");
        element.append($circleDiv);
    }

    private _constructVideoControl(): void {
        let $container = $(".testRun-video-recoder");
        this._videoRecordingControl = <RecordingTimerControl>Controls.BaseControl.createIn(RecordingTimerControl, $container, {
            onStopped: Utils_Core.delegate(this, () => {
                this._stopVideoProgressIndicator = VSS.globalProgressIndicator.actionStarted("stop", true);
                this._stopVideo(RecorderStoppedReason.Stopped);
            }),
            includeStopContainer: true
        });

        // this is done to dequeue any outstanding video requests
        VideoDataCollection.stopVideo();
    }

    private _onStopActionLog(stoppedReason: RecorderStoppedReason = RecorderStoppedReason.None, attachment?: IAttachmentInfo) {
        if (attachment) {
            this._onFileAttached(attachment);
            //show info bar if the explicity stopped
            if (stoppedReason === RecorderStoppedReason.Stopped) {
                let dateString = Utils_Date.localeFormat(new Date(), Utils_Culture.getDateTimeFormat().FullDateTimePattern, true);
                let message = Utils_String.format(Resources.DataCollectionComplete, Resources.ActionRecordingText, dateString);
                this._showInfo(message);
            }
        }

        this._actionLogAttachmentContainer = null;
        this._actionLogState = RecorderState.Completed;
        this._actionRecordingControl.onEnd();
        this._resetActionLogTimeStamp();
        // hide the red icon from action log menu bar
        this._removeDataCollectorInProgressIndicatorFromMenuItem(this._saveResultToolbar.getItem(this._saveResultToolbarItemsIds.captureActions).getElement());

        if (stoppedReason === RecorderStoppedReason.IterationMove) {
            TelemetryService.publishEvents(TelemetryService.featureActionLogAutoStoppedDuringMove, {});
        } else if (stoppedReason === RecorderStoppedReason.SaveAndClose) {
            TelemetryService.publishEvents(TelemetryService.featureActionLogAutoStoppedDuringSaveAndClose, {});
        }

    }

    private _constructActionLogControl(): void {
        let $container = $(".testRun-action-recoder");
        this._actionRecordingControl = <BaseRecordingControl>Controls.BaseControl.createIn(BaseRecordingControl, $container, {
            includeStopContainer: true,
            recordingStatusGuidanceText: Resources.ActionLogRecordingGuidanceText,
            onStopped: Utils_Core.delegate(this, () => {
                let stopActionProgress = VSS.globalProgressIndicator.actionStarted("stop-action", true);
                //users doing explicit stop
                TelemetryService.publishEvents(TelemetryService.featureStopActionRecording, {});
                ActionLogDataCollection.stopActionLog(this._constructActionLogPayload(), (attachment) => {
                    this._onStopActionLog(RecorderStoppedReason.Stopped, attachment);
                    VSS.globalProgressIndicator.actionCompleted(stopActionProgress);
                }, (error) => {
                    VSS.globalProgressIndicator.actionCompleted(stopActionProgress);
                    this._handleErrorActionLog(error);
                });
            })
        });

        // this is done to dequeue any outstanding actionLog requests
        ActionLogDataCollection.stopActionLog(null, null, null);
    }

    private _onInstallExtension(): void {
        Dialogs.Dialog.show<Dialogs.Dialog>(XTRelaunchDialog, {
            okCallback: Utils_Core.delegate(this, this._pauseAndResumeRun)
        });
    }

    private _pauseAndResumeRun(): void {
        let testCaseResult = this._getActiveTestResult();
        this.resumeTestSessionAfterClose = true;
        this._setResultOutcome(testCaseResult, this._getActiveIterationResult(), TCMConstants.TestOutcome.Paused, () => {
            this._saveAndCloseTestResult();
        });
    }

    private resumeTestSessionAfterClose: boolean;
    private _screenshotSelectorControl: any;
    private _actionLogWindowSelectorControl: any;

    private _unselectCaptureMenu(command: string) {
        let element: JQuery = this._saveResultToolbar.getItem(command).getElement();
        element.removeClass("window-command-selected");
    }

    private _selectCaptureMenu(command: string) {
        let element: JQuery = this._saveResultToolbar.getItem(command).getElement();
        element.addClass("window-command-selected");
    }

    private _positionAndShowWindowPopup(command: any, windowSelectorControl: any, clearCache?: boolean) {
        let element: JQuery = this._saveResultToolbar.getItem(command).getElement();
        let selector: JQuery = $(".window-selector");
        selector.css({
            "position": "fixed",
            "left": element.position().left,
            "top": element.position().top + element.outerHeight(),
            "width": 1 //addign this width just to show popup, as framework put limitation to showpopup if :visuble property is true on jquery element.
        });

        windowSelectorControl.showPopup(clearCache);
    }

    private _captureActionLogWindow(activeWindow: IActiveTabMetaData, numberOfActiveTabs: number) {
        //resetting the actionLogState
        this._actionLogState = RecorderState.NotStarted;

        let startActionLogProgressIndicator: number = VSS.globalProgressIndicator.actionStarted("startActionLog", true);
        ActionLogDataCollection.startActionLog(this._constructActionLogWindowPayload(activeWindow), (attachment: IAttachmentInfo) => {
            this._actionRecordingControl.onStarting();
            this._actionLogAttachmentContainer = attachment;
            this._actionRecordingControl.onStart();
            this._actionLogState = RecorderState.InProgress;
            //show action log Inprogress Icon
            this._showDataCollectorInProgressIndicatorOnMenuItem(this._saveResultToolbar.getItem(this._saveResultToolbarItemsIds.captureActions).getElement());
            VSS.globalProgressIndicator.actionCompleted(startActionLogProgressIndicator);
        }, (error) => {
            VSS.globalProgressIndicator.actionCompleted(startActionLogProgressIndicator);
            this._handleErrorActionLog(error);
        });
    }

    private _captureScreenShot(activeWindow: IActiveTabMetaData, numberOfActiveTabs: number) {
        ScreenShotDataCollection.captureScreenShot(this._constructWindowPayload(activeWindow),
            (attachment: any) => {
                this._onCaptureSuccessful(attachment, numberOfActiveTabs);
                this._updateMenuItemState(this._saveResultToolbarItemsIds.captureScreenShot, false);
            },
            (error: IError) => {
                this._onCaptureError(error);
                this._updateMenuItemState(this._saveResultToolbarItemsIds.captureScreenShot, false);
            });

        this._updateMenuItemState(this._saveResultToolbarItemsIds.captureScreenShot, true);
    }

    private _captureDesktopScreenShot() {

        let progressIndicatorId: string = "capture-DesktopScreenShot";
        let captureProgressId: number = VSS.globalProgressIndicator.actionStarted(progressIndicatorId, true);
        ScreenShotDataCollection.captureDesktopScreenShot(this._constructWindowPayload(null),
            (result) => {
                VSS.globalProgressIndicator.actionCompleted(captureProgressId);
                ScreenShotDataCollection.handleCaptureCompleted((attachment: any) => {
                    this._onCaptureSuccessful(attachment, 0);
                    this._updateMenuItemState(this._saveResultToolbarItemsIds.captureScreenShot, false);
                }, (error: IError) => {
                    this._onCaptureError(error);
                    this._updateMenuItemState(this._saveResultToolbarItemsIds.captureScreenShot, false);
                });

            },
            (error) => {
                VSS.globalProgressIndicator.actionCompleted(captureProgressId);
                this._updateMenuItemState(this._saveResultToolbarItemsIds.captureScreenShot, false);
                this.showXTInstallationGuidance();
            });

        this._updateMenuItemState(this._saveResultToolbarItemsIds.captureScreenShot, true);
    }

    private _updateMenuItemState(menuItem: string, isDisabled: boolean) {
        this._saveResultToolbar.updateCommandStates(
            [{
                id: menuItem,
                disabled: isDisabled
            }]
        );
    }

    private _logTelemetryForActiveWindows(items: IActiveTabMetaData[], command: string) {
        let noOfWindows = 0;
        if (items) {
            noOfWindows = items.length;
        }

        if (command === this._saveResultToolbarItemsIds.captureScreenShot) {
            TelemetryService.publishEvents(TelemetryService.featureActiveWindowsForScreenshot, { count: noOfWindows });
        }
        else if (command === this._saveResultToolbarItemsIds.captureActions) {
            TelemetryService.publishEvents(TelemetryService.featureActiveWindowsForCaptureAction, { count: noOfWindows });
        }
    }

    private _getWindows(callback: (items: IActiveTabMetaData[]) => void, command: string) {
        ActiveWindowDataCollection.getActiveWindowsInfo((activeWindowsInfo: IActiveTabMetaData[]) => {
            this._logTelemetryForActiveWindows(activeWindowsInfo, command);
            callback.call(this, activeWindowsInfo);
        },
            (error: any) => {
                //launch xt guidance dialog over here
                this._isExtensionInstalled = false;
                callback.call(this, []);
                Dialogs.Dialog.show<Dialogs.Dialog>(TestDataCollectorMessageDialog, {
                    okCallback: Utils_Core.delegate(this, this._onInstallExtension)
                });

                if (command === this._saveResultToolbarItemsIds.captureScreenShot && this._screenshotSelectorControl) {
                    this._screenshotSelectorControl.hidePopup();
                }
                else if (command === this._saveResultToolbarItemsIds.captureActions && this._actionLogWindowSelectorControl) {
                    this._actionLogWindowSelectorControl.hidePopup();
                }

            }
        );
    }

    private _onFileAttached(attachedFile: any) {
        if (!attachedFile) {
            return;
        }
        DAUtils.trackAction("AddAttachment", "/Execution");
        this._getActiveIterationResult().addAttachment(new TestsOM.AttachmentInfo(parseInt(attachedFile.Id), attachedFile.Name, parseInt(attachedFile.Size), attachedFile.Comment), true);
        this.onActiveResultUpdated();
        this._updateFooterInfo();
        TelemetryService.publishEvents(TelemetryService.featureAddTestResultAttachment, {});
    }

    private _attachFileFormAction(callbackName: string): string {
        return TMUtils.getTestResultManager().getApiLocation("UploadAttachment", {
            callback: callbackName,
            testRunId: this._getActiveTestResult().id.testRunId,
            testResultId: this._getActiveTestResult().id.testResultId,
            iterationId: this._getActiveIterationResult().iterationId
        });
    }

    private _tryCallHandlePageUnload() {
        var message = this._beforePageUnload({});
        if (!message) {
            this._handlePageUnload();
            this._isHandlePageUnloadProcessed = true;
        }
    }

    private _saveAndCloseTestResult() {
        /// <summary>Calculate the outcome if needed, save the TestResult and close the window</summary>
        this._showNavigationPrompt = false;
        this._isSaveAndCloseClicked = true;
        if (!this._isVerifyMode) {
            this.saveActiveTestCaseAndResult(() => {
                if (DesktopTestRunHelper.isRequestFromDtr()) {
                    this._beforePageUnload({});
                } else {
                    this._tryCallHandlePageUnload();
                    window.close();
                }
            });
        }
        else {
            this.saveActiveTestCaseAndResult(() => {
                this.showVerifyBugPrompt();
            });
        }
    }

    private _updateFooterInfo(): void {
        let footerSection = this._element.find(".test-run-footer");
        if (!this._isFooterBarCreated) {
            this._isFooterBarCreated = true;
            this._footerBar = <Menus.MenuBar>Controls.BaseControl.createIn(Menus.MenuBar, footerSection, {
                cssClass: "test-run-footer-menu-bar",
                items: this._createFooterSectionItems(),
                executeAction: delegate(this, this._onFooterSectionClick)
            });
            let attachmentClassSelector = ".test-result-attachments-menu-item";
            this._footerBar.getElement().on("keyup", attachmentClassSelector, (e) => {
                if (e && e.which === Utils_UI.KeyCode.DELETE) {
                    let attachments = this._getActiveIterationResult().getAttachments();
                    let index = $(attachmentClassSelector).index(e.target);
                    if (index >= 0 && index < attachments.length) {
                        let attachmentData = attachments[index];
                        let attachmentId = attachmentData.getId(), attachmentName = attachmentData.getName();
                        this._deleteTestResultAttachment(attachmentId, attachmentName);
                    }
                }
            });
        }
        else {//update items in footer bar            
            this._footerBar.updateItems(this._createFooterSectionItems());
        }

    }

    private _getBugMenuTitle(): string {
        let footerTitle = Resources.TestRunnerFooterCreateOrUpdateBug;

        if (!this._isVerifyMode) {
            return Utils_String.format(footerTitle, this._bugCategoryTypeName, this._getActiveIterationResult().getBugs().length);
        }
        else {
            if (this._getActiveIterationResult().getBugs().length > 0) {
                return this._getVerifiedBugCreatedBugTitle();
            }
            else {
                return Utils_String.format(Resources.BugBeingVerifiedTitle, one);
            }
        }
    }

    private _getVerifiedBugCreatedBugTitle(): string {
        let bugBeingVerifiedTitle = Utils_String.format(Resources.BugBeingVerifiedTitle, one);
        let bugCreatedTitle = Utils_String.format(this._getBugCreatedTitle(), this._getActiveIterationResult().getBugs().length);
        let title = Utils_String.format("{0} \n{1}", bugBeingVerifiedTitle, bugCreatedTitle);
        return title;
    }

    private _getAttachmentMenuTitle(): string {
        return Utils_String.format(Resources.TestRunFooterCreatedAttachments, this._getActiveIterationResult().getAttachments().length);
    }

    private _createFooterSection() {
        /// <summary>Creates the footer section</summary>
        let _$footerSection = this._element.find(".test-run-footer");
        _$footerSection.append("<div class='testrun-testcase-configuration'></div>");

        this._createBuildIconInFooter(_$footerSection);
    }

    private _createBuildIconInFooter($footerSection: JQuery) {
        let buildUri: string = this._testRunAndResult.testRun.buildUri;
        if (buildUri && buildUri !== "") {
            let buildArtifact: VSS_Artifacts_Services.IArtifactData = LinkingUtilities.decodeUri(buildUri);

            if (buildArtifact && buildArtifact.id) {
                //Get the build to display the build Number
                let buildService = TcmService.ServiceManager.instance().buildService();
                buildService.getBuild(parseInt(buildArtifact.id)).then((buildObject: BuildContracts.Build) => {
                    if (buildObject && buildObject.buildNumber) {
                        let $buildFooter: JQuery = $("<div class='bowtie-icon bowtie-build test-run-build-footer' />");
                        RichContentTooltip.add("Build: " + buildObject.buildNumber, $buildFooter, { setAriaDescribedBy: true });
                        $footerSection.append($buildFooter);
                    }
                });
            }
        }
    }

    private _createFooterSectionItems(): Menus.IMenuItemSpec[] {
        /// <summary>Creates the items list for the footer section</summary>
        /// <returns type="Object">Items list for the footer section</returns>
        let items: Menus.IMenuItemSpec[] = [];
        if (this._getActiveIterationResult().getBugs().length > 0 || this._isVerifyMode) {
            items.push({
                id: this._footerSectionItemsIds.createdBugs,
                idIsAction: false,
                icon: "bowtie-icon bowtie-file-bug bowtie-white-fill",
                title: this._getBugMenuTitle(),
                text: Utils_String.format("{0}", this._getActiveIterationResult().getBugs().length + (this._isVerifyMode ? 1 : 0)),
                childItems: this._createBugList()
            });
        }

        if (this._getActiveIterationResult().getAttachments().length > 0) {
            items.push({
                cssClass: "test-result-attachments",
                id: this._footerSectionItemsIds.createdAttachments,
                idIsAction: false,
                icon: "bowtie-icon bowtie-attach bowtie-white-fill",
                text: Utils_String.format("{0}", this._getActiveIterationResult().getAttachments().length),
                title: this._getAttachmentMenuTitle(),
                childItems: this._createResultAttachmentList(this._getActiveIterationResult().getAttachments())
            });
        }
        return items;
    }

    private _createBugList(): Menus.IMenuItemSpec[] {
        let menuItems: Menus.IMenuItemSpec[] = [];

        if (this._isVerifyMode) {
            menuItems.push({
                cssClass: "bug-menu-item-header",
                id: "Bug-being-verified",
                noIcon: true,
                text: Resources.BugBeingVerified
            });
            menuItems.push({
                id: this._footerSectionItemsIds.createdBugs + this._verifyBugInfo.id.toString(),
                noIcon: true,
                text: Utils_String.format(Resources.TestRunFooterBugId, this._verifyBugInfo.id, this._verifyBugInfo.title),
                "arguments": { bugId: this._verifyBugInfo.id }
            });
            if (this._getActiveIterationResult().getBugs().length > 0) {
                let bugsCreatedText = this._getBugCreatedTitle();

                menuItems.push({
                    cssClass: "bug-menu-item-header",
                    id: "Bugs-created",
                    noIcon: true,
                    text: bugsCreatedText
                });
            }
        }
        $.each(this._getActiveIterationResult().getBugs(), (i: number, bugData: TestsOM.BugInfo) => {
            menuItems.push({
                id: this._footerSectionItemsIds.createdBugs + bugData.getId().toString(),
                noIcon: true,
                text: Utils_String.format(Resources.TestRunFooterBugId, bugData.getId(), bugData.getTitle()),
                // passing the bug id as argument
                "arguments": { bugId: bugData.getId() }
            });
        });
        return menuItems;
    }

    private _getBugCreatedTitle() {
        return Resources.BugsCreatedOrUpdated;
    }

    private _createResultAttachmentList(testResultAttachments: TestsOM.AttachmentInfo[]): Menus.IMenuItemSpec[] {
        let attachmentItems: Menus.IMenuItemSpec[] = [],
            that = this;

        $.each(testResultAttachments, (i: number, attachmentData: TestsOM.AttachmentInfo) => {
            attachmentItems.push({
                cssClass: "test-result-attachments-menu-item",
                id: that._footerSectionItemsIds.createdAttachments + attachmentData.getId().toString(),
                icon: "bowtie-icon bowtie-edit-delete bowtie-icon-small",
                text: Utils_String.format("{0} {1}", this.getTrimmedAttachmentName(attachmentData.getName()), Utils_String.format(Resources.TestStepAttachmentSizeFormat, Math.ceil(attachmentData.getSize() / 1024))),
                arguments: { attachmentId: attachmentData.getId(), attachmentName: attachmentData.getName() }
            });
        });

        return attachmentItems;
    }

    private getTrimmedAttachmentName(name: string): string {
        if (name && name.length > this._maxLengthOfAttachmentNameShownInFooter) {
            return name.substr(0, this._maxLengthOfAttachmentNameShownInFooter) + "...";
        }

        return name;
    }

    private _onFooterSectionClick(e?: any) {
        /// <summary>Handles the execution of the footer section items</summary>
        /// <param name="e" type="Object">The execution event</param>
        let command = e.get_commandName(),
            actionArgs = e.get_commandArgument();

        //Execute the specific Menu command
        if (Utils_String.startsWith(command, this._footerSectionItemsIds.createdBugs)) {
            this._openWorkItem(actionArgs.bugId);
        }
        else if (Utils_String.startsWith(command, this._footerSectionItemsIds.createdAttachments)) {
            this._handleResultAttachmentActions(actionArgs);
        }
    }

    private _handleResultAttachmentActions(actionArgs: any) {
        let clickArgs = actionArgs.clickArguments,
            params = {
                attachmentId: actionArgs.attachmentId
            };

        if (clickArgs && (($(clickArgs.target).hasClass("icon")) || ($(clickArgs.target).hasClass("bowtie-icon")))) {
            this._deleteTestResultAttachment(actionArgs.attachmentId, actionArgs.attachmentName);
        }
        else {
            Events_Action.getService().performAction(Events_Action.CommonActions.ACTION_WINDOW_OPEN, {
                url: TMUtils.getTestResultManager().getApiLocation("DownloadAttachment", params),
                target: "_blank"
            });
        }
    }

    private _deleteTestResultAttachment(attachmentId: number, attachmentName: string) {
        let testCaseResult: TestsOM.TestCaseResult = this._getActiveTestResult();

        if (confirm(Utils_String.format(Resources.ConfirmAttachmentDeletion, attachmentName))) {
            this._deleteAttachmentFromServer(attachmentId, () => {
                this._removeAttachmentFromList(attachmentId);
                testCaseResult.setIsDirty(true);
                this.onActiveResultUpdated();
                this._updateFooterInfo();
            },

                (error) => {
                    alert(VSS.getErrorMessage(error));
                });
        }
    }

    private _removeAttachmentFromList(attachmentId: number): void {
        let attachmentToRemove: TestsOM.AttachmentInfo,
            i: number,
            attachments: TestsOM.AttachmentInfo[] = this._getActiveIterationResult().getAttachments();

        for (i = 0; i < attachments.length; i++) {
            if (attachments[i].getId() === attachmentId) {
                attachmentToRemove = attachments[i];
                break;
            }
        }

        if (attachmentToRemove) {
            Utils_Array.remove(this._getActiveIterationResult().getAttachments(), attachmentToRemove);
        }
    }

    private _deleteAttachmentFromServer(attachmentId: number, successCallback?: IResultCallback, errorCallback?: IErrorCallback): void {
        let testCaseResult: TestsOM.TestCaseResult = this._getActiveTestResult();
        TMUtils.getTestResultManager().deleteAttachment(attachmentId, testCaseResult.id.testRunId, testCaseResult.id.testResultId, successCallback, errorCallback);
    }

    private _openWorkItem(bugId) {
        Menus.menuManager.executeCommand(new Events_Handlers.CommandEventArgs("open-work-item", {
            id: bugId,
            tfsContext: TFS_Host_TfsContext.TfsContext.getDefault(),
            options: {
                save: (workItem) => {
                    this._workItemSaved = true;
                },

                close: (workItem) => {
                    if (this._isUpdateVerifyBugWindowOpened) {
                        this._bugUnderVerificationClosed = true;
                    }
                    this._restoreWindowSize();
                    if (this._workItemSaved) {
                        this._workItemSaved = false;
                        this._updateCreatedBugList(bugId, workItem.getTitle());
                    }
                }
            }
        }, this._tryResizeWindow(true, true)));
    }

    private _updateCreatedBugList(bugid, title) {
        let i, bugData, bugMenuItem,
            bugs: TestsOM.BugInfo[] = this._getActiveIterationResult().getBugs();
        for (i = 0; i < bugs.length; i++) {
            bugData = bugs[i];
            if (bugData.getId() === bugid) {

                // Check if the title of the bug has been edited
                if (bugData.getTitle() !== title) {
                    bugData.setTitle(title);

                    // Get the menu item that belongs to this bug
                    bugMenuItem = this._footerBar._menuItems[0]._children[0]._menuItems[i];
                    bugMenuItem.updateTitle(title);
                    bugMenuItem.updateText(Utils_String.format(Resources.TestRunFooterBugId, bugData.getId(), title));
                }
                break;
            }
        }
    }

    private _populateBorderSize(width, height) {
        /// <summary>Calculate the border size(width and height) for the TestRunner window. We will need this in re-adjusting the size of TestRunner window after closure of workitem form</summary>
        this._borderSize = {
            // $(window).width() gives the content width.
            width: width - $(window).width(),
            height: height - $(window).height()
        };

    }

    private _resizeWindowForBugForm(restoreSize: boolean) {
        if (!restoreSize) {
            this._tryResizeWindow(true, true);
        } else {
            this._restoreWindowSize();
        }
    }

    private _saveWindowSize() {
        this._runWindowSize = this._getWindowSize();
        this._windowNeedsRestore = true;
    }

    private _getWindowSize(): TestRunWindowSize {
        //outerWidth is not implemented by IE8
        let testRunWindowSize = new TestRunWindowSize();
        testRunWindowSize.width = window.outerWidth ? window.outerWidth : $(window).width() + this._borderSize.width;
        testRunWindowSize.height = window.outerHeight ? window.outerHeight : $(window).height() + this._borderSize.height;
        return testRunWindowSize;
    }

    private _restoreWindowSize() {
        if (this._windowNeedsRestore) {
            if (DesktopTestRunHelper.isRequestFromDtr()) {
                DesktopTestRunHelper.testRunnerResize(false, this._runWindowSize.width, this._runWindowSize.height);
            }
            window.resizeTo(this._runWindowSize.width, this._runWindowSize.height);
            this._windowNeedsRestore = false;
            // Bug 1042266:[IE8,Firefox] On Save &Close of the bug the comments gets clipped.
            // So calling the resize of the textArea after the bugs is Closed and window size restored.
            if (this._$testResultCommentTextArea[0].clientHeight !== this._$testResultCommentTextArea[0].scrollHeight) {
                this._commentManager.resizeTextArea(this._$testResultCommentTextArea[0]);
            }
            Diag.logTracePoint("TestRunView.RestoreResize.completed");
        }
        else if (this._isUpdateVerifyBugWindowOpened && this._bugUnderVerificationClosed) {
            this._tryCallHandlePageUnload();
            window.close();
        }
    }

    private _refreshTest() {

        // Get the latest result for the test from the server.
        let activeTestCaseResult = this._getActiveTestResult(),
            activeResultIndex = this.getActiveTestResultIndex(),
            testRunId = activeTestCaseResult.id.testRunId,
            testCaseResultId = activeTestCaseResult.id.testResultId,
            testCaseResult,
            i = 0,
            length = this._testRunAndResult.testCaseResults.length,
            testCaseResults = this._testRunAndResult.testCaseResults,
            activeIterationIndex = this.getActiveTestIterationResultIndex(),
            testCase = this._getActiveTestCase(),
            iterationToBugMap = this._getIterationToBugMap(activeTestCaseResult),
            iterationToAttachmentMap = this._getIterationToAttachmentMap(activeTestCaseResult);

        TMUtils.getTestResultManager().getTestCaseResults(testRunId, [testCaseResultId], (testCaseResultWithActionResults: TestsOM.ITestCaseResultWithActionResultModel) => {
            testCaseResult = TestsOM.TestCaseResult.createTestCaseResultObject(testCaseResultWithActionResults[0].testCaseResult, testCaseResultWithActionResults[0].testActionResultDetails);
            testCase.getWorkItemWrapper().getWorkItem().resetManualFieldChanges();
            testCase.refreshTestStepsFromWorkItem();
            this._refreshParametersAndDataFromWorkItem(testCase, testCaseResult);
            this._prepareIterationResultsAndStepResults(testCaseResult, testCase);
            testCaseResult.setTestCase(testCase);
            this._restoreBugInfo(testCaseResult, iterationToBugMap);
            this._restoreAttachmentInfo(testCaseResult, iterationToAttachmentMap);

            for (i = 0; i < length; i++) {
                if (testCaseResults[i].id.testResultId === testCaseResultId) {
                    testCaseResults[i] = testCaseResult;
                    break;
                }
            }

            this._setActiveTestCaseResultAndIteration(activeResultIndex, activeIterationIndex);
        });
    }

    private _refreshParametersAndDataFromWorkItem(testCase: TestsOM.TestCase, testCaseResult: TestsOM.TestCaseResult) {
        let parametersXml = testCase.getWorkItemWrapper().getFieldValue(TCMConstants.WorkItemFieldNames.Parameters, testCase.getWorkItemWrapper().getRevision()),
            parameters: string[] = TestsOM.ParameterCommonUtils.parseParameters($(Utils_Core.parseXml(parametersXml || ""))),
            parametersDataXml = testCase.getWorkItemWrapper().getFieldValue(TCMConstants.WorkItemFieldNames.DataField, testCase.getWorkItemWrapper().getRevision()),
            parametersData: any[] = TMUtils.ParametersHelper.parseParametersData($(Utils_Core.parseXml(parametersDataXml || "")), parameters),
            sharedStepIdsAndRevs = TMUtils.TestCaseResultUtils.getSharedStepIdAndRevs(testCase, testCaseResult),
            sharedStepIds = TMUtils.getIdsFromIdAndRevs(sharedStepIdsAndRevs);

        testCase.setParameters(parameters);
        testCase.setData(parametersData);
        this.mergeSharedStepParametersAndData(testCase, sharedStepIds);
    }

    private _getIterationToBugMap(testCaseResult: TestsOM.TestCaseResult) {
        let index = 0,
            iterations = testCaseResult.iterations.getItems(),
            length = iterations.length,
            iterationToBugMap = {};

        for (index = 0; index < length; index++) {
            iterationToBugMap[index] = iterations[index].getBugs();
        }

        return iterationToBugMap;
    }

    private _getIterationToAttachmentMap(testCaseResult: TestsOM.TestCaseResult) {
        let index = 0,
            iterations = testCaseResult.iterations.getItems(),
            length = iterations.length,
            iterationToAttachmentMap = {};

        for (index = 0; index < length; index++) {
            iterationToAttachmentMap[index] = iterations[index].getAttachments();
        }

        return iterationToAttachmentMap;
    }

    private _restoreBugInfo(testCaseResult: TestsOM.TestCaseResult, iterationToBugMap) {
        let index = 0,
            iterations = testCaseResult.iterations.getItems(),
            length = iterations.length,
            bugs: TestsOM.BugInfo[];

        for (index = 0; index < length; index++) {
            bugs = iterationToBugMap[index];
            iterations[index].setBugs(bugs);
        }
    }

    private _restoreAttachmentInfo(testCaseResult: TestsOM.TestCaseResult, iterationToAttachmentMap) {
        let index = 0,
            iterations = testCaseResult.iterations.getItems(),
            length = iterations.length,
            attachments: TestsOM.AttachmentInfo[];

        for (index = 0; index < length; index++) {
            attachments = iterationToAttachmentMap[index];
            iterations[index].setAttachments(attachments);
        }
    }

    private _getActiveResultIndex() {
        let activeTestCaseResult = this._getActiveTestResult(),
            i = 0,
            length = this._testRunAndResult.testCaseResults.length,
            testCaseResults = this._testRunAndResult.testCaseResults;

        for (i = 0; i < length; i++) {
            if (testCaseResults[i] === activeTestCaseResult) {
                return i;
            }
        }

    }

    private _onBugFiled(workItem) {

        let activeIteration: TestsOM.TestIterationResult = this._getActiveIterationResult();

        // Track that a bug has been filed on the iteration. This is used while auto-computing iteration result.
        this._getActiveIterationResult().addBug(new TestsOM.BugInfo(workItem.id, workItem.getTitle()));

        // Link bug to test case result and and to the test case.
        this._linkBugToTest(workItem);

        this._linkSystemInfoToBug(workItem);

        this._updateFooterInfo();
    }

    private _linkSystemInfoToBug(workItem: WITOM.WorkItem) {
        if (this.currentSystemInfoAttachment) {
            TMUtils.getWorkItemTrackingManager().addResultAttachmentToWorkItem(this.currentSystemInfoAttachment.artifactUri, workItem.id);
            this.currentSystemInfoAttachment = null;
        }
    }



    private _tryResizeWindow(withWorkItemDialog, saveWindowSize) {
        let $uidialog,
            bugFormWidth,
            newWidth = $(window).width(),
            newHeight = $(window).height(),
            resizeWindow = false;

        if (withWorkItemDialog) {
            $uidialog = $(".ui-dialog");
            bugFormWidth = $uidialog.width();

            // Ensure that the new window width is atleast more than the bug form width by 30 pixels.
            if (newWidth < bugFormWidth + 30) {
                newWidth = bugFormWidth + 30;
                resizeWindow = true;
            }
        }

        // Also give enough room to ensure that we have enough space to enter/view bug details. 
        if (newWidth < (window.screen.availWidth * 0.8)) {
            newWidth = window.screen.availWidth * 0.8;
            resizeWindow = true;
        }

        // If the height of the window is less than half of the screen height, occupy the entire height.
        if ($(window).height() < window.screen.availHeight / 2) {
            newHeight = window.screen.availHeight;
            resizeWindow = true;
        }

        // Perform actual resizing.
        if (resizeWindow) {

            if (saveWindowSize) {
                // Save window size.
                this._saveWindowSize();
            }

            if (DesktopTestRunHelper.isRequestFromDtr()) {
                DesktopTestRunHelper.testRunnerResize(!!withWorkItemDialog, newWidth, newHeight);
            }
            // Resize window.
            window.resizeTo(newWidth, newHeight);
        }
    }


    private _resizeWindowsToTheSizeOfAddToExistingBugDialog(bugFormWidth: number, bugFormHeight: number) {
        let newWidth = $(window).width(),
            newHeight = $(window).height(),
            resizeWindow = false;

        // Ensure that the new window width is atleast more than the bug form width by 60 pixels.
        if (newWidth < bugFormWidth + 60) {
            newWidth = bugFormWidth + 60;
            resizeWindow = true;
        }

        if (newHeight < bugFormHeight + 60) {
            newHeight = bugFormHeight + 60;
            resizeWindow = true;
        }

        // Perform actual resizing.
        if (resizeWindow) {
            this._saveWindowSize();
            // Resize window.
            window.resizeTo(newWidth, newHeight);

            resizeWindow = false;
            if ($(window).width() < bugFormWidth && newWidth < (window.screen.availWidth * 0.8)) {
                newWidth = window.screen.availWidth * 0.8;
                resizeWindow = true;
            }
            if ($(window).height() < bugFormHeight && newHeight < (window.screen.availHeight * 0.8)) {
                newHeight = window.screen.availHeight * 0.8;
                resizeWindow = true;
            }
            if (DesktopTestRunHelper.isRequestFromDtr()) {
                DesktopTestRunHelper.testRunnerResize(true, newWidth, newHeight);
            }
            window.resizeTo(newWidth, newHeight);
        }
    }

    private _getStepInfoForActionLog(): IActionLogStepData[] {
        let iteration = this._getActiveIterationResult();
        let actionLogStepData: IActionLogStepData[] = [];
        if (iteration) {
            let actionResults = iteration.actionResults.getItems();
            if (actionResults.length > 0) {
                for (let i = 0; i < actionResults.length; i++) {
                    let action = actionResults[i].getAction();
                    if (!actionResults[i].isFormatted()) {
                        action = TestsOM.HtmlUtils.replaceNewLineWithBr(action);
                    }

                    let stepData: IActionLogStepData = { title: action, timeStamp: actionResults[i].actionLogTimeStamp ? actionResults[i].actionLogTimeStamp.toString() : null };
                    //Handling shared step data
                    if (actionResults[i] instanceof TestsOM.SharedStepResult) {
                        let sharedStepResults = actionResults[i].actionResults.getItems();
                        for (let j = 0; j < sharedStepResults.length; j++) {
                            if (sharedStepResults[j].actionLogTimeStamp && (!stepData.timeStamp || sharedStepResults[j].actionLogTimeStamp.getTime() > new Date(stepData.timeStamp).getTime())) {
                                stepData.timeStamp = sharedStepResults[j].actionLogTimeStamp.toString();
                            }
                        }
                    }

                    actionLogStepData.push(stepData);
                }
            }
        }

        return actionLogStepData;
    }

    private _resetActionLogTimeStamp() {
        let iteration = this._getActiveIterationResult();
        let actionResults = iteration.actionResults.getItems();

        for (let i = 0; i < actionResults.length; i++) {
            actionResults[i].actionLogTimeStamp = null;
            // shared Step Handling
            if (actionResults[i] instanceof TestsOM.SharedStepResult) {
                let sharedStepResults = actionResults[i].actionResults.getItems();
                for (let j = 0; j < sharedStepResults.length; j++) {
                    sharedStepResults[j].actionLogTimeStamp = null;
                }
            }
        }
    }

    private _getBugData() {
        let testCase = this._getActiveTestCase(),
            testRun = this._testRunAndResult.testRun,
            iteration = this._getActiveIterationResult(),
            testCaseResult = this._getActiveTestResult(),

            bugFiler = new BugFiler(testRun, testCase, testCaseResult, iteration, this._videoAttachmentContainer, this._actionLogAttachmentContainer);

        return bugFiler.getBugFilingData();

    }

    private _linkBugToTest(bug: WITOM.WorkItem) {
        // Link bug to test case result.
        let testCaseResult = this._getActiveTestResult();

        if ($.inArray(bug.id, testCaseResult.linkedBugs) > -1) {
            return;
        }

        testCaseResult.associateWorkItem(TMUtils.getTestResultManager(), bug, () => {

            // Save test case result after the bug is filed.
            this.saveActiveTestCaseAndResult();
        },

            function (error) {
                VSS.errorHandler.showError(VSS.getErrorMessage(error));
            });
    }

    private _saveWorkItem(workItem: WITOM.WorkItem) {
        // Save the work item.
        workItem.beginSave(function () {
            // TODO: Add any logging here to measure performance of save bug.
        },

            function (error) {
                VSS.errorHandler.showError(VSS.getErrorMessage(error));
            });
    }

    private _createAndShowWorkItem(workItemTypeName, options?, workItemData?, callback?) {
        let that = this,
            TfsContext = TFS_Host_TfsContext.TfsContext.getDefault(),
            witStore = WITUtils.getWorkItemStore();

        Diag.Debug.assertIsNotNull(witStore);
        witStore.beginGetProject(TfsContext.navigation.projectId, function (project: WITOM.Project) {
            project.beginGetWorkItemType(workItemTypeName, function (wit) {

                // Create work item.
                let workItem = WorkItemManager.get(witStore).createWorkItem(wit);
                Diag.Debug.assertIsNotNull(workItem);

                witStore.beginGetLinkTypes(function () {

                    TMUtils.WorkItemUtils.GetTeamSettingsData().then((teamSettingsData: TestsOM.TeamSettingsData) => {
                        // Populate work item.
                        that._populateWorkItem(workItem, workItemData, teamSettingsData);

                        // Show the work item.
                        that.showWorkItem(workItem, options, function () {
                            that._tryResizeWindow(false, true);
                        },
                            function () {
                                that._tryResizeWindow(true, false);
                                Diag.logTracePoint("TestRunView.FileBug.completed");
                            });
                    });
                });
            });
        });
    }

    private _populateWorkItem(workItem: WITOM.WorkItem, workItemData, teamSettingsData: TestsOM.TeamSettingsData, isUpdate?: boolean) {
        let witField,
            activeTestResult: TestsOM.TestCaseResult = this._getActiveTestResult(),
            testCase: TestsOM.TestCase = this._getActiveTestCase();

        for (witField in workItemData) {
            if (workItemData.hasOwnProperty(witField)) {
                if (workItemData[witField]) {
                    let data = workItemData[witField];
                    if (witField === TestsOM.BugWITFields.ReproSteps) {
                        data = workItem.getFieldValue(witField) + data;

                    }
                    if (isUpdate && (witField === WITConstants.CoreFieldRefNames.AreaPath || witField === WITConstants.CoreFieldRefNames.IterationPath)) {
                        // In the update flow we dont want to update the Area Path or Iteration Path
                        continue;
                    }
                    workItem.setFieldValue(witField, data);
                }
            }
        }

        // Add result link to work item.
        activeTestResult.addResultLinkToWorkItem(workItem);

        //Add iteration result attachment links to work item
        this._associateIterationResultAttachmentsWithBug(workItem);

        // Associate inprogress data collector attachment
        this._associateInProgressDataCollectorAttachmentWithBug(workItem);

        //Add Requirement Link
        this._addRequirementLink(workItem, teamSettingsData, isUpdate);

        //Add associated build Link
        this._addBuildLink(workItem);

        // Link test case to bug.
        TestsOM.WitLinkingHelper.linkTestCaseToBug(workItem, testCase.getId(), isUpdate);
    }

    private _addRequirementLink(workItem: WITOM.WorkItem, teamSettingsData: TestsOM.TeamSettingsData, isUpdate?: boolean) {
        if (this._testSuite !== null && this._testSuite.type === TCMConstants.TestSuiteType.RequirementTestSuite && this._testSuite.requirementId !== workItem.id) {
            if (teamSettingsData && teamSettingsData.getBugsBehavior() === TFS_AgileCommon.BugsBehavior.AsRequirements) {
                TestsOM.WitLinkingHelper.linkRequirementSuiteToBugWithRelatedLink(workItem, this._testSuite.requirementId, isUpdate);
            }
            else {
                TestsOM.WitLinkingHelper.linkRequirementSuiteToBugWithParentLink(workItem, this._testSuite.requirementId, isUpdate);
            }
        }
    }

    private _addBuildLink(workItem: WITOM.WorkItem) {
        let buildUri: string = this._testRunAndResult.testRun.buildUri;
        let externalLink: WITOM.ExternalLink;

        if (buildUri && buildUri !== "") {
            let isBuildLinkPresent: boolean = workItem.getLinks().some((link: WITOM.Link) => {
                return Utils_String.equals(link.getArtifactLinkType(), RegisteredLinkTypeNames.FoundInBuild)
                    && Utils_String.equals(link.getLinkUrl(), buildUri);
            });
            // If the build is not already added as a link then only add the build as link
            if (!isBuildLinkPresent) {
                externalLink = ExternalLink.create(workItem, RegisteredLinkTypeNames.FoundInBuild, buildUri);
                workItem.addLink(externalLink);
            }
        }
    }

    private _associateInProgressDataCollectorAttachmentWithBug(workItem) {
        let activeIterationResult: TestsOM.TestIterationResult = this._getActiveIterationResult();
        if (this._videoAttachmentContainer) {
            let attachmentInfo = new TestsOM.AttachmentInfo(parseInt(this._videoAttachmentContainer.Id), this._videoAttachmentContainer.Name, this._videoAttachmentContainer.Size, null);
            activeIterationResult.addResultAttachmentLinkToWorkItem(attachmentInfo, workItem);
        }

        if (this._actionLogAttachmentContainer) {
            let attachmentInfo = new TestsOM.AttachmentInfo(parseInt(this._actionLogAttachmentContainer.Id), this._actionLogAttachmentContainer.Name, parseInt(this._actionLogAttachmentContainer.Size), null);
            activeIterationResult.addResultAttachmentLinkToWorkItem(attachmentInfo, workItem);
        }
    }

    private _associateIterationResultAttachmentsWithBug(workItem: WITOM.WorkItem) {
        let activeIterationResult: TestsOM.TestIterationResult = this._getActiveIterationResult(),
            iterationAttachments: TestsOM.AttachmentInfo[] = activeIterationResult.getAttachments(),
            attachmentCount: number = iterationAttachments.length,
            i: number,
            j: number;

        for (i = 0; i < attachmentCount; i++) {
            activeIterationResult.addResultAttachmentLinkToWorkItem(iterationAttachments[i], workItem);
        }

        //add links for step result attachments
        let stepResults = activeIterationResult.actionResults.getItems();

        if (stepResults) {
            for (i = 0; i < stepResults.length; i++) {
                if (stepResults[i] instanceof TestsOM.TestStepResult) {
                    this._addStepAttachmentAsLink(stepResults[i], activeIterationResult, workItem);
                }
                else if (stepResults[i] instanceof TestsOM.SharedStepResult) {
                    let substepResults = stepResults[i].actionResults.getItems();

                    if (substepResults) {
                        for (j = 0; j < substepResults.length; j++) {
                            if (substepResults[j] instanceof TestsOM.TestStepResult) {
                                this._addStepAttachmentAsLink(substepResults[j], activeIterationResult, workItem);
                            }
                        }
                    }
                }
            }
        }
    }

    private _addStepAttachmentAsLink(stepResult, activeIterationResult: TestsOM.TestIterationResult, workItem: WITOM.WorkItem) {
        let attachmentCount: number = 0;
        if (stepResult.attachments) {
            attachmentCount = stepResult.attachments.length;

            for (let index: number = 0; index < attachmentCount; index++) {
                let attachedFile = stepResult.attachments[index];
                let stepAttachmentInfo: TestsOM.AttachmentInfo = new TestsOM.AttachmentInfo(attachedFile.Id, attachedFile.Name, attachedFile.Size, attachedFile.Comment);
                activeIterationResult.addResultAttachmentLinkToWorkItem(stepAttachmentInfo, workItem);
            }
        }
    }

    private _setStepResultOutCome(stepResult: TestsOM.TestActionResult, outcome: TCMConstants.TestOutcome) {
        stepResult.actionLogTimeStamp = new Date();
        if (stepResult && stepResult.outcome !== outcome) {
            stepResult.outcome = outcome;
            stepResult.setIsDirty(true);
            this.onActiveResultUpdated();
        }
    }

    private _setStepComment(stepResult: TestsOM.TestActionResult, stepComment: string) {
        if (stepResult && stepResult.errorMessage !== stepComment) {
            stepResult.errorMessage = stepComment;
            stepResult.setIsDirty(true);
            this.onActiveResultUpdated();
        }
    }

    private _setStepResultAttachment(stepResult: TestsOM.TestStepResult, attachments) {
        if (stepResult) {
            stepResult.attachments = attachments;
            stepResult.setIsDirty(true);
            this.onActiveResultUpdated();
        }
    }

    private _isActiveTestCaseAndIteration(testResultIndex: number, testIterationIndex: number) {
        /// <summary>Returns true if the given  iteration index in a testCaseResult is active</summary>
        /// <param name="testResultIndex" type="Number">The index of the TestCaseResult in the TestRun object</param>
        /// <param name="testIterationIndex" type="Number">The index of the iteration in the above TestCaseResult</param>
        return (testResultIndex === this.getActiveTestResultIndex() && testIterationIndex === this.getActiveTestIterationResultIndex());
    }

    private _canMoveToTestCaseAndIteration(testResultIndex: number, testIterationIndex: number) {
        /// <summary>Returns true if navigation can be done to a particular iteration index in a testCaseResult </summary>
        /// <param name="testResultIndex" type="Number">The index of the TestCaseResult in the TestRun object</param>
        /// <param name="testIterationIndex" type="Number">The index of the iteration in the above TestCaseResult</param>
        let testCaseResult: TestsOM.TestCaseResult;

        if (this._isActiveTestCaseAndIteration(testResultIndex, testIterationIndex)) {
            return false;
        }

        if (testResultIndex >= 0 && testResultIndex < this._testRunAndResult.testCaseResults.length) {
            testCaseResult = this._testRunAndResult.testCaseResults[testResultIndex];

            if (testCaseResult) {
                if (testIterationIndex >= 0 && testIterationIndex < testCaseResult.getIterationCount()) {
                    return true;
                }
            }
        }
        return false;
    }

    private _canMoveToNext() {
        if (this.isLastTestCaseResult() && this.isLastIterationInTestCaseResult()) {
            return false;
        }
        return true;
    }

    private _canMoveToPrevious() {
        if (this.isFirstTestCaseResult() && this.isFirstIterationInTestCaseResult()) {
            return false;
        }
        return true;
    }

    private _moveToTestCaseAndIteration(testResultIndex: number, testIterationIndex: number, callback) {
        /// <summary> Moves to a particular iteration index in a testCaseResult </summary>
        /// <param name="testResultIndex" type="Number">The index of the TestCaseResult in the TestRun object</param>
        /// <param name="testIterationIndex" type="Number">The index of the iteration in the above TestCaseResult</param>
        if (this._canMoveToTestCaseAndIteration(testResultIndex, testIterationIndex)) {
            this._saveCurrentAndSetActiveTestCaseAndIteration(testResultIndex, testIterationIndex, callback);
        }
    }

    private _moveToNext(callback) {

        if (this._canMoveToNext()) {
            if (this.isLastIterationInTestCaseResult()) {
                if (!this.isLastTestCaseResult()) {
                    this._saveCurrentAndSetActiveTestCaseAndIteration(this.getActiveTestResultIndex() + 1, 0, callback);
                }
            }
            else {
                this._saveCurrentAndSetActiveTestCaseAndIteration(this.getActiveTestResultIndex(), this.getActiveTestIterationResultIndex() + 1, callback);
            }
        }
    }
    private calculateTestResultFromIterationResults(iterations: TestsOM.TestIterationCollection) {
        let iteration,
            i: number,
            outcome = TCMConstants.TestOutcome.Passed,
            iterationsNotApplicableCount: number = 0,
            iterationsNoneCount: number = 0,
            isAnyIterationBlocked: boolean = false,
            isAnyIterationFailed: boolean = false,
            isAnyIterationPaused: boolean = false;

        if (iterations) {
            for (i = 0; i < iterations.getItems().length; i++) {
                iteration = iterations.getItems()[i];
                if (iteration.outcome === TCMConstants.TestOutcome.Paused) {
                    isAnyIterationPaused = true;
                    break;
                }
                else if (iteration.outcome === TCMConstants.TestOutcome.Failed) {
                    isAnyIterationFailed = true;
                }
                else if (iteration.outcome === TCMConstants.TestOutcome.Blocked) {
                    isAnyIterationBlocked = true;
                }
                else if (iteration.outcome === TCMConstants.TestOutcome.NotApplicable) {
                    iterationsNotApplicableCount++;
                }
                else if (iteration.outcome === TCMConstants.TestOutcome.None ||
                    iteration.outcome === TCMConstants.TestOutcome.Unspecified) {
                    iterationsNoneCount++;
                }
            }
        }
        if (iterationsNoneCount === iterations.getItems().length) {
            return TCMConstants.TestOutcome.Unspecified;
        }
        else if (isAnyIterationPaused) {
            return TCMConstants.TestOutcome.Paused;
        }
        else if (isAnyIterationFailed) {
            return TCMConstants.TestOutcome.Failed;
        }
        else if (isAnyIterationBlocked) {
            return TCMConstants.TestOutcome.Blocked;
        }
        else if ((iterationsNotApplicableCount + iterationsNoneCount) === iterations.getItems().length) {
            return TCMConstants.TestOutcome.NotApplicable;
        }

        return TCMConstants.TestOutcome.Passed;
    }

    private autoComputeResultFromIterationResults() {
        let testCaseResult: TestsOM.TestCaseResult = this._getActiveTestResult(),
            outcome: TCMConstants.TestOutcome;

        // If a bug has been filed on the test case result, mark the test result as failed. 
        outcome = this.calculateTestResultFromIterationResults(testCaseResult.iterations);

        TMUtils.setTestResultOutcomeLocally(testCaseResult, outcome);

        // Update the status of the testCaseResult in the Navigation dropdown, passing -1 for the iteration index because we want to update the status of the testCaseResult and not the active iteration
        this._testCasesNavigator._updateOutcomeInTestCaseDropDown(this.getActiveTestResultIndex(), -1, outcome);
    }

    private _autoComputeIfNeeded() {
        let testCaseResult = this._getActiveTestResult(),
            iterationResult = this._getActiveIterationResult(),
            outcome;

        if (iterationResult.outcome === TCMConstants.TestOutcome.Unspecified ||
            // This outcome is possible when a paused test is updated from Dev10 MTM. In that case, autocompute result.
            iterationResult.outcome === TCMConstants.TestOutcome.Inconclusive ||
            iterationResult.isOutComeAutoComputed) {
            outcome = this._calculateResultFromStepResults(iterationResult);
            TMUtils.setIterationAndTestResultOutcomeLocally(iterationResult, outcome, testCaseResult, outcome);
            this._onActiveTestResultOutComeUpdated(outcome);
            iterationResult.isOutComeAutoComputed = true;
        }
    }

    private _moveToPrevious(callback) {

        let activeTestCaseIndex: number = this.getActiveTestResultIndex(),
            prevTestCaseResult: TestsOM.TestCaseResult;

        if (this._canMoveToPrevious()) {
            if (this.isFirstIterationInTestCaseResult()) {
                prevTestCaseResult = this._testRunAndResult.testCaseResults[activeTestCaseIndex - 1];
                this._saveCurrentAndSetActiveTestCaseAndIteration(this.getActiveTestResultIndex() - 1, prevTestCaseResult.getIterationCount() - 1, callback);
            }
            else {
                this._saveCurrentAndSetActiveTestCaseAndIteration(this.getActiveTestResultIndex(), this.getActiveTestIterationResultIndex() - 1, callback);
            }
        }
    }

    private _saveCurrentAndSetActiveTestCaseAndIteration(testCaseResultIndex: number, iterationResultIndex: number, callback?: IResultCallback, isInitialization?: boolean) {
        /// <param name="callback" type="IResultCallback" optional="true" />
        if (testCaseResultIndex !== this.getActiveTestResultIndex() ||
            iterationResultIndex !== this.getActiveTestIterationResultIndex()) {
            if (testCaseResultIndex !== this.getActiveTestResultIndex()) {
                TelemetryService.publishEvents(TelemetryService.featureMoveToNextTestCase, {});
            }
            else {
                TelemetryService.publishEvents(TelemetryService.featureMoveToNextTestIteration, {});
            }


            if (this._areDataCollectorsInProgress()) {
                this._stoppingDataCollectorControl = new DataCollectorStoppingWithProgressMessage(this, {
                    cancellable: false,
                    message: Resources.StoppingDataCollector
                });

                this._stoppingDataCollectorControl.beginOperation(() => {

                    this._stopCollectors(RecorderStoppedReason.IterationMove, () => {
                        if (!this._areDataCollectorsInProgress()) {
                            this._stoppingDataCollectorControl.endOperation();
                            this.saveActiveTestCaseAndResult(() => {
                                this._setActiveTestCaseResultAndIteration(testCaseResultIndex, iterationResultIndex, callback);
                                this._postAutoStopCollectorsCallback = null;
                            });
                        }
                    });
                });
            }
            else {
                this.saveActiveTestCaseAndResult(() => {
                    this._setActiveTestCaseResultAndIteration(testCaseResultIndex, iterationResultIndex, callback, isInitialization);
                });
            }

        }
    }

    private _setActiveTestCaseResultAndIteration(testCaseResultIndex: number, iterationResultIndex: number, callback?: IResultCallback, isInitialization?: boolean) {
        this._activeTestCaseResultIndex = testCaseResultIndex;
        this._activeIterationResultIndex = iterationResultIndex;
        this._beginCreateIterationResultsIfNotCreated(this._getActiveTestResult(), () => {
            this.refreshUI(true, isInitialization);
            this._testStepListController.setCurrentTestCase(this._getActiveTestCase());

            // Process and show attachments.
            this._fetchAndShowAttachments(isInitialization);

            if (callback) {
                callback();
            }
        });
    }

    private _fetchAndShowAttachments(isInitialization?: boolean) {
        let testCase = this._getActiveTestCase(),
            sharedStepIds: number[] = [],
            attachmentFound: boolean = false;

        if (!testCase.getWorkItemWrapper()) {
            testCase.beginSetupWorkItemForTestCase(this._sharedStepCache, () => {
                attachmentFound = testCase.processTestStepAttachments();
                if (attachmentFound) {
                    this.refreshUI(true, isInitialization);
                }
            });
        }
        else {
            attachmentFound = testCase.processTestStepAttachments();
            if (attachmentFound) {
                this.refreshUI(true, isInitialization);
            }
        }
    }

    private _getActiveTestResult() {
        let testCaseResults = this._testRunAndResult.testCaseResults;
        return testCaseResults[this.getActiveTestResultIndex()];
    }

    private _getActiveTestCase() {
        let testCaseResults = this._testRunAndResult.testCaseResults,
            activeTestCaseResult;

        activeTestCaseResult = testCaseResults[this.getActiveTestResultIndex()];

        if (this._idToTestCaseMap[activeTestCaseResult.testCaseId] === undefined) {
            let testCaseNotFound = Utils_String.format(Resources.TestCaseNotFound, activeTestCaseResult.testCaseId);
            alert(testCaseNotFound);
        }
        return this._idToTestCaseMap[activeTestCaseResult.testCaseId];
    }

    private _getActiveIterationResult(): TestsOM.TestIterationResult {
        let activeTestCaseResult: TestsOM.TestCaseResult,
            activeTestIterationResult: TestsOM.TestIterationResult;

        activeTestCaseResult = this._getActiveTestResult();
        if (activeTestCaseResult) {
            activeTestIterationResult = activeTestCaseResult.iterations.getItems()[this.getActiveTestIterationResultIndex()];
        }
        return activeTestIterationResult;
    }

    private _getTestCaseResultsForAllConfigurations(testCaseId: number): TestsOM.TestCaseResult[] {
        //Returns TestCaseResults for all configurations of testCase with id = testCaseID
        let i: number, testCaseResult: TestsOM.TestCaseResult,
            testCaseResults: TestsOM.TestCaseResult[] = [],
            length = this._testRunAndResult.testCaseResults.length;

        for (i = 0; i < length; i++) {
            testCaseResult = this._testRunAndResult.testCaseResults[i];
            if (testCaseResult.testCaseId === testCaseId) {
                testCaseResults.push(testCaseResult);
            }
        }
        return testCaseResults;
    }

    private _updateTestCaseResultsForAllConfigs(testCaseId: number, activeConfigurationId: number, activeIterationId: number): TestsOM.TestCaseResult[] {
        let testCaseResults: TestsOM.TestCaseResult[],
            i: number, length: number,
            testCaseResult: TestsOM.TestCaseResult,
            dirtyTestCaseResults: TestsOM.TestCaseResult[] = [];

        testCaseResults = this._getTestCaseResultsForAllConfigurations(testCaseId);
        length = testCaseResults.length;
        for (i = 0; i < length; i++) {
            testCaseResult = testCaseResults[i];
            if (testCaseResult.isReady) {
                if (testCaseResult.configurationId === activeConfigurationId) {
                    this._updateAllIterations(testCaseResult, activeIterationId);
                }
                else {
                    this._updateAllIterations(testCaseResult, -1);
                    this._updateParamValuesForActiveIteration(testCaseResult);
                }

                if (testCaseResult.doesExistOnServer()) {
                    testCaseResult.setIsDirty(true);
                }

            }
            else {
                //If the testCaseResult is not ready, just update the testCaseRevision so that when we navigate to this testCaseResult, isLatestRevision is updated correctly.
                testCaseResult.testCaseRevision = this._getActiveTestCase().getRevision();
            }
            if (testCaseResult.getIsDirty() && (testCaseResult.configurationId !== activeConfigurationId)) {
                dirtyTestCaseResults.push(testCaseResult);
            }
        }
        this._commandQueue.clear();
        return dirtyTestCaseResults;
    }

    private _updateAllIterations(testCaseResult: TestsOM.TestCaseResult, activeIterationId: number) {
        let iterations = testCaseResult.iterations.getItems(),
            length = iterations.length,
            i: number;

        for (i = 0; i < length; i++) {
            if (iterations[i].iterationId !== activeIterationId) {
                this._commandQueue.execute(new TestsOM.InlineEditCommandArgs(testCaseResult, iterations[i].iterationId));
            }
        }
    }

    private _updateParamValuesForActiveIteration(testCaseResult: TestsOM.TestCaseResult) {
        let activeIterationIndex: number = this.getActiveTestIterationResultIndex(),
            iterationResultToUpdate: TestsOM.TestIterationResult = testCaseResult.iterations.getItems()[activeIterationIndex],
            updatedIterationResult: TestsOM.TestIterationResult = this._getActiveIterationResult(),
            updatedParameters: any[] = updatedIterationResult.parameters.getItems(),
            parametersToBeUpdated: any[] = iterationResultToUpdate.parameters.getItems(),
            parametersCount = updatedParameters.length,
            paramData: any = this._getActiveTestCase().getData(),
            stepResults = iterationResultToUpdate.actionResults.getItems(),
            stepResultsCount = stepResults.length,
            i: number,
            j: number;

        for (i = 0; i < parametersCount; i++) {
            if (parametersToBeUpdated[i].expected !== updatedParameters[i].expected) {
                parametersToBeUpdated[i].expected = updatedParameters[i].expected;
                parametersToBeUpdated[i].setIsDirty(true);

                for (j = 0; j < stepResultsCount; j++) {
                    if (stepResults[j] instanceof TestsOM.TestStepResult) {
                        TMUtils.ParametersHelper.updateParamValuesInStepResult(stepResults[j],
                            updatedParameters[i].parameterName,
                            updatedParameters[i].expected,
                            paramData,
                            activeIterationIndex);
                    }
                    else if (stepResults[j] instanceof TestsOM.SharedStepResult) {
                        this._updateParamValuesInSharedStepResults(stepResults[j],
                            updatedParameters[i].parameterName,
                            updatedParameters[i].expected,
                            paramData,
                            activeIterationIndex);
                    }
                }
            }
        }
    }

    private _updateParamValuesInSharedStepResults(sharedStepResult: TestsOM.SharedStepResult,
        paramName: string,
        paramValue: string,
        paramData: any,
        iterationIndex: number) {
        let stepResults = sharedStepResult.actionResults.getItems(),
            stepResultsCount = stepResults.length,
            j: number;

        for (j = 0; j < stepResultsCount; j++) {
            if (stepResults[j] instanceof TestsOM.TestStepResult) {
                TMUtils.ParametersHelper.updateParamValuesInStepResult(stepResults[j],
                    paramName,
                    paramValue,
                    paramData,
                    iterationIndex);
            }
        }
    }

    private _saveTestCaseResults(testCaseResults: TestsOM.TestCaseResult[]) {
        TMUtils.getTestResultManager().update(testCaseResults, () => {
            $.each(testCaseResults, function () {
                this.setIsDirty(false);
            });
        },
            (error) => {
                alert(VSS.getErrorMessage(error));
            },
            { teamId: this._teamId });
    }

    private _saveTestCaseResult(testCaseResult: TestsOM.TestCaseResult, iterationResult: TestsOM.TestIterationResult, callback?: IResultCallback) {

        if (testCaseResult.isDataDriven() && iterationResult) {
            if (iterationResult.getIsDirty()) {

                // Autocompute the result of the current iteration if needed, based on the stepResults.
                this._autoComputeIfNeeded();

                // Now autocompute the TestResult based on outcomes of the iterationResults.
                this.autoComputeResultFromIterationResults();
            }
        }
        else if (testCaseResult.getIsDirty()) {
            this._autoComputeIfNeeded();
        }

        if (!testCaseResult.getIsDirty()) {
            if (callback) {
                callback();
            }
        }
        else {
            TMUtils.getTestResultManager().update([testCaseResult], () => {
                testCaseResult.setIsDirty(false);
                if (callback) {
                    callback();
                }
            },
                (error) => {
                    alert(VSS.getErrorMessage(error));
                },
                { teamId: this._teamId });
        }
    }

    private _createMenuBar() {
        /// <summary>Creates the MenuBar</summary>
        let _$toolbarHost: JQuery = this._element.find(".test-run-mark-status-menu-items"),
            testResult: TestsOM.TestCaseResult = this._getActiveTestResult(),
            outcome: TCMConstants.TestOutcome,
            menuItems: any = [];

        if (testResult) {
            outcome = testResult.outcome;
        }

        menuItems.push({
            id: "set-outcome",
            title: Resources.MarkTestCaseResultTitle,
            showText: false,
            icon: Utils_String.format("icon-tfs-tcm-test-no-outcome {0}", TestRunView.CssClass_outcomeIcon),
            childItems: this._createMenubarItems()
        });

        this._menuBar = <Menus.MenuBar>Controls.BaseControl.createIn(Menus.MenuBar, _$toolbarHost, {
            items: menuItems,
            executeAction: delegate(this, this._onMenubarItemClick)
        });

        // In case of refresh of the TestRunner window, there could be some stepResults already having some outcome set,
        // so update the style of the buttons based on the outcome.
        if (outcome) {
            this._updateTestResultOutComeToolBarStyle(outcome);
        }
    }

    private _updateTestResultOutComeToolBarStyle(outcome: TCMConstants.TestOutcome) {
        /// <summary>Update the style of the pass and fail button based on the outcome that is to be set</summary>
        /// <param name="outcome" type="TCMConstants.TestOutcome">Passed or Failed or Blocked</param>
        /// <param name="$toolbar" type="Object">The toolbar containing the pass and fail buttons.</param>

        let $toolbar: JQuery = this._element.find(".test-run-mark-status-menu-items"),
            $outcomeIcon: JQuery = $toolbar.find(Utils_String.format(".{0}", TestRunView.CssClass_outcomeIcon)),
            cssClass: string;

        if ($outcomeIcon) {
            $outcomeIcon.removeClass();
            $outcomeIcon.addClass("icon")
                .addClass(TestRunView.CssClass_outcomeIcon);

            cssClass = TMUtils.getCssClassNameForOutcomeIcon(outcome);

            if (cssClass === "") {
                $outcomeIcon.addClass("bowtie-icon bowtie-status-success-outline bowtie-status-info");
            }
            else {
                if (cssClass.indexOf("bowtie-status-no-fill") !== -1) {
                    $outcomeIcon.addClass("bowtie-icon bowtie-status-no-fill bowtie-no-fill-not-applicable");
                }
                else {
                    $outcomeIcon.addClass(cssClass);
                }
            }
        }
    }

    private _createMenubarItems(): any {
        /// <summary>Creates the items list for the toolbar</summary>
        /// <returns type="Object">Items list for the toolbar</returns>
        let items = [];
        items.push({
            id: this._toolbarItemsIds.passTest, text: Resources.PassTestText,
            title: Utils_String.format(Resources.TooltipTitleShortcutFormat, Resources.PassTestText, Resources.PassTestShortcut),
            icon: "bowtie-icon bowtie-status-success"
        });
        items.push({
            id: this._toolbarItemsIds.failTest,
            text: Resources.FailTestText,
            title: Utils_String.format(Resources.TooltipTitleShortcutFormat, Resources.FailTestText, Resources.FailTestShortcut),
            icon: "bowtie-icon bowtie-status-failure"
        });
        items.push({
            id: this._toolbarItemsIds.pauseTest, text: Resources.PauseTestText,
            title: Utils_String.format(Resources.TooltipTitleShortcutFormat, Resources.PauseTestText, Resources.PauseTestShortcut),
            icon: "bowtie-icon bowtie-status-pause"
        });
        items.push({
            id: this._toolbarItemsIds.blockTest, text: Resources.BlockTestText,
            title: Utils_String.format(Resources.TooltipTitleShortcutFormat, Resources.BlockTestText, Resources.BlockTestShortcut),
            icon: "bowtie-icon bowtie-math-minus-circle"
        });
        items.push({
            id: this._toolbarItemsIds.notApplicableTest, text: Resources.TestOutcome_NotApplicable,
            title: Utils_String.format(Resources.TooltipTitleShortcutFormat, Resources.TestOutcome_NotApplicable, Resources.NotApplicableShortcut),
            icon: "bowtie-icon bowtie-status-no-fill bowtie-no-fill-not-applicable"
        });

        return items;
    }

    private _onMenubarItemClick(e?: any) {
        /// <summary>Handles the execution of the toolbar items</summary>
        /// <param name="e" type="Object">The execution event</param>
        let command = e.get_commandName(),
            outcome;

        //Execute the specific Menu command
        if (command === this._toolbarItemsIds.passTest) {
            outcome = TCMConstants.TestOutcome.Passed;
        }
        else if (command === this._toolbarItemsIds.failTest) {
            outcome = TCMConstants.TestOutcome.Failed;
        }
        else if (command === this._toolbarItemsIds.blockTest) {
            outcome = TCMConstants.TestOutcome.Blocked;
        }
        else if (command === this._toolbarItemsIds.notApplicableTest) {
            outcome = TCMConstants.TestOutcome.NotApplicable;
        }
        else if (command === this._toolbarItemsIds.pauseTest) {
            outcome = TCMConstants.TestOutcome.Paused;
        }

        this._updateActiveResultOutcome(outcome);
        TelemetryService.publishEvents(TelemetryService.featureMarkTestResultOutcome, {});
    }

    private _updateActiveResultOutcome(outcome: TCMConstants.TestOutcome) {
        let testCaseResult = this._getActiveTestResult();
        DAUtils.trackAction("SetTestOutcome", "/Execution", { outcome: outcome });
        this._setResultOutcome(testCaseResult, this._getActiveIterationResult(), outcome);
    }

    private _onActiveTestResultOutComeUpdated(outcome) {
        this._updateTestResultOutComeToolBarStyle(outcome);
        this._testCasesNavigator._updateOutcomeInTestCaseDropDown(this.getActiveTestResultIndex(), this.getActiveTestIterationResultIndex(), outcome);
    }

    private _showError(message: string) {
        /// <summary>shows an error mesage</summary>
        /// <param name="message" type="String">the message to be displayed</param>
        if (!this._$errorDiv) {
            this._$errorDiv = $("<div class='inline-error' />").text(message).insertBefore(this._element.find(".test-run"));
            this._element.find(".test-run").hide();
        }
    }

    private _getStepResultsFromTestCaseResult(testCaseResult: any) {
        /// <summary>Gets the step Results for the first iteration of the testCaseResult</summary>
        /// <param name="testCaseResult" type="Object">testCaseResult object</param>
        let currentIteration,
            stepResults = null;

        if (testCaseResult.iterations && testCaseResult.iterations.getItems().length > 0) {
            currentIteration = testCaseResult.iterations.getItems()[0];
            if (currentIteration) {
                stepResults = currentIteration.actionResults;
            }
        }
        return stepResults;
    }

    private _calculateResultFromStepResults(iterationResult: TestsOM.TestIterationResult): TCMConstants.TestOutcome {
        let stepResults,
            outcome = TCMConstants.TestOutcome.Passed,
            i,
            stepResult;

        if (iterationResult.areBugsFiled()) {
            // If bugs are filed on this iteration, then auto-compute to fail.
            return TCMConstants.TestOutcome.Failed;
        }

        if (iterationResult) {
            stepResults = iterationResult.actionResults;
        }

        if (stepResults && stepResults.getItems()) {
            for (i = 0; i < stepResults.getItems().length; i++) {
                stepResult = stepResults.getItems()[i];

                if (stepResult instanceof TestsOM.SharedStepResult && stepResult.outcome === TCMConstants.TestOutcome.Unspecified) {
                    // If shared step result has not be marked globally, then include its sub steps in autocomputation.
                    outcome = this.autoComputeSharedStepResult(stepResult);
                    if (outcome === TCMConstants.TestOutcome.Failed) {
                        break;
                    }
                }

                outcome = this.calculateOutcome(stepResult);
                if (outcome === TCMConstants.TestOutcome.Failed) {
                    break;
                }
            }
        }

        return outcome;
    }

    private autoComputeSharedStepResult(sharedStepResult: TestsOM.SharedStepResult): TCMConstants.TestOutcome {
        let stepResults = sharedStepResult.actionResults,
            i = 0,
            stepResult,
            outcome = TCMConstants.TestOutcome.Passed;

        if (stepResults) {
            for (i = 0; i < stepResults.getItems().length; i++) {
                stepResult = stepResults.getItems()[i];
                outcome = this.calculateOutcome(stepResult);
                if (outcome === TCMConstants.TestOutcome.Failed) {
                    break;
                }
            }
        }

        return outcome;
    }

    private calculateOutcome(stepResult: TestsOM.TestStepResult): TCMConstants.TestOutcome {
        let outcome = TCMConstants.TestOutcome.Passed;
        // If any of the steps is marked failed, the testResult outcome is marked as failed.
        // If any of the Validate step is not marked as pass/fail, then also the outcome is marked as Failed.
        // In rest cases output is marked as passed.
        if ((stepResult.outcome === TCMConstants.TestOutcome.Failed) ||
            (stepResult.getStepType && stepResult.getStepType() === TestsOM.TestStepTypes.Validate && stepResult.outcome === TCMConstants.TestOutcome.Unspecified)) {
            outcome = TCMConstants.TestOutcome.Failed;
        }

        return outcome;
    }

    private _setResultOutcome(testCaseResult: TestsOM.TestCaseResult, iteration: TestsOM.TestIterationResult, outCome: TCMConstants.TestOutcome, callback?: IResultCallback, ajaxOptions?: any) {
        /// <summary>Handles the execution of the toolbar items</summary>
        /// <param name="testCaseResults" type="Object">testCaseResults list on which the outCome needs to be set</param>
        /// <param name="outCome" type="Object">the outCome to be set: e.g. TCMConstants.TestOutcome.Passed</param>
        /// <param name="callback" type="IResultCallback" optional="true" >Function to be called after the result is saved</param>
        /// <param name="ajaxOptions" type="any" optional="true" />

        let testResultOutcome;

        if (testCaseResult.state === TCMConstants.TestResultState.Completed && outCome === TCMConstants.TestOutcome.Paused) {
            alert(Resources.CannotPauseCompletedTest);
            return;
        }
        // In case the test case is data driven, compute the testCaseResult outcome based on the outcome of the iterations
        // Else, set the outcome of the testCaseResult same as the iterationResult outcome.
        TMUtils.setIterationResultOutcomeLocally(iteration, outCome);

        if (!testCaseResult.isDataDriven()) {
            testResultOutcome = outCome;
            TMUtils.setTestResultOutcomeLocally(testCaseResult, testResultOutcome);
        }
        iteration.isOutComeAutoComputed = false;

        this.saveActiveTestCaseAndResult(() => {
            this._onActiveTestResultOutComeUpdated(outCome);
            if ($.isFunction(callback)) {
                callback();
            }
        });
    }

}

VSS.initClassPrototype(TestRunView, {
    _testRunAndResult: null,
    _testCasesNavigator: null,
    _testStepsControl: null,
    _testCases: null,
    _sharedStepCache: {},
    //TODO: Dangerous member initialization on prototype. Get rid of it.
    _showNavigationPrompt: true,
    _mailToLinkClick: false,
    _toolbarItemsIds: {
        passTest: "pass-test",
        failTest: "fail-test",
        pauseTest: "pause-test",
        blockTest: "block-test",
        notApplicableTest: "not-applicable-test"
    },
    //TODO: Dangerous member initialization on prototype. Get rid of it.
    _saveResultToolbarItemsIds: {
        saveTestResult: "save-test-run",
        saveAndCloseTestResult: "save-close-test-run",
        createBug: "create-bug",
        addToExistingBug: "add-existing-bug",
        refresh: "refresh",
        add: "add",
        addComment: "add-comment",
        addAttachment: "add-attachment",
        captureScreenShot: "capture-screenshot",
        captureVideo: "capture-video",
        captureVideoWithAudio: "capture-video-with-audio",
        captureActions: "capture-action",
        testRunnerInfoButton: "test-runner-info-button",
        testRunnerHelpButton: "test-runner-help-button",
        testRunnerAboutButton: "test-runner-about-button",
        testRunnerSignout: "test-runner-signout"
    },
    //TODO: Dangerous member initialization on prototype. Get rid of it.
    _footerSectionItemsIds: {
        createdBugs: "created-bugs",
        createdAttachments: "created-attachments"
    },
    //TODO: Dangerous member initialization on prototype. Get rid of it.
    _activeTestCaseResultIndex: -1,
    _activeIterationResultIndex: -1,
    _idToTestCaseMap: {},
    _$errorDiv: null,
    _bugCategoryTypeName: null,
    _runWindowSize: null,
    _borderSize: null,
    _windowNeedsRestore: false,
    _workItemSaved: false,
    //TODO: Dangerous member initialization on prototype. Get rid of it.
    _footerBar: null,
    _isFooterBarCreated: false,
    _windowWidthRequiredToFitAll: 0,
    _menuBar: null,
    _commentManager: null,
    _$testResultCommentContainer: null,
    _$testResultCommentTextArea: null,
    _saveResultToolbar: null,
    _isEditingEnabledInResume: true
});

VSS.classExtend(TestRunView, TfsContext.ControlExtensions);
if (LicenseAndFeatureFlagUtils.isDesktopTestRunnerOptionEnabled()) {
    DesktopTestRunHelper.validateAndGetTestRunData().then(function () {
        Controls.Enhancement.registerEnhancement(TestRunView, ".test-run-view");
    });
}
else {
    Controls.Enhancement.registerEnhancement(TestRunView, ".test-run-view");
}

export class BugFiler {
    public videoAttachment: any;
    public actionLogAttachment: IAttachmentInfo;
    public iterationResult: TestsOM.TestIterationResult;
    public testRun: any;
    public testCase: TestsOM.TestCase;
    public testCaseResult: any;
    public $reproStepsHtml: any;

    constructor(testRun, testCase, testCaseResult, testIterationResult, videoAttachment?, actionLogAttachment?) {
        this.iterationResult = testIterationResult;
        this.testRun = testRun;
        this.testCase = testCase;
        this.testCaseResult = testCaseResult;
        this.videoAttachment = videoAttachment;
        this.actionLogAttachment = actionLogAttachment;
        this.initialize();
    }

    public initialize() {
        this.$reproStepsHtml = this._getReproSteps();
    }

    public getBugFilingData() {

        let bugData = {};

        bugData[WITConstants.CoreFieldRefNames.AreaPath] = this.testCase.getAreaPath();
        bugData[WITConstants.CoreFieldRefNames.IterationPath] = this.testRun.iteration;
        bugData[TestsOM.BugWITFields.BuildFoundIn] = this.testRun.buildNumber ? this.testRun.buildNumber.toString() : "";
        bugData[TestsOM.BugWITFields.ReproSteps] = this.$reproStepsHtml.html();

        return bugData;
    }

    private _getReproSteps() {
        let $reproStepTable = this._getReproStepTable(),
            $reproStep = $("<div/>"),
            $headerTable,
            $configTable,
            $dataTable,
            $commentTable,
            $wrapperDiv = $("<div/>");

        $reproStep.append("<hr style='border-color:black'/>");

        $headerTable = this._generateHeadertable();
        $reproStep.append($headerTable);
        $reproStep.append("<hr style='border-color:black'/>");

        $commentTable = this._generateTestResultCommentTable();
        if ($commentTable) {
            $reproStep.append($commentTable);
        }

        //appending the actual table
        if ($reproStepTable) {
            $reproStep.append($reproStepTable);
            $reproStep.append("<hr style='border-color:white'/>");
        }

        //appending configuration info
        $configTable = this._generateConfigurationInfoTable();
        $reproStep.append($configTable);
        $reproStep.append("<hr style='border-color:white'/>");

        if (this.testCase.getData().length > 0) {
            $dataTable = this._generateDataTable();
            $reproStep.append($dataTable);
            $reproStep.append("<hr style='border-color:white'/>");
        }

        $reproStep.append("<br />");
        $wrapperDiv.append($reproStep);

        let $diagnosticDataAdaper = this._getDataDiagnosticAttachmentHtml();
        if ($diagnosticDataAdaper) {
            $wrapperDiv.append($diagnosticDataAdaper);
        }

        return $wrapperDiv;
    }

    private _getDataDiagnosticAttachmentHtml(): JQuery {

        let attachments: TestsOM.AttachmentInfo[] = this.iterationResult.getAttachments();
        let videoAttachments = attachments.filter((attachment: TestsOM.AttachmentInfo) => {
            let ext: string = attachment.getName().split(".").pop();
            if (ext === "webm") {
                return true;
            } else {
                return false;
            }
        });

        if (this.actionLogAttachment || this.videoAttachment || (videoAttachments && videoAttachments.length > 0)) {
            let $diagnosticDataAdaper = $("<div/>");
            $diagnosticDataAdaper.append($("<div/>").html(Resources.DiagnosticDataAdapterHeadline));
            let $listContainer = $("<ul/>").attr("style", "margin-top: 5px; margin-left: 10px; padding-left: 5px; list-style-type: none;");
            $diagnosticDataAdaper.append($listContainer);

            if (videoAttachments && videoAttachments.length > 0) {
                videoAttachments.forEach((attachment) => {
                    this._appendAttachmentInList(attachment.getId(), attachment.getName(), $listContainer);
                });
            }

            if (this.videoAttachment) {
                this._appendAttachmentInList(this.videoAttachment.Id, this.videoAttachment.Name, $listContainer);
            }

            if (this.actionLogAttachment) {
                this._appendAttachmentInList(this.actionLogAttachment.Id, this.actionLogAttachment.Name, $listContainer);
            }

            $diagnosticDataAdaper.append("<br />");
            return $diagnosticDataAdaper;
        }

        return null;

    }

    private _appendAttachmentInList(attachmentId, attachmentName, $listContainer: JQuery): void {
        let url: string = this._getAttachmentLink(attachmentId);
        let attachmentLink = Utils_String.format("<a href=\"{0}\">{1}</a>", url, attachmentName);
        $("<li>").attr("style", " margin: 5px 0").append(attachmentLink).appendTo($listContainer);
    }

    private _getAttachmentLink(attachmentId): string {
        let params = {
            attachmentId: attachmentId
        };

        return TMUtils.getTestResultManager().getPublicApiLocation("DownloadAttachment", params);
    }

    private _getReproStepTable() {
        let actionResults = this.iterationResult.actionResults.getItems(),
            i, actionResult,
            $row,
            $reproSteps = $("<table/>");
        if (actionResults.length > 0) {

            actionResults = TMUtils.getFlatSteps(actionResults);

            //creating header
            $row = this._createRow();
            $row.append(this._createColumn(Resources.ReproStepIndexHeader, { "font-weight": "bold" }));
            $row.append(this._createColumn(Resources.ReproStepResultHeader, { "font-weight": "bold" }));
            $row.append(this._createColumn(Resources.ResproStepTitleHeader, { "font-weight": "bold" }));
            $reproSteps.append($row);

            //creating each row
            for (i = 0; i < actionResults.length; i++) {
                actionResult = actionResults[i];

                $row = this._createRow();
                //append index
                $row.append(this._createColumn(actionResult.indexString, { "font-weight": "bold" }));

                $row.append(this._getOutComeColumn(actionResult));

                $row.append(this._getTitleColumnForNormalStep(actionResult));
                $reproSteps.append($row);
            }

            return $reproSteps;
        }
        return null;
    }

    private _generateHeadertable() {
        let $headerTable = $("<table/>"),
            $row, $datetimeColumn,
            dateTime = new Date(),
            $headerTextColumn,
            dateString = Utils_Date.localeFormat(dateTime, Utils_Culture.getDateTimeFormat().ShortDatePattern),
            timeString = Utils_Date.localeFormat(dateTime, Utils_Culture.getDateTimeFormat().ShortTimePattern);

        $row = this._createRow();

        $datetimeColumn = this._createColumn(dateString + "  " + timeString, { "font-weight": "bold" });

        $headerTextColumn = this._createColumn(Utils_String.format(Resources.BugFilingReproStepHeader, this.testCase.getTitle()), { "padding-left": "10px" });

        $row.append($datetimeColumn, $headerTextColumn);

        return $headerTable.append($row);

    }

    private _generateTestResultCommentTable() {
        let $headerTable: JQuery = $("<table/>"), lines, i: number, $commentDivLine: JQuery,
            $row: JQuery, $commentColumnHeader: JQuery, $commentColumnValue: JQuery, comment: string, $commentDiv: JQuery = $("<div/>");

        if (!$.trim(this.iterationResult.comment)) {
            return;
        }

        $row = this._createRow();

        $commentColumnHeader = this._createColumn(Resources.ReproStepCommentHeader, { "font-weight": "bold" });
        $commentColumnValue = this._createColumn("", { "padding-left": "10px" });

        comment = this.iterationResult.comment;

        lines = comment.split(/\n/);
        for (i = 0; i < lines.length; i++) {
            $commentDivLine = $("<div/>");
            $commentDivLine.text(lines[i]);
            $commentDiv.append($commentDivLine);
        }
        $commentColumnValue.append($commentDiv);

        $row.append($commentColumnHeader, $commentColumnValue);

        return $headerTable.append($row);
    }

    private _generateConfigurationInfoTable() {
        let $table = $("<table/>"),
            $row,
            config = this.testCaseResult.configurationName;

        $row = this._createRow();

        $row.append(this._createColumn(Resources.ReproStepTestConfigurationHeader, { "font-weight": "bold" }));

        $row.append(this._createColumn(config, { "padding-left": "100px" }));

        return $table.append($row);
    }

    private _generateDataTable() {
        let $dataIterationTable,
            $dataRowTable,
            $tableRow1,
            $tableRow2,
            i,
            param: TestsOM.TestResultParameter;

        $dataIterationTable = $("<table style='width:100%' class='dataIterationTable'>");
        $dataRowTable = $("<table style='width:100%' class='dataRowTable'>");

        $tableRow1 = this._createRow();
        $tableRow1.append(this._createColumn(Resources.DataTableHeader, { "font-weight": "bold" }));
        $tableRow1.append(this._createColumn(Utils_String.format(Resources.DataTableIterationNumber, this.iterationResult.iterationId, this.testCaseResult.iterations.getItems().length), { "padding-left": "100px" }));
        $dataIterationTable.append($tableRow1);

        if (this.iterationResult.parameters.getItems().length > 0) {
            $tableRow1 = this._createRow();
            $tableRow2 = this._createRow();
            $tableRow1.css("font-weight", "bold");
            for (i = 0; i < this.iterationResult.parameters.getItems().length; i++) {
                param = this.iterationResult.parameters.getItems()[i];
                $tableRow1.append(this._createColumn(param.parameterName, null));
                $tableRow2.append(this._createColumn(param.expected, null));
            }
            $dataRowTable.append($tableRow1);
            $dataRowTable.append($tableRow2);
        }

        return $dataIterationTable.append($dataRowTable);
    }

    private _getTitleColumnForNormalStep(stepResult) {
        let $column,
            expectedResult = stepResult.getExpectedResult(),
            action = stepResult.getAction(),
            $expectedResultDiv,
            $attachmentColumnDiv: JQuery,
            $attachmentDiv: JQuery,
            $commentDiv = $("<div/>"),
            $commentDivLine,
            $linksDiv: JQuery = $("<div />").css("margin-left", "140px").css("margin-top", "-20px"),
            $imagesDiv: JQuery = $("<div />").css("margin-left", "140px"),
            comment,
            $title,
            lines, i: number;

        if (!stepResult.isFormatted()) {
            action = TestsOM.HtmlUtils.replaceNewLineWithBr(action);
            expectedResult = TestsOM.HtmlUtils.replaceNewLineWithBr(expectedResult);
        }

        $title = $("<p>" + action + "</p>");
        $title.css({ "font-weight": "bold" });
        $column = (stepResult instanceof TestsOM.TestStepResult) ? this._createColumn(action, "", true) : this._createColumn($title[0].outerHTML, "", true);
        if ($(TestsOM.HtmlUtils.wrapInDiv(expectedResult)).text().trim()) {
            $expectedResultDiv = $("<div/>").css("padding-top", "10px");
            $expectedResultDiv.text(Resources.ReproStepExpectedResultHeading);
            $column.append($expectedResultDiv);
            $column.append($(TestsOM.HtmlUtils.wrapInDiv(expectedResult)));
        }
        if ($.trim(stepResult.errorMessage)) {
            comment = (Utils_String.format(Resources.ReproStepComment, stepResult.errorMessage));
            lines = comment.split(/\n/);
            for (i = 0; i < lines.length; i++) {
                $commentDivLine = $("<div/>");
                $commentDivLine.text(lines[i]);
                $commentDiv.append($commentDivLine);
            }
            $column.append($commentDiv.css("padding-top", "10px"));
        }
        if (stepResult.attachments && stepResult.attachments.length > 0) {
            $attachmentColumnDiv = $("<div/>").css("padding-top", "10px").css("max-width", "350px");
            $("<span/>").text(Resources.AttachedFilesLabel).appendTo($attachmentColumnDiv);
            let i = 0, length = stepResult.attachments.length;
            for (; i < length; i++) {
                this._addAttachmentToColumn(stepResult.attachments[i], $linksDiv, $imagesDiv);
            }

            $attachmentColumnDiv.append($linksDiv);
            $attachmentColumnDiv.append($imagesDiv);

            $column.append($attachmentColumnDiv);
        }

        return $column;

    }

    private _getOutComeColumn(stepResult) {
        let $outcomeColumn;
        if (stepResult) {
            switch (stepResult.outcome) {
                case TCMConstants.TestOutcome.Passed:
                    $outcomeColumn = this._createColumn(Resources.TestOutcome_Passed, { "font-weight": "bold", "color": "green" });
                    break;
                case TCMConstants.TestOutcome.Failed:
                    $outcomeColumn = this._createColumn(Resources.TestOutcome_Failed, { "font-weight": "bold", "color": "red" });
                    break;
                default:
                    $outcomeColumn = this._createColumn(Resources.TestOutcome_None, { "font-weight": "bold", "color": "#3DB0FF" });
            }
        }
        return $outcomeColumn;
    }

    private _addAttachmentToColumn(attachment, $linksDiv: JQuery, $imagesDiv: JQuery) {
        let params = {
            attachmentId: attachment.Id
        };

        let url: string = TMUtils.getTestResultManager().getApiLocation("DownloadAttachment", params),
            attachmentSizeString: string = Utils_String.format(Resources.TestStepAttachmentSizeFormat, Math.ceil(attachment.Size / 1024)),
            image_extensions = TMUtils.ImageHelper.getImageExtensionRegex(),
            $imageLink: JQuery,
            $imageLinkContent: JQuery,
            $attachmentDiv = $("<div class='test-step-repro-attachment'></span>");

        if (image_extensions.test(attachment.Name)) {
            $imageLink = $("<a></a>").attr("href", url).appendTo($attachmentDiv);
            $imageLinkContent = $("<div></div>");
            let $image: JQuery = $("<image class='test-step-attachment-image'>").attr("src", url).appendTo($imageLinkContent);
            $image.css({
                "height": "100px",
                "width": "100px",
                "padding-bottom": "14px",
                "border": "gray 1px solid",
                "margin-top": "5px"
            });

            // For showing the name of the image at the bottom of the image, added a div which will be placed on an absolute position inside the container div.
            let $imageName: JQuery = $("<div class='test-step-attachment-image-name'></div>").text(attachment.Name).appendTo($imageLinkContent);
            $imageName.css({
                "display": "inline",
                "margin-top": "102px",
                "position": "absolute",
                "margin-left": "-102px",
                "background-color": "#181818",
                "color": "white",
                "width": "102px",
                "height": "18px",
                "overflow": "hidden",
                "white-space": "nowrap",
                "text-overflow": "ellipsis",
                "font-size": "11px"
            });

            $imageLink.append($imageLinkContent);
            $imageLink.appendTo($attachmentDiv);
            $imagesDiv.append($attachmentDiv);
        }
        else {
            $("<a class='test-step-attachment-name'></a>").text(attachment.Name).attr("href", url).appendTo($attachmentDiv);
            $linksDiv.append($attachmentDiv);
        }
    }

    private _createRow() {
        return $(domElem("tr"));
    }

    private _createColumn(content, style, isContentHtml?: boolean) {
        /// <param name="isContentHtml" type="boolean" optional="true" />

        let $column = $(domElem("td"));

        //defualts for column
        $column.css("vertical-align", "top");
        $column.css("padding", "2px 7px 2px 7px");

        if (style) {
            $column.css(style);
        }
        if (isContentHtml) {
            content = HtmlNormalizer.normalize(content);
            return $column.html(content);
        }
        return $column.text(content);
    }
}

export interface ICaptureVideoPayload {
    tfsContext: ITfsContext;
    testRunData: ITestRunData;
    includeAudio?: boolean;
}

export interface ICaptureWindowPayload {
    windowId: number;
    tfsContext: ITfsContext;
    testRunData: ITestRunData;
}

export interface IStartCaptureActionLogPayload extends ICaptureWindowPayload {
    propertyBag: { [id: string]: string };
}

export interface ITfsContext {
    url: string;
    projectName: string;
    teamName?: string;
}

export interface ITestRunData {
    runId: number;
    resultId: number;
    iterationId: number;
    actionPath: string;
}

export interface IActiveTabMetaData {
    windowId: number;
    url: string;
    title: string;
}

export interface IActionLogStepData {
    title: string;
    timeStamp: string;
}

export interface IActionLogPayLoad {
    attachment: IAttachmentInfo;
    stepInfo: IActionLogStepData[];
    tfsContext: ITfsContext;
    testRunData: ITestRunData;
}

export interface IAttachmentInfo {
    Id: string;
    Name: string;
    Size: string;
}

export interface IError {
    errorMessage: string;
    errorLevel: number;
    id: number;
}

enum ErrorCode {
    TFS_CONNECTION_FAILED = 1,
    TFS_AUTH_FAILED,
    WINDOW_NOT_FOUND,
    SCREEN_RECORDING_DISABLED,
    ACTIONLOG_ALREADY_INPROGRESS,
    TAB_NOT_REACHABLE,
    ACTIONLOG_FEATURE_DISABLED,
    MICROPHONE_NOTFOUND
}

export class ActiveWindowDataCollection {
    public static timeout: number = 2000;  //in ms

    public static getActiveWindowsInfo(callBack: IResultCallback, errorCallBack: IErrorCallback) {
        let getActiveWindowCommand = "xtPage-get-activeTabs-metaData-v1";
        let getActiveWindowCommandResponse = "xtPage-get-activeTabs-metaData-response-v1";

        window.postMessage({
            communicationProtocolVersion: DesktopTestRunConstants.communicationProtocolVersion,
            type: getActiveWindowCommand
        }, "*");

        let delayFunc = Utils_Core.delay(null, this.timeout, () => {
            window.removeEventListener("message", handleGetActiveWindowCommandResponse);
            errorCallBack(Resources.WebXTExntesionInstallRequired);
        });

        function onResponse(): void {
            window.removeEventListener("message", handleGetActiveWindowCommandResponse);
            if (delayFunc) {
                delayFunc.cancel();
            }
        }

        function handleGetActiveWindowCommandResponse(event: any) {
            if (event.data.type && event.data.type === getActiveWindowCommandResponse) {
                onResponse();
                callBack(event.data.data);
            }
        }

        window.addEventListener("message", handleGetActiveWindowCommandResponse);
    }
}

export class ScreenShotConstants {
    public static captureScreenShotCommand = "xtPage-capture-screenshot-v1";
    public static captureDesktopScreenShotCommand = "xtPage-capture-desktopScreenshot-v1";
    public static captureDesktopScreenShotCommandResponse = "xtPage-capture-desktopScreenshot-response-v1";
    public static captureScreenShotCommandCancelled = "xtPage-capture-cancelled-v1";
    public static captureScreenShotCommandCompleted = "xtPage-capture-completed-v1";
    public static captureScreenShotCommandErrored = "xtPage-capture-error-v1";
}

export class ScreenShotDataCollection {
    public static timeout: number = 2000;  //in ms

    public static captureScreenShot(payload: ICaptureWindowPayload, callBack: IResultCallback, errorCallBack: IErrorCallback) {
        window.postMessage({
            type: ScreenShotConstants.captureScreenShotCommand,
            screenshotPayload: payload
        }, "*");

        function onResponse(): void {
            window.removeEventListener("message", handleScreenshotOverEvent);
        }

        function handleScreenshotOverEvent(event: any) {
            if (event.data.type && event.data.type === ScreenShotConstants.captureScreenShotCommandCompleted) {
                onResponse();
                callBack(event.data.data);
            } else if (event.data.type && event.data.type === ScreenShotConstants.captureScreenShotCommandCancelled) {
                onResponse();
                callBack(null);
            } else if (event.data.type && event.data.type === ScreenShotConstants.captureScreenShotCommandErrored) {
                onResponse();
                errorCallBack(event.data.data);
            }
        }

        window.addEventListener("message", handleScreenshotOverEvent);
    }

    public static captureDesktopScreenShot(payload: ICaptureWindowPayload, callBack: IResultCallback, errorCallBack: IErrorCallback) {
        let delayFunc = Utils_Core.delay(null, this.timeout, () => {
            window.removeEventListener("message", handleCaptureDesktopCommandResponse);
            errorCallBack(Resources.WebXTExntesionInstallRequired);
        });

        function onResponse(): void {
            window.removeEventListener("message", handleCaptureDesktopCommandResponse);
            if (delayFunc) {
                delayFunc.cancel();
            }
        }

        function handleCaptureDesktopCommandResponse(event: any) {
            if (event.data.type && event.data.type === ScreenShotConstants.captureDesktopScreenShotCommandResponse) {
                onResponse();
                callBack(event.data.data);
            }
        }

        window.addEventListener("message", handleCaptureDesktopCommandResponse);

        window.postMessage({
            communicationProtocolVersion: DesktopTestRunConstants.communicationProtocolVersion,
            type: ScreenShotConstants.captureDesktopScreenShotCommand,
            screenshotPayload: payload
        }, "*");
    }

    public static handleCaptureCompleted(callBack: IResultCallback, errorCallBack: IErrorCallback) {
        function onScreenShotCompleteResponse(): void {
            window.removeEventListener("message", handleScreenShotCompletedEvent);
        }

        function handleScreenShotCompletedEvent(event: any) {
            if (event.data.type && event.data.type === ScreenShotConstants.captureScreenShotCommandCompleted) {
                onScreenShotCompleteResponse();
                callBack(event.data.data);
            } else if (event.data.type && event.data.type === ScreenShotConstants.captureScreenShotCommandCancelled) {
                onScreenShotCompleteResponse();
                callBack(null);
            } else if (event.data.type && event.data.type === ScreenShotConstants.captureScreenShotCommandErrored) {
                onScreenShotCompleteResponse();
                errorCallBack(event.data.data);
            }
        }

        window.addEventListener("message", handleScreenShotCompletedEvent);
    }
}


VSS.initClassPrototype(BugFiler, {
    iterationResult: null,
    testRun: null,
    testCase: null,
    testCaseResult: null,
    $reproStepsHtml: null
});

// TFS plugin model requires this call for each tfs module.
VSS.tfsModuleLoaded("TFS.TestManagement.TestRun", exports);
