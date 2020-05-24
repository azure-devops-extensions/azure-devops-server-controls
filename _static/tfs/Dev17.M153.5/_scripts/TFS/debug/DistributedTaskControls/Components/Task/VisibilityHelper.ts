
import { IInputBaseState } from "DistributedTaskControls/Common/Types";
import * as Utils_String from "VSS/Utils/String";
import * as Utils_Array from "VSS/Utils/Array";

export interface IPredicateRule {
    inputName: string;
    condition: string;
    expectedValue: string;
}

export interface IVisibilityRule {
    predicateRules: IPredicateRule[];
    operator: string;
}

const Operator_AND: string = "&&";
const Operator_OR: string = "||";

/**
 * Helper class for processing Visibility rules.
 * Since this is getting used only in this TaskStore class hence keeping it in the same file.
 */
export class VisibilityHelper {

    /**
     * @brief Process the visible rule string and separate our rule based on operator and input control name.
     * @param {string} visibleRule
     * @returns VisibilityRule object
     */
    public static getVisibilityRule(visibleRule: string): IVisibilityRule {
        // The implementation is same as existing logic present in TFS.Tasks.TasksEditor.ts
        let rule: IVisibilityRule = null;
        if (visibleRule) {
            if (visibleRule.indexOf(Operator_AND) !== -1) {
                let rules = visibleRule.split(Operator_AND);
                let predicateRules = rules.map(this.getPredicateRule);
                rule = {
                    operator: Operator_AND,
                    predicateRules: predicateRules
                };
            } else if (visibleRule.indexOf(Operator_OR) !== -1) {
                let rules = visibleRule.split(Operator_OR);
                let predicateRules = rules.map(this.getPredicateRule);
                rule = {
                    operator: Operator_OR,
                    predicateRules: predicateRules
                };
            } else {
                let predicateRule = this.getPredicateRule(visibleRule);
                rule = {
                    operator: null,
                    predicateRules: [predicateRule]
                };
            }
        }

        return rule;
    }

    public static getPredicateRule(visibleRule: string): IPredicateRule {
        let reg = /([a-zA-Z0-9 ]+)([!=<>]+)([a-zA-Z0-9. ]+)|([a-zA-Z0-9 ]+(?=NotContains|NotEndsWith|NotStartsWith))(NotContains|NotEndsWith|NotStartsWith)([a-zA-Z0-9. ]+)|([a-zA-Z0-9 ]+(?=Contains|EndsWith|StartsWith))(Contains|EndsWith|StartsWith)([a-zA-Z0-9. ]+)/g;
        let rule: IPredicateRule = null;
        let matches = reg.exec(visibleRule);
        if (matches && matches.length === 10) {
            if (!!matches[1]) {
                rule = {
                    inputName: matches[1].trim(),
                    condition: matches[2].trim(),
                    expectedValue: matches[3].trim()
                };
            } else if (!!matches[4])  {
                rule = {
                    inputName: matches[4].trim(),
                    condition: matches[5].trim(),
                    expectedValue: matches[6].trim()
                };
            } else {
                rule = {
                    inputName: matches[7].trim(),
                    condition: matches[8].trim(),
                    expectedValue: matches[9].trim()
                };
            }
        }
        return rule;
    }

    public static isSourcedInput(inputName: string, dependencyToTargetMap: IDictionaryStringTo<string[]>): boolean {

        // check if the input is target of any data source or source-definitions
        let isSourced: boolean = false;
        Object.keys(dependencyToTargetMap).forEach((dependency) => {
            let inputToTargetMatch: boolean = dependencyToTargetMap[dependency].some((target) =>
                (target === inputName)
            );

            if (inputToTargetMatch) {
                isSourced = true;
            }
        });

        return isSourced;
    }

    public static getVisibility(visibilityRule: IVisibilityRule,
        dependentInputs: IInputBaseState[],
        dependencyToTargetMap?: IDictionaryStringTo<string[]>,
        inputName?: string): boolean {
        let result: boolean = visibilityRule.operator === Operator_AND;

        for (let i = 0, len = visibilityRule.predicateRules.length; i < len; i++) {
            let predicateRule = visibilityRule.predicateRules[i];
            let dependentInput: IInputBaseState = Utils_Array.first(dependentInputs, (dependentInput: IInputBaseState) => {
                return Utils_String.equals(dependentInput.inputName, predicateRule.inputName, true);
            });

            if (dependentInput) {
                let isInputVisible = Utils_String.equals(dependentInput.inputName, inputName, true) ||
                    !(dependentInput.isHidden()) || (dependencyToTargetMap && this.isSourcedInput(dependentInput.inputName, dependencyToTargetMap));
                if (!isInputVisible) {
                    result = this._evaluate(result, isInputVisible, visibilityRule.operator);
                } else {
                    let predicateResult = this._getPredicateResult(predicateRule, dependentInput.inputValue);
                    result = this._evaluate(result, predicateResult, visibilityRule.operator);
                }
            } else {
                result = false;
                break;
            }
        }

        return result;
    }

    private static _getPredicateResult(rule: IPredicateRule, valueToCheck: string): boolean {
        let returnValue: boolean = false;

        let valueToCheckLowerCase = valueToCheck ? valueToCheck.toString().toLowerCase() : valueToCheck;

        if (rule) {
            let expectedValue = rule.expectedValue ? rule.expectedValue.toString().toLowerCase() : rule.expectedValue;

            switch (rule.condition) {
                case "=":
                case "==":
                    returnValue = (valueToCheckLowerCase === expectedValue);
                    break;
                case "!=":
                    returnValue = (valueToCheckLowerCase !== expectedValue);
                    break;
                case "<":
                    returnValue = (valueToCheckLowerCase < expectedValue);
                    break;
                case ">":
                    returnValue = (valueToCheckLowerCase > expectedValue);
                    break;
                case "<=":
                    returnValue = (valueToCheckLowerCase <= expectedValue);
                    break;
                case ">=":
                    returnValue = (valueToCheckLowerCase >= expectedValue);
                    break;
                case "Contains":
                    returnValue = (valueToCheck && valueToCheck.indexOf(expectedValue) >= 0);
                    break;
                case "StartsWith":
                    returnValue = (valueToCheck && Utils_String.startsWith(valueToCheck, expectedValue, Utils_String.ignoreCaseComparer));
                    break;
                case "EndsWith":
                    returnValue = (valueToCheck && Utils_String.endsWith(valueToCheck, expectedValue, Utils_String.ignoreCaseComparer));
                    break;
                case "NotContains":
                    returnValue = !(valueToCheck && valueToCheck.indexOf(expectedValue) >= 0);
                    break;
                case "NotStartsWith":
                    returnValue = !(valueToCheck && Utils_String.startsWith(valueToCheck, expectedValue, Utils_String.ignoreCaseComparer));
                    break;  
                case "NotEndsWith":
                    returnValue = !(valueToCheck && Utils_String.endsWith(valueToCheck, expectedValue, Utils_String.ignoreCaseComparer));
                    break;    
            }
        }

        return returnValue;
    }


    private static _evaluate(expr1: boolean, expr2: boolean, operator: string): boolean {
        if (operator === Operator_AND) {
            return expr1 && expr2;
        } else if (operator === Operator_OR) {
            return expr1 || expr2;
        } else if (operator === null) {
            // Single condition, no operator
            return expr2;
        }
    }
}