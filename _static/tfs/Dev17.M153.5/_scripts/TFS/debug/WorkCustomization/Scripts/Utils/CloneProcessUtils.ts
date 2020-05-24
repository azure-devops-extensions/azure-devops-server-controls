import { IProcess } from "WorkCustomization/Scripts/Contracts/Process";
import Resources = require("WorkCustomization/Scripts/Resources/TFS.Resources.WorkCustomization");
import StringUtils = require("VSS/Utils/String");
import { ProcessDialogs } from "WorkCustomization/Scripts/Constants";

export namespace CloneProcessUtils {
    export function  _generateProcessName(name: string, processes: IProcess[], stringTemplate: string): string {
        let procNo: number = 1
        let baseName = StringUtils.format(stringTemplate, name);
        let shortName = name;

        // Shortens name if it is greater than limit. Uses shortName to store original shortened name without truncated the " - Copy"
        if (baseName.length > ProcessDialogs.MaxProcessNameLength) {
            shortName = name.substring(0, name.length - (baseName.length - ProcessDialogs.MaxProcessNameLength));
            baseName = StringUtils.format(stringTemplate, name.substring(0, name.length - (baseName.length - ProcessDialogs.MaxProcessNameLength)));
        }
        let clonedProcName = baseName;

        while (processes.filter(proc => StringUtils.equals(proc.name, clonedProcName, true)).length > 0) {
            clonedProcName = StringUtils.format(Resources.NewProcessNameTemplate, baseName, ++procNo);

            // Truncates original name if clonedProcName grows too large
            if (clonedProcName.length > ProcessDialogs.MaxProcessNameLength) {
                shortName = shortName.substring(0, shortName.length - (clonedProcName.length - ProcessDialogs.MaxProcessNameLength));
                baseName = StringUtils.format(stringTemplate, shortName);
                clonedProcName = StringUtils.format(Resources.NewProcessNameTemplate, baseName, procNo);
            }
        }
        return clonedProcName;
    }

    export function _findProcessNameById(templateTypeId: string, processes: IProcess[]): string {
        let processMatches: IProcess[] = processes.filter(proc => StringUtils.equals(proc.templateTypeId, templateTypeId));
        if (processMatches.length > 0) {
            return processMatches[0].name;
        } else {
            return null;
        }
    }
}