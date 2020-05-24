import WITConstants = require("Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants");
import CustomerIntelligenceConstants = require("WorkItemTracking/Scripts/CustomerIntelligence");
import { TelemetryUtils } from "WorkItemTracking/Scripts/Utils/TelemetryUtils";

export function recordBoardFieldUsageInQueryFilters(wiql: string, feature: string) {
    if (!wiql) {
        return;
    }
    wiql = wiql.toLowerCase();
    var whereIndex = wiql.indexOf("where");
    if (whereIndex !== -1) {
        var usage = new TelemetryUtils.BoardFieldUsageData();
        if (_isFieldInWhereClause(wiql, WITConstants.CoreFieldRefNames.BoardColumn, whereIndex)) {
            usage.column = true;
        }
        if (_isFieldInWhereClause(wiql, WITConstants.CoreFieldRefNames.BoardColumnDone, whereIndex)) {
            usage.done = true;
        }
        if (_isFieldInWhereClause(wiql, WITConstants.CoreFieldRefNames.BoardLane, whereIndex)) {
            usage.lane = true;
        }
        TelemetryUtils.recordBoardFieldsUsageChange(CustomerIntelligenceConstants.WITCustomerIntelligenceArea.WORK_ITEM_TRACKING, feature, usage);
    }
}

function _isFieldInWhereClause(wiql: string, fieldRefName: string, whereIndex: number): boolean {
    fieldRefName = fieldRefName.toLowerCase();
    var fieldIndex = wiql.indexOf(fieldRefName, whereIndex);
    return fieldIndex !== -1;
}

export function recordBoardFieldUsageInColumns(columns: any, feature: string) {
    var usage = new TelemetryUtils.BoardFieldUsageData();
    if (columns && $.isArray(columns)) {
        columns.forEach((column: any, index: number) => {
            if (column && column.fieldId) {
                switch (column.fieldId) {
                    case WITConstants.CoreField.BoardColumn:
                        usage.column = true;
                        break;
                    case WITConstants.CoreField.BoardColumnDone:
                        usage.done = true;
                        break;
                    case WITConstants.CoreField.BoardLane:
                        usage.lane = true;
                        break;
                    default:
                        break;
                }
            }
        });
    }

    TelemetryUtils.recordBoardFieldsUsageChange(CustomerIntelligenceConstants.WITCustomerIntelligenceArea.WORK_ITEM_TRACKING, feature, usage);
}
