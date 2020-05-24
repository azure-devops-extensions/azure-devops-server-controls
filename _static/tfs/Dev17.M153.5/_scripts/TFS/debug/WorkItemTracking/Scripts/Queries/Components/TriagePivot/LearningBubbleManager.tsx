import * as React from "react";
import * as ReactDOM from "react-dom";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import * as Resources from "WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking";
import * as PresentationResources from "Presentation/Scripts/TFS/Resources/TFS.Resources.Presentation";
import { LearningBubble } from "Presentation/Scripts/TFS/Components/LearningBubble/LearningBubble";
import { LearningBubbleSettingsKeys } from "Presentation/Scripts/TFS/Components/LearningBubble/Constants";

export class LearningBubbleManager {
    private _queryLearningBubbleShown: boolean;
    private _container: Element;

    public showQueryLearningBubble = (): void => {
        if (!this._queryLearningBubbleShown && !TfsContext.getDefault().isHosted) {
            const target = ".triage-view-hub-container .internal-breadcrumb--listItem:nth-last-child(2) .vss-Breadcrumb--divider-container";

            this._dispose();
            this._container = document.createElement("div");

            ReactDOM.render(
                <LearningBubble
                    text={Resources.QueryResultsLearningBubbleText}
                    buttonLabel={PresentationResources.LearningBubbleButtonLabel}
                    settingsKey={LearningBubbleSettingsKeys.QueryResults}
                    target={target}
                    onCalloutDismiss={this._dispose}
                    ref={this._learningBubbleRef}
                />,
                this._container
            );
        }
    }

    public componentWillUnmount = (): void => {
        this._dispose();
    }

    private _learningBubbleRef = (learningBubble: LearningBubble) => {
        if (learningBubble) { // ref is called on unmount, passing in null. This checks for that.
            this._queryLearningBubbleShown = true;
            learningBubble.showIfNeededAfterDelay();
        }
    }

    private _dispose = () => {
        if (this._container) {
            ReactDOM.unmountComponentAtNode(this._container);
            delete this._container;
        }
    }
}
