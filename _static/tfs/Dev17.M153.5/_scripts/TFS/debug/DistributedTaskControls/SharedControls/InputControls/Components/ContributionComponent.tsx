// Copied from Tfs/Service/WebAccess/Presentation/Scripts/TFS/Router/ContributionComponent.tsx

import React = require("react");
import { JQueryWrapper } from "DistributedTaskControls/Common/JQueryWrapper";
import * as Resources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";
import { IContributionHostBehavior, createContributedControl } from "VSS/Contributions/Controls";
import * as VSSError from "VSS/Error";

import "VSS/LoaderPlugins/Css!DistributedTaskControls/SharedControls/InputControls/Components/ContributionComponent";

export interface IContributionComponentProps<T> {
    contribution: Contribution | string;
    initialConfig?: T;
    disabled?: boolean;
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

    constructor(props, context?: any) {
        super(props, context);

        this.state = {
            component: <div className="dtc-contribution-component-loading">{Resources.Loading}</div>
        };

        let contributionHostBehavior: IContributionHostBehavior = this.props.contributionHostBehavior || {
            showLoadingIndicator: false,
            showErrorIndicator: false,
            slowWarningDurationMs: 0
        };

        this._$contributionContainer = $("<div>");
        let initialConfig = JQueryWrapper.extend(this.props.initialConfig, { disabled: this.props.disabled });

        createContributedControl(
            this._$contributionContainer,
            this.props.contribution,
            initialConfig,
            this.props.webContext,
            this.props.instanceId,
            contributionHostBehavior).then((reactContent: JSX.Element) => {
                this.setState({
                    component: reactContent
                });
            }, (reason: Error) => {
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
