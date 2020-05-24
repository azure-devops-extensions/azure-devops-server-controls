import * as React from 'react';

import { withConfigContext, IConfigProps } from "VSSPreview/Config/Framework/ConfigContext";

import { PipelinesActionCreator } from 'TestManagement/Scripts/TestReporting/Widgets/Config/Framework/PipelinesActionCreator';
import { PipelinesSelector } from 'TestManagement/Scripts/TestReporting/Widgets/Config/Framework/PipelinesSelector';
import { PipelinesContext, IPipelinesContext } from "TestManagement/Scripts/TestReporting/Widgets/Config/Framework/PipelinesContext";

export interface PipelinesConfigProps {
}

export const PipelinesConfig = withConfigContext(
    class extends React.Component<PipelinesConfigProps & IConfigProps, {}> {
        private pipelinesContext: IPipelinesContext;

        constructor(props: IConfigProps) {
            super(props);
            this.pipelinesContext = {
                actionCreator: new PipelinesActionCreator(this.props.configContext.actionCreator),
                selector: new PipelinesSelector(),
            }
        }

        public render() {
            return (
                <PipelinesContext.Provider value={this.pipelinesContext}>
                    {this.props.children}
                </PipelinesContext.Provider>
            );
        }
    }
);