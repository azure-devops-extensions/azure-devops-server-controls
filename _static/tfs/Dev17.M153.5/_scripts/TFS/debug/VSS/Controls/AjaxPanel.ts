/// <amd-dependency path='VSS/LoaderPlugins/Css!VSS.Controls' />

import Compatibility = require("VSS/Compatibility");
import Panels = require("VSS/Controls/Panels");

export class AjaxPanel extends Panels.AjaxPanel {
    constructor(options?: any) {
        Compatibility.moved("AjaxPanel", "VSS/Controls/AjaxPanel", "VSS/Controls/Panels");
        super(options);
    }
}
