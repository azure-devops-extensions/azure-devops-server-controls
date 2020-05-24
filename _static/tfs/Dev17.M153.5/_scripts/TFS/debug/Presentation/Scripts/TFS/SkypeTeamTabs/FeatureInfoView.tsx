import * as React from "react";

/**
 * A props interface for supplying the necessary components for the image, learn more link,
 * and description that goes above each feature's config.
 */
export interface IFeatureInfoViewProps {
    /**
     * A description of the feature.
     */
    description: string;

    /**
     * A Url linking documentation for the feature.
     * This is not a link to the teams extension documentation.
     */
    learnMoreUrl: string;

    /**
     * The text that the link will display as.
     */
    learnMoreText: string;
}

/**
 * Class for displaying the text description and the image that goes above the configuration
 * controls for each feature.
 */
export class FeatureInfoView extends React.Component<IFeatureInfoViewProps> {
    render(): JSX.Element {
        let link = <a className="feature-info-link" href={this.props.learnMoreUrl} target="_blank">
            { this.props.learnMoreText }
        </a>
        return <div className="feature-info-view">
            <p className="feature-info-description">
                { this.props.description } { link }
            </p>
        </div>
    }
}