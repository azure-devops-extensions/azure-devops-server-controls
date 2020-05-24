import Handlers = require("VSS/Events/Handlers");

export let name = "vcMenuItemClicked";

export interface Event {
    
}

export interface ArgumentsItem {
    path: string;
    title: string;
}

export interface Arguments {
    item: ArgumentsItem;
}

export interface CommandEventArgs extends Handlers.CommandEventArgs {
    get_commandArgument(): Arguments;
}