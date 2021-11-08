/* eslint-disable @typescript-eslint/naming-convention */
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import * as nls from 'vscode-nls';
import { Disposable } from './dispose';
import { SizeStatusBarEntry } from './sizeStatusBarEntry';
import { Scale, ZoomStatusBarEntry } from './zoomStatusBarEntry';
import { BinarySizeStatusBarEntry } from './binarySizeStatusBarEntry';
import asciifyImage = require("asciify-image");

const localize = nls.loadMessageBundle();

interface Contributions {
    fit: string;
    width: number | string;
    height: number | string;
}

const fitValues = ['box', 'width', 'height', 'original', 'none'] as const;

type Fit = typeof fitValues[number];

function isFit(s: string): s is Fit {
    return (fitValues as readonly string[]).includes(s);
}

export class AsciiManager implements vscode.CustomReadonlyEditorProvider {

    public static readonly viewType = 'asciiPreview.previewEditor';

    private readonly _previews = new Set<Preview>();
    private _activePreview: Preview | undefined;
    static activePreview: any;

    constructor(
        private readonly extensionRoot: vscode.Uri,
        private readonly sizeStatusBarEntry: SizeStatusBarEntry,
        private readonly binarySizeStatusBarEntry: BinarySizeStatusBarEntry,
        private readonly zoomStatusBarEntry: ZoomStatusBarEntry,
    ) { }

    public async openCustomDocument(uri: vscode.Uri) {
        return { uri, dispose: () => { } };
    }

    public async resolveCustomEditor(
        document: vscode.CustomDocument,
        webviewEditor: vscode.WebviewPanel,
    ): Promise<void> {
        const preview = new Preview(this.extensionRoot, document.uri, webviewEditor, this.sizeStatusBarEntry, this.binarySizeStatusBarEntry, this.zoomStatusBarEntry);
        this._previews.add(preview);
        this.setActivePreview(preview);

        webviewEditor.onDidDispose(() => { this._previews.delete(preview); });

        webviewEditor.onDidChangeViewState(() => {
            if (webviewEditor.active) {
                this.setActivePreview(preview);
            } else if (this._activePreview === preview && !webviewEditor.active) {
                this.setActivePreview(undefined);
            }
        });
    }

    public get activePreview() { return this._activePreview; }

    private setActivePreview(value: Preview | undefined): void {
        this._activePreview = value;
        this.setPreviewActiveContext(!!value);
    }

    private setPreviewActiveContext(value: boolean) {
        vscode.commands.executeCommand('setContext', 'asciiPreviewFocus', value);
    }
}

const enum PreviewState {
    Disposed,
    Visible,
    Active,
}

class Preview extends Disposable {

    private readonly id: string = `${Date.now()}-${Math.random().toString()}`;

    private _previewState = PreviewState.Visible;
    private _imageSize: string | undefined;
    private _imageBinarySize: number | undefined;
    private _imageZoom: Scale | undefined;

    private readonly emptyPngDataUri = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAEElEQVR42gEFAPr/AP///wAI/AL+Sr4t6gAAAABJRU5ErkJggg==';

    constructor(
        private readonly extensionRoot: vscode.Uri,
        private readonly resource: vscode.Uri,
        private readonly webviewEditor: vscode.WebviewPanel,
        private readonly sizeStatusBarEntry: SizeStatusBarEntry,
        private readonly binarySizeStatusBarEntry: BinarySizeStatusBarEntry,
        private readonly zoomStatusBarEntry: ZoomStatusBarEntry,
    ) {
        super();
        const resourceRoot = resource.with({
            path: resource.path.replace(/\/[^\/]+?\.\w+$/, '/'),
        });

        webviewEditor.webview.options = {
            enableScripts: true,
            enableForms: false,
            localResourceRoots: [
                resourceRoot,
                extensionRoot,
            ]
        };

        this._register(webviewEditor.webview.onDidReceiveMessage(message => {
            switch (message.type) {
                case 'size':
                    {
                        this._imageSize = message.value;
                        this.update();
                        break;
                    }
                case 'zoom':
                    {
                        this._imageZoom = message.value;
                        this.update();
                        break;
                    }
                case 'reopen-as-text':
                    {
                        vscode.commands.executeCommand('vscode.openWith', resource, 'default', webviewEditor.viewColumn);
                        break;
                    }
            }
        }));

        this._register(zoomStatusBarEntry.onDidChangeScale(e => {
            if (this._previewState === PreviewState.Active) {
                this.webviewEditor.webview.postMessage({ type: 'setScale', scale: e.scale });
            }
        }));

        this._register(webviewEditor.onDidChangeViewState(() => {
            this.update();
            this.webviewEditor.webview.postMessage({ type: 'setActive', value: this.webviewEditor.active });
        }));

        this._register(webviewEditor.onDidDispose(() => {
            if (this._previewState === PreviewState.Active) {
                this.sizeStatusBarEntry.hide(this.id);
                this.binarySizeStatusBarEntry.hide(this.id);
                this.zoomStatusBarEntry.hide(this.id);
            }
            this._previewState = PreviewState.Disposed;
        }));

        const watcher = this._register(vscode.workspace.createFileSystemWatcher(resource.fsPath));
        this._register(watcher.onDidChange(e => {
            if (e.toString() === this.resource.toString()) {
                this.render();
            }
        }));
        this._register(watcher.onDidDelete(e => {
            if (e.toString() === this.resource.toString()) {
                this.webviewEditor.dispose();
            }
        }));

        vscode.workspace.fs.stat(resource).then(({ size }) => {
            this._imageBinarySize = size;
            this.update();
        });

        this.render();
        this.update();
        this.webviewEditor.webview.postMessage({ type: 'setActive', value: this.webviewEditor.active });
    }

    public zoomIn() {
        if (this._previewState === PreviewState.Active) {
            this.webviewEditor.webview.postMessage({ type: 'zoomIn' });
        }
    }

    public zoomOut() {
        if (this._previewState === PreviewState.Active) {
            this.webviewEditor.webview.postMessage({ type: 'zoomOut' });
        }
    }

    private async render() {
        if (this._previewState !== PreviewState.Disposed) {
            this.webviewEditor.webview.html = await this.getWebviewContents();
        }
    }

    private update() {
        if (this._previewState === PreviewState.Disposed) {
            return;
        }

        if (this.webviewEditor.active) {
            this._previewState = PreviewState.Active;
            this.sizeStatusBarEntry.show(this.id, this._imageSize || '');
            this.binarySizeStatusBarEntry.show(this.id, this._imageBinarySize);
            this.zoomStatusBarEntry.show(this.id, this._imageZoom || 'fit');
        } else {
            if (this._previewState === PreviewState.Active) {
                this.sizeStatusBarEntry.hide(this.id);
                this.binarySizeStatusBarEntry.hide(this.id);
                this.zoomStatusBarEntry.hide(this.id);
            }
            this._previewState = PreviewState.Visible;
        }
    }

    private async getWebviewContents(): Promise<string> {
        const version = Date.now().toString();

        const path: string = await this.getResourcePath(this.webviewEditor, this.resource, version);

        let contributions: Contributions = vscode.workspace.getConfiguration('asciiPreview') as any;

        const fit = contributions.fit;

        if (!isFit(fit)) {
            return '';
        }

        let newFit:Fit = fit;

        let converted = await asciifyImage(this.resource.fsPath, { 
            color: false, 
            fit: newFit,
            width: contributions.width,
            height: contributions.height
        });

        const settings = {
            src: path
        };

        const nonce = getNonce();

        const cspSource = this.webviewEditor.webview.cspSource;
        return /* html */`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">

    <!-- Disable pinch zooming -->
    <meta name="viewport"
        content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no">

    <title>ASCII Preview</title>

    <link rel="stylesheet" href="${escapeAttribute(this.extensionResource('/media/main.css'))}" type="text/css" media="screen" nonce="${nonce}">
    <link rel="stylesheet" href="${escapeAttribute(this.extensionResource('/media/vscode.css'))}" type="text/css" media="screen" nonce="${nonce}">

    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data: ${cspSource}; script-src 'nonce-${nonce}'; style-src ${cspSource} 'nonce-${nonce}';">
    <meta id="image-preview-settings" data-settings="${escapeAttribute(JSON.stringify(settings))}">
</head>
<body class="container image scale-to-fit loading">
    <div id="button-container"></div>
    <div class="loading-indicator"></div>
    <div class="image-load-error">
        <p>${localize('preview.imageLoadError', "An error occurred while loading the image.")}</p>
        <a href="#" class="open-file-link">${localize('preview.imageLoadErrorLink', "Open file using VS Code's standard text/binary editor?")}</a>
    </div>
    <div id="image-preview-container" class="hide"></div>
    <div id="ascii-preview-container">
        <pre id="converted-ascii">${converted}</pre>
    </div>
    <script src="${escapeAttribute(this.extensionResource('/media/main.js'))}" nonce="${nonce}"></script>
</body>
</html>`;
    }

    private async getResourcePath(webviewEditor: vscode.WebviewPanel, resource: vscode.Uri, version: string): Promise<string> {
        if (resource.scheme === 'git') {
            const stat = await vscode.workspace.fs.stat(resource);
            if (stat.size === 0) {
                return this.emptyPngDataUri;
            }
        }

        // Avoid adding cache busting if there is already a query string
        if (resource.query) {
            return webviewEditor.webview.asWebviewUri(resource).toString();
        }
        return webviewEditor.webview.asWebviewUri(resource).with({ query: `version=${version}` }).toString();
    }

    private extensionResource(path: string) {
        return this.webviewEditor.webview.asWebviewUri(this.extensionRoot.with({
            path: this.extensionRoot.path + path
        }));
    }
}

function escapeAttribute(value: string | vscode.Uri): string {
    return value.toString().replace(/"/g, '&quot;');
}

function getNonce() {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 64; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}
