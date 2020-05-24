// This class manages the kubernetes parameters format

import { NameValuePair } from "../Common/NameValuePair";
import * as Resources from "DistributedTask/Scripts/Resources/TFS.Resources.DistributedTask";
import * as Utils_String from "VSS/Utils/String";

export class KubernetesParameters {

    // Serializes the parameter array to string given the format. The format must have key first and then the value.
    public static serializeWithFormat(argumentFormat: string, parameters: NameValuePair[]): string {
        var result = "";
        if (parameters && argumentFormat) {
            for (var i = 0; i < parameters.length; i++) {
                if (parameters[i].name && parameters[i].value) {
                    result += Utils_String.format(argumentFormat, parameters[i].name, parameters[i].value);
                    result += " ";
                }
            }
        }

        return result.trim();
    }

    public static getParameters(taskInput: string): NameValuePair[] {
        var parameters: NameValuePair[] = [];
        var index = 0;
        taskInput = taskInput.trim();

        while (index < taskInput.length) {
            var literalData = this.findLiteral(taskInput, index);
            var nextIndex = literalData.currentPosition;
            var hasSpecialCharacter = literalData.hasSpecialCharacter;
            var taskInputParameter = taskInput.substr(index, nextIndex - index).trim();
            const kubernetesSecretsFromLiteralPrefix: string = "--from-literal=";
            if (Utils_String.startsWith(taskInputParameter, kubernetesSecretsFromLiteralPrefix)) {
                taskInputParameter = taskInputParameter.substring(kubernetesSecretsFromLiteralPrefix.length);
                var keyValuePair = Utils_String.singleSplit(taskInputParameter, "=");

                parameters.push({
                    name: keyValuePair.part1,
                    value: keyValuePair.part2
                });
            }

            index = nextIndex + 1;
        }

        return parameters;
    }

    private static findLiteral(input, currentPosition) {
        var hasSpecialCharacter = false;
        for (; currentPosition < input.length; currentPosition++) {
            if (input[currentPosition] == " " || input[currentPosition] == "\t") {
                for (; currentPosition < input.length; currentPosition++) {
                    if (input[currentPosition + 1] != " " && input[currentPosition + 1] != "\t") {
                        break;
                    }
                }

                break;
            }
            else if (input[currentPosition] == "\"") {
                //keep going till this one closes
                currentPosition = this.findClosingQuoteIndex(input, currentPosition + 1, "\"");
                hasSpecialCharacter = true;
            }
            else if (input[currentPosition] == "'") {
                //keep going till this one closes
                currentPosition = this.findClosingQuoteIndex(input, currentPosition + 1, "'");
                hasSpecialCharacter = true;
            }
        }

        return { currentPosition: currentPosition, hasSpecialCharacter: hasSpecialCharacter };
    }

    private static findClosingBracketIndex(input, currentPosition, closingBracket): number {
        for (; currentPosition < input.length; currentPosition++) {
            if (input[currentPosition] == "\"") {
                currentPosition = this.findClosingQuoteIndex(input, currentPosition + 1, "\"");
            }
            else if (input[currentPosition] == "'") {
                currentPosition = this.findClosingQuoteIndex(input, currentPosition + 1, "'");
            }
        }

        return currentPosition;
    }

    private static findClosingQuoteIndex(input, currentPosition, closingQuote) {
        for (; currentPosition < input.length; currentPosition++) {
            if (input[currentPosition] == closingQuote) {
                break;
            }
        }

        return currentPosition;
    }
}
