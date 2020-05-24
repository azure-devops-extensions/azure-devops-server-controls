/// <reference types="jquery" />


import Agile_Utils = require("Agile/Scripts/Common/Utils");
import Utils_String = require("VSS/Utils/String");
import Utils_Date = require("VSS/Utils/Date");

import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import TFS_OM_Common = require("Presentation/Scripts/TFS/TFS.OM.Common");
import TFS_OM_Identities = require("Presentation/Scripts/TFS/TFS.OM.Identities");
import TFS_TeamAwarenessService = require("Presentation/Scripts/TFS/FeatureRef/TFS.TeamAwarenessService");

import WITConstants = require("Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants");

import Cards = require("Agile/Scripts/Card/Cards");
import Diag = require("VSS/Diag");
import Predicate = require("Agile/Scripts/Common/Predicate");
import Util_Cards = require("Agile/Scripts/Card/CardUtils");
import Utils_Array = require("VSS/Utils/Array");
import { WiqlOperators } from "WorkItemTracking/Scripts/OM/WiqlOperators";
import { parseCurrentIteration } from "WorkItemTracking/Scripts/OM/WiqlValues";
import { ITeamSettings } from "Presentation/Scripts/TFS/FeatureRef/TFS.AgileCommon";

var tfsContext = TFS_Host_TfsContext.TfsContext.getDefault();

export class WorkItemPredicateEvaluationHelper implements Predicate.IPredicateEvaluationHelper {
    private _teamId: string;
    private _fieldValue: (refName: string) => any;
    private _fieldDefinitions: IDictionaryStringTo<Cards.CardFieldDefinition>;
    private _teamSettings: ITeamSettings;
    private _currentIdentity: string;

    constructor(teamId: string, fieldDefinitions: IDictionaryStringTo<Cards.CardFieldDefinition>, getFieldValue: (refName: string) => any) {
        this._teamId = teamId;
        this._fieldValue = getFieldValue;
        this._fieldDefinitions = fieldDefinitions;
    }

    /**
    * Retrieve the field type corresponding to the fieldReferenceName.
    * @param fieldReferenceName The reference name of the field to retrieved
    * @return A CardFieldType corresponding to the specified field.
    */
    public getFieldType(fieldReferenceName: string): Cards.CardFieldType {
        var cardFieldDefinition = this._fieldDefinitions[fieldReferenceName.toUpperCase()];
        if (cardFieldDefinition) {
            return cardFieldDefinition.type();
        }
        return 0;
    }

    /**
    * Retrieve the field value corresponding to fieldReferenceName, and compare it with 'value'
    * @param fieldReferenceName The reference name of the field to retrieved
    * @param value The value to be compared with.
    * @return A number indicating if the value is lesser ( < 0) , greater ( > 0) or equal ( == 0)
    */
    public compare(fieldReferenceName: string, value: any): number {
        if (typeof value === "string") {
            value = value.trim();
        }

        var fieldType: Cards.CardFieldType = this.getFieldType(fieldReferenceName);
        switch (fieldType) {
            case Cards.CardFieldType.PlainText:
            case Cards.CardFieldType.String:
            case Cards.CardFieldType.TreePath:
            case Cards.CardFieldType.Identity:
            case Cards.CardFieldType.Guid:
                value = this._getEvaluatedValue(fieldType, value);
                return Utils_String.ignoreCaseComparer(this._getFieldValue(fieldReferenceName), value);
            case Cards.CardFieldType.Boolean:
                var actualBoolValue: string = (this._getFieldValue(fieldReferenceName) === true) ? "True" : "False";
                var searchBoolValue: string = value;
                if (actualBoolValue === searchBoolValue) {
                    return 0;
                }
                else {
                    return 1;
                }
            case Cards.CardFieldType.Integer:
            case Cards.CardFieldType.Double:
                const fieldValueStr = this._getFieldValue(fieldReferenceName);
                //if both the field-value string and value string are "" (both are unset), they are considered same.
                if (fieldValueStr === "" && value === "") {
                    return 0;
                } else if (fieldValueStr === "") { //if the field-value string is "" but value string is not "", consider value as bigger.
                    return -1;
                } else if (value === "") { //if the field-value string is not "" but value string is "", consider field-value as bigger.
                    return 1;
                }
                const actualNumber: number = Number(fieldValueStr);
                const searchNumber: number = Number(value);
                if (isNaN(actualNumber) || isNaN(searchNumber)) {
                    return null;
                }
                return actualNumber - searchNumber;
            case Cards.CardFieldType.DateTime:
                var actualValue = this._getFieldValue(fieldReferenceName);
                //if both actual and search value is "" (means both are unset) we need to evaluate it to matching=true
                //do this before converting it to a date object
                if (actualValue === "" && value === "") {
                    return 0;
                }
                var actualDateValue: Date = Util_Cards.buildDate(actualValue);
                var searchDate: Date = Util_Cards.buildDate(value, true);
                if (!actualDateValue || !searchDate) {
                    break;
                }

                actualDateValue = Utils_Date.convertClientTimeToUserTimeZone(actualDateValue, true);
                actualDateValue = Utils_Date.stripTimeFromDate(actualDateValue);
                searchDate = Utils_Date.stripTimeFromDate(searchDate);

                return Utils_Date.defaultComparer(actualDateValue, searchDate);
        }
        return null; //Return null if the field type is not in the list
    }

    /**
    * Retrieve the field value corresponding to fieldReferenceName, and check if 'value' is contained within it.
    * @param fieldReferenceName The reference name of the field to retrieved
    * @param value The value to be compared with.
    * @return A boolean indicating if the value is contained within the field or not.
    */
    public contains(fieldReferenceName: string, value: any): boolean {
        switch (this.getFieldType(fieldReferenceName)) {
            case Cards.CardFieldType.PlainText:
            case Cards.CardFieldType.String:
                if (fieldReferenceName === Agile_Utils.DatabaseCoreFieldRefName.Tags) {
                    var fieldValue = this._getFieldValue(fieldReferenceName);
                    let tags = fieldValue.split(";");

                    tags.forEach((tag: string, index: number) => {
                        tags[index] = tag.trim().toUpperCase();
                    });

                    return Utils_Array.contains(tags, value.toUpperCase());
                }
            case Cards.CardFieldType.TreePath:
            case Cards.CardFieldType.Identity:
                return Utils_String.caseInsensitiveContains(this._getFieldValue(fieldReferenceName), value);
        }
        return null;
    }

    /**
    * Retrieve the field value corresponding to the TreePath fieldReferenceName, and check if 'value' is 'UNDER' within it.
    * @param fieldReferenceName The reference name of the field to retrieved
    * @param value The value to be compared with.
    * @return A boolean indicating if the value is 'UNDER' the TreePath field or not.
    */
    public under(fieldReferenceName: string, value: any): boolean {
        var fieldType: Cards.CardFieldType = this.getFieldType(fieldReferenceName);

        switch (fieldType) {
            case Cards.CardFieldType.TreePath:
                var fieldValue: string = this._getFieldValue(fieldReferenceName);
                fieldValue = this._trimTrailingSlashes(fieldValue);
                value = this._getEvaluatedValue(fieldType, value);
                value = this._trimTrailingSlashes(value);
                return Utils_String.startsWith(fieldValue, value, Utils_String.ignoreCaseComparer);
        }
        return null;
    }

    private _trimTrailingSlashes(path: string): string {
        if (!path) {
            return "";
        }

        return path.replace(/(\\)+$/, '');
    }

    private _getFieldValue(fieldReferenceName: string): any {
        if (this._fieldValue) {
            return this._fieldValue(fieldReferenceName);
        }

        return null;
    }

    private _getCurrentIteration(offset: number): string {
        if (!this._teamSettings) {
            const teamAwareness = TFS_OM_Common.ProjectCollection.getConnection(tfsContext).getService<TFS_TeamAwarenessService.TeamAwarenessService>(TFS_TeamAwarenessService.TeamAwarenessService);
            this._teamSettings = teamAwareness.getTeamSettings(this._teamId);
        }
        if (offset > 0) {
            const iteration = this._teamSettings.futureIterations[offset - 1];
            return iteration && iteration.friendlyPath;
        }
        if (offset < 0) {
            const idx = this._teamSettings.previousIterations.length + offset;
            const iteration = this._teamSettings.previousIterations[idx];
            return iteration && iteration.friendlyPath;
        }
        return this._teamSettings.currentIteration && this._teamSettings.currentIteration.friendlyPath;
    }

    private _getCurrentIdentity(): string {
        if (!this._currentIdentity) {
            this._currentIdentity = TFS_OM_Identities.IdentityHelper.getFriendlyDistinctDisplayName(tfsContext.currentIdentity);
        }
        return this._currentIdentity;
    }

    private _getEvaluatedValue(fieldType: Cards.CardFieldType, value: string): string {
        if (fieldType == Cards.CardFieldType.Identity &&
            Utils_String.ignoreCaseComparer(WiqlOperators.MacroMe, value) === 0) {
            return this._getCurrentIdentity();
        }
        const ciParts = parseCurrentIteration(value);
        if (fieldType == Cards.CardFieldType.TreePath && ciParts) {
            value = this._getCurrentIteration(ciParts.offset);
        }

        return value;
    }
}

export class WorkItemPredicateConfiguration implements Predicate.IPredicateConfiguration {

    /**
    * This class represents Rules support (fields/operators) in Type Script layer and needs to be kept in sync 
    * with corresponding class in AT layer and hence please make sure that any changes to supported 
    * operators here need to be in sync with corresponding changes in BoardCardRulesValidator.cs file.
    */

    /**
    * Gets the list of all supported field types.
    * @return A list of field types supported.
    */
    public getSupportedFieldTypes(): WITConstants.FieldType[] {
        return [
            WITConstants.FieldType.String,
            WITConstants.FieldType.Integer,
            WITConstants.FieldType.DateTime,
            WITConstants.FieldType.PlainText,
            WITConstants.FieldType.TreePath,
            WITConstants.FieldType.Double,
            WITConstants.FieldType.Guid,
            WITConstants.FieldType.Boolean
        ];
    }

    /**
    * Gets the list of supported operators for a particular field.
    * @param fieldName The reference name of the specified field. 
    * @return A list of operators supported for this particular field.
    */
    public getSupportedOperators(fieldType: WITConstants.FieldType): string[] {
        var predicateSupportedOperators: string[] = [];

        switch (fieldType) {
            case WITConstants.FieldType.String:
            case WITConstants.FieldType.PlainText:
                predicateSupportedOperators = [
                    WiqlOperators.OperatorEqualTo,
                    WiqlOperators.OperatorNotEqualTo,
                    WiqlOperators.OperatorContains,
                    WiqlOperators.OperatorNotContains
                ];
                break;
            case WITConstants.FieldType.TreePath:
                predicateSupportedOperators = [
                    WiqlOperators.OperatorEqualTo,
                    WiqlOperators.OperatorNotEqualTo,
                    WiqlOperators.OperatorContains,
                    WiqlOperators.OperatorNotContains,
                    WiqlOperators.OperatorUnder,
                    WiqlOperators.OperatorNotUnder
                ];
                break;
            case WITConstants.FieldType.Boolean:
            case WITConstants.FieldType.Guid:
                predicateSupportedOperators = [
                    WiqlOperators.OperatorEqualTo,
                    WiqlOperators.OperatorNotEqualTo
                ];
                break;
            case WITConstants.FieldType.Integer:
            case WITConstants.FieldType.Double:
            case WITConstants.FieldType.DateTime:
                predicateSupportedOperators = [
                    WiqlOperators.OperatorEqualTo,
                    WiqlOperators.OperatorNotEqualTo,
                    WiqlOperators.OperatorLessThan,
                    WiqlOperators.OperatorLessThanOrEqualTo,
                    WiqlOperators.OperatorGreaterThan,
                    WiqlOperators.OperatorGreaterThanOrEqualTo
                ];
                break;
        }

        return predicateSupportedOperators;
    }

    /**
    * Gets the list of supported macros
    * @param fieldName The reference name of the specified field. 
    * @return A list of operators supported for this configuration.
    */
    public getSupportedMacros(fieldType: WITConstants.FieldType): string[] {
        var predicateSupportedMacros: string[] = [];

        switch (fieldType) {
            case WITConstants.FieldType.DateTime:
                predicateSupportedMacros.push(WiqlOperators.MacroToday);
                break;
            case WITConstants.FieldType.TreePath:
                predicateSupportedMacros.push(WiqlOperators.MacroCurrentIteration);
                break;
            case WITConstants.FieldType.String:
                predicateSupportedMacros.push(WiqlOperators.MacroMe);
                break;
        }

        return predicateSupportedMacros;
    }

}

export class WorkItemQueryPredicate extends Predicate.PredicateUnaryOperator {

}

export class QueryExpression {

    constructor(query: Cards.IItemQuery) {
        var isQueryValid: boolean = WiqlHelper.isQueryValid(query);
        Diag.Debug.assert(isQueryValid, "WorkItem query should be formed correctly");

        if (isQueryValid) {
            this._clauses = query.clauses;
            this._groups = query.groups;
        }
    }

    public toPredicate(): WorkItemQueryPredicate {
        var predicate = new WorkItemQueryPredicate;
        this._operatorStack = [];
        this._infix = [];
        this._postFix = [];

        this._createInfixExpression();
        this._createPostFixExpression();

        var root: Predicate.PredicateOperator = this._createExpressionTree();
        predicate.operand = root;
        return predicate;
    }

    private _createExpressionTree(): Predicate.PredicateOperator {
        var nodes: Predicate.PredicateOperator[] = [];
        var length = this._postFix.length;
        for (var i = 0; i < length; i++) {
            var token = this._postFix[i];
            if (token instanceof Predicate.PredicateBinaryOperator) {
                var operator: Predicate.PredicateBinaryOperator = <Predicate.PredicateBinaryOperator>token;
                operator.operands = [];

                operator.operands.push(nodes.pop());
                operator.operands.push(nodes.pop());

                nodes.push(operator);
            } else {
                nodes.push(token);
            }
        }

        var root = nodes.pop();

        return root;
    }

    private _createInfixExpression(): void {
        var length = this._clauses.length;
        for (var i = 0; i < length; i++) {

            if (i > 0) {
                // treat logical operators as standard operators
                var logicalOperator = this._getLogicalOperator(this._clauses[i].logicalOperator);
                if (logicalOperator) {
                    this._infix.push(logicalOperator);
                }
            }

            // Push Open parentheses if needed
            if (this._groups && this._groups.length > 0) {
                this._groups.forEach((g) => {
                    if (g && g.start === this._clauses[i].index) {
                        this._infix.push(new Predicate.PredicateOpenParenthesesOperator());
                    }
                });
            }

            // treat other operators as operands
            var operator = this._getFieldOperator(this._clauses[i].operator, this._clauses[i].fieldName, this._clauses[i].value);
            if (operator) {
                this._infix.push(operator);
            }

            // Push close parentheses if needed
            if (this._groups && this._groups.length > 0) {
                this._groups.forEach((g) => {
                    if (g && g.end === this._clauses[i].index) {
                        this._infix.push(new Predicate.PredicateCloseParenthesesOperator());
                    }
                });
            }
        }
    }

    private _createPostFixExpression() {
        var length = this._infix.length;
        var top: Predicate.PredicateOperator;

        // iterate infix expression
        for (var i = 0; i < length; i++) {
            var token: Predicate.PredicateOperator = this._infix[i];

            // for = operations push into postfix expression
            if (token instanceof Predicate.PredicateFieldComparisonOperator ||
                token instanceof Predicate.PredicateFieldContainmentOperator ||
                token instanceof Predicate.PredicateFieldTreePathOperator) {
                this._postFix.push(token);
            }
            // for open parentheses just push it into operator stack.open parentheses has the highest priority
            else if (token instanceof Predicate.PredicateOpenParenthesesOperator) {
                this._operatorStack.push(token);
            }
            else if (token instanceof Predicate.PredicateCloseParenthesesOperator) {
                top = this._operatorStack.pop();
                // pop until open parentheses is encountered
                while (top && !(top instanceof Predicate.PredicateOpenParenthesesOperator)) {
                    this._postFix.push(top);
                    top = this._operatorStack.pop();
                }
            }
            // for and/or operators resolve operator stack and push high precedence
            // operators into the postfix expression
            else if (token instanceof Predicate.PredicateBinaryOperator) {
                var operator = <Predicate.PredicateBinaryOperator>token;
                top = this._operatorStack.pop();

                // pop until top of stack has operator of lower precedence
                while (top) {
                    if (top instanceof Predicate.PredicateOpenParenthesesOperator) {
                        this._operatorStack.push(top);
                        break;
                    }
                    else if ((<Predicate.PredicateBinaryOperator>top).precedence > operator.precedence) {
                        this._postFix.push(top);
                        top = this._operatorStack.pop();
                    } else {
                        this._operatorStack.push(top);
                        break;
                    }
                }

                // push to operator stack
                this._operatorStack.push(operator);
            }
        }

        // push remaining operators into postfix stack
        top = this._operatorStack.pop();
        while (top) {
            this._postFix.push(top);
            top = this._operatorStack.pop();
        }
    }

    private _getLogicalOperator(inVariantOperator: string): Predicate.PredicateBinaryOperator {
        switch (inVariantOperator.toLocaleUpperCase()) {
            case WiqlOperators.OperatorAnd:
                return new Predicate.PredicateAndOperator();
            case WiqlOperators.OperatorOr:
                return new Predicate.PredicateOrOperator();
        }

        return null;
    }

    private _getFieldOperator(inVariantOperator: string, field: string, value: any): Predicate.PredicateOperator {
        switch (inVariantOperator.toLocaleUpperCase()) {
            case WiqlOperators.OperatorEqualTo:
                return new Predicate.PredicateEqualsOperator(field, value);
            case WiqlOperators.OperatorNotEqualTo:
                return new Predicate.PredicateNotEqualsOperator(field, value);
            case WiqlOperators.OperatorLessThan:
                return new Predicate.PredicateLessThanOperator(field, value);
            case WiqlOperators.OperatorLessThanOrEqualTo:
                return new Predicate.PredicateLessThanOrEqualToOperator(field, value);
            case WiqlOperators.OperatorGreaterThan:
                return new Predicate.PredicateGreaterThanOperator(field, value);
            case WiqlOperators.OperatorGreaterThanOrEqualTo:
                return new Predicate.PredicateGreaterThanOrEqualToOperator(field, value);
            case WiqlOperators.OperatorContains:
                return new Predicate.PredicateContainsOperator(field, value);
            case WiqlOperators.OperatorNotContains:
                return new Predicate.PredicateNotContainsOperator(field, value);
            case WiqlOperators.OperatorUnder:
                return new Predicate.PredicateUnderOperator(field, value);
            case WiqlOperators.OperatorNotUnder:
                return new Predicate.PredicateNotUnderOperator(field, value);
        }

        return null;
    }

    private _operatorStack: Predicate.PredicateOperator[] = [];
    private _infix: Predicate.PredicateOperator[] = [];
    private _postFix: Predicate.PredicateOperator[] = [];
    private _clauses: Cards.IQueryClause[];
    private _groups: Cards.IQueryGroup[];
}

export class WiqlHelper {
    public static getWiql(query: Cards.IItemQuery): string {
        var wiql: string = "";
        var isQueryValid: boolean = WiqlHelper.isQueryValid(query);
        Diag.Debug.assert(isQueryValid, "WorkItem query should be formed correctly");

        if (!isQueryValid) {
            return wiql;
        }

        if (query && query.clauses) {
            var groups = query.groups;
            var parens = "";

            var length = query.clauses.length;
            for (var i = 0; i < length; i++) {

                if (wiql && query.clauses[i].logicalOperator) {
                    wiql = wiql + " " + query.clauses[i].logicalOperator + " ";
                }

                if (groups && groups.length) {
                    parens = "";
                    $.each(groups, (index, group) => {
                        if (group.start === (i + 1)) {
                            parens += "(";
                        }
                    });

                    if (parens) {
                        wiql = wiql + parens;
                    }
                }

                if (query.clauses[i].fieldName && query.clauses[i].operator) {

                    wiql = wiql + "[" + query.clauses[i].fieldName + "]";
                    wiql = wiql + " " + query.clauses[i].operator;


                    var clauseValue: string = query.clauses[i].value;
                    clauseValue = clauseValue.replace(/\'/g, "''");
                    clauseValue = $.trim(clauseValue);

                    // Macro values are not surrounded with single-quotes, in alignment with query behavior.
                    if (!Utils_String.startsWith(clauseValue, WiqlOperators.MacroStart)) {
                        clauseValue = " '" + clauseValue + "'";
                    }
                    wiql = wiql + clauseValue;
                }

                if (groups && groups.length) {
                    parens = "";
                    $.each(groups, (index, group) => {
                        if (group.end === (i + 1)) {
                            parens += ")";

                        }
                    });

                    if (parens) {
                        wiql = wiql + parens;
                    }
                }
            }
        }

        return wiql;
    }

    public static isQueryValid(query: Cards.IItemQuery): boolean {
        var parenStack: string[] = [];
        var isBalanced: boolean = true;

        if (query && query.clauses) {
            var groups = query.groups;
            for (var i = 0; i < query.clauses.length; i++) {
                if (groups && groups.length) {
                    $.each(groups, (index, group) => {
                        // If clauses[i] has an open parentheses
                        if (group.start === (i + 1)) {
                            parenStack.push("(");
                        }
                        // If clauses[i] has a close parentheses
                        if (group.end === (i + 1)) {
                            // If there is an ending parenthesis without a pair then return false. Eg: A) OR B
                            // Pop the top element from stack, if it is not a pair parentheses of character then there is a mismatch.
                            if (parenStack.length <= 0 || !(parenStack.pop() === "(")) {
                                isBalanced = false;
                                return;
                            }

                        }
                    });
                }
            }

            // If there is something left in expression then there is a starting parentheses without a closing parenthesis.Eg: (A OR B
            if (parenStack.length > 0 || (isBalanced as boolean) === false) {
                return false;
            }
        }

        return true;
    }


    /**
    * Removes all the clauses of a particular fieldname and return the field values present in clauses       
    * @param query The query from which the clauses need to be removed 
    * @param fieldName The reference name of the specified field.        
    * @returns The values for the field whose clauses are removed
    */
    public static removeFieldClauses(query: Cards.IItemQuery, fieldName: string): string[] {
        // Currently this method supports removing clauses for a field when 
        // 1. all the clauses to be removed to be towards the end of the Query and 
        // 2. in continuous indexes
        var isInputValid: boolean = true;
        var removedClauseValues: string[] = [];
        var fieldClauses = query.clauses.filter((clause: Cards.IQueryClause, index: number) => {
            return clause.fieldName === fieldName;
        });

        //if there are no clauses for the matching field
        if (fieldClauses.length === 0) {
            return removedClauseValues;
        }

        //index for last clause of the complete query should be equal to index for last clause of the fieldClauses
        Diag.Debug.assert(fieldClauses[fieldClauses.length - 1].index === query.clauses[query.clauses.length - 1].index, "Expected no more clauses after the clauses for provided field");

        //get the field values from each of the clauses
        $.each(fieldClauses, (index: number, clause: Cards.IQueryClause) => {
            // the fieldClauses should have contiguous indexes
            if (index && (!(fieldClauses[index].index - 1 === fieldClauses[index - 1].index))) {
                isInputValid = false;
                return false;
            }
            removedClauseValues.push(clause.value);
        });

        Diag.Debug.assert(isInputValid, "Expected the indexes to be continuous");

        //remove the clauses for the field from the query
        query.clauses = query.clauses.filter((clause: Cards.IQueryClause, index: number) => {
            return clause.fieldName !== fieldName;
        });

        //now find if there is any group which needs to be cleaned up for the clauses removed
        var startIndex = fieldClauses[0].index;
        var endIndex = fieldClauses[fieldClauses.length - 1].index;
        var matchingGroupIndex: number;
        $.each(query.groups, (index: number, group: Cards.IQueryGroup) => {
            if (group.end === endIndex && group.start === startIndex) {
                matchingGroupIndex = index;
                return false;
            }
        });
        //clean up the group if a matching group is found
        if (matchingGroupIndex) {
            query.groups.splice(matchingGroupIndex, 1);
        }

        return removedClauseValues;
    }

    /**
    * Adds clauses for a specified fieldName and values to given query       
    * @param query The query to which the clauses need to be added 
    * @param fieldName The reference name of the specified field.        
    * @param values The values of the specified field.       
    * @param operator The operator to be specified between the field and value.
    * @param logicalOperatorInGroup The logical operator to be specified between the clauses in a group
    * @param logicalOperatorBetweenGroups The logical operator to be specified between the groups of the query
    */
    public static addFieldClauses(query: Cards.IItemQuery, fieldName: string, values: string[], operator?: string, logicalOperatorInGroup?: string, logicalOperatorBetweenGroups?: string): void {
        logicalOperatorInGroup = logicalOperatorInGroup || WiqlOperators.OperatorOr;
        operator = operator || WiqlOperators.OperatorEqualTo;

        var fieldClauses = query.clauses.filter((clause: Cards.IQueryClause, index: number) => {
            return clause.fieldName === fieldName;
        });

        Diag.Debug.assert(fieldClauses.length === 0, "Expected no clauses for the provided field to be already present");
        var currentLastIndex = 0;
        if (query.clauses.length > 0) {
            currentLastIndex = query.clauses[query.clauses.length - 1].index;
        }
        $.each(values, (index: number, value: string) => {
            var currentClauselogicalOperator = logicalOperatorInGroup;
            if (index === 0 && currentLastIndex > 0) {
                currentClauselogicalOperator = logicalOperatorBetweenGroups || WiqlOperators.OperatorAnd;
            }
            else if (index === 0) {
                currentClauselogicalOperator = "";
            }
            query.clauses.push({ fieldName: fieldName, index: currentLastIndex + index + 1, logicalOperator: currentClauselogicalOperator, operator: operator, value: value });
        });

        query.groups.push({
            start: currentLastIndex + 1,
            end: currentLastIndex + values.length,
            level: 0
        });
    }
}



