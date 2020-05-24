import Controls = require("VSS/Controls");
import Extensions = require("Presentation/Scripts/TFS/TFS.Extensions");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import TFS_OM_Common = require("Presentation/Scripts/TFS/TFS.OM.Common");

import VCLegacyContracts = require("VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts");
import VCWebAccessContracts = require("VersionControl/Scripts/Generated/TFS.VersionControl.WebAccess.Contracts");
import * as VersionControlPath from "VersionControl/Scripts/VersionControlPath";
import VCControlsCommon = require("VersionControl/Scripts/Controls/ControlsCommon");
import VCBuiltInExtensions = require("VersionControl/Scripts/BuiltInExtensions")

export class VersionControlExtensionViewerSupport {

    private _tfsContext: TFS_Host_TfsContext.TfsContext;
    private _endPointId: any;
    private _getFallbackControl: any;
    private _integrations: any;
    private _isBuiltInExtension: boolean;

    /**
     * Instantiating this with builtinExtension=true for the Monaco editor/diff will create an 
     * extension host that provides access to the legacy built-in extension within a div rather than an iframe.
     * No other reaction work is required as messages are still asynchronously "posted" as before.
     * This is a temporary measure to bring the Monaco editor into the current page for performance benefits.
     */
    constructor(tfsContext, endPointId, getFallbackControl, builtInExtension = false) {
        this._tfsContext = tfsContext;
        this._endPointId = endPointId;
        this._getFallbackControl = getFallbackControl;
        this._isBuiltInExtension = builtInExtension;

        if (this._isBuiltInExtension) {
            this._initializeForBuiltInIntegrations();
        }
    }

    public getExtensionIntegration(items: VCLegacyContracts.ItemModel[], options: any, callback?: IResultCallback) {
        /// <param name="callback" type="IResultCallback" optional="true" />

        this._getAllEndPointIntegrations((integrations) => {
            let supportedIntegrations = [],
                selectedIntegration = null;

            if (integrations.length > 0) {

                supportedIntegrations = [].concat(integrations);

                $.each(items, (fileInfoIndex: number, item: VCLegacyContracts.ItemModel) => {

                    let matchingIntegrations = [],
                        fileInfo = item.contentMetadata;

                    if (!fileInfo) {
                        fileInfo = <VCLegacyContracts.FileContentMetadata>{
                            extension: VersionControlPath.getFileExtension(item.serverItem)
                        };
                    }

                    $.each(supportedIntegrations, (integrationIndex, integration) => {

                        let isMatch = true;

                        if (!integration.url && !this._isBuiltInExtension) {
                            // Only frame integrations are supported unless it's a built-in integration
                            isMatch = false;
                        }
                        if (fileInfo.isBinary && integration.properties.supportsBinaryFiles !== "true") {
                            // Binary files not supported by this integration
                            isMatch = false;
                        }
                        else if (fileInfo.isImage && integration.properties.supportsImageFiles !== "true") {
                            // Image files not supported by this integration
                            isMatch = false;
                        }
                        else if (integration.properties.supportedFileExtensionsRegEx &&
                            !("" + fileInfo.extension).match(new RegExp(integration.properties.supportedFileExtensionsRegEx))) {
                            // File extension regex does not match
                            isMatch = false;
                        }
                        else if (integration.properties.supportedContentTypesRegEx &&
                            !("" + fileInfo.extension).match(new RegExp(integration.properties.supportedContentTypesRegEx))) {
                            // File extension regex does not match
                            isMatch = false;
                        }

                        if (options.orientation) {
                            if (options.orientation === VCWebAccessContracts.DiffViewerOrientation.Inline && integration.properties.inlineDiffSupport === false) {
                                isMatch = false;
                            }
                            else if (options.orientation === VCWebAccessContracts.DiffViewerOrientation.SideBySide && integration.properties.sideBySideDiffSupport === false) {
                                isMatch = false;
                            }
                        }

                        if (isMatch) {
                            matchingIntegrations.push(integration);
                        }
                    });

                    supportedIntegrations = matchingIntegrations;
                });

                if (supportedIntegrations.length > 0) {
                    selectedIntegration = supportedIntegrations[0];
                }
            }

            callback.call(this, selectedIntegration);
        });
    }

    /**
     * If initialized for a built-in extension, this will return a BuiltInExtensionHost for hosting in a div.
     * Otherwise it returns a legacy ExtensionHost for iframe hosting and XDM communication. 
     */
    public createExtensionHost(element, options?) {

        options = options || {};
        $.extend(options, {
            end_point: (this._integrations[0] || {}).end_point
        });

        let type = this._isBuiltInExtension ? VCBuiltInExtensions.BuiltInExtensionHost : Extensions.ExtensionHost;
        return <Extensions.ExtensionHost>this._createExtensionHostForType(type, element, options);
    }

    private _createExtensionHostForType(type: any, element, options?) {
        return Controls.BaseControl.createIn(type, element, $.extend({
            tfsContext: this._tfsContext,
            postData: options.postData,
            errorOptions: {
                getFallbackControl: this._getFallbackControl
            }
        }, options));
    }

    private _getAllEndPointIntegrations(callback: IResultCallback) {
        /// <param name="callback" type="IResultCallback">Callback to execute whenever API call succeeds</param>

        if (!this._integrations) {
            this._integrations = [];
        }
        callback.call(this, this._integrations);
    }

    /**
     * The only legacy viewer extension is the Monaco editor.  When hosted built-in (within a div, not an iframe),
     * the url is not needed so we can avoid a server call by just pre-populating the integration information here.
     */
    private _initializeForBuiltInIntegrations() {
        let allIntegrations = [
            {
                end_point: VCControlsCommon.VersionControlExtensionEndPoints.FILE_VIEWER,
                properties: {
                    name: "Advanced Code Editor" // This is not seen by users and not localized.
                },
                handshake: Extensions.WebAccessExtensionFrameHandshakeBehavior.Smart,
                loadBehavior: Extensions.WebAccessExtensionFrameLoadBehavior.Post,
                url: ""
            },
            {
                end_point: VCControlsCommon.VersionControlExtensionEndPoints.DIFF_VIEWER,
                properties: {
                    name: "Advanced Code Editor" // This is not seen by users and not localized.
                },
                handshake: Extensions.WebAccessExtensionFrameHandshakeBehavior.Smart,
                loadBehavior: Extensions.WebAccessExtensionFrameLoadBehavior.Post,
                url: ""
            },
        ];

        this._integrations = $.grep<any>(allIntegrations, (integration, index) => {
            return integration.end_point === this._endPointId; 
        });
    }
}
