/// <reference types="react" />
import "VSS/LoaderPlugins/Css!TestManagement/Scripts/Scenarios/Analytics/InContextReports/Components/AnalyticsUnavailableMessage";

import { PrimaryButton } from "OfficeFabric/Button";
import { Image } from "OfficeFabric/Image";
import { css } from "OfficeFabric/Utilities";
import * as TFS_Host_TfsContext from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import * as React from "react";
import * as CommonTypes from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Common/Types";
import * as ComponentBase from "VSS/Flux/Component";
import * as Utils_Html from "VSS/Utils/Html";
import { Link } from "OfficeFabric/Link";
import * as Utils_String from "VSS/Utils/String";


export interface IAnalyticsUnavailableMessageProps extends CommonTypes.IReportComponentProps {
    imageName?: string;
    message?: string;
    suggestion?: string;
    linkText?: string;
    linkUrl?: string;
    ariaDescription?: string;
}

export class AnalyticsUnavailableMessage extends ComponentBase.Component<IAnalyticsUnavailableMessageProps, ComponentBase.State> {

    public render(): JSX.Element {
        let TfsContext = TFS_Host_TfsContext.TfsContext.getDefault();
        let resourceFileName = TfsContext.configuration.getResourcesFile(this.props.imageName);
        
        return (
            /* tslint:disable:react-no-dangerous-html */
            <div className={css("ax-message-div", this.props.cssClass || Utils_String.empty)}>
                {this.props.imageName && <Image className={"ax-message-image"} src={resourceFileName} alt={Utils_String.empty} />}
                {this.props.message && <span className={"ax-message-message"}>{this.props.message}</span>}
                {this.props.suggestion && <span className={"ax-message-suggestion"} dangerouslySetInnerHTML={{ __html: Utils_Html.HtmlNormalizer.normalize(this.props.suggestion) }}></span>}
                {this.props.linkText && <Link className="ax-message-link" href={this.props.linkUrl} aria-label={this.props.ariaDescription} >
                            {this.props.linkText}
                </Link>}
            </div>
            /* tslint:enable:react-no-dangerous-html */
        );
    }
}