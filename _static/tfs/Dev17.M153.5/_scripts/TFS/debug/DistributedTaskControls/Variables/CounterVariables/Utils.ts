import { ICounterVariableItem } from "./Store/CounterVariableDataStore";
import { ICounterVariable } from "./Types";

import * as Resources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";
import * as Utils_String from "VSS/Utils/String";

export interface ICounterVariableValidation {
    hasError: boolean;
    message: string;
}

export class CounterVariablesUtils {
    public static validateName(variable: ICounterVariableItem, variableNameCounts: IDictionaryStringTo<number>): ICounterVariableValidation {
        if (variable.hasVariableBeenUpdatedByUser) {
            if (variable.name === Utils_String.empty) {
                return {
                    message: Resources.VariableNameRequiredMessage,
                    hasError: true
                };
            } else if (variableNameCounts[variable.name] > 1) {
                return {
                    message: Resources.VariableNameDuplicateMessageNoScope,
                    hasError: true
                };
            }
        }

        return { hasError: false, message: Utils_String.empty };
    }

    public static validateSeed(variable: ICounterVariable): ICounterVariableValidation {
        const parsed = parseInt(variable.seed);

        if (variable.seed.indexOf(".") !== -1 || isNaN(parsed) || parsed < 0) {
            return {
                message: Resources.CounterVariableValidSeedRange,
                hasError: true
            };
        }

        return { hasError: false, message: Utils_String.empty };
    }
}
