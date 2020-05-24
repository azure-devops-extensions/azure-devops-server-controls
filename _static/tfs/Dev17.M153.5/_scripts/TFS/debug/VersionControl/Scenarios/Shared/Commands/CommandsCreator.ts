import { IContextualMenuItem } from "OfficeFabric/ContextualMenu";
import { IIconProps } from "OfficeFabric/Icon";

const separatorName = "-";

/**
 * Functions to filter a list of commands.
 */
export namespace CommandFiltering {
    /**
     * Filters out the commands with the forbidden keys.
     */
    export function filterForbidden(commands: IContextualMenuItem[], forbiddenKeys: string[]) {
        return commands.filter(command => forbiddenKeys.indexOf(command.key) < 0);
    }

    /**
     * Filters out the commands whose keys are not in the allowed list.
     */
    export function filterAllowed(commands: IContextualMenuItem[], allowedKeys: string[]) {
        return commands.filter(command => allowedKeys.indexOf(command.key) >= 0);
    }

    /**
     * Filters out all separators from the list of commands.
     */
    export function exceptSeparators(items: IContextualMenuItem[]): IContextualMenuItem[] {
        return items.filter(command => command.name !== separatorName);
    }

    /**
     * Filters out the separators that are useless,
     * either first item, last item, or it is right after another separator.
     */
    export function exceptUselessSeparators(items: IContextualMenuItem[]): IContextualMenuItem[] {
        let previous: string;

        return items.filter((command, index) => {
            const isUseless =
                command.name === separatorName &&
                (!previous || previous === separatorName || index === items.length - 1);

            previous = command.name || command.key;

            return !isUseless;
        });
    }
}

/**
 * Creates given commands for the current options. Removes gaps for non-available commands.
 * @param creators The list of command creators.
 * @param options The options of the current item, to be passed down to each creator.
 */
export function create<TOptions>(creators: CommandCreator<TOptions>[], options: TOptions): IContextualMenuItem[] {
    return creators
        .map((creator, index) => creator(options, index))
        .filter(command => command)
        .map(fulfillCommand);
}

/**
 * Creates given commands for the current options with respect to permissions. Removes gaps for non-available commands.
 * @param creators The list of command creators.
 * @param permissions User permissions.
 * @param options The options of the current item, to be passed down to each creator.
 */
export function createWithPermissions<TPermissions, TOptions>(
    creators: SecureCommandCreator<TPermissions, TOptions>[],
    permissions: TPermissions,
    options: TOptions): IContextualMenuItem[] {

    return creators
        .map(creator => creator.hasPermission(permissions) && creator.getCommand(options))
        .filter(command => command)
        .map(fulfillCommand);
}

function fulfillCommand(command: IContextualMenuItem): IContextualMenuItem {
    if (command.disabled) {
        command["aria-disabled"] = true;
    }

    return command;
}

export type CommandCreator<TOptions> =
    (options: TOptions, index: number) => IContextualMenuItem;

export type SecureCommandCreator<TPermissions, TOptions> = {
    hasPermission(permissions: TPermissions): boolean;
    getCommand(options: TOptions): IContextualMenuItem;
};

/**
 * A creator that generates a separator command. Index is used to avoid duplicate keys.
 */
export const separator = (options: {}, index: number) => ({
    key: "separator" + index,
    name: separatorName,
});

/**
 * Gets the icon object for the given bowtie icon name.
 */
export function getMenuIcon(name: string): IIconProps {
    return { className: "bowtie-icon " + name, iconName: undefined };
}

/**
 * Makes conditionally disable a given command creator.
 * @param isDisable A function that based on options calculates whether or not the command should be disabled.
 * @param create The command creator to extend.
 */
export function makeDisabledOn<TOptions>(isDisable: (options: TOptions) => boolean, create: CommandCreator<TOptions>): CommandCreator<TOptions> {
    return (options: TOptions, index: number) => {
        const command = create(options, index);

        if (isDisable(options)) {
            return {
                ...command,
                disabled: true,
            };
        }

        return command;
    };
}
