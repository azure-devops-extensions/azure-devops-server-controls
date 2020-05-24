import Util_Cards = require('Agile/Scripts/Card/CardUtils');
import { WorkItemPredicateConfiguration } from 'Agile/Scripts/Common/PredicateWIT';
import WITConstants = require('Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants');
import { WiqlOperators } from 'WorkItemTracking/Scripts/OM/WiqlOperators';


export interface IOmitUnhelpfulFields {
    isFieldOmittedAsUnhelpful(fieldReferenceName: string): boolean;
}

/**
 * Applies restrictions on the set of Field Types, operators and Macros exposed through WIT, for querying on Analytics service.
 * 
 * Note: This was intended to be for any analytics query, but is may be slightly burndown specific right now. 
 * When using more generaly take note of this and consider alternative factorings.
 */
export class AnalyticsPredicateConfiguration extends WorkItemPredicateConfiguration implements IOmitUnhelpfulFields {

    /** We do not support the use of any macros with analytics, currently.*/
    public getSupportedMacros(): string[] {
        return [];
    }

    //Extensibility hook around Boards field filtering.
    // We start with ones already omitted by Boards.    
    public isFieldOmittedAsUnhelpful(fieldReferenceName: string): boolean {

        switch (fieldReferenceName.toLowerCase()) {
            case WITConstants.CoreFieldRefNames.BoardColumn.toLowerCase():
            case WITConstants.CoreFieldRefNames.BoardLane.toLowerCase():
            case WITConstants.CoreFieldRefNames.Id.toLowerCase():
                return true;

            default:
                return Util_Cards.isFieldBlackListed(fieldReferenceName);
        }
    }

    /**
    * Gets the list of supported operators for a particular field.
    * @param fieldName The reference name of the specified field. 
    * @return A list of operators supported for this particular field.
    */
    public getSupportedOperators(fieldType: WITConstants.FieldType): string[] {
        var predicateSupportedOperators: string[] = [];

        //AX client-service stack restricts out a number of operations which are allowed with WIT Queries, currently.
        let basicEqualityCheckOperators = [
            WiqlOperators.OperatorEqualTo,
            WiqlOperators.OperatorNotEqualTo,
        ];

        let scalarComparisonOperators = [
            WiqlOperators.OperatorEqualTo,
            WiqlOperators.OperatorNotEqualTo,
            WiqlOperators.OperatorLessThan,
            WiqlOperators.OperatorLessThanOrEqualTo,
            WiqlOperators.OperatorGreaterThan,
            WiqlOperators.OperatorGreaterThanOrEqualTo
        ];

        let pathOperators = [
            WiqlOperators.OperatorUnder,
            WiqlOperators.OperatorNotUnder
        ];

        switch (fieldType) {
            case WITConstants.FieldType.TreePath:
                predicateSupportedOperators.push(...basicEqualityCheckOperators);
                predicateSupportedOperators.push(...pathOperators);
                break;
            case WITConstants.FieldType.String:
            case WITConstants.FieldType.PlainText:
            case WITConstants.FieldType.Boolean:
            case WITConstants.FieldType.Guid:
                predicateSupportedOperators.push(...basicEqualityCheckOperators);
                break;
            case WITConstants.FieldType.Integer:
            case WITConstants.FieldType.Double:
            case WITConstants.FieldType.DateTime:
                predicateSupportedOperators.push(...scalarComparisonOperators);
                break;
            default:
                break;
        }

        return predicateSupportedOperators;
    }

    public static getTagOperators(): string[] {
        return [
            WiqlOperators.OperatorContains,
            WiqlOperators.OperatorNotContains
        ];
    }
}