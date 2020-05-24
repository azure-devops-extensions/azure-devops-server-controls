import { Link } from "OfficeFabric/Link";
import * as React from "react";

import { FormatComponent } from "VSSPreview/Flux/Components/Format";

import { WikiErrorConstants } from "Wiki/Scripts/CommonConstants";
import * as WikiResources from "Wiki/Scripts/Resources/TFS.Resources.Wiki";
import "VSS/LoaderPlugins/Css!Wiki/Scenarios/Shared/Components/Errors";

export function getNonConformanceError(errorMessage: string): JSX.Element {
    return (
        <div className={"non-conformance-error"}>
            <div className={"message"}>
                {errorMessage}
                <Link
                    className={"learn-more-link"}
                    href={WikiResources.NonConformanceError_LearnMoreLink}
                    target={"_blank"}
                    rel={"noopener noreferrer"}>
                    {WikiResources.LearnMoreLabel}
                </Link>
                <span>{WikiResources.NonConformanceError_ToFixThis}</span>
            </div>
        </div>
    );
}

export function getRequestNoLongerValidError(): Error {
    const error = new Error();
    error.name = WikiErrorConstants.RequestNoLongerValid;

    return error;
}

export function getLearnMoreLink(href: string, key: string): JSX.Element {
    return <Link
        key={key}
        target={"_blank"}
        rel={"noopener noreferrer"}
        href={href}>
        {WikiResources.LearnMoreLabel}
    </Link>;
}

export function getFormattedErrorMessage(errorMessageFormat: string, params: (string | JSX.Element)[]): JSX.Element {
    return <FormatComponent
        format={errorMessageFormat}>
        {params}
    </FormatComponent>;
}
