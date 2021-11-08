# ascii-image-preview README

Inspired from the VSCode Image Preview extension, this takes it a step further and displays any image opened as ASCII text. Utilizes the [asciify-image](https://github.com/ajay-gandhi/asciify-image) npm library.

## Features

Display selected image (png, gif, jpg) as ASCII text. Also includes:

* Toggle between the original image and generated ASCII to compare.
* Copy generated ASCII to clipboard.
* Configurable parameters in extension settings.

## Requirements

npm

## Extension Settings

This extension contributes the following settings:

* `asciiPreview.fit`: Type of fit to use when generating ASCII. Options are 'box', 'original', 'width', 'height'. 'original' will ignore dimension parameters. Default is 'width' to keep it small.
* `asciiPreview.width`: Horizontal dimension. 'box' and 'width' respect this value.
* `asciiPreview.height`: Vertical dimension. 'box' and 'height' respect this value.

