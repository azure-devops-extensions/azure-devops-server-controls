///<summary >
/// This file modifies the behavior of marked (javascript implementation of a markdown renderer).
/// Depends on marked-0.3.2.js. May work with but has not been tested against other versions of marked.
///</summary >

/// <reference path="../marked.d.ts" />
/// <reference path="../URI.d.ts" />

import VSS = require("VSS/VSS");
import marked = require("Presentation/Scripts/marked");
import URI = require("Presentation/Scripts/URI");
import PresentationResources = require("Presentation/Scripts/TFS/Resources/TFS.Resources.Presentation");
import ServerConstants = require("Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants");
import Service = require("VSS/Service");
import FeatureAvailability_Services = require("VSS/FeatureAvailability/Services");

(function () {
    // Override marked.Renderer.prototype.link
    var baseLinkFunc = marked.Renderer.prototype.link;
    marked.Renderer.prototype.link = function (href, title, text) {

        var linkHtml = baseLinkFunc.call(this, href, title, text);
        var linkObj: JQuery = $(linkHtml);
        var externalIconHtml: string = "";

        if (linkObj.length === 1 && linkObj.is('a')) {

            var hrefVal: string = linkObj.attr('href');
            linkObj.attr('data-original-href', hrefVal);

            if (this.options.transformLink) {    
                hrefVal = this.options.transformLink(hrefVal);
                linkObj.attr('href', hrefVal);
            }

            if (IsExternal(hrefVal)) {

                linkObj.attr('target', '_blank');

                if (!this.options.hideExternalImageIcon) {
                    
                    var iconSpan: JQuery = $("<span class='bowtie-icon bowtie-navigate-external'></span>");
                    var tooltip: string = PresentationResources.MarkdownExternalLinkTooltip;
                    iconSpan.attr('title',tooltip);
                    externalIconHtml = iconSpan[0].outerHTML;
                }
            }

            return linkObj[0].outerHTML + externalIconHtml;
        } else {
            return linkHtml;
        }
    }

    // Override marked.Renderer.prototype.image
    var baseImageFunc = marked.Renderer.prototype.image;
    marked.Renderer.prototype.image = function (href, title, text) {

        var imgHtml = baseImageFunc.call(this, href, title, text);
        var imgObj: JQuery = $(imgHtml);

        if (imgObj.length === 1 && imgObj.is('img')) {

            if (this.options.transformImage) {

                var srcVal: string = imgObj.attr('src');
                srcVal = this.options.transformImage(srcVal);
                imgObj.attr('src', srcVal);
            }

            return imgObj[0].outerHTML;
        }
        else {
            return imgHtml;
        }
    }
}());

export module Helper {
    export function getWindow() {

        return window;
    }
}

function IsExternal(href: string): boolean {

    var window = Helper.getWindow();
    var uri: URI = new URI(href);
    var hostname: string = uri.hostname() ? uri.hostname() : window.location.hostname;
    return hostname !== window.location.hostname;
}

VSS.tfsModuleLoaded("marked-tfs-extensions", exports);
