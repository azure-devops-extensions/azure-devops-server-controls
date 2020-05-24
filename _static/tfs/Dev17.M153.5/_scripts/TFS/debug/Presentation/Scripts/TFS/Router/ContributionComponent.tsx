import { PerformanceEvents, addSplitTiming } from "Presentation/Scripts/TFS/Router/PerformanceUtilities";
import { IContributionHostBehavior, createContributedControl } from "VSS/Contributions/Controls";
import * as VSSError from "VSS/Error";
import { format } from "VSS/Utils/String";
import * as React from "react";

export interface IContributionComponentProps<T> {
    contribution: Contribution;
    initialConfig?: T;
    webContext?: WebContext;
    instanceId?: string;
    contributionHostBehavior?: IContributionHostBehavior;
}

export interface IContributionComponentState {
    component: JSX.Element;
}

/**
 * A react component to create extension host for the passed contribution
 */
export class ContributionComponent<T> extends React.Component<IContributionComponentProps<T>, IContributionComponentState> {
    private _$contributionContainer: JQuery;

    constructor(props: IContributionComponentProps<T>, context?: any) {
        super(props, context);

        this.state = {
            component: <div />
        };

        const contributionHostBehavior: IContributionHostBehavior = this.props.contributionHostBehavior || {
            showLoadingIndicator: false,
            showErrorIndicator: false,
            slowWarningDurationMs: 0
        };

        this._$contributionContainer = $("<div>");

        const timingName = format(PerformanceEvents.InitializeContributionComponent, this.props.contribution.id);
        addSplitTiming(timingName, true);

        createContributedControl(
            this._$contributionContainer,
            this.props.contribution,
            this.props.initialConfig,
            this.props.webContext,
            this.props.instanceId,
            contributionHostBehavior).then(
                (reactContent: JSX.Element) => {
                    addSplitTiming(timingName, false);
                    this.setState({
                        component: reactContent
                    });
                },
                (reason: Error) => {
                    VSSError.publishErrorToTelemetry({
                        name: "CreateContributionError",
                        message: reason.message
                    });
                });
    }

    public render(): JSX.Element {
        return this.state.component;
    }

    public componentWillUnmount() {
        if (this._$contributionContainer) {
            this._$contributionContainer.remove();
            this._$contributionContainer = null;
        }
    }
}
