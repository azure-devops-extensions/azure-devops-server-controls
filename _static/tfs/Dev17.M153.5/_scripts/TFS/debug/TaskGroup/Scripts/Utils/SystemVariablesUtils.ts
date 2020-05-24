import * as Q from "q";

import { getService } from "VSS/Service";
import { Contribution } from "VSS/Contributions/Contracts";
import { ExtensionService, WebPageDataService } from "VSS/Contributions/Services";
import { first as firstInArray } from "VSS/Utils/Array";
import { ignoreCaseComparer } from "VSS/Utils/String";

import { ContributionIds, SpecialCharacters } from "TaskGroup/Scripts/Common/Constants";

export function isSystemVariable(variableName: string): boolean {
    if (!variableList) {
        createVariableListFromContributions();
    }

    return variableList.some((variable) => {
        if (variable.endsWith(SpecialCharacters.Asterisk)) {
            if (variableName.toLowerCase().startsWith(variable.toLowerCase().substring(0, variable.length - 1))) {
                return true;
            }
        }
        else if (ignoreCaseComparer(variableName, variable) === 0) {
            return true;
        }

        return false;
    });
}

export function getSystemVariableContributions(): IPromise<any> {
    if (!contributedVariableDataProviders) {
        return getService(ExtensionService).getContributionsForTarget(
            ContributionIds.TaskGroupSystemVariablesTarget,
            "ms.vss-web.data-provider")
            .then((contributions: Contribution[]) => {
                contributedVariableDataProviders = contributions;
            });
    }
    else {
        return Q.resolve(true);
    }
}

function createVariableListFromContributions(): void {
    variableList = [];
    if (contributedVariableDataProviders) {
        contributedVariableDataProviders.forEach((contribution: Contribution) => {
            const variables = getService(WebPageDataService).getPageData<string[]>(contribution.id);
            if (!!variables && variables.length > 0) {
                variableList.push(...variables);
            }
        });
    }
}

let contributedVariableDataProviders: Contribution[];
let variableList: string[];