// css
import "VSS/LoaderPlugins/Css!Policy/Scenarios/AdminPolicies/AdminPoliciesCommandBar";
// libs
import * as React from "react";
import { autobind } from "OfficeFabric/Utilities";
// controls
import { Fabric } from "OfficeFabric/Fabric";
import { CommandBar, ICommandBarProps } from "OfficeFabric/CommandBar";
// scenario
import * as Resources from "Policy/Scripts/Resources/TFS.Resources.Policy";

export interface AdminPoliciesCommandBarProps extends React.HTMLProps<HTMLDivElement> {
    onSaveAll: (ev: React.MouseEvent<HTMLButtonElement>) => void;

    onDiscardAll: (ev: React.MouseEvent<HTMLButtonElement>) => void;
}

export const AdminPoliciesCommandBar: React.StatelessComponent<AdminPoliciesCommandBarProps> =
    (props: AdminPoliciesCommandBarProps): JSX.Element => {

        // destructure props object
        const { onSaveAll, onDiscardAll, disabled, ...commandBarProps } = props;

        return (
            <CommandBar
                items={
                    [
                        {
                            key: "save",
                            name: Resources.SaveAll,
                            icon: "Save",
                            disabled: disabled,
                            onClick: onSaveAll,
                        },
                        {
                            key: "discard",
                            name: Resources.DiscardAll,
                            icon: "Undo",
                            disabled: disabled,
                            onClick: onDiscardAll,
                        },
                    ]}
                {...commandBarProps as (ICommandBarProps & React.HTMLProps<CommandBar>) }
            />
        );
    }
