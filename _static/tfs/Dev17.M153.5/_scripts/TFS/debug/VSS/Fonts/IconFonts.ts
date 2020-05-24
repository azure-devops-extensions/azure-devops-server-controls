import { getPageContext } from "VSS/Context";
import { initializeIcons } from "VSS/Fonts/fabric-icons";

// See new webplatform already initialized icons or not
if ((<any>window).vssIconsInitialized === undefined) {
    const iconFontsPath = `${getPageContext().webAccessConfiguration.paths.resourcesPath}Fonts/Icons/`;
    initializeIcons(iconFontsPath);
}
else {
    // Done with this global variable, get rid of it
    delete (<any>window).vssIconsInitialized;
}

