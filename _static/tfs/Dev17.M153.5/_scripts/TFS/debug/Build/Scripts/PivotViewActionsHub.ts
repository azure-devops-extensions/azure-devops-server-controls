import * as PivotView from "Presentation/Scripts/TFS/Components/PivotView";

var _pivotViewActionsHub: PivotView.ActionsHub = null;

export function getPivotViewActionsHub(): PivotView.ActionsHub {
    if (!_pivotViewActionsHub) {
        _pivotViewActionsHub = new PivotView.ActionsHub();
    }
    return _pivotViewActionsHub;
}