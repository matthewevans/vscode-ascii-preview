// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { BinarySizeStatusBarEntry } from './binarySizeStatusBarEntry';
import { AsciiManager } from './asciiView';
import { SizeStatusBarEntry } from './sizeStatusBarEntry';
import { ZoomStatusBarEntry } from './zoomStatusBarEntry';


// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
    const sizeStatusBarEntry = new SizeStatusBarEntry();
    context.subscriptions.push(sizeStatusBarEntry);

    const binarySizeStatusBarEntry = new BinarySizeStatusBarEntry();
    context.subscriptions.push(binarySizeStatusBarEntry);

    const zoomStatusBarEntry = new ZoomStatusBarEntry();
    context.subscriptions.push(zoomStatusBarEntry);

    const asciiManager = new AsciiManager(context.extensionUri, sizeStatusBarEntry, binarySizeStatusBarEntry, zoomStatusBarEntry);

    context.subscriptions.push(vscode.window.registerCustomEditorProvider(AsciiManager.viewType, asciiManager, {
        supportsMultipleEditorsPerDocument: true,
    }));

    context.subscriptions.push(vscode.commands.registerCommand('asciiPreview.zoomIn', () => {
        AsciiManager.activePreview?.zoomIn();
    }));

    context.subscriptions.push(vscode.commands.registerCommand('asciiPreview.zoomOut', () => {
        AsciiManager.activePreview?.zoomOut();
    }));
}

// this method is called when your extension is deactivated
export function deactivate() {}
