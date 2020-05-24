
import { IInputBaseState } from "DistributedTaskControls/Common/Types";
import * as Utils_String from "VSS/Utils/String";
import * as Utils_Array from "VSS/Utils/Array";

import * as RegexConstants from "DistributedTaskControls/Common/RegexConstants";

export interface IPredicateRule {
    inputName: string;
    condition: string;
    expectedValue: string;
}

export interface IPredicateExpression {
    predicateRules: IPredicateRule[];
    operator: string;
}

const Operator_AND: string = "&&";
const Operator_OR: string = "||";

/**
 * Helper class for processing expression rules.
 */
export class PredicateExpressionHelper {

    /**
     * @brief Process the expression rule string and separate our rule based on operator and input control name.
     * @param {string} expressionRule
     * @returns PredicateExpression object
     */
    public static getPredicateExpression(expressionRule: string): IPredicateExpression {
        let rule: IPredicateExpression = null;
        if (expressionRule) {
            if (expressionRule.indexOf(Operator_AND) !== -1) {
                let rules = expressionRule.split(Operator_AND);
                let predicateRules = rules.map(this.getPredicateRule);
                rule = {
                    operator: Operator_AND,
                    predicateRules: predicateRules
                };
            } else if (expressionRule.indexOf(Operator_OR) !== -1) {
                let rules = expressionRule.split(Operator_OR);
                let predicateRules = rules.map(this.getPredicateRule);
                rule = {
                    operator: Operator_OR,
                    predicateRules: predicateRules
                };
            } else {
                let predicateRule = this.getPredicateRule(expressionRule);
                rule = {
                    operator: null,
                    predicateRules: [predicateRule]
                };
            }
        }

        return rule;
    }

    public static getPredicateRule(expressionRule: string): IPredicateRule {
        let reg = RegexConstants.PredicateRuleRegEx;
        let rule: IPredicateRule = null;
        
        if (!expressionRule || !expressionRule.trim()) {
            return null;
        } 
        
        reg.lastIndex = 0;
        expressionRule = expressionRule.trim();

        let matches = reg.exec(expressionRule);
        if (matches && matches.length === 4) {
            rule = {
                inputName: matches[1].trim(),
                condition: matches[2].trim(),
                expectedValue: matches[3].trim()
            };
        }
        return rule;
    }

    public static getPredicateResult(rule: IPredicateRule, valueToCheck: string): boolean {
        let returnValue: boolean = false;

        let valueToCheckLowerCase = valueToCheck ? valueToCheck.toLowerCase() : valueToCheck;

        if (rule) {
            let expectedValue = rule.expectedValue ? rule.expectedValue.toLowerCase() : rule.expectedValue;

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
            }
        }

        return returnValue;
    }


    public static evaluate(expr1: boolean, expr2: boolean, operator: string): boolean {
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