import Controls = require("VSS/Controls");
import StatusIndicator = require("VSS/Controls/StatusIndicator");
import Utils_UI = require("VSS/Utils/UI");
import Q = require("q");
import VSS = require("VSS/VSS");

import VCResources = require("VersionControl/Scripts/Resources/TFS.Resources.VersionControl");

import domElem = Utils_UI.domElem;

export interface PromisedPanelOptions {
    contents: Q.Promise<JQuery>;
}

/**
 * A control that displays a loading status indicator until the specified
 * promise is fulfilled, at which point the controls element is replaced with 
 * the fulfilled element.
 */
export class PromisedPanel extends Controls.BaseControl {
    public contents() {
        return (<PromisedPanelOptions>this._options).contents;
    }

    private _statusIndicator: StatusIndicator.StatusIndicator;

    public initializeOptions(options?: PromisedPanelOptions) {
        super.initializeOptions($.extend({
            coreCssClass: "vc-promised-panel"
        }, options));
    }

    public initialize() {
        super.initialize();
        
        const options: PromisedPanelOptions = this._options;

        const $statusContainer = $(domElem("div", "status-container")).appendTo(this._element);
        const statusControl = <StatusIndicator.StatusIndicator>Controls.BaseControl.createIn(StatusIndicator.StatusIndicator, this._element, {
            center: true,
            imageClass: "status-progress",
            message: VCResources.LoadingText
        });

        statusControl.start();
        
        options.contents
            .then(resolvedElement => {
                statusControl.complete();
                this._element.empty();
                this._element.append(resolvedElement);
            })
            .fail(VSS.handleError);
    }
}