import * as React from "react";
import * as StringUtils from "VSS/Utils/String";

import { TooltipHost, ITooltipHostProps } from "VSSUI/Tooltip";

export class Utils {
    public static formatMessageForDisabled = (message: string, isDisabled: boolean) => {
        return isDisabled ? StringUtils.localeFormat(message) : StringUtils.empty;
    }

    public static wrapElementWithToolTipHost = (el: JSX.Element, message: string, isDisabled: boolean) => {
        return Utils._wrapElementWithToolTipHost(el, null, message, isDisabled);
    }

    private static _wrapElementWithToolTipHost = (el: JSX.Element, props: ITooltipHostProps, message: string, isDisabled: boolean) => {
        const toolTipProps: ITooltipHostProps = props || {};
        if (isDisabled){
            toolTipProps.content = Utils.formatMessageForDisabled(message, isDisabled);
            if (!toolTipProps.calloutProps){
                toolTipProps.calloutProps = { gapSpace: 0 };
            }
            return (<TooltipHost {...toolTipProps}>
                    {el}
                </TooltipHost>);
        }
        return el;
    }
}
