import StatusIndicator = require("VSS/Controls/StatusIndicator");
import Utils_Core = require("VSS/Utils/Core");
import VSS_Resources_Platform = require("VSS/Resources/VSS.Resources.Platform");
import Controls = require("VSS/Controls");

/**
 * Helper class to support an overlay spinner.
 */
export class StatusIndicatorOverlayHelper {

    private _statusControl: StatusIndicator.StatusIndicator;
    private _loadingOverlay: JQuery;
    private _parentElement: JQuery;
    private _delayFunc: Utils_Core.DelayedFunction;

    /**
     * Constructor.  The parent element must be absolutely or relatively positioned, it will be used to position the
     * overlay.
     * @param parentElement
     */
    constructor(parentElement: JQuery) {
        this._parentElement = parentElement;
    }

    // Hide the element behind a background-colored element with "Loading" element. 
    public startProgress(wait: number) {

        if (this._delayFunc) {
            this._delayFunc.cancel();
        }

        this._delayFunc = Utils_Core.delay(this, wait || 0, () => {
            if (this._statusControl) {
                // Already showing one, don't show another
                return;
            }

            this._statusControl = <StatusIndicator.StatusIndicator>Controls.BaseControl.createIn(StatusIndicator.StatusIndicator, this._getLoadingOverlay(), {
                center: true,
                throttleMinTime: 0,
                imageClass: "big-status-progress",
                message: VSS_Resources_Platform.Loading
            });

            this._statusControl.start();
            this._delayFunc = null;
        });
    }

    // Undo startProgress(wait)
    public stopProgress() {
        if (this._delayFunc) {
            this._delayFunc.cancel();
            this._delayFunc = null;
        }

        if (this._statusControl) {
            this._statusControl.dispose();
            this._statusControl = null;
        }
        this._removeLoadingOverlay();
    }

    // Hide the form behind a background-colored element. Used when loading a form.
    private _getLoadingOverlay(): JQuery {
        if (!this._loadingOverlay) {
            this._loadingOverlay = $("<div></div>").addClass("control-loading-overlay").appendTo(this._parentElement);
        }
        this._loadingOverlay.show();
        return this._loadingOverlay;
    }

    // Undo _showLoadingOverlay
    private _removeLoadingOverlay() {
        if (this._loadingOverlay) {
            this._loadingOverlay.remove();
            this._loadingOverlay = null;
        }
    }
}

