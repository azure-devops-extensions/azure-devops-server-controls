// This will make sure that VSTS will load the text fonts (either locally or from its own CDN) rather
// than OfficeFabric SharePoint CDN.
(<any>window).FabricConfig = { fontBaseUrl: '' };

// This will make sure that this file has a define statement for AMD.
export var fontsChanged = true;