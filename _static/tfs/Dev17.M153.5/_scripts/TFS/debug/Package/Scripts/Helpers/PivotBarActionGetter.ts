import { IPivotBarAction } from "VSSUI/PivotBar";
import { IVssIconProps } from "VSSUI/VssIcon";

import { IPackageCommand } from "Package/Scripts/Types/IPackageCommand";

export class PivotBarActionsGetter {
    public GetPivotBarActions(packageCommands: IPackageCommand[]): IPivotBarAction[] {
        return this.mapToPivotBarAction(packageCommands, null);
    }

    private mapToPivotBarAction(packageCommands: IPackageCommand[], version: string = null): IPivotBarAction[] {
        if (packageCommands == null) {
            return null;
        }

        const actions: IPivotBarAction[] = [];

        packageCommands.map((command: IPackageCommand) => {
            const name: string = command.displayText;

            actions.push({
                key: command.id,
                name,
                important: command.id.indexOf("-all") === -1 ? true : false, // to the context menu if command is for all versions.
                iconProps: {
                    iconName: command.icon
                } as IVssIconProps,
                onClick: command.actionMethod
            });
        });
        return actions;
    }
}
