import * as React from "react";

import { Component, Props, State } from "VSS/Flux/Component";

import * as Actions from "Package/Scripts/Actions/Actions";
import * as UrlHelper from "Package/Scripts/Helpers/UrlHelper";
import * as PackageResources from "Feed/Common/Resources";

import "VSS/LoaderPlugins/Css!Package:Package/Scripts/Components/WelcomePanel";

export class WelcomePanel extends Component<Props, State> {
    public render(): JSX.Element {
        const imagePath = UrlHelper.getVersionedContentUrl("zerodata-add-a-feed.svg");

        return (
            <div className="welcome-panel">
                <img className="welcome-panel-image" src={imagePath} alt={""} />
                <div className="welcome-panel-text">{PackageResources.WelcomePanel_Message}</div>
                <div className="feed-actions-area bowtie">
                    <button
                        className="new-feed-button cta"
                        onClick={this._openFeedDialog}
                        aria-label={PackageResources.AriaLabel_NewFeedButton}
                    >
                        <span className="bowtie-icon bowtie-math-plus-heavy" />
                        <span className="new-feed-text">{PackageResources.NewFeedCommand}</span>
                    </button>
                </div>
            </div>
        );
    }

    private _openFeedDialog(): void {
        Actions.CreateFeedNavigateClicked.invoke({});
    }
}
