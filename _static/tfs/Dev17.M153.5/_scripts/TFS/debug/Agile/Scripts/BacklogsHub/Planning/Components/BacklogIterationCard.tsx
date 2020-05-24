import "VSS/LoaderPlugins/Css!Agile/Scripts/BacklogsHub/Planning/Components/BacklogIterationCard";

import { Card } from "Agile/Scripts/Common/Components/Card/Card";
import { Iteration } from "Agile/Scripts/Models/Iteration";
import * as BacklogContentViewResources from "Agile/Scripts/Resources/TFS.Resources.BacklogsHub.BacklogView";
import * as React from "react";
import { Link } from "OfficeFabric/Link";

export interface IBacklogIterationCardProps {
    iteration: Iteration;
    backlogUrl: string;
    onClick: (event: React.MouseEvent<HTMLElement>) => void;
}

export class BacklogIterationCard extends React.PureComponent<IBacklogIterationCardProps, any> {
    public render(): JSX.Element {
        const {
            iteration
        } = this.props;

        return (
            <Card className="backlog-iteration-card">
                <div className="backlog-title">
                    <Link href={this.props.backlogUrl} onClick={this._onClick}>
                        {BacklogContentViewResources.BacklogCardTitle}
                    </Link>
                </div>
                <div className="backlog-path">
                    {iteration.iterationPath}
                </div>
            </Card>
        );
    }

    private _onClick = (event: React.MouseEvent<HTMLElement>): void => {
        const {
            onClick
        } = this.props;

        if (onClick && !event.ctrlKey && !event.metaKey) {
            event.preventDefault();
            onClick(event);
        }
    }
}
