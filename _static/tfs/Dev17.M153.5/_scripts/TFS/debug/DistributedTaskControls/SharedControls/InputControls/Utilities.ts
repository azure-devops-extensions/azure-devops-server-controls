/**
 * @brief Input Control utilities
 */

import { ICalloutContentProps } from "DistributedTaskControls/Components/CalloutComponent";
import * as Resources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";
import { IInfoProps } from "DistributedTaskControls/SharedControls/InputControls/Common";

import * as Utils_String from "VSS/Utils/String";

export class InputControlUtils {

    public static getId(controlType: string): string {
        let type: string = controlType.toUpperCase();

        if (!this._idMap[type]) {
            this._idMap[type] = 0;
        }

        return Utils_String.format("{0}{1}", type, this._idMap[type]++);
    }

    public static getCalloutInfoProps(markdownText: string): IInfoProps {
        return {
            calloutContentProps: InputControlUtils.getCalloutContentProps(markdownText)
        } as IInfoProps;
    }

    public static getCalloutContentProps(markdownText: string): ICalloutContentProps {
        return {
            calloutMarkdown: markdownText,
            calloutContentAriaLabel: Utils_String.localeFormat(Resources.InfoCalloutAriaLabel, markdownText)
        } as ICalloutContentProps;
    }

    private static _idMap: IDictionaryStringTo<number> = {};
}