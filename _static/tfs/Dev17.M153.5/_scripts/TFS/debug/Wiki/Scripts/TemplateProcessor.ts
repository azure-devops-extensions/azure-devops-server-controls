import { autobind } from "OfficeFabric/Utilities";

import { MarkdownRenderer } from "ContentRendering/Markdown";
import { ContainerOptions, MarkdownToken } from "ContentRendering/MarkdownItPlugins";
import { combinePaths } from "VersionControl/Scripts/VersionControlPath";
import { endsWith, format } from "VSS/Utils/String";
import { WikiMarkdownRendererProps } from "Wiki/Scenarios/Shared/Components/WikiMarkdownRenderer";
import { TemplateConstants } from "Wiki/Scripts/CommonConstants";
import * as WikiResources from "Wiki/Scripts/Resources/TFS.Resources.Wiki";
import { MarkdownConstants } from "ContentRendering/MarkdownConstants";

export interface TemplateHost {
    _updateComponent(updatedContent: string): void;
    getProps(): WikiMarkdownRendererProps;
    createMarkdownRenderer(): MarkdownRenderer;
    wikiRootPath: string;
}

export class TemplateProcessor implements ContainerOptions {

    public name: string = TemplateConstants.Identifier;
    public marker: string = TemplateConstants.Marker;

    private _edges: IDictionaryStringTo<string[]>;
    private _templateContentMap: IDictionaryStringTo<string>;
    private _templatesRequestedForDownload: IDictionaryStringTo<Boolean>;
    // Renderer is required for parsing contents from templatefiles to identify template calls inside it
    private _renderer: MarkdownRenderer = null;
    private _templateDefRE: RegExp = new RegExp("^\\s*(" + this.marker + "{3})?\\s*" + this.name + "\\s+(" + TemplateConstants.TemplateDirectory + "\\/[^\\s]+)\\s*$");
    // maintains line numbers of template opening and closing tag in content of templatefile and page source
    private _templateSourceMap: IDictionaryStringTo<number[][]>;
    private _isPageTemplateFree: boolean = true;
    private _wikiPagePath: string;

    constructor(
        private _wikiMarkdownRendererBridge: TemplateHost
    ) {
        this._edges = {}; // to store call graphs of nested templates
        this._templateContentMap = {};
        this._templatesRequestedForDownload = {};
        this._templateSourceMap = {};
        this._wikiPagePath = this._props.urlParameters.pagePath;
    }

    @autobind
    public validate(params: string): boolean {
        return Boolean(params.match(this._templateDefRE));
    }

    @autobind
    public render(tokens: MarkdownToken[], idx: number): string {
        if (tokens[idx].type === TemplateConstants.TemplateOpenTag) { // detects template opening tag
            this._ensureRendererIsInitialized();
            this._checkIsPageTemplateFree(tokens);
            tokens = this._modifyContainerTokens(tokens, idx);
        } else { // called when template closing tag is detected
            const containerstartIndex = this._findStartIndex(tokens, idx);
            const templateName: string = this._extractTemplateName(tokens[containerstartIndex].info);
            this._downloadTemplate(templateName);
        }
        return `<div>${tokens[idx].markup}${tokens[idx].info}</div>`;
    }

    private _ensureRendererIsInitialized(): void {
        if (!this._renderer) {
            // renderingOptions.containerOptions is not defined while forming constructor, hence initializing here
            this._renderer = this._createMarkdownRenderer();
        }
    }

    private _checkIsPageTemplateFree(tokens: MarkdownToken[]): void {
        // when a page with templates made template-free and in later edits same templates are added
        // need to check for rerender here as, otherwise rerender is called only when a new template is downloaded
        // and WikiMarkdownrenderer does not know tha the page has templates
        if (this._isPageTemplateFree) {
            this._isPageTemplateFree = false;
            this._updateTemplateContentAndSourceMap(tokens);
            this._checkForReRender();
        }
    }

    /**
     * Adds entry to templateSourceMap for given template using tokens.
     * @param fileName template/page name.
     * @param tokens tokens corresponding to fileName.
     */
    private _addTemplatesEntriesToSourceMap(templateName: string, templateTokens: MarkdownToken[]): void {
        const templateLineNumbers: number[][] = [];
        templateTokens.forEach((token: MarkdownToken) => {
            templateLineNumbers.push(token.map);
        });
        this._templateSourceMap[templateName] = templateLineNumbers;
    }

    private _getTemplateContent(templateName: string): string {
        return this._templateContentMap[templateName];
    }

    private _setTemplateContent(templateName: string, content: string): void {
        this._templateContentMap[templateName] = content;
    }

    private _isTemplatesRequestedForDownload(templateName: string): Boolean {
        return this._templatesRequestedForDownload[templateName];
    }

    private _setTemplatesRequestedForDownload(templateName: string): void {
        this._templatesRequestedForDownload[templateName] = true;
    }

    // appends .md if not present
    private _getWellFormedTempalteName(templateName: string): string {
        templateName = templateName.trim();
        if (templateName !== "" && !endsWith(templateName, ".md")) {
            templateName = templateName + ".md";
        }
        return templateName;
    }

    // for a given targetTemplate, find nested templates
    // add edge from nested templates to targetTemplate
    // as we backtrack from nested template to see if it's edge results into a cycle
    private _addEdges(targetTemplateTokens: MarkdownToken[], TargetTemplateName: string): void {
        targetTemplateTokens.forEach((token: MarkdownToken) => {
            const nestedTemplateName = this._extractTemplateName(token.info);
            if (this._edges[nestedTemplateName] === undefined) { // initialize array of edges for currentfile
                this._edges[nestedTemplateName] = [TargetTemplateName];
            } else if (this._edges[nestedTemplateName].indexOf(TargetTemplateName) === -1) { // if edge does not exist
                this._edges[nestedTemplateName].push(TargetTemplateName);
            }
            if (this._detectCycle(nestedTemplateName)) {
                this._setTemplateContent(nestedTemplateName, format(WikiResources.TemplatesCycleDetectedMessage, nestedTemplateName));
                this._templateSourceMap[nestedTemplateName] = [];
            }
        });
    }

    private _downloadNestedTemplates(templateTokens: MarkdownToken[]): void {
        templateTokens.forEach((token: MarkdownToken) => {
            const currentTemplate = this._extractTemplateName(token.info);
            if (this._templateContentMap[currentTemplate] === undefined) {
                this._downloadTemplate(currentTemplate); // this will initiate reading content from file as well as processing content of that file
            }
        });
    }

    private _detectCycle(startNode: string): Boolean {
        const stack: string[] = [startNode];
        const visited: IDictionaryStringTo<Boolean> = {};
        visited[startNode] = true;
        while (stack.length !== 0) {
            const top: string = stack.pop();
            if (this._edges[top] !== undefined) {
                for (let i: number = 0; i < this._edges[top].length; i++) {
                    if (visited[this._edges[top][i]] === undefined) {
                        stack.push(this._edges[top][i]);
                        visited[this._edges[top][i]] = true;
                    } else if (startNode === this._edges[top][i]) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    // detects all template definitions from markup to keep track of files that need to be processed
    private _updateTemplateContentAndSourceMap(tokens: MarkdownToken[]): void {
        const templateTokens: MarkdownToken[] = this._extractTemplateTokens(tokens);
        this._addTemplatesEntriesToSourceMap(this._wikiPagePath, templateTokens);
        templateTokens.forEach((token: MarkdownToken) => {
            const templateFileName = this._extractTemplateName(token.info);
            if (!(templateFileName in this._templateContentMap)) {
                this._templateContentMap[templateFileName] = null;
            }
        });
    }

    private _replaceParameterValues(templateContent: string, templateArgs: string): string {
        const initialTemplates: MarkdownToken[] = this._extractTemplateTokensFromMD(templateContent);
        let tempTemplateContent: string = templateContent;
        const parameters: RegExpExecArray[] = this._parseParameters(templateArgs);
        let key: string;
        let value: string;
        for (let i = 0; i < parameters.length; i++) {
            if (parameters[i].length > 2) {
                key = parameters[i][1];
                value = parameters[i][2];
            } else {
                key = (i + 1).toString();
                value = parameters[i][1];
            }
             // replace number parameters eg {{{2}}} with 2nd parameters
            tempTemplateContent = tempTemplateContent.replace(new RegExp('\\{\\{\\{' + '\\s*' + key + '\\s*\\}\\}\\}', "g"), value);
             // replace default parameters eg {{{param | defaultvalue}}}
            tempTemplateContent = tempTemplateContent.replace(new RegExp('\\{\\{\\{\\s*' + key + '\\s*\\|' + '\\s*\\"(?:[^"\\\\]|\\\\.)*\\"\\s*\\}\\}\\}', "g"), value);
        }

        tempTemplateContent = this._replaceDefaultParameterValues(tempTemplateContent);
        // check if template is injected via parameters
        if (this._isArrayEqual(initialTemplates, this._extractTemplateTokensFromMD(tempTemplateContent))) {
            return tempTemplateContent;
        }
        return templateContent;
    }

    private _allTemplatesDownloaded(): Boolean {
        for (let key in this._templateContentMap) {
            if (this._templateContentMap[key] === null) {
                return false;
            }
        }
        return true;
    }

    private _modifyContainerTokens(tokens: MarkdownToken[], idx: number): MarkdownToken[] {
        let i: number; //iterator
        for (i = idx + 1; !(tokens[idx].level === tokens[i].level && tokens[i].type === TemplateConstants.TemplateCloseTag); i++) {
            tokens[i].type = MarkdownConstants.MaskedTokenType;
        }
        return tokens;
    }

    private _findStartIndex(tokens: MarkdownToken[], idx: number): number {
        let startIndex: number;
        let i: number; // iterator
        for (i = idx - 1; !(tokens[idx].level === tokens[i].level && tokens[i].type === TemplateConstants.TemplateOpenTag && i >= 0); i--) {
        }
        startIndex = i;
        return startIndex;
    }

    private _replaceDefaultParameterValues(templateContent: string): string {
        const paramRE: RegExp = /\{\{\{\s*[0-9a-zA-Z_]+\s*\|([\s\S]*?)\}\}\}/g;
        const templateContentWithDefaultParams: string = templateContent; // finding and replacing in same string is risky
        let result: RegExpExecArray;
        while ((result = paramRE.exec(templateContentWithDefaultParams))) {
            const value: string = result[1].trim();
            if (this._isValidValue(value)) {
                templateContent = templateContent.replace(result[0], value.substr(1, value.length-2));
            }
        }
        return templateContent;
    }

    private _isValidValue(value: string): boolean {
        if (value.length > 1 && value[0] === "\"" && value[value.length - 1] === "\"") {
            for (let i: number = 1; i < value.length - 1; i++) {
                if (value[i] === "\"" && value[i - 1] !== "\\") {
                    return false;
                }
            }
            return true;
        }
        return false;
    }

    private _parseParameters(templateArgs: string): RegExpExecArray[] {
        const nameValueParameterRE: RegExp = /^\s*([0-9a-zA-Z_]+)[\s]*\:[\s]*\"([\s\S]*)\"\s*$/;
        const numberParameterRE: RegExp = /^\s*\"([\s\S]*)\"\s*$/;
        const parameters: RegExpExecArray[] = [];
        let parameter: string = "";
        let quoteCount: number = 0;
        templateArgs = " " + templateArgs; // for checking leading escape char for first char
        for (let i = 1; i < templateArgs.length; i++) { // space is appended so starts from i=1
            if (templateArgs[i] === "\"" && templateArgs[i - 1] !== "\\") { // not escaped " detected
                if (quoteCount < 2) {
                    quoteCount += 1;
                    parameter += templateArgs[i];
                }
                else {
                    return [];
                }
            } else if (templateArgs[i] === "," && quoteCount === 2) {
                const parameterExecRes: RegExpExecArray = nameValueParameterRE.exec(parameter) || numberParameterRE.exec(parameter);
                if (parameterExecRes) {
                    parameters.push(parameterExecRes);
                    parameter = "";
                    quoteCount = 0;
                } else {
                    return [];
                }
            } else {
                parameter += templateArgs[i];
            }
        }
        const parameterExecRes: RegExpExecArray = nameValueParameterRE.exec(parameter) || numberParameterRE.exec(parameter);

        if (parameterExecRes) {
            parameters.push(parameterExecRes); // push last parameter
            return parameters;
        }
        return [];
    }

    private _extractTemplateTokensFromMD(templateContent: string): MarkdownToken[] {
        const tokens: MarkdownToken[] = this._renderer.parse(templateContent);
        const nestedTemplates: MarkdownToken[] = [];
        const templateTokens: MarkdownToken[] = this._extractTemplateTokens(tokens);
        templateTokens.forEach((token: MarkdownToken) => {
            nestedTemplates.push(token);
        });
        return nestedTemplates;

    }

    private _isArrayEqual(array1: MarkdownToken[], array2: MarkdownToken[]): boolean {
        return array1.length === array2.length
            && array1.every((token: MarkdownToken, index: number) => (token.info === array2[index].info));
    }

    private get _props(): WikiMarkdownRendererProps {
        return this._wikiMarkdownRendererBridge.getProps();
    }

    private _checkForReRender(): void {
        // rerender only when templates are downloaded
        if (this._allTemplatesDownloaded()) {
                this._updateComponent();
        }
    }

    private _downloadPendingTemplates(): IPromise<{}> {
        return new Promise((resolve:any, reject:any) => {
            for (let key in this._templateContentMap) {
                this._downloadTemplate(key);
            }
            resolve();
          });
    }

    @autobind
    public fetchUpdatedMarkdown(pageContent: string): string {
        this._updateTemplateContentAndSourceMap(this._renderer.parse(pageContent));
        if (this._templateSourceMap[this._wikiPagePath].length === 0) {
            this._isPageTemplateFree = true;
            return null;
        } else if (!this._allTemplatesDownloaded()){
            this._downloadPendingTemplates();
            return null;
        }
        return this._constructContent(pageContent);
    }

    /**
     * For a given template, constructs source with parameters placed and nested templates replaced.
     * @param templateContent content of template.
     * @param templateName Template file name.
     * @param parameters Paramaters with which the given template is called.
     */
    @autobind
    private _constructContent(templateContent: string, templateName: string = this._wikiPagePath, parameters: string = ""): string {
        let lines =  this._replaceParameterValues(templateContent, parameters).split('\n');
        if (templateName in this._templateSourceMap) {
            const nestedTemplatesCount: number = this._templateSourceMap[templateName].length;
            for (let mapIndex: number = 0; mapIndex < nestedTemplatesCount; mapIndex++) {
                    let childTemplateParameters: string = "";
                    const childTemplateLines: number[] = this._templateSourceMap[templateName][mapIndex];
                    if (lines[childTemplateLines[0]]) {
                        for (let index: number = childTemplateLines[0] + 1; index < childTemplateLines[1]; index++) {
                            childTemplateParameters += lines[index] + "\n";
                            lines[index] = null;
                        }
                        const childTemplateName: string = this._extractTemplateName(lines[childTemplateLines[0]]);
                        lines[childTemplateLines[0]] = this._constructContent(this._templateContentMap[childTemplateName], childTemplateName, childTemplateParameters);
                        lines[childTemplateLines[1]] = null;
                    }
            }
            lines = lines.filter(line => line !== null);
        }
        return lines.join("\n");
    }

    /**
     * For a given line or token.info extract templatename
     * @param line markdown line or token.info
     */
    private _extractTemplateName(line: string): string {
        let templateDef: RegExpMatchArray = line.match(this._templateDefRE);
        return this._getWellFormedTempalteName(templateDef[2]);
    }

    private _extractTemplateTokens(tokens: MarkdownToken[]): MarkdownToken[] {
        return tokens.filter(token => token.type === TemplateConstants.TemplateOpenTag);
    }

    private _updateComponent(): void {
        this._wikiMarkdownRendererBridge._updateComponent(this._constructContent(this._props.content));
    }

    private _createMarkdownRenderer(): MarkdownRenderer {
        return this._wikiMarkdownRendererBridge.createMarkdownRenderer();
    }

    private _downloadTemplate(templateName: string): void {
        if (!this._isTemplatesRequestedForDownload(templateName)) {
            // if download request is not already sent for this template
            // add this file in the list of unprocessed files
            this._setTemplateContent(templateName, null);
            this._setTemplatesRequestedForDownload(templateName);
            const templateContentPromise: IPromise<string> = new Promise<string>(
                (resolve, reject) => {
                    this._props.repositoryContext.getClient().beginGetItemContent(
                        this._props.repositoryContext,
                        combinePaths(this._wikiMarkdownRendererBridge.wikiRootPath, templateName),
                        this._props.urlParameters.wikiVersion,
                        (result) => { resolve(result); },
                        reject
                    );
                });

            templateContentPromise.then(
                (templateContent: string) => {
                    if (!this._getTemplateContent(templateName)) {
                        this._setTemplateContent(templateName, templateContent);
                    }
                    const nestedTemplateTokens: MarkdownToken[] = this._extractTemplateTokensFromMD(this._getTemplateContent(templateName));
                    if (nestedTemplateTokens.length) {
                        this._addEdges(nestedTemplateTokens, templateName); // add edges and detect cycle
                        this._downloadNestedTemplates(nestedTemplateTokens); // process content to check if any template definitions are present
                        // if cycle is detected (in addEdges method), we add empty entry in source map
                        if (!(templateName in this._templateSourceMap)) {
                            this._addTemplatesEntriesToSourceMap(templateName, nestedTemplateTokens);
                        }
                    }
                    this._checkForReRender();
                },
                (error: Error) => {
                    this._setTemplateContent(templateName, format(WikiResources.TemplateNotFoundMessage, templateName));
                    this._checkForReRender();
                }
            );
        }
    }
}
