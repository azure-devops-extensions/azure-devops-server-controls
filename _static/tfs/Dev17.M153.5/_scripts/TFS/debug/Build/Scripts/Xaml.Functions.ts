/// <reference types="jquery" />




import BuildResources = require("Build/Scripts/Resources/TFS.Resources.Build");

import Marked = require("Presentation/Scripts/marked");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import TFS_OM_Common = require("Presentation/Scripts/TFS/TFS.OM.Common");

import Artifacts_Services = require("VSS/Artifacts/Services");
import Diag = require("VSS/Diag");
import Events_Action = require("VSS/Events/Action");
import Events_Handlers = require("VSS/Events/Handlers");
import Menus = require("VSS/Controls/Menus");
import Navigation_Services = require("VSS/Navigation/Services");
import Utils_Clipboard = require("VSS/Utils/Clipboard");
import Utils_Html = require("VSS/Utils/Html");
import Utils_String = require("VSS/Utils/String");
import Utils_UI = require("VSS/Utils/UI");
import VSS = require("VSS/VSS");
import VSS_Resources_Common = require("VSS/Resources/VSS.Resources.Common");

import WITDialogShim = require("WorkItemTracking/SharedScripts/WorkItemDialogShim");

import Constants_Platform = require("VSS/Common/Constants/Platform");
import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";
import { MarkdownRenderer } from "ContentRendering/Markdown";


var domElem = Utils_UI.domElem;

export function appendNodeElement(container, node, level) {
    return $("<div class='" + (node.nodeType || "info") + "' />").css("margin-left", level * 30).appendTo(container);
}

export function appendText(container, text) {
    return createElement("text", text).appendTo(container);
}

export function createElement(className, text?: string, id?: string) {
    /// <param name="text" type="string" optional="true" />
    /// <param name="id" type="string" optional="true" />

    var element = $("<div class='" + (className || "text") + "' />");
    if (typeof (text) === "string") {
        renderMessageForDisplay(element, text);
    }
    if (typeof (id) === "string") {
        element.attr("id", id);
    }
    return element;
}

export function createIconLogNode(container, node, message) {
    var tableElement = $("<table class='xaml-icon-log-table' cellspacing=0 cellpadding=2><tr valign=top><td style='width:1%'></td><td></td></tr></table>");
    var pre = $("<pre />");
    var status = node.status;

    if (container) {
        tableElement.appendTo(container);
    }

    if (status) {
        // There apparently aren't icons for icon-error or icon-success anymore, so map these status cases to the relevant icon-tfs-build-status-* icons.
        status = status === "error" ? "failed" : status;
        status = status === "success" ? "succeeded" : status;
        if (!message || status === "failed" || status === "succeeded") {
            tableElement.find("td:eq(0)").append($("<span class='icon icon-tfs-build-status-" + status + "' />"));
        }
        else {
            tableElement.find("td:eq(0)").append($("<span class='icon icon-" + status + "' />"));
        }
    }

    renderMessageForDisplay(pre, node.text || "");
    tableElement.find("td:eq(1)").append(pre);

    return tableElement;
}

export function renderMessageForDisplay($parentElement: JQuery, messageText: string) {
    var $paragraph: JQuery,
        $element: JQuery,
        m: string;

    if (messageText) {
        // make text safe
        messageText = Utils_Html.HtmlNormalizer.normalizeStripAttributes(messageText, [], ["aria-label", "role"]);
        // replace newline chars with <br>
        m = convertNewLinesToBreaks(messageText);
        // create links for markDown syntax [text](url|uri)
        $paragraph = convertMarkDownToAnchors(m);
        $element = createElement("custom-summary-message");
        $element.append($paragraph);
        $parentElement.append($element);
    }
}

export function convertNewLinesToBreaks(message) {
    // Check for \r\n and \n\r (we don't check for \n by itself because it matches path names too easily)
    // These aren't replaced automatically in the VB expressions of the XAML
    message = message.replace(/\\r\\n/g, "<br>");
    message = message.replace(/\\n\\r/g, "<br>");
    return message;
}

export function convertMarkDownToAnchors(message: string) {

    var $paragraph: JQuery = $(domElem("p"));

    if (FeatureAvailabilityService.isFeatureEnabled(Constants_Platform.WebPlatformFeatureFlags.MarkdownRendering)) {
        const markDownRenderer = new MarkdownRenderer({
            html: true
        });

        $paragraph.append((markDownRenderer).renderHtml(message));
    }
    else {
        $paragraph.append(Marked(message));
    }

    $paragraph.find("a").map((index, linkElement) => {
        var jLinkElement = $(linkElement);
        jLinkElement.data("linkUrl", jLinkElement.attr("href"));
        jLinkElement.click(handleArtifactLinkClick);
    });

    return $paragraph;
}

export function handleArtifactLinkClick(e?) {
    var clientLinking = TFS_OM_Common.ProjectCollection.getDefaultConnection().getService<Artifacts_Services.ClientLinking>(Artifacts_Services.ClientLinking),
        linkUrl = $(e.currentTarget).data("linkUrl");
    //beginResolveArtifacts is resolving items twice, to avoid duplicate artifact actions maintain a map
    var artifactsMap: { key: Artifacts_Services.IArtifactData; value: any } = <any>{};
    if (linkUrl && Utils_String.ignoreCaseComparer(linkUrl.substring(0, 5), "vstfs") === 0) {
        clientLinking.beginResolveArtifacts([linkUrl], null, (artifacts) => {
            var error, actionUrl, artifactToolType,
                tfsContext = TFS_Host_TfsContext.TfsContext.getDefault();
            if (artifacts.length > 0) {
                if (artifactsMap[artifacts[0]]) {
                    //no op
                    return;
                }
                error = artifacts[0].getError();
                if (error) {
                    // No resolver was registered so try the ones we know
                    artifactToolType = artifacts[0].getTool() + "|" + artifacts[0].getType();
                    switch (artifactToolType.toLowerCase()) {
                        case "build|build":
                            var buildId = parseInt(Artifacts_Services.LinkingUtilities.decodeUri(artifacts[0].getUri()).id);
                            actionUrl = tfsContext.getActionUrl("summary", "build", { buildId: buildId } as TFS_Host_TfsContext.IRouteData);
                            Events_Action.getService().performAction(Events_Action.CommonActions.ACTION_WINDOW_OPEN, {
                                url: actionUrl,
                                target: "_blank"
                            });
                            break;
                        case "workitemtracking|workitem":
                            WITDialogShim.showWorkItemById(artifacts[0].getId(), tfsContext);
                            break;
                        default:
                            alert(Utils_String.format(VSS_Resources_Common.UnknownArtifactType, artifacts[0].getType()));
                            break;
                    }
                }
                else {
                    artifacts[0].execute(tfsContext.contextData);
                }
                artifactsMap[artifacts[0]] = artifacts[0];
            }
        });
    }
    else {
        // Open a new window for the url that was clicked
        Events_Action.getService().performAction(Events_Action.CommonActions.ACTION_WINDOW_OPEN, {
            url: linkUrl,
            target: "_blank"
        });
    }

    // make sure we ignore the href for this link
    return false;
}

export function createActionAnchor(text: string, action: (eventObject: JQueryEventObject) => any): JQuery {
    /// <summary>Creates an anchor element that performs an action when clicked or ENTER is pressed while it has focus. It should behave almost exactly like a "real" link.</summary>
    /// <param name="text" type="string">The text to display</param>
    /// <param name="action" type="string">The action to perform</param>

    return $(domElem("a"))
        .text(text || "")
        // the browser will give the anchor a tab index consistent with its position in the DOM
        .attr("tabindex", 0)
        .click(action)
        .keypress((eventObject: JQueryEventObject) => {
            // when CTRL is held, the keyCode is 10 and ctrlKey is true
            if (eventObject.keyCode === Utils_UI.KeyCode.ENTER || (eventObject.keyCode === 10 && eventObject.ctrlKey)) {
                action(eventObject);
            }
        });
}

export function createLinkElement(link: Link) {
    /// <summary>Creates an anchor element by resolving its type</summary>
    /// <param name="link" type="any">External link</param>

    var linkElement,
        resolvedLink = resolveExternalLink(null, link);

    if ($.isFunction(resolvedLink.action)) {
        linkElement = createActionAnchor(link.text, (eventObject: JQueryEventObject) => {
            eventObject.preventDefault();
            resolvedLink.action.call(link);
        });
    }
    else {
        linkElement = $(domElem("a")).text(link.text);
        if (resolvedLink.href) {
            linkElement.attr("href", resolvedLink.href);
        }
    }

    return linkElement;
}

export function resolveExternalLink(build, link: Link) {
    /// <summary>Resolves the external link according to its link type</summary>
    /// <param name="link" type="any">External link</param>
    var href, result, path;

    Diag.Debug.assert(Boolean(link), "link is expected");

    result = {};

    switch (link.type) {
        case BuildExternalLinkType.LocalPath:
            // If the link is a local path we need to handle it differently
            // to support various browsers due to different browser security settings
            // on local files and folders
            result.action = function () {
                openDropLocation(link);
            };
            break;

        case BuildExternalLinkType.VersionControlPath:
            // url is a version control folder
            href = TFS_Host_TfsContext.TfsContext.getDefault().getActionUrl(null, "versionControl");
            href += Navigation_Services.getHistoryService().getFragmentActionLink("contents", {
                path: link.url
            });

            result.href = href;
            break;

        case BuildExternalLinkType.ArtifactUri:
            result.action = function () {
                // Need to resolve the artifact
                var clientLinking = TFS_OM_Common.ProjectCollection.getDefaultConnection().getService<Artifacts_Services.ClientLinking>(Artifacts_Services.ClientLinking);
                clientLinking.beginResolveArtifacts([link.url], null, function (artifacts) {
                    if (artifacts.length > 0) {
                        artifacts[0].execute(TFS_Host_TfsContext.TfsContext.getDefault());
                    }
                });
            };
            break;

        case BuildExternalLinkType.BuildContainerPath:
            // link is a build container path (#/a/b)
            // The ItemContent method on the Build Api Controller can download the file(s) at the specified path
            path = "/drop";
            href = TFS_Host_TfsContext.TfsContext.getDefault().getActionUrl("ItemContent", "build", {
                area: 'api',
                buildUri: build.uri,
                path: path
            } as TFS_Host_TfsContext.IRouteData);

            result.href = href;
            break;

        case BuildExternalLinkType.Url:
            result.href = link.url;
            break;
    }

    return result;
}

export function executeLink(build, link: any) {
    /// <summary>Executes the specified link by resolving its type</summary>
    /// <param name="link" type="any">External link</param>

    var resolvedLink = resolveExternalLink(build, link);

    if ($.isFunction(resolvedLink.action)) {
        resolvedLink.action.call(link);
    }
    else if (resolvedLink.href) {
        Events_Action.getService().performAction(Events_Action.CommonActions.ACTION_WINDOW_OPEN, {
            url: resolvedLink.href,
            target: "_blank"
        });
    }
}

export function renderJsonLimitExceeded(element: JQuery, build: any, hasLogs: boolean) {
    $(domElem("div", "error"))
        .append($(domElem("span")).text(BuildResources.BuildLogViewJsonLimitExceededMessage))
        .appendTo(element);

    if (hasLogs) {
        // download logs as zip
        createActionAnchor(BuildResources.BuildDetailViewDownloadLogs, (eventObject: JQueryEventObject) => {
            eventObject.preventDefault();
            Events_Action.getService().performAction(Events_Action.CommonActions.ACTION_WINDOW_OPEN, {
                url: TFS_Host_TfsContext.TfsContext.getDefault().getActionUrl("ItemContent", "build", {
                    area: 'api',
                    buildUri: build.uri,
                    path: "/logs"
                } as TFS_Host_TfsContext.IRouteData),
                target: "_blank"
            });
        }).appendTo(element);
    }
    else {
        // open drop folder
        createActionAnchor(BuildResources.BuildDetailViewOpenDropFolder, (eventObject: JQueryEventObject) => {
            eventObject.preventDefault();
            if (build.dropFolder && build.dropFolder.url) {
                executeLink(build, build.dropFolder);
            }
            else {
                alert(BuildResources.DropLocationEmpty);
            }
        }).appendTo(element);
    }
}

export function decorateLog(view) {

    // Hide all the properties
    $("div.BuildProperties", view).prev("div.BuildHeader").addClass("BuildHide");

    // Expand/Collapse all the properties when clicked on header
    $("div.BuildProperties", view).prev("div.BuildHeader").click(function () {
        $(this).toggleClass("BuildShow");
    });
}

export function transformXML(view, transformedLogXml) {
    var html;

    try {
        html = Utils_Html.HtmlNormalizer.normalize(transformedLogXml);
    }
    catch (error) {
        VSS.errorHandler.showError(error);
        view.html("<div class='inline-error'></div>").text(Utils_String.format(BuildResources.XmlError, error.message));
    }

    view.html(html);
}

export enum BuildExternalLinkType {
    None = 0,
    Url = 1,
    LocalPath = 2,
    ArtifactUri = 3,
    VersionControlPath = 4,
    BuildContainerPath = 5,
}

export interface Link {
    text: string;
    url: string;
    type: BuildExternalLinkType;
}

export function openDropLocation(link: Link) {
    try {
        // IE <= 10 exposes document.all. IE11 does not
        var isIE: boolean = !!document.all || (window.ActiveXObject !== undefined);

        // if https or not IE, copy the url to the clipboard
        if (!isIE || Utils_String.ignoreCaseComparer("https:", window.location.protocol) === 0) {
            if (confirm(Utils_String.format(BuildResources.OpenDropLocation, link.url))) {
                // attempt to copy the location to the clipboard
                Utils_Clipboard.copyToClipboard(link.url);
            }
        }
        else {
            // IE and not https
            Events_Action.getService().performAction(Events_Action.CommonActions.ACTION_WINDOW_OPEN, {
                url: link.url,
                target: "_blank"
            });
        }
    }
    catch (ex) {
        alert(Utils_String.format(BuildResources.FailedToOpenDropLocationFormat, link.url, ex));
    }
}

// TFS plugin model requires this call for each tfs module.
VSS.tfsModuleLoaded("Xaml.Functions", exports);
