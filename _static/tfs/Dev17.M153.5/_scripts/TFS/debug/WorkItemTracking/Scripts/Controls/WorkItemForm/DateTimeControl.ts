import Q = require("q");
import VSS = require("VSS/VSS");
import { WorkItemControl } from "WorkItemTracking/Scripts/Controls/WorkItemForm/WorkItemControl";
import { IContainedFieldControl } from "WorkItemTracking/Scripts/Controls/WorkItemForm/Interfaces";
import { TextWorkItemControl } from "WorkItemTracking/Scripts/Controls/WorkItemForm/TextWorkItemControl";
import WITOM = require("WorkItemTracking/Scripts/TFS.WorkItemTracking");
import Culture = require("VSS/Utils/Culture");

export class DateTimeControl extends WorkItemControl {
    private _control: IContainedFieldControl;

    constructor(container, options?, workItemType?) {
        super(container, options, workItemType);
    }

    public _init() {
        super._init();

        this._control = new TextWorkItemControl(this, {
            dropSourceGeneratorAsync: function (field) {
                return Q([]);
            }
        }, {
                type: "date-time",
                dateTimeFormat: `${Culture.getDateTimeFormat().ShortDatePattern} ${Culture.getDateTimeFormat().ShortTimePattern}`
            }
        );
    }

    public invalidate(flushing) {
        super.invalidate(flushing);
        this._control.invalidate(flushing, this._getField());
    }

    public _getControlValue(): any {
        /// <returns type="any" />

        return this._control.getValue();
    }

    public clear() {
        this._control.clear();
    }

    public bind(workItem: WITOM.WorkItem, disabled?: boolean) {
        super.bind(workItem, disabled);
        if (workItem) {
            this._control.onBind(workItem);
        }
    }

    public unbind(isDisposing?: boolean) {
        if (this._workItem) {
            this._control.onUnbind();
        }
        super.unbind(isDisposing);
    }
}

VSS.initClassPrototype(DateTimeControl, {
    _control: null
});