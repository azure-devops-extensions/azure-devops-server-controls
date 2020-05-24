import * as React from "react";
import { Callout } from "OfficeFabric/Callout";
import { PrimaryButton } from "OfficeFabric/Button";
import { IPoint } from "OfficeFabric/Utilities";
import { shouldShowLearningBubble, registerUserShownLearningBubble } from "Presentation/Scripts/TFS/Components/LearningBubble/Utils";

import "VSS/LoaderPlugins/Css!Presentation/Scripts/TFS/Components/LearningBubble/LearningBubble";
import { DefaultDelayedShowDelay } from "Presentation/Scripts/TFS/Components/LearningBubble/Constants";

interface ILearningBubbleProps {
    settingsKey: string;
    target: Element | string | MouseEvent | IPoint | null;

    text: string;
    buttonLabel: string;
    onCalloutDismiss?: () => void;
}

interface ILearningBubbleState {
    isCalloutOpen: boolean;
}

/**
 * Component which, when "showIfNeeded" is called, renders a callout pointing to
 * a specified target if the user has never been previously shown it.
 */
export class LearningBubble extends React.Component<ILearningBubbleProps, ILearningBubbleState> {
    private _delayTimerHandle: number | null = null;

    public constructor(props: any) {
        super(props);
        this.state = {
            isCalloutOpen: false
        };
    }

    public render(): JSX.Element {
        if (!this.state.isCalloutOpen) {
            return null;
        }

        return (
            <Callout
                className="agile-learning-bubble"
                target={this.props.target}
                onDismiss={this._onCalloutDismiss}
                setInitialFocus={true}
                role="dialog"
                ariaLabel={this.props.text}
            >
                <div className="agile-learning-bubble-body">
                    <div>
                        {this.props.text}
                    </div>
                    <PrimaryButton className="learning-bubble-dismiss-button" text={this.props.buttonLabel} onClick={this._onCalloutDismiss} />
                </div>
            </Callout>
        );
    }

    public showIfNeeded(): void {
        if (shouldShowLearningBubble(this.props.settingsKey)) {
            this._show();
        }
    }

    public showIfNeededAfterDelay(delay?: number): void {
        if (shouldShowLearningBubble(this.props.settingsKey)) {
            this._delayTimerHandle = setTimeout(this._show, delay || DefaultDelayedShowDelay);
        }
    }

    public cancelDelayedShow(): void {
        if (this._delayTimerHandle !== null) {
            clearTimeout(this._delayTimerHandle);
            this._delayTimerHandle = null;
        }
    }

    private _show = (): void => {
        registerUserShownLearningBubble(this.props.settingsKey);
        this.setState({
            isCalloutOpen: true
        });
    }

    private _onCalloutDismiss = () => {
        this.setState({
            isCalloutOpen: false
        });

        if (this.props.onCalloutDismiss) {
            this.props.onCalloutDismiss();
        }
    }
}
