import * as Common from "DistributedTaskControls/Common/Common";

import { BuildOption, BuildOptionInputType } from "TFS/Build/Contracts";

import * as Diag from "VSS/Diag";
import * as Utils_String from "VSS/Utils/String";

export class OptionsUtilities {

    public static createBuildOptionCopy(buildOption: BuildOption): BuildOption {
        let inputs: IDictionaryStringTo<string> = {};

        if (buildOption === null) {
            return null;
        }

        for (let key in buildOption.inputs) {
            inputs[key] = buildOption.inputs[key];
        }

        return {
            enabled: buildOption.enabled,
            inputs: inputs,
            definition: {
                id: buildOption.definition.id
            }
        } as BuildOption;
    }

    public static convertBuildOptionInputTypeToString(inputType: BuildOptionInputType): string {
        let convertedType = Utils_String.empty;
        switch (inputType) {
            case BuildOptionInputType.Boolean:
                convertedType = Common.INPUT_TYPE_BOOLEAN;
                break;
            case BuildOptionInputType.Radio:
                convertedType = Common.INPUT_TYPE_RADIO;
                break;
            case BuildOptionInputType.PickList:
                convertedType = Common.INPUT_TYPE_PICK_LIST;
                break;
            case BuildOptionInputType.StringList:
                convertedType = Common.INPUT_TYPE_STRING_LIST;
                break;
            case BuildOptionInputType.MultiLine:
                convertedType = Common.INPUT_TYPE_MULTI_LINE;
                break;
            case BuildOptionInputType.String:
                convertedType = Common.INPUT_TYPE_STRING;
                break;
            case BuildOptionInputType.BranchFilter:
                convertedType = Common.INPUT_TYPE_BRANCHFILTER;
                break;
            default:
                Diag.Debug.assert(false, "Invalid BuildOptionInputType");
                break;
        }

        return convertedType;
    }
}

