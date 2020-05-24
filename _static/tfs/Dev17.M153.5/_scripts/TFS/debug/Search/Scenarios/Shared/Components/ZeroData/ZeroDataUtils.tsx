import * as React from "react";
import { FormatComponent } from "VSSPreview/Flux/Components/Format";
import * as Resources from "Search/Scripts/Resources/TFS.Resources.Search.Scenarios";

export function getZeroResultsHelpComponent(
    isHosted: boolean,
    helpText: string,
    learnMoreFormat: string,
    learnMoreLink: string,
    feedbackMailLink: string,
    onFeedbackMailLinkClick: () => void
): JSX.Element {
    return (
        <div>
            <div>{helpText}</div>
            <div className="learn-more">
                <FormatComponent format={learnMoreFormat}>
                    {
                        <a className="help-link-message" target="_blank" href={learnMoreLink}>
                            {Resources.LearnMoreLabel}
                        </a>
                    }
                </FormatComponent>
            </div>
            <div>
                {
                    isHosted
                        ? <FormatComponent format={Resources.ZeroResultsContactUsFormat}>
                            {
                                <a href={feedbackMailLink} onClick={onFeedbackMailLinkClick}>{Resources.LetUsKnowLabel}</a>
                            }
                        </FormatComponent>
                        : Resources.ZeroResultsContactUsFormat.replace("{0}", Resources.ContactAdmin)
                }
            </div>
        </div>
    );
}

export function getServiceErrorHelp(isHosted: boolean, feedbackMailLink: string): JSX.Element | string {
    const helpText: string = Resources.ServiceErrorHelpText;
    const letUsKnowLabel: string = Resources.LetUsKnowLabel;

    const help: string | JSX.Element = isHosted
        ? <FormatComponent format={helpText}>
            {
                <a href={feedbackMailLink}>{letUsKnowLabel}</a>
            }
        </FormatComponent>
        : helpText.replace("{0}", Resources.ContactAdmin);

    return help;
}

export function getIndexingHelp(isHosted: boolean, feedbackMailLink: string): JSX.Element | string {
    const help: string | JSX.Element = isHosted
        ? <FormatComponent format={Resources.AccountIndexingHelpFormat}>
            {
                <a href={feedbackMailLink}>{Resources.ContactUsLabel}</a>
            }
        </FormatComponent>
        : Resources.AccountIndexingHelpFormat.replace("{0}", Resources.ContactAdmin);

    return help;
}

export function getAccessPermissionHelp(helpLink?: string): JSX.Element {
    return (
        <FormatComponent format={Resources.ZeroResultsNoPermissionHelpFormat}>
            {
                !!helpLink
                    ? <a target="_blank" href={helpLink}>
                        {Resources.CheckAccessPermissionLabel}
                    </a>
                    : Resources.CheckAccessPermissionLabel
            }
        </FormatComponent>);
}

export function getQueryNotSupportedHelp(queryText: string, formatText:string): JSX.Element {
    return (
        <FormatComponent format={formatText}>
            {
                <span className="searchText">
                    {queryText}
                </span>
            }
        </FormatComponent>);
}