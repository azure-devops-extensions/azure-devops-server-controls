import * as React from "react";

import * as Base from "DistributedTaskControls/Common/Components/Base";
import { FriendlyDateRenderer } from "DistributedTaskControls/Components/FriendlyDateRenderer";
import { TooltipIfOverflow } from "DistributedTaskControls/Components/TooltipIfOverflow";

import { HtmlNormalizer } from "VSS/Utils/Html";
import { IHTMLStringDetails } from "DistributedTaskControls/Common/FriendlyDate";


export interface IEnvironmentNodeSubStatusTextProps extends Base.IProps {
    text: string | JSX.Element | IHTMLStringDetails;
    className: string;
}

export class EnvironmentNodeSubStatusText extends Base.Component<IEnvironmentNodeSubStatusTextProps, Base.IStateless> {

    public render(): JSX.Element {
        let text: string | JSX.Element | IHTMLStringDetails = this.props.text;
        let subStatusElement: JSX.Element;

        if (typeof this.props.text === "string") {
            let textAsString: string = text as string;
            const sanitizedReason = text ? HtmlNormalizer.sanitize(textAsString) : text;
            const plainText = HtmlNormalizer.convertToPlainText(textAsString);
            subStatusElement = (
                // Need to use dangerouslySetInnerHTML since we need to style the substring.
                // However, only sanitized html is used for this purpose.
                /* tslint:disable */
                <TooltipIfOverflow tooltip={plainText} targetElementClassName={this.props.className} cssClass={this.props.className + "-tooltip"}>
                    <div dangerouslySetInnerHTML={{ __html: textAsString }} className={this.props.className}>
                    </div>
                </TooltipIfOverflow>
                /* tslint:enable */
            );
        }
        else if (typeof text === "object" && text.hasOwnProperty("html")) {
            const textAsDate: IHTMLStringDetails = text as IHTMLStringDetails;
            subStatusElement = (
                <FriendlyDateRenderer dateObj={textAsDate} cssClass={this.props.className}/>
            );
        }
        else {
            subStatusElement = (
                <div className={this.props.className}>
                    {text}
                </div>
            );
        }

        return subStatusElement;
    }

}