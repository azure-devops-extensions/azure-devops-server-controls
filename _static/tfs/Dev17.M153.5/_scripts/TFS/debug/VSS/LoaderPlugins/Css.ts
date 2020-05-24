///<reference path='../References/VSS.SDK.Interfaces.d.ts' />

import Context = require("VSS/Context");
import Q = require("q");

module CssLoaderPlugin {
    export class CssLoader {
        private _pendingLoads = 0;

        protected _attachListeners(name: string, linkNode: HTMLElement, callback: Function, errorCallback: Function): void {
            var unbind = () => {
                linkNode.removeEventListener('load', loadEventListener);
                linkNode.removeEventListener('error', errorEventListener);
            };

            var loadEventListener = (e: any) => {
                unbind();
                callback();
            };

            var errorEventListener = (e: any) => {
                unbind();
                errorCallback(e);
            };

            linkNode.addEventListener('load', loadEventListener);
            linkNode.addEventListener('error', errorEventListener);
        }

        private _onLoad(name: string, callback: Function): void {
            this._pendingLoads--;
            callback();
        }

        private _onLoadError(name: string, errorCallback: Function, error: any): void {
            this._pendingLoads--;
            errorCallback(error);
        }

        private _insertLinkNode(linkNode: HTMLElement): void {
            this._pendingLoads++;

            var head = document.head || document.getElementsByTagName('head')[0];
            var other = head.getElementsByTagName('link') || head.getElementsByTagName('script');
            if (other.length > 0 && other[other.length - 1].nextSibling) {
                // insert the new link node after the last link node
                head.insertBefore(linkNode, other[other.length - 1].nextSibling);
            }
            else {
                head.appendChild(linkNode);
            }
        }

        protected _linkTagExists(name: string, cssUrl: string): boolean {

            var namePrefixIndex = name.indexOf(":");
            if (namePrefixIndex >= 0) {
                name = name.substr(namePrefixIndex + 1);
            }

            var links = document.getElementsByTagName('link');
            for (var i = 0, len = links.length; i < len; i++) {
                var nameAttr = links[i].getAttribute('data-name');
                var hrefAttr = links[i].getAttribute('href');
                if (nameAttr === name || hrefAttr === cssUrl) {
                    return true;
                }

                var bundledFilesAttr = links[i].getAttribute('data-includedstyles') || '';
                var bundledFiles = bundledFilesAttr.split(';');
                for (var j = 0, len2 = bundledFiles.length; j < len2; j++) {
                    if (bundledFiles[j] === name) {
                        return true;
                    }
                }

                // See whether this css file is loaded by some external mechanism
                if (externalLoadedCss[name.toLowerCase()] === true) {
                    return true;
                }
            }

            return false;
        }

        public load(name: string, cssUrl: string, highContrastUrl: string, includedCssNames: string[], callback: Function, errorCallback: Function): void {
            if (this._linkTagExists(name, cssUrl)) {
                callback();
                return;
            }

            var linkNode = this.createLinkTag(name, cssUrl, highContrastUrl, includedCssNames, callback, errorCallback);
            this._insertLinkNode(linkNode);
        }

        public createLinkTag(name: string, cssUrl: string, highContrastUrl: string, includedCssNames: string[], externalCallback: Function, externalErrorCallback: Function): HTMLElement {
            // New link node
            var linkNode = document.createElement('link');
            linkNode.setAttribute('rel', 'stylesheet');
            linkNode.setAttribute('type', 'text/css');
            linkNode.setAttribute('data-name', name);
            linkNode.setAttribute('data-highcontrast', highContrastUrl);

            if (includedCssNames && includedCssNames.length) {
                linkNode.setAttribute('data-includedstyles', includedCssNames.join(';'));
            }

            // Set callback and error callback
            var callback = () => this._onLoad(name, externalCallback);
            var errorCallback = (error: any) => this._onLoadError(name, externalErrorCallback, error);

            // Attach listeners for load or load error notifications
            this._attachListeners(name, linkNode, callback, errorCallback);

            // Set url
            linkNode.setAttribute('href', cssUrl);

            return linkNode;
        }
    }

    export class IE8CssLoader extends CssLoader {
        protected _attachListeners(name: string, linkNode: HTMLElement, callback: Function, errorCallback: Function): void {
            // Add onload directly for IE8 since addEventListener does not exist prior to IE9
            linkNode.onload = () => {
                linkNode.onload = null;
                callback();
            };
        }
    }

    //Needed to work around issue where WebKit versions older than 535.23
    //does not support onLoad event on Link tags
    export class PhantomJsCssLoader extends CssLoader {
        public load(name: string, cssUrl: string, fallbackUrl: string, includedCssNames: string[], callback: Function, errorCallback: Function): void {
            super.load(name, cssUrl, fallbackUrl, includedCssNames, callback, errorCallback);
            this._loadCheck(name, cssUrl, callback);
        }

        private _loadCheck(name: string, cssUrl: string, callback: Function) {
            setTimeout(() => {
                if (this._linkTagExists(name, cssUrl)) {
                    callback();
                }
                else {
                    this._loadCheck(name, cssUrl, callback);
                }
            }, 10);
        }
    }
}

var cssLoader: CssLoaderPlugin.CssLoader = null;
if (navigator.userAgent.indexOf('MSIE 7') >= 0 || navigator.userAgent.indexOf('MSIE 8') >= 0) {
    cssLoader = new CssLoaderPlugin.IE8CssLoader();
}
else if (navigator.userAgent.indexOf('PhantomJS') >= 0) {
    cssLoader = new CssLoaderPlugin.PhantomJsCssLoader();
}
else {
    cssLoader = new CssLoaderPlugin.CssLoader();
}

function getCssFileUri(loadingModule: string, theme?: string) {

    var parts = loadingModule.split(":", 2);
    if (parts.length === 2) {
        return Context.getCssModuleUrl(parts[0], parts[1], theme);
    }
    else {
        return Context.getCssModuleUrl(null, loadingModule, theme);
    }
}

var asyncModuleNameIndex = 0;

/**
 * Inject the specified CSS stylesheet into the DOM.
 * @param cssUrl Url of the stylesheet
 * @param highContrastUrl Fallback high contrast url
 * @param includedCssNames List of the names of the CSS files included in the Stylesheet (if bundled)
 * @param callback Callback to invoke once the style is loaded
 * @param errorCallback Callback to invoke if the load fails
 */
export function injectStylesheet(cssUrl: string, highContrastUrl: string, includedCssNames: string[]): IPromise<any> {
    var deferred = Q.defer();

    cssLoader.load("async-" + ++asyncModuleNameIndex, cssUrl, highContrastUrl, includedCssNames, () => {
        deferred.resolve(null);
    }, (e) => {
        deferred.reject(e);
    });

    return deferred.promise;
}

const externalLoadedCss: { [name: string]: boolean } = {};

/**
 * Register an externally loaded CSS file (through bundle for example)
 *
 * @param cssName Name of the css file
 */
export function registerLoadedCss(cssName: string): void {
    if (cssName) {
        externalLoadedCss[cssName.toLowerCase()] = true;
    }
}

/**
 * Exported RequireJS plugin loader function
 * @param moduleName
 * @param requireSource
 * @param externalCallback
 * @param requireConfig
 */
export function load(moduleName: string, requireSource: string, externalCallback: Function, requireConfig: RequireConfig) {

    if (!moduleName) {
        if (window.console) {
            console.warn("No name supplied to VSS/LoaderPlugins/Css");
        }
        externalCallback({});
    }
    else if (requireConfig && (<any>requireConfig).isTest === true) {
        // Test environment, no need to load css files
        externalCallback({});
    }
    else {
        var cssUrl = getCssFileUri(moduleName);
        cssLoader.load(moduleName, cssUrl, getCssFileUri(moduleName, "HighContrast"), null, () => {
            externalCallback({});
        }, () => {
            var errorCallback = (<any>externalCallback).error;
            if (typeof errorCallback === 'function') {
                errorCallback('Could not find ' + cssUrl + ' or it was empty');
            }
        });
    }
}