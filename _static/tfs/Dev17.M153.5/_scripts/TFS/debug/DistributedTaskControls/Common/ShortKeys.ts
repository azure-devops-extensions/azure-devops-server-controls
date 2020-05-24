import { ShortcutKeys } from "VSS/Controls/KeyboardShortcuts";

export class ItemListShortKeys {
	public static MoveSelectedItemUp = ShortcutKeys.CONTROL + "+" + ShortcutKeys.ALT + "+e";
	public static MoveSelectedItemDown = ShortcutKeys.CONTROL + "+" + ShortcutKeys.ALT + "+d";
}

export namespace InputControlShortKeys {
    export const HelpShortKey: string = ShortcutKeys.CONTROL + "+" + ShortcutKeys.ALT + "+h";
    export const LinkShortKey: string = ShortcutKeys.CONTROL + "+" + ShortcutKeys.ALT + "+l";
    export const MasterDetailsToggleShortKey: string = ShortcutKeys.CONTROL + "+" + "f6";
}

export enum KeyCodes {
	// we are manually handling short key input and not using short key manager 
	// since we have separate action for every component
	// and unregistering one in unmount causes unregistration of all
	MoveSelectedItemUp = 69, // E
	MoveSelectedItemDown = 68, // D
	Help = 72, // H
    Link = 76 // L
}

