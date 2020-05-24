import * as React from "react";
import * as ComponentBase from "VSS/Flux/Component";

export interface ICodeCoverageHtmlSummaryProps extends ComponentBase.Props {
    modernBrowserAvailable: boolean;
    codeCoverageSummaryLink: string;
}

export class CodeCoverageHtmlSummary extends ComponentBase.Component<ICodeCoverageHtmlSummaryProps, ComponentBase.State> {
    public render(): JSX.Element {
        // sandbox="" on an iFrame will apply all restrictions
        return (
            <div className="code-coverage-summary-part">
                {
                    this.props.modernBrowserAvailable ?
                        <div className="code-coverage-frame-part" >
                            <iframe sandbox="" src={this.props.codeCoverageSummaryLink} className="code-coverage-summary-frame" />
                        </div>
                    :
                        ""
                }
            </div>
        );
    } 
}