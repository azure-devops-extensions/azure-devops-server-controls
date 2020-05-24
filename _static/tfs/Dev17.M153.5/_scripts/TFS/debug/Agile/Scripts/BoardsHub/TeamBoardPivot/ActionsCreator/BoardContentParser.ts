import { FieldType } from "Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants";
import { IFieldDefinition } from "Agile/Scripts/Card/Cards";
import Utils_String = require("VSS/Utils/String");
import { ITeamBoardPivotContentDataProviderData } from "Agile/Scripts/BoardsHub/TeamBoardPivot/TeamBoardPivotContracts";

export module BoardContentParser {

    export function processBoardContent(boardContent: ITeamBoardPivotContentDataProviderData): void {
        // Process item source payload
        if (boardContent.boardModel && boardContent.boardModel.itemSource && boardContent.boardModel.itemSource.payload) {
            const itemSource = boardContent.boardModel.itemSource;
            const dateFieldIndice = _getDateFieldIndice(itemSource);
            const items = itemSource.payload.rows;
            _processDateValue(items, dateFieldIndice);
        }
    }

    function _getDateFieldIndice(itemSource): number[] {
        const fields = itemSource.payload.columns;
        const fieldDefinitions = itemSource.fieldDefinitions;
        let dateFieldIndice = [];
        if (fields) {
            for (let i = 0, len = fields.length; i < len; i++) {
                const fieldRefName = fields[i];
                const fieldType = fieldDefinitions.filter((fieldDef: IFieldDefinition) => { return Utils_String.equals(fieldDef.ReferenceName, fieldRefName, /* ignoreCase */true) });
                if (fieldType.length > 0 && fieldType[0].Type === FieldType.DateTime) {
                    dateFieldIndice.push(i);
                }
            }
        }
        return dateFieldIndice;
    }

    function _processDateValue(items: any[][], dateFieldIndice: number[]): void {
        items.forEach((item: any[]) => {
            dateFieldIndice.forEach((index: number) => {
                if (item[index]) {
                    const DateAsString = item[index];
                    item[index] = new Date(DateAsString);
                }
            });
        });
    }
}
