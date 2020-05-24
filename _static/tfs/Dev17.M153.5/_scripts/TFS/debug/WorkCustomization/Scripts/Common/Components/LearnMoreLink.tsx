/// <reference types="react" />

import "VSS/LoaderPlugins/Css!WorkCustomization/Common/Components/LearnMoreLink";

import * as React from "react";
import { Link } from "OfficeFabric/Link";
import { css } from "OfficeFabric/Utilities";
import Resources = require("WorkCustomization/Scripts/Resources/TFS.Resources.WorkCustomization");

export interface ILearnMoreLinkProps {
    href: string;
    linkText?: string;
    className?: string;
    ariaLabel?: string;
}

export var DialogLearnMoreLink: React.StatelessComponent<ILearnMoreLinkProps> = (props: ILearnMoreLinkProps): JSX.Element => {
    return (
        <div className={css("bowtie", props.className)}>
            <Link className="dialog-learn-more-link" href={props.href} target="_blank" rel="external" aria-label={props.ariaLabel}> 
                {props.linkText || Resources.LearnMore}
            </Link>
        </div>
    );
}

export var PageLearnMoreLink: React.StatelessComponent<ILearnMoreLinkProps> = (props: ILearnMoreLinkProps): JSX.Element => {
    return (
        <Link className={css("page-learn-more-link", props.className)} href={props.href} target="_blank" rel="external" aria-label={props.ariaLabel}>
            <span className="bowtie bowtie-icon bowtie-status-help-outline" />
            <span>{props.linkText || Resources.HelpText}</span>
        </Link>
    );
}
