import { TestOutcome } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Common/Types";
import * as Resources from "TestManagement/Scripts/Resources/TFS.Resources.TestManagement";
import * as Utils_String from "VSS/Utils/String";

/**
 * Converts TestOutcome data into UI-appropriate representations
 */
export class TestOutcomeUtility {

    public static readonly defaultColor = "#0078d4";

    private static colors: {[testOutcome: number] : string} = {
        [TestOutcome.Passed]: "#107c10",
        [TestOutcome.Failed]: "#da0a00",
    };

    private static testOutcomePropertyStrings: {[key: number]: string} = {
        [TestOutcome.Failed]: "Failed",
        [TestOutcome.Passed]: "Passed",
        [TestOutcome.Inconclusive]: "Inconclusive",
        [TestOutcome.Aborted]: "Aborted",
        [TestOutcome.NotExecuted]: "NotExecuted",
        [TestOutcome.Error]: "Error",
        [TestOutcome.NotImpacted]: "NotImpacted"
    }

    /**
     * @returns a color that is representative of a test outcome
     */
    static getColor(testOutcome: TestOutcome): string;

    /**
     * @returns a color that is representative of a set of test outcomes
     */
    static getColor(testOutcomes: TestOutcome[]): string;

    static getColor(testOutcomesOrTestOutcome: TestOutcome[] | TestOutcome): string {
        if (typeof testOutcomesOrTestOutcome == "number") {
            let color = this.colors[testOutcomesOrTestOutcome];
            if (color !== undefined) {
                return color;
            }
        } else if (testOutcomesOrTestOutcome.length == 1) {
            return this.getColor(testOutcomesOrTestOutcome[0]);
        }
        return TestOutcomeUtility.defaultColor;
    }

    static getPropertyString(testOutcome: TestOutcome) {
        const propertyString = this.testOutcomePropertyStrings[testOutcome];
        if(!propertyString) {
            throw new Error(`Unexpected test outcome: ${testOutcome}`);
        }
        return propertyString;
    }

    /**
     * @returns a name that is representative of a set of test outcomes
     */
    static getName(testOutcomes: TestOutcome[]) {
        if (testOutcomes.length == 1) {
            return TestOutcomeUtility.getTestOutcomeName(testOutcomes[0]);
        }
        return Resources.TestResults;
    }

    private static getTestOutcomeName(testOutcome: TestOutcome) {
        let testOutcomeAsString = TestOutcome[testOutcome];
        let propertyName = `TestOutcome_${testOutcomeAsString}`;
        let value = Utils_String.format(Resources.TestResultsOutcomeChartLabel, Resources[propertyName]);
        return value || Resources.OthersText;
    }
}