import "VSS/LoaderPlugins/Css!Agile/Scripts/Common/Components/AgileHubError";

import { ExceptionInfo } from "Agile/Scripts/Models/ExceptionInfo";
import * as AgileControlsResources from "Agile/Scripts/Resources/TFS.Resources.AgileControls";
import { Link } from "OfficeFabric/Link";
import * as React from "react";
import { urlHelper } from "VSS/Locations";
import { ZeroData } from "VSSUI/ZeroData";
import { WorkIllustrationUrlUtils, WorkZeroDataIllustrationPaths } from "Presentation/Scripts/TFS/TFS.IllustrationUrlUtils";

export interface IHubErrorProps {
    exceptionsInfo: ExceptionInfo[];
}

export class HubError extends React.Component<IHubErrorProps, {}> {
    constructor(props: IHubErrorProps) {
        super(props);
    }

    public render(): JSX.Element {
        const exceptionsInfoElement: JSX.Element = (
            <div>
                {
                    this.props.exceptionsInfo.map((exceptionInfo, index) =>
                        (
                            <div key={index}>
                                {this._getErrorsList(exceptionInfo)}
                                {this._getErrorLinks(exceptionInfo)}
                            </div>
                        ))
                }
            </div>
        );

        const isSettingsException = this.props.exceptionsInfo.some(e => e.isSettingsException);

        const imagePath = isSettingsException ?
            WorkIllustrationUrlUtils.getIllustrationImageUrl(WorkZeroDataIllustrationPaths.ConfigurationRequired) :
            urlHelper.getVersionedContentUrl("MyExperiences/general-robot-error.png");

        const errorText = isSettingsException ? AgileControlsResources.AgileHub_ConfigurationRequiredTitle : AgileControlsResources.AgileHub_ErrorTitle;

        return (
            <div className="agile-hub-error" >
                <ZeroData
                    imagePath={imagePath}
                    imageAltText={errorText}
                    primaryText={errorText}
                    secondaryText={exceptionsInfoElement}
                />
            </div>
        );
    }

    private _getErrorsList(exceptionInfo: ExceptionInfo): JSX.Element {
        const hasErrorsList: boolean = exceptionInfo.additionalMessages && (exceptionInfo.additionalMessages.length > 0);
        return (
            <div>
                <div>
                    {exceptionInfo.exceptionMessage}
                </div>
                {
                    hasErrorsList && (
                        <ul>
                            {exceptionInfo.additionalMessages.map((e, i) => <li key={`Error${i}`}>{e}</li>)}
                        </ul>
                    )
                }
            </div>
        );
    }

    private _getErrorLinks(exceptionInfo: ExceptionInfo): JSX.Element {
        let primaryLink: JSX.Element;
        if (exceptionInfo.primaryLinkHref && exceptionInfo.primaryLinkText) {
            primaryLink = (
                <p>
                    <Link href={exceptionInfo.primaryLinkHref}>{exceptionInfo.primaryLinkText}</Link>
                </p>
            );
        }

        let secondaryLink: JSX.Element;
        if (exceptionInfo.secondaryLinkHref && exceptionInfo.secondaryLinkText) {
            secondaryLink = (
                <p>
                    <Link href={exceptionInfo.secondaryLinkHref}>{exceptionInfo.secondaryLinkText}</Link>
                </p>
            );
        }

        return (
            <div>
                {primaryLink}
                {secondaryLink}
            </div>
        );
    }
}