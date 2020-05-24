import { getDebugMode } from "VSS/Diag";
import { IScenarioDescriptor } from "VSS/Performance";
import * as React from "react";
import { BaseComponent } from "OfficeFabric/Utilities";
import { Fabric } from "OfficeFabric/Fabric";
import { StatefulSplitter } from "Presentation/Scripts/TFS/Components/StatefulSplitter";

export interface IScenarioComponentProps extends React.Props<void> {
    scenario?: IScenarioDescriptor;
}

/**
 * Base for instrumenting React component diagnostics. Inherit from this if you want notification
 * of when your component mounts/renders/etc.
 */
export class DiagnosticComponent<P, S> extends BaseComponent<P, S> {
    private _className: string = null;
    private static SHOULD_TRACE: boolean = false;

    private _getName(): string {
        if (!this._className) {
            this._className = this.constructor.toString().match(/\w+/g)[1];
        }
        return this._className;
    }

    public componentDidMount(): void {
        if (DiagnosticComponent.SHOULD_TRACE && getDebugMode() && window.console && window.console.time) {
            // tslint:disable-next-line:no-console
            console.log(this._getName() + "::componentDidMount");
        }
    }

    public componentWillUnmount(): void {
        if (DiagnosticComponent.SHOULD_TRACE && getDebugMode() && window.console && window.console.time) {
            // tslint:disable-next-line:no-console
            console.log(this._getName() + "::componentWillUnmount");
        }
    }

    public componentDidUpdate(): void {
        if (DiagnosticComponent.SHOULD_TRACE && getDebugMode() && window.console && window.console.time) {
            // tslint:disable-next-line:no-console
            console.log(this._getName() + "::componentDidUpdate");
        }
    }
}

/**
 * Inherit from this component in order to record split timings for page scenarios.
 */
export class ScenarioComponent<P extends IScenarioComponentProps, S> extends DiagnosticComponent<P, S> {
    private _scenario: IScenarioDescriptor;

    // tslint:disable-next-line:no-any
    constructor(props: P, context?: any) {
        super(props, context);

        if (props && props.scenario) {
            this._scenario = props.scenario;
        }
    }

    /**
     * Record a split timing for your page, if it hasn't already been recorded.
     */
    protected recordSplitTime(splitName: string) {
        if (this._scenario) {
            if (!this._scenario.getSplitTimings().some(st => st.name === splitName)) {
                this._scenario.addSplitTiming(splitName);
            }
        }
    }

    /**
     * Completely ends the performance scenario.
     */
    protected endScenario() {
        if (this._scenario && this._scenario.isActive()) {
            this._scenario.end();
            this._scenario = null;
        }
    }
}

/**
 * Frame template for component detail tab rendering
 */
export class TabFrame<P extends IScenarioComponentProps, S> extends ScenarioComponent<P, S> {
    public renderFrame(sideElement: JSX.Element, centerElement: JSX.Element, sideElementOnLeft: boolean): JSX.Element {
        return (
            <div className="tabContent-two-pane bowtie-fabric">
                { sideElementOnLeft && 
                    <Fabric className="sidePane-static with-background">
                        {sideElement}
                    </Fabric>
                }
                <Fabric className="centerPane-static">
                    {centerElement}
                </Fabric>
                { !sideElementOnLeft && 
                    <Fabric className="sidePane-static with-background">
                        {sideElement}
                    </Fabric>
                }
            </div>);
    }

    public renderFrameNoFullPageScroll(sideElement: JSX.Element, centerElement: JSX.Element, sideElementOnLeft: boolean, splitterPath: string = "Git.PullRequestDetails.SideHubSplitter"): JSX.Element {
        const newCenterElement = (
            <Fabric className="bowtie-fabric">
                {centerElement}
            </Fabric>);

        const newSideElement = (
            <Fabric className="bowtie-fabric">
                {sideElement}
            </Fabric>);

        let left = sideElementOnLeft ? newSideElement : newCenterElement;
        let right = sideElementOnLeft ? newCenterElement : newSideElement;
        let leftClassName = sideElementOnLeft ? "sidePane-no-full-page-scroll" : "centerPane-no-full-page-scroll";
        let rightClassName = sideElementOnLeft ? "centerPane-no-full-page-scroll" : "sidePane-no-full-page-scroll";
        let fixedSide = sideElementOnLeft ? "left" : "right";

        return (
            <StatefulSplitter
                statefulSettingsPath={splitterPath}
                vertical={false}
                left={left}
                right={right}
                leftClassName={leftClassName}
                rightClassName={rightClassName}
                optionsElementSelector=".side-splitter-options"
                fixedSide={fixedSide}
                className="tabContent-two-pane-no-full-page-scroll" />);
    }
}

/**
 * Frame template for component detail tab rendering
 */
export class TabSingleFrame<P extends IScenarioComponentProps, S> extends ScenarioComponent<P, S> {

    public renderFrame(centerElement: JSX.Element, tabClassName: string): JSX.Element {

        let className = "tabContent bowtie-fabric";
        if (tabClassName) {
            className += " " + tabClassName;
        }

        return (
            <Fabric className={className}>
                {centerElement}
            </Fabric>
        );
    }
}
