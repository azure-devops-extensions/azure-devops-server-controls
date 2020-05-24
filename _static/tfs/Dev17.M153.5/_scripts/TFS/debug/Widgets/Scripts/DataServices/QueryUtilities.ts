import { CoreFieldRefNames, FieldType } from 'Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants';
import Diag = require('VSS/Diag');
import { WorkItemFieldDescriptor } from 'Widgets/Scripts/Burndown/BurndownDataContract';
import { FieldFilter, TimePeriodConfiguration, DateSampleMode, DateSamplingConfiguration } from 'Widgets/Scripts/Burndown/BurndownSettings';
import { WiqlOperators } from 'WorkItemTracking/Scripts/OM/WiqlOperators';
import VSS_Diag = require("VSS/Diag");

/*** Encapsulates OData query Generation utility methods which do not have a sensible home. */
export class QueryUtilities {

    private static tagsReferenceName = CoreFieldRefNames.Tags;
    /**
     * Helper to expand an array into a series of or statements.
     * Ex. isInArray("Id", ["1", "2", "3"], false) outputs "Id eq 1 or Id eq 2 or Id eq 3".
     * @param propertyName is the property of the entity to check if it is in the array of values.
     * @param useQuotes indicates whether each value should be wrapped in single quotes in the returned result. Defaults to false.
     * @param values are the values that the property should be compared against.
     * @returns a string of clauses linked by 'or'.
     */
    public static isInArray(propertyName: string, values: string[], useQuotes: boolean = false): string {
        const mapping = useQuotes
            ? val => `${propertyName} eq '${val}'`
            : val => `${propertyName} eq ${val}`;

        let clauses = values.map(mapping);
        return clauses.join(" or ");
    }

    public static getFiltersClause(filters: FieldFilter[], workItemFieldDescriptors: WorkItemFieldDescriptor[]): string {

        let nonTagFiltersClauses = filters
            .filter(f => f.fieldName !== QueryUtilities.tagsReferenceName)
            .map(filter => {
                var descriptors = workItemFieldDescriptors.filter(d => d.FieldReferenceName == filter.fieldName);
                if (descriptors.length > 0) {
                    const descriptor = descriptors[0];

                    // We don't support identities so filter them out
                    if (descriptor.FieldType == "Identity") {
                        return null;
                    }
                    const analyticsFilterName = descriptor.AnalyticsFilterName;
                    const chosenValue = descriptor.GetAnalyticsQueryValueFunc(filter);

                    if (!chosenValue || !chosenValue.trim()) {
                        return null;
                    }

                    const escapedChosenValue = QueryUtilities.escapeString(chosenValue);

                    if (descriptor.FieldType === FieldType[FieldType.TreePath] && filter.queryOperation === WiqlOperators.OperatorUnder) {
                        return `(${analyticsFilterName} eq '${escapedChosenValue}' or startswith(${analyticsFilterName},'${escapedChosenValue}\\'))`;
                    } else if (descriptor.FieldType === FieldType[FieldType.TreePath] && filter.queryOperation === WiqlOperators.OperatorNotUnder) {
                        return `((${analyticsFilterName} ne '${escapedChosenValue}' and not startswith(${analyticsFilterName},'${escapedChosenValue}\\')) or ${analyticsFilterName} eq null)`;
                    } else {
                        const quote = descriptor.UseQuotes ? "'" : ""; // Use or don't use quotes around value, based on descriptor
                        const operator = QueryUtilities.operatorToODataOperator(filter.queryOperation);

                        let clause = `${analyticsFilterName} ${operator} ${quote}${escapedChosenValue}${quote}`;

                        // If the "ne" operator is chosen, we need to explicitly add an "or equals null" clause because otherwise
                        // items with the field set to null will be filtered out. This is undesireable for a not-equals operation.
                        return (operator === "ne")
                            ? `(${clause} or ${analyticsFilterName} eq null)`
                            : clause;
                    }
                }
                else {
                    Diag.logWarning("Query did not recognize field: " + filter.fieldName);
                    return null; // If we don't support this field, filter it out
                }
            })
            .filter(f => !!f) // Filter out the filters that are not defined by our supported types
            .join(" and ");

        const tagFiltersClauses = QueryUtilities.getTagsClause(filters);

        if (nonTagFiltersClauses && tagFiltersClauses) {
            return [nonTagFiltersClauses, tagFiltersClauses].join(" and ");
        } else if (nonTagFiltersClauses) {
            return nonTagFiltersClauses;
        } else if (tagFiltersClauses) {
            return tagFiltersClauses;
        } else {
            return "";
        }
    }

    public static getTimePeriodClause(timePeriod: TimePeriodConfiguration): string {
        let timePeriodClause = `CompletedDate ge ` + timePeriod.startDate + `T00:00:00.000Z`;
        switch (timePeriod.samplingConfiguration.identifier) {
            case DateSampleMode.ByDateInterval: {
                timePeriodClause += ` and CompletedDate le ` + (<DateSamplingConfiguration>timePeriod.samplingConfiguration.settings).endDate + `T23:59:59.999Z`;
                break;
            }
            case DateSampleMode.ByIterations: {
                timePeriodClause += ` and ` + QueryUtilities.isInArray("IterationSK", (<string[]>timePeriod.samplingConfiguration.settings), false /* useQuotes */);
                break;
            }
            default: {
                VSS_Diag.logError("Could not identify DateSampleMode type: QueryUtilities.ts");
                break;
            }
        }
        return timePeriodClause;
    }

    /** Constructs query fragments, such as $filter, $aggregate etc. from constituent clauses. */
    public static getQueryFragmentFromClauses(fragmentType: string, clauses: string[], separator: string) {
        let queryFragment: string = `${fragmentType}(`;

        clauses.map((clause, index) => {
            queryFragment += clause;

            if (index < (clauses.length - 1)) {
                queryFragment += ` ${separator} `;
            }
        });

        queryFragment += `)`;

        return queryFragment;
    }

    private static getTagsClause(filters: FieldFilter[]): string {
        let eqFilters = [];
        let neFilters = [];
        for (let f of filters){
            if (f.fieldName === QueryUtilities.tagsReferenceName){
                if (QueryUtilities.tagOperatorToODataClause(f.queryOperation) === "eq"){
                    eqFilters.push(`Tags/any(t:t/TagName eq '${QueryUtilities.escapeString(f.queryValue)}')`);
                }
                else {
                    neFilters.push(`t/TagName ne '${QueryUtilities.escapeString(f.queryValue)}'`);
                }
            }
        }

        let result = eqFilters.join(" and ");

        if (neFilters.length > 0){

            if (result != "") {
                result += " and ";
            }

            result += `Tags/all(t:${neFilters.join(" and ")})`
        }

        return result;
    }

    private static tagOperatorToODataClause(tagOperator: string): string {
        switch (tagOperator.toLowerCase().trim()) {
            case "Contains".toLowerCase(): return "eq";
            case "Does not contain".toLowerCase(): return "ne"; //This format is used with our initial field picker
            case "Not contains".toLowerCase(): return "ne"; //TODO: Rationalize format representations This is the format coming from rich Field picker
        }
    }

    private static operatorToODataOperator(filterOperator: string): string {
        switch (filterOperator.trim()) {
            case ">": return "gt";
            case ">=": return "ge";
            case "<": return "lt";
            case "<=": return "le";
            case "=": return "eq";
            case "<>": return "ne";
        }
    }

    public static escapeString(value: string): string {
        return value.split("'").join("''"); // Replace all
    }
}
