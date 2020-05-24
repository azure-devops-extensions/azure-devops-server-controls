import VSS = require("VSS/VSS");
import Controls = require("VSS/Controls");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import WITOM = require("WorkItemTracking/Scripts/TFS.WorkItemTracking");

export class WorkItemThrottleControl extends Controls.BaseControl {
    public workItem: WITOM.WorkItem;
    public changedDelegate: any;
    public previouslyModified: boolean;

    constructor(options?) {
        super(options);
    }

    public _dispose() {
        this.unbind(true);
        this.cancelDelayedFunction("update");
        super._dispose();
    }

    public bind(workItem: WITOM.WorkItem): void {
        var control = this;
        this.unbind(true);

        if (workItem) {

            if (!this.changedDelegate) {
                this.changedDelegate = function (sender, args) {
                    control.updateThrottle(args);
                };
            }

            workItem.attachWorkItemChanged(this.changedDelegate);
            this.workItem = workItem;
            this.updateThrottle();
        }
    }

    public unbind(noUpdate?: boolean) {
        if (this.workItem) {

            if (this.changedDelegate) {
                this.workItem.detachWorkItemChanged(this.changedDelegate);
            }

            this.workItem = null;

            if (!noUpdate) {
                this.updateThrottle();
            }
        }
    }

    public update(args?) {
        this.updateInternal(args);
    }

    public updateThrottle(args?) {
        this.delayExecute("update", 200, true, function () {
            this.updateInternal(args);
        });
    }

    public updateInternal(args?) {
        if ($.isFunction(this._options.update)) {
            return this._options.update.call(this, this, args);
        }
    }

    protected _getTfsContext(): TFS_Host_TfsContext.TfsContext {
        return this.workItem
            ? this.workItem.store.getTfsContext()
            : TFS_Host_TfsContext.TfsContext.getDefault();
    }
}

VSS.initClassPrototype(WorkItemThrottleControl, {
    workItem: null,
    changedDelegate: null,
    previouslyModified: false
});
