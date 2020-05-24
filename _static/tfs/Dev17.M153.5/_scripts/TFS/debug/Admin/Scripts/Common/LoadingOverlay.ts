import Controls = require("VSS/Controls");
import StatusIndicator = require("VSS/Controls/StatusIndicator");

export interface ILoadingOverlay {
    show: () => void;
    hide: () => void;
}

export class LoadingOverlay implements ILoadingOverlay {
    private _control: Controls.BaseControl;
    private _statusIndicator: StatusIndicator.StatusIndicator;
    private _statusOptions: StatusIndicator.IStatusIndicatorOptions = {
        center: true,
        imageClass: "big-status-progress",
        throttleMinTime: 0
    };

    constructor(control: Controls.BaseControl, className: string = null) {
        this._control = control;
        this._statusIndicator = Controls.Control.create(
            StatusIndicator.StatusIndicator, $(".control-busy-overlay", control.getElement().parent()), this._statusOptions);
    }

    public show() {
        this._control.showBusyOverlay();
        this._statusIndicator.start();
    }

    public hide() {
        this._statusIndicator.complete();
        this._control.hideBusyOverlay();
    }
}