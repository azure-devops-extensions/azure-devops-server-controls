import * as React from "react";

import { delay } from "VSS/Utils/Core";
import { KeyboardAccesibleComponent } from "Presentation/Scripts/TFS/Components/KeyboardAccessible";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";

import * as ProjectOverviewResources from "ProjectOverview/Scripts/Resources/TFS.Resources.ProjectOverview";

import "VSS/LoaderPlugins/Css!ProjectOverview/Scripts/Components/Upsell";

export interface UpsellProps {
    cssClass?: string;
    /**
     * Cross icon is displayed only if this callback is present.
     */
    onCloseUpsellClick?: () => void;
    imageCssClass: string;
    imageFileName?: string;
    heading: string;
    description: string;
    buttonText: string;
    onButtonClick: () => void;
    isButtonCTA?: boolean;
    isCTAEnabled: boolean;
    learnMoreURL: string;
    learnMoreText: string;
    headingLevel: number;
}

export interface UpsellState {
    displayStyle: DisplayStyle;
}

export enum DisplayStyle {
    Normal,
    Fading,
    Hidden,
}

const fadeOutTimeMS = 250;

export class Upsell extends React.Component<UpsellProps, UpsellState> {
    constructor(props: UpsellProps, context?: any) {
        super(props, context);
        this.state = {
            displayStyle: DisplayStyle.Normal,
        };
    }

    public render(): JSX.Element {
        let imageCssClass = this.props.imageCssClass + " upsell-image";
        let containerCssClass = "upsell-container bowtie " + this.props.cssClass;

        if (this.state.displayStyle === DisplayStyle.Fading) {
            containerCssClass += " fade-out";
        } else if (this.state.displayStyle === DisplayStyle.Hidden) {
            containerCssClass += " hide";
        }

        return (
            <div className={containerCssClass}>
                {this.props.imageFileName
                    ? <img
                        alt=""
                        className={imageCssClass}
                        src={TfsContext.getDefault().configuration.getResourcesFile(this.props.imageFileName)} />
                    : <div className={imageCssClass + " bowtie-icon"} />
                }
                <div
                    className="upsell-heading"
                    role="heading"
                    aria-level={this.props.headingLevel}>
                    {this.props.heading}
                </div>
                <div className="upsell-description">{this.props.description}</div>
                <button
                    onClick={this.props.onButtonClick}
                    className={this.props.isButtonCTA ? "cta" : ""}
                    disabled={!this.props.isCTAEnabled}>
                    {this.props.buttonText}
                </button>
                <div className="learn-more-container">
                    <a
                        target="_blank"
                        href={this.props.learnMoreURL}
                        rel="noreferrer noopener">
                        {this.props.learnMoreText}
                    </a>
                </div>
                {this.props.onCloseUpsellClick &&
                    <KeyboardAccesibleComponent
                        className="bowtie-icon bowtie-navigate-close clear-upsell"
                        ariaLabel={ProjectOverviewResources.Upsells_ClearButtonTooltip}
                        onClick={this._onCloseIconClick} />
                }
            </div>
        );
    }

    private _onCloseIconClick = (): void => {
        this.setState(
            { displayStyle: DisplayStyle.Fading },
            () => {
                delay(this, fadeOutTimeMS, () => {
                    this.setState({ displayStyle: DisplayStyle.Hidden });
                })
            }
        );

        if (this.props.onCloseUpsellClick) {
            this.props.onCloseUpsellClick();
        }
    }
}
