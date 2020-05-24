import * as React from "react";
import { PrimaryButton } from "OfficeFabric/Button";
import { Label } from "OfficeFabric/Label"
import { autobind, css, format } from "OfficeFabric/Utilities";

import * as Locations from "VSS/Locations";

import * as WikiResources from "Wiki/Scripts/Resources/TFS.Resources.Wiki";

import "VSS/LoaderPlugins/Css!Wiki/Scenarios/Shared/Components/FullPageErrorComponent";

export enum CtaOperationState {
    NotStarted,
    InProgress,
    Failed,
    Succeeded,
}

export interface FullPageErrorProps {
    primaryText: string;
    secondaryText: string;
    imageUrl: string;
    ctaText?: string;
    onCta?: () => IPromise<boolean>;
}

export interface FullPageErrorState {
    ctaOperationState: CtaOperationState;
    ctaOperationErrorMessage: string;
}

export class FullPageErrorComponent extends React.Component<FullPageErrorProps, FullPageErrorState> {
    constructor(props?: FullPageErrorProps, context?: any) {
        super(props, context);

        this.state = {
            ctaOperationState: CtaOperationState.NotStarted,
            ctaOperationErrorMessage: null,
        };
    }

    public render(): JSX.Element {
        return (
            <div className="full-page-error">
                <div>
                    <img src={Locations.urlHelper.getVersionedContentUrl(this.props.imageUrl)} alt="" />
                </div>
                <Label className="primary ms-font-xxl">{this.props.primaryText}</Label>
                <Label className="secondary ms-font-m">{this.props.secondaryText}</Label>
                {this.props.ctaText && this.props.onCta
                    && <div className="buttons-container">
                        <PrimaryButton
                        className={"wiki-cta"}
                        autoFocus={true}
                        disabled={false}
                        iconProps={{
                            ariaLabel: this.state.ctaOperationState === CtaOperationState.InProgress
                                && format(WikiResources.OperationInProgressAriaLabel, this.props.ctaText),
                            className: this.state.ctaOperationState === CtaOperationState.InProgress
                                && css("bowtie-icon", "bowtie-spinner"),
                        }}
                        onClick={this._onCtaClick}
                        ariaLabel={this.props.ctaText}>
                            {this.props.ctaText}
                        </PrimaryButton>
                    </div>
                }
                {this.state.ctaOperationState === CtaOperationState.Failed
                    && <Label className="cta-error ms-font-m">{this.state.ctaOperationErrorMessage}</Label>
                }
            </div>
        );
    }

    @autobind
    private _onCtaClick(): void {
        this.setState({
            ctaOperationState: CtaOperationState.InProgress,
            ctaOperationErrorMessage: null,
        });

        if (this.props.onCta) {
            this.props.onCta().then(
                (value: boolean) => {
                    this.setState({ ctaOperationState: CtaOperationState.Succeeded });
                },
                (error: Error) => {
                    this.setState({
                        ctaOperationState: CtaOperationState.Failed,
                        ctaOperationErrorMessage: error.message,
                    });
                }
            );
        }
    }
}
