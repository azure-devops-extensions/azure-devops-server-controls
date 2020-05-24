/// <reference types="react" />
/// <reference types="react-dom" />
import * as React from "react";
import * as ReactDOM from "react-dom";

import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import * as InjectDependency from "VersionControl/Scenarios/Shared/InjectDependency";

import { ColoredButton } from "VersionControl/Scenarios/Shared/ColoredButton";
import { CustomerIntelligenceData } from "VersionControl/Scripts/CustomerIntelligenceData";
import * as CustomerIntelligenceConstants from "VersionControl/Scripts/CustomerIntelligenceConstants";
import "VSS/LoaderPlugins/Css!VersionControl/EmptyListExperience";

/**
 * Props type for the IEmptyPRListExperience component.
 */
export interface IEmptyPRListExperienceProps {
    customerIntelligenceData: CustomerIntelligenceData;
    newPullRequestURL: string
}

export function createIn(element: HTMLElement, props: IEmptyPRListExperienceProps): void {
    ReactDOM.render(
        React.createElement(EmptyPRListExperience, props),
        element);
}

interface IEmptyPRListExperiencePureProps extends IEmptyPRListExperienceProps {
    emptyImageUrl: string;
}

/**
 * A control that displays the UI experience in case no pull request is available.
 */
const EmptyPRListExperiencePure = (props: IEmptyPRListExperiencePureProps): JSX.Element => {
    const onLinkClick = () => {
        // Publish telemetry on learn more
        props.customerIntelligenceData.clone().publish(CustomerIntelligenceConstants.PULL_REQUEST_LEARN_MORE_CLICKED);
    };
    return (
        <div className="empty-pr-list-experience" >
                <div>
                    <img src={props.emptyImageUrl} className="empty-pr-list-base-image" alt=""/>
                    <div className="primary-message">
                        <span >{VCResources.PullRequest_EmptyListMessage_Primary} </span>
                        </div>
                    <div className="secondary-message">
                        <span >{VCResources.PullRequest_EmptyListMessage_Secondary} </span>
                    </div>
                    <div className="bowtie empty-pr-list-experience-description">
                        {
                            props.newPullRequestURL &&
                            <ColoredButton
                                buttonText={VCResources.PullRequest_CreatePullRequestButtonCaption}
                                buttonClass="btn-cta empty-pr-list-experience-create-new-button"
                                toolTip={VCResources.PullRequest_CreatePullRequestButtonToolTip}
                                onClick={() =>
                                    window.location.href = props.newPullRequestURL} />
                        }
                        <div className="info-link">
                        <a
                            href={VCResources.PullRequest_LearnMoreLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={onLinkClick}>
                            {VCResources.LearnMore}
                        </a>
                            </div>
                        </div>
                    </div>
            </div>
    );
}

const EmptyPRListExperience = InjectDependency.useTfsContext<IEmptyPRListExperienceProps>((tfsContext, props) =>
    <EmptyPRListExperiencePure
        emptyImageUrl={tfsContext.configuration.getResourcesFile('emptyPRList.svg')}
        {...props}
        />);
