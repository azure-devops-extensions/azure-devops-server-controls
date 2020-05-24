import * as React from 'react';

import { withConfigContext, IConfigProps } from "VSSPreview/Config/Framework/ConfigContext";

import { WorkActionCreator } from 'Widgets/Scripts/Work/Framework/WorkActionCreator';
import { WorkSelector } from 'Widgets/Scripts/Work/Framework/WorkSelector';
import { WorkContext, IWorkContext } from "Widgets/Scripts/Work/Framework/WorkContext";

export interface WorkConfigProps {
}

export const WorkConfig = withConfigContext(
    class extends React.Component<WorkConfigProps & IConfigProps, {}> {
        private workContext: IWorkContext;

        constructor(props: IConfigProps) {
            super(props);
            this.workContext = {
                actionCreator: new WorkActionCreator(this.props.configContext.actionCreator),
                selector: new WorkSelector(),
            }
        }

        public render() {
            return (
                <WorkContext.Provider value={this.workContext}>
                    {this.props.children}
                </WorkContext.Provider>
            );
        }
    }
);