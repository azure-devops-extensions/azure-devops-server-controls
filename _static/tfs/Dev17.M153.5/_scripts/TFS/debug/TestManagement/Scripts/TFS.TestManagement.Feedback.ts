/// <amd-dependency path='VSS/LoaderPlugins/Css!TestManagement' />

/// <reference types="jquery" />

import * as SDK_Shim from "VSS/SDK/Shim";

import VSS = require("VSS/VSS");
import Controls = require("VSS/Controls");
import Utils_String = require("VSS/Utils/String");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import Utils_Core = require("VSS/Utils/Core");
import Resources = require("TestManagement/Scripts/Resources/TFS.Resources.TestManagement");
import TestRun = require("TestManagement/Scripts/TFS.TestManagement.TestRun");
import Utils_Url = require("VSS/Utils/Url");
import TMUtils = require("TestManagement/Scripts/TFS.TestManagement.Utils");
import TCMLicenseAndFeatureFlagUtils = require("TestManagement/Scripts/Utils/TFS.TestManagement.LicenseAndFeatureFlagUtils");

let delegate = Utils_Core.delegate;
let LicenseAndFeatureFlagUtils = TCMLicenseAndFeatureFlagUtils.LicenseAndFeatureFlagUtils;
let BrowserResourceStringHelper = TMUtils.BrowserResourceStringHelper;

/**
 * class responsible for showing view when feedback session is configured successfully
 */
export class SessionConfiguredControl extends Controls.BaseControl {
    constructor(options?) {
        super(options);
    }

    public initialize(): void {
        this._element.append(this._getDom());
        super.initialize();
    }

    private _getDom(): JQuery {

        let $container = $("<div>").addClass("extension-configured").addClass("feedback-request-landing-page");
        $("<div>").addClass("extension-configured-label landing-page-label").text(Resources.ExtensionConfiguredLabel).appendTo($container);
        $("<div>").addClass("extension-configured-info landing-page-info").html(Resources.ExtensionConfiguredInfo).appendTo($container);

        let img1: JQuery = this._getImageElement(BrowserResourceStringHelper.GetFeedbackSucceess1Image());
        let img1Container: JQuery = $("<div>").addClass("extension-configured-img1").append(img1);
        img1Container.appendTo($container);

        $("<div>").addClass("extension-configured-info2").html(Resources.ExtensionConfiguredInfo2).appendTo($container);

        let img2: JQuery = this._getImageElement(BrowserResourceStringHelper.GetFeedbackSucceess2Image());
        let img2Container: JQuery = $("<div>").addClass("extension-configured-img2").append(img2);
        img2Container.appendTo($container);

        return $container;

    }

    private _getImageElement(imageName: string): JQuery {
        let TfsContext = TFS_Host_TfsContext.TfsContext.getDefault();
        let resourceFileName = TfsContext.configuration.getResourcesFile(imageName);
        let $image = $("<img/>")
            .attr("src", resourceFileName);
        return $image;
    }
}

/**
 * class responsible fow showing error when browser is not chrome
 */
export class IncompatibleBrowerErrorControl extends Controls.BaseControl {
    constructor(options?) {
        super(options);
    }

    public initialize(): void {
        this._element.append(this._getDom());
        super.initialize();
    }

    private _getDom(): JQuery {
        let browserIncompatibleLabel = BrowserResourceStringHelper.GetResourceBrowserIncompatibleLabel();
        let browserIncompatibleInfo = BrowserResourceStringHelper.GetResourceBrowserIncompatibleInfo();
        let $container = $("<div>").addClass("browser-incompatible").addClass("feedback-request-landing-page");
        $("<div>").addClass("browser-incompatible-label landing-page-label").text(browserIncompatibleLabel).appendTo($container);
        $("<div>").addClass("browser-incompatible-info landing-page-info").html(Utils_String.format(browserIncompatibleInfo, HtmlTags.versionInstallExtensionTag, HtmlTags.closingATag)).appendTo($container);
        return $container;
    }
}

/**
 * class responsbile for showing error when extension is not installed or disabled
 */
export class ExtensionNotDetectedErrorControl extends Controls.BaseControl {
    constructor(options?) {
        super(options);
    }

    public initialize(): void {
        this._element.append(this._getDom());
        super.initialize();
    }

    private _getDom(): JQuery {
        let $container = $("<div>").addClass("extension-not-present").addClass("feedback-request-landing-page");
        $("<div>").addClass("extension-not-present-label landing-page-label").text(Resources.ExtensionAbsentLabel).appendTo($container);
        let $info: JQuery = this._getInfo();
        $info.appendTo($container);
        return $container;
    }

    private _getInfo(): JQuery {

        let $container = $("<div>").addClass("extension-not-present-info landing-page-info");
        $("<div>").addClass("extension-not-present-info1").html(Resources.ExtensionAbsentInfo).appendTo($container);

        let $list = $("<ul>").addClass("extension-not-present-reason-list");
        $("<li>").addClass("extension-not-present-reason-list-item1").html(Utils_String.format(Resources.ExtensionAbsentInfo3, HtmlTags.GetInstallTag(), HtmlTags.closingATag)).appendTo($list);
        $("<div>").addClass("extension-not-present-reason-list-item2").text(Resources.ExtensionAbsentInfo4).appendTo($list);
        $("<li>").addClass("extension-not-present-reason-list-item3").html(BrowserResourceStringHelper.GetResourceExtensionAbsentInfo5()).appendTo($list);
        $list.appendTo($container);

        $("<div>").addClass("extension-not-present-info2").html(Resources.ExtensionAbsentInfo2).appendTo($container);
        return $container;
    }
}

/**
 * class responsible for showing error when session is already in progress in extension
 */
export class SessionAlreadyInProgressErrorControl extends Controls.BaseControl {
    constructor(options?) {
        super(options);
    }

    public initialize(): void {
        this._element.append(this._getDom());
        super.initialize();
    }

    private _getDom(): JQuery {
        let $container = $("<div>").addClass("session-inprogress").addClass("feedback-request-landing-page");
        $("<div>").addClass("session-inprogress-label landing-page-label").text(Resources.SessionInprogressLabel).appendTo($container);
        $("<div>").addClass("session-inprogress-info landing-page-info").html(Resources.SessionInprogressInfo).appendTo($container);

        let img1: JQuery = this._getImageElement(BrowserResourceStringHelper.GetSessionInProgressImage());
        let img1Container: JQuery = $("<div>").addClass("extension-configured-img1").append(img1);
        img1Container.appendTo($container);

        return $container;
    }

    private _getImageElement(imageName: string): JQuery {
        let TfsContext = TFS_Host_TfsContext.TfsContext.getDefault();
        let resourceFileName = TfsContext.configuration.getResourcesFile(imageName);
        let $image = $("<img/>")
            .attr("src", resourceFileName);
        return $image;
    }
}


export enum ErrorCode {
    INCOMPATIABLE_BROWSER,
    EXTENSION_NOT_DETECTED,
    SESSION_ALREADY_INPROGRESS
}

export interface ISettings {
    serverUrl: string;
    collectionName: string;
    projectName: string;
    teamName: string;
    feedbackId: string;
}

/**
 * class responsible for configuring extension
 */
export class ConfigureExtension {

    public static configure(settings: ISettings, callBack: IResultCallback, errorCallBack: IErrorCallback) {
        if (ConfigureExtension.IsBrowserIncompatible()) {
            errorCallBack(ErrorCode.INCOMPATIABLE_BROWSER);
        } else {
            ConfigureExtension.configureExtension(settings, callBack, errorCallBack);
        }
    }

    private static IsBrowserIncompatible(): boolean {
        return !TMUtils.isDataCollectionEnabled();
    }

    /**
     * Check if we can configure extension or not
     * @param settings
     * @param callBack
     * @param errorCallBack
     */
    private static configureExtension(settings: ISettings, callBack: IResultCallback, errorCallBack: IErrorCallback): void {
        TestRun.ActiveWindowDataCollection.getActiveWindowsInfo((activeWindowsInfo: TestRun.IActiveTabMetaData[]) => {
            ConfigureExtension._extensionInstalledSuccessCallback(settings, callBack, errorCallBack);
        }, (error: any) => {
            errorCallBack(ErrorCode.EXTENSION_NOT_DETECTED);
        });
    }

    private static _extensionInstalledSuccessCallback(settings: ISettings, callBack: IResultCallback, errorCallBack: IErrorCallback): void {
        ConfigureExtension._checkForActiveSession(settings, callBack, errorCallBack);
    }

    private static _checkForActiveSession(settings: ISettings, callBack: IResultCallback, errorCallBack: IErrorCallback) {
        
        window.postMessage({
            type: ConfigureExtension.getActiveSessionCommand
        }, "*");

        let handleGetActiveSessionCommandResponse = (event: any) => {
            if (event.data.type && event.data.type === ConfigureExtension.getActiveSessionCommandResponse) {
                window.removeEventListener("message", handleGetActiveSessionCommandResponse);
                if (event.data.data) {
                    errorCallBack(ErrorCode.SESSION_ALREADY_INPROGRESS);
                }
                else {
                    ConfigureExtension._passSettingsToExtension(settings, callBack, errorCallBack);
                }
            }
        };

        window.addEventListener("message", handleGetActiveSessionCommandResponse);
    }

    private static _passSettingsToExtension(settings: ISettings, callBack: IResultCallback, errorCallBack: IErrorCallback) {

        window.postMessage({
            type: ConfigureExtension.configureExtensionCommand,
            configSettings: settings
        }, "*");

        let handleConfigureXtCommandResponse = (event: any) => {
            if (event.data.type && event.data.type === ConfigureExtension.configureExtensionCommandResponse) {
                window.removeEventListener("message", handleConfigureXtCommandResponse);
                callBack();
            }
        };

        window.addEventListener("message", handleConfigureXtCommandResponse);
    }

    private static getActiveSessionCommand: string = "xtPage-get-isSessionActive-v1";
    private static getActiveSessionCommandResponse: string = "xtPage-get-isSessionActive-response-v1";
    private static configureExtensionCommand: string = "xtPage-configure-xt-v1";
    private static configureExtensionCommandResponse: string = "xtPage-configure-xt-response-v1";
}

/**
 * Orchestrator class for configuring feedback
 */
export class ConfigureFeedbackControl extends Controls.BaseControl {
    constructor(options?) {
        super(options);
    }

    public initialize(): void {
        let settings: ISettings = this._getSettings();
        ConfigureExtension.configure(settings, delegate(this, this._handleSuccess), delegate(this, this._handleError)); 
        super.initialize();
    }

    private _handleSuccess(): void {
        <SessionConfiguredControl>Controls.BaseControl.createIn(SessionConfiguredControl, this._element);
    }

    private _handleError(errorCode: ErrorCode): void {
        switch (errorCode) {
            case ErrorCode.INCOMPATIABLE_BROWSER:
                <IncompatibleBrowerErrorControl>Controls.BaseControl.createIn(IncompatibleBrowerErrorControl, this._element);
                break;
            case ErrorCode.EXTENSION_NOT_DETECTED:
                <ExtensionNotDetectedErrorControl>Controls.BaseControl.createIn(ExtensionNotDetectedErrorControl, this._element);
                break;
            case ErrorCode.SESSION_ALREADY_INPROGRESS:
                <SessionAlreadyInProgressErrorControl>Controls.BaseControl.createIn(SessionAlreadyInProgressErrorControl, this._element);
                break;
            default:
                break;
        }
    }

    private _getSettings(): ISettings {
        let TFSContext = TFS_Host_TfsContext.TfsContext.getDefault();
        let serverUrl = TFSContext.contextData.host.uri;
        let collectionName = TFSContext.contextData.collection.name;
        let projectName = TFSContext.contextData.project.name;
        let teamName = this._getQueryParameterValue(0);
        let feedbackId = this._getQueryParameterValue(1);

        return {
            serverUrl: serverUrl,
            collectionName: collectionName,
            projectName: projectName,
            teamName: teamName,
            feedbackId: feedbackId
        };
    }

    private _getQueryParameterValue(index: number): string {
        let queryValue: string = Utils_String.empty;
        let currentUrl = new Utils_Url.Uri(window.location.href);
        if (currentUrl && currentUrl.queryParameters && currentUrl.queryParameters.length > 1) {
            let queryParam = currentUrl.queryParameters[index];
            if (queryParam && queryParam.value) {
                queryValue = queryParam.value;
            }
        }
        return queryValue;
    }
}

export class HtmlTags{
    public static closingATag: string = "</a>";
    public static chromeInstallExtensionTag: string = "<a href='https://aka.ms/chrome-xtinstall' target='_blank' rel='nofollow noopener noreferrer'>";
    public static firefoxInstallExtensionTag: string = "<a href='https://aka.ms/ffxtinstall' target='_blank' rel='nofollow noopener noreferrer'>";
    public static edgeInstallExtensionTag: string = "<a href='https://aka.ms/edgextinstall' target='_blank' rel='nofollow noopener noreferrer'>";
    public static versionInstallExtensionTag: string = "<a href='https://aka.ms/xt-install-version' target='_blank' rel='nofollow noopener noreferrer'>";

    public static GetInstallTag(): string {
        if (TMUtils.enableXtOnFirefox()) {
            return this.firefoxInstallExtensionTag;
        }

        if (TMUtils.enableXtOnEdge()) {
            return this.edgeInstallExtensionTag;
        }

        return this.chromeInstallExtensionTag;
    }
}

VSS.classExtend(ConfigureFeedbackControl, TFS_Host_TfsContext.TfsContext.ControlExtensions);
Controls.Enhancement.registerEnhancement(ConfigureFeedbackControl, ".feedback-view")

SDK_Shim.registerContent("test.feedbackresponse.initialize", (context: SDK_Shim.InternalContentContextData) => {

    let $feedbackContainer = $("<div>").addClass("feedback-view");
    context.$container.append($feedbackContainer);
    let baseControl = Controls.create(
        ConfigureFeedbackControl, $feedbackContainer, context.options);
    return baseControl;
});
