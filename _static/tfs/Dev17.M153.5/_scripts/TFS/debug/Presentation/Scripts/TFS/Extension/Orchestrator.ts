import * as React from "react";
import * as ReactDOM from "react-dom";

import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";
import * as Locations from "VSS/Locations";
import * as VSSResourcesPlatform from "VSS/Resources/VSS.Resources.Platform";
import * as SDK_Shim from "VSS/SDK/Shim";
import { Uri } from "VSS/Utils/Url";

import { ISpinnerProps, Spinner, SpinnerSize } from "OfficeFabric/Spinner";

import { FeatureAvailabilityFlags } from "Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants";
import * as PresentationResources from "Presentation/Scripts/TFS/Resources/TFS.Resources.Presentation";
import { MarkdownExtensionConstants } from "Presentation/Scripts/TFS/TFS.MarkdownExtension.Common";

// We want to block malicious urls hosting in video iframe
const youtubeRE: RegExp = /^https:\/\/www\.youtube(-nocookie)?\.com\/embed\/[A-Za-z0-9_\-]{11}(\?[A-Za-z=0-9_&\-]*)?/i;
const streamRE: RegExp = /^https:\/\/[A-Za-z0-9_\-]*\.microsoftstream\.com\/embed\/video\/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}(\?[A-Za-z=0-9_&\-]*)?/i;

SDK_Shim.registerContent("orchestrator", (context) => {
    return {
        sendContent: (content: string, isEditMode: Boolean) => {
            sendContent(content, isEditMode, context);
        }
    };
});

// exporting this function for testcases
export function sendContent(content: string, isEditMode: Boolean, context: SDK_Shim.InternalContentContextData): void {
    const videoIframeElement : HTMLIFrameElement = formVideoIframeElement(content, isEditMode);
    if (videoIframeElement) {
        const loadingElement: HTMLDivElement = createLoadingElement(videoIframeElement.width, videoIframeElement.height);
        const showVideo = () => {
            context.$container.append(loadingElement);
            context.$container.append(videoIframeElement);
        };
        videoIframeElement.onload = () => {
            videoIframeElement.parentNode.removeChild(loadingElement);
            videoIframeElement.hidden = false;
        };
        if (!isEditMode) {
            showVideo();
        } else {
            const previewNode : HTMLElement = context.$container.parent().children()[0];
            previewNode.onclick = () => {
                showVideo();
                previewNode.parentNode.removeChild(previewNode);
            };
        }
    } else {
        const errorImageElement: HTMLDivElement = createErrorElememt();
        if (isEditMode) {
            const previewNode : HTMLImageElement = <HTMLImageElement>context.$container.parent().children()[0];
            previewNode.onclick = () => {
                previewNode.parentNode.removeChild(previewNode);
                context.$container.append(errorImageElement);
            };
        } else {
            context.$container.append(errorImageElement);
        }
    }
}

function createErrorElememt(): HTMLDivElement {
    const backgroundDiv: HTMLDivElement = document.createElement("div");
    backgroundDiv.style.position = "relative";
    backgroundDiv.style.width = MarkdownExtensionConstants.MarkdownSyntaxVideoDefaultWidth + "px";
    const errorImageElement: HTMLImageElement = document.createElement("img");
    errorImageElement.src = Locations.urlHelper.getVersionedContentUrl("Presentation/video-error.svg");
    errorImageElement.width = Number(MarkdownExtensionConstants.MarkdownSyntaxVideoDefaultWidth);
    errorImageElement.height = Number(MarkdownExtensionConstants.MarkdownSyntaxVideoDefaultHeight);
    errorImageElement.alt = PresentationResources.VideoError;
    backgroundDiv.appendChild(errorImageElement);
    const ErrorLinkElement: HTMLAnchorElement = document.createElement("a");
    ErrorLinkElement.innerText = PresentationResources.LearnMoreLabel;
    // need to replace this link with valid blog link
    ErrorLinkElement.href = "#";
    ErrorLinkElement.className = "video-learn-more-link";
    ErrorLinkElement.hidden = true;
    backgroundDiv.appendChild(ErrorLinkElement);
    return backgroundDiv;
}

function createLoadingElement(width: string, height: string): HTMLDivElement {
    const spinnerContainer: HTMLDivElement = document.createElement("div");
    spinnerContainer.style.position = "relative";
    spinnerContainer.style.width = width + "px";
    const loadImageElement: HTMLImageElement = document.createElement("img");
    loadImageElement.src = Locations.urlHelper.getVersionedContentUrl("Presentation/video-load.svg");
    loadImageElement.width = Number(width);
    loadImageElement.height = Number(height);
    loadImageElement.alt = PresentationResources.VideoLoadingMessage;
    spinnerContainer.appendChild(loadImageElement);
    const spinnerProps: ISpinnerProps = { size: SpinnerSize.large };
    const spinnerElement: React.SFCElement<ISpinnerProps> = React.createElement(Spinner, spinnerProps);
    spinnerContainer.appendChild(document.createElement("div"));
    ReactDOM.render(spinnerElement, spinnerContainer.children[1]);
    spinnerContainer.children[1].className = "video-spinner";
    return spinnerContainer;
}

function validateIframeSrc(iframeElementSrc: string): boolean {
    return iframeElementSrc && (youtubeRE.test(iframeElementSrc) || streamRE.test(iframeElementSrc));
}

function formVideoIframeElement(iframeString: string, viewMode: Boolean): HTMLIFrameElement {
    const parentDiv: HTMLDivElement = document.createElement("div");
    parentDiv.innerHTML = iframeString;
    const videoIframeElement : HTMLIFrameElement = parentDiv.getElementsByTagName("iframe")[0];
    if (videoIframeElement && validateIframeSrc(videoIframeElement.src)) {
        videoIframeElement.height = videoIframeElement.height || MarkdownExtensionConstants.MarkdownSyntaxVideoDefaultHeight;
        videoIframeElement.width = videoIframeElement.width || MarkdownExtensionConstants.MarkdownSyntaxVideoDefaultWidth;
        videoIframeElement.hidden = true;
        const videoURI: Uri = Uri.parse(videoIframeElement.src);
        videoURI.addQueryParam("app", VSSResourcesPlatform.ProductName);
        if (viewMode) {
            videoURI.addQueryParam("autoplay", "true", true);
        }
        videoIframeElement.src = encodeURI(videoURI.absoluteUri);
        videoIframeElement.innerHTML = "";
        return videoIframeElement;
    }
    return null;
}
