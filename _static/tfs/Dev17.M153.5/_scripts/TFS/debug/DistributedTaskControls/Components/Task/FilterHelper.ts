
import { IInputBaseState } from "DistributedTaskControls/Common/Types";
import * as Utils_String from "VSS/Utils/String";
import * as Utils_Array from "VSS/Utils/Array";

import {IPredicateRule, IPredicateExpression, PredicateExpressionHelper} from "DistributedTaskControls/Components/Task/PredicateExpressionHelper";

import { ServiceEndpoint } from "TFS/ServiceEndpoint/Contracts";

const Operator_AND: string = "&&";

/**
 * Helper class for processing filter rules.
 * Since this is getting used only in this TaskStore class hence keeping it in the same file.
 */
export class FilterHelper {

    public static getValueToCheck(predicateRule: IPredicateRule, objectData: any): string {
        
        let propertyName: string = predicateRule.inputName;
        
        return this.getPropertyValue(objectData, propertyName);
    }

    public static getFilteredObjects(expressionRule: string, objectArray: any[]): any[] {
        let result = [];

        let predicationExpression = PredicateExpressionHelper.getPredicateExpression(expressionRule);

        if (!!predicationExpression) {
            for (let objectData of objectArray) {
                let isSelected = (predicationExpression.operator === Operator_AND) ? true : false;
                
                for (let i = 0; i < predicationExpression.predicateRules.length; i++) {
                    let predicateRule = predicationExpression.predicateRules[i];
                    if (!!predicateRule) {
                        let valueToCheck = this.getValueToCheck(predicateRule, objectData);
                        let nextExpr = PredicateExpressionHelper.getPredicateResult(predicateRule, valueToCheck);
                        isSelected = PredicateExpressionHelper.evaluate(isSelected, nextExpr, predicationExpression.operator);
                    }
                }

                if (isSelected) {
                    result.push(objectData);
                }
            }
        } else {
            return objectArray;
        }
        
        return result;
    }

    private static getPropertyValue(objectData: any, propertyToSearch: string): string {
        let result = null;

        if (!objectData) {
            return result;
        }

        if (objectData instanceof Array) {
            for (let i = 0; i < objectData.length; i++) {
                result = this.getPropertyValue(objectData[i], propertyToSearch);
                if (result) {
                    return result;
                } 
            }
        } else {
            for (let propertyName in objectData) {
                if (objectData.hasOwnProperty(propertyName)) {
                    let propertyValue = objectData[propertyName];

                    if (propertyValue instanceof Object || propertyValue instanceof Array) {
                        result = this.getPropertyValue(propertyValue, propertyToSearch);

                        if (result) {
                            return result;
                        }
                    } else {
                        if (propertyName.trim().toLowerCase() === propertyToSearch.trim().toLowerCase()) {
                            return propertyValue;
                        }
                    }
                }
            }
        }

        return result;
    }
}