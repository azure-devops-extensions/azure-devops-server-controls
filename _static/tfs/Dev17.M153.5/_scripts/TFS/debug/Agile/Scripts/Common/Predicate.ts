/// <reference types="jquery" />



import WITConstants = require("Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants");


// interface for fetching workitem field values and types required for evaluating the wiql expression tree
export interface IPredicateEvaluationHelper {
    // Retrieve the field value corresponding to fieldReferenceName, and compare it with 'value'
    // < 0 : lesser
    // = 0 : equal
    // > 0 : greater
    compare: (fieldReferenceName: string, value: any) => number;

    contains: (fieldReferenceName: string, value: any) => boolean;

    under: (fieldReferenceName: string, value: any) => boolean;
}

// interface for getting the list of supported fields, operators and macros.
export interface IPredicateConfiguration {

    getSupportedFieldTypes: () => WITConstants.FieldType[];

    getSupportedOperators: (fieldType: WITConstants.FieldType) => string[];

    getSupportedMacros: (fieldType: WITConstants.FieldType) => string[];
}

export interface IPredicateVisitor {
    (currentPredicate: PredicateOperator, parentPredicate: PredicateOperator): boolean;
}

export class PredicateOperator {
    public evaluate(helper: IPredicateEvaluationHelper): boolean {
        return false;
    }

    public walk(parent: PredicateOperator, before: IPredicateVisitor, after: IPredicateVisitor): boolean {
        if (before && before(this, parent)) {
            if (after) {
                return after(this, parent);
            } else {
                return true;
            }
        } else {
            return false;
        }
    }
}

export class PredicateUnaryOperator extends PredicateOperator {
    public operand: PredicateOperator;

    public evaluate(helper: IPredicateEvaluationHelper): boolean {
        return this.operand.evaluate(helper);
    }

    public walk(parent: PredicateOperator, before: IPredicateVisitor, after: IPredicateVisitor): boolean {
        return super.walk(parent, before,() => {

            if (this.operand) {
                if (!this.operand.walk(this, before, after)) {
                    return false;
                }
            }

            if (after) {
                return after(this, parent);
            } else {
                return true;
            }

        });

    }
}


export enum OperatorPrecendence {
    Low,
    High
}

export class PredicateOpenParenthesesOperator extends PredicateOperator {
    constructor() {
        super();
    }
}

export class PredicateCloseParenthesesOperator extends PredicateOperator {
    constructor() {
        super();
    }
}

export class PredicateBinaryOperator extends PredicateOperator {
    public operands: PredicateOperator[];
    public precedence: OperatorPrecendence;

    public walk(parent: PredicateOperator, before: IPredicateVisitor, after: IPredicateVisitor): boolean {
        return super.walk(parent, before,() => {

            if (this.operands) {
                var length: number = this.operands.length;
                var i: number;
                for (i = 0; i < length; i++) {
                    if (!this.operands[i].walk(this, before, after)) {
                        return false;
                    }
                }
            }

            if (after) {
                return after(this, parent);
            } else {
                return true;
            }

        });

    }
}

export class PredicateAndOperator extends PredicateBinaryOperator {
    public evaluate(helper: IPredicateEvaluationHelper): boolean {
        if (this.operands) {
            var length: number = this.operands.length;
            var i: number;
            for (i = 0; i < length; i++) {
                if (!this.operands[i].evaluate(helper)) {
                    return false;
                }
            }
        }
        return true;
    }

    public precedence: OperatorPrecendence = OperatorPrecendence.High;
}

export class PredicateOrOperator extends PredicateBinaryOperator {
    public evaluate(helper: IPredicateEvaluationHelper): boolean {
        if (this.operands) {
            var length: number = this.operands.length;
            var i: number;
            for (i = 0; i < length; i++) {
                if (this.operands[i].evaluate(helper)) {
                    return true;
                }
            }
        }
        return false;
    }

    public precedence: OperatorPrecendence = OperatorPrecendence.Low;
}

export class PredicateFieldOperator extends PredicateOperator {
    public field: string;
    public value: any;
    constructor(field: string, value: any) {
        super();
        this.field = field;
        this.value = value;
    }
}

export class PredicateFieldComparisonOperator extends PredicateFieldOperator {
    public compare(helper: IPredicateEvaluationHelper): number {
        return helper.compare(this.field, this.value);
    }
}

export class PredicateEqualsOperator extends PredicateFieldComparisonOperator {
    public evaluate(helper: IPredicateEvaluationHelper): boolean {
        return this.compare(helper) === 0;
    }
}

export class PredicateNotEqualsOperator extends PredicateFieldComparisonOperator {
    public evaluate(helper: IPredicateEvaluationHelper): boolean {
        return this.compare(helper) !== 0;
    }
}

export class PredicateGreaterThanOperator extends PredicateFieldComparisonOperator {
    public evaluate(helper: IPredicateEvaluationHelper): boolean {
        return this.compare(helper) > 0;
    }
}

export class PredicateGreaterThanOrEqualToOperator extends PredicateFieldComparisonOperator {
    public evaluate(helper: IPredicateEvaluationHelper): boolean {
        return this.compare(helper) >= 0;
    }
}

export class PredicateLessThanOperator extends PredicateFieldComparisonOperator {
    public evaluate(helper: IPredicateEvaluationHelper): boolean {
        return this.compare(helper) < 0;
    }
}

export class PredicateLessThanOrEqualToOperator extends PredicateFieldComparisonOperator {
    public evaluate(helper: IPredicateEvaluationHelper): boolean {
        return this.compare(helper) <= 0;
    }
}

export class PredicateFieldContainmentOperator extends PredicateFieldOperator {
    public contains(helper: IPredicateEvaluationHelper): boolean {
        return helper.contains(this.field, this.value);
    }
}

export class PredicateContainsOperator extends PredicateFieldContainmentOperator {
    public evaluate(helper: IPredicateEvaluationHelper): boolean {
        return this.contains(helper) === true;
    }
}

export class PredicateNotContainsOperator extends PredicateFieldContainmentOperator {
    public evaluate(helper: IPredicateEvaluationHelper): boolean {
        return this.contains(helper) === false;
    }
}

export class PredicateFieldTreePathOperator extends PredicateFieldOperator {
    public under(helper: IPredicateEvaluationHelper): boolean {
        return helper.under(this.field, this.value);
    }
}

export class PredicateUnderOperator extends PredicateFieldTreePathOperator {
    public evaluate(helper: IPredicateEvaluationHelper): boolean {
        return this.under(helper) === true;
    }
}

export class PredicateNotUnderOperator extends PredicateFieldTreePathOperator {
    public evaluate(helper: IPredicateEvaluationHelper): boolean {
        return this.under(helper) === false;
    }
}



