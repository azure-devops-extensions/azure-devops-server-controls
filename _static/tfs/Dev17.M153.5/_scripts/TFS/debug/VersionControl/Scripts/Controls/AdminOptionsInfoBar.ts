import Controls = require("VSS/Controls");
import StatusIndicator = require("VSS/Controls/StatusIndicator");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");

export class OptionsInfoBar extends Controls.BaseControl {

    public static enhancementTypeName: string = "tfs.versioncontrol.OptionsInfoBar";

    private _tfsContext: TFS_Host_TfsContext.TfsContext;
    private _statusIndicator: any;
    private _statusMessage: any;

    constructor(options?) {

        super(options);
    }

    public initializeOptions(options?: any) {
        /// <param name="options" type="any" />

        super.initializeOptions($.extend({
            tagName: "div",
            cssClass: "options-info-bar"
        }, options));
    }

    public initialize() {
        this._tfsContext = this._options.tfsContext || TFS_Host_TfsContext.TfsContext.getDefault();
        this._populate($("<div />").addClass("options-info-bar-container").appendTo(this._element));
    }

    public setStatus(showProgress: boolean, message?: string, delay?: number, fadeOut?: number) {
        if (delay > 0) {
            this.delayExecute("setStatus", delay, true, function () {
                this._setStatus(showProgress, message, fadeOut);
            });
        }
        else {
            this.cancelDelayedFunction("setStatus");
            this._setStatus(showProgress, message, fadeOut);
        }
    }

    private _populate($container) {
        this._statusIndicator = <StatusIndicator.StatusIndicator>Controls.BaseControl.createIn(StatusIndicator.StatusIndicator, $container);
        this._statusMessage = $("<span />").addClass("options-info-bar-statusMessage").appendTo($container);
        $("<span />").addClass("options-info-bar-filler").appendTo($container);
    }

    private _setStatus(showProgress: boolean, message?: string, fadeOut?: number) {
        if (showProgress) {
            this._statusIndicator.start();
        }
        else {
            this._statusIndicator.complete();
        }

        this._statusMessage.stop(true, true).text(message || "").attr("title", message || "").show();
        if (fadeOut > 0) {
            this._statusMessage.fadeOut(fadeOut);
        }
    }
}
